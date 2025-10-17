import { useState } from "react";
import { X, AlertTriangle, Lightbulb, CheckCircle, ArrowRight } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  category: string;
  solutions: Solution[];
}

interface Solution {
  id: string;
  title: string;
  description: string;
  action: string;
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
      title: "Overthinking about work deadlines",
      description: "Constantly worrying about upcoming project deadlines and feeling overwhelmed with tasks",
      severity: "high",
      category: "Work Stress",
      solutions: [
        {
          id: "1-1",
          title: "Break down tasks into smaller chunks",
          description: "Divide your work into 25-minute focused sessions with 5-minute breaks",
          action: "Try the Pomodoro Technique",
          completed: false
        },
        {
          id: "1-2", 
          title: "Create a priority matrix",
          description: "Categorize tasks by urgency and importance to focus on what matters most",
          action: "Use Eisenhower Matrix",
          completed: false
        },
        {
          id: "1-3",
          title: "Practice mindfulness",
          description: "Take 5-minute breathing exercises when feeling overwhelmed",
          action: "Download a meditation app",
          completed: false
        }
      ]
    },
    {
      id: "2",
      title: "Anxiety about social situations",
      description: "Feeling nervous and overthinking before social events or meetings",
      severity: "medium",
      category: "Social Anxiety",
      solutions: [
        {
          id: "2-1",
          title: "Prepare talking points",
          description: "Write down 3-5 conversation starters before social events",
          action: "Create a mental script",
          completed: false
        },
        {
          id: "2-2",
          title: "Practice exposure therapy",
          description: "Start with small social interactions and gradually increase",
          action: "Join a local meetup group",
          completed: false
        },
        {
          id: "2-3",
          title: "Focus on listening",
          description: "Shift focus from yourself to genuinely listening to others",
          action: "Practice active listening",
          completed: false
        }
      ]
    },
    {
      id: "3",
      title: "Decision paralysis",
      description: "Getting stuck in analysis paralysis when making important life decisions",
      severity: "high",
      category: "Decision Making",
      solutions: [
        {
          id: "3-1",
          title: "Set decision deadlines",
          description: "Give yourself a specific timeframe to make decisions",
          action: "Use the 2-minute rule for small decisions",
          completed: false
        },
        {
          id: "3-2",
          title: "Limit options",
          description: "Reduce choices to top 3 options to avoid overwhelm",
          action: "Create a decision matrix",
          completed: false
        },
        {
          id: "3-3",
          title: "Accept good enough",
          description: "Remember that perfect is the enemy of good",
          action: "Set 80% completion as success",
          completed: false
        }
      ]
    }
  ]);

  const [completedSolutions, setCompletedSolutions] = useState<Set<string>>(new Set());

  const toggleSolution = (solutionId: string) => {
    setCompletedSolutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(solutionId)) {
        newSet.delete(solutionId);
      } else {
        newSet.add(solutionId);
      }
      // Notify parent component about completed solutions
      onSolutionsCompleted?.(newSet.size);
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-400 bg-red-500/10 border-red-400/30";
      case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-400/30";
      case "low": return "text-green-400 bg-green-500/10 border-green-400/30";
      default: return "text-gray-400 bg-gray-500/10 border-gray-400/30";
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
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Problems & Solutions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {problems.map((problem) => (
              <div key={problem.id} className="border border-gray-700 rounded-xl p-6">
                {/* Problem Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{problem.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(problem.severity)}`}>
                        {problem.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{problem.description}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-400/30">
                      {problem.category}
                    </span>
                  </div>
                </div>

                {/* Solutions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Suggested Solutions
                  </h4>
                  {problem.solutions.map((solution) => (
                    <div key={solution.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSolution(solution.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            completedSolutions.has(solution.id)
                              ? 'border-green-400 bg-green-400'
                              : 'border-gray-400 hover:border-green-400'
                          }`}
                        >
                          {completedSolutions.has(solution.id) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h5 className="text-white font-medium mb-1">{solution.title}</h5>
                          <p className="text-gray-400 text-sm mb-2">{solution.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-sm font-medium">{solution.action}</span>
                            <ArrowRight className="w-3 h-3 text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {completedSolutions.size} solutions completed
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
              Generate New Solutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
