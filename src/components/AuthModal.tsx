import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingMessage?: string;
}

export const AuthModal = ({ isOpen, onClose, pendingMessage }: AuthModalProps) => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      
      // Mark that user should go to combined view
      localStorage.setItem('currentView', 'combined');
      
      onClose();
      
      // If there's a pending message, go to app with it
      if (pendingMessage) {
        navigate("/", { state: { startWithMessage: pendingMessage } });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleEmailAuth = () => {
    onClose();
    // Navigate to a dedicated auth page or show email form
    navigate("/auth", { state: { message: pendingMessage } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-8 pb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Create free account
          </h2>
        </div>

        {/* Auth Options */}
        <div className="px-8 pb-6">
          <div className="space-y-3">
            {/* Google */}
            <Button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium h-12 flex items-center justify-center gap-3 relative"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">OR</span>
              </div>
            </div>

            {/* Email */}
            <Button
              onClick={handleEmailAuth}
              disabled={isLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium h-12 flex items-center justify-center gap-3 border border-gray-600"
            >
              Continue with email
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <p className="text-xs text-gray-400 text-center">
            By continuing, you agree to the{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
