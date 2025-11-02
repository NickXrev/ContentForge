'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useAuth } from './AuthProvider'

export function LoginForm() {
  const [email, setEmail] = useState('test@contentforge.com')
  const [password, setPassword] = useState('testpassword123')
  const [fullName, setFullName] = useState('Test User')
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
      <div className="p-8 rounded-lg shadow-lg border-4 border-yellow-400" style={{ backgroundColor: 'var(--deploy-color, #e9d5ff)', border: '5px solid yellow' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>🚀 DEPLOYMENT TEST - AUTO COLOR! 🚀</h1>
          <p className="text-gray-600 mt-2">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p><strong>Test Credentials:</strong></p>
            <p>Email: test@contentforge.com</p>
            <p>Password: testpassword123</p>
            <p className="text-xs mt-1">Click "Create Account" to sign up, then "Sign in" to log in</p>
          </div>
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
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md"
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
