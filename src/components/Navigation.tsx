import { useState, useEffect, useRef } from "react";
import { Search, Star, User, CheckSquare, Network, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClearityLogo from "@/assets/clearity-logo.svg";
import { SearchModal } from "./SearchModal";
import { TaskManagerModal } from "./TaskManagerModal";
import { useAuthContext } from "./AuthProvider";
import { useAuth } from "@/hooks/useAuth";

interface NavigationProps {
  onLogoClick?: () => void;
  onNavigateToChat?: (task: any) => void;
  onToggleView?: () => void;
  currentView?: 'mindmap' | 'tasks';
  onOpenTaskManager?: () => void;
  onCreateNewMinddump?: () => void;
  onShowAuth?: () => void;
  onProjectSelect?: (project: any) => void;
}

export const Navigation = ({ onLogoClick, onNavigateToChat, onToggleView, currentView = 'mindmap', onOpenTaskManager, onShowAuth, onProjectSelect, onCreateNewMinddump }: NavigationProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Check if user is paid (simulated - in real app this would come from auth state)
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const selectedPlan = localStorage.getItem("selectedPlan") || "Monthly";

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      
      navigate('/');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Logo and Settings */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            } else {
              navigate('/');
            }
          }}
          className="w-10 h-10 rounded-full shadow-lg overflow-hidden hover:scale-110 transition-transform duration-300"
          aria-label="Go to Home"
        >
          <img src={ClearityLogo} alt="Clearity Logo" className="w-full h-full object-cover" />
        </button>
        
        {/* New Mind Dump Button */}
        {user && onCreateNewMinddump && (
          <button
            onClick={onCreateNewMinddump}
            className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-sm border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-110 group"
            title="Create New Mind Map"
            aria-label="Create New Mind Map"
          >
            <Plus className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
          </button>
        )}
        
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
              aria-label="User Menu"
            >
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="User Avatar" 
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <User className="w-5 h-5 text-white/60" />
              )}
            </button>

            {showUserMenu && (
              <div className="absolute top-full mt-2 left-0 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[200px]">
                <div className="p-3 border-b border-white/10">
                  <p className="text-white text-sm font-medium truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-white/50 text-xs truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                  >
                    <User className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    <span className="text-white/80 text-sm group-hover:text-white transition-colors">Settings</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                  >
                    <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                    <span className="text-white/80 text-sm group-hover:text-white transition-colors">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <button 
          onClick={() => {
            if (onToggleView) {
              onToggleView();
            } else if (onOpenTaskManager) {
              onOpenTaskManager();
            } else {
              setIsTaskManagerOpen(true);
            }
          }}
          className="hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
          aria-label={currentView === 'tasks' ? 'Mind Map' : 'Task Manager'}
        >
          {currentView === 'tasks' ? (
            <Network className="w-5 h-5 text-white/60" />
          ) : (
            <CheckSquare className="w-5 h-5 text-white/60" />
          )}
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

        {/* Sign Up / Log In Button - Only show if onShowAuth is provided (onboarding page) */}
        {onShowAuth && (
          <button
            onClick={onShowAuth}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/20 
                       text-white text-sm font-medium transition-all duration-300 hover:scale-105 hover:border-blue-500/50"
          >
            Sign Up
          </button>
        )}
        
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
        onNavigateToChat={onNavigateToChat}
      />
      
    </nav>
  );
};
