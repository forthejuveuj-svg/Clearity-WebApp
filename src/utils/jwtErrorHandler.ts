/**
 * JWT Error Detection and Auto-Logout Utility
 */

import { useAuth } from '@/hooks/useAuth';

// JWT error patterns to detect
const JWT_ERROR_PATTERNS = [
  'JWT expired',
  'jwt expired',
  'token expired',
  'invalid jwt',
  'Invalid JWT',
  'JWT malformed',
  'jwt malformed',
  'Authentication failed',
  'Unauthorized',
  'Invalid token',
  'Token has expired'
];

export interface JWTErrorResult {
  isJWTError: boolean;
  shouldLogout: boolean;
  message?: string;
}

/**
 * Check if an error is related to JWT expiration or invalidity
 */
export function detectJWTError(error: any): JWTErrorResult {
  if (!error) {
    return { isJWTError: false, shouldLogout: false };
  }

  const errorMessage = typeof error === 'string' ? error : 
    error.message || error.error_description || error.details || JSON.stringify(error);

  const isJWTError = JWT_ERROR_PATTERNS.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );

  return {
    isJWTError,
    shouldLogout: isJWTError,
    message: isJWTError ? 'Session expired. Please log in again.' : undefined
  };
}

/**
 * Handle JWT errors by logging out the user
 */
export async function handleJWTError(error: any, signOut: () => Promise<void>): Promise<boolean> {
  const jwtResult = detectJWTError(error);
  
  if (jwtResult.shouldLogout) {
    console.warn('JWT error detected, logging out user:', error);
    
    try {
      await signOut();
      return true; // Successfully logged out
    } catch (logoutError) {
      console.error('Error during automatic logout:', logoutError);
      // Force logout by clearing localStorage and reloading
      localStorage.clear();
      window.location.reload();
      return true;
    }
  }
  
  return false; // No JWT error, no logout needed
}

/**
 * Wrapper for Supabase operations with automatic JWT error handling
 */
export async function withJWTErrorHandling<T>(
  operation: () => Promise<T>,
  signOut: () => Promise<void>,
  onJWTError?: (message: string) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const jwtResult = detectJWTError(error);
    
    if (jwtResult.shouldLogout) {
      // Notify about session expiry
      if (onJWTError && jwtResult.message) {
        onJWTError(jwtResult.message);
      }
      
      // Auto logout
      await handleJWTError(error, signOut);
      return null;
    }
    
    // Re-throw non-JWT errors
    throw error;
  }
}