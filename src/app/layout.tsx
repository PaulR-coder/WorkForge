import type { Metadata } from 'next'
import './globals.css'
import { SupportWidget } from '@/components/SupportWidget'

export const metadata: Metadata = {
  title: 'WorkForge — Forged for the field. Built for control.',
  description: 'Field operations management platform for service industry businesses.',
  icons: { icon: '/icon.png', apple: '/icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <SupportWidget />
      </body>
    </html>
  )
}

