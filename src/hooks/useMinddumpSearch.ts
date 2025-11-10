import { useState, useEffect } from 'react';
import { 
  getMinddumpsFromCache, 
  initializeMinddumpsCache, 
  refreshMinddumpsCache, 
  subscribeToMinddumpUpdates,
  updateMinddumpTitle
} from '@/utils/supabaseClient.js';

export interface MinddumpSearchResult {
  id: string;
  title: string;
  prompt: string;
  created_at: string;
  metadata?: any;
}

export const useMinddumpSearch = (query: string = '') => {
  const [results, setResults] = useState<MinddumpSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Initialize cache on mount
  useEffect(() => {
    const initCache = async () => {
      setIsLoading(true);
      try {
        await initializeMinddumpsCache();
      } catch (err) {
        console.error('Error initializing minddumps cache:', err);
        setError('Failed to load minddumps');
      } finally {
        setIsLoading(false);
      }
    };

    initCache();

    // Subscribe to cache updates
    const unsubscribe = subscribeToMinddumpUpdates((cache) => {
      setIsLoading(cache.isLoading);
      // Filter results based on query
      if (query.trim()) {
        const filtered = cache.data.filter(minddump => 
          minddump.title.toLowerCase().includes(query.toLowerCase()) ||
          minddump.prompt.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } else {
        setResults(cache.data);
      }
    });

    return unsubscribe;
  }, []);

  // Filter results when query changes
  useEffect(() => {
    const cache = getMinddumpsFromCache();
    if (query.trim()) {
      const filtered = cache.data.filter(minddump => 
        minddump.title.toLowerCase().includes(query.toLowerCase()) ||
        minddump.prompt.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults(cache.data);
    }
  }, [query]);

  const refreshCache = async () => {
    try {
      await refreshMinddumpsCache();
      setNeedsRefresh(false);
    } catch (err) {
      console.error('Error refreshing minddumps cache:', err);
      setError('Failed to refresh minddumps');
    }
  };

  const updateTitle = async (minddumpId: string, newTitle: string) => {
    try {
      await updateMinddumpTitle(minddumpId, newTitle);
      setNeedsRefresh(true);
      return true;
    } catch (err) {
      console.error('Error updating minddump title:', err);
      setError('Failed to update title');
      return false;
    }
  };

  return {
    results,
    isLoading,
    error,
    needsRefresh,
    refreshCache,
    updateTitle
  };
};