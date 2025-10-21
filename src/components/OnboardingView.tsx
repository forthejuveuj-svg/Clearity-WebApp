import { useState, useEffect } from "react";
import { Mic, ArrowUp } from "lucide-react";

interface OnboardingViewProps {
  onStart: (message: string) => void;
  onShowAuth?: () => void;
}

export const OnboardingView = ({ onStart, onShowAuth }: OnboardingViewProps) => {
  const [input, setInput] = useState("");
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


  return (
    <div className="min-h-screen relative overflow-y-auto bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Hero Section */}
      <div className="h-[70vh] flex items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center gap-12 px-6 max-w-4xl w-full">
          {/* Text content */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium whitespace-nowrap">
              <span className="text-blue-500">
                Get Things Done, <span className="text-white">Without Chaos.</span>
              </span>
            </h1>
          <p className="text-base md:text-lg lg:text-xl text-white font-light">
            Put your messy thoughts — Clearity does the rest.
          </p>
          </div>

          {/* Input box */}
            <form onSubmit={handleSubmit} className="w-full max-w-4xl">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Place for all your thoughts and problems"
                className="w-full px-6 md:px-8 py-5 md:py-7 pr-20 md:pr-24 bg-[#1a1a1a] border border-white/10 rounded-2xl 
                           text-base md:text-lg text-white placeholder:text-white/20
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

      {/* Animated Moving Blocks */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-[20%] inset-y-0 overflow-hidden" style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)'
        }}>
        {/* Upper line - Moving right to left - 5 blocks for seamless loop */}
        <div className="absolute top-[60%] animate-move-left-center hover:pause-animation w-max">
          <div className="flex gap-12">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧠 Brain fog making decisions impossible
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              😰 Overwhelmed by too many thoughts at once
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⏰ Procrastinating on important tasks
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Can't focus on one thing at a time
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              📝 Need to brain dump everything out
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧠 Brain fog making decisions impossible
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              😰 Overwhelmed by too many thoughts at once
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⏰ Procrastinating on important tasks
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Can't focus on one thing at a time
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              📝 Need to brain dump everything out
            </div>
          </div>
        </div>
        
        {/* Middle line - Moving left to right - 5 blocks for seamless loop */}
        <div className="absolute top-[70%] animate-move-right-center hover:pause-animation w-max">
          <div className="flex gap-12">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🚀 Need productivity boost to get things done
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              😤 Stressed about unfinished projects
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧩 Can't organize scattered thoughts
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⚡ Mental energy drained by chaos
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Need help prioritizing what matters
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🚀 Need productivity boost to get things done
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              😤 Stressed about unfinished projects
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧩 Can't organize scattered thoughts
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⚡ Mental energy drained by chaos
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Need help prioritizing what matters
            </div>
          </div>
        </div>
        
        {/* Lower line - Moving right to left - 5 blocks for seamless loop */}
        <div className="absolute top-[80%] animate-move-left-center hover:pause-animation w-max">
          <div className="flex gap-12">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧘 Need stress reduction techniques
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🔄 Stuck in analysis paralysis
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              💭 Mind racing with random thoughts
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Can't break down big tasks
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⚡ Executive function overload
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🧘 Need stress reduction techniques
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🔄 Stuck in analysis paralysis
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              💭 Mind racing with random thoughts
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              🎯 Can't break down big tasks
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-3 text-sm text-white/70 whitespace-nowrap hover:bg-white/30 hover:border-white/60 hover:text-white transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/20">
              ⚡ Executive function overload
            </div>
          </div>
        </div>
        </div>
      </div>

    </div>
  );
};
