import React, { useState, useEffect, useRef } from "react";
import { ArrowUp, MessageSquare, X, Reply, Search } from "lucide-react";
import { TypingAnimation } from "./TypingAnimation";
import { ProblemsModal, ProblemsModalProps } from "./ProblemsModal";
import { useAuth } from "@/hooks/useAuth";
import { APIService } from "@/lib/api";
import { generateMindMapJson } from "../utils/generateMindMapJson";
import { handleJWTError, detectJWTError } from "@/utils/jwtErrorHandler";
import { useGlobalData } from "@/hooks/useGlobalData";
import { messageModeHandler } from "@/utils/messageModeHandler";

import { useWebSocket } from "@/hooks/useWebSocket";
import { getCachedSessionsFromToday, validateCachedNodesAgainstDatabase, clearAllSessionsAndCache } from "@/utils/sessionUtils";
import { processUserMessage, getDefaultErrorMessage } from "@/utils/messageProcessor";
import { MindMapNode } from "./MindMapNode";
import { SessionManager, SessionData } from "@/utils/sessionManager";
import { SearchModal } from "./SearchModal";
import { MinddumpSearchBar } from "./MinddumpSearchBar";
import { generateMindMapFromMinddump } from "@/utils/generateMindMapJson";
import { useConversation } from "@/contexts/ConversationContext";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  data?: any; // Raw data from backend (projects or problems)
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
  onMinddumpSelect?: (selectFn: (minddump: any) => void) => void; // Optional callback to expose minddump selection function
}

