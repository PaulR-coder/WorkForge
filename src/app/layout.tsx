import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WorkForge — Forged for the field. Built for control.',
  description: 'Field operations management platform for service industry businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
