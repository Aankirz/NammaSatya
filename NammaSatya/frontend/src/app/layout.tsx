import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Kannada } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const kannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  variable: '--font-kannada',
  weight: ['500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NammaSatya — BLR Truth Check',
  description: 'Paste any Bengaluru civic claim. Get a verdict backed by verified official sources.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable} ${kannada.variable}`}>
      <body>{children}</body>
    </html>
  )
}
