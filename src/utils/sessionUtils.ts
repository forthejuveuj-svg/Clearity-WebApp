import { Node } from "@/components/CombinedView";

// Helper function to check if a timestamp is from today
export const isFromToday = (timestamp: number): boolean => {
  const today = new Date();
  const sessionDate = new Date(timestamp);

  return today.getFullYear() === sessionDate.getFullYear() &&
    today.getMonth() === sessionDate.getMonth() &&
    today.getDate() === sessionDate.getDate();
};

// Function to completely clear all sessions and cache
export const clearAllSessionsAndCache = () => {
  const keysToRemove = ['mindmap_sessions', 'mindmap_current_index'];
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });
  console.log('Mindmap cache cleared');
};

// Get cached sessions from today only
export const getCachedSessionsFromToday = () => {
  try {
    const stored = localStorage.getItem('mindmap_sessions');
    if (!stored) return [];

    const sessions = JSON.parse(stored);
    const todaySessions = sessions.filter((session: any) =>
      session.timestamp && isFromToday(session.timestamp)
    );

    // If we found expired sessions, clean them up
    if (todaySessions.length !== sessions.length) {
      if (todaySessions.length === 0) {
        clearAllSessionsAndCache();
      } else {
        localStorage.setItem('mindmap_sessions', JSON.stringify(todaySessions));
        localStorage.setItem('mindmap_current_index', '0');
      }
    }

    return todaySessions;
  } catch (error) {
    console.warn('Error reading cached sessions:', error);
    clearAllSessionsAndCache();
    return [];
  }
};

// Cross-validate cached nodes against database nodes
export const validateCachedNodesAgainstDatabase = (cachedSessions: any[], dbNodes: Node[]) => {
  if (cachedSessions.length === 0 || dbNodes.length === 0) {
    return [];
  }

  const latestSession = cachedSessions[cachedSessions.length - 1];
  const cachedNodes = latestSession.nodes || [];

  // Create a map of database nodes by both id and projectId for efficient lookup
  const dbNodeMap = new Map();
  dbNodes.forEach(dbNode => {
    if (dbNode.id) dbNodeMap.set(dbNode.id, dbNode);
    if (dbNode.projectId) dbNodeMap.set(dbNode.projectId, dbNode);
  });

  // Filter cached nodes to only include those that exist in database
  const validatedNodes = cachedNodes.filter((cachedNode: Node) => {
    const existsById = cachedNode.id && dbNodeMap.has(cachedNode.id);
    const existsByProjectId = cachedNode.projectId && dbNodeMap.has(cachedNode.projectId);
    return existsById || existsByProjectId;
  });

  console.log(`Validated ${validatedNodes.length}/${cachedNodes.length} cached nodes against database`);
  return validatedNodes;
};