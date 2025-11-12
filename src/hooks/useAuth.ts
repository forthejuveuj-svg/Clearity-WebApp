import { useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuth = () => {
  const isDevelopment = import.meta.env.DEV && window.location.hostname === 'localhost'
  const devEmail = import.meta.env.VITE_DEV_EMAIL
  const devPassword = import.meta.env.VITE_DEV_PASSWORD

  // Production auth implementation
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)

      try {
        if (isDevelopment) {
          if (devEmail && devPassword) {
            const { data: initialSession } = await supabase.auth.getSession()
            if (!initialSession.session) {
              const { error } = await supabase.auth.signInWithPassword({
                email: devEmail,
                password: devPassword
              })
              if (error) {
                console.error('Dev auto-login failed:', error)
              }
            }
          } else {
            console.warn('Dev auto-login skipped: VITE_DEV_EMAIL or VITE_DEV_PASSWORD is missing')
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      }

      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    // Force production URL - replace with your actual domain
    const redirectUrl = 'https://74.208.127.204/';
    console.log('OAuth redirect URL:', redirectUrl);
    console.log('Current location:', window.location.href);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    if (error) throw error
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear view preference on logout
    localStorage.removeItem('currentView')
    
    // Clear global data cache
    const { clearDataCache } = await import('@/utils/supabaseClient')
    clearDataCache()
  }, [])

  return {
    user,
    userId: user?.id || null,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}