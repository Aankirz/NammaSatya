import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NammaSatya — NammaSatya',
  description: 'Paste any Bengaluru civic claim. Get a verdict backed by verified official sources.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
