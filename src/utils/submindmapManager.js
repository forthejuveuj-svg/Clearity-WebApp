/**
 * Submindmap Manager
 * Handles creation and management of submindmaps for projects with subprojects
 */

import { createMinddump, updateMinddumpNodes } from './supabaseClient.js';

/**
 * Process projects and create submindmaps for parent projects with subprojects
 * @param {Array} projects - Array of project objects
 * @param {Array} problems - Array of problem objects
 * @param {string} parentMinddumpId - ID of the parent minddump
 * @param {Object} layoutData - Layout data from the parent minddump
 * @returns {Object} - Processed data with submindmaps created and subprojects filtered
 */
export async function processSubmindmaps(projects, problems, parentMinddumpId, layoutData = null) {
  try {
    console.log('[SubmindmapManager] Processing submindmaps for', projects.length, 'projects');

    // Group projects by parent_project_id
    const projectsByParent = {};
    const topLevelProjects = [];

    projects.forEach(project => {
      if (project.parent_project_id) {
        // This is a subproject
        if (!projectsByParent[project.parent_project_id]) {
          projectsByParent[project.parent_project_id] = [];
        }
        projectsByParent[project.parent_project_id].push(project);
      } else {
        // This is a top-level project
        topLevelProjects.push(project);
      }
    });

    console.log('[SubmindmapManager] Found', topLevelProjects.length, 'top-level projects');
    console.log('[SubmindmapManager] Found', Object.keys(projectsByParent).length, 'parent projects with subprojects');

    // Create submindmaps for each parent project that has subprojects
    const submindmapPromises = Object.entries(projectsByParent).map(async ([parentProjectId, subprojects]) => {
      const parentProject = topLevelProjects.find(p => p.id === parentProjectId);
      
      if (!parentProject) {
        console.warn('[SubmindmapManager] Parent project not found in top-level projects:', parentProjectId);
        return null;
      }

      console.log('[SubmindmapManager] Creating submindmap for', parentProject.name, 'with', subprojects.length, 'subprojects');

      // Filter problems related to these subprojects
      const relatedProblems = problems.filter(problem => 
        subprojects.some(sp => sp.id === problem.project_id)
      );

      // Generate layout positions for subprojects
      const nodePositions = generateSubprojectLayout(subprojects);

      // Create submindmap
      const submindmapData = {
        prompt: `Subprojects of ${parentProject.name}`,
        title: parentProject.name, // Use parent project name as title
        parent_project_id: parentProjectId,
        nodes: {
          projects: subprojects,
          problems: relatedProblems
        },
        layout_data: {
          viewport: { x: 0, y: 0, zoom: 1.0 },
          canvas_size: { width: 1200, height: 800 },
          node_positions: nodePositions
        },
        metadata: {
          entities_count: {
            projects: subprojects.length,
            problems: relatedProblems.length
          },
          parent_project_id: parentProjectId,
          parent_project_name: parentProject.name,
          is_submindmap: true,
          created_from: 'submindmap_processor',
          version: '1.0'
        },
        conversation: []
      };

      try {
        const submindmap = await createMinddump(submindmapData);
        console.log('[SubmindmapManager] ✅ Created submindmap:', submindmap.id, 'for', parentProject.name);
        return { submindmap, parentProjectId };
      } catch (error) {
        console.error('[SubmindmapManager] ❌ Error creating submindmap for', parentProject.name, ':', error);
        return null;
      }
    });

    // Wait for all submindmaps to be created
    const createdSubmindmaps = await Promise.all(submindmapPromises);
    const successfulSubmindmaps = createdSubmindmaps.filter(sm => sm !== null);

    console.log('[SubmindmapManager] Created', successfulSubmindmaps.length, 'submindmaps');

    // Add subNodes info to top-level projects that have subprojects
    const enrichedTopLevelProjects = topLevelProjects.map(project => {
      const subprojects = projectsByParent[project.id];
      if (subprojects && subprojects.length > 0) {
        const submindmapInfo = successfulSubmindmaps.find(sm => sm.parentProjectId === project.id);
        return {
          ...project,
          subNodes: subprojects.map(sp => ({
            label: sp.name,
            id: sp.id
          })),
          submindmapId: submindmapInfo?.submindmap?.id
        };
      }
      return project;
    });

    // Return only top-level projects (subprojects are now in submindmaps)
    return {
      projects: enrichedTopLevelProjects,
      problems: problems.filter(problem => 
        topLevelProjects.some(p => p.id === problem.project_id)
      ),
      submindmaps: successfulSubmindmaps.map(sm => sm.submindmap)
    };

  } catch (error) {
    console.error('[SubmindmapManager] Error processing submindmaps:', error);
    // Return original data on error
    return {
      projects,
      problems,
      submindmaps: []
    };
  }
}

/**
 * Generate layout positions for subprojects
 * @param {Array} subprojects - Array of subproject objects
 * @returns {Array} - Array of node positions
 */
function generateSubprojectLayout(subprojects) {
  const positions = [];
  const colors = ['blue', 'violet', 'red', 'teal', 'green', 'orange'];
  
  // Simple grid layout for subprojects
  const cols = Math.ceil(Math.sqrt(subprojects.length));
  const spacing = 60 / cols; // Distribute across 60% of canvas width
  
  subprojects.forEach((project, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    positions.push({
      id: projectToId(project.name),
      x: 20 + (col * spacing), // Start at 20% from left
      y: 20 + (row * 25), // Start at 20% from top, 25% spacing between rows
      color: colors[index % colors.length]
    });
  });
  
  return positions;
}

/**
 * Convert project name to ID
 * @param {string} name - Project name
 * @returns {string} - Project ID
 */
function projectToId(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 20);
}

/**
 * Update existing minddump and process submindmaps
 * @param {string} minddumpId - ID of the minddump to update
 * @param {Array} projects - Updated projects array
 * @param {Array} problems - Updated problems array
 * @param {Object} layoutData - Layout data
 */
export async function updateMinddumpWithSubmindmaps(minddumpId, projects, problems, layoutData = null) {
  try {
    console.log('[SubmindmapManager] Updating minddump with submindmap processing');

    // Process submindmaps
    const processed = await processSubmindmaps(projects, problems, minddumpId, layoutData);

    // Update the main minddump with only top-level projects
    await updateMinddumpNodes(minddumpId, {
      projects: processed.projects,
      problems: processed.problems
    });

    console.log('[SubmindmapManager] Updated minddump', minddumpId, 'with', processed.projects.length, 'top-level projects');
    console.log('[SubmindmapManager] Created', processed.submindmaps.length, 'submindmaps');

    return {
      success: true,
      topLevelProjects: processed.projects.length,
      submindmapsCreated: processed.submindmaps.length
    };

  } catch (error) {
    console.error('[SubmindmapManager] Error updating minddump with submindmaps:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
