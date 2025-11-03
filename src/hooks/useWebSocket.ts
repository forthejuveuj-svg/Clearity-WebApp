/**
 * WebSocket Hook for Project Manager Workflow
 * 
 * Provides real-time communication with backend for interactive workflows
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface WorkflowQuestion {
  session_id: string;
  question: string;
  type: 'yes_no' | 'multiple_choice' | 'free_text' | 'scale';
  options?: string[];
  context?: Record<string, any>;
}

interface WorkflowProgress {
  session_id: string;
  stage: string;
  message: string;
  progress?: number;
}

interface WorkflowError {
  session_id: string;
  error: string;
  details?: Record<string, any>;
}

interface WorkflowComplete {
  session_id: string;
  results: Record<string, any>;
}

interface UseWebSocketReturn {
  connected: boolean;
  sessionId: string | null;
  currentQuestion: WorkflowQuestion | null;
  progress: WorkflowProgress | null;
  sendResponse: (response: any) => void;
  startWorkflow: (projectId: string, userId: string) => Promise<void>;
  disconnect: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const useWebSocket = (
  onComplete?: (results: any) => void,
  onError?: (error: string) => void
): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<WorkflowQuestion | null>(null);
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setConnected(true);
      toast.success('Connected to workflow server');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setSessionId(null);
      toast.info('Disconnected from workflow server');
    });

    socket.on('connection_established', (data) => {
      console.log('Connection established:', data);
    });

    // Workflow event handlers
    socket.on('session_registered', (data) => {
      console.log('Session registered:', data);
      setSessionId(data.session_id);
      toast.success('Workflow session started');
    });

    socket.on('workflow_question', (data: WorkflowQuestion) => {
      console.log('Received question:', data);
      setCurrentQuestion(data);
    });

    socket.on('workflow_progress', (data: WorkflowProgress) => {
      console.log('Progress update:', data);
      setProgress(data);
      toast.info(data.message, {
        description: data.stage,
      });
    });

    socket.on('workflow_error', (data: WorkflowError) => {
      console.error('Workflow error:', data);
      toast.error('Workflow Error', {
        description: data.error,
      });
      if (onError) {
        onError(data.error);
      }
    });

    socket.on('workflow_complete', (data: WorkflowComplete) => {
      console.log('Workflow complete:', data);
      toast.success('Workflow completed successfully!');
      setCurrentQuestion(null);
      setProgress(null);
      if (onComplete) {
        onComplete(data.results);
      }
    });

    socket.on('response_received', (data) => {
      console.log('Response acknowledged:', data);
      setCurrentQuestion(null); // Clear question after response
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data);
      toast.error('Error', {
        description: data.message || 'An error occurred',
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onComplete, onError]);

  // Send response to workflow
  const sendResponse = useCallback((response: any) => {
    if (!socketRef.current || !sessionId || !currentQuestion) {
      console.warn('Cannot send response: not ready');
      return;
    }

    console.log('Sending response:', response);
    socketRef.current.emit('workflow_response', {
      session_id: sessionId,
      response: response,
      question: currentQuestion.question,
    });
  }, [sessionId, currentQuestion]);

  // Start workflow for a project
  const startWorkflow = useCallback(async (projectId: string, userId: string) => {
    if (!socketRef.current || !connected) {
      toast.error('Not connected to server');
      throw new Error('WebSocket not connected');
    }

    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Register session
    socketRef.current.emit('register_session', {
      user_id: userId,
      session_id: newSessionId,
    });

    // Wait a bit for registration
    await new Promise(resolve => setTimeout(resolve, 500));

    // Call RPC to start workflow
    const response = await fetch(`${BACKEND_URL}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'projectmanager',
        params: {
          project_id: projectId,
          user_id: userId,
          session_id: newSessionId,
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      toast.error('Failed to start workflow', {
        description: result.error,
      });
      throw new Error(result.error);
    }

    console.log('Workflow started:', result);
    toast.success('Project workflow started');
  }, [connected]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    connected,
    sessionId,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow,
    disconnect,
  };
};






