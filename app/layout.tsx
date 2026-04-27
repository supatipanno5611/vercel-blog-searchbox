import type { Metadata, Viewport } from 'next'
import ScrollProgress from '@/app/components/ScrollProgress'
import ShareFab from '@/app/components/ShareFab'
import Search from '@/app/components/Search'
import './globals.css'

export const metadata: Metadata = {
  title: 'sakko',
  description: '',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        <ScrollProgress />
        {children}
        <ShareFab />
        <Search />
      </body>
    </html>
  )
}
