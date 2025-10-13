'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', { session, error })
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session })
      setUser(session?.user ?? null)
      setLoading(false)

      // Create or update user profile when user signs in via server route
      if (event === 'SIGNED_IN' && session?.user) {
        await upsertUserProfile(session.user, session.user.user_metadata?.full_name)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const upsertUserProfile = async (user: User, fullName?: string) => {
    const res = await fetch('/api/users/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, email: user.email, full_name: fullName || user.user_metadata?.full_name })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('Upsert failed:', body)
      const err = new Error(body?.message || body?.error || 'User upsert failed') as any
      err.details = body?.details
      err.hint = body?.hint
      err.code = body?.code
      throw err
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Starting signup process...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) {
        console.error('Supabase auth error:', error)
        // Create a more detailed error object
        const detailedError = new Error(error.message || 'Authentication failed')
        ;(detailedError as any).status = error.status
        ;(detailedError as any).statusText = error.statusText
        ;(detailedError as any).details = error.details
        ;(detailedError as any).hint = error.hint
        // Fallback: try admin signup via server route for RLS-trigger failures
        if ((error.message || '').includes('Database error saving new user')) {
          const res = await fetch('/api/auth/admin-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName })
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            // Only attempt sign-in if the service says user already exists
            if (body?.body?.error === 'User already registered' || body?.code === 'user_already_exists' || body?.existed) {
              const { error: signinError } = await supabase.auth.signInWithPassword({ email, password })
              if (signinError) {
                throw Object.assign(new Error(body?.message || body?.error || 'Admin signup failed'), body)
              }
            } else {
              // Surface full error to UI instead of masking
              throw Object.assign(new Error(body?.message || body?.error || 'Admin signup failed'), body)
            }
          } else {
            // after admin create, sign in the user
            const { error: signinError } = await supabase.auth.signInWithPassword({ email, password })
            if (signinError) throw signinError
          }
        } else {
          throw detailedError
        }
      }

      console.log('Auth signup successful:', data)
      
      // Upsert user profile via server route immediately
      if (data.user) {
        await upsertUserProfile(data.user, fullName)
      }
      
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

