import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Subscribe to data updates
    const unsubscribe = subscribeToDataUpdates((newData) => {
      setData(newData);
    });

    // Initialize data on mount
    const initData = async () => {
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
      }
    };

    initData();

    return unsubscribe;
  }, [signOut]);

  const refresh = async () => {
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
  };

  const clearCache = () => {
    clearDataCache();
  };

  return {
    ...data,
    refresh,
    clearCache
  };
}