import Link from 'next/link'

export const metadata = { title: '用户协议 · OOTD Lab' }

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-7 text-ink">
      <Link href="/" className="font-display text-2xl tracking-tight">
        OOTD Lab
      </Link>
      <h1 className="mt-6 font-display text-2xl">用户协议（演示版）</h1>
      <p className="mt-2 text-xs text-muted">更新日期：2026-11-05</p>

      <section className="mt-8 space-y-5 text-muted">
        <p>1. 你需对上传的照片拥有合法权利，不得上传他人肖像或违法内容。</p>
        <p>2. 生成结果仅供穿搭参考，不构成质量、合身或购买承诺。</p>
        <p>3. 社区内容需遵守规范；违规内容可能被下架，账号可能被限制。</p>
        <p>4. 你不得利用服务进行骚扰、诈骗、广告导流或规避限流。</p>
        <p>5. 我们可能为安全与合规记录必要的审计日志。</p>
        <p>6. 本演示项目不对数据持久性作生产级承诺。</p>
      </section>

      <div className="mt-10 flex gap-3 text-xs">
        <Link href="/legal/privacy" className="text-brand-strong underline-offset-2 hover:underline">
          隐私政策
        </Link>
        <Link href="/register" className="text-muted underline-offset-2 hover:underline">
          返回注册
        </Link>
      </div>
    </main>
  )
}
