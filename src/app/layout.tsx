import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SupportWidget } from '@/components/SupportWidget'
import { SWRegistration } from '@/components/SWRegistration'
import { OfflineBanner } from '@/components/OfflineBanner'

export const metadata: Metadata = {
  title: 'WorkForge — Forged for the field. Built for control.',
  description: 'Field operations management platform for service industry businesses.',
  icons: { icon: '/icon.png', apple: '/icon.png' },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <SupportWidget />
        <SWRegistration />
        <OfflineBanner />
      </body>
    </html>
  )
}
