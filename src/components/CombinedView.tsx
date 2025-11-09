import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ArrowUp, MessageSquare, X, Reply } from "lucide-react";
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
import { useWebSocket } from "@/hooks/useWebSocket";
import { processUserMessage, getDefaultErrorMessage } from "@/utils/messageProcessor";
import { MindMapNode } from "./MindMapNode";
import { SessionManager, SessionData } from "@/utils/sessionManager";
import { clearAllSessionsAndCache } from "@/utils/sessionUtils";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioSnippets?: any[];
  messageType?: "project_organization" | "project_chat" | "normal";
  autoRemove?: boolean;
}

export interface Node {
  id: string;
  projectId?: string;
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
  onViewChange?: (view: 'mindmap' | 'tasks') => void;
  onToggleView?: (toggleFunction: () => void) => void;
  onNavigateToChat?: (navigateFunction: () => void) => void;
  onClearCache?: (clearFunction: () => void) => void;
  onReloadNodes?: (reloadFunction: () => void) => void;
  initialView?: 'mindmap' | 'tasks';
}

export default function CombinedView({
  initialMessage,
  onBack,
  onViewChange,
  onToggleView,
  onNavigateToChat: onNavigateToChatProp,
  onClearCache,
  onReloadNodes,
  initialView = 'mindmap'
}: CombinedViewProps) {
  // Auth and global state
  const { user, signOut } = useAuth();
  const globalData = useGlobalData();

  // Basic state
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Mind map state
  const [mindMapNodes, setMindMapNodes] = useState<Node[]>([]);
  const [parentNodeTitle, setParentNodeTitle] = useState<string | null>(null);
  const [clickedProjectNode, setClickedProjectNode] = useState<Node | null>(null);
  const [showSubprojects, setShowSubprojects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectStatus, setCurrentProjectStatus] = useState<'started' | 'not_started' | null>(null);

  // UI state
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [mapHeight, setMapHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [typingMessages, setTypingMessages] = useState<Set<number>>(new Set());
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);
  const [selectedProjectForProblems, setSelectedProjectForProblems] = useState<Node | null>(null);
  const [currentView, setCurrentView] = useState<'mindmap' | 'tasks'>(initialView);
  const [replyingToTask, setReplyingToTask] = useState<{ title: string } | null>(null);
  const [blurTimeoutId, setBlurTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Session management
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(-1);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    async (results) => {
      // Workflow completed - create minddump from results
      console.log('Chat workflow completed with results:', results);

      // Add completion message to chat
      setMessages(prev => [...prev, {
        role: "assistant",
        content: results.message || "✅ Chat completed! Your thoughts have been organized into projects and problems."
      }]);

      // Create minddump from the received projects and problems
      if (results.projects || results.problems) {
        try {
          const { createMinddumpFromData } = await import('@/utils/generateMindMapJson');
          await createMinddumpFromData(results, userId);
          // Reload to show the new minddump
          await reloadNodes({ forceRefresh: true });
        } catch (error) {
          console.error('Error creating minddump:', error);
          // Fallback to old method
          reloadNodes({ forceRefresh: true });
        }
      } else {
        // No data received, just reload
        reloadNodes({ forceRefresh: true });
      }
    },
    (error) => {
      // Workflow error - show in chat
      console.error('Chat workflow error:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${error}`
      }]);
    }
  );

  // Initialize user ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  // Helper functions
  const removeProjectFocusMessages = (messages: Message[]) => {
    return messages.filter(msg => msg.messageType !== 'project_organization' && msg.messageType !== 'project_chat');
  };

  const saveCurrentSession = (nodes: Node[], projectNode: Node | null = null) => {
    console.log('Saving session with', nodes.length, 'nodes');
  };

  // Function to reload mind map nodes
  const reloadNodes = async (options = {}) => {
    try {
      const finalOptions = { showTodayOnly: true, forceRefresh: false, userId: userId, ...options };
      const data = await generateMindMapJson(finalOptions);
      if (data?.nodes) {
        setMindMapNodes(data.nodes);
        setParentNodeTitle(data.parentNode || null);
        saveCurrentSession(data.nodes);
        console.log('Mind map nodes reloaded:', data.nodes?.length || 0, 'nodes');
      }
    } catch (error) {
      console.error('Error reloading nodes:', error);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      if (!userId) return;

      try {
        // Try to load latest minddump, fallback to database
        const data = await generateMindMapJson({
          showTodayOnly: true,
          forceRefresh: false,
          userId: userId,
          onJWTError: (message: string) => {
            console.warn('JWT error during data initialization:', message);
          }
        });

        if (data?.nodes) {
          setMindMapNodes(data.nodes);
          setParentNodeTitle(data.parentNode || null);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [userId]);

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
        content: `⏳ ${progress}`
      }]);
    }
  }, [progress]);

  // Handle message submission
  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) return;

    // Add user message to chat
    const cleanedMessages = removeProjectFocusMessages(messages);
    setMessages([...cleanedMessages, { role: "user", content: userMessage }]);
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
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToMaxBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    const timeoutId = setTimeout(scrollToMaxBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black fixed inset-0">
      {/* Mind Map Section */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ height: `${mapHeight}%` }}
      >
        {/* Mind Map Nodes */}
        {mindMapNodes.map((node) => (
          <MindMapNode
            key={node.id}
            node={node}
            onNodeClick={() => {
              setClickedProjectNode(node);
              setCurrentProjectId(node.projectId || null);
            }}
            onProblemClick={() => {
              setSelectedProjectForProblems(node);
              setIsProblemsOpen(true);
            }}
            getScaleTransform={() => 'scale(1)'}
          />
        ))}
      </div>

      {/* Chat Section */}
      <div
        className="bg-black/40 backdrop-blur-sm border-t border-white/20 flex flex-col"
        style={{ height: `${100 - mapHeight}%` }}
      >
        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                  }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(input);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={1}
              disabled={isProcessing}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}