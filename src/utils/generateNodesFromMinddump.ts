/**
 * Generate mind map nodes from minddump data
 */

import type { Node } from '@/types/Node';
import type { Minddump } from '@/services/minddumpService';

export async function generateMindMapFromMinddump(minddump: Minddump): Promise<Node[]> {
  try {
    const nodes: Node[] = [];
    
    // Process projects
    if (minddump.nodes.projects) {
      for (const project of minddump.nodes.projects) {
        const node: Node = {
          id: project.id,
          label: project.name,
          type: 'project',
          status: project.status || 'not_started',
          priority_score: project.priority_score || 0.5,
          progress_percent: project.progress_percent || 0,
          description: project.description || '',
          key_points: project.key_points || [],
          tasks: project.tasks || [],
          effort_estimate_hours: project.effort_estimate_hours || null,
          learning_objectives: project.learning_objectives || [],
          project_files: project.project_files || {},
          subproject_from: project.subproject_from || [],
          created_at: project.created_at,
          last_updated: project.last_updated,
          user_id: project.user_id,
          // Use stored coordinates if available, otherwise generate them
          x: project.coordinates?.x || Math.random() * 800 + 100,
          y: project.coordinates?.y || Math.random() * 600 + 100,
          size: project.size || { width: 150, height: 80 },
          color: project.color || '#4CAF50',
          subNodes: []
        };
        nodes.push(node);
      }
    }
    
    // Process problems
    if (minddump.nodes.problems) {
      for (const problem of minddump.nodes.problems) {
        const node: Node = {
          id: problem.id,
          label: problem.name,
          type: 'problem',
          severity: problem.severity || 5,
          status: problem.status || 'active',
          solution_state: problem.solution_state || 'planned',
          project_id: problem.project_id,
          emotion: problem.emotion || null,
          proposed_solution: problem.proposed_solution || null,
          recurrence_rate: problem.recurrence_rate || null,
          duration_hours: problem.duration_hours || null,
          root_cause: problem.root_cause || null,
          created_at: problem.created_at,
          updated_at: problem.updated_at,
          user_id: problem.user_id,
          // Use stored coordinates if available, otherwise generate them
          x: problem.coordinates?.x || Math.random() * 800 + 100,
          y: problem.coordinates?.y || Math.random() * 600 + 100,
          size: problem.size || { width: 120, height: 60 },
          color: problem.color || '#F44336',
          subNodes: []
        };
        nodes.push(node);
      }
    }
    
    return nodes;
  } catch (error) {
    console.error('Error generating nodes from minddump:', error);
    return [];
  }
}