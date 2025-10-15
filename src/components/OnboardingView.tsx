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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b10] via-[#111119] to-[#14141d]" />
      
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-6 max-w-3xl w-full animate-fade-in">
        {/* Animated text */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-light text-muted-foreground relative inline-block strikethrough-animated">
            From Overthinker
          </h1>
          <h2 className="text-5xl md:text-6xl font-medium gradient-text animate-pulse-glow">
            To an Overthinker
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
              className="w-full px-6 py-6 pr-24 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl 
                         text-lg text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         transition-all duration-300
                         hover:bg-white/8 hover:border-white/20"
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-300"
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-3 rounded-xl bg-primary/20 hover:bg-primary/30 
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all duration-300
                           enabled:hover:scale-110"
              >
                <ArrowUp className="w-5 h-5 text-primary" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
