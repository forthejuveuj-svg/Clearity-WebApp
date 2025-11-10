import { useState, useEffect } from "react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { OnboardingView } from "@/components/OnboardingView";
import { CombinedView } from "@/components/CombinedView";
import { AuthModal } from "@/components/AuthModal";
import { useAuthContext } from "@/components/AuthProvider";
import { MessageCircle, Plus, Lightbulb, Bug, Mail, Sparkles, X, Upload, Image as ImageIcon, CheckCircle, Calendar, Instagram, Phone } from "lucide-react";

type ViewState = "onboarding" | "combined";

const Index = () => {
  const location = useLocation();
  const { user, loading } = useAuthContext();
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    // Don't restore view from storage initially - let auth check handle it
    return 'onboarding';
  });
  const [initialMessage, setInitialMessage] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugReport, setBugReport] = useState({
    description: "",
    attachments: "",
    desiredOutcome: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showBugSubmittedNotification, setShowBugSubmittedNotification] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Save current view to localStorage for persistence across sessions
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Auto-redirect authenticated users to combined view and handle persistence
  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated
        const savedView = localStorage.getItem('currentView');
        const hasBeenToCombined = savedView === 'combined';
        
        // Always go to combined view if user is logged in, unless they explicitly went back to onboarding
        if (hasBeenToCombined || location.state?.startWithMessage || currentView === 'onboarding') {
          setCurrentView('combined');
          
          // Handle message from auth redirect
          if (location.state?.startWithMessage) {
            setInitialMessage(location.state.startWithMessage);
            // Clear the state so refresh doesn't restart
            window.history.replaceState({}, document.title);
          }
        }
      } else {
        // User is not authenticated, reset to onboarding and clear saved view
        setCurrentView('onboarding');
        localStorage.removeItem('currentView');
      }
    }
  }, [user, loading, location.state]);

  // Initialize view state from localStorage on component mount (before auth loads)
  useEffect(() => {
    const savedView = localStorage.getItem('currentView');
    if (savedView === 'combined') {
      // Only set to combined if we expect the user to be logged in
      // This will be corrected by the auth effect above if user is not actually logged in
      setCurrentView('combined');
    }
  }, []); // Run only once on mount



  const handleStart = (message: string) => {
    // Check if user is authenticated
    if (user) {
      // User is authenticated, go directly to combined view
      setInitialMessage(message);
      setCurrentView("combined");
    } else {
      // User not authenticated, show auth modal
      setPendingMessage(message);
      setShowAuthModal(true);
    }
  };

  const handleBack = () => {
    setCurrentView("onboarding");
    // Don't remove from localStorage - let user choose to go back to combined view easily
    // The view will be restored to combined on next visit if user is still logged in
  };

  const handleShowAuthFromOnboarding = () => {
    if (user) {
      // User is already authenticated, go to combined view
      setCurrentView("combined");
    } else {
      setShowAuthModal(true);
    }
  };

  const handleOpenTaskManagerFromOnboarding = () => {
    if (user) {
      // User is authenticated, go directly to task manager
      setCurrentView("combined");
      setCombinedViewState('tasks');
      setInitialMessage(""); // Empty message since going directly to task manager
    } else {
      // User not authenticated, show auth modal
      setShowAuthModal(true);
    }
  };

  const toggleViewRef = React.useRef<(() => void) | null>(null);
  const navigateToChatRef = React.useRef<((task: any) => void) | null>(null);
  const reloadNodesRef = React.useRef<((options?: any) => void) | null>(null);
  const [combinedViewState, setCombinedViewState] = useState<'mindmap' | 'tasks'>('mindmap');

  const handleNavigateToChat = (task: any) => {
    // Navigate to combined view with task context
    setCurrentView("combined");
    setInitialMessage(`Let's discuss "${task.title}". What would you like to know or work on?`);
  };

  const handleToggleView = () => {
    if (toggleViewRef.current) {
      toggleViewRef.current();
    }
  };

  const handleTaskNavigateToChat = (task: any) => {
    if (navigateToChatRef.current) {
      navigateToChatRef.current(task);
    }
  };

  const registerToggleView = (fn: () => void) => {
    toggleViewRef.current = fn;
  };

  const registerNavigateToChat = (fn: (task: any) => void) => {
    navigateToChatRef.current = fn;
  };

  const registerReloadNodes = (fn: (options?: any) => void) => {
    reloadNodesRef.current = fn;
  };

  const handleProjectSelect = (project: any) => {
    // Switch to combined view if not already there
    if (currentView !== 'combined') {
      setCurrentView('combined');
    }
    
    // Switch to mindmap view
    setCombinedViewState('mindmap');
    
    // Update the mind map based on project selection
    if (reloadNodesRef.current) {
      if (project.type === 'main') {
        // Show main projects (projects without parents)
        reloadNodesRef.current({ 
          showTodayOnly: false, // Show all main projects, not just today's
          forceRefresh: true 
        });
      } else if (project.type === 'parent') {
        // Show subprojects of the selected parent project
        reloadNodesRef.current({ 
          parentProjectId: project.id,
          showSubprojects: true,
          forceRefresh: true 
        });
      }
    }
  };

  const handleCreateNewMinddump = () => {
    // Switch to combined view if not already there
    if (currentView !== 'combined') {
      setCurrentView('combined');
    }
    
    // Switch to mindmap view
    setCombinedViewState('mindmap');
    
    // Clear any existing mind map and start fresh
    if (reloadNodesRef.current) {
      reloadNodesRef.current({ 
        forceRefresh: true,
        clearNodes: true // This will be a new option to clear existing nodes
      });
    }
    
    // Set an initial message to start a new mind map
    setInitialMessage("Let's create a new mind map! What would you like to organize or explore?");
  };

  const handleAuthSuccess = () => {
    if (pendingMessage) {
      setInitialMessage(pendingMessage);
      setCurrentView("combined");
      setPendingMessage("");
    }
    setShowAuthModal(false);
  };

  const handleBugReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Bug report submitted:", bugReport, "Files:", uploadedFiles);
    // Here you would typically send this to your backend with FormData
    setIsBugReportOpen(false);
    setShowBugSubmittedNotification(true);
    setBugReport({
      description: "",
      attachments: "",
      desiredOutcome: ""
    });
    setUploadedFiles([]);
    
    // Auto-hide notification after 1.5 seconds
    setTimeout(() => {
      setShowBugSubmittedNotification(false);
    }, 1500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...filesArray]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setUploadedFiles([...uploadedFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="relative">
      <Navigation 
        onLogoClick={handleBack} 
        onNavigateToChat={handleTaskNavigateToChat}
        onToggleView={currentView === 'combined' ? handleToggleView : undefined}
        currentView={currentView === 'combined' ? combinedViewState : 'mindmap'}
        onOpenTaskManager={currentView === 'onboarding' ? handleOpenTaskManagerFromOnboarding : undefined}
        onShowAuth={currentView === 'onboarding' ? handleShowAuthFromOnboarding : undefined}
        onProjectSelect={handleProjectSelect}
        onCreateNewMinddump={currentView === 'combined' ? handleCreateNewMinddump : undefined}
      />
      
      {currentView === "onboarding" && (
        <OnboardingView 
          onStart={handleStart} 
          onShowAuth={handleShowAuthFromOnboarding}
        />
      )}
      {currentView === "combined" && (
        <CombinedView 
          initialMessage={initialMessage} 
          onBack={handleBack}
          onToggleView={registerToggleView}
          onNavigateToChat={registerNavigateToChat}
          onViewChange={setCombinedViewState}
          initialView={combinedViewState}
          onReloadNodes={registerReloadNodes}
        />
      )}
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        pendingMessage={pendingMessage}
      />

      {/* Customer Support Menu - only show in combined view */}
      {currentView === "combined" && (
        <div className="fixed bottom-4 right-6 xl:right-6 z-50">
          {/* Menu Options */}
          {isSupportMenuOpen && (
            <div className="absolute bottom-14 right-0 mb-1 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-1.5 space-y-0.5 min-w-[160px]">
                <button
                  onClick={() => {
                    window.open('https://clearity-web-app.stackvote.app/feedback', '_blank');
                    setIsSupportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  <span className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">Request a feature</span>
                </button>
                
                <button
                  onClick={() => {
                    window.open('https://clearity-web-app.stackvote.app/roadmap', '_blank');
                    setIsSupportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <span className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">Upcoming features</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsBugReportOpen(true);
                    setIsSupportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                >
                  <Bug className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300 transition-colors" />
                  <span className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">Found a bug</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsContactModalOpen(true);
                    setIsSupportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2 text-left group"
                >
                  <Mail className="w-3.5 h-3.5 text-green-400 group-hover:text-green-300 transition-colors" />
                  <span className="text-white/80 text-xs font-medium group-hover:text-white transition-colors">Contact us</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Support Button */}
          <button
            onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
            className={`px-4 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 ${
              isSupportMenuOpen 
                ? 'bg-blue-500/20 border border-blue-500/30 scale-110' 
                : 'bg-white/5 hover:bg-white/10 hover:scale-110'
            }`}
            style={{
              padding: window.innerWidth < 850 ? '0.75rem' : '0.75rem 1rem'
            }}
            aria-label="Customer Support"
          >
            <MessageCircle className={`w-5 h-5 transition-colors ${
              isSupportMenuOpen ? 'text-blue-400' : 'text-white/60'
            }`} />
            {window.innerWidth >= 850 && (
              <span className={`text-sm font-medium transition-colors ${
                isSupportMenuOpen ? 'text-blue-400' : 'text-white/60'
              }`}>Support</span>
            )}
          </button>
        </div>
      )}

      {/* Bug Report Modal */}
      {isBugReportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold text-white">Report a Bug</h2>
              </div>
              <button
                onClick={() => setIsBugReportOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBugReportSubmit} className="p-6 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Describe the problem
                </label>
                <textarea
                  value={bugReport.description}
                  onChange={(e) => setBugReport({ ...bugReport, description: e.target.value })}
                  placeholder="What happened? Please be as detailed as possible..."
                  rows={5}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  required
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Attach photos or files <span className="text-white/50 font-normal">(optional)</span>
                </label>
                
                {/* Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                    isDragging 
                      ? 'border-red-400 bg-red-500/10' 
                      : 'border-white/20 bg-gray-800/50 hover:border-white/30'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <Upload className={`w-8 h-8 transition-colors ${
                      isDragging ? 'text-red-400' : 'text-white/40'
                    }`} />
                    <p className="text-white/70 text-sm text-center">
                      <span className="text-red-400 font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-white/40 text-xs">PNG, JPG, GIF up to 10MB</p>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 px-3 py-2 bg-gray-800 border border-white/10 rounded-lg"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-white/80 text-sm flex-1 truncate">{file.name}</span>
                        <span className="text-white/40 text-xs flex-shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-white/40 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desired Outcome */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Desired outcome <span className="text-white/50 font-normal">(optional)</span>
                </label>
                <textarea
                  value={bugReport.desiredOutcome}
                  onChange={(e) => setBugReport({ ...bugReport, desiredOutcome: e.target.value })}
                  placeholder="What would you like to happen instead?"
                  rows={3}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBugReportOpen(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-base bg-gray-800 hover:bg-gray-700 text-white border border-white/10 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-medium text-base bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/20 transition-all duration-300"
                >
                  Submit Bug Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bug Report Submitted Notification */}
      {showBugSubmittedNotification && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl px-6 py-4 shadow-2xl shadow-green-500/20 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <p className="text-white font-medium">Bug report submitted!</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full">
            {/* Header */}
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-bold text-white">Contact Us</h2>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contact Info */}
            <div className="p-6 space-y-4">
              {/* Calendly */}
              <a
                href="https://calendly.com/forthejuveuj/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-white/10 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-0.5">Schedule a call</p>
                  <p className="text-white text-sm font-medium group-hover:text-orange-400 transition-colors">
                    Book on Calendly
                  </p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:jago@clearity.pro"
                className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-white/10 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-0.5">Email</p>
                  <p className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors truncate">
                    jago@clearity.pro
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/992929898800"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-white/10 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-0.5">WhatsApp</p>
                  <p className="text-white text-sm font-medium group-hover:text-green-400 transition-colors">
                    +992 92 989 88 00
                  </p>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/over7inker/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-white/10 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs mb-0.5">Instagram</p>
                  <p className="text-white text-sm font-medium group-hover:text-pink-400 transition-colors">
                    @over7inker
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
