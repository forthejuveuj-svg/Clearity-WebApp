/**
 * API service for backend RPC calls
 */

import { config } from './config';
import { APIServiceMock } from './apiMock';

const BACKEND_URL = config.backendUrl;

interface RPCResponse<T = any> {
  success: boolean;
  result?: T;
  output?: string;
  error?: string;
  method?: string;
}

interface MindDumpParams {
  text: string;
  user_id: string;
}

interface FixNodesParams {
  text: string;
  user_id: string;
  selected_object_id: string;
  selected_object_type: string;
}

interface ProjectManagerParams {
  text: string;
}

interface TaskManagerAssessParams {
  user_message: string;
  task_object: any;
  context?: any;
}

interface ProjectChatParams {
  text: string;
  project_id: string;
  user_id: string;
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

  static async minddump(params: MindDumpParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.minddump(params);
    }
    return this.makeRPCCall('minddump', params);
  }

  static async fixNodes(params: FixNodesParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.fixNodes(params);
    }
    return this.makeRPCCall('fix_nodes', params);
  }

  static async projectManager(params: ProjectManagerParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.projectManager(params);
    }
    
    const response = await this.makeRPCCall('projectmanager', params);
    // Transform the response to match expected format
    if (response.success && response.result?.message) {
      return {
        ...response,
        output: response.result.message
      };
    }
    return response;
  }

  static async taskManagerAssess(params: TaskManagerAssessParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.taskManagerAssess(params);
    }
    
    const response = await this.makeRPCCall('taskmanager_assess', params);
    // Transform the response to match expected format
    if (response.success && response.result?.message) {
      return {
        ...response,
        output: response.result.message
      };
    }
    return response;
  }

  static async projectChat(params: ProjectChatParams): Promise<RPCResponse> {
    if (this.useMockAPI) {
      return APIServiceMock.projectChat(params);
    }
    return this.makeRPCCall('project_chat', params);
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
      return {
        success: true,
        result: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend not available'
      };
    }
  }
}