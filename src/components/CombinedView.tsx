import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ArrowUp, MessageSquare, X, Reply, Search } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";
import { ProblemsModal, ProblemsModalProps } from "./ProblemsModal";
import { TaskManagerModal } from "./TaskManagerModal";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useAuth } from "@/hooks/useAuth";
import { APIService } from "@/lib/api";
import { generateMindMapJson } from "../utils/generateMindMapJson";
import { handleJWTError, detectJWTError } from "@/utils/jwtErrorHandler";
import { useGlobalData } from "@/hooks/useGlobalData";
import { messageModeHandler } from "@/utils/messageModeHandler";
// Removed EntityAutocomplete - using simple chat workflow instead
import { useWebSocket } from "@/hooks/useWebSocket";
import { getCachedSessionsFromToday, validateCachedNodesAgainstDatabase, clearAllSessionsAndCache } from "@/utils/sessionUtils";
import { processUserMessage, getDefaultErrorMessage } from "@/utils/messageProcessor";
import { MindMapNode } from "./MindMapNode";
import { SessionManager, SessionData } from "@/utils/sessionManager";
import { SearchModal } from "./SearchModal";
import { generateMindMapFromMinddump } from "@/utils/generateMindMapJson";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioSnippets?: any[];
  messageType?: "project_organization" | "project_chat" | "normal";
  autoRemove?: boolean; // Flag to mark messages for automatic removal
}

export interface Node {
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
  onReloadNodes?: (reloadFn: (options?: any) => void) => void; // Optional callback to expose reloadNodes function
}

