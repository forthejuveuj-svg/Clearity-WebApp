import React from "react";
import { Node } from "./CombinedView";

interface MindMapNodeProps {
  node: Node;
  onNodeClick: (node: Node) => void;
  onProblemClick: () => void;
  getScaleTransform: () => string;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  onNodeClick,
  onProblemClick,
  getScaleTransform
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const getCircleSize = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1024) return { width: 144, height: 144 };
    if (screenWidth >= 768) {
      const baseWidths = { min: 96, max: 144 };
      const scaleFactor = Math.max(0, Math.min(1, (screenWidth - 768) / (1024 - 768)));
      const width = baseWidths.min + (baseWidths.max - baseWidths.min) * scaleFactor;
      return { width, height: width };
    }
    const phoneScale = screenWidth / 768;
    const tabletBase = 96;
    const width = tabletBase * phoneScale * 1.2;
    return { width, height: width };
  };

  const getSizeClass = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1024) return "text-2xl";
    if (screenWidth >= 768) return "text-base";
    return "text-xs";
  };

  const getColorClass = (color: string) => {
    const colorMap = {
      blue: "border-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]",
      violet: "border-violet-400 shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)]",
      red: "border-red-400 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]",
      teal: "border-teal-400 shadow-[0_0_20px_-5px_rgba(45,212,191,0.4)]"
    };
    return colorMap[color] || "border-blue-400";
  };

  const getRingClass = (color: string) => {
    const ringMap = {
      blue: "ring-blue-400/40",
      violet: "ring-violet-400/40",
      red: "ring-red-400/40",
      teal: "ring-teal-400/40"
    };
    return ringMap[color] || "ring-blue-400/40";
  };

  const getThoughtColor = (color: string) => {
    const thoughtMap = {
      blue: "text-blue-300 bg-blue-500/10 border-blue-400/30",
      violet: "text-violet-300 bg-violet-500/10 border-violet-400/30",
      red: "text-red-300 bg-red-500/10 border-red-400/30",
      teal: "text-teal-300 bg-teal-500/10 border-teal-400/30"
    };
    return thoughtMap[color] || "text-blue-300 bg-blue-500/10 border-blue-400/30";
  };

  const getProblemCount = (node: Node) => {
    if (!node.hasProblem) return 0;
    if (node.problemData) {
      return node.problemData.filter(p => p.status === 'active').length;
    }
    const problemCounts = { anxiety: 3, blocker: 2, stress: 1 };
    return problemCounts[node.problemType || 'stress'] || 1;
  };

  return (
    <div
      className="absolute transition-transform duration-500 ease-out"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        transform: `translate(-50%, -50%) ${getScaleTransform()}`,
        zIndex: isHovered ? 50 : 10,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Problem indicator */}
      {node.hasProblem && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProblemClick();
          }}
          className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer z-30"
        >
          <span className="text-white font-bold text-sm">{getProblemCount(node)}</span>
        </button>
      )}

      <div
        onClick={() => onNodeClick(node)}
        className={`
          ${getSizeClass()} ${getColorClass(node.color)}
          relative rounded-full border-2 bg-gray-900/60 backdrop-blur-sm
          flex items-center justify-center text-center
          transition-all duration-500
          hover:scale-110 hover:bg-gray-800/60
          cursor-pointer
          ring-4 ring-offset-16 ring-offset-transparent ${getRingClass(node.color)}
        `}
        style={{
          width: `${getCircleSize().width}px`,
          height: `${getCircleSize().height}px`
        }}
      >
        <span className="font-medium leading-tight px-1 whitespace-pre-line text-white pointer-events-none">
          {node.label}
        </span>

        {/* Subprojects indicator */}
        {(node.subNodes && node.subNodes.length > 0) && (
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500/80 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg pointer-events-none">
            <span className="text-white font-bold text-xs">{node.subNodes.length}</span>
          </div>
        )}
      </div>

      {/* Thought labels */}
      {node.thoughts && node.thoughts.map((thought, idx) => {
        // Adjusted angles to position key points higher up to reduce overlap
        const angles = [30, 60, 90];
        const angle = angles[idx];
        const screenWidth = window.innerWidth;
        
        let radius;
        if (screenWidth >= 1024) {
          radius = 135;
        } else if (screenWidth >= 768) {
          const minRadius = 90;
          const maxRadius = 135;
          const scaleFactor = Math.max(0, Math.min(1, (screenWidth - 768) / (1024 - 768)));
          radius = minRadius + (maxRadius - minRadius) * scaleFactor;
        } else {
          const phoneScale = screenWidth / 768;
          const tabletRadius = 90;
          radius = tabletRadius * phoneScale * 1.2;
        }
        
        const angleRad = (angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <div
            key={idx}
            className={`absolute font-semibold whitespace-nowrap px-3 py-1.5 lg:px-6 lg:py-3 rounded-full border backdrop-blur-sm transition-all duration-1000 ease-out hover:scale-125 hover:brightness-150 hover:shadow-lg hover:z-50 cursor-pointer z-20 ${getThoughtColor(node.color)}`}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              fontSize: screenWidth >= 1024 ? '1.25rem' : screenWidth >= 768 ? '0.875rem' : '0.75rem'
            }}
          >
            {thought}
          </div>
        );
      })}
    </div>
  );
};