import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConversationMessage } from '@/services/minddumpService';
import { minddumpService } from '@/services/minddumpService';

interface ConversationContextType {
  currentConversation: ConversationMessage[];
  currentMinddumpId: string | null;
  addMessage: (message: ConversationMessage) => void;
  clearConversation: () => void;
  loadConversation: (minddumpId: string, conversation: ConversationMessage[]) => void;
  saveConversation: () => Promise<boolean>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: React.ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [currentConversation, setCurrentConversation] = useState<ConversationMessage[]>([]);
  const [currentMinddumpId, setCurrentMinddumpId] = useState<string | null>(null);

  const addMessage = useCallback((message: ConversationMessage) => {
    setCurrentConversation(prev => [...prev, message]);
  }, []);

  const clearConversation = useCallback(() => {
    setCurrentConversation([]);
    setCurrentMinddumpId(null);
  }, []);

  const loadConversation = useCallback((minddumpId: string, conversation: ConversationMessage[]) => {
    setCurrentMinddumpId(minddumpId);
    setCurrentConversation(conversation || []);
  }, []);

  const saveConversation = useCallback(async (): Promise<boolean> => {
    if (!currentMinddumpId || currentConversation.length === 0) {
      return false;
    }

    try {
      return await minddumpService.updateMinddumpConversation(currentMinddumpId, currentConversation);
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }, [currentMinddumpId, currentConversation]);

  const value: ConversationContextType = {
    currentConversation,
    currentMinddumpId,
    addMessage,
    clearConversation,
    loadConversation,
    saveConversation
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};