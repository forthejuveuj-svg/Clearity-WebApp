import { useState } from "react";
import { Mic, ArrowUp } from "lucide-react";

interface OnboardingViewProps {
  onStart: (message: string) => void;
}

export const OnboardingView = ({ onStart }: OnboardingViewProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onStart(input);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-16 px-6 max-w-4xl w-full">
        {/* Text content */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-gray-400 relative inline-block">
            From Overthinker
            <span className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-400 transform -translate-y-1/2"></span>
          </h1>
          <h2 className="text-6xl md:text-7xl font-medium">
            <span 
              className="bg-gradient-to-r from-purple-400 via-purple-500 to-blue-400 bg-clip-text text-transparent animate-pulse"
              style={{
                backgroundImage: 'linear-gradient(45deg, #a855f7, #8b5cf6, #3b82f6, #6366f1, #a855f7)',
                backgroundSize: '300% 300%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }}
            >
              To an Overthinker
            </span>
          </h2>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Let's overthink about..."
              className="w-full px-6 py-5 pr-20 bg-[#1a1a1a] border border-white/10 rounded-2xl 
                         text-lg text-white placeholder:text-white/50
                         outline-none focus:border-blue-500/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]
                         transition-all duration-200"
            />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
              >
                <Mic className="w-5 h-5 text-white/60" />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all duration-300
                           enabled:hover:scale-105"
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
