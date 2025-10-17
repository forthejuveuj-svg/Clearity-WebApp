import { useState } from "react";
import { ArrowLeft, User, Brain, Sliders, Calendar, Box, Mail, Lock, CreditCard, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

type SettingsTab = "information" | "knowledge" | "preferences";

export const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("information");

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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            <button
              onClick={() => setActiveTab("information")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "information"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <User className="w-5 h-5" />
              Personal Information
            </button>

            <button
              onClick={() => setActiveTab("knowledge")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "knowledge"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Brain className="w-5 h-5" />
              Knowledge Center
            </button>

            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "preferences"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sliders className="w-5 h-5" />
              Preferences
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white/5 rounded-2xl p-8 border border-white/10">
            {activeTab === "information" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>

                {/* Subscription - Moved to top */}
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
                  <label className="block text-sm text-white/60 mb-2">Name</label>
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
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm">
                    Change Password
                  </button>
                </div>

                {/* Connected Apps */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-white/60">Connected Apps</label>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm">
                      <Plus className="w-4 h-4" />
                      Connect Another App
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        <span>Calendar</span>
                      </div>
                      <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors">
                        Connect
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Box className="w-5 h-5 text-purple-400" />
                        <span>Obsidian</span>
                      </div>
                      <button className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "knowledge" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6">Knowledge Center</h2>
                <p className="text-white/60">
                  Manage your personal knowledge base, notes, and insights. Connect your external knowledge sources and organize your thoughts.
                </p>
                
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="font-medium mb-3">Connected Knowledge Sources</h3>
                  <p className="text-sm text-white/40">No knowledge sources connected yet.</p>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6">Preferences</h2>
                
                <div>
                  <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-white/60 mt-1">Always use dark theme</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-medium">Auto-save</p>
                      <p className="text-sm text-white/60 mt-1">Automatically save your thoughts</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-medium">Notifications</p>
                      <p className="text-sm text-white/60 mt-1">Receive updates and reminders</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

