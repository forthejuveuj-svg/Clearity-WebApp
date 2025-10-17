import { useState, useEffect } from "react";
import { Search, X, Clock, Brain, ArrowRight } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchHistory {
  id: string;
  query: string;
  date: string;
  time: string;
  description: string;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([
    {
      id: "1",
      query: "Brain → Clearity UX/UI design",
      date: "29/09",
      time: "11:34am",
      description: "Brain → Clearity UX/UI design"
    },
    {
      id: "2", 
      query: "Brain → habit building for GYM",
      date: "22/09",
      time: "4:55pm",
      description: "Brain → habit building for GYM"
    },
    {
      id: "3",
      query: "Startup → UX/UI course for landings",
      date: "12/09", 
      time: "12:28am",
      description: "Startup → UX/UI course for landings"
    },
    {
      id: "4",
      query: "Brain → Neuroscience books",
      date: "09/09",
      time: "8:44am", 
      description: "Brain → Neuroscience books"
    }
  ]);

  const [filteredHistory, setFilteredHistory] = useState<SearchHistory[]>(searchHistory);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchHistory.filter(item => 
        item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(searchHistory);
    }
  }, [searchQuery, searchHistory]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Add to search history
      const newSearch: SearchHistory = {
        id: Date.now().toString(),
        query: query,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(),
        description: query
      };
      
      setSearchHistory(prev => [newSearch, ...prev.slice(0, 3)]);
      setSearchQuery("");
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Search</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="How brain works for my startup"
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-600 rounded-xl 
                         text-white placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-300"
              autoFocus
            />
          </div>
        </div>

        {/* Search History */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Recent searches</h3>
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSearch(item.query)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-800 hover:bg-gray-700 
                           transition-all duration-200 group"
              >
                <div className="text-left">
                  <p className="text-white font-medium">{item.query}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{item.date}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
