import { getAllDataFromCache, initializeData, filterElements, isJWTError, refreshAllData } from './supabaseClient.js';

async function fetchSupabaseData(onJWTError = null, forceRefresh = false) {
  try {
    let data;

    if (forceRefresh) {
      // Force refresh from database
      data = await refreshAllData({ onJWTError });
    } else {
      // Use cache first - only initialize if cache is empty
      data = getAllDataFromCache();

      // If cache is empty (no lastUpdated), then initialize
      if (!data.lastUpdated) {
        data = await initializeData({ onJWTError });
      }
    }

    console.log('🔄 Data retrieved:', {
      projects: data.projects?.length || 0,
      knowledgeNodes: data.knowledgeNodes?.length || 0,
      problems: data.problems?.length || 0,
      source: forceRefresh ? 'database' : (data.lastUpdated ? 'cache' : 'initialized'),
      lastUpdated: data.lastUpdated
    });

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);

    // Re-throw JWT errors to be handled by caller
    if (isJWTError(error)) {
      if (onJWTError) {
        onJWTError('Session expired. Please log in again.');
      }
      throw error;
    }

    // For non-JWT errors, return empty data to allow graceful degradation
    console.warn('Returning empty data due to non-JWT error');
    return {
      projects: [],
      knowledgeNodes: [],
      problems: []
    };
  }
}



// Canvas-level filtering function using unified filterElements


function projectToId(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 20);
}

