import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { validateEnv } from '@/lib/env'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

validateEnv()

export const metadata: Metadata = {
  title: 'YouFirst | Web',
  description: 'Create your premium mastery account and manage subscriptions.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-carbon text-slate-100 antialiased">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}

