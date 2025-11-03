'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useAuth } from './AuthProvider'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false) // Start with sign-in for testing
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      console.error('Signup error details:', err)
      
      // Show detailed error information
      let errorMessage = 'An error occurred'
      
      if (err?.message) {
        errorMessage = err.message
      }
      if (err?.code) {
        errorMessage += ` [${err.code}]`
      }
      
      if (err?.status) {
        errorMessage += ` (Status: ${err.status})`
      }
      
      if (err?.statusText) {
        errorMessage += ` - ${err.statusText}`
      }
      
      if (err?.details) {
        errorMessage += ` - Details: ${err.details}`
      }
      
      if (err?.hint) {
        errorMessage += ` - Hint: ${err.hint}`
      }
      
      // Add environment variable check
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        errorMessage += ' - Missing NEXT_PUBLIC_SUPABASE_URL'
      }
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        errorMessage += ' - Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }
      
      // Append a raw debug object to surface any hidden fields from Supabase/Error
      try {
        const raw = {
          name: err?.name,
          message: err?.message,
          code: err?.code,
          status: err?.status,
          statusText: err?.statusText,
          details: err?.details,
          hint: err?.hint,
          stack: err?.stack?.split('\n').slice(0, 2).join(' | ')
        }
        errorMessage += `\nRaw: ${JSON.stringify(raw)}`
      } catch {}

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-8 rounded-xl shadow-lg border border-gray-200 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-gray-600 mt-2">{isSignUp ? 'Start your workspace' : 'Sign in to your workspace'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            {isSignUp ? 'Create Account' : 'Sign in'}
          </Button>
        </form>

        {/* Google OAuth Button */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true)
                setError('')
                await signInWithGoogle()
              } catch (err: any) {
                setError(err?.message || 'Failed to sign in with Google')
                setLoading(false)
              }
            }}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium">Continue with Google</span>
          </button>

          {/* Additional providers (placeholders) */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Facebook */}
            <button
              type="button"
              disabled
              title="Configure in Supabase → Auth → Providers to enable"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.313h3.59l-.467 3.622h-3.123V24h6.127C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z"/>
              </svg>
              <span className="font-medium">Facebook</span>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              disabled
              title="Configure in Supabase → Auth → Providers to enable"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <path fill="#F25022" d="M0 0h10.35v10.35H0z"/>
                <path fill="#7FBA00" d="M12.65 0H23v10.35H12.65z"/>
                <path fill="#00A4EF" d="M0 12.65h10.35V23H0z"/>
                <path fill="#FFB900" d="M12.65 12.65H23V23H12.65z"/>
              </svg>
              <span className="font-medium">Microsoft</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              disabled
              title="Configure in Supabase → Auth → Providers to enable"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.365 1.43c.01.14.015.282.015.427 0 1.036-.38 1.912-1.14 2.626-.761.713-1.678 1.09-2.752 1.128-.012-.14-.018-.284-.018-.432 0-1 .37-1.862 1.108-2.588C14.33 1.865 15.28 1.5 16.365 1.43zM20.8 17.59c-.378.874-.83 1.67-1.355 2.388-.705.978-1.343 1.468-1.918 1.468-.36 0-.793-.127-1.3-.382-.508-.254-.975-.382-1.403-.382-.45 0-.93.128-1.44.382-.509.255-.932.385-1.268.392-.598.025-1.25-.463-1.957-1.463-.533-.718-.994-1.525-1.383-2.422-.59-1.348-.885-2.651-.885-3.91 0-1.148.247-2.136.74-2.963.392-.66.914-1.18 1.566-1.56.652-.382 1.356-.581 2.113-.6.414 0 .956.147 1.625.44.668.295 1.1.444 1.294.444.141 0 .591-.17 1.353-.512.726-.323 1.335-.456 1.828-.398 1.35.109 2.366.646 3.05 1.61-1.213.734-1.818 1.766-1.818 3.093 0 1.121.42 2.053 1.262 2.795.377.355.798.63 1.264.824-.101.29-.206.567-.317.831z"/>
              </svg>
              <span className="font-medium">Apple</span>
            </button>

            {/* LinkedIn */}
            <button
              type="button"
              disabled
              title="Configure in Supabase → Auth → Providers to enable"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.983 3.5C4.983 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.483 1.12 2.483 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1.005 1.825-2.2 3.755-2.2C19.9 8 22 10.06 22 13.7V24h-4v-8.5c0-2.03-.04-4.64-2.83-4.64-2.83 0-3.265 2.21-3.265 4.49V24h-4V8z"/>
              </svg>
              <span className="font-medium">LinkedIn</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-1 text-blue-600 hover:text-blue-500 font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