export const CombinedView = ({ initialMessage, onBack, onToggleView, onNavigateToChat: onNavigateToChatProp, onViewChange, initialView = 'mindmap', onClearCache, onReloadNodes }: CombinedViewProps) => {
  const { userId, signOut } = useAuth();
  const globalData = useGlobalData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to remove project focus messages (both organization and chat)
  // These messages are ONLY removed in specific cases:
  // 1. User responds with "No" (declines the offer)
  // 2. New project focus message is added (replaces old one when clicking different project)
  // All other messages remain as part of the natural conversation flow
  const removeProjectFocusMessages = (messages: Message[]) => {
    return messages.filter(msg => msg.messageType !== 'project_organization' && msg.messageType !== 'project_chat');
  };

  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [mapHeight, setMapHeight] = useState(60); // Percentage of screen height for mind map
  const [isDragging, setIsDragging] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [typingMessages, setTypingMessages] = useState<Set<number>>(new Set());
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);
  const [selectedProjectForProblems, setSelectedProjectForProblems] = useState<Node | null>(null);
  const [currentView, setCurrentView] = useState<'mindmap' | 'tasks'>(initialView);
  const [replyingToTask, setReplyingToTask] = useState<{ title: string } | null>(null);
  const [blurTimeoutId, setBlurTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Removed selectedEntities - using simple chat workflow instead

  // Ref for auto-scrolling chat messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket for interactive chat workflow
  const {
    connected,
    sessionId,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow,
    disconnect,
  } = useWebSocket(
    (results) => {
      // Workflow completed - show summary in chat
      console.log('Chat workflow completed with results:', results);

      // Add completion message to chat
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "✅ Chat completed! Your thoughts have been organized into projects and problems."
      }]);

      // Force reload nodes to show new data
      reloadNodes({ forceRefresh: true });
    },
    (error) => {
      // Workflow error - show in chat
      console.error('Chat workflow error:', error);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Chat workflow error: ${error}`
      }]);
    }
  );

  // Reset message mode handler when component mounts
  useEffect(() => {
    messageModeHandler.reset();

    // Set up callback for project focus events
    messageModeHandler.setOnProjectFocusCallback((message: string, messageType?: string, clearMessages?: boolean) => {
      if (clearMessages) {
        // Clear all messages when project focus is sent
        setMessages([{
          role: "assistant",
          content: message,
          messageType: messageType as "project_organization" | "project_chat" | "normal" | undefined,
          autoRemove: messageType === 'project_organization' || messageType === 'project_chat'
        }]);
      } else {
        // Remove any existing project focus messages before adding new one
        if (messageType === 'project_organization' || messageType === 'project_chat') {
          setMessages(prev => removeProjectFocusMessages(prev));
        }

        setMessages(prev => [...prev, {
          role: "assistant",
          content: message,
          messageType: messageType as "project_organization" | "project_chat" | "normal" | undefined,
          autoRemove: messageType === 'project_organization' || messageType === 'project_chat'
        }]);
      }
    });

    // Set up callback for project focus change events (for cleanup)
    messageModeHandler.setOnProjectFocusChangeCallback(() => {
      // Disconnect WebSocket when project focus changes
      if (connected || sessionId) {
        console.log('Project focus changed, disconnecting WebSocket');
        disconnect();
      }

    });
  }, [connected, sessionId, disconnect]);

  // Handle workflow questions in chat
  useEffect(() => {
    console.log('CombinedView: currentQuestion changed:', currentQuestion);
    if (currentQuestion) {
      console.log('CombinedView: Adding question to chat:', currentQuestion.question);
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
      // Add progress message
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
  const [currentProjectStatus, setCurrentProjectStatus] = useState<'started' | 'not_started' | null>(null); // Track project status

  // Simple session management
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(-1);

  // Function to reload mind map nodes from database (after minddump or other operations)
  const reloadNodes = async (options: any = {}) => {
    try {
      const { clearNodes, ...restOptions } = options;
      
      // If clearNodes is true, clear the current nodes first
      if (clearNodes) {
        setMindMapNodes([]);
        setParentNodeTitle(null);
        console.log('Mind map cleared for new session');
        return;
      }
      
      // Use cache unless forceRefresh is specified
      const finalOptions = { forceRefresh: false, ...restOptions };
      const data = await generateMindMapJson(finalOptions);
      if (data) {
        setMindMapNodes(data.nodes || []);
        setParentNodeTitle(data.parentNode || null);
        saveCurrentSession(data.nodes || []);
        console.log('Mind map nodes reloaded:', data.nodes?.length || 0, 'nodes', finalOptions.forceRefresh ? '(forced refresh)' : '(from cache)');
      }
    } catch (error) {
      console.error('Error reloading nodes:', error);
    }
  };



  // Save session to cache (only saves nodes that came from database)
  const saveCurrentSession = (nodes: Node[], parentNodeId?: string) => {
    const newSession = SessionManager.saveSession(nodes, parentNodeId, parentNodeTitle);
    if (newSession) {
      const updatedHistory = [...sessionHistory.slice(0, currentSessionIndex + 1), newSession];
      setSessionHistory(updatedHistory);
      setCurrentSessionIndex(updatedHistory.length - 1);
    }
  };



  const goBackInHistory = () => {
    const result = SessionManager.navigateHistory('back', currentSessionIndex, sessionHistory);
    if (result) {
      setCurrentSessionIndex(result.newIndex);
      setMindMapNodes(result.session.nodes);
      setClickedProjectNode(null);

      if (result.newIndex === 0 || !result.session.parentNodeId) {
        setParentNodeTitle(null);
        setCurrentProjectId(null);
        setCurrentProjectStatus(null);
      }
    }
  };

  const goForwardInHistory = () => {
    const result = SessionManager.navigateHistory('forward', currentSessionIndex, sessionHistory);
    if (result) {
      setCurrentSessionIndex(result.newIndex);
      setMindMapNodes(result.session.nodes);
      setClickedProjectNode(null);
    }
  };



  const loadSubprojects = async (nodeId: string) => {
    try {
      const data = await generateMindMapJson({
        parentProjectId: nodeId,
        onJWTError: (message: string) => {
          console.warn('JWT error during subproject loading:', message);
        }
      });
      console.log(`Loaded ${data.nodes?.length || 0} subprojects for project ${nodeId} from database`);
      return data.nodes || [];
    } catch (error) {
      console.error('Error loading subprojects from database:', error);

      // Handle JWT errors by automatically logging out the user
      const jwtResult = detectJWTError(error);
      if (jwtResult.isJWTError) {
        console.warn('JWT error detected during subproject loading, logging out user');
        await handleJWTError(error, signOut);
      }

      return [];
    }
  };

  const handleMinddumpSelect = async (minddump: any) => {
    try {
      console.log('Loading minddump:', minddump.title);
      const data = await generateMindMapFromMinddump(minddump.id);
      
      if (data && data.nodes) {
        setMindMapNodes(data.nodes);
        setParentNodeTitle(data.parentNode || minddump.title);
        saveCurrentSession(data.nodes, minddump.title);
        console.log('Minddump loaded:', data.nodes.length, 'nodes');
      }
    } catch (error) {
      console.error('Error loading minddump:', error);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Use cached data for faster loading
        const dbData = await generateMindMapJson({
          forceRefresh: false, // Use cache first - no need to hit database on initialization
          onJWTError: (message: string) => {
            console.warn('JWT error during data initialization:', message);
          }
        });
        const dbNodes = dbData?.nodes || [];

        // Show all projects
        setMindMapNodes(dbNodes);
        setParentNodeTitle(dbData.parentNode || null);

        // Save this as a new session (for navigation history)
        if (dbNodes.length > 0) {
          saveCurrentSession(dbNodes, null);
        }

      } catch (error) {
        console.error('Error initializing data:', error);

        // Handle JWT errors by automatically logging out the user
        const jwtResult = detectJWTError(error);
        if (jwtResult.isJWTError) {
          console.warn('JWT error detected during initialization, logging out user');
          await handleJWTError(error, signOut);
          return; // Exit early after logout
        }

        setMindMapNodes([]);
        setParentNodeTitle(null);
      }
    };

    initializeData();
  }, [signOut]);



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

        // Process initial message
        const processInitialMessage = async () => {
          setIsProcessing(true);
          try {
            const result = await processUserMessage(initialMessage, userId);

            setMessages(prev => [...prev, {
              role: "assistant",
              content: result.success ? result.output! : getDefaultErrorMessage(result.error)
            }]);

            if (result.success) {
              setShowSubprojects(true);
              reloadNodes({ showSubprojects: true, forceRefresh: true }); // Force refresh after successful minddump
            }
          } catch (error) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: getDefaultErrorMessage()
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
      // Add new user message (don't remove project organization messages - they're part of conversation)
      setMessages(prev => [...prev, { role: "user", content: initialMessage }]);

      // Process new message
      const processNewMessage = async () => {
        setIsProcessing(true);
        try {
          const result = await processUserMessage(initialMessage, userId);

          const responseMessage = result.success
            ? result.output!
            : "I understand. Let me help you with that task. What specific aspect would you like to focus on first?";

          setMessages(prev => [...prev, {
            role: "assistant",
            content: responseMessage
          }]);

          if (result.success) {
            setShowSubprojects(true);
            reloadNodes({ showSubprojects: true, forceRefresh: true }); // Force refresh after successful processing
          }
        } catch (error) {
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

  // Removed handleEntitySelect - using simple chat workflow instead

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      const userMessage = input.trim();

      // Check if user is responding with "No" to remove project organization messages
      // Matches: "No", "no", "NO", "No.", "No!", "No?", "No thanks", etc.
      const isNoResponse = /^no\b/i.test(userMessage);

      // ONLY remove project focus messages if user says "No"
      // All other messages should remain as part of the conversation
      const filteredMessages = isNoResponse ? removeProjectFocusMessages(messages) : messages;

      setMessages([...filteredMessages, { role: "user", content: userMessage }]);
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
        // Start interactive chat workflow with the user's message
        if (!sessionId || !connected) {
          console.log('Starting workflow with user message:', userMessage);
          await startWorkflow(userId, userMessage);
          setIsProcessing(false);
          return;
        }

        // If already connected and there's a current question, send response via WebSocket
        if (currentQuestion) {
          console.log('Responding to AI question via WebSocket:', userMessage);
          sendResponse(userMessage);
          setIsProcessing(false);
          return;
        }

        // If connected but no question, start new workflow with this message
        console.log('Starting new workflow with message:', userMessage);
        disconnect(); // Disconnect current session
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        await startWorkflow(userId, userMessage);
        setIsProcessing(false);
        return;
      } catch (error) {
        console.error('Error processing message:', error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: getDefaultErrorMessage()
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle node clicks for project focus and subproject navigation
  const handleNodeClick = async (node: Node) => {
    // Removed selectedEntities reset - using simple chat workflow instead

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
          // Track project ID for project chat mode (projects with subprojects are considered started)
          setCurrentProjectId(projectIdToUse);
          setCurrentProjectStatus('started'); // Projects with subprojects should use project chat

          // Trigger project chat initiator for projects with subprojects
          messageModeHandler.setProjectFocus({
            id: projectIdToUse,
            name: node.label,
            status: 'started' // Projects with subprojects should use project chat, not project manager
          });

          console.log(`Navigated to subprojects of ${node.label}`);
        } else {
          console.log(`No subprojects found for ${node.label}`);
          // Still treat as regular project focus if no subprojects
          setClickedProjectNode(node);
          const projectIdToUse = node.projectId || node.id;
          setCurrentProjectId(projectIdToUse);
          const isStarted = node.color === 'blue' || node.color === 'teal';
          setCurrentProjectStatus(isStarted ? 'started' : 'not_started');
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
      setCurrentProjectStatus(isStarted ? 'started' : 'not_started');

      // Switch to project mode and show appropriate message based on project status
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

    // Add task message to chat (don't remove project organization messages - they're part of conversation)
    setMessages(prev => [...prev, { role: "user", content: taskMessage }]);

    if (userId) {
      setIsProcessing(true);
      try {
        const result = await processUserMessage(taskMessage, userId);

        if (result.success) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: result.output || "Task processed successfully."
          }]);

          // Reload nodes when processing is successful
          reloadNodes({ forceRefresh: true }); // Force refresh after successful processing
        } else {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: getDefaultErrorMessage(result.error)
          }]);
        }
      } catch (error) {
        console.error('Error processing task message:', error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: getDefaultErrorMessage(error instanceof Error ? error.message : String(error))
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

        // Add AI response after delay (don't remove org messages for simple acknowledgment)
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
      onClearCache(async () => {
        // Clear session cache
        clearAllSessionsAndCache();
        // Refresh global data from database
        await globalData.refresh();
        // Reload the mind map with fresh data
        const dbData = await generateMindMapJson({
          forceRefresh: true // Force fresh data
        });
        setMindMapNodes(dbData?.nodes || []);
        setParentNodeTitle(dbData.parentNode || null);
      });
    }
    if (onReloadNodes) {
      onReloadNodes(reloadNodes);
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

  // Calculate dynamic padding based on active banners
  const calculateChatPadding = () => {
    let bannerCount = 0;

    if (isRecording && isInputExpanded) bannerCount++;
    if (isProcessing && isInputExpanded && !isRecording) bannerCount++;
    if (sessionId && isInputExpanded && !isRecording && !isProcessing) bannerCount++;
    if (replyingToTask && isInputExpanded && !isRecording && !isProcessing) bannerCount++;

    // Base padding + banner height (48px per banner + 8px margin)
    const basePadding = isInputExpanded ? 80 : 60;
    const bannerPadding = bannerCount * 56; // 48px height + 8px margin

    return basePadding + bannerPadding;
  };

  // Auto-scroll to maximum bottom position when messages change
  useEffect(() => {
    const scrollToMaxBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToMaxBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages]);

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

            {/* Search Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="absolute top-4 right-4 z-30 p-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:bg-gray-800/80 hover:border-gray-600/50 transition-all duration-200 group"
              title="Search Mind Maps"
            >
              <Search className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>

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
            {allNodes && allNodes
              .filter(node => visibleNodes.includes(node.id))
              .map((node) => (
                <MindMapNode
                  key={node.id}
                  node={node}
                  onNodeClick={handleNodeClick}
                  onProblemClick={() => {
                    console.log('Problem bubble clicked for node:', node.label);
                    console.log('Full node object:', node);
                    console.log('Node ID:', node.id);
                    console.log('Node projectId:', node.projectId);
                    console.log('Node has problem:', node.hasProblem);
                    console.log('Node problem data:', node.problemData);
                    setSelectedProjectForProblems(node);
                    setIsProblemsOpen(true);
                  }}
                  getScaleTransform={getScaleTransform}
                />
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
          <div
            ref={chatContainerRef}
            className="overflow-y-auto px-4 space-y-2 custom-scrollbar"
            style={{
              paddingTop: '12px',
              paddingBottom: `${calculateChatPadding()}px`,
            }}
          >
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
                        // Scroll to max bottom after typing animation completes
                        setTimeout(() => {
                          if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                          }
                        }, 50);
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
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Status banners - positioned above input */}
          <div className={`absolute left-0 right-0 px-4 pointer-events-none transition-all duration-300 ${mapHeight > 85 ? 'bottom-[-100px] opacity-0' : 'bottom-16 opacity-100'
            }`}>
            <div className="max-w-4xl mx-auto">
              {/* Recording indicator - show when recording */}
              {isRecording && isInputExpanded && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-300 flex-1">Recording... {formatRecordingTime(recordingTime)}</span>
                  <button
                    type="button"
                    onClick={handleMicrophoneClick}
                    className="p-0.5 hover:bg-red-500/20 rounded transition-colors pointer-events-auto"
                  >
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )}

              {/* Processing indicator - show when processing */}
              {isProcessing && isInputExpanded && !isRecording && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-sm text-purple-300 flex-1">Processing your message...</span>
                </div>
              )}

              {/* Workflow indicator - show when chat workflow is active */}
              {sessionId && isInputExpanded && !isRecording && !isProcessing && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-300 flex-1">Interactive chat active - answer the questions for better organization</span>
                </div>
              )}

              {/* Replying to indicator - only show when expanded and not recording and not processing */}
              {replyingToTask && isInputExpanded && !isRecording && !isProcessing && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                  <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-blue-300 flex-1 truncate">Replying to: <strong>{replyingToTask.title}</strong></span>
                  <button
                    type="button"
                    onClick={handleCancelReply}
                    className="p-0.5 hover:bg-blue-500/20 rounded transition-colors pointer-events-auto"
                  >
                    <X className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>
              )}
            </div>
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

                {/* Removed EntityAutocomplete - using simple chat workflow instead */}

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



      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onMinddumpSelect={handleMinddumpSelect}
      />

      {/* Problems Modal */}
      <ProblemsModal
        isOpen={isProblemsOpen}
        onClose={() => {
          setIsProblemsOpen(false);
          setSelectedProjectForProblems(null);
        }}
        selectedProject={selectedProjectForProblems}
        onProblemConverted={(problemId, projectId) => {
          console.log(`Problem ${problemId} converted to project ${projectId}`);
          // Refresh the mind map to show new subproject
          reloadNodes({ forceRefresh: true });
        }}
      />
    </div>
  );
};
