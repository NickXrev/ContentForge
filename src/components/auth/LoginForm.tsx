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
  const [isSignUp, setIsSignUp] = useState(true) // Start with signup for testing
  const { signIn, signUp } = useAuth()

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
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to ContentForge</h1>
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
