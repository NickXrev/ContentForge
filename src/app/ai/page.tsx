'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AIPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Content Studio (the new improved version)
    router.replace('/content-studio')
  }, [router])

  // Show loading state during redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
