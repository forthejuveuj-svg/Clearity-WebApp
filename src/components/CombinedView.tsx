import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ArrowUp, MessageSquare, AlertTriangle, X, Check, Reply, ArrowLeft, ArrowRight } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";
import { ProblemsModal } from "./ProblemsModal";
import { TaskManagerModal } from "./TaskManagerModal";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useAuth } from "@/hooks/useAuth";
import { APIService } from "@/lib/api";
import { generateMindMapJson } from "../utils/generateMindMapJson";
import { messageModeHandler } from "@/utils/messageModeHandler";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { EntitySuggestion } from "@/hooks/useEntityAutocomplete";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioSnippets?: any[];
}

interface Node {
  id: string;
  projectId?: string; // Actual database ID
  label: string;
  x: number;
  y: number;
  color: "blue" | "violet" | "red" | "teal";
  subNodes?: { label: string; id?: string }[];
  tension?: number;
  thoughts?: string[];
  hasProblem?: boolean;
  problemType?: "anxiety" | "blocker" | "stress";
  problemData?: any[];
  isSubproject?: boolean;
  parentProjectNames?: string[];
}

interface CombinedViewProps {
  initialMessage: string;
  onBack: () => void;
  onToggleView?: (toggleFn: () => void) => void;
  onNavigateToChat?: (navigateFn: (task: any) => void) => void;
  onViewChange?: (view: 'mindmap' | 'tasks') => void;
  initialView?: 'mindmap' | 'tasks';
  onClearCache?: (clearFn: () => void) => void; // Optional callback to expose cache clearing function
}

