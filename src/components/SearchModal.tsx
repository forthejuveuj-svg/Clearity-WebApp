import { useState } from "react";
import { Search, X } from "lucide-react";
import { MinddumpSearchBar } from "./MinddumpSearchBar";
import { MinddumpSearchResult } from "@/hooks/useMinddumpSearch";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinddumpSelect?: (minddump: MinddumpSearchResult) => void;
}

export const SearchModal = ({ isOpen, onClose, onMinddumpSelect }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  
  console.log('SearchModal render:', { isOpen, searchQuery });

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchQuery("");
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const handleMinddumpSelect = (minddump: MinddumpSearchResult) => {
    console.log('🔄 SearchModal handleMinddumpSelect called:', minddump.title);
    // Call the callback if provided
    if (onMinddumpSelect) {
      console.log('📞 Calling onMinddumpSelect callback');
      onMinddumpSelect(minddump);
    } else {
      console.warn('⚠️ No onMinddumpSelect callback provided');
    }
    handleClose();
  };

  const handleClose = async () => {
    // If there were changes, refresh the cache before closing
    if (needsRefresh) {
      console.log('Refreshing minddumps cache before closing modal');
      try {
        const { refreshMinddumpsCache } = await import('@/utils/supabaseClient.js');
        await refreshMinddumpsCache();
      } catch (error) {
        console.error('Error refreshing cache on modal close:', error);
      }
    }
    
    // Reset state
    setNeedsRefresh(false);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Search</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search your mind maps..."
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-600 rounded-xl 
                         text-white placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-300"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="px-6 pb-6">
          <MinddumpSearchBar 
            query={searchQuery}
            onSelectMinddump={handleMinddumpSelect}
            onNeedsRefresh={setNeedsRefresh}
            className="border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};
