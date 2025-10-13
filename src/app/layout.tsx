import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { simpleAnalytics } from '@/lib/simple-analytics'
import AppLayout from '@/components/layout/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ContentForge - AI-Powered Content Generation',
  description: 'Create, collaborate, and schedule content with AI assistance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'

  const palette = [
    '#fde68a', // amber-200
    '#bbf7d0', // green-200
    '#bae6fd', // sky-200
    '#e9d5ff', // purple-200
    '#fecdd3', // rose-200
    '#fde1ff', // pink-ish custom
    '#cffafe', // cyan-100
    '#fde68a', // amber-200
  ]

  let hash = 0
  for (let i = 0; i < commitSha.length; i++) {
    hash = (hash * 31 + commitSha.charCodeAt(i)) >>> 0
  }
  const color = palette[hash % palette.length]

  return (
    <html lang="en">
      <body className={inter.className} style={{ ['--deploy-color' as any]: color, background: color }}>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  )
}