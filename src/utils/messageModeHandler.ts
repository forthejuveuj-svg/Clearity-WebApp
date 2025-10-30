/**
 * Simple utility to handle different message modes and RPC calls
 */

import { APIService } from '@/lib/api';

export type MessageMode = 
  | 'minddump'           // Default mode - initial state
  | 'minddump_followup'  // Follow-up mode after minddump
  | 'project_creator'    // When clicking unstarted project
  | 'project_manager';   // When clicking started project

interface MessageModeState {
  mode: MessageMode;
  messageCount: number;
  selectedProject?: {
    id: string;
    name: string;
    status: 'started' | 'not_started';
  };
}

export class MessageModeHandler {
  private state: MessageModeState = {
    mode: 'minddump',
    messageCount: 0
  };

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      mode: 'minddump',
      messageCount: 0
    };
  }

  getCurrentMode(): MessageMode {
    return this.state.mode;
  }

  getPlaceholder(): string {
    // Keep placeholder consistent - user shouldn't know about modes
    return "Let's overthink about...";
  }

  setProjectFocus(project: { id: string; name: string; status: 'started' | 'not_started' }) {
    this.state.selectedProject = project;
    this.state.mode = project.status === 'started' ? 'project_manager' : 'project_creator';
    this.state.messageCount = 0;
  }

  clearProjectFocus() {
    this.state.selectedProject = undefined;
    this.state.mode = 'minddump';
    this.state.messageCount = 0;
  }

  async processMessage(text: string, userId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    this.state.messageCount++;

    try {
      let response;

      switch (this.state.mode) {
        case 'minddump':
          response = await APIService.minddump({
            text,
            user_id: userId,
            use_relator: false
          });
          // After successful minddump, switch to follow-up mode
          if (response.success) {
            this.state.mode = 'minddump_followup';
          }
          break;

        case 'minddump_followup':
          response = await APIService.fixNodes({
            text,
            user_id: userId
          });
          break;

        case 'project_creator':
          response = await APIService.projectManager({
            text
          });
          // After project creation, automatically return to minddump mode
          if (response.success) {
            this.clearProjectFocus();
          }
          break;

        case 'project_manager':
          response = await APIService.taskManagerAssess({
            user_message: text,
            task_object: this.state.selectedProject || {},
            context: { project_id: this.state.selectedProject?.id }
          });
          // After task assessment, automatically return to minddump mode
          if (response.success) {
            this.clearProjectFocus();
          }
          break;

        default:
          response = { success: false, error: "Unknown message mode" };
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

  getSelectedProject() {
    return this.state.selectedProject;
  }

  getModeInfo() {
    return {
      mode: this.state.mode,
      messageCount: this.state.messageCount,
      selectedProject: this.state.selectedProject
    };
  }
}

// Export a singleton instance for easy use
export const messageModeHandler = new MessageModeHandler();