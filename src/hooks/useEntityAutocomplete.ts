/**
 * Hook for entity autocomplete functionality
 * Fetches all user entities and provides filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { getAllDataFromCache, filterElements } from '@/utils/supabaseClient.js';
import { EntityType } from '@/utils/messageModeHandler';
import { useGlobalData } from './useGlobalData';

// Using unified Supabase client and utilities from supabaseClient.js

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
  const globalData = useGlobalData();
  const [allEntities, setAllEntities] = useState<EntitySuggestion[]>([]);

  // Build entities from cached global data
  const buildEntitiesFromCache = useCallback(() => {
    const entities: EntitySuggestion[] = [];
    
    // Add projects
    if (globalData.projects) {
      entities.push(...globalData.projects.map(item => ({
        id: item.id,
        name: item.name || 'Untitled',
        type: 'projects' as EntityType,
        displayType: 'Project'
      })));
    }

    // Add knowledge nodes
    if (globalData.knowledgeNodes) {
      entities.push(...globalData.knowledgeNodes.map(item => ({
        id: item.id,
        name: item.name || item.title || 'Untitled',
        type: 'knowledge_nodes' as EntityType,
        displayType: 'Knowledge'
      })));
    }

    // Add problems
    if (globalData.problems) {
      entities.push(...globalData.problems.map(item => ({
        id: item.id,
        name: item.title || item.name || 'Untitled',
        type: 'problems' as EntityType,
        displayType: 'Problem'
      })));
    }

    // Sort by name
    entities.sort((a, b) => a.name.localeCompare(b.name));
    
    setAllEntities(entities);
  }, [globalData.projects, globalData.knowledgeNodes, globalData.problems]);

  // Update entities when global data changes
  useEffect(() => {
    buildEntitiesFromCache();
  }, [buildEntitiesFromCache]);

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
    loading: globalData.isLoading,
    error: null,
    filterEntities,
    refetch: globalData.refresh
  };
}

