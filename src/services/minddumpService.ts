/**
 * Minddump Service
 * Handles all minddump-related API calls
 */

import { config } from '@/lib/config';

export interface Minddump {
  id: string;
  user_id: string;
  prompt: string;
  title: string;
  nodes: {
    projects: any[];
    problems: any[];
  };
  layout_data: {
    viewport?: { x: number; y: number; zoom: number };
    canvas_size?: { width: number; height: number };
    layout_algorithm?: string;
    last_modified?: string;
  };
  metadata: {
    entities_count?: { projects: number; problems: number };
    processing_time_ms?: number;
    ai_model?: string;
    version?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
}

class MinddumpService {
  private baseUrl = config.backendUrl;

  async getLatestMinddump(userId: string): Promise<Minddump | null> {
    try {
      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'get_latest_minddump',
          params: { user_id: userId }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.minddump;
      } else {
        console.error('Failed to get latest minddump:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting latest minddump:', error);
      return null;
    }
  }

  async searchMinddumps(userId: string, query: string): Promise<Minddump[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'search_minddumps',
          params: { user_id: userId, query }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.minddumps || [];
      } else {
        console.error('Failed to search minddumps:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error searching minddumps:', error);
      return [];
    }
  }

  async getMinddump(userId: string, minddumpId: string): Promise<Minddump | null> {
    try {
      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'get_minddump',
          params: { user_id: userId, minddump_id: minddumpId }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.minddump;
      } else {
        console.error('Failed to get minddump:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting minddump:', error);
      return null;
    }
  }

  async updateMinddumpLayout(userId: string, minddumpId: string, layoutData: any): Promise<boolean> {
    try {
      // This would be implemented as a separate RPC method if needed
      // For now, we'll handle layout updates in the frontend
      console.log('Layout update for minddump:', minddumpId, layoutData);
      return true;
    } catch (error) {
      console.error('Error updating minddump layout:', error);
      return false;
    }
  }
}

export const minddumpService = new MinddumpService();