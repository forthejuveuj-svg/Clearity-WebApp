import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'

// Mock user data for development
const MOCK_USER: User = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  user_metadata: {
    full_name: 'Development User',
    avatar_url: 'https://via.placeholder.com/40',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  confirmation_sent_at: null,
  recovery_sent_at: null,
  email_change_sent_at: null,
  new_email: null,
  invited_at: null,
  action_link: null,
  phone: null,
  last_sign_in_at: new Date().toISOString(),
  identities: [],
  factors: [],
  is_anonymous: false
}

const MOCK_SESSION: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: MOCK_USER
}

export const useAuthDev = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already "logged in" in localStorage
    const isLoggedIn = localStorage.getItem('dev-auth-logged-in') === 'true'
    const savedUserData = localStorage.getItem('dev-auth-user-data')
    
    if (isLoggedIn) {
      // Restore user data if available, otherwise use default mock user
      let userData = MOCK_USER
      if (savedUserData) {
        try {
          userData = JSON.parse(savedUserData)
        } catch (error) {
          console.warn('Failed to parse saved user data, using default')
        }
      }
      
      const sessionData = { ...MOCK_SESSION, user: userData }
      setUser(userData)
      setSession(sessionData)
    }
    
    setLoading(false)
  }, [])

  const signInWithGoogle = async () => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    localStorage.setItem('dev-auth-logged-in', 'true')
    localStorage.setItem('dev-auth-user-data', JSON.stringify(MOCK_USER))
    setUser(MOCK_USER)
    setSession(MOCK_SESSION)
  }

  const signInWithEmail = async (email: string, password: string) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create a mock user with the provided email
    const mockUser = { ...MOCK_USER, email }
    const mockSession = { ...MOCK_SESSION, user: mockUser }
    
    localStorage.setItem('dev-auth-logged-in', 'true')
    localStorage.setItem('dev-auth-user-data', JSON.stringify(mockUser))
    setUser(mockUser)
    setSession(mockSession)
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create a mock user with the provided data
    const mockUser = { 
      ...MOCK_USER, 
      email,
      user_metadata: {
        ...MOCK_USER.user_metadata,
        full_name: name || 'New User'
      }
    }
    const mockSession = { ...MOCK_SESSION, user: mockUser }
    
    localStorage.setItem('dev-auth-logged-in', 'true')
    localStorage.setItem('dev-auth-user-data', JSON.stringify(mockUser))
    setUser(mockUser)
    setSession(mockSession)
  }

  const signOut = async () => {
    localStorage.removeItem('dev-auth-logged-in')
    localStorage.removeItem('dev-auth-user-data')
    localStorage.removeItem('currentView') // Clear view preference on logout
    setUser(null)
    setSession(null)
  }

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