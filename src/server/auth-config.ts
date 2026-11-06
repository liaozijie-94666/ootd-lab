import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { rateLimit } from '@/server/rate-limit'
import { writeAudit } from '@/server/audit'
import { authSecret } from '@/server/auth-secret'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: '邮箱密码',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase()
        // 登录限流：同一邮箱 15 分钟最多 5 次（IP 维度在网关层补充）
        if (!rateLimit(`login:${email}`, 5, 15 * 60_000).ok) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.passwordHash || user.status !== 'ACTIVE') return null

        const valid = await compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user.id) {
        await writeAudit({
          actorId: user.id,
          action: 'LOGIN_SUCCESS',
          targetType: 'USER',
          targetId: user.id,
        })
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? '')
        session.user.role = token.role ?? 'USER'

        // 注销/封禁后立即失效：JWT 仍在有效期内，但不再返回旧资料
        if (session.user.id) {
          const current = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { status: true, role: true },
          })
          if (!current || current.status !== 'ACTIVE') {
            session.user.id = ''
            session.user.name = '已注销用户'
            session.user.email = ''
            session.user.image = null
            session.user.role = 'USER'
            return session
          }
          session.user.role = current.role
        }
      }
      return session
    },
  },
})
