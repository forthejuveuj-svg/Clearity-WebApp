import { useState } from "react";
import { Mic, ArrowUp } from "lucide-react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  size: "small" | "medium" | "large";
  color: "blue" | "violet" | "red" | "teal";
  subNodes?: { label: string }[];
  tension?: number;
}

interface MindMapViewProps {
  onContinueChat: () => void;
}

export const MindMapView = ({ onContinueChat }: MindMapViewProps) => {
  const [input, setInput] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showLargeNode, setShowLargeNode] = useState<Node | null>(null);

  const nodes: Node[] = [
    {
      id: "brain",
      label: "How brain\nworks",
      x: 25,
      y: 25,
      size: "medium",
      color: "blue",
      subNodes: [
        { label: "YT videos" },
        { label: "Notebook LM" },
        { label: "AI is\ncooking..." },
      ],
    },
    {
      id: "design",
      label: "UX/IU\ndesign",
      x: 55,
      y: 30,
      size: "medium",
      color: "blue",
      subNodes: [
        { label: "Subconsciol\nqueries" },
        { label: "STM & LTM" },
      ],
      tension: 2,
    },
    {
      id: "psychology",
      label: "Psychology",
      x: 35,
      y: 55,
      size: "large",
      color: "blue",
      subNodes: [
        { label: "STM & LTM" },
        { label: "Emotion\nInterdration" },
        { label: "Neuron\nconnections" },
      ],
      tension: 1,
    },
    {
      id: "habits",
      label: "Habits",
      x: 65,
      y: 60,
      size: "large",
      color: "red",
      subNodes: [
        { label: "Learning from\nExperience" },
        { label: "Automation" },
      ],
    },
    {
      id: "clearity",
      label: "Clearity",
      x: 80,
      y: 20,
      size: "large",
      color: "teal",
    },
  ];

  const connections = [
    { from: "brain", to: "design" },
    { from: "brain", to: "psychology" },
    { from: "design", to: "psychology", label: "Making sense" },
    { from: "psychology", to: "habits" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setInput("");
      onContinueChat();
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case "small": return "w-16 h-16 text-xs";
      case "medium": return "w-32 h-32 text-sm";
      case "large": return "w-40 h-40 text-base";
      default: return "w-32 h-32";
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case "blue": return "border-[hsl(var(--node-blue))] shadow-[0_0_40px_-5px_hsl(var(--node-blue)/0.4)]";
      case "violet": return "border-[hsl(var(--node-violet))] shadow-[0_0_40px_-5px_hsl(var(--node-violet)/0.4)]";
      case "red": return "border-[hsl(var(--node-red))] shadow-[0_0_40px_-5px_hsl(var(--node-red)/0.4)]";
      case "teal": return "border-[hsl(var(--node-teal))] shadow-[0_0_40px_-5px_hsl(var(--node-teal)/0.4)]";
      default: return "border-primary";
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b10] via-[#111119] to-[#14141d]" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Mind Map Canvas */}
      <div className="relative z-10 flex-1 overflow-hidden px-6 py-8">
        <div className="relative w-full h-[60vh] max-w-6xl mx-auto">
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const x1 = `${fromNode.x}%`;
              const y1 = `${fromNode.y}%`;
              const x2 = `${toNode.x}%`;
              const y2 = `${toNode.y}%`;

              return (
                <g key={idx}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                  {conn.label && (
                    <text
                      x={`${(fromNode.x + toNode.x) / 2}%`}
                      y={`${(fromNode.y + toNode.y) / 2}%`}
                      fill="hsl(var(--muted-foreground))"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node, idx) => (
            <div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${idx * 0.1}s`,
              }}
            >
              <button
                onClick={() => {
                  setSelectedNode(selectedNode === node.id ? null : node.id);
                  setShowLargeNode(node);
                }}
                className={`
                  ${getSizeClass(node.size)} ${getColorClass(node.color)}
                  relative rounded-full border-2 bg-background/40 backdrop-blur-sm
                  flex items-center justify-center text-center
                  transition-all duration-500
                  hover:scale-110 hover:bg-background/60
                  animate-scale-in animate-breathe
                  cursor-pointer group
                `}
              >
                <span className="font-medium leading-tight px-2 whitespace-pre-line">
                  {node.label}
                </span>

                {/* Tension indicator */}
                {node.tension && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold animate-pulse">
                    {node.tension}
                  </div>
                )}

                {/* Sub-nodes */}
                {selectedNode === node.id && node.subNodes && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 flex flex-wrap gap-2 justify-center max-w-xs animate-scale-in">
                    {node.subNodes.map((sub, subIdx) => (
                      <div
                        key={subIdx}
                        className="px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-primary/30 text-xs whitespace-pre-line"
                      >
                        {sub.label}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Sample AI response */}
        <div className="max-w-4xl mx-auto mt-8 animate-fade-in">
          <div className="px-6 py-4 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
            <p className="text-sm leading-relaxed text-foreground/90">
              Perfect — this is exactly the right mindset. If you want to design Reload around how the brain actually works, you need to understand how people think, remember, and focus...
            </p>
          </div>
        </div>
      </div>

      {/* Large Node Display Overlay */}
      {showLargeNode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div 
            className="absolute top-0 right-0"
            style={{
              transform: "translate(25%, -25%)",
            }}
          >
            <div
              className={`
                ${getColorClass(showLargeNode.color)}
                w-80 h-80 rounded-full border-4 bg-background/60 backdrop-blur-md
                flex items-center justify-center text-center
                animate-scale-in shadow-2xl
              `}
            >
              <div className="px-8">
                <h2 className="text-4xl font-bold leading-tight whitespace-pre-line mb-4">
                  {showLargeNode.label}
                </h2>
                {showLargeNode.subNodes && (
                  <div className="flex flex-wrap gap-2 justify-center mt-6">
                    {showLargeNode.subNodes.map((sub, subIdx) => (
                      <div
                        key={subIdx}
                        className="px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-primary/30 text-sm whitespace-pre-line"
                      >
                        {sub.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowLargeNode(null)}
              className="absolute top-16 left-16 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30 flex items-center justify-center hover:bg-background/90 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>
      )}

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
