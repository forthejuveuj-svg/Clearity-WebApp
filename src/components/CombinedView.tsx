import { useState, useEffect } from "react";
import { Mic, ArrowUp, MessageSquare, AlertTriangle } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";
import { ProblemsModal } from "./ProblemsModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  size: "small" | "medium" | "large";
  color: "blue" | "violet" | "red" | "teal";
  subNodes?: { label: string }[];
  tension?: number;
  thoughts?: string[];
  hasProblem?: boolean;
  problemType?: "anxiety" | "blocker" | "stress";
}

interface CombinedViewProps {
  initialMessage: string;
  onBack: () => void;
}

export const CombinedView = ({ initialMessage, onBack }: CombinedViewProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: initialMessage }
  ]);
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildProgress, setBuildProgress] = useState(0);
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [mapHeight, setMapHeight] = useState(90); // Percentage of screen height for mind map
  const [isDragging, setIsDragging] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [dragDirection, setDragDirection] = useState<'vertical' | 'horizontal' | null>(null);
  const [historyPosition, setHistoryPosition] = useState(0); // 0 = current, negative = past, positive = future
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState(0); // Raw drag distance for smooth interpolation (-300 to 300)
  const [typingMessages, setTypingMessages] = useState<Set<number>>(new Set());
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);

  // Mind map states for different history positions
  const mindMapStates: { [key: number]: Node[] } = {
    // Past maps
    "-3": [
      { id: "stress", label: "Stress", x: 25, y: 45, size: "large", color: "red", thoughts: ["work", "deadlines", "pressure"] },
      { id: "anxiety", label: "Anxiety", x: 50, y: 30, size: "large", color: "violet", thoughts: ["worry", "fear", "doubt"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    "-2": [
      { id: "mindfulness", label: "Mindfulness", x: 30, y: 50, size: "large", color: "blue", thoughts: ["meditation", "present", "awareness"] },
      { id: "focus", label: "Focus", x: 55, y: 35, size: "large", color: "violet", thoughts: ["attention", "clarity", "goals"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    "-1": [
      { id: "thinking", label: "Thinking", x: 25, y: 45, size: "large", color: "blue", thoughts: ["logic", "reason", "analysis"] },
      { id: "creativity", label: "Creativity", x: 50, y: 60, size: "large", color: "violet", thoughts: ["ideas", "imagination", "innovation"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    // Current map
    "0": [
      { id: "brain", label: "How brain\nworks", x: 20, y: 40, size: "large", color: "blue", thoughts: ["neurons", "memory", "focus"], hasProblem: true, problemType: "anxiety" },
      { id: "design", label: "UX/UI\ndesign", x: 45, y: 25, size: "large", color: "violet", thoughts: ["colors", "layout", "flow"], hasProblem: true, problemType: "blocker" },
      { id: "psychology", label: "Psychology", x: 35, y: 65, size: "large", color: "blue", thoughts: ["emotions", "behavior", "triggers"] },
      { id: "habits", label: "Habits", x: 65, y: 55, size: "large", color: "red", thoughts: ["routine", "loop", "reward"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    // Future maps
    "1": [
      { id: "productivity", label: "Productivity", x: 30, y: 50, size: "large", color: "blue", thoughts: ["efficiency", "output", "systems"] },
      { id: "goals", label: "Goals", x: 50, y: 30, size: "large", color: "violet", thoughts: ["vision", "targets", "success"] },
      { id: "growth", label: "Growth", x: 60, y: 60, size: "large", color: "red", thoughts: ["learning", "improve", "evolve"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    "2": [
      { id: "mastery", label: "Mastery", x: 35, y: 45, size: "large", color: "blue", thoughts: ["expertise", "skill", "practice"] },
      { id: "wisdom", label: "Wisdom", x: 55, y: 60, size: "large", color: "violet", thoughts: ["knowledge", "insight", "experience"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
    "3": [
      { id: "fulfillment", label: "Fulfillment", x: 40, y: 50, size: "large", color: "blue", thoughts: ["purpose", "meaning", "joy"] },
      { id: "peace", label: "Inner\nPeace", x: 60, y: 35, size: "large", color: "violet", thoughts: ["calm", "balance", "harmony"] },
      { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" },
    ],
  };

  // Calculate which two states to blend between based on dragOffset
  const getBlendedStates = () => {
    // dragOffset: -300 to 300
    // Determine base position and blend factor
    const exactPosition = dragOffset / 100; // e.g., -1.5, 0.7, etc.
    const basePos = Math.floor(exactPosition); // e.g., -2, 0
    const nextPos = Math.ceil(exactPosition); // e.g., -1, 1
    const blendFactor = exactPosition - basePos; // 0 to 1
    
    const baseNodes = mindMapStates[Math.max(-3, Math.min(3, basePos))] || mindMapStates[0];
    const nextNodes = mindMapStates[Math.max(-3, Math.min(3, nextPos))] || mindMapStates[0];
    
    return { baseNodes, nextNodes, blendFactor };
  };
  
  const { baseNodes, nextNodes, blendFactor } = getBlendedStates();
  const allNodes: Node[] = baseNodes; // Use base nodes for now (we can add blending back later)

  const connections = [
    { from: "brain", to: "psychology" },
    { from: "psychology", to: "habits" },
  ];

  // Auto-reply and mind map building
  useEffect(() => {
    const timer = setTimeout(() => {
      // Add AI response
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Perfect — this is exactly the right mindset.\n\nIf you want to design Reload around how the brain actually works, you need to understand how people think, remember, and focus — not just surface UX rules.\n\nHere's a focused roadmap of the brain topics that are most relevant for UX/UI, especially for your \"digital brain\" platform..."
      }]);
    }, 1000);

    // Start building mind map slowly
    const buildTimer = setInterval(() => {
      setBuildProgress(prev => {
        if (prev >= 100) {
          setIsBuilding(false);
          clearInterval(buildTimer);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // Show nodes progressively
    const nodeTimer = setInterval(() => {
      setVisibleNodes(prev => {
        const nextIndex = prev.length;
        if (nextIndex < allNodes.length) {
          return [...prev, allNodes[nextIndex].id];
        }
        clearInterval(nodeTimer);
        return prev;
      });
    }, 800);

    return () => {
      clearTimeout(timer);
      clearInterval(buildTimer);
      clearInterval(nodeTimer);
    };
  }, []);

  // Show all relevant nodes during transitions
  useEffect(() => {
    if (!isBuilding) {
      const allRelevantIds = [...baseNodes, ...nextNodes].map(n => n.id);
      const uniqueIds = [...new Set(allRelevantIds)];
      setVisibleNodes(uniqueIds);
    }
  }, [dragOffset, historyPosition, isBuilding]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages([...messages, { role: "user", content: input }]);
      setInput("");
      
      // Add AI response after a delay
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "That's a great follow-up question! Let me help you explore that further..."
        }]);
      }, 1000);
    }
  };

  // Handle mouse events for dragging the divider
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragDirection(null);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Determine drag direction on first move
    if (!dragDirection) {
      const deltaX = Math.abs(e.clientX - dragStartPos.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.y);
      
      // Need at least 10px movement to determine direction
      if (deltaX > 10 || deltaY > 10) {
        setDragDirection(deltaX > deltaY ? 'horizontal' : 'vertical');
      }
      return;
    }
    
    // Handle based on locked direction
    if (dragDirection === 'vertical') {
      const windowHeight = window.innerHeight;
      const newHeight = (e.clientY / windowHeight) * 100;
      const constrainedHeight = Math.min(Math.max(newHeight, 10), 100);
      setMapHeight(constrainedHeight);
    } else if (dragDirection === 'horizontal') {
      const deltaX = e.clientX - dragStartPos.x;
      // Update drag offset for smooth interpolation (limit to ±300px)
      setDragOffset(Math.max(-300, Math.min(300, deltaX)));
      
      // Update discrete history position (every 100px = 1 step)
      const steps = Math.round(deltaX / 100);
      setHistoryPosition(Math.max(-3, Math.min(3, steps))); // -3 (past) to +3 (future)
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragDirection(null);
    // Reset drag offset when releasing
    setDragOffset(0);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      const cursor = dragDirection === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.cursor = cursor;
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragDirection]);

  const getSizeClass = (size: string, isMainTopic: boolean = false) => {
    if (isMainTopic) {
      // Main topic circle - massive size that extends beyond borders
      return "w-[27rem] h-[27rem] text-6xl font-bold";
    }
    
    switch (size) {
      case "small": return "w-36 h-36 text-xl";
      case "medium": return "w-44 h-44 text-2xl";
      case "large": return "w-52 h-52 text-3xl";
      default: return "w-44 h-44";
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case "blue": return "border-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]";
      case "violet": return "border-violet-400 shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)]";
      case "red": return "border-red-400 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]";
      case "teal": return "border-teal-400 shadow-[0_0_20px_-5px_rgba(45,212,191,0.4)]";
      default: return "border-blue-400";
    }
  };

  const getRingClass = (color: string) => {
    switch (color) {
      case "blue": return "ring-blue-400/40";
      case "violet": return "ring-violet-400/40";
      case "red": return "ring-red-400/40";
      case "teal": return "ring-teal-400/40";
      default: return "ring-blue-400/40";
    }
  };

  const getThoughtColor = (color: string) => {
    switch (color) {
      case "blue": return "text-blue-300 bg-blue-500/10 border-blue-400/30";
      case "violet": return "text-violet-300 bg-violet-500/10 border-violet-400/30";
      case "red": return "text-red-300 bg-red-500/10 border-red-400/30";
      case "teal": return "text-teal-300 bg-teal-500/10 border-teal-400/30";
      default: return "text-blue-300 bg-blue-500/10 border-blue-400/30";
    }
  };

  const getProblemCount = (node: Node) => {
    if (!node.hasProblem) return 0;
    // Return different numbers based on problem type
    switch (node.problemType) {
      case "anxiety": return 3;
      case "blocker": return 2;
      case "stress": return 1;
      default: return 1;
    }
  };

  const getScaleTransform = () => {
    // Calculate scale factor based on map height
    // Scale down when dragging up, stop scaling up after 50vh
    const baseHeight = 70;
    const effectiveHeight = Math.min(mapHeight, 50); // Cap at 50vh for scaling
    const scaleFactor = effectiveHeight / baseHeight; // Proportional scaling
    // Minimum 0.3 to keep visible when at 10%
    return `scale(${Math.max(scaleFactor * 0.9, 0.3)})`;
  };

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black fixed inset-0">
        {/* Mind Map Section */}
        <div 
          className="relative overflow-hidden"
          style={{ height: `${mapHeight}vh` }}
        >
        {/* Background particles */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/40 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${6 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Beautiful Neural Connection lines */}
        {connections.map((conn, idx) => {
          const fromNode = allNodes.find(n => n.id === conn.from);
          const toNode = allNodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          return (
            <svg 
              key={idx}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <defs>
                <linearGradient id={`neuralGradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(147, 197, 253, 0.8)" />
                  <stop offset="50%" stopColor="rgba(59, 130, 246, 0.6)" />
                  <stop offset="100%" stopColor="rgba(147, 197, 253, 0.8)" />
                </linearGradient>
                <filter id={`neuralGlow-${idx}`}>
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <path
                d={`M ${fromNode.x}% ${fromNode.y}% L ${toNode.x}% ${toNode.y}%`}
                stroke={`url(#neuralGradient-${idx})`}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                filter={`url(#neuralGlow-${idx})`}
                style={{
                  strokeDasharray: '12,6',
                  animation: `neuralPulse 4s ease-in-out infinite`,
                  animationDelay: `${idx * 0.3}s`
                }}
              />
            </svg>
          );
        })}

        {/* Render nodes */}
        {allNodes.map((node) => (
          <div
            key={node.id}
            className="absolute transition-transform duration-500 ease-out"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: `translate(-50%, -50%) ${getScaleTransform()}`,
            }}
          >
            <div
              className={`
                ${getSizeClass(node.size, node.label === "Clearity")} ${getColorClass(node.color)}
                relative rounded-full border-2 bg-gray-900/60 backdrop-blur-sm
                flex items-center justify-center text-center
                transition-all duration-500
                hover:scale-110 hover:bg-gray-800/60
                cursor-pointer
                ${node.label === "Clearity" 
                  ? "ring-4 ring-offset-16 ring-offset-transparent ring-teal-400/40 shadow-[0_0_40px_-10px_rgba(45,212,191,0.8)] border-4 border-teal-400" 
                  : `ring-4 ring-offset-16 ring-offset-transparent ${getRingClass(node.color)}`
                }
              `}
            >
              <span className="font-medium leading-tight px-1 whitespace-pre-line text-white">
                {node.label}
              </span>

              {/* Empty circle around Clearity */}
              {node.label === "Clearity" && (
                <div 
                  className="absolute inset-0 rounded-full border-6 border-teal-400 pointer-events-none shadow-[0_0_30px_-5px_rgba(45,212,191,0.8)]"
                  style={{
                    transform: 'scale(1.2)',
                    margin: '-10%'
                  }}
                />
              )}

              {/* Problem indicator */}
              {node.hasProblem && (
                <button
                  onClick={() => setIsProblemsOpen(true)}
                  onMouseEnter={(e) => e.stopPropagation()}
                  onMouseLeave={(e) => e.stopPropagation()}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer z-10"
                >
                  <span className="text-white font-bold text-sm">{getProblemCount(node)}</span>
                </button>
              )}

              {/* Small thought labels around each circle */}
              {node.thoughts && node.thoughts.map((thought, idx) => {
                let angles;
                if (node.id === "brain") {
                  angles = [150, 180, 210];
                } else if (node.id === "design") {
                  // Avoid top-right area where problem indicator is
                  angles = mapHeight < 40 ? [300, 330, 0] : [200, 230, 260];
                } else if (node.id === "psychology") {
                  angles = mapHeight < 40 ? [150, 180, 210] : [45, 90, 135];
                } else if (node.id === "habits") {
                  angles = [150, 180, 210];
                } else {
                  angles = [60, 90, 120];
                }
                const angle = angles[idx];
                const radius = node.label === "Clearity" ? 310 : 155;
                const angleRad = (angle * Math.PI) / 180;
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;
                
                return (
                  <div 
                    key={idx}
                    className={`absolute font-semibold whitespace-nowrap px-6 py-3 rounded-full border backdrop-blur-sm transition-all duration-1000 ease-out hover:scale-125 hover:brightness-150 hover:shadow-lg cursor-pointer ${getThoughtColor(node.color)}`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: mapHeight >= 50 ? '1.25rem' : mapHeight >= 30 ? '1.5rem' : '1.75rem'
                    }}
                  >
                    {thought}
                  </div>
                );
              })}
            </div>
          </div>
        ))}


        {/* Building progress indicator */}
        {isBuilding && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="px-4 py-2 rounded-full bg-gray-800/80 backdrop-blur-sm border border-blue-400/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white">Building your mind map... {buildProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draggable Divider */}
      <div 
        className={`w-full h-6 hover:h-7 transition-all duration-200 flex items-center justify-center relative group ${
          isDragging ? 'h-7' : ''
        }`}
        style={{ cursor: dragDirection === 'horizontal' ? 'col-resize' : 'row-resize' }}
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        {/* Drag handle - center (works for both directions) */}
        <div className="absolute flex flex-col items-center gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity duration-200">
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
        </div>
        
        {/* History position indicator */}
        {historyPosition !== 0 && (
          <div className="absolute left-8 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full border border-white/20 animate-pulse">
            {historyPosition < 0 
              ? `← ${Math.abs(historyPosition)} ${Math.abs(historyPosition) === 1 ? 'step' : 'steps'} back` 
              : `${historyPosition} ${historyPosition === 1 ? 'step' : 'steps'} ahead →`}
          </div>
        )}
        
        {/* Tooltip */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          Drag up/down to resize • Drag left/right for history
        </div>
      </div>

      {/* Chat Section - Takes remaining space */}
      <div 
        className="relative bg-gradient-to-t from-gray-900/80 via-gray-900/60 to-transparent backdrop-blur-md"
        style={{ height: `${100 - mapHeight}vh` }}
      >
          {/* Chat messages */}
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="overflow-y-auto px-4 py-3 pb-20 space-y-2">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div
                    className={`relative max-w-[75%] ${
                      message.role === "user"
                        ? "px-4 py-2 text-sm bg-gray-700 text-white ml-auto rounded-3xl rounded-br-lg"
                        : "text-white"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <TypingAnimation
                        text={message.content}
                        speed={20}
                        className="whitespace-pre-line leading-relaxed text-sm"
                        onComplete={() => {
                          setTypingMessages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(idx);
                            return newSet;
                          });
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

          {/* Input bar - floating at the bottom */}
          <div className={`absolute left-0 right-0 px-4 pb-3 pointer-events-none transition-all duration-300 ${
            mapHeight > 85 ? 'bottom-[-100px] opacity-0' : 'bottom-0 opacity-100'
          }`}>
            {/* Gradient overlay when input is expanded to block content underneath */}
            {isInputExpanded && (
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pointer-events-none" />
            )}
            <form onSubmit={handleSubmit} className="pointer-events-auto max-w-4xl mx-auto relative z-10 flex justify-end">
              <div className="relative group transition-all duration-300" style={{ width: isInputExpanded ? '100%' : '64px' }}>
                {/* Icon when collapsed */}
                {!isInputExpanded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <MessageSquare className="w-5 h-5 text-white/60" />
                  </div>
                )}
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsInputExpanded(true)}
                  onBlur={() => !input && setIsInputExpanded(false)}
                  placeholder={isInputExpanded ? "Let's overthink about..." : ""}
                  className={`w-full px-5 py-3 bg-gray-900 border border-white/20 rounded-3xl 
                             text-sm text-white placeholder:text-white/50
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                             transition-all duration-300 hover:border-white/30
                             ${isInputExpanded ? 'pr-20' : 'cursor-pointer'}`}
                  style={{ paddingRight: isInputExpanded ? '80px' : '20px' }}
                />
                
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-300 ${isInputExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <button
                    type="button"
                    className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-110"
                  >
                    <Mic className="w-4 h-4 text-white/60" />
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-500/25"
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Problems Modal */}
      <ProblemsModal 
        isOpen={isProblemsOpen} 
        onClose={() => setIsProblemsOpen(false)} 
      />
    </div>
  );
};
