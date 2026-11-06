import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'OOTD Lab · 穿搭实验室',
    template: '%s · OOTD Lab',
  },
  description: '上传一张照片，用站内衣橱或自己的衣服，生成穿在你身上的全身穿搭效果图。',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
