/**
 * Hook for project navigation functionality
 * Calculates project hierarchy in background and provides navigation results
 */

import { useMemo } from 'react';
import { useGlobalData } from './useGlobalData';
import { filterElements } from '@/utils/supabaseClient';

interface Project {
  id: string;
  name: string;
  description?: string;
  subproject_from?: string[] | string | null;
  status?: string;
  created_at?: string;
}

export interface ProjectNavigationResult {
  id: string;
  name: string;
  type: 'main' | 'parent';
  project: Project;
  // Data for when this option is selected
  mainProjects?: Project[];
  subprojects?: Project[];
}

export function useProjectSearch() {
  const { projects, isLoading, refresh } = useGlobalData();

  // Calculate navigation results in background after each data refresh
  const navigationResults = useMemo((): ProjectNavigationResult[] => {
    if (!projects || projects.length === 0) {
      return [];
    }

    const results: ProjectNavigationResult[] = [];

    // Query 1: Get main projects (projects that are not subprojects)
    const mainProjects = filterElements(projects, 'subproject_from', 'empty');
    
    // Add "Main Projects" option if there are main projects
    if (mainProjects.length > 0) {
      results.push({
        id: 'main-projects',
        name: 'Main Projects',
        type: 'main',
        project: {
          id: 'main-projects',
          name: 'Main Projects',
          description: `${mainProjects.length} projects without parent projects`
        },
        mainProjects: mainProjects, // Pre-calculated data for when selected
        subprojects: []
      });
    }

    // Query 2: Find unique parent project IDs by checking all subproject_from fields
    const parentIds = new Set<string>();
    projects.forEach((project: Project) => {
      const subprojectFrom = project.subproject_from;
      if (!subprojectFrom) return;
      
      if (Array.isArray(subprojectFrom)) {
        subprojectFrom.forEach(parentId => {
          if (parentId && parentId.trim() !== '') {
            parentIds.add(parentId);
          }
        });
      } else if (typeof subprojectFrom === 'string' && subprojectFrom.trim() !== '') {
        parentIds.add(subprojectFrom);
      }
    });

    // Query 3: Get parent projects and pre-calculate their subprojects
    Array.from(parentIds).forEach(parentId => {
      const parentProject = projects.find((p: Project) => p.id === parentId);
      if (parentProject) {
        const subprojects = filterElements(projects, 'subproject_from', parentId);
        
        results.push({
          id: parentProject.id,
          name: parentProject.name,
          type: 'parent',
          project: {
            ...parentProject,
            description: `${subprojects.length} subproject${subprojects.length !== 1 ? 's' : ''}`
          },
          mainProjects: [],
          subprojects: subprojects // Pre-calculated data for when selected
        });
      }
    });

    // Sort results: Main Projects first, then alphabetically
    results.sort((a, b) => {
      if (a.type === 'main') return -1;
      if (b.type === 'main') return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [projects]);

  return {
    projects: projects || [],
    navigationResults,
    isLoading,
    refresh
  };
}