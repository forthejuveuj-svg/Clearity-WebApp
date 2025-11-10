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

    if (!query.trim()) {
        return null;
    }

    if (isLoading) {
        return (
            <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
                <div className="text-gray-400 text-sm">Searching minddumps...</div>
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
                <div className="text-gray-400 text-sm">No minddumps found for "{query}"</div>
            </div>
        );
    }

    return (
        <div className={className}>
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Mind Maps ({results.length})
            </h3>

            <div className="grid gap-3 max-h-64 overflow-y-auto">
                {results.map((minddump) => (
                    <button
                        key={minddump.id}
                        onClick={() => onSelectMinddump(minddump)}
                        className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-all duration-200 text-left group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                                <FileText className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                                        {minddump.title}
                                    </div>
                                    {minddump.prompt && (
                                        <div className="text-sm text-gray-400 mt-1">
                                            {truncateText(minddump.prompt)}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Calendar className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-500">
                                            {formatDate(minddump.created_at)}
                                        </span>
                                        {minddump.metadata?.entities_count && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                                {minddump.metadata.entities_count.projects || 0} projects
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};