/**
 * Utility to rearrange existing minddump nodes to fixed positions
 * This can be run from the browser console
 */

import { getMinddump } from './supabaseClient.js';
import { createClient } from '@supabase/supabase-js';

// Fixed positions for nodes in a mindmap layout
const FIXED_POSITIONS = [
  { x: 50, y: 30 },  // Top center
  { x: 25, y: 50 },  // Left middle
  { x: 75, y: 50 },  // Right middle
  { x: 35, y: 70 },  // Bottom left
  { x: 65, y: 70 }   // Bottom right
];

/**
 * Rearrange nodes in a minddump to use fixed positions
 * @param {string} minddumpId - The ID of the minddump to rearrange
 * @returns {Promise<object>} - The updated minddump
 */
export async function rearrangeMinddumpToFixedPositions(minddumpId) {
  try {
    console.log('🔄 Rearranging minddump:', minddumpId);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the minddump
    const minddump = await getMinddump(minddumpId);

    if (!minddump) {
      throw new Error('Minddump not found');
    }

    console.log('📋 Current minddump:', minddump.title);

    // Get the projects to display (filter based on parent_project_id)
    const parentProjectId = minddump.parent_project_id;
    const isSubmindmap = parentProjectId !== null && parentProjectId !== undefined;

    let projectsToRearrange = [];
    if (minddump.nodes?.projects) {
      projectsToRearrange = minddump.nodes.projects.filter(project => {
        if (isSubmindmap) {
          return project.parent_project_id === parentProjectId;
        } else {
          return !project.parent_project_id;
        }
      });
    }

    console.log('📊 Projects to rearrange:', projectsToRearrange.length);

    // Create new node positions using fixed positions
    const newNodePositions = [];
    projectsToRearrange.forEach((project, index) => {
      const position = FIXED_POSITIONS[index % FIXED_POSITIONS.length];
      const nodeId = project.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 20);
      
      newNodePositions.push({
        id: nodeId,
        x: position.x,
        y: position.y,
        color: minddump.layout_data?.node_positions?.find(p => p.id === nodeId)?.color || 'blue'
      });

      console.log(`  ✓ ${project.name} -> (${position.x}%, ${position.y}%)`);
    });

    // Update the layout_data with new positions
    const updatedLayoutData = {
      ...minddump.layout_data,
      node_positions: newNodePositions
    };

    // Update the minddump in the database
    const { data: updatedMinddump, error } = await supabase
      .from('minddumps')
      .update({
        layout_data: updatedLayoutData,
        updated_at: new Date().toISOString()
      })
      .eq('id', minddumpId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Minddump rearranged successfully!');
    console.log('🔄 Reload the page to see the changes');

    return updatedMinddump;

  } catch (error) {
    console.error('❌ Error rearranging minddump:', error);
    throw error;
  }
}

/**
 * Rearrange the currently loaded minddump
 * This is a convenience function that uses the current minddump ID from localStorage
 */
export async function rearrangeCurrentMinddump() {
  try {
    const currentMinddumpId = localStorage.getItem('clearity_current_minddump');
    
    if (!currentMinddumpId || currentMinddumpId === 'null') {
      console.error('❌ No minddump currently loaded');
      console.log('💡 Load a minddump first, then run this function');
      return null;
    }

    return await rearrangeMinddumpToFixedPositions(currentMinddumpId);
  } catch (error) {
    console.error('❌ Error rearranging current minddump:', error);
    throw error;
  }
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  window.rearrangeMinddumpToFixedPositions = rearrangeMinddumpToFixedPositions;
  window.rearrangeCurrentMinddump = rearrangeCurrentMinddump;
  console.log('✅ Rearrange functions loaded!');
  console.log('📝 Usage:');
  console.log('  - rearrangeCurrentMinddump() - Rearrange the currently loaded minddump');
  console.log('  - rearrangeMinddumpToFixedPositions("minddump-id") - Rearrange a specific minddump');
}
