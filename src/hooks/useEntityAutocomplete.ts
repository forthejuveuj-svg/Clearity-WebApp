/**
 * Hook for entity autocomplete functionality
 * Fetches all user entities and provides filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EntityType } from '@/utils/messageModeHandler';

// Helper function to detect JWT errors
function isJWTError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' ? error : 
    error.message || error.error_description || error.details || JSON.stringify(error);
  
  const jwtErrorPatterns = [
    'JWT expired', 'jwt expired', 'token expired', 'invalid jwt', 'Invalid JWT',
    'JWT malformed', 'jwt malformed', 'Authentication failed', 'Unauthorized',
    'Invalid token', 'Token has expired'
  ];
  
  return jwtErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface EntitySuggestion {
  id: string;
  name: string;
  type: EntityType;
  displayType: string;  // User-friendly type name
}

const TABLE_MAPPING: Record<EntityType, { table: string; displayName: string }> = {
  'projects': { table: 'projects', displayName: 'Project' },
  'tasks': { table: 'tasks', displayName: 'Task' },
  'knowledge_nodes': { table: 'knowledge_nodes', displayName: 'Knowledge' },
  'problems': { table: 'problems', displayName: 'Problem' },
  'skills': { table: 'skills', displayName: 'Skill' },
  'resources': { table: 'resources', displayName: 'Resource' },
  'preferences': { table: 'preferences', displayName: 'Preference' },
  'events': { table: 'events', displayName: 'Event' }
};

export function useEntityAutocomplete() {
  const [allEntities, setAllEntities] = useState<EntitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all entities from database
  const fetchAllEntities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check for JWT errors in session
      if (sessionError) {
        console.error('Session error in useEntityAutocomplete:', sessionError);
        if (isJWTError(sessionError)) {
          // JWT error detected - this will be handled by the parent component
          throw sessionError;
        }
      }
      
      if (!session?.user) {
        setAllEntities([]);
        setLoading(false);
        return;
      }

      const entities: EntitySuggestion[] = [];

      // Fetch from all tables
      for (const [entityType, config] of Object.entries(TABLE_MAPPING)) {
        try {
          const { data, error } = await supabase
            .from(config.table)
            .select('id, name')
            .order('name', { ascending: true })
            .limit(100); // Limit per type

          if (error) {
            // Check for JWT errors in database queries
            if (isJWTError(error)) {
              throw error; // Re-throw JWT errors to be handled by parent
            }
            continue; // Continue on non-JWT errors
          }

          if (data) {
            entities.push(...data.map(item => ({
              id: item.id,
              name: item.name || 'Untitled',
              type: entityType as EntityType,
              displayType: config.displayName
            })));
          }
        } catch (err) {
          // Re-throw JWT errors, silently continue on others
          if (isJWTError(err)) {
            throw err;
          }
        }
      }

      setAllEntities(entities);
    } catch (err) {
      console.error('Error fetching entities:', err);
      setError('Failed to load entities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load entities on mount
  useEffect(() => {
    fetchAllEntities();
  }, [fetchAllEntities]);

  // Filter entities based on search query - memoized to prevent infinite loops
  const filterEntities = useCallback((query: string): EntitySuggestion[] => {
    if (!query.trim()) {
      // Return all entities grouped by type
      return allEntities.slice(0, 50); // Limit total results
    }

    const searchLower = query.toLowerCase();
    
    return allEntities
      .filter(entity => 
        entity.name.toLowerCase().includes(searchLower) ||
        entity.displayType.toLowerCase().includes(searchLower)
      )
      .slice(0, 50); // Limit results
  }, [allEntities]);

  return {
    allEntities,
    loading,
    error,
    filterEntities,
    refetch: fetchAllEntities
  };
}

