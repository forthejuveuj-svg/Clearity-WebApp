import { useState } from "react";
import { Mic, ArrowUp } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatViewProps {
  initialMessage: string;
  onViewMap: () => void;
}

export const ChatView = ({ initialMessage, onViewMap }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: initialMessage },
    {
      role: "assistant",
      content: "Perfect — this is exactly the right mindset.\n\nIf you want to design Reload around how the brain actually works, you need to understand how people think, remember, and focus — not just surface UX rules.\n\nHere's a focused roadmap of the brain topics that are most relevant for UX/UI, especially for your \"digital brain\" platform..."
    }
  ]);
  const [input, setInput] = useState("");
  const [showViewMap, setShowViewMap] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages([...messages, { role: "user", content: input }]);
      setInput("");
      
      // Show "View your mind" button after a few exchanges
      if (messages.length >= 3) {
        setTimeout(() => setShowViewMap(true), 1000);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b10] via-[#111119] to-[#14141d]" />
      
      {/* Subtle background hints of mind map forming */}
      {showViewMap && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full border border-primary animate-breathe" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full border border-secondary animate-breathe" style={{ animationDelay: "1s" }} />
        </div>
      )}

      {/* Chat messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div
              className={`relative max-w-[80%] px-6 py-4 rounded-2xl ${
                message.role === "user"
                  ? "bg-white/10 backdrop-blur-sm text-foreground ml-auto"
                  : "bg-primary/10 backdrop-blur-sm text-foreground border border-primary/20 shadow-lg shadow-primary/5"
              }`}
            >
              {message.role === "assistant" ? (
                <TypingAnimation
                  text={message.content}
                  speed={20}
                  className="text-base leading-relaxed whitespace-pre-line"
                />
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-line">{message.content}</p>
              )}
              {message.role === "assistant" && (
                <div className="absolute -left-2 top-4 w-1 h-8 bg-gradient-to-b from-primary via-secondary to-accent rounded-full animate-pulse-glow" />
              )}
            </div>
          </div>
        ))}

        {/* View your mind button */}
        {showViewMap && (
          <div className="flex justify-center pt-8 animate-scale-in">
            <button
              onClick={onViewMap}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent via-secondary to-primary
                         text-white font-medium shadow-lg shadow-primary/20
                         hover:shadow-primary/40 hover:scale-105
                         transition-all duration-300"
            >
              View your mind
            </button>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="relative z-10 px-6 pb-8 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Let's overthink about..."
              className="w-full px-6 py-4 pr-24 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl 
                         text-base text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         transition-all duration-300"
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-300"
              >
                <Mic className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all duration-300"
              >
                <ArrowUp className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
