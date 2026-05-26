import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SWRegistration } from '@/components/SWRegistration'
import { OfflineBanner } from '@/components/OfflineBanner'
import { Analytics } from '@/components/Analytics'

export const metadata: Metadata = {
  title: 'WorkForge — Forged for the field. Built for control.',
  description: 'Field operations management platform for service industry businesses.',
  icons: { icon: '/icon.png', apple: '/icon.png' },
  manifest: '/manifest.json',
  openGraph: {
    title: 'WorkForge — Field Service Management Software',
    description: 'All-in-one field service management for HVAC, plumbing, and electrical contractors. Dispatch faster, invoice in 60 seconds.',
    url: 'https://getworkforge.com',
    siteName: 'WorkForge',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkForge — Field Service Management Software',
    description: 'All-in-one field service management for HVAC, plumbing, and electrical contractors. Dispatch faster, invoice in 60 seconds.',
  },
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
        <Analytics>
          {children}
        </Analytics>
        <SWRegistration />
        <OfflineBanner />
      </body>
    </html>
  )
}
