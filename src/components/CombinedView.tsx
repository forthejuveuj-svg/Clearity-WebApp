import { useState, useEffect } from "react";
import { Mic, MicOff, ArrowUp, MessageSquare, AlertTriangle, X, Check, Reply, ArrowLeft, ArrowRight } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";
import { ProblemsModal } from "./ProblemsModal";
import { TaskManagerModal } from "./TaskManagerModal";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useAuth } from "@/hooks/useAuth";
import { APIService } from "@/lib/api";
import { generateMindMapJson } from "../utils/generateMindMapJson";
import { messageModeHandler } from "@/utils/messageModeHandler";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioSnippets?: any[];
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  color: "blue" | "violet" | "red" | "teal";
  subNodes?: { label: string }[];
  tension?: number;
  thoughts?: string[];
  hasProblem?: boolean;
  problemType?: "anxiety" | "blocker" | "stress";
  problemData?: any[];
}

interface CombinedViewProps {
  initialMessage: string;
  onBack: () => void;
  onToggleView?: (toggleFn: () => void) => void;
  onNavigateToChat?: (navigateFn: (task: any) => void) => void;
  onViewChange?: (view: 'mindmap' | 'tasks') => void;
  initialView?: 'mindmap' | 'tasks';
}

export const CombinedView = ({ initialMessage, onBack, onToggleView, onNavigateToChat: onNavigateToChatProp, onViewChange, initialView = 'mindmap' }: CombinedViewProps) => {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildProgress, setBuildProgress] = useState(0);
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [mapHeight, setMapHeight] = useState(60); // Percentage of screen height for mind map
  const [isDragging, setIsDragging] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [typingMessages, setTypingMessages] = useState<Set<number>>(new Set());
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'mindmap' | 'tasks'>(initialView);
  const [replyingToTask, setReplyingToTask] = useState<{ title: string } | null>(null);
  const [blurTimeoutId, setBlurTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset message mode handler when component mounts
  useEffect(() => {
    messageModeHandler.reset();
  }, []);

  // Single mind map state - data comes directly from database
  const [mindMapNodes, setMindMapNodes] = useState<Node[]>([]);
  const [parentNodeTitle, setParentNodeTitle] = useState<string | null>(null);
  const [clickedProjectNode, setClickedProjectNode] = useState<Node | null>(null);

  // Simple session management
  const [sessionHistory, setSessionHistory] = useState<Array<{
    id: string;
    nodes: Node[];
    parentNodeId?: string;
    timestamp: number;
  }>>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(-1);

  // Function to reload mind map nodes from database
  const reloadNodes = () => {
    generateMindMapJson().then(data => {
      if (data) {
        // Set regular nodes (all nodes are regular now)
        setMindMapNodes(data.nodes || []);

        // Set parent node title if provided
        setParentNodeTitle(data.parentNode || null);

        // Save current state to session when nodes are reloaded
        saveCurrentSession(data.nodes || []);

        console.log('Mind map nodes reloaded after successful processing');
      }
    });
  };

  // Simple session management functions
  const saveCurrentSession = (nodes: Node[], parentNodeId?: string) => {
    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes: [...nodes],
      parentNodeId,
      timestamp: Date.now()
    };

    const updatedHistory = [...sessionHistory.slice(0, currentSessionIndex + 1), newSession];
    setSessionHistory(updatedHistory);
    setCurrentSessionIndex(updatedHistory.length - 1);

    // Save to localStorage
    localStorage.setItem('mindmap_sessions', JSON.stringify(updatedHistory));
    localStorage.setItem('mindmap_current_index', currentSessionIndex.toString());
  };

  const loadSessionFromStorage = () => {
    try {
      const stored = localStorage.getItem('mindmap_sessions');
      const storedIndex = localStorage.getItem('mindmap_current_index');

      if (stored && storedIndex) {
        const sessions = JSON.parse(stored);
        const index = parseInt(storedIndex);

        setSessionHistory(sessions);
        setCurrentSessionIndex(index);

        if (sessions[index]) {
          setMindMapNodes(sessions[index].nodes);
        }
      }
    } catch (error) {
      console.warn('Failed to load sessions from localStorage:', error);
    }
  };

  const goBackInHistory = () => {
    if (currentSessionIndex > 0) {
      const newIndex = currentSessionIndex - 1;
      setCurrentSessionIndex(newIndex);
      setMindMapNodes(sessionHistory[newIndex].nodes);
      setClickedProjectNode(null);
      
      // Clear parent node title when going back to main view (index 0) or when session has no parentNodeId
      if (newIndex === 0 || !sessionHistory[newIndex].parentNodeId) {
        setParentNodeTitle(null);
      }

      localStorage.setItem('mindmap_current_index', newIndex.toString());
    }
  };

  const goForwardInHistory = () => {
    if (currentSessionIndex < sessionHistory.length - 1) {
      const newIndex = currentSessionIndex + 1;
      setCurrentSessionIndex(newIndex);
      setMindMapNodes(sessionHistory[newIndex].nodes);
      setClickedProjectNode(null);

      localStorage.setItem('mindmap_current_index', newIndex.toString());
    }
  };

  // Function to generate non-overlapping positions for nodes
  const generateNonOverlappingPositions = (count: number) => {
    const positions: { x: number; y: number }[] = [];
    const minDistance = 25; // Minimum distance between nodes (in percentage)
    const maxAttempts = 100; // Maximum attempts to find a valid position

    // Define safe boundaries (avoid edges and large node area)
    const boundaries = {
      minX: 15, // 15% from left
      maxX: 70, // 70% from left (avoid large node on right)
      minY: 15, // 15% from top
      maxY: 85  // 85% from top
    };

    for (let i = 0; i < count; i++) {
      let validPosition = false;
      let attempts = 0;
      let newPos = { x: 0, y: 0 };

      while (!validPosition && attempts < maxAttempts) {
        // Generate random position within boundaries
        newPos = {
          x: Math.random() * (boundaries.maxX - boundaries.minX) + boundaries.minX,
          y: Math.random() * (boundaries.maxY - boundaries.minY) + boundaries.minY
        };

        // Check if position is far enough from existing positions
        validPosition = positions.every(pos => {
          const distance = Math.sqrt(
            Math.pow(newPos.x - pos.x, 2) + Math.pow(newPos.y - pos.y, 2)
          );
          return distance >= minDistance;
        });

        attempts++;
      }

      // If we couldn't find a valid position, use the last generated one
      positions.push(newPos);
    }

    return positions;
  };

  const loadSubprojects = async (nodeId: string) => {
    // Mock function - replace with actual Supabase call
    // Generate non-overlapping positions for 3 subprojects
    const positions = generateNonOverlappingPositions(3);

    const mockSubprojects: Node[] = [
      {
        id: `${nodeId}_sub_1`,
        label: `Subproject 1 of ${nodeId}`,
        x: positions[0].x,
        y: positions[0].y,
        color: "blue",
        subNodes: [{ label: "Task A" }, { label: "Task B" }]
      },
      {
        id: `${nodeId}_sub_2`,
        label: `Subproject 2 of ${nodeId}`,
        x: positions[1].x,
        y: positions[1].y,
        color: "violet",
        thoughts: ["Important detail", "Remember this"]
      },
      {
        id: `${nodeId}_sub_3`,
        label: `Subproject 3 of ${nodeId}`,
        x: positions[2].x,
        y: positions[2].y,
        color: "teal",
        hasProblem: true,
        problemType: "blocker"
      }
    ];

    return mockSubprojects;
  };

  const clearAllSessions = () => {
    setSessionHistory([]);
    setCurrentSessionIndex(-1);
    localStorage.removeItem('mindmap_sessions');
    localStorage.removeItem('mindmap_current_index');
    console.log('All sessions cleared');
  };

  // Load mind map nodes on component mount
  useEffect(() => {
    // First try to load from localStorage
    loadSessionFromStorage();

    // Then load fresh data from database
    generateMindMapJson().then(data => {
      if (data) {
        // Set regular nodes (all nodes are regular now)
        setMindMapNodes(data.nodes || []);

        // Set parent node title if provided
        setParentNodeTitle(data.parentNode || null);

        // Save initial session if no sessions exist
        if (sessionHistory.length === 0) {
          saveCurrentSession(data.nodes || []);
        }
      }
    });

    // Check backend connectivity
    APIService.healthCheck().then(response => {
      if (!response.success) {
        console.warn('Backend health check failed:', response.error);
      }
    });
  }, []);



  // Use the single mind map state directly
  const allNodes: Node[] = mindMapNodes;

  const connections = [
    { from: "brain", to: "psychology" },
    { from: "psychology", to: "habits" },
    { from: "brain", to: "design" },
  ];

  // Handle initial message and responses
  useEffect(() => {
    if (!hasInitialized && userId) {
      // Initialize even if initialMessage is empty
      if (initialMessage) {
        setMessages([{ role: "user", content: initialMessage }]);

        // Process initial message with message mode handler
        const processInitialMessage = async () => {
          setIsProcessing(true);
          try {
            const result = await messageModeHandler.processMessage(initialMessage, userId);

            if (result.success) {
              setMessages(prev => [...prev, {
                role: "assistant",
                content: result.output || "Processing completed successfully."
              }]);

              // Reload nodes when processing is successful
              reloadNodes();
            } else {
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `I encountered an issue processing your request: ${result.error || 'Unknown error'}`
              }]);
            }
          } catch (error) {
            console.error('Error processing initial message:', error);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "I'm having trouble connecting to the backend. Please try again later."
            }]);
          } finally {
            setIsProcessing(false);
          }
        };

        processInitialMessage();
      }
      setHasInitialized(true);
    }
  }, [initialMessage, hasInitialized, userId]);

  // Handle new messages when initialMessage changes (e.g., from task manager)
  useEffect(() => {
    if (initialMessage && hasInitialized && userId && messages.length > 0 && messages[messages.length - 1].content !== initialMessage) {
      // Add new user message
      setMessages(prev => [...prev, { role: "user", content: initialMessage }]);

      // Process with message mode handler
      const processNewMessage = async () => {
        setIsProcessing(true);
        try {
          const result = await messageModeHandler.processMessage(initialMessage, userId);

          if (result.success) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: result.output || "Processing completed successfully."
            }]);

            // Reload nodes when processing is successful
            reloadNodes();
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "I understand. Let me help you with that task. What specific aspect would you like to focus on first?"
            }]);
          }
        } catch (error) {
          console.error('Error processing new message:', error);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "I understand. Let me help you with that task. What specific aspect would you like to focus on first?"
          }]);
        } finally {
          setIsProcessing(false);
        }
      };

      processNewMessage();
    }
  }, [initialMessage, hasInitialized, userId, messages]);

  // Auto-build mind map
  useEffect(() => {
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
      clearInterval(buildTimer);
      clearInterval(nodeTimer);
    };
  }, []);

  // Show all nodes when building is complete
  useEffect(() => {
    if (!isBuilding && mindMapNodes.length > 0) {
      const allNodeIds = mindMapNodes.map(n => n.id);
      // Include parent node if it exists
      if (parentNodeTitle) {
        allNodeIds.push("parent-node");
      }
      setVisibleNodes(allNodeIds);
    }
  }, [isBuilding, mindMapNodes, parentNodeTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      const userMessage = input.trim();
      setMessages([...messages, { role: "user", content: userMessage }]);
      setInput("");
      setIsProcessing(true);

      if (!userId) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Please log in to use the AI processing features."
        }]);
        setIsProcessing(false);
        return;
      }

      try {
        // Use message mode handler to process the message
        const result = await messageModeHandler.processMessage(userMessage, userId);

        if (result.success) {
          // Add AI response with the actual result
          setMessages(prev => [...prev, {
            role: "assistant",
            content: result.output || "Processing completed successfully."
          }]);

          // Reload nodes when processing is successful
          reloadNodes();
        } else {
          // Handle error case
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `I encountered an issue processing your request: ${result.error || 'Unknown error'}`
          }]);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I'm having trouble connecting to the backend. Please try again later."
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle node clicks for project focus and subproject navigation
  const handleNodeClick = async (node: Node) => {
    // Check if node has subprojects (indicated by subNodes or specific keywords)
    const hasSubprojects = node.subNodes && node.subNodes.length > 0;
    const projectKeywords = ['project', 'course', 'learning', 'study', 'work', 'build', 'create'];
    const isProject = projectKeywords.some(keyword =>
      node.label.toLowerCase().includes(keyword)
    );

    if (hasSubprojects || isProject) {
      try {
        // Load subprojects from database (or use existing subNodes)
        let subprojects: Node[];

        if (hasSubprojects) {
          // Convert existing subNodes to full Node objects with non-overlapping positions
          const positions = generateNonOverlappingPositions(node.subNodes!.length);
          subprojects = node.subNodes!.map((subNode, index) => ({
            id: `${node.id}_sub_${index}`,
            label: subNode.label,
            x: positions[index].x,
            y: positions[index].y,
            color: ["blue", "violet", "red", "teal"][index % 4] as "blue" | "violet" | "red" | "teal"
          }));
        } else {
          // Load from database
          subprojects = await loadSubprojects(node.id);
        }

        // Save current state and navigate to subprojects
        saveCurrentSession(subprojects, node.id);
        setMindMapNodes(subprojects);
        setParentNodeTitle(node.label);

        console.log(`Navigated to subprojects of ${node.label}`);

      } catch (error) {
        console.error('Failed to load subprojects:', error);
      }
    } else {
      // Regular project focus behavior
      setClickedProjectNode(node);

      // Determine if project is started (simple heuristic based on node color or other properties)
      const isStarted = node.color === 'blue' || node.color === 'teal'; // Assume blue/teal = started

      // Silently switch to project mode - user doesn't see any indication
      messageModeHandler.setProjectFocus({
        id: node.id,
        name: node.label,
        status: isStarted ? 'started' : 'not_started'
      });
    }
  };

  const handleNavigateToChat = async (task: any) => {
    // Switch to mindmap view
    setCurrentView('mindmap');

    const taskMessage = `Let's discuss "${task.title}". What would you like to know or work on?`;

    // Add task message to chat
    setMessages(prev => [...prev, { role: "user", content: taskMessage }]);

    if (userId) {
      setIsProcessing(true);
      try {
        const response = await APIService.minddump({
          text: taskMessage,
          user_id: userId,
          use_relator: false
        });

        if (response.success) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: response.output
          }]);

          // Reload nodes when processing is successful
          reloadNodes();
        } else {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "I understand. Let me help you with that task. What specific aspect would you like to focus on first?"
          }]);
        }
      } catch (error) {
        console.error('Error processing task message:', error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I understand. Let me help you with that task. What specific aspect would you like to focus on first?"
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleView = () => {
    setCurrentView(prev => prev === 'mindmap' ? 'tasks' : 'mindmap');
  };

  // Notify parent when view changes
  useEffect(() => {
    if (onViewChange) {
      onViewChange(currentView);
    }
  }, [currentView, onViewChange]);

  const handleReplyToTask = (task: any) => {
    setReplyingToTask({ title: task.title });
    setIsInputExpanded(true);
  };

  const handleCancelReply = () => {
    setReplyingToTask(null);
    if (!input) {
      setIsInputExpanded(false);
    }
  };

  // Audio recording integration
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    playSnippet,
    audioSnippets,
    clearSnippets
  } = useAudioRecording({
    onTranscription: (text, snippetId) => {
      console.log('New transcription:', text, 'for snippet:', snippetId);
    },
    whisperApiUrl: '',
    whisperApiKey: '',
    snippetDuration: 8000 // 8 seconds
  });

  const handleMicrophoneClick = async () => {
    // Clear any pending blur timeout
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      setBlurTimeoutId(null);
    }

    if (isRecording) {
      try {
        await stopRecording();

        // Add voice message with clip count
        const clipCount = audioSnippets.length;
        const voiceMessageContent = `🎤 Voice message recorded (${clipCount} clips of 8 seconds each)`;

        setMessages(prev => [...prev, {
          role: "user",
          content: voiceMessageContent,
          audioSnippets: audioSnippets // Store snippets for playback
        }]);

        // Add AI response after delay
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "I received your voice message. You can play back the clips to verify the recording worked."
          }]);
        }, 1000);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      try {
        await startRecording();
        setIsInputExpanded(true); // Expand input to show recording status
      } catch (error) {
        console.error('Error starting recording:', error);
        console.error('Error starting recording:', error);
        alert('Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  const handleInputBlur = () => {
    // Use a timeout to allow button clicks to process first
    const timeoutId = setTimeout(() => {
      if (!input && !isRecording) {
        setIsInputExpanded(false);
      }
      setBlurTimeoutId(null);
    }, 150); // 150ms delay to allow button clicks

    setBlurTimeoutId(timeoutId);
  };

  const handleInputFocus = () => {
    // Clear any pending blur timeout when focusing
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      setBlurTimeoutId(null);
    }
    setIsInputExpanded(true);
  };

  const formatRecordingTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Pass functions to parent component
  useEffect(() => {
    if (onToggleView) {
      onToggleView(toggleView);
    }
    if (onNavigateToChatProp) {
      onNavigateToChatProp(handleNavigateToChat);
    }
  }, []);

  // Handle mouse events for dragging the vertical divider only
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Only handle vertical dragging
    const windowHeight = window.innerHeight;
    const newHeight = (e.clientY / windowHeight) * 100;
    const constrainedHeight = Math.min(Math.max(newHeight, 10), 100);
    setMapHeight(constrainedHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for vertical dragging only
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
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
  }, [isDragging]);

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutId) {
        clearTimeout(blurTimeoutId);
      }
    };
  }, [blurTimeoutId]);

  const getCircleSize = () => {
    const screenWidth = window.innerWidth;

    if (screenWidth >= 1024) {
      // Desktop sizes - smaller regular nodes
      return { width: 144, height: 144 }; // 9rem (36 * 4) - reduced from 11rem
    }

    if (screenWidth >= 768) {
      // Tablet: scale between 768-1024px
      const baseWidths = { min: 96, max: 144 }; // 6rem to 9rem for regular nodes - reduced

      const scaleFactor = Math.max(0, Math.min(1, (screenWidth - 768) / (1024 - 768)));
      const width = baseWidths.min + (baseWidths.max - baseWidths.min) * scaleFactor;

      return { width, height: width };
    }

    // Phone screens (< 768px): smaller circles
    const phoneScale = screenWidth / 768; // e.g., 375px / 768 = 0.49
    const tabletBase = 96; // reduced from 112

    // Multiply by 1.2 to make circles 20% bigger on phones (reduced from 30%)
    const width = tabletBase * phoneScale * 1.2;
    return { width, height: width };
  };

  const getSizeClass = () => {
    const screenWidth = window.innerWidth;

    // All regular nodes are medium size
    if (screenWidth >= 1024) {
      return "text-2xl";
    }

    if (screenWidth >= 768) {
      return "text-base";
    }

    // Phone: smaller text
    return "text-xs";
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
    // Use problemData if available, otherwise fallback to problemType
    if (node.problemData) {
      return node.problemData.filter(p => p.status === 'active').length;
    }
    // Fallback for old problemType format
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

  const getTaskManagerScale = () => {
    // Adjusted scaling logic for task manager - less aggressive scaling
    const baseHeight = 60;
    const effectiveHeight = Math.min(mapHeight, 60);
    const scaleFactor = effectiveHeight / baseHeight;
    // Scale between 0.6 (minimum) and 1.0 (maximum)
    return Math.max(scaleFactor, 0.6);
  };

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black fixed inset-0">
      {/* Mind Map or Task Manager Section */}
      <div
        className="relative overflow-hidden"
        style={{ height: `${mapHeight}vh` }}
      >
        {currentView === 'mindmap' ? (
          // Mind Map View
          <>
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
            {allNodes && allNodes.length > 0 && connections.map((conn, idx) => {
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
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
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

            {/* Render regular nodes */}
            {allNodes && allNodes.map((node) => (
              <div
                key={node.id}
                className="absolute transition-transform duration-500 ease-out"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: `translate(-50%, -50%) ${getScaleTransform()}`,
                }}
              >
                {/* Problem indicator - positioned outside the clickable area with higher z-index */}
                {node.hasProblem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProblemsOpen(true);
                    }}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer z-30"
                  >
                    <span className="text-white font-bold text-sm">{getProblemCount(node)}</span>
                  </button>
                )}

                <div
                  onClick={() => handleNodeClick(node)}
                  className={`
                ${getSizeClass()} ${getColorClass(node.color)}
                relative rounded-full border-2 bg-gray-900/60 backdrop-blur-sm
                flex items-center justify-center text-center
                transition-all duration-500
                hover:scale-110 hover:bg-gray-800/60
                cursor-pointer
                ring-4 ring-offset-16 ring-offset-transparent ${getRingClass(node.color)}
                z-10
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

                {/* Small thought labels around each circle - positioned outside clickable area */}
                {node.thoughts && node.thoughts.map((thought, idx) => {
                  // Default angles for all nodes
                  const angles = [60, 90, 120];
                  const angle = angles[idx];
                  // Responsive radius: scales with screen size
                  const screenWidth = window.innerWidth;
                  let radius;

                  if (screenWidth >= 1024) {
                    // Desktop - adjusted for smaller circles
                    radius = 135;
                  } else if (screenWidth >= 768) {
                    // Tablet: scale between 768-1024px
                    const minRadius = 90;
                    const maxRadius = 135;
                    const scaleFactor = Math.max(0, Math.min(1, (screenWidth - 768) / (1024 - 768)));
                    radius = minRadius + (maxRadius - minRadius) * scaleFactor;
                  } else {
                    // Phone: scale proportionally
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
                      className={`absolute font-semibold whitespace-nowrap px-3 py-1.5 lg:px-6 lg:py-3 rounded-full border backdrop-blur-sm transition-all duration-1000 ease-out hover:scale-125 hover:brightness-150 hover:shadow-lg cursor-pointer z-20 ${getThoughtColor(node.color)}`}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: window.innerWidth >= 1024
                          ? (mapHeight >= 50 ? '1.25rem' : mapHeight >= 30 ? '1.5rem' : '1.75rem')
                          : window.innerWidth >= 768
                            ? '0.875rem' // text-sm for tablet
                            : '0.75rem' // text-xs for phone (matches circle text)
                      }}
                    >
                      {thought}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Large indicator node in top right - shows current context - only visible when in subproject view */}
            {parentNodeTitle && (
              <div
                key="context-node"
                className="absolute transition-all duration-500 ease-out z-40"
                style={{
                  left: "92%",
                  top: "20%",
                  transform: `translate(-50%, -50%) ${getScaleTransform()}`,
                }}
              >
                <div
                  className="text-2xl font-bold lg:text-2xl md:text-xl sm:text-lg border-teal-400/60 shadow-[0_0_15px_-5px_rgba(45,212,191,0.2)]
                  relative rounded-full border-2 bg-gray-900/40 backdrop-blur-sm
                  flex items-center justify-center text-center
                  transition-all duration-500
                  ring-2 ring-offset-8 ring-offset-transparent ring-teal-400/20 shadow-[0_0_25px_-10px_rgba(45,212,191,0.3)]
                  hover:scale-105 hover:bg-gray-800/50 cursor-pointer"
                  style={{
                    width: "400px",
                    height: "400px"
                  }}
                  onClick={() => {
                    if (currentSessionIndex > 0) {
                      goBackInHistory();
                    }
                  }}
                >
                  <span className="font-medium leading-tight px-4 whitespace-pre-line text-white text-center">
                    {parentNodeTitle}
                  </span>

                  {/* Subtle outer ring */}
                  <div
                    className="absolute inset-0 rounded-full border border-teal-400/20 pointer-events-none"
                    style={{
                      transform: 'scale(1.1)',
                    }}
                  />
                </div>
              </div>
            )}




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

          </>
        ) : (
          // Task Manager View
          <div className="h-full w-full bg-gray-900">
            <TaskManagerModal
              isOpen={true}
              onClose={() => { }}
              onNavigateToChat={handleNavigateToChat}
              isFullScreen={true}
              scale={1}
              onReplyToTask={handleReplyToTask}
            />
          </div>
        )}
      </div>

      {/* Draggable Divider */}
      <div
        className={`w-full h-6 hover:h-7 transition-all duration-200 flex items-center justify-center relative group ${isDragging ? 'h-7' : ''
          }`}
        style={{ cursor: 'row-resize' }}
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        {/* Drag handle - center (works for both directions) */}
        <div className="absolute flex flex-col items-center gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity duration-200">
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/40 rounded-full"></div>
        </div>

        {/* Tooltip */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          Drag up/down to resize
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
                  className={`relative max-w-[75%] ${message.role === "user"
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
                    <div>
                      <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                      {message.audioSnippets && message.audioSnippets.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.audioSnippets.map((snippet, index) => (
                            <button
                              key={snippet.id}
                              onClick={() => playSnippet(snippet.id)}
                              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded border border-blue-500/40 hover:border-blue-400/60 transition-colors"
                            >
                              ▶ Clip {message.audioSnippets.length - index}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input bar - floating at the bottom */}
          <div className={`absolute left-0 right-0 px-4 pb-3 pointer-events-none transition-all duration-300 ${mapHeight > 85 ? 'bottom-[-100px] opacity-0' : 'bottom-0 opacity-100'
            }`}>
            {/* Gradient overlay when input is expanded to block content underneath */}
            {isInputExpanded && (
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pointer-events-none" />
            )}
            <form onSubmit={handleSubmit} className="pointer-events-auto max-w-4xl mx-auto relative z-10 flex justify-end">
              <div className="relative group transition-all duration-300" style={{ width: isInputExpanded ? '100%' : '64px' }}>
                {/* Recording indicator - show when recording */}
                {isRecording && isInputExpanded && (
                  <div className="absolute -top-12 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-red-300 flex-1">Recording... {formatRecordingTime(recordingTime)}</span>
                    <button
                      type="button"
                      onClick={handleMicrophoneClick}
                      className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                )}

                {/* Processing indicator - show when processing */}
                {isProcessing && isInputExpanded && !isRecording && (
                  <div className="absolute -top-12 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-sm text-purple-300 flex-1">Processing your message...</span>
                  </div>
                )}

                {/* Replying to indicator - only show when expanded and not recording and not processing */}
                {replyingToTask && isInputExpanded && !isRecording && !isProcessing && (
                  <div className="absolute -top-12 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-300 flex-1 truncate">Replying to: <strong>{replyingToTask.title}</strong></span>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="p-0.5 hover:bg-blue-500/20 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  </div>
                )}

                {/* Icon when collapsed */}
                {!isInputExpanded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <MessageSquare className="w-5 h-5 text-white/60" />
                  </div>
                )}

                <input
                  type="text"
                  value={isRecording ? `Recording... ${formatRecordingTime(recordingTime)}` : input}
                  onChange={(e) => !isRecording && !isProcessing && setInput(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={isInputExpanded && !isRecording && !isProcessing ? messageModeHandler.getPlaceholder() : ""}
                  disabled={isRecording || isProcessing}
                  className={`w-full px-5 py-3 bg-gray-900 border rounded-3xl 
                             text-sm text-white placeholder:text-white/50
                             focus:outline-none focus:ring-2 focus:border-blue-500/50
                             transition-all duration-300 hover:border-white/30
                             ${isRecording
                      ? 'border-red-500/50 text-red-300 cursor-not-allowed'
                      : isProcessing
                        ? 'border-purple-500/50 text-purple-300 cursor-not-allowed'
                        : 'border-white/20 focus:ring-blue-500/50'
                    }
                             ${isInputExpanded ? 'pr-20' : 'cursor-pointer'}`}
                  style={{ paddingRight: isInputExpanded ? '80px' : '20px' }}
                />

                <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-300 ${isInputExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <button
                    type="button"
                    onClick={handleMicrophoneClick}
                    className={`p-2 rounded-2xl transition-all duration-300 hover:scale-110 ${isRecording
                      ? 'bg-red-500/20 border border-red-500/30 animate-pulse'
                      : 'bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-4 h-4 text-red-400" />
                    ) : (
                      <Mic className="w-4 h-4 text-white/60" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isRecording || isProcessing}
                    className="p-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-500/25"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-white" />
                    )}
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
        onProblemConverted={(problemId, projectId) => {
          console.log(`Problem ${problemId} converted to project ${projectId}`);
          // You might want to refresh the mind map or show a success message here
        }}
      />
    </div>
  );
};
