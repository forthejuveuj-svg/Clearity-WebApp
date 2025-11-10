import { useState, useEffect } from 'react';
import { searchMinddumps } from '@/utils/supabaseClient.js';

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

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchMinddumps(query);
        setResults(searchResults || []);
      } catch (err) {
        console.error('Error searching minddumps:', err);
        setError('Failed to search minddumps');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return {
    results,
    isLoading,
    error
  };
};