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

  /**
   * Detect @ mentions in the text and extract the mode override and cleaned text
   */
  private detectModeOverride(text: string): { mode: 'minddump' | 'fix_nodes' | null; cleanedText: string } {
    const modePattern = /@(minddump|fix_nodes)\s*/gi;
    const match = text.match(modePattern);
    
    if (match) {
      const modeStr = match[0].toLowerCase().replace('@', '').trim();
      const cleanedText = text.replace(modePattern, '').trim();
      
      if (modeStr === 'minddump') {
        return { mode: 'minddump', cleanedText };
      } else if (modeStr === 'fix_nodes') {
        return { mode: 'fix_nodes', cleanedText };
      }
    }
    
    return { mode: null, cleanedText: text };
  }

  async processMessage(text: string, userId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    this.state.messageCount++;

    try {
      let response;
      
      // Detect mode override from @ mentions
      const { mode: modeOverride, cleanedText } = this.detectModeOverride(text);
      const textToSend = cleanedText;

      // Determine which RPC to call - use override if present, otherwise use current mode
      let effectiveMode = this.state.mode;
      
      if (modeOverride === 'minddump') {
        // Force minddump regardless of current mode
        response = await APIService.minddump({
          text: textToSend,
          user_id: userId
        });
        // After successful minddump, switch to follow-up mode
        if (response.success) {
          this.state.mode = 'minddump_followup';
        }
        return {
          success: response.success,
          output: response.output || response.result || "Processing completed successfully.",
          error: response.error
        };
      } else if (modeOverride === 'fix_nodes') {
        // Force fix_nodes regardless of current mode
        response = await APIService.fixNodes({
          text: textToSend,
          user_id: userId
        });
        return {
          success: response.success,
          output: response.output || response.result || "Processing completed successfully.",
          error: response.error
        };
      }

      // No override - use normal mode logic
      switch (this.state.mode) {
        case 'minddump':
          response = await APIService.minddump({
            text: textToSend,
            user_id: userId
          });
          // After successful minddump, switch to follow-up mode
          if (response.success) {
            this.state.mode = 'minddump_followup';
          }
          break;

        case 'minddump_followup':
          response = await APIService.fixNodes({
            text: textToSend,
            user_id: userId
          });
          break;

        case 'project_creator':
          response = await APIService.projectManager({
            text: textToSend
          });
          // After project creation, automatically return to minddump mode
          if (response.success) {
            this.clearProjectFocus();
          }
          break;

        case 'project_manager':
          response = await APIService.taskManagerAssess({
            user_message: textToSend,
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