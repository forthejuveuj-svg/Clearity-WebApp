/**
 * Project Navigation Component
 * Displays pre-calculated project navigation options as simple links
 */

import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { useProjectSearch, ProjectNavigationResult } from '@/hooks/useProjectSearch';

interface ProjectNavigationProps {
  onSelectProject: (project: ProjectNavigationResult) => void;
  className?: string;
}

export const ProjectSearchBar: React.FC<ProjectNavigationProps> = ({
  onSelectProject,
  className = ""
}) => {
  const { navigationResults, isLoading } = useProjectSearch();

  const handleSelectOption = (option: ProjectNavigationResult) => {
    onSelectProject(option);
  };

  const getOptionIcon = (type: ProjectNavigationResult['type']) => {
    switch (type) {
      case 'main':
        return <FolderOpen className="w-4 h-4 text-blue-400" />;
      case 'parent':
        return <Folder className="w-4 h-4 text-green-400" />;
      default:
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOptionBadge = (type: ProjectNavigationResult['type']) => {
    switch (type) {
      case 'main':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Main</span>;
      case 'parent':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Parent</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-sm">Loading project navigation...</div>
      </div>
    );
  }

  if (navigationResults.length === 0) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-sm">No projects available</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Project Navigation</h3>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {navigationResults.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleSelectOption(option)}
            className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors duration-150 border-b border-gray-700 last:border-b-0`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getOptionIcon(option.type)}
                <div>
                  <div className="font-medium text-white">{option.name}</div>
                  {option.project.description && (
                    <div className="text-sm text-gray-400">{option.project.description}</div>
                  )}
                </div>
              </div>
              {getOptionBadge(option.type)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};