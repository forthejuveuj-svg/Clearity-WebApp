/**
 * WebSocket Hook for Interactive Chat Workflow
 * 
 * Lazy connection - only connects when chat workflow is triggered
 */

import { useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/lib/config';

interface WorkflowQuestion {
  session_id: string;
  question: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  sessionId: string | null;
  currentQuestion: WorkflowQuestion | null;
  progress: string | null;
  sendResponse: (response: any) => void;
  startWorkflow: (userId: string, text?: string, minddumpId?: string) => Promise<void>;
  disconnect: () => void;
}

// Global socket reference
let socket: Socket | null = null;
let currentSessionId: string | null = null;
let currentQuestionState: WorkflowQuestion | null = null;

// Get backend URL
const BACKEND_URL = config.backendUrl;

export const useWebSocket = (
  onComplete?: (results: any) => void,
  onError?: (error: string) => void
): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<WorkflowQuestion | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Initialize WebSocket connection only when needed
  const initializeSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // If already connected, resolve immediately
      if (socket && socket.connected) {
        setConnected(true);
        resolve();
        return;
      }

      // If socket exists but not connected, try to reconnect
      if (socket && !socket.connected) {
        socket.connect();
        // Wait for connection
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000); // 30 seconds for initial connection

        socket.once('connect', () => {
          clearTimeout(timeout);
          setConnected(true);
          resolve();
        });
        return;
      }

      // Create new socket
      console.log('Initializing WebSocket connection to:', BACKEND_URL);
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        timeout: 7200000, // 2 hours in milliseconds
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      // Set up event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected:', socket?.id);
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setSessionId(null);
        currentSessionId = null;
      });

      socket.on('connection_established', (data) => {
        console.log('Connection established:', data);
      });

      socket.on('session_registered', (data) => {
        console.log('Session registered:', data);
        currentSessionId = data.session_id;
        setSessionId(data.session_id);
      });

      socket.on('workflow_question', (data: WorkflowQuestion) => {
        console.log('WebSocket: Received workflow_question:', data);
        currentQuestionState = data;
        setCurrentQuestion(data);
        console.log('WebSocket: Set currentQuestion state to:', data);
      });

      socket.on('workflow_message', (data: any) => {
        console.log('Received workflow message:', data);
        // Convert workflow_message to workflow_question format for compatibility
        const questionData: WorkflowQuestion = {
          session_id: data.session_id,
          question: data.message
        };
        currentQuestionState = questionData;
        setCurrentQuestion(questionData);
      });

      socket.on('workflow_progress', (data: any) => {
        console.log('Progress update:', data);
        setProgress(data.message || '');
      });

      socket.on('workflow_complete', (data: any) => {
        console.log('Workflow complete:', data);
        currentQuestionState = null;
        setCurrentQuestion(null);
        setProgress(null);
        if (onComplete) {
          onComplete(data.results);
        }
        // Disconnect after workflow completes
        disconnectSocket();
      });

      socket.on('workflow_error', (data: any) => {
        console.error('Workflow error:', data);
        if (onError) {
          onError(data.error);
        }
        // Disconnect on error
        disconnectSocket();
      });

      socket.on('response_received', (data) => {
        console.log('Response acknowledged:', data);
        currentQuestionState = null;
        setCurrentQuestion(null);
      });

      socket.on('error', (data) => {
        console.error('Socket error:', data);
      });

      // Clarity workflow events
      socket.on('clarity_response', (data) => {
        console.log('Clarity response:', data);
        // Convert to question format for display
        const questionData: WorkflowQuestion = {
          session_id: data.session_id,
          question: data.message
        };
        currentQuestionState = questionData;
        setCurrentQuestion(questionData);
      });

      socket.on('clarity_mindmap_refresh', (data) => {
        console.log('Clarity mindmap refresh:', data);
        // Trigger mindmap refresh
        if (onComplete) {
          onComplete({
            minddump_id: data.minddump_id,
            updates: data.updates,
            has_subprojects: data.has_subprojects
          });
        }
      });

      // Connect and wait for connection
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000); // 30 seconds for initial connection

      socket.once('connect', () => {
        clearTimeout(timeout);
        setConnected(true);
        resolve();
      });

      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      socket.connect();
    });
  }, [onComplete, onError]);
  // Disconnect socket when workflow is done
  const disconnectSocket = useCallback(() => {
    if (socket) {
      console.log('Disconnecting WebSocket');
      socket.disconnect();
      socket = null;
      setConnected(false);
      setSessionId(null);
      setCurrentQuestion(null);
      setProgress(null);
      currentSessionId = null;
      currentQuestionState = null;
    }
  }, []);

  // Send response to workflow
  const sendResponse = useCallback((response: any) => {
    if (!socket || !currentSessionId) {
      console.warn('Cannot send response: socket not ready');
      return;
    }

    console.log('Sending response:', response);
    socket.emit('workflow_response', {
      session_id: currentSessionId,
      response: response,
      question: currentQuestionState?.question || ''
    });
  }, []);

  // Start workflow - intelligently routes to chat_workflow or clarity_workflow
  const startWorkflow = useCallback(async (userId: string, text?: string, minddumpId?: string) => {
    try {
      // Initialize socket connection first
      await initializeSocket();

      if (!socket || !socket.connected) {
        throw new Error('Failed to establish WebSocket connection');
      }

      // Generate session ID
      const sessionPrefix = minddumpId ? 'clarity' : 'session';
      const newSessionId = `${sessionPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      currentSessionId = newSessionId;

      console.log('Registering session:', newSessionId);
      // Register session
      socket.emit('register_session', {
        user_id: userId,
        session_id: newSessionId
      });

      // Wait a bit for registration
      await new Promise(resolve => setTimeout(resolve, 500));

      // Determine which workflow to use
      const method = minddumpId ? 'clarity_workflow' : 'chat_workflow';
      const params: any = { user_id: userId, session_id: newSessionId };
      
      if (minddumpId) {
        // Clarity workflow on existing mindmap
        params.minddump_id = minddumpId;
        if (text) {
          params.message = text;
        }
        console.log('Starting clarity workflow on mindmap:', minddumpId);
      } else {
        // Chat workflow to create new mindmap
        if (text) {
          params.text = text;
        }
        console.log('Starting chat workflow to create mindmap');
      }
      
      const response = await fetch(`${BACKEND_URL}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: method,
          params: params
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('RPC returned non-JSON:', text.substring(0, 200));
        disconnectSocket(); // Clean up on error
        throw new Error(`Backend returned HTML. Status: ${response.status}. URL: ${BACKEND_URL}/rpc`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to start workflow:', result.error);
        disconnectSocket(); // Clean up on error
        throw new Error(result.error);
      }

      console.log(`${method} started successfully:`, result);
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Error starting workflow:', error);
      disconnectSocket(); // Clean up on any error
      throw error;
    }
  }, [initializeSocket, disconnectSocket]);

  return {
    connected,
    sessionId,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow,
    disconnect: disconnectSocket
  };
};
