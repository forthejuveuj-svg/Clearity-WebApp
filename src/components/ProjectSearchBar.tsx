/**
 * Project Search Bar Component
 * Allows users to search and select from projects with subprojects or main projects
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Folder, FolderOpen, X } from 'lucide-react';
import { useProjectSearch, ProjectSearchResult } from '@/hooks/useProjectSearch';

interface ProjectSearchBarProps {
  onSelectProject: (project: ProjectSearchResult) => void;
  placeholder?: string;
  selectedProject?: ProjectSearchResult | null;
  className?: string;
}

export const ProjectSearchBar: React.FC<ProjectSearchBarProps> = ({
  onSelectProject,
  placeholder = "Search projects...",
  selectedProject,
  className = ""
}) => {
  const { searchResults, isLoading } = useProjectSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<ProjectSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOptions(searchResults);
    } else {
      const searchLower = searchQuery.toLowerCase();
      const filtered = searchResults.filter(option =>
        option.name.toLowerCase().includes(searchLower) ||
        (option.project.description && option.project.description.toLowerCase().includes(searchLower))
      );
      setFilteredOptions(filtered);
    }
    setSelectedIndex(0);
  }, [searchQuery, searchResults]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        
        case 'Enter':
          if (filteredOptions[selectedIndex]) {
            e.preventDefault();
            handleSelectOption(filteredOptions[selectedIndex]);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, filteredOptions, selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectOption = (option: ProjectSearchResult) => {
    onSelectProject(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    onSelectProject({
      id: '',
      name: '',
      type: 'main',
      project: { id: '', name: '' }
    });
  };

  const getOptionIcon = (type: ProjectSearchResult['type']) => {
    switch (type) {
      case 'main':
        return <FolderOpen className="w-4 h-4 text-blue-400" />;
      case 'parent':
        return <Folder className="w-4 h-4 text-green-400" />;
      default:
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOptionBadge = (type: ProjectSearchResult['type']) => {
    switch (type) {
      case 'main':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Main</span>;
      case 'parent':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Parent</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        
        {selectedProject && selectedProject.id ? (
          <div className="flex items-center justify-between w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white">
            <div className="flex items-center gap-2">
              {getOptionIcon(selectedProject.type)}
              <span className="font-medium">{selectedProject.name}</span>
              {getOptionBadge(selectedProject.type)}
            </div>
            <button
              onClick={handleClearSelection}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg 
                       text-white placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                       transition-all duration-300"
          />
        )}
        
        <ChevronDown 
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-gray-400 text-sm">Loading projects...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">
              {searchQuery ? 'No projects found' : 'No projects available'}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors duration-150 ${
                  index === selectedIndex ? 'bg-gray-800' : ''
                } ${index === 0 ? 'rounded-t-lg' : ''} ${
                  index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''
                }`}
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
            ))
          )}
        </div>
      )}
    </div>
  );
};