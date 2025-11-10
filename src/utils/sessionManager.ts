import { Node } from "@/components/CombinedView";

export interface SessionData {
  id: string;
  nodes: Node[];
  parentNodeId?: string;
  parentNodeTitle?: string;
  timestamp: number;
}

export class SessionManager {
  // Save session to cache
  static saveSession(nodes: Node[], parentNodeId?: string, parentNodeTitle?: string): SessionData {
    if (!nodes || nodes.length === 0) {
      console.log('Not saving empty session to cache');
      return null as any;
    }

    const newSession: SessionData = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes: [...nodes],
      parentNodeId,
      parentNodeTitle,
      timestamp: Date.now()
    };

    try {
      const stored = localStorage.getItem('mindmap_sessions');
      const existingSessions = stored ? JSON.parse(stored) : [];
      const updatedSessions = [...existingSessions, newSession];
      
      localStorage.setItem('mindmap_sessions', JSON.stringify(updatedSessions));
      localStorage.setItem('mindmap_current_index', (updatedSessions.length - 1).toString());
      
      return newSession;
    } catch (error) {
      console.error('Error saving session:', error);
      return newSession;
    }
  }

  // Navigate through session history
  static navigateHistory(direction: 'back' | 'forward', currentIndex: number, sessions: SessionData[]) {
    let newIndex = currentIndex;
    
    if (direction === 'back' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'forward' && currentIndex < sessions.length - 1) {
      newIndex = currentIndex + 1;
    }

    if (newIndex !== currentIndex) {
      localStorage.setItem('mindmap_current_index', newIndex.toString());
      return { newIndex, session: sessions[newIndex] };
    }

    return null;
  }

  // Generate non-overlapping positions for nodes
  static generateNodePositions(count: number): Array<{ x: number; y: number }> {
    const positions: { x: number; y: number }[] = [];
    const minDistance = 25;
    const maxAttempts = 100;
    const boundaries = { minX: 15, maxX: 70, minY: 15, maxY: 85 };

    for (let i = 0; i < count; i++) {
      let validPosition = false;
      let attempts = 0;
      let newPos = { x: 0, y: 0 };

      while (!validPosition && attempts < maxAttempts) {
        newPos = {
          x: Math.random() * (boundaries.maxX - boundaries.minX) + boundaries.minX,
          y: Math.random() * (boundaries.maxY - boundaries.minY) + boundaries.minY
        };

        validPosition = positions.every(pos => {
          const distance = Math.sqrt(
            Math.pow(newPos.x - pos.x, 2) + Math.pow(newPos.y - pos.y, 2)
          );
          return distance >= minDistance;
        });

        attempts++;
      }

      positions.push(newPos);
    }

    return positions;
  }
}