/**
 * API service for backend RPC calls
 */

import { config } from './config';

const BACKEND_URL = config.backendUrl;

interface RPCResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  method?: string;
}

interface MindDumpParams {
  text: string;
  user_id: string;
  use_relator?: boolean;
}

export class APIService {
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
    return this.makeRPCCall('minddump', params);
  }

  static async healthCheck(): Promise<RPCResponse> {
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