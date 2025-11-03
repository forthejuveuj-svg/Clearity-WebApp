/**
 * Simple test component to debug EntityAutocomplete
 * Use this to verify the autocomplete is working before integrating into CombinedView
 */

import React, { useState, useRef } from 'react';
import { EntityAutocomplete } from './EntityAutocomplete';
import { EntitySuggestion } from '@/hooks/useEntityAutocomplete';
import { messageModeHandler } from '@/utils/messageModeHandler';

export const AutocompleteTest = () => {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleEntitySelect = (entity: EntitySuggestion, newText: string) => {
    addLog(`Selected entity: ${entity.name} (${entity.type})`);
    setInput(newText);
    
    messageModeHandler.selectObject({
      id: entity.id,
      name: entity.name,
      type: entity.type
    });
    
    addLog(`Entity selected in messageModeHandler`);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLog(`Form submitted with input: "${input}"`);
    
    const selectedObject = messageModeHandler.getSelectedObject();
    if (selectedObject) {
      addLog(`Selected object: ${selectedObject.name} (${selectedObject.type})`);
    } else {
      addLog('No object selected - would call minddump');
    }
  };

  const handleClear = () => {
    setInput("");
    messageModeHandler.clearSelection();
    addLog('Cleared input and selection');
  };

  const selectedObject = messageModeHandler.getSelectedObject();

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Entity Autocomplete Test</h2>
        
        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Type "@" in the input below</li>
            <li>Start typing to filter entities (e.g., "@cle")</li>
            <li>Use arrow keys (↑↓) or mouse to select</li>
            <li>Press Enter or click to select an entity</li>
            <li>Check the console for debug logs</li>
          </ol>
        </div>

        {/* Selected object indicator */}
        {selectedObject && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold">Selected: </span>
              <span>{selectedObject.name}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                ({selectedObject.type})
              </span>
            </div>
            <button
              onClick={() => {
                messageModeHandler.clearSelection();
                addLog('Cleared selection');
              }}
              className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Test input form */}
        <form onSubmit={handleSubmit} className="relative mb-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messageModeHandler.getPlaceholder()}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:border-blue-500 focus:outline-none"
          />
          
          <EntityAutocomplete
            inputValue={input}
            onSelectEntity={handleEntitySelect}
            inputRef={inputRef}
          />
          
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Debug log */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Event Log:</h3>
          <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-3 font-mono text-xs">
            {log.length === 0 ? (
              <p className="text-gray-500">No events yet...</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="mb-1">{entry}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLog([])}
            className="mt-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Clear Log
          </button>
        </div>

        {/* Debug info */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs space-y-2">
          <div><strong>Current input:</strong> {input || '(empty)'}</div>
          <div><strong>Has "@":</strong> {input.includes('@') ? 'Yes' : 'No'}</div>
          <div><strong>Selected entity:</strong> {selectedObject ? `${selectedObject.name} (${selectedObject.type})` : 'None'}</div>
          <div><strong>Placeholder:</strong> {messageModeHandler.getPlaceholder()}</div>
        </div>
      </div>

      {/* Console reminder */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <p className="text-sm">
          <strong>💡 Tip:</strong> Open the browser console (F12) to see detailed autocomplete debug logs.
        </p>
      </div>
    </div>
  );
};

