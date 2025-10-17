import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Mail } from "lucide-react";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Get the message that was passed (if any)
  const pendingMessage = location.state?.message || "";

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Check if email is valid and has real domain
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const realDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'aol.com'];
    if (!emailRegex.test(email)) return false;
    
    const domain = email.split('@')[1]?.toLowerCase();
    return realDomains.includes(domain);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail(signupEmail)) {
      // Navigate to verify email page
      navigate("/verify-email", { 
        state: { 
          email: signupEmail,
          name: signupName,
          message: pendingMessage 
        } 
      });
    } else {
      alert("Please enter a valid email with a real domain (gmail.com, yahoo.com, etc.)");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Store auth state
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", loginEmail);
      setIsLoading(false);
      
      // If there's a pending message, go back to app with it
      if (pendingMessage) {
        navigate("/", { state: { startWithMessage: pendingMessage } });
      } else {
        navigate("/");
      }
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupPassword !== signupConfirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Store auth state
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", signupEmail);
      localStorage.setItem("userName", signupName);
      setIsLoading(false);
      
      // If there's a pending message, go back to app with it
      if (pendingMessage) {
        navigate("/", { state: { startWithMessage: pendingMessage } });
      } else {
        navigate("/");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      {/* Back button - top left */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 text-white/60 hover:text-white text-sm flex items-center gap-2 transition-colors z-50"
      >
        ← Back
      </button>

      <div className="w-full max-w-md mx-auto">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Clearity
            </h1>
          </div>
          
          <p className="text-white/60 text-sm">
            Transform Your Overthinking Into Clarity
          </p>
        </div>

        {/* Auth Forms */}
        <div className="w-full">
          {!showLogin ? (
            // Signup Form
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Create your account</CardTitle>
              </CardHeader>
              
              {!emailVerified ? (
                // Step 1: Email and Name
                <form onSubmit={handleEmailSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-white/80">Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white/80">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Continue
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                // Step 2: Password fields
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white/80">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-white/80">Confirm Password</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                    <p className="text-xs text-white/50">
                      By continuing, you agree to the{" "}
                      <a href="#" className="text-purple-400 hover:text-purple-300 underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-purple-400 hover:text-purple-300 underline">
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Create your account"}
                    </Button>
                  </CardFooter>
                </form>
              )}
              
              {/* Login link at bottom */}
              <div className="px-6 pb-6 text-center">
                <p className="text-sm text-white/60">
                  Already have an account?{" "}
                  <button
                    onClick={() => setShowLogin(true)}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </Card>
          ) : (
            // Login Form
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Welcome back</CardTitle>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/80">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/80">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Log in"}
                  </Button>
                </CardFooter>
              </form>
              
              {/* Signup link at bottom */}
              <div className="px-6 pb-6 text-center">
                <p className="text-sm text-white/60">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setShowLogin(false)}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
