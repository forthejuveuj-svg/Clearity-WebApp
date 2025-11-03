/**
 * WebSocket Hook for Project Manager Workflow
 * 
 * Simple implementation matching dev-front/app.js approach
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/lib/config';

interface WorkflowQuestion {
  session_id: string;
  question: string;
  type: 'yes_no' | 'multiple_choice' | 'free_text' | 'scale';
  options?: string[];
  context?: Record<string, any>;
}

interface UseWebSocketReturn {
  connected: boolean;
  sessionId: string | null;
  currentQuestion: WorkflowQuestion | null;
  progress: string | null;
  sendResponse: (response: any) => void;
  startWorkflow: (projectId: string, userId: string) => Promise<void>;
}

// Global socket reference
let socket: Socket | null = null;
let currentSessionId: string | null = null;
let currentQuestionState: WorkflowQuestion | null = null;

// Get backend URL
const BACKEND_URL = config.backendUrl || 'http://localhost:8000';

export const useWebSocket = (
  onComplete?: (results: any) => void,
  onError?: (error: string) => void
): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<WorkflowQuestion | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Initialize WebSocket connection once
  useEffect(() => {
    // Only initialize if socket doesn't exist
    if (socket && socket.connected) {
      setConnected(true);
      return;
    }

    if (socket && !socket.connected) {
      socket.connect();
      return;
    }

    // Create new socket
    console.log('Initializing WebSocket connection to:', BACKEND_URL);
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

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
      console.log('Received question:', data);
      currentQuestionState = data;
      setCurrentQuestion(data);
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
    });

    socket.on('workflow_error', (data: any) => {
      console.error('Workflow error:', data);
      if (onError) {
        onError(data.error);
      }
    });

    socket.on('response_received', (data) => {
      console.log('Response acknowledged:', data);
      currentQuestionState = null;
      setCurrentQuestion(null);
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data);
    });

    // Cleanup
    return () => {
      // Don't disconnect on cleanup - keep connection alive
      // socket?.disconnect();
    };
  }, []);

  // Send response to workflow
  const sendResponse = useCallback((response: any) => {
    if (!socket || !currentSessionId || !currentQuestionState) {
      console.warn('Cannot send response: socket not ready');
      return;
    }

    console.log('Sending response:', response);
    socket.emit('workflow_response', {
      session_id: currentSessionId,
      response: response,
      question: currentQuestionState.question
    });
  }, []);

  // Start workflow for a project
  const startWorkflow = useCallback(async (projectId: string, userId: string) => {
    if (!socket || !socket.connected) {
      throw new Error('WebSocket not connected');
    }

    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentSessionId = newSessionId;

    console.log('Registering session:', newSessionId);
    // Register session
    socket.emit('register_session', {
      user_id: userId,
      session_id: newSessionId
    });

    // Wait a bit for registration
    await new Promise(resolve => setTimeout(resolve, 500));

    // Call RPC to start workflow
    console.log('Calling RPC:', `${BACKEND_URL}/rpc`);
    const response = await fetch(`${BACKEND_URL}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'projectmanager',
        params: {
          project_id: projectId,
          user_id: userId,
          session_id: newSessionId
        }
      })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('RPC returned non-JSON:', text.substring(0, 200));
      throw new Error(`Backend returned HTML. Status: ${response.status}. URL: ${BACKEND_URL}/rpc`);
    }

    const result = await response.json();

    if (!result.success) {
      console.error('Failed to start workflow:', result.error);
      throw new Error(result.error);
    }

    console.log('Workflow started successfully:', result);
    setSessionId(newSessionId);
  }, []);

  return {
    connected,
    sessionId,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow
  };
};
