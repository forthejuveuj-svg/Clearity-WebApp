import { useState } from "react";
import { Search, Star, User, CheckSquare, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClearityLogo from "@/assets/clearity-logo.svg";
import { SearchModal } from "./SearchModal";
import { TaskManagerModal } from "./TaskManagerModal";
import { ProblemsModal } from "./ProblemsModal";

export const Navigation = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);
  const [problemsSolved, setProblemsSolved] = useState<Set<string>>(new Set());
  
  // Check if user is paid (simulated - in real app this would come from auth state)
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const selectedPlan = localStorage.getItem("selectedPlan") || "Monthly";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Logo and Settings */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shadow-lg overflow-hidden">
          <img src={ClearityLogo} alt="Clearity Logo" className="w-full h-full object-cover" />
        </div>
        
        <button 
          onClick={() => navigate('/settings')}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
          aria-label="Settings"
        >
          <User className="w-5 h-5 text-white/60" />
        </button>
        
        <button 
          onClick={() => setIsTaskManagerOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
          aria-label="Task Manager"
        >
          <CheckSquare className="w-5 h-5 text-white/60" />
        </button>
        
        <button 
          onClick={() => setIsProblemsOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-110 relative border-red-400 animate-border-glow"
          aria-label="Problems"
        >
          <Zap className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-white/60" />
        </button>
        
        {isPaidUser ? (
          <div className="relative group">
            <button 
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 rounded-xl text-white font-medium text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(90deg, #a855f7 0%, #8b5cf6 50%, #3b82f6 100%)',
                backgroundSize: '300% 300%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }}
            >
              <Star className="w-4 h-4" />
              Pro
            </button>
            
            <div className="absolute top-full mt-2 right-0 bg-gray-900 border border-white/20 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              <p className="text-xs text-white/70">
                Plan: <span className="text-purple-400 font-semibold">{selectedPlan}</span>
              </p>
              <p className="text-xs text-white/50 mt-0.5">Active subscription</p>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <button 
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 rounded-xl text-white font-medium text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(90deg, #a855f7 0%, #8b5cf6 50%, #3b82f6 100%)',
                backgroundSize: '300% 300%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }}
            >
              <Star className="w-4 h-4" />
              Upgrade to Pro
            </button>
            
            <div className="absolute top-full mt-2 right-0 bg-gray-900 border border-white/20 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              <p className="text-xs text-white/70">
                AI Credits: <span className="text-red-400 font-semibold">10/30</span>
              </p>
              <p className="text-xs text-white/50 mt-0.5">3 days left in trial</p>
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
      
      {/* Task Manager Modal */}
      <TaskManagerModal 
        isOpen={isTaskManagerOpen} 
        onClose={() => setIsTaskManagerOpen(false)} 
      />
      
      {/* Problems Modal */}
      <ProblemsModal 
        isOpen={isProblemsOpen} 
        onClose={() => setIsProblemsOpen(false)}
        onSolutionsCompleted={(count) => setProblemsSolved(new Set([`solved-${count}`]))}
      />
    </nav>
  );
};
