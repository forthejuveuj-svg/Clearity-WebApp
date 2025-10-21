import { useState } from "react";
import { ArrowLeft, User, Mail, Lock, CreditCard, MessageSquarePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Settings = () => {
  const navigate = useNavigate();
  const [showFeatureRequest, setShowFeatureRequest] = useState(false);
  const [featureRequest, setFeatureRequest] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordChange = () => {
    setPasswordError("");
    
    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    
    if (!passwordData.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }
    
    // Here you would typically make an API call to change the password
    // For now, we'll just show success and reset the form
    alert("Password changed successfully!");
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setShowPasswordChange(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Content Area */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>

            {/* Subscription */}
            <div>
              <label className="block text-sm text-white/60 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Subscription
              </label>
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Free Plan</p>
                    <p className="text-sm text-white/60 mt-1">Upgrade to unlock premium features</p>
                  </div>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-white/60 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-white/60 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-white/60 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <button 
                onClick={() => setShowPasswordChange(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm"
              >
                Change Password
              </button>
            </div>

            {/* Connected Apps - Coming Soon */}
            <div>
              <label className="block text-sm text-white/60 mb-3">Connected Apps</label>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                <p className="text-white/40 mb-4">Coming soon...</p>
                <button
                  onClick={() => setShowFeatureRequest(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Any app that we should connect to?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowPasswordChange(false);
              setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
              setPasswordError("");
            }}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4">Change Password</h3>
            
            {/* Current Password */}
            <div className="mb-4">
              <label className="block text-sm text-white/60 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className="block text-sm text-white/60 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter your new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label className="block text-sm text-white/60 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordError("");
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Request Modal */}
      {showFeatureRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFeatureRequest(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4">Request App Integration</h3>
            <p className="text-sm text-white/60 mb-4">
              Tell us which app you'd like us to integrate with Clearity
            </p>
            <textarea
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="e.g., Notion, Todoist, Trello..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors resize-none h-32 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFeatureRequest(false);
                  setFeatureRequest("");
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle submission
                  setShowFeatureRequest(false);
                  setFeatureRequest("");
                }}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

