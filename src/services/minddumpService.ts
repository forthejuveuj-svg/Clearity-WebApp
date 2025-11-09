/**
 * Minddump Service
 * Handles all minddump-related API calls
 */

import { getLatestMinddump, searchMinddumps, getMinddump, createMinddump } from '@/utils/supabaseClient.js';

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
  async getLatestMinddump(): Promise<Minddump | null> {
    try {
      return await getLatestMinddump();
    } catch (error) {
      console.error('Error getting latest minddump:', error);
      return null;
    }
  }

  async searchMinddumps(query: string): Promise<Minddump[]> {
    try {
      return await searchMinddumps(query);
    } catch (error) {
      console.error('Error searching minddumps:', error);
      return [];
    }
  }

  async getMinddump(minddumpId: string): Promise<Minddump | null> {
    try {
      return await getMinddump(minddumpId);
    } catch (error) {
      console.error('Error getting minddump:', error);
      return null;
    }
  }

  async createMinddump(prompt: string, title: string, nodes: any, layoutData?: any, metadata?: any): Promise<Minddump | null> {
    try {
      const minddumpData = {
        prompt,
        title,
        nodes,
        layout_data: layoutData || {},
        metadata: metadata || {}
      };
      return await createMinddump(minddumpData);
    } catch (error) {
      console.error('Error creating minddump:', error);
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