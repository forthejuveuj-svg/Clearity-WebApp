// Environment configuration
export const config = {
  // App URLs - VITE_APP_URL is set per environment, fallback to current origin
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  
  // Supabase (shared across environments)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Google OAuth (shared across environments)
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
}

// Helper function to get the correct redirect URL
export const getRedirectUrl = (path: string = '/') => {
  return `${config.appUrl}${path}`
}