export const CombinedView = ({ initialMessage, onBack, onToggleView, onNavigateToChat: onNavigateToChatProp, onViewChange, initialView = 'mindmap', onClearCache }: CombinedViewProps) => {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Set up callback for project focus events
    messageModeHandler.setOnProjectFocusCallback((message: string) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: message
      }]);
    });
  }, []);

  // WebSocket for project manager workflow (silent connection)
  const {
    connected,
    sessionId,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow,
  } = useWebSocket(
    (results) => {
      // Workflow completed - show summary in chat
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Project planning workflow completed! I've broken down your project and assessed the required skills."
      }]);
      reloadNodes();
      setCurrentProjectId(null);
    },
    (error) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Workflow error: ${error}`
      }]);
    }
  );

  // Handle workflow questions in chat
  useEffect(() => {
    if (currentQuestion) {
      // Add question to chat as assistant message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: currentQuestion.question + (currentQuestion.options ? `\n\nOptions: ${currentQuestion.options.join(', ')}` : '')
      }]);
    }
  }, [currentQuestion]);

  // Handle workflow progress messages in chat
  useEffect(() => {
    if (progress) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: progress
      }]);
    }
  }, [progress]);

  // Single mind map state - data comes directly from database
  const [mindMapNodes, setMindMapNodes] = useState<Node[]>([]);
  const [parentNodeTitle, setParentNodeTitle] = useState<string | null>(null);
  const [clickedProjectNode, setClickedProjectNode] = useState<Node | null>(null);
  const [showSubprojects, setShowSubprojects] = useState(false); // Track if we should show subprojects
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null); // Track focused project for workflow

  // Simple session management
  const [sessionHistory, setSessionHistory] = useState<Array<{
    id: string;
    nodes: Node[];
    parentNodeId?: string;
    timestamp: number;
  }>>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(-1);

  // Function to reload mind map nodes from database (after minddump or other operations)
  const reloadNodes = (options = {}) => {
    generateMindMapJson(options).then(data => {
      if (data) {
        // Set nodes from fresh database data
        setMindMapNodes(data.nodes || []);

        // Set parent node title if provided
        setParentNodeTitle(data.parentNode || null);

        // Save fresh database data to session cache with today's timestamp
        // This creates a new valid session that will pass cross-validation
        saveCurrentSession(data.nodes || []);

        console.log('Mind map nodes reloaded from database:', data.nodes?.length || 0, 'nodes');
        console.log('New session saved - will be available on next load');
      }
    }).catch(error => {
      console.error('Error reloading nodes from database:', error);
      // On error, don't update state - keep current view
    });
  };

  // Helper function to check if a timestamp is from today
  const isFromToday = (timestamp: number): boolean => {
    const today = new Date();
    const sessionDate = new Date(timestamp);

    return today.getFullYear() === sessionDate.getFullYear() &&
      today.getMonth() === sessionDate.getMonth() &&
      today.getDate() === sessionDate.getDate();
  };

  // Function to clear expired sessions (older than today)
  const clearExpiredSessions = (): boolean => {
    try {
      const stored = localStorage.getItem('mindmap_sessions');
      if (!stored) return false;

      const sessions = JSON.parse(stored);
      const validSessions = sessions.filter((session: any) =>
        session.timestamp && isFromToday(session.timestamp)
      );

      if (validSessions.length !== sessions.length) {
        // Some sessions were expired, update storage
        if (validSessions.length === 0) {
          // All sessions expired, clear everything
          clearAllSessionsAndCache();
          return true;
        } else {
          // Update with only valid sessions
          localStorage.setItem('mindmap_sessions', JSON.stringify(validSessions));
          localStorage.setItem('mindmap_current_index', '0');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Error clearing expired sessions:', error);
      return false;
    }
  };

  // Function to completely clear all sessions and cache (reusable for future implementations)
  // This function can be called from external components or hooks to reset the mindmap state
  // NOTE: This only clears navigation/position cache, not login credentials or user preferences
  const clearAllSessionsAndCache = () => {
    // Clear state
    setSessionHistory([]);
    setCurrentSessionIndex(-1);
    setMindMapNodes([]);
    setParentNodeTitle(null);
    setClickedProjectNode(null);
    setCurrentProjectId(null);
    setShowSubprojects(false);

    // Clear localStorage (only mindmap-related cache, preserve auth and other app data)
    localStorage.removeItem('mindmap_sessions');
    localStorage.removeItem('mindmap_current_index');

    console.log('Mindmap sessions and navigation cache cleared (login credentials preserved)');
  };

  // Get cached sessions from today only
  const getCachedSessionsFromToday = () => {
    try {
      const stored = localStorage.getItem('mindmap_sessions');
      if (!stored) return [];

      const sessions = JSON.parse(stored);
      const todaySessions = sessions.filter((session: any) =>
        session.timestamp && isFromToday(session.timestamp)
      );

      // If we found expired sessions, clean them up
      if (todaySessions.length !== sessions.length) {
        if (todaySessions.length === 0) {
          clearAllSessionsAndCache();
        } else {
          localStorage.setItem('mindmap_sessions', JSON.stringify(todaySessions));
          localStorage.setItem('mindmap_current_index', '0');
        }
      }

      return todaySessions;
    } catch (error) {
      console.warn('Error reading cached sessions:', error);
      clearAllSessionsAndCache();
      return [];
    }
  };

  // Cross-validate cached nodes against database nodes
  const validateCachedNodesAgainstDatabase = (cachedSessions: any[], dbNodes: Node[]) => {
    if (cachedSessions.length === 0 || dbNodes.length === 0) {
      return [];
    }

    // Get the most recent cached session
    const latestSession = cachedSessions[cachedSessions.length - 1];
    const cachedNodes = latestSession.nodes || [];

    // Create a map of database nodes by both id and projectId for efficient lookup
    const dbNodeMap = new Map();
    dbNodes.forEach(dbNode => {
      // Index by both regular id and projectId
      if (dbNode.id) dbNodeMap.set(dbNode.id, dbNode);
      if (dbNode.projectId) dbNodeMap.set(dbNode.projectId, dbNode);
    });

    // Filter cached nodes to only include those that exist in database
    const validatedNodes = cachedNodes.filter((cachedNode: Node) => {
      // Check if this cached node exists in database by id or projectId
      const existsById = cachedNode.id && dbNodeMap.has(cachedNode.id);
      const existsByProjectId = cachedNode.projectId && dbNodeMap.has(cachedNode.projectId);

      const isValid = existsById || existsByProjectId;

      if (!isValid) {
        console.log(`Cached node "${cachedNode.label}" (id: ${cachedNode.id}, projectId: ${cachedNode.projectId}) not found in database - removing from cache`);
      }

      return isValid;
    });

    console.log(`Validated ${validatedNodes.length}/${cachedNodes.length} cached nodes against database`);
    return validatedNodes;
  };

  // Utility function to check session status (useful for debugging)
  const getSessionStatus = () => {
    try {
      const stored = localStorage.getItem('mindmap_sessions');
      if (!stored) return { hasSession: false, isValid: false, sessionCount: 0 };

      const sessions = JSON.parse(stored);
      const validSessions = sessions.filter((session: any) =>
        session.timestamp && isFromToday(session.timestamp)
      );

      return {
        hasSession: sessions.length > 0,
        isValid: validSessions.length > 0,
        sessionCount: sessions.length,
        validSessionCount: validSessions.length,
        oldestSession: sessions.length > 0 ? new Date(Math.min(...sessions.map((s: any) => s.timestamp))) : null,
        newestSession: sessions.length > 0 ? new Date(Math.max(...sessions.map((s: any) => s.timestamp))) : null
      };
    } catch (error) {
      return { hasSession: false, isValid: false, sessionCount: 0, error: error.message };
    }
  };

  // Save session to cache (only saves nodes that came from database)
  const saveCurrentSession = (nodes: Node[], parentNodeId?: string) => {
    // Only save sessions with actual database data (not empty states)
    if (!nodes || nodes.length === 0) {
      console.log('Not saving empty session to cache');
      return;
    }

    const newSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes: [...nodes],
      parentNodeId,
      parentNodeTitle: parentNodeTitle, // Save parent title for restoration
      timestamp: Date.now()
    };

    const updatedHistory = [...sessionHistory.slice(0, currentSessionIndex + 1), newSession];
    setSessionHistory(updatedHistory);
    setCurrentSessionIndex(updatedHistory.length - 1);

    // Save to localStorage - this will be cross-validated on next load
    localStorage.setItem('mindmap_sessions', JSON.stringify(updatedHistory));
    localStorage.setItem('mindmap_current_index', (updatedHistory.length - 1).toString());

    console.log(`Saved session with ${nodes.length} nodes to cache (timestamp: ${new Date(newSession.timestamp).toLocaleString()})`);
  };

  const loadSessionFromStorage = () => {
    // NOTE: This function is now DEPRECATED and should not be used
    // It's kept for backward compatibility but the new approach uses cross-validation
    console.warn('loadSessionFromStorage() called - this is deprecated. Use cross-validation approach instead.');

    // Always start with empty canvas when this fallback is called
    clearAllSessionsAndCache();
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
        // Clear project ID when navigating away from project view
        setCurrentProjectId(null);
        // When going back to main view, don't show subprojects unless we came from minddump
        // Keep showSubprojects state as-is (it will be true if we came from minddump)
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
    try {
      // Always load subprojects from database (not cache)
      const data = await generateMindMapJson({ parentProjectId: nodeId });
      console.log(`Loaded ${data.nodes?.length || 0} subprojects for project ${nodeId} from database`);
      return data.nodes || [];
    } catch (error) {
      console.error('Error loading subprojects from database:', error);
      return [];
    }
  };



  // Load mind map nodes on component mount
  useEffect(() => {
    // Cross-validate cache with database: only show nodes that exist in BOTH and are from today
    // Default is empty canvas unless there was a minddump today
    const initializeData = async () => {
      try {
        // First, check backend connectivity
        const healthCheck = await APIService.healthCheck();
        if (!healthCheck.success) {
          console.warn('Backend health check failed:', healthCheck.error);
          // If backend is down, start with empty canvas (don't trust cache alone)
          console.log('Backend unavailable - starting with empty canvas');
          clearAllSessionsAndCache();
          return;
        }

        // Load current database state
        const dbData = await generateMindMapJson();
        const dbNodes = dbData?.nodes || [];

        // Check if we have cached sessions from today
        const cachedSessions = getCachedSessionsFromToday();

        if (cachedSessions.length === 0) {
          // No valid cache from today - start with empty canvas
          console.log('No cached sessions from today - starting with empty canvas');
          setMindMapNodes([]);
          setParentNodeTitle(null);
          return;
        }

        // Cross-validate: only keep cached nodes that also exist in database
        const validatedNodes = validateCachedNodesAgainstDatabase(cachedSessions, dbNodes);

        if (validatedNodes.length > 0) {
          // We have validated nodes from today's cache that match database
          setMindMapNodes(validatedNodes);
          setParentNodeTitle(cachedSessions[0].parentNodeTitle || null);

          // Restore session history with validated data
          const validatedSession = {
            ...cachedSessions[0],
            nodes: validatedNodes
          };
          setSessionHistory([validatedSession]);
          setCurrentSessionIndex(0);

          console.log(`Loaded ${validatedNodes.length} validated nodes from today's cache`);
        } else {
          // No valid nodes found - clear cache and start empty
          console.log('No valid cached nodes match database - starting with empty canvas');
          clearAllSessionsAndCache();
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        // On error, start with empty canvas for safety
        console.log('Error during initialization - starting with empty canvas');
        clearAllSessionsAndCache();
      }
    };

    initializeData();
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

              // After minddump, show both projects and subprojects
              setShowSubprojects(true);
              // Reload nodes when processing is successful - show all projects after minddump
              reloadNodes({ showSubprojects: true });
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

            // After minddump, show both projects and subprojects
            setShowSubprojects(true);
            // Reload nodes when processing is successful - show all projects after minddump
            reloadNodes({ showSubprojects: true });
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



  // Show nodes only when they exist
  useEffect(() => {
    if (mindMapNodes.length > 0) {
      const allNodeIds = mindMapNodes.map(n => n.id);
      // Include parent node if it exists
      if (parentNodeTitle) {
        allNodeIds.push("parent-node");
      }
      setVisibleNodes(allNodeIds);
    } else {
      // Clear visible nodes when mindMapNodes is empty
      setVisibleNodes([]);
    }
  }, [mindMapNodes, parentNodeTitle]);

  // Handler for entity autocomplete selection
  const handleEntitySelect = (entity: EntitySuggestion, newText: string) => {
    setInput(newText);
    messageModeHandler.selectObject({
      id: entity.id,
      name: entity.name,
      type: entity.type
    });
    textareaRef.current?.focus();
  };

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
        // Check if we're in project manager mode (project is focused)
        if (currentProjectId) {
          // If workflow hasn't started yet, start it
          if (!sessionId || !connected) {
            await startWorkflow(currentProjectId, userId);
            // Wait a moment for session to register
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // If there's a current question, send response to workflow
          if (currentQuestion) {
            sendResponse(userMessage);
            setIsProcessing(false);
            return;
          }

          // If no question yet, workflow is processing - just wait
          setIsProcessing(false);
          return;
        }

        // Normal minddump mode - Use message mode handler to process the message
        const result = await messageModeHandler.processMessage(userMessage, userId);

        if (result.success) {
          // Add AI response with the actual result
          setMessages(prev => [...prev, {
            role: "assistant",
            content: result.output || "Processing completed successfully."
          }]);

          // After minddump, show both projects and subprojects
          setShowSubprojects(true);
          // Reload nodes when processing is successful - show all projects after minddump
          reloadNodes({ showSubprojects: true });
        } else {
          // Handle error case
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `I encountered an issue processing your request: ${result.error || 'Unknown error'}`
          }]);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Error: ${errorMessage}`
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

    // Only navigate to subprojects if NOT in showSubprojects mode (i.e., in default parent-only view)
    if ((hasSubprojects || isProject) && !showSubprojects) {
      try {
        // Load subprojects from database using the actual project ID
        const projectIdToUse = node.projectId || node.id;
        const subprojects = await loadSubprojects(projectIdToUse);

        if (subprojects.length > 0) {
          // Save current state and navigate to subprojects
          saveCurrentSession(subprojects, projectIdToUse);
          setMindMapNodes(subprojects);
          setParentNodeTitle(node.label);
          // Track project ID for project manager mode
          setCurrentProjectId(projectIdToUse);

          console.log(`Navigated to subprojects of ${node.label}`);
        } else {
          console.log(`No subprojects found for ${node.label}`);
          // Still treat as regular project focus if no subprojects
          setClickedProjectNode(node);
          const projectIdToUse = node.projectId || node.id;
          setCurrentProjectId(projectIdToUse);
          const isStarted = node.color === 'blue' || node.color === 'teal';
          messageModeHandler.setProjectFocus({
            id: projectIdToUse,
            name: node.label,
            status: isStarted ? 'started' : 'not_started'
          });
        }
      } catch (error) {
        console.error('Failed to load subprojects:', error);
      }
    } else {
      // Regular project focus behavior (in showSubprojects mode or when node has no subprojects)
      setClickedProjectNode(node);
      const projectIdToUse = node.projectId || node.id;
      setCurrentProjectId(projectIdToUse);

      // Determine if project is started (simple heuristic based on node color or other properties)
      const isStarted = node.color === 'blue' || node.color === 'teal'; // Assume blue/teal = started

      // Silently switch to project mode - user doesn't see any indication
      messageModeHandler.setProjectFocus({
        id: projectIdToUse,
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
          user_id: userId
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
    if (onClearCache) {
      onClearCache(clearAllSessionsAndCache);
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

  // Auto-resize textarea as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with a max height limit
      const maxHeight = 200; // max height in pixels (about 8-9 lines)
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
      // Enable scrolling if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

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

                <textarea
                  ref={textareaRef}
                  value={isRecording ? `Recording... ${formatRecordingTime(recordingTime)}` : input}
                  onChange={(e) => !isRecording && !isProcessing && setInput(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => {
                    // Submit on Enter (without Shift)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder={isInputExpanded && !isRecording && !isProcessing ? messageModeHandler.getPlaceholder() : ""}
                  disabled={isRecording || isProcessing}
                  rows={1}
                  className={`w-full px-5 py-3 bg-gray-900 border rounded-3xl 
                             text-sm text-white placeholder:text-white/50
                             focus:outline-none focus:ring-2 focus:border-blue-500/50
                             transition-all duration-300 hover:border-white/30
                             resize-none
                             ${isRecording
                      ? 'border-red-500/50 text-red-300 cursor-not-allowed'
                      : isProcessing
                        ? 'border-purple-500/50 text-purple-300 cursor-not-allowed'
                        : 'border-white/20 focus:ring-blue-500/50'
                    }
                             ${isInputExpanded ? 'pr-20' : 'cursor-pointer'}`}
                  style={{ paddingRight: isInputExpanded ? '80px' : '20px', minHeight: '48px' }}
                />

                {/* Entity Autocomplete */}
                <EntityAutocomplete
                  inputValue={input}
                  onSelectEntity={handleEntitySelect}
                  inputRef={textareaRef as any}
                />

                <div className={`absolute right-3 bottom-3 flex items-center gap-2 transition-opacity duration-300 ${isInputExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
