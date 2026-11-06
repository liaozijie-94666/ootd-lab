import Link from 'next/link'

export const metadata = { title: '隐私政策 · OOTD Lab' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-7 text-ink">
      <Link href="/" className="font-display text-2xl tracking-tight">
        OOTD Lab
      </Link>
      <h1 className="mt-6 font-display text-2xl">隐私政策（演示版）</h1>
      <p className="mt-2 text-xs text-muted">更新日期：2026-11-05 · 版本 2026-11-01</p>

      <section className="mt-8 space-y-5">
        <div>
          <h2 className="font-medium">1. 我们收集什么</h2>
          <p className="text-muted">
            邮箱、昵称、身高体重（可选）、你主动上传的人脸/全身照、衣服图片，以及你发布的帖子、评论、点赞和收藏。
            我们不收集身份证号、精确位置、通讯录或人脸特征向量。
          </p>
        </div>
        <div>
          <h2 className="font-medium">2. 用途</h2>
          <p className="text-muted">
            仅用于生成穿搭效果图、AI 推荐、保存方案和社区展示。不会用于模型训练、微调或出售给第三方。
          </p>
        </div>
        <div>
          <h2 className="font-medium">3. 存储与保护</h2>
          <p className="text-muted">
            人脸/全身照使用 AES-256-GCM 加密存储，默认仅本人可访问；生成结果默认私有。公开帖子图片需你主动分享后才会公开。
          </p>
        </div>
        <div>
          <h2 className="font-medium">4. 保留期限</h2>
          <p className="text-muted">
            照片默认保留 180 天，或在你删除照片/注销账号时立即删除；授权与审计记录按法律要求保留。
          </p>
        </div>
        <div>
          <h2 className="font-medium">5. 你的权利</h2>
          <p className="text-muted">
            你可以拒绝授权、撤回授权、删除照片/结果、导出数据、注销账号。撤回授权后，我们停止新的生成并删除对应源图。
          </p>
        </div>
        <div>
          <h2 className="font-medium">6. 第三方</h2>
          <p className="text-muted">
            接入图像生成供应商时，仅传输生成所必需的图片与提示词，并要求供应商不将数据用于训练；具体清单以实际配置为准。
          </p>
        </div>
        <div>
          <h2 className="font-medium">7. 联系</h2>
          <p className="text-muted">隐私问题请联系 privacy@ootd.local（演示邮箱）。</p>
        </div>
      </section>

      <div className="mt-10 flex gap-3 text-xs">
        <Link href="/legal/terms" className="text-brand-strong underline-offset-2 hover:underline">
          用户协议
        </Link>
        <Link href="/register" className="text-muted underline-offset-2 hover:underline">
          返回注册
        </Link>
      </div>
    </main>
  )
}
