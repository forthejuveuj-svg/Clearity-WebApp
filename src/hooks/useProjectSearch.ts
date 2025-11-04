/**
 * Hook for project search functionality
 * Provides utilities for working with project hierarchy and filtering
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

interface ProjectHierarchy {
  mainProjects: Project[];
  parentProjects: Project[];
  subprojects: Project[];
  projectsWithSubprojects: Project[];
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  type: 'main' | 'parent' | 'subproject';
  parentId?: string;
  parentName?: string;
  project: Project;
  subprojectCount?: number;
}

export function useProjectSearch() {
  const { projects, isLoading, refresh } = useGlobalData();

  // Analyze project hierarchy
  const hierarchy = useMemo((): ProjectHierarchy => {
    if (!projects || projects.length === 0) {
      return {
        mainProjects: [],
        parentProjects: [],
        subprojects: [],
        projectsWithSubprojects: []
      };
    }

    // Get main projects (projects that are not subprojects)
    const mainProjects = filterElements(projects, 'subproject_from', 'empty');
    
    // Get subprojects (projects that have a parent)
    const subprojects = projects.filter(project => {
      const subprojectFrom = project.subproject_from;
      return subprojectFrom && 
             ((Array.isArray(subprojectFrom) && subprojectFrom.length > 0) ||
              (typeof subprojectFrom === 'string' && subprojectFrom.trim() !== ''));
    });

    // Get projects that have subprojects (parent projects)
    const projectsWithSubprojects = projects.filter(project => {
      return projects.some(otherProject => {
        const subprojectFrom = otherProject.subproject_from;
        if (!subprojectFrom) return false;
        
        if (Array.isArray(subprojectFrom)) {
          return subprojectFrom.includes(project.id);
        }
        return subprojectFrom === project.id;
      });
    });

    // Parent projects are those that have subprojects
    const parentProjects = projectsWithSubprojects;

    return {
      mainProjects,
      parentProjects,
      subprojects,
      projectsWithSubprojects
    };
  }, [projects]);

  // Get search results for the search bar
  const getSearchResults = useMemo((): ProjectSearchResult[] => {
    const results: ProjectSearchResult[] = [];

    // Add "Main Projects" option if there are main projects
    if (hierarchy.mainProjects.length > 0) {
      results.push({
        id: 'main-projects',
        name: 'Main Projects',
        type: 'main',
        project: {
          id: 'main-projects',
          name: 'Main Projects',
          description: `${hierarchy.mainProjects.length} projects without parent projects`
        }
      });
    }

    // Add parent projects (projects that have subprojects)
    hierarchy.parentProjects.forEach(project => {
      const subprojectCount = projects?.filter(p => {
        const subprojectFrom = p.subproject_from;
        if (!subprojectFrom) return false;
        
        if (Array.isArray(subprojectFrom)) {
          return subprojectFrom.includes(project.id);
        }
        return subprojectFrom === project.id;
      }).length || 0;

      results.push({
        id: project.id,
        name: project.name,
        type: 'parent',
        project: {
          ...project,
          description: `${subprojectCount} subproject${subprojectCount !== 1 ? 's' : ''}`
        },
        subprojectCount
      });
    });

    // Sort results: Main Projects first, then alphabetically
    results.sort((a, b) => {
      if (a.type === 'main') return -1;
      if (b.type === 'main') return 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [hierarchy, projects]);

  // Get projects by parent ID
  const getSubprojects = (parentId: string): Project[] => {
    if (!projects) return [];
    
    return projects.filter(project => {
      const subprojectFrom = project.subproject_from;
      if (!subprojectFrom) return false;
      
      if (Array.isArray(subprojectFrom)) {
        return subprojectFrom.includes(parentId);
      }
      return subprojectFrom === parentId;
    });
  };

  // Get main projects (projects without parents)
  const getMainProjects = (): Project[] => {
    return hierarchy.mainProjects;
  };

  // Get parent project for a given project
  const getParentProject = (projectId: string): Project | null => {
    if (!projects) return null;
    
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.subproject_from) return null;
    
    const parentId = Array.isArray(project.subproject_from) 
      ? project.subproject_from[0] 
      : project.subproject_from;
    
    return projects.find(p => p.id === parentId) || null;
  };

  // Check if a project has subprojects
  const hasSubprojects = (projectId: string): boolean => {
    return hierarchy.projectsWithSubprojects.some(p => p.id === projectId);
  };

  // Filter projects by search query
  const filterProjects = (query: string, type?: 'main' | 'parent' | 'all'): Project[] => {
    if (!projects) return [];
    
    let projectsToFilter: Project[] = [];
    
    switch (type) {
      case 'main':
        projectsToFilter = hierarchy.mainProjects;
        break;
      case 'parent':
        projectsToFilter = hierarchy.parentProjects;
        break;
      default:
        projectsToFilter = projects;
    }
    
    if (!query.trim()) return projectsToFilter;
    
    const searchLower = query.toLowerCase();
    return projectsToFilter.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      (project.description && project.description.toLowerCase().includes(searchLower))
    );
  };

  return {
    // Data
    projects: projects || [],
    hierarchy,
    searchResults: getSearchResults,
    isLoading,
    
    // Actions
    refresh,
    
    // Utilities
    getSubprojects,
    getMainProjects,
    getParentProject,
    hasSubprojects,
    filterProjects,
    
    // Stats
    stats: {
      total: projects?.length || 0,
      mainProjects: hierarchy.mainProjects.length,
      parentProjects: hierarchy.parentProjects.length,
      subprojects: hierarchy.subprojects.length
    }
  };
}