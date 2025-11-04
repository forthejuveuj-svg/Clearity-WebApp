import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getAllDataFromCache, 
  subscribeToDataUpdates, 
  refreshAllData, 
  initializeData,
  clearDataCache
} from '@/utils/supabaseClient';
import { handleJWTError, detectJWTError } from '@/utils/jwtErrorHandler';
import { useAuth } from './useAuth';

interface GlobalDataState {
  projects: any[];
  knowledgeNodes: any[];
  problems: any[];
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function useGlobalData() {
  const { signOut } = useAuth();
  const [data, setData] = useState<GlobalDataState>(() => getAllDataFromCache());
  const initializationRef = useRef(false);

  useEffect(() => {
    // Subscribe to data updates
    const unsubscribe = subscribeToDataUpdates((newData) => {
      setData(newData);
    });

    // Initialize data only once on mount
    const initData = async () => {
      if (initializationRef.current) {
        return; // Already initialized
      }
      
      initializationRef.current = true;
      
      try {
        await initializeData({
          onJWTError: (message: string) => {
            console.warn('JWT error during data initialization:', message);
          }
        });
      } catch (error) {
        const jwtResult = detectJWTError(error);
        if (jwtResult.isJWTError) {
          console.warn('JWT error detected, logging out user');
          await handleJWTError(error, signOut);
        }
        initializationRef.current = false; // Reset on error to allow retry
      }
    };

    initData();

    return unsubscribe;
  }, []); // Remove signOut from dependencies to prevent re-initialization

  const refresh = useCallback(async () => {
    try {
      await refreshAllData({
        onJWTError: (message: string) => {
          console.warn('JWT error during data refresh:', message);
        }
      });
    } catch (error) {
      const jwtResult = detectJWTError(error);
      if (jwtResult.isJWTError) {
        console.warn('JWT error detected during refresh, logging out user');
        await handleJWTError(error, signOut);
      } else {
        throw error; // Re-throw non-JWT errors
      }
    }
  }, [signOut]);

  const clearCache = useCallback(() => {
    clearDataCache();
    initializationRef.current = false; // Reset initialization flag when cache is cleared
  }, []);

  return {
    ...data,
    refresh,
    clearCache
  };
}