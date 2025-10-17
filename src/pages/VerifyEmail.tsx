import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Mail, ArrowLeft } from "lucide-react";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  
  // Get the email from the previous step
  const email = location.state?.email || "user@example.com";

  const handleResendEmail = () => {
    setIsResending(true);
    // Simulate resending email
    setTimeout(() => {
      setIsResending(false);
      alert("Verification email sent!");
    }, 1000);
  };

  const handleOpenGmail = () => {
    // Open Gmail in a new tab
    window.open("https://mail.google.com", "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      {/* Back button - top left */}
      <button
        onClick={() => navigate('/auth')}
        className="fixed top-6 left-6 text-white/60 hover:text-white text-sm flex items-center gap-2 transition-colors z-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="w-full max-w-md mx-auto">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Clearity
            </h1>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
          {/* Logo in card */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Main content */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Check your inbox
            </h2>
            <p className="text-white/60 mb-8">
              Click the link we sent to <span className="text-white font-medium">{email}</span> to finish your account setup.
            </p>

            {/* Open Gmail button */}
            <Button
              onClick={handleOpenGmail}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium h-12 flex items-center justify-center gap-3 border border-gray-600 mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819v9.273L12 8.64l6.545 4.454V3.821h3.819c.904 0 1.636.732 1.636 1.636z"/>
              </svg>
              Open Gmail
            </Button>

            {/* Resend email */}
            <div className="text-center">
              <p className="text-sm text-white/60 mb-2">
                Didn't receive an email?
              </p>
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="text-blue-400 hover:text-blue-300 underline text-sm disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend email"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            This page will automatically redirect once your email is verified
          </p>
        </div>
      </div>
    </div>
  );
};
