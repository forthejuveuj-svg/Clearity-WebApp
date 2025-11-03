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
            prev < Math.min(suggestions.length, 5) - 1 ? prev + 1 : prev
          );
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        
        case 'Enter':
        case 'Tab':
          if (suggestions[selectedIndex] && selectedIndex < 5) {
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

  // Scroll selected item into view (not needed since we only show 5 items)
  useEffect(() => {
    if (isOpen && dropdownRef.current && selectedIndex < 5) {
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

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  // Limit to top 5 suggestions only
  const topSuggestions = suggestions.slice(0, 5);
  
  const getDropdownPosition = () => {
    if (!inputRef.current) return { top: 0, left: 0, width: 0 };
    
    const rect = inputRef.current.getBoundingClientRect();
    
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width
    };
  };

  const position = getDropdownPosition();

  return (
    <div
      ref={dropdownRef}
      className="fixed rounded-lg shadow-2xl overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        transform: 'translateY(calc(-100% - 10px))',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      {loading && (
        <div className="px-3 py-1.5 text-xs text-gray-400">Loading...</div>
      )}
      
      {topSuggestions.map((entity, index) => (
        <div
          key={`${entity.type}-${entity.id}`}
          className={`
            px-3 py-1.5 cursor-pointer flex items-center justify-between
            transition-colors duration-150
            ${index === selectedIndex 
              ? 'bg-white/20' 
              : 'hover:bg-white/10'
            }
            ${index === 0 ? 'rounded-t-lg' : ''}
            ${index === suggestions.length - 1 ? 'rounded-b-lg' : ''}
          `}
          onClick={() => handleSelectEntity(entity)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-medium text-white truncate">
              {entity.name}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {entity.displayType}
            </span>
          </div>
          
          {/* Type badge */}
          <span className={`
            text-[10px] px-1.5 py-0.5 rounded flex-shrink-0
            ${getTypeBadgeColor(entity.type)}
          `}>
            {entity.displayType}
          </span>
        </div>
      ))}
    </div>
  );
};

// Helper function for type badge colors (dark theme)
function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    'projects': 'bg-blue-500/20 text-blue-300',
    'tasks': 'bg-green-500/20 text-green-300',
    'knowledge_nodes': 'bg-purple-500/20 text-purple-300',
    'problems': 'bg-red-500/20 text-red-300',
    'skills': 'bg-yellow-500/20 text-yellow-300',
    'resources': 'bg-indigo-500/20 text-indigo-300',
    'preferences': 'bg-pink-500/20 text-pink-300',
    'events': 'bg-orange-500/20 text-orange-300'
  };
  
  return colors[type] || 'bg-gray-500/20 text-gray-300';
}

