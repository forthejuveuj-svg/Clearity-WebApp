import React, { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Clock, Target, ArrowRight, Loader2 } from "lucide-react";
import { convertProblemToProject, getActiveProblems } from "../utils/projectManager";

interface Problem {
  id: string;
  title: string;
  description?: string;
  tag?: string;
  reasoning?: string[];
  effect?: string;
  status: 'active' | 'ongoing' | 'resolved';
  created_at: string;
  updated_at?: string;
  project_id?: string;
  microAction?: {
    title: string;
    description: string;
    whyThisHelps: string;
  };
  solutions?: Solution[];
  isSolvable?: boolean;
}

interface Solution {
  id: string;
  title: string;
  description: string;
  whyThisHelps: string;
  completed: boolean;
}

interface ProblemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolutionsCompleted?: (count: number) => void;
  onProblemConverted?: (problemId: string, projectId: string) => void;
}

export const ProblemsModal = ({ isOpen, onClose, onSolutionsCompleted, onProblemConverted }: ProblemsModalProps) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertingProblem, setConvertingProblem] = useState<string | null>(null);

  const [completedSolutions, setCompletedSolutions] = useState<Set<string>>(new Set());
  const [remindLater, setRemindLater] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Load problems when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProblems();
    }
  }, [isOpen]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const activeProblems = await getActiveProblems();
      setProblems(activeProblems);
    } catch (error) {
      console.error('Error loading problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSolution = (solutionId: string) => {
    setCompletedSolutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(solutionId)) {
        newSet.delete(solutionId);
      } else {
        newSet.add(solutionId);
      }
      onSolutionsCompleted?.(newSet.size);
      return newSet;
    });
  };

  const toggleRemindLater = (problemId: string) => {
    setRemindLater(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  const handleConvertToProject = async (problem: Problem) => {
    setConvertingProblem(problem.id);
    try {
      const project = await convertProblemToProject(problem);
      
      // Update local state to remove the converted problem
      setProblems(prev => prev.filter(p => p.id !== problem.id));
      
      // Notify parent component
      onProblemConverted?.(problem.id, project.id);
      
      console.log(`Successfully converted problem "${problem.title}" to project "${project.name}"`);
    } catch (error) {
      console.error('Error converting problem to project:', error);
      // You might want to show a toast notification here
    } finally {
      setConvertingProblem(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header area
    const target = e.target as HTMLElement;
    const header = modalRef.current?.querySelector('.modal-header');
    
    if (header && (header.contains(target) || target === header)) {
      e.preventDefault();
      setIsDragging(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && modalRef.current) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // Keep modal within viewport bounds
      const maxX = window.innerWidth - modalRef.current.offsetWidth;
      const maxY = window.innerHeight - modalRef.current.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      setModalPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global event listeners for mouse move and up
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[90vh] z-50 flex items-start justify-end p-4 pointer-events-none"
    >
      {/* Backdrop only for mind map area */}
      <div 
        className="absolute top-0 left-0 right-0 h-[90vh] bg-black/20 pointer-events-auto"
        onClick={onClose}
        style={{
          animation: 'breathe 4s ease-in-out infinite'
        }}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        onMouseDown={handleMouseDown}
        className="relative bg-gray-900/95 border border-gray-700/50 rounded-2xl w-full max-w-lg mx-auto shadow-2xl max-h-[70vh] overflow-hidden backdrop-blur-sm mt-16 pointer-events-auto"
        style={{ 
          position: 'absolute', 
          left: modalPosition.x || '50%', 
          top: modalPosition.y || '16px', 
          transform: modalPosition.x ? 'none' : 'translateX(-50%)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Header */}
        <div className="modal-header bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Active Problems</h2>
              {problems.length > 0 && (
                <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
                  {problems.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(70vh-120px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-400">Loading problems...</span>
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-2">No active problems</h3>
              <p className="text-gray-400 text-sm">Great! You don't have any active problems right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {problems.map((problem, index) => (
                <div key={problem.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-200 hover:shadow-lg">
                  {/* Problem Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-sm mb-1 leading-tight">{problem.title}</h3>
                        {problem.description && (
                          <p className="text-gray-400 text-xs leading-relaxed">{problem.description}</p>
                        )}
                        {problem.effect && (
                          <p className="text-gray-400 text-xs leading-relaxed mt-1">{problem.effect}</p>
                        )}
                      </div>
                    </div>
                    {problem.tag && (
                      <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full ml-3 flex-shrink-0">
                        {problem.tag}
                      </span>
                    )}
                  </div>

                  {/* Problem Details */}
                  {problem.reasoning && problem.reasoning.length > 0 && (
                    <div className="mb-3 ml-5">
                      <h4 className="text-blue-300 font-medium text-xs mb-2">Why this exists:</h4>
                      <div className="space-y-1">
                        {problem.reasoning.slice(0, 2).map((reason, reasonIndex) => (
                          <div key={reasonIndex} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                            <span className="text-gray-400 text-xs">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-700/30 ml-5">
                    <button
                      onClick={() => handleConvertToProject(problem)}
                      disabled={convertingProblem === problem.id}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg border border-blue-500/40 hover:border-blue-400/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    >
                      {convertingProblem === problem.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3 h-3" />
                      )}
                      Convert to Project
                    </button>
                    
                    <button
                      onClick={() => toggleRemindLater(problem.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-all duration-200 hover:shadow-md"
                    >
                      <Clock className="w-3 h-3" />
                      Later
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};