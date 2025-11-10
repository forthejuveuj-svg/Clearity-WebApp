import React, { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Clock, Target, ArrowRight, Loader2 } from "lucide-react";
import { convertProblemToProject, getActiveProblems } from "../utils/projectManager";
import { createProject, updateProblem, updateMinddumpProblems, getMinddump } from "../utils/supabaseClient";
// Define Node interface locally to avoid circular imports
interface Node {
  id: string;
  projectId?: string;
  label: string;
  x: number;
  y: number;
  color: "blue" | "violet" | "red" | "teal";
  subNodes?: { label: string; id?: string }[];
  tension?: number;
  thoughts?: string[];
  hasProblem?: boolean;
  problemType?: "anxiety" | "blocker" | "stress";
  problemData?: any[];
  isSubproject?: boolean;
  parentProjectNames?: string[];
}

// Simple problem interface - matches what comes from database
interface Problem {
  id: string;
  name?: string;
  description?: string;
  effect?: string;
  status: 'active' | 'identified' | 'ongoing' | 'resolved';
  created_at: string;
  updated_at?: string;
  project_id?: string;
  tag?: string;
  reasoning?: string[];
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

export interface ProblemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject?: Node | null;
  onSolutionsCompleted?: (count: number) => void;
  onProblemConverted?: (problemId: string, projectId: string) => void;
  currentMinddumpId?: string | null;
}

export const ProblemsModal: React.FC<ProblemsModalProps> = ({ isOpen, onClose, selectedProject, onSolutionsCompleted, onProblemConverted, currentMinddumpId }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertingProblem, setConvertingProblem] = useState<string | null>(null);

  const [completedSolutions, setCompletedSolutions] = useState<Set<string>>(new Set());
  const [remindLater, setRemindLater] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Load problems when modal opens or selected project changes
  useEffect(() => {
    if (isOpen) {
      loadProblems();
    }
  }, [isOpen, selectedProject]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      if (selectedProject) {
        // Show problems specific to the selected project
        const projectProblems = selectedProject.problemData || [];
        console.log('Selected project:', selectedProject.label);
        console.log('Project problems data:', projectProblems);

        // Debug: Log the structure of real problems
        if (projectProblems.length > 0) {
          console.log('First real problem structure:', projectProblems[0]);
          console.log('Problem keys:', Object.keys(projectProblems[0]));
        }

        // Filter out resolved problems
        const activeProblems = projectProblems.filter(p => p.status !== 'resolved');
        setProblems(activeProblems);
      } else {
        // Show all active problems when no specific project is selected
        const activeProblems = await getActiveProblems();
        console.log('All active problems:', activeProblems);
        setProblems(activeProblems);
      }
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

  const handleMarkAsSolved = async (problem: Problem) => {
    console.log('Marking problem as solved:', problem.name);

    setConvertingProblem(problem.id);
    try {
      // Update the problem status to 'resolved' in database
      await updateProblem(problem.id, {
        status: 'resolved'
      });
      console.log('Updated problem status to resolved');

      // Remove the problem from the local list
      const updatedProblems = problems.filter(p => p.id !== problem.id);
      setProblems(updatedProblems);

      // If we have a current minddump, update its problems
      if (currentMinddumpId) {
        try {
          // Get the current minddump to access all its problems
          const minddump = await getMinddump(currentMinddumpId);
          
          if (minddump && minddump.nodes && minddump.nodes.problems) {
            // Filter out the resolved problem from minddump's problems
            const updatedMinddumpProblems = minddump.nodes.problems.filter(
              (p: Problem) => p.id !== problem.id
            );
            
            // Update only the problems in the minddump (preserves projects)
            await updateMinddumpProblems(currentMinddumpId, updatedMinddumpProblems);
            console.log('Updated minddump problems, removed resolved problem');
          }
        } catch (minddumpError) {
          console.error('Error updating minddump:', minddumpError);
          // Continue anyway - the problem is still marked as resolved in DB
        }
      }

      // Notify parent component to refresh the mind map
      onProblemConverted?.(problem.id, '');

      console.log(`Successfully marked "${problem.name}" as solved`);
    } catch (error) {
      console.error('Error marking problem as solved:', error);
      alert(`Failed to mark problem as solved: ${error.message || 'Unknown error'}`);
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
              <h2 className="text-lg font-semibold text-white">
                {selectedProject ? `Problems in "${selectedProject.label}"` : 'Active Problems'}
              </h2>
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
              <h3 className="text-white font-medium mb-2">
                {selectedProject ? 'No problems in this project' : 'No active problems'}
              </h3>
              <p className="text-gray-400 text-sm">
                {selectedProject
                  ? `Great! "${selectedProject.label}" doesn't have any active problems right now.`
                  : 'Great! You don\'t have any active problems right now.'
                }
              </p>
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
                        <h3 className="text-white font-medium text-sm mb-1 leading-tight">
                          {problem.name}
                        </h3>
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
                      onClick={() => handleMarkAsSolved(problem)}
                      disabled={convertingProblem === problem.id}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 text-xs rounded-lg border border-green-500/40 hover:border-green-400/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    >
                      {convertingProblem === problem.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      Solved
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