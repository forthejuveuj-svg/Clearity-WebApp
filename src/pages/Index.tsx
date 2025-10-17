import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { OnboardingView } from "@/components/OnboardingView";
import { CombinedView } from "@/components/CombinedView";
import { AuthModal } from "@/components/AuthModal";
import { Plus } from "lucide-react";

type ViewState = "onboarding" | "combined";

const Index = () => {
  const location = useLocation();
  const [currentView, setCurrentView] = useState<ViewState>("onboarding");
  const [initialMessage, setInitialMessage] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");

  // Check if we came back from auth with a message
  useEffect(() => {
    if (location.state?.startWithMessage) {
      const message = location.state.startWithMessage;
      setInitialMessage(message);
      setCurrentView("combined");
      // Clear the state so refresh doesn't restart
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleStart = (message: string) => {
    // Always show auth modal on first message attempt
    setPendingMessage(message);
    setShowAuthModal(true);
  };

  const handleBack = () => {
    setCurrentView("onboarding");
  };

  const handleAuthSuccess = () => {
    if (pendingMessage) {
      setInitialMessage(pendingMessage);
      setCurrentView("combined");
      setPendingMessage("");
    }
    setShowAuthModal(false);
  };

  return (
    <div className="relative">
      <Navigation />
      
      {currentView === "onboarding" && <OnboardingView onStart={handleStart} />}
      {currentView === "combined" && <CombinedView initialMessage={initialMessage} onBack={handleBack} />}
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        pendingMessage={pendingMessage}
      />

      {/* Request a Feature Button */}
      <button
        onClick={() => window.open('https://clearity-web-app.stackvote.app/feedback', '_blank')}
        className="fixed bottom-4 right-6 z-50 group px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-110 flex items-center gap-2"
        aria-label="Request a Feature"
      >
        <Plus className="w-4 h-4 text-white/60" />
        <span className="text-white/60 text-sm font-medium">Feature</span>
        <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          Request a Feature
        </span>
      </button>
    </div>
  );
};

export default Index;
