import { useState, useEffect } from "react";
import { Mic, ArrowUp, Brain, Calendar, Search } from "lucide-react";

interface OnboardingViewProps {
  onStart: (message: string) => void;
}

export const OnboardingView = ({ onStart }: OnboardingViewProps) => {
  const [input, setInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentWord, setCurrentWord] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  
  const words = ["get things done", "find your blockers", "reduce brain fog", "prioritize tasks"];
  
  useEffect(() => {
    const currentWordText = words[currentWord] + "...";
    let index = 0;
    
    if (isTyping) {
      // Typing animation
      const typingInterval = setInterval(() => {
        if (index < currentWordText.length) {
          setDisplayText(currentWordText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          // Wait a bit then start untyping
          setTimeout(() => setIsTyping(false), 1500);
        }
      }, 50);
      
      return () => clearInterval(typingInterval);
    } else {
      // Untyping animation - start with full word including "?"
      index = currentWordText.length;
      const untypingInterval = setInterval(() => {
        if (index > 0) {
          setDisplayText(currentWordText.slice(0, index - 1));
          index--;
        } else {
          clearInterval(untypingInterval);
          // Move to next word and start typing
          setCurrentWord((prev) => (prev + 1) % words.length);
          setIsTyping(true);
        }
      }, 50);
      
      return () => clearInterval(untypingInterval);
    }
  }, [currentWord, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onStart(input);
    }
  };

  // Sample data for recent sessions
  const recentSessions = [
    {
      id: 1,
      title: "Work Project Anxiety",
      date: "2 hours ago",
      nodes: 12,
      preview: "Deadline stress, team communication, perfectionism"
    },
    {
      id: 2,
      title: "Career Direction Thoughts",
      date: "Yesterday",
      nodes: 8,
      preview: "Job satisfaction, skill development, future goals"
    },
    {
      id: 3,
      title: "Personal Life Balance",
      date: "3 days ago",
      nodes: 15,
      preview: "Time management, relationships, self-care"
    },
    {
      id: 4,
      title: "Financial Planning Worries",
      date: "1 week ago",
      nodes: 10,
      preview: "Budget concerns, savings goals, investment options"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-y-auto bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Hero Section */}
      <div className="h-[87vh] flex items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center gap-12 px-6 max-w-4xl w-full">
          {/* Text content */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium">
              <span 
                className="bg-gradient-to-r from-purple-400 via-purple-500 to-blue-400 bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #a855f7, #8b5cf6, #3b82f6, #6366f1, #a855f7)',
                  backgroundSize: '300% 300%',
                  animation: 'gradientShift 3s ease-in-out infinite'
                }}
              >
                Find your Clearity
              </span>
            </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-500 font-light">
            Overthink the right way with Mind Maps and AI
          </p>
          </div>

          {/* Input box */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask Clearity to ${displayText}`}
                className="w-full px-4 md:px-6 py-3 md:py-5 pr-16 md:pr-20 bg-[#1a1a1a] border border-white/10 rounded-2xl 
                           text-sm md:text-lg text-white placeholder:text-white/20
                           outline-none focus:border-blue-500/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]
                           transition-all duration-200"
              />
              
              <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
                >
                  <Mic className="w-4 h-4 md:w-5 md:h-5 text-white/60" />
                </button>
                
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-1.5 md:p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-300
                             enabled:hover:scale-105"
                >
                  <ArrowUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Sessions Section */}
      <div className="relative z-10 px-4 md:px-6 lg:px-6 pb-16 md:pb-20 lg:pb-24 pt-6 md:pt-7 lg:pt-8 w-full max-w-[95%] md:max-w-[92%] lg:max-w-[90%] mx-auto">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl md:rounded-3xl lg:rounded-3xl p-4 md:p-6 lg:p-8">
          <div className="mb-6 md:mb-7 lg:mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 lg:gap-8">
            <h2 className="text-xl md:text-xl lg:text-2xl font-medium text-white">Jahongir's Clearity</h2>
            <div className="relative w-full md:w-[200px] lg:w-[240px]">
              <Search className="absolute left-3 md:left-4 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 text-white/40" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 md:pl-11 lg:pl-12 pr-3 md:pr-3 lg:pr-4 py-2 text-sm md:text-sm lg:text-base bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder:text-white/30
                           outline-none focus:border-blue-500/30 focus:bg-white/10
                           transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
          {recentSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onStart(session.title)}
              className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl md:rounded-2xl lg:rounded-2xl p-4 md:p-5 lg:p-6 
                         hover:bg-white/10 hover:border-white/20 transition-all duration-300 
                         cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3 md:mb-3 lg:mb-4">
                <div className="flex items-center gap-2 md:gap-2 lg:gap-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 
                                  flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Brain className="w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-base lg:text-lg font-medium text-white/40">{session.title}</h3>
                    <div className="flex items-center gap-1 md:gap-1 lg:gap-2 text-xs md:text-xs lg:text-sm text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>{session.date}</span>
                    </div>
                  </div>
                </div>
                <div className="px-2 md:px-2 lg:px-3 py-0.5 md:py-0.5 lg:py-1 bg-white/5 rounded-full text-xs md:text-xs lg:text-sm text-white/30">
                  {session.nodes} thoughts
                </div>
              </div>
              
              <p className="text-xs md:text-xs lg:text-sm text-slate-500 line-clamp-2">
                {session.preview}
              </p>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};