function getRandomColor() {
  const colors = ['blue', 'violet', 'red', 'teal', 'green', 'orange', 'purple', 'pink'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Track used positions to avoid overlap
const usedPositions = [];

function getRandomPosition() {
  const minDistance = 15; // Minimum distance between nodes (in percentage)
  let attempts = 0;
  const maxAttempts = 50;

  // Bounding box constraints: 20% left/right margins, 15% top/bottom margins
  const leftMargin = 20;   // 20% from left
  const rightMargin = 20;  // 20% from right  
  const topMargin = 20;    // 15% from top
  const bottomMargin = 15; // 15% from bottom

  const availableWidth = 100 - leftMargin - rightMargin;   // 60% available width
  const availableHeight = 100 - topMargin - bottomMargin; // 70% available height

  while (attempts < maxAttempts) {
    const position = {
      x: Math.floor(Math.random() * availableWidth) + leftMargin,     // 20-80% range
      y: Math.floor(Math.random() * availableHeight) + topMargin      // 15-85% range
    };

    // Check if this position is far enough from existing positions
    const isTooClose = usedPositions.some(used => {
      const distance = Math.sqrt(
        Math.pow(position.x - used.x, 2) + Math.pow(position.y - used.y, 2)
      );
      return distance < minDistance;
    });

    if (!isTooClose) {
      usedPositions.push(position);
      return position;
    }

    attempts++;
  }

  // If we can't find a non-overlapping position, return a random one within bounds
  const fallbackPosition = {
    x: Math.floor(Math.random() * availableWidth) + leftMargin,
    y: Math.floor(Math.random() * availableHeight) + topMargin
  };
  usedPositions.push(fallbackPosition);
  return fallbackPosition;
}

function createProjectNode(project, knowledgeNodes = [], problems = []) {
  const position = getRandomPosition();
  const color = getRandomColor();

  // Get knowledge nodes related to this project by project_id
  const relatedKnowledge = knowledgeNodes
    .filter(kn => kn.project_id === project.id)
    .map(kn => kn.title)
    .slice(0, 4); // Limit to 4 knowledge items

  // Get knowledge nodes created on the same date for additional thoughts (if not enough from project_id)
  let additionalThoughts = [];
  if (relatedKnowledge.length < 4) {
    const projectDate = getDateKey(new Date(project.created_at || project.last_updated));
    additionalThoughts = knowledgeNodes
      .filter(kn => {
        // Skip if already included by project_id
        if (kn.project_id === project.id) return false;

        const knowledgeDates = [
          kn.created_at && getDateKey(new Date(kn.created_at)),
          kn.updated_at && getDateKey(new Date(kn.updated_at))
        ].filter(Boolean);
        return knowledgeDates.includes(projectDate);
      })
      .map(kn => kn.title)
      .slice(0, 4 - relatedKnowledge.length); // Fill remaining slots
  }

  // Combine all thoughts
  const allThoughts = [...relatedKnowledge, ...additionalThoughts]
    .filter((thought, index, arr) => arr.indexOf(thought) === index) // Remove duplicates
    .slice(0, 4); // Limit to 4 total thoughts

  // Get problems related to this project by project_id
  const projectProblems = problems.filter(p =>
    p.project_id === project.id && p.status === 'active'
  );



  const node = {
    id: projectToId(project.name),
    projectId: project.id, // Store the actual database ID
    label: project.name.length > 12 ? project.name.replace(/\s+/g, '\n') : project.name,
    x: position.x,
    y: position.y,
    color,
    thoughts: allThoughts,
    hasProblem: projectProblems.length > 0,
    problemData: projectProblems.length > 0 ? projectProblems : undefined
  };


  return node;
}

function getDateKey(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export async function generateMindMapJson(options = {}) {
  try {
    const { showSubprojects = false, parentProjectId = null, onJWTError = null, showTodayOnly = true, forceRefresh = false } = options;
    const { projects, knowledgeNodes, problems } = await fetchSupabaseData(onJWTError, forceRefresh);

    // Apply filtering based on options using unified filterElements
    let filteredProjects;

    if (parentProjectId) {
      // Find subprojects of the parent project
      const parentProject = projects.find(p => p.id === parentProjectId);
      if (parentProject) {
        filteredProjects = projects.filter(p =>
          p.subproject_from &&
          p.subproject_from.includes(parentProject.id)
        );
      } else {
        filteredProjects = [];
      }
    } else if (showTodayOnly) {
      // Filter by today's date - only check created_at
      const today = new Date().toISOString().split('T')[0];

      filteredProjects = projects.filter(project => {
        const createdDate = project.created_at ? new Date(project.created_at).toISOString().split('T')[0] : null;
        return createdDate === today;
      });
    } else {
      // Default: show parent projects only (empty subproject_from)
      filteredProjects = filterElements(projects, 'subproject_from', 'empty');
    }

    // Clear used positions
    usedPositions.length = 0;

    // Determine parent node name if filtering by parent project
    let parentNode = null;
    if (parentProjectId) {
      const parentProject = projects.find(p => p.id === parentProjectId);
      if (parentProject) {
        parentNode = parentProject.name;
      }
    }

    // Create nodes from filtered projects
    const nodes = [];
    filteredProjects.forEach(project => {
      const node = createProjectNode(project, knowledgeNodes, problems);
      if (node) {
        // Add metadata to indicate if this is a subproject
        node.isSubproject = project.subproject_from && project.subproject_from.length > 0;
        node.parentProjectNames = project.subproject_from || [];

        // Find and attach subprojects if in default view
        if (!showSubprojects && !parentProjectId) {
          const subprojects = projects.filter(p =>
            p.subproject_from &&
            p.subproject_from.includes(project.id)
          );
          if (subprojects.length > 0) {
            node.subNodes = subprojects.map(sp => ({
              label: sp.name,
              id: sp.id
            }));
          }
        }

        nodes.push(node);
      }
    });



    // Check if we need to trigger project unifier (8+ nodes and not in subproject view)
    if (nodes.length >= 8 && !parentProjectId && !showSubprojects) {
      console.log(`🔄 Detected ${nodes.length} projects - triggering Project Unifier`);

      // Get user ID from localStorage or other source
      const userId = localStorage.getItem('user_id') || 'default_user';

      // Call project unifier in background
      callProjectUnifier(filteredProjects, userId).then(async (unifierResult) => {
        if (unifierResult && unifierResult.success) {
          console.log('✅ Project Unifier completed, refreshing cache...');

          // Refresh cache to get updated project structure
          try {
            await refreshAllData({ onJWTError });
            console.log('✅ Cache refreshed after project unification');

            // Optionally trigger a UI refresh here
            // You could dispatch a custom event that the UI listens to
            window.dispatchEvent(new CustomEvent('projectsReorganized', {
              detail: {
                message: 'Projects have been reorganized. Refresh to see changes.',
                parentProjects: unifierResult.parent_projects || []
              }
            }));

          } catch (refreshError) {
            console.error('❌ Error refreshing cache after unification:', refreshError);
          }
        }
      }).catch(error => {
        console.error('❌ Project Unifier error:', error);
      });
    }

    const result = {
      nodes,
      parentNode,
      _timestamp: Date.now(),
      unifierTriggered: nodes.length >= 8 && !parentProjectId && !showSubprojects
    };

    return result;
  } catch (error) {
    console.error('Error generating mind map:', error);
    return getFallbackJson();
  }
}

async function callProjectUnifier(projects, userId) {
  try {
    console.log(`🔄 Triggering Project Unifier for ${projects.length} projects`);

    const response = await fetch('http://clearity.space/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'project_unifier',
        params: {
          projects_data: projects,
          user_id: userId
          // No session_id = direct analysis mode
        }
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Project Unifier completed successfully');
      console.log('Reorganization plan:', result.reorganization_plan);

      // If there are parent projects suggested, log them
      if (result.parent_projects && result.parent_projects.length > 0) {
        console.log(`📊 Suggested ${result.parent_projects.length} parent projects:`, result.parent_projects);
      }

      return result;
    } else {
      console.warn('⚠️ Project Unifier failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error calling Project Unifier:', error);
    return null;
  }
}

function getFallbackJson() {
  return {
    nodes: [],
    parentNode: null, // Default to hidden
    _timestamp: Date.now()
  };
}