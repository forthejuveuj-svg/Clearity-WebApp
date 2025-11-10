/**
 * API service for simplified RPC calls
 */

import { config } from './config';
import { APIServiceMock } from './apiMock';

const BACKEND_URL = config.backendUrl;

interface RPCResponse<T = any> {
  success: boolean;
  chat_response?: string;
  entities_stored?: { projects: number; problems: number };
  extracted_data?: { projects: any[]; problems: any[] };
  all_data_json?: { projects: any[]; problems: any[] };
  data?: { projects: any[]; problems: any[] };
  entities?: {
    projects: { count: number; entities: any[] };
    problems: { count: number; entities: any[] };
    total_entities: number;
  };
  message?: string;
  error?: string;
  method?: string;
  // Merge response fields
  merged_counts?: { projects: number; problems: number };
  original_counts?: { projects: number; problems: number };
  projects?: any[];
  problems?: any[];
  all_data?: any;
  simplified_nodes?: any[];
}

interface ChatParams {
  text: string;
  user_id?: string;
}

interface GetDataParams {
  user_id?: string;
}

interface ShowEntitiesParams {
  user_id?: string;
}

interface ClearDataParams {
  user_id?: string;
}

export class APIService {
  private static get useMockAPI(): boolean {
    return import.meta.env.DEV && window.location.hostname === 'localhost';
  }

  private static async makeRPCCall<T = any>(method: string, params: any): Promise<RPCResponse<T>> {
    try {
      const response = await fetch(`${BACKEND_URL}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        method
      };
    }
  }

  // Main chat method - replaces minddump, fixNodes, projectChat, etc.
  static async chat(params: ChatParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.chat(params);
    }
    return this.makeRPCCall('chat_workflow', params);
  }

  // Get all stored data as JSON
  static async getData(params: GetDataParams = {}): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.getData(params);
    }
    return this.makeRPCCall('get_data', params);
  }

  // Show detailed view of entities
  static async showEntities(params: ShowEntitiesParams = {}): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.showEntities(params);
    }
    return this.makeRPCCall('show_entities', params);
  }

  // Clear all data for a user
  static async clearData(params: ClearDataParams = {}): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.clearData(params);
    }
    return this.makeRPCCall('clear_data', params);
  }

  // Legacy methods for backward compatibility - all redirect to chat
  static async minddump(params: { text: string; user_id: string }): Promise<RPCResponse> {
    return this.chat(params);
  }

  static async fixNodes(params: { text: string; user_id: string; [key: string]: any }): Promise<RPCResponse> {
    return this.chat({ text: params.text, user_id: params.user_id });
  }

  static async projectManager(params: { text: string }): Promise<RPCResponse> {
    return this.chat({ text: params.text });
  }

  static async taskManagerAssess(params: { user_message: string; [key: string]: any }): Promise<RPCResponse> {
    return this.chat({ text: params.user_message });
  }

  static async projectChat(params: { text: string; project_id?: string; user_id?: string }): Promise<RPCResponse> {
    return this.chat({ text: params.text, user_id: params.user_id });
  }

  static async projectChatWorkflow(params: { project_id?: string; user_id?: string; session_id?: string }): Promise<RPCResponse> {
    return this.chat({ text: "Continue our conversation about this project", user_id: params.user_id });
  }

  // Merge and simplify nodes after minddump creation
  static async mergeAndSimplifyNodes(params: { user_id: string; session_id: string; data_json: any }): Promise<RPCResponse> {
    if (this.useMockAPI) {
      // Mock implementation - just return the data as-is
      return {
        success: true,
        message: 'Mock merge completed',
        merged_counts: { projects: params.data_json.projects?.length || 0, problems: params.data_json.problems?.length || 0 },
        projects: params.data_json.projects || [],
        problems: params.data_json.problems || [],
        all_data: params.data_json
      };
    }
    return this.makeRPCCall('merge_and_simplify_nodes', params);
  }

  static async healthCheck(): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.healthCheck();
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend not available'
      };
    }
  }
}