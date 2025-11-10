import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { useMinddumpSearch, MinddumpSearchResult } from '@/hooks/useMinddumpSearch';

interface MinddumpSearchBarProps {
    query: string;
    onSelectMinddump: (minddump: MinddumpSearchResult) => void;
    className?: string;
}

export const MinddumpSearchBar: React.FC<MinddumpSearchBarProps> = ({
    query,
    onSelectMinddump,
    className = ""
}) => {
    const { results, isLoading, error } = useMinddumpSearch(query);
    
    console.log('MinddumpSearchBar render:', { query, results: results.length, isLoading, error });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const truncateText = (text: string, maxLength: number = 60) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    if (isLoading) {
        return (
            <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
                <div className="text-gray-400 text-sm">Loading minddumps...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
                <div className="text-red-400 text-sm">{error}</div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
                <div className="text-gray-400 text-sm">
                    {query.trim() ? `No minddumps found for "${query}"` : "No minddumps found"}
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                {query.trim() ? `Search Results (${results.length})` : `Your Mind Maps (${results.length})`}
            </h3>

            <div className="grid gap-4 max-h-96 overflow-y-auto">
                {results.map((minddump) => (
                    <button
                        key={minddump.id}
                        onClick={() => onSelectMinddump(minddump)}
                        className="p-5 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 text-left group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white group-hover:text-purple-300 transition-colors text-base mb-1">
                                    {minddump.title}
                                </div>
                                {minddump.prompt && (
                                    <div className="text-sm text-gray-400 mb-3 leading-relaxed">
                                        {truncateText(minddump.prompt, 80)}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                        <span className="text-xs text-gray-500 font-medium">
                                            {formatDate(minddump.created_at)}
                                        </span>
                                    </div>
                                    {minddump.metadata?.entities_count && (
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                                            {minddump.metadata.entities_count.projects || 0} projects
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};