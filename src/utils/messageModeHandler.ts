/**
 * Simple utility to handle object selection and RPC calls
 */

import { APIService } from '@/lib/api';

export type EntityType = 
  | 'projects'
  | 'tasks'
  | 'knowledge_nodes'
  | 'problems'
  | 'skills'
  | 'resources'
  | 'preferences'
  | 'events';

interface SelectedObject {
  id: string;
  name: string;
  type: EntityType;
}

interface ProjectFocus {
  id: string;
  name: string;
  status: 'started' | 'not_started';
}

interface MessageModeState {
  selectedObject?: SelectedObject;
  projectFocus?: ProjectFocus;
  messageCount: number;
}

export class MessageModeHandler {
  private state: MessageModeState = {
    messageCount: 0
  };
  private onProjectFocusCallback?: (message: string, messageType?: string, clearMessages?: boolean) => void;
  private onProjectFocusChangeCallback?: () => void;

  constructor() {
    this.reset();
  }



  reset() {
    this.state = {
      messageCount: 0,
      selectedObject: undefined,
      projectFocus: undefined
    };
  }

  getPlaceholder(): string {
    if (this.state.selectedObject) {
      const sanitizedName = this.state.selectedObject.name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      return `What do you want to change about ${sanitizedName}?`;
    }
    if (this.state.projectFocus) {
      const sanitizedName = this.state.projectFocus.name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      return `Let's work on ${sanitizedName}...`;
    }
    return "Share your thoughts or load a saved mind map...";
  }

  /**
   * Select an object to modify
   */
  selectObject(object: SelectedObject) {
    this.state.selectedObject = object;
    this.state.messageCount = 0;
  }

  /**
   * Clear the selected object
   */
  clearSelection() {
    this.state.selectedObject = undefined;
    this.state.messageCount = 0;
  }

  /**
   * Get the currently selected object
   */
  getSelectedObject(): SelectedObject | undefined {
    return this.state.selectedObject;
  }

  /**
   * Set project focus and trigger callback with appropriate message based on project status
   */
  setProjectFocus(project: ProjectFocus) {
    // Notify about project focus change (for cleanup)
    if (this.onProjectFocusChangeCallback) {
      this.onProjectFocusChangeCallback();
    }
    
    this.state.projectFocus = project;
    this.state.messageCount = 0;
    
    if (this.onProjectFocusCallback) {
      const sanitizedName = project.name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (project.status === 'not_started') {
        // Project not started - offer to help organize it
        const message = `Would you like me to help you start organizing the project "${sanitizedName}"? I can break it down into manageable tasks and create a roadmap for you.`;
        this.onProjectFocusCallback(message, 'project_organization', true); // Pass clearMessages flag
      } else {
        // Project already started - offer to help with it
        const message = `Do you need help with "${sanitizedName}"?`;
        this.onProjectFocusCallback(message, 'project_chat', true); // Pass clearMessages flag
      }
    }
  }

  /**
   * Clear project focus
   */
  clearProjectFocus() {
    this.state.projectFocus = undefined;
    this.state.messageCount = 0;
  }

  /**
   * Get the currently focused project
   */
  getProjectFocus(): ProjectFocus | undefined {
    return this.state.projectFocus;
  }

  /**
   * Set callback for project focus events
   */
  setOnProjectFocusCallback(callback: (message: string, messageType?: string, clearMessages?: boolean) => void) {
    this.onProjectFocusCallback = callback;
  }

  /**
   * Set callback for project focus change events (for cleanup)
   */
  setOnProjectFocusChangeCallback(callback: () => void) {
    this.onProjectFocusChangeCallback = callback;
  }

  async processMessage(text: string, userId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    this.state.messageCount++;

    try {
      // Use the simplified chat API for all messages
      const response = await APIService.chat({
        text,
        user_id: userId
      });

      // Clear selection after processing if there was one
      if (this.state.selectedObject && response.success) {
        this.clearSelection();
      }

      return {
        success: response.success,
        output: response.chat_response || "Processing completed successfully.",
        error: response.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  getStateInfo() {
    return {
      messageCount: this.state.messageCount,
      selectedObject: this.state.selectedObject,
      projectFocus: this.state.projectFocus
    };
  }
}

// Export a singleton instance for easy use
export const messageModeHandler = new MessageModeHandler();