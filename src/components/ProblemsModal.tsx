import React, { useState, useRef } from "react";
import { X, AlertTriangle, CheckCircle, Clock, Target } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  tag: string;
  reasoning: string[];
  effect: string;
  microAction: {
    title: string;
    description: string;
    whyThisHelps: string;
  };
  solutions: Solution[];
  isSolvable: boolean;
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
}

export const ProblemsModal = ({ isOpen, onClose, onSolutionsCompleted }: ProblemsModalProps) => {
  const [problems] = useState<Problem[]>([
    {
      id: "1",
      title: "You're feeling scattered and can't focus",
      tag: "Root Cause",
      reasoning: [
        "Multiple priorities without clear order",
        "Repeated concerns across areas", 
        "Stress and indecision detected"
      ],
      effect: "This mental overload can make everything feel urgent and exhausting, even if nothing is really urgent.",
      microAction: {
        title: "Pick the 1 most important task and write it down",
        description: "Choose just one thing to focus on right now",
        whyThisHelps: "Reduces cognitive load by limiting choices to one priority"
      },
      isSolvable: true,
      solutions: [
        {
          id: "1-1",
          title: "Set a 5-minute timer for your task",
          description: "Work on your chosen task for just 5 minutes",
          whyThisHelps: "Makes overwhelming tasks feel manageable",
          completed: false
        },
        {
          id: "1-2",
          title: "Take 3 deep breaths",
          description: "Focus only on your breathing for 30 seconds",
          whyThisHelps: "Activates your calm nervous system",
          completed: false
        }
      ]
    },
    {
      id: "2", 
      title: "You're overthinking social interactions",
      tag: "Emotional Block",
      reasoning: [
        "Fear of judgment is creating mental barriers",
        "Past negative experiences influencing current thoughts",
        "Overanalyzing what others might think"
      ],
      effect: "This anxiety can make you avoid social situations that could actually be positive experiences, creating a cycle of isolation.",
      microAction: {
        title: "Focus on listening to one person",
        description: "In your next conversation, focus only on what they're saying",
        whyThisHelps: "Shifts focus from yourself to others, reducing self-consciousness"
      },
      isSolvable: false,
      solutions: []
    }
  ]);

  const [completedSolutions, setCompletedSolutions] = useState<Set<string>>(new Set());
  const [remindLater, setRemindLater] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

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

  const turnIntoTask = (problemId: string) => {
    console.log(`Turned problem ${problemId} into task`);
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
        className="relative bg-gray-900/95 border border-gray-700/50 rounded-2xl w-full max-w-md mx-auto shadow-2xl max-h-[45vh] overflow-hidden backdrop-blur-sm mt-16 pointer-events-auto"
        style={{ 
          position: 'absolute', 
          left: modalPosition.x || '50%', 
          top: modalPosition.y || '16px', 
          transform: modalPosition.x ? 'none' : 'translateX(-50%)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Problem Header with calm gradient */}
        <div className="modal-header bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{problems[0]?.title}</h2>
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
        <div className="overflow-y-auto max-h-[calc(45vh-200px)]">
          {/* Reasoning / Explanation */}
          <div className="p-4 border-l-2 border-blue-500/40">
            <h3 className="text-blue-300 font-medium mb-2 text-sm">Why this problem exists</h3>
            <div className="space-y-1">
              {problems[0]?.reasoning.map((reason, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Effect / Awareness */}
          <div className="p-4 border-l-2 border-orange-500/40">
            <h3 className="text-orange-300 font-medium mb-2 text-sm">How this affects you</h3>
            <p className="text-gray-300 text-xs leading-relaxed">{problems[0]?.effect}</p>
          </div>

          {/* Solution Path */}
          {problems[0]?.isSolvable ? (
            <div className="p-4 border-l-2 border-green-500/40">
              <h3 className="text-green-300 font-medium mb-2 text-sm">Additional actions you can take:</h3>
              <div className="space-y-2">
                {problems[0]?.solutions.map((solution) => (
                  <div key={solution.id} className="p-3">
                    <div className="flex-1">
                      <h5 className="text-white font-medium mb-1 text-sm">{solution.title}</h5>
                      <p className="text-gray-400 text-xs mb-1">{solution.description}</p>
                      <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block mb-2">
                        Why this helps: {solution.whyThisHelps}
                      </div>
                      <button
                        onClick={() => turnIntoTask(solution.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg border border-blue-500/40 hover:border-blue-400/60 transition-colors"
                      >
                        <Target className="w-3 h-3" />
                        Turn into a task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 border-l-2 border-yellow-500/40">
              <h3 className="text-yellow-300 font-medium mb-2 text-sm">Additional actions you can take:</h3>
              <p className="text-gray-300 text-xs mb-2">
                This can't be solved instantly — that's okay. Focus on noticing it without stress. You can return later if needed.
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remindLater.has(problems[0]?.id)}
                    onChange={() => toggleRemindLater(problems[0]?.id)}
                    className="w-4 h-4 rounded border-gray-400"
                  />
                  <span className="text-gray-300 text-xs">Remind me later</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Closure / Next Step */}
        <div className="p-4">
          <div className="flex items-center justify-center">
            <button
              onClick={() => toggleRemindLater(problems[0]?.id)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
              Remind me later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};