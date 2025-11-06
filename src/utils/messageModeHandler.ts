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
  private onProjectFocusCallback?: (message: string, messageType?: string) => void;

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
    return "Let's overthink about...";
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
    this.state.projectFocus = project;
    this.state.messageCount = 0;
    
    if (this.onProjectFocusCallback) {
      const sanitizedName = project.name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (project.status === 'not_started') {
        // Project not started - offer to help organize it
        const message = `Would you like me to help you start organizing the project "${sanitizedName}"? I can break it down into manageable tasks and create a roadmap for you.`;
        this.onProjectFocusCallback(message, 'project_organization');
      } else {
        // Project already started - offer to help with it
        const message = `Do you need help with "${sanitizedName}"?`;
        this.onProjectFocusCallback(message, 'project_chat');
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
  setOnProjectFocusCallback(callback: (message: string, messageType?: string) => void) {
    this.onProjectFocusCallback = callback;
  }

  async processMessage(text: string, userId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    this.state.messageCount++;

    try {
      let response;

      if (this.state.selectedObject) {
        // Object is selected - call fix_nodes to update it
        response = await APIService.fixNodes({
          text,
          user_id: userId,
          selected_object_id: this.state.selectedObject.id,
          selected_object_type: this.state.selectedObject.type
        });

        // After successful update, clear selection
        if (response.success) {
          this.clearSelection();
        }
      } else if (this.state.projectFocus && this.state.projectFocus.status === 'started') {
        // Project is focused and started - use project chat
        response = await APIService.projectChat({
          text,
          project_id: this.state.projectFocus.id,
          user_id: userId
        });
      } else {
        // No object selected or project not started - call minddump to create new entities
        response = await APIService.minddump({
          text,
          user_id: userId
        });
      }

      return {
        success: response.success,
        output: response.output || response.result || "Processing completed successfully.",
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