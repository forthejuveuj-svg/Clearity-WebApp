import React, { useState } from 'react';
import { FileText, Calendar, Edit2, Check, X } from 'lucide-react';
import { useMinddumpSearch, MinddumpSearchResult } from '@/hooks/useMinddumpSearch';

interface MinddumpSearchBarProps {
    query: string;
    onSelectMinddump: (minddump: MinddumpSearchResult) => void;
    onNeedsRefresh?: (needsRefresh: boolean) => void;
    className?: string;
}

export const MinddumpSearchBar: React.FC<MinddumpSearchBarProps> = ({
    query,
    onSelectMinddump,
    onNeedsRefresh,
    className = ""
}) => {
    const { results, isLoading, error, needsRefresh, updateTitle } = useMinddumpSearch(query);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    
    console.log('MinddumpSearchBar render:', { query, results: results.length, isLoading, error });

    // Notify parent about refresh needs
    React.useEffect(() => {
        if (onNeedsRefresh) {
            onNeedsRefresh(needsRefresh);
        }
    }, [needsRefresh, onNeedsRefresh]);

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

    const handleStartEdit = (minddump: MinddumpSearchResult, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(minddump.id);
        setEditingTitle(minddump.title);
    };

    const handleSaveEdit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingId && editingTitle.trim()) {
            const success = await updateTitle(editingId, editingTitle.trim());
            if (success) {
                setEditingId(null);
                setEditingTitle('');
            }
        }
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
        setEditingTitle('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit(e as any);
        }
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
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('🎯 Minddump clicked:', minddump.title, minddump.id);
                            onSelectMinddump(minddump);
                        }}
                        className="p-5 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 text-left group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {editingId === minddump.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                onClick={handleSaveEdit}
                                                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                                title="Save"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-semibold text-white group-hover:text-purple-300 transition-colors text-base flex-1">
                                                {minddump.title}
                                            </div>
                                            <button
                                                onClick={(e) => handleStartEdit(minddump, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-purple-400 transition-all duration-200"
                                                title="Rename"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
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