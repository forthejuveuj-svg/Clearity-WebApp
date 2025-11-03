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

interface MessageModeState {
  selectedObject?: SelectedObject;
  messageCount: number;
}

export class MessageModeHandler {
  private state: MessageModeState = {
    messageCount: 0
  };

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      messageCount: 0,
      selectedObject: undefined
    };
  }

  getPlaceholder(): string {
    if (this.state.selectedObject) {
      return `What do you want to change about ${this.state.selectedObject.name}?`;
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
      } else {
        // No object selected - call minddump to create new entities
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
      selectedObject: this.state.selectedObject
    };
  }
}

// Export a singleton instance for easy use
export const messageModeHandler = new MessageModeHandler();