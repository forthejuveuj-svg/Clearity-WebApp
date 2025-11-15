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

    const handleCancelEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        setEditingId(null);
        setEditingTitle(''); // Reset to empty - original title will be shown when not editing
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit(e as any);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit(e as any);
        }
        // Space and other keys work normally - no special handling needed
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

            <div className="grid gap-3 max-h-96 overflow-y-auto">
                {results.map((minddump) => (
                    <button
                        key={minddump.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('🎯 Minddump clicked:', minddump.title, minddump.id);
                            onSelectMinddump(minddump);
                        }}
                        className="p-4 bg-gray-900/60 border border-gray-700/50 rounded-xl hover:bg-gray-800/70 hover:border-purple-500/40 transition-all duration-200 text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {editingId === minddump.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={handleKeyDown}
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
                                            <div className="font-semibold text-white group-hover:text-purple-300 transition-colors text-base flex-1 truncate">
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
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium flex-shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                <span>{formatDate(minddump.created_at)}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};