export const CombinedView = ({ initialMessage, onBack, onToggleView, onNavigateToChat: onNavigateToChatProp, onViewChange, initialView = 'mindmap', onClearCache, onReloadNodes, onMinddumpSelect }: CombinedViewProps) => {
  const { userId, signOut } = useAuth();
  const globalData = useGlobalData();
  const { currentConversation, addMessage, clearConversation, loadConversation, saveConversation } = useConversation();
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
  const [isMergingNodes, setIsMergingNodes] = useState(false);



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
    async (results) => {
      // Workflow completed - show summary in chat
      console.log('Chat workflow completed with results:', results);

      // Process the AI results to create a minddump and generate mind map
      try {
        // Extract the actual data - handle nested structure
        let workflowData = null;

        if (results && results.data) {
          // Try different possible data locations based on the output structure
          if (results.data.all_data_json && (results.data.all_data_json.projects || results.data.all_data_json.problems)) {
            workflowData = results.data.all_data_json;
          } else if (results.data.data && (results.data.data.projects || results.data.data.problems)) {
            workflowData = results.data.data;
          } else if (results.data.projects || results.data.problems) {
            workflowData = results.data;
          }
        }

        if (workflowData && (workflowData.projects || workflowData.problems)) {
          console.log('Processing AI workflow results:', {
            projects: workflowData.projects?.length || 0,
            problems: workflowData.problems?.length || 0,
            chat_response: results.data?.chat_response || 'No response',
            insights: results.data?.insights || null
          });

          // Import the createMinddumpFromData function
          const { createMinddumpFromData } = await import('../utils/generateMindMapJson');

          // Prepare data with additional context
          const dataToProcess = {
            ...workflowData,
            chat_response: results.data?.chat_response || results.data?.message || 'Chat workflow result',
            insights: results.data?.insights || null,
            entities_created: results.data?.entities_created || results.data?.entities_stored || null
          };

          // Create minddump from the AI results with conversation history
          dataToProcess.conversation_history = currentConversation;
          const minddump = await createMinddumpFromData(dataToProcess, userId);

          if (minddump) {
            console.log('Minddump created from AI results:', minddump.id);

            // Load the new minddump into the mind map
            await handleMinddumpSelect(minddump);

            // Check if we should merge nodes (more than 2 projects)
            const projectCount = workflowData.projects?.length || 0;
            if (projectCount > 2 && sessionId) {
              console.log(`🔄 Starting node merge for ${projectCount} projects`);
              setIsMergingNodes(true);

              try {
                // Call merge RPC with the minddump data
                const mergeResult: any = await APIService.mergeAndSimplifyNodes({
                  user_id: userId,
                  session_id: sessionId,
                  data_json: {
                    projects: workflowData.projects || [],
                    problems: workflowData.problems || []
                  }
                });

                if (mergeResult.success) {
                  const originalCount = projectCount;
                  const mergedCount = mergeResult.merged_counts?.projects || 0;

                  console.log(`✅ Node merge completed: ${originalCount} -> ${mergedCount} projects`);

                  // Only update if nodes were actually merged (fewer nodes)
                  if (mergedCount < originalCount) {
                    console.log('📊 Updating minddump with merged nodes');
                    
                    // Update the minddump with merged data
                    const { updateMinddumpNodes } = await import('../utils/supabaseClient.js');
                    await updateMinddumpNodes(minddump.id, {
                      projects: mergeResult.projects || [],
                      problems: mergeResult.problems || []
                    });

                    // Reload the minddump to show merged nodes
                    await handleMinddumpSelect(minddump);
                  } else {
                    console.log('ℹ️ No nodes were merged, keeping original layout');
                  }
                } else {
                  console.warn('⚠️ Node merge failed:', mergeResult.error);
                }
              } catch (error) {
                console.error('❌ Error during node merge:', error);
              } finally {
                setIsMergingNodes(false);
              }
            }
          } else {
            console.warn('Failed to create minddump from AI results');
            // Fallback to regular reload
            reloadNodes({ forceRefresh: true });
          }
        } else {
          console.log('No projects or problems found in AI results, doing regular reload');
          console.log('Results structure:', JSON.stringify(results, null, 2));
          // Force reload nodes to show new data
          reloadNodes({ forceRefresh: true });
        }
      } catch (error) {
        console.error('Error processing AI workflow results:', error);
        console.error('Results that caused error:', JSON.stringify(results, null, 2));
        // Fallback to regular reload
        reloadNodes({ forceRefresh: true });
      }
    },
    (error) => {
      // Workflow error - show in chat
      console.error('Chat workflow error:', error);

    }
  );

  // Handle workflow questions in chat
  useEffect(() => {
    console.log('CombinedView: currentQuestion changed:', currentQuestion);
    if (currentQuestion) {
      console.log('CombinedView: Adding question to chat:', currentQuestion.question);
      // Add question to chat as assistant message
      setMessages(prev => {
        console.log('CombinedView: Previous messages count:', prev.length);
        const newMessages = [...prev, {
          role: "assistant" as const,
          content: currentQuestion.question
        }];
        console.log('CombinedView: New messages count:', newMessages.length);
        return newMessages;
      });

      // Add to conversation context
      addMessage({
        role: 'assistant',
        content: currentQuestion.question,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentQuestion]);

  // Handle workflow progress messages in chat
  useEffect(() => {
    if (progress) {
      console.log('CombinedView: Adding progress message:', progress);
      // Add progress message
      setMessages(prev => {
        console.log('CombinedView: Previous messages count (progress):', prev.length);
        const newMessages = [...prev, {
          role: "assistant" as const,
          content: progress
        }];
        console.log('CombinedView: New messages count (progress):', newMessages.length);
        return newMessages;
      });

      // Add to conversation context
      addMessage({
        role: 'assistant',
        content: progress,
        timestamp: new Date().toISOString()
      });
    }
  }, [progress]);

  // Single mind map state - data comes directly from database
  const [mindMapNodes, setMindMapNodes] = useState<Node[]>([]);
  const [parentNodeTitle, setParentNodeTitle] = useState<string | null>(null);
  const [hasInitializedOnce, setHasInitializedOnce] = useState(false);
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
      const { startFresh } = options;

      if (startFresh) {
        // Clear current minddump and show empty canvas
        console.log('🆕 Starting fresh - clearing current minddump');
        const { clearCurrentMinddump, debugCurrentMinddumpState } = await import('@/utils/supabaseClient.js');
        clearCurrentMinddump();
        setMindMapNodes([]);
        setParentNodeTitle(null);
        // Clear conversation when starting fresh
        clearConversation();
        setMessages([]);
        console.log('✅ Empty canvas shown');
        debugCurrentMinddumpState();
        return;
      }

      // Regular reload - check current minddump and load it
      const { getCurrentMinddumpId } = await import('@/utils/supabaseClient.js');
      const currentMinddumpId = getCurrentMinddumpId();

      if (currentMinddumpId) {
        // Load the current minddump
        console.log('🔄 Reloading current minddump:', currentMinddumpId);
        const data = await generateMindMapFromMinddump(currentMinddumpId);
        if (data) {
          setMindMapNodes(data.nodes || []);
          setParentNodeTitle(data.parentNode || null);
          saveCurrentSession(data.nodes || []);
          console.log('✅ Reloaded current minddump with', data.nodes?.length || 0, 'nodes');
        }
      } else {
        // No current minddump - show empty canvas
        console.log('📭 No current minddump - showing empty canvas');
        setMindMapNodes([]);
        setParentNodeTitle(null);
      }
    } catch (error) {
      console.error('❌ Error reloading nodes:', error);
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

  const handleMinddumpSelect = React.useCallback(async (minddump: any) => {
    console.log('🎯 CombinedView handleMinddumpSelect called:', minddump.title);


    try {
      console.log('🔄 Loading minddump:', minddump.title, 'ID:', minddump.id);
      const data = await generateMindMapFromMinddump(minddump.id);

      console.log('📊 Minddump data received:', data);

      if (data && data.nodes) {
        console.log('✅ Setting mind map nodes:', data.nodes.length, 'nodes');
        setMindMapNodes(data.nodes);
        setParentNodeTitle(data.parentNode || minddump.title);
        saveCurrentSession(data.nodes, minddump.title);

        // Load conversation history
        if (minddump.conversation && minddump.conversation.length > 0) {
          console.log('💬 Loading conversation history:', minddump.conversation.length, 'messages');
          loadConversation(minddump.id, minddump.conversation);

          // Convert conversation to messages format for display
          const conversationMessages: Message[] = minddump.conversation.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            messageType: 'normal'
          }));
          setMessages(conversationMessages);
        } else {
          // Clear conversation if no history
          clearConversation();
          setMessages([]);
        }

        console.log('✅ Minddump loaded successfully');
      } else {
        console.warn('⚠️ No nodes found in minddump data');
        setMindMapNodes([]);
        setParentNodeTitle(minddump.title);
        clearConversation();
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading minddump:', error);
      setMindMapNodes([]);
      setParentNodeTitle(null);


    }
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    // Only run initialization once on mount
    if (hasInitializedOnce) {
      return;
    }

    const initializeData = async () => {
      try {
        // Initialize minddumps cache
        const { initializeMinddumpsCache, getCurrentMinddumpId } = await import('@/utils/supabaseClient.js');
        await initializeMinddumpsCache();

        // Check current minddump state
        const currentMinddumpId = getCurrentMinddumpId();
        console.log('Initializing with current minddump:', currentMinddumpId);

        if (currentMinddumpId) {
          // Load the specific current minddump
          try {
            const data = await generateMindMapFromMinddump(currentMinddumpId);
            if (data && data.nodes) {
              setMindMapNodes(data.nodes);
              setParentNodeTitle(data.parentNode || null);
              saveCurrentSession(data.nodes, null);
              console.log('Loaded current minddump:', currentMinddumpId, 'with', data.nodes.length, 'nodes');
              setHasInitializedOnce(true);
              return;
            }
          } catch (error) {
            console.warn('Failed to load current minddump:', currentMinddumpId, error);
            // Clear invalid minddump ID and show empty canvas
            const { clearCurrentMinddump } = await import('@/utils/supabaseClient.js');
            clearCurrentMinddump();
          }
        }

        // No current minddump - show empty canvas (removed fallback to latest)
        console.log('No current minddump - showing empty canvas');
        setMindMapNodes([]);
        setParentNodeTitle(null);
        setHasInitializedOnce(true);

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
        setHasInitializedOnce(true);
      }
    };

    initializeData();
  }, [signOut, hasInitializedOnce]);



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
        // Process initial message
        const processInitialMessage = async () => {
          setIsProcessing(true);
          try {
            const result = await processUserMessage(initialMessage, userId);

            if (result.success) {
              setShowSubprojects(true);
              reloadNodes({ showSubprojects: true, forceRefresh: true }); // Force refresh after successful minddump
            }
          } catch (error) {
            console.error('Error processing initial message:', error);
          } finally {
            setIsProcessing(false);
          }
        };

        processInitialMessage();
      }
      setHasInitialized(true);
    }
  }, [initialMessage, hasInitialized, userId]);

  // Removed duplicate useEffect - initialMessage is already handled in the first useEffect



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
    if (input.trim() && (!isProcessing || currentQuestion)) {
      const userMessage = input.trim();

      // Check if user is responding with "No" to remove project organization messages
      // Matches: "No", "no", "NO", "No.", "No!", "No?", "No thanks", etc.
      const isNoResponse = /^no\b/i.test(userMessage);

      // ONLY remove project focus messages if user says "No"
      // All other messages should remain as part of the conversation
      const filteredMessages = isNoResponse ? removeProjectFocusMessages(messages) : messages;

      console.log('CombinedView: Adding user message:', userMessage);
      setMessages(prev => {
        console.log('CombinedView: Previous messages count (user):', prev.length);
        const newMessages = [...filteredMessages, { role: "user" as const, content: userMessage }];
        console.log('CombinedView: New messages count (user):', newMessages.length);
        return newMessages;
      });

      // Add to conversation context
      addMessage({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });
      setInput("");
      setIsProcessing(true);

      if (!userId) {
        console.warn('User not logged in');
        setIsProcessing(false);
        return;
      }

      try {
        // Start interactive chat workflow with the user's message
        if (!sessionId || !connected) {
          console.log('Starting workflow with user message:', userMessage);
          // Clear conversation when starting new workflow
          clearConversation();
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
        // Clear conversation when starting new workflow
        clearConversation();
        await startWorkflow(userId, userMessage);
        setIsProcessing(false);
        return;
      } catch (error) {
        console.error('Error processing message:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle node clicks for project focus and subproject navigation
  const handleNodeClick = async (node: Node) => {
    console.log('Node clicked:', node.label, 'ID:', node.id);

    // Handle project nodes
    // Check if node has subprojects (indicated by subNodes or specific keywords)
    const hasSubprojects = node.subNodes && node.subNodes.length > 0;
    const projectKeywords = ['project', 'course', 'learning', 'study', 'work', 'build', 'create'];
    const isProject = node.projectId || projectKeywords.some(keyword =>
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

    if (userId) {
      setIsProcessing(true);
      try {
        const result = await processUserMessage(taskMessage, userId);

        if (result.success) {
          // Reload nodes when processing is successful
          reloadNodes({ forceRefresh: true }); // Force refresh after successful processing
        }
      } catch (error) {
        console.error('Error processing task message:', error);
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





  const handleInputBlur = () => {
    // Use a timeout to allow button clicks to process first
    const timeoutId = setTimeout(() => {
      if (!input) {
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
        // Clear current minddump and show empty canvas
        await reloadNodes({ startFresh: true });
        // Refresh global data from database
        await globalData.refresh();
      });
    }
    if (onReloadNodes) {
      onReloadNodes(reloadNodes);
    }
    if (onMinddumpSelect) {
      onMinddumpSelect(handleMinddumpSelect);
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

    if (isProcessing && isInputExpanded) bannerCount++;
    if (replyingToTask && isInputExpanded && !isProcessing) bannerCount++;

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
      {/* Merging Nodes Indicator - Fixed at top */}
      {isMergingNodes && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-md rounded-full shadow-lg border border-purple-400/30">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white font-medium text-sm">Merging nodes...</span>
          </div>
        </div>
      )}

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
            {allNodes && allNodes
              .filter(node => visibleNodes.includes(node.id))
              .map((node) => (
                <MindMapNode
                  key={node.id}
                  node={node}
                  onNodeClick={handleNodeClick}
                  onProblemClick={() => {
                    console.log('Problem bubble clicked for node:', node.label);
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
                    <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
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


              {/* Processing indicator - show when processing */}
              {isProcessing && isInputExpanded && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-sm text-purple-300 flex-1">Processing your message...</span>
                </div>
              )}



              {/* Replying to indicator - only show when expanded and not processing */}
              {replyingToTask && isInputExpanded && !isProcessing && (
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
                  value={input}
                  onChange={(e) => (!isProcessing || currentQuestion) && setInput(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => {
                    // Submit on Enter (without Shift)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder={isInputExpanded && (!isProcessing || currentQuestion) ?
                    (currentQuestion ? "Type your answer..." : messageModeHandler.getPlaceholder()) : ""}
                  disabled={isProcessing && !currentQuestion}
                  rows={1}
                  className={`w-full px-5 py-3 bg-gray-900 border rounded-3xl 
                             text-sm text-white placeholder:text-white/50
                             focus:outline-none focus:ring-2 focus:border-blue-500/50
                             transition-all duration-300 hover:border-white/30
                             resize-none
                             ${isProcessing && !currentQuestion
                      ? 'border-purple-500/50 text-purple-300 cursor-not-allowed'
                      : currentQuestion
                        ? 'border-blue-500/50 text-blue-300 focus:ring-blue-500/50'
                        : 'border-white/20 focus:ring-blue-500/50'
                    }
                             ${isInputExpanded ? 'pr-20' : 'cursor-pointer'}`}
                  style={{ paddingRight: isInputExpanded ? '80px' : '20px', minHeight: '48px' }}
                />



                <div className={`absolute right-3 bottom-3 flex items-center gap-2 transition-opacity duration-300 ${isInputExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <button
                    type="submit"
                    disabled={!input.trim() || (isProcessing && !currentQuestion)}
                    className="p-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-500/25"
                  >
                    {isProcessing && !currentQuestion ? (
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
        currentMinddumpId={(() => {
          const { getCurrentMinddumpId } = require('../utils/supabaseClient');
          return getCurrentMinddumpId();
        })()}
        onProblemConverted={(problemId, projectId) => {
          console.log(`Problem ${problemId} converted to project ${projectId}`);
          // Refresh the mind map to show new subproject
          reloadNodes({ forceRefresh: true });
        }}
      />
    </div>
  );
};
