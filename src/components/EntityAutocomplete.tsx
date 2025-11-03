/**
 * Entity Autocomplete Component
 * Shows dropdown with entity suggestions when user types "@"
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEntityAutocomplete, EntitySuggestion } from '@/hooks/useEntityAutocomplete';

interface EntityAutocompleteProps {
  inputValue: string;
  onSelectEntity: (entity: EntitySuggestion, replaceText: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export const EntityAutocomplete: React.FC<EntityAutocompleteProps> = ({
  inputValue,
  onSelectEntity,
  inputRef
}) => {
  const { filterEntities, loading } = useEntityAutocomplete();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect "@" and extract search query
  useEffect(() => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    
    // Find last "@" before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Check if there's a space after @, if so, close autocomplete
      if (textAfterAt.includes(' ')) {
        setIsOpen(false);
        return;
      }
      
      // Show autocomplete
      setMentionStart(lastAtIndex);
      setSearchQuery(textAfterAt);
      
      const filtered = filterEntities(textAfterAt);
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [inputValue, filterEntities, inputRef]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        
        case 'Enter':
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            handleSelectEntity(suggestions[selectedIndex]);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  const handleSelectEntity = (entity: EntitySuggestion) => {
    // Calculate what text to replace
    const beforeMention = inputValue.slice(0, mentionStart);
    const afterMention = inputValue.slice(mentionStart + searchQuery.length + 1);
    const replaceText = `@${entity.name}`;
    
    onSelectEntity(entity, beforeMention + replaceText + afterMention);
    setIsOpen(false);
  };

  // Get position for dropdown
  const getDropdownPosition = () => {
    if (!inputRef.current) return { top: 0, left: 0 };
    
    const rect = inputRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 5,
      left: rect.left,
      maxWidth: rect.width
    };
  };

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  const position = getDropdownPosition();

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '300px',
        maxWidth: `${position.maxWidth}px`
      }}
    >
      {loading && (
        <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
      )}
      
      {suggestions.map((entity, index) => (
        <div
          key={`${entity.type}-${entity.id}`}
          className={`
            px-4 py-2 cursor-pointer flex items-center justify-between
            ${index === selectedIndex 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
          onClick={() => handleSelectEntity(entity)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {entity.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {entity.displayType}
            </span>
          </div>
          
          {/* Type badge */}
          <span className={`
            text-xs px-2 py-1 rounded
            ${getTypeBadgeColor(entity.type)}
          `}>
            {entity.displayType}
          </span>
        </div>
      ))}
    </div>
  );
};

// Helper function for type badge colors
function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    'projects': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'tasks': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'knowledge_nodes': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'problems': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'skills': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'resources': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'preferences': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'events': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800';
}

