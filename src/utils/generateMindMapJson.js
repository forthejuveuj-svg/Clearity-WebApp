import { getAllDataFromCache, initializeData, filterElements, isJWTError, refreshAllData, createMinddump } from './supabaseClient.js';

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

// New function to create minddump from chat workflow results
export async function createMinddumpFromData(results, userId) {
  try {
    console.log('Creating minddump from chat results:', results);
    
    // Use the existing createMinddump function from supabaseClient
    const { createMinddump } = await import('./supabaseClient.js');
    
    // Generate nodes from projects and problems
    const nodes = [];
    usedPositions.length = 0; // Clear positions
    
    // Create project nodes
    if (results.projects) {
      results.projects.forEach(project => {
        const position = getRandomPosition();
        const color = getRandomColor();
        
        const node = {
          id: projectToId(project.name),
          projectId: project.id,
          label: project.name.length > 12 ? project.name.replace(/\s+/g, '\n') : project.name,
          x: position.x,
          y: position.y,
          color,
          data: project
        };
        nodes.push(node);
      });
    }
    
    // Don't create separate problem nodes - let problems be handled through the problems array in the data structure
    // The AI can work with the problems directly from results.problems
    
    // Generate title from first project or problem, or use chat response
    let title = 'Chat Workflow Result';
    const firstEntity = results.projects?.[0] || results.problems?.[0];
    if (firstEntity) {
      const entityName = firstEntity.name || firstEntity.title || 'Untitled';
      title = entityName.length > 50 ? entityName.substring(0, 50) + '...' : entityName;
    }
    
    // Create minddump data using the expected format
    const minddumpData = {
      prompt: results.chat_response || 'Chat workflow result',
      title: title,
      nodes: {
        projects: results.projects || [],
        problems: results.problems || []
      },
      layout_data: {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        canvas_size: { width: 1200, height: 800 },
        node_positions: nodes.map(n => ({
          id: n.id,
          x: n.x,
          y: n.y,
          color: n.color
        }))
      },
      metadata: {
        entities_count: {
          projects: nodes.length, // Use actual nodes displayed in layout
          problems: results.problems?.length || 0
        },
        ai_model: 'gpt-4o-mini',
        version: '1.0',
        created_from: 'chat_workflow',
        workflow_insights: results.insights || null
      },
      conversation: results.conversation_history || []
    };
    
    // Use the existing createMinddump function which handles user_id automatically
    const savedMinddump = await createMinddump(minddumpData, { 
      onJWTError: (message) => {
        console.warn('JWT error while creating minddump:', message);
      }
    });
    
    if (!savedMinddump) {
      throw new Error('Failed to save minddump');
    }
    
    // Track this as the current minddump
    const { setCurrentMinddump } = await import('./supabaseClient.js');
    setCurrentMinddump(savedMinddump.id);
    
    console.log('Minddump created successfully:', savedMinddump.id);
    return savedMinddump;
    
  } catch (error) {
    console.error('Error creating minddump:', error);
    throw error;
  }
}

// Function to load minddump and generate nodes
export async function generateMindMapFromMinddump(minddumpId) {
  try {
    console.log('Loading minddump:', minddumpId);
    
    // Import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get minddump from database using supabaseClient function
    const minddump = await import('./supabaseClient.js').then(module => 
      module.getMinddump(minddumpId)
    );
    
    if (!minddump) {
      throw new Error('Minddump not found');
    }
    
    // Track this as the current minddump
    const { setCurrentMinddump } = await import('./supabaseClient.js');
    setCurrentMinddump(minddumpId);
    
    console.log('Minddump loaded:', minddump.title, 'with', minddump.nodes);
    
    // Generate nodes from stored data
    const nodes = [];
    const storedPositions = minddump.layout_data?.node_positions || [];
    
    // Create project nodes
    if (minddump.nodes.projects) {
      minddump.nodes.projects.forEach(project => {
        const storedPos = storedPositions.find(p => p.id === projectToId(project.name));
        const position = storedPos || getRandomPosition();
        
        // Check if there are related problems
        const relatedProblems = minddump.nodes.problems ? 
          minddump.nodes.problems.filter(problem => 
            problem.project_id === project.id || 
            (problem.related_projects && problem.related_projects.includes(project.id))
          ) : [];
        
        const node = {
          id: projectToId(project.name),
          projectId: project.id,
          label: project.name.length > 12 ? project.name.replace(/\s+/g, '\n') : project.name,
          x: position.x,
          y: position.y,
          color: storedPos?.color || getRandomColor(),
          type: 'project',
          data: project,
          hasProblem: relatedProblems.length > 0,
          problemData: relatedProblems.length > 0 ? relatedProblems : undefined,
          thoughts: project.key_points || []
        };
        nodes.push(node);
      });
    }
    
    // Don't create separate problem nodes - problems are handled through the data structure
    // The AI merger can work with problems directly from the minddump.nodes.problems array
    
    return {
      nodes,
      parentNode: minddump.title,
      _timestamp: Date.now(),
      minddumpId: minddump.id
    };
    
  } catch (error) {
    console.error('Error loading minddump:', error);
    return getFallbackJson();
  }
}

// New function to get latest minddump
export async function getLatestMinddump(userId) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .table('minddumps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return await generateMindMapFromMinddump(data.id, userId);
    
  } catch (error) {
    console.error('Error getting latest minddump:', error);
    return null;
  }
}

export async function generateMindMapJson(options = {}) {
  try {
    const { showSubprojects = false, parentProjectId = null, onJWTError = null, forceRefresh = false, skipMinddumpLoad = false } = options;
    
    // Check if we should skip loading from existing minddumps and use fresh data
    if (skipMinddumpLoad) {
      // Import the clear function and clear current minddump tracking
      const { clearCurrentMinddump } = await import('./supabaseClient.js');
      clearCurrentMinddump();
    }
    
    // Fallback to original database query
    const { projects, knowledgeNodes, problems } = await fetchSupabaseData(onJWTError, forceRefresh);

    // Apply filtering based on options
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
    } else {
      // Show all projects (no date filtering)
      filteredProjects = projects;
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



    // Project Unifier removed - no longer needed

    const result = {
      nodes,
      parentNode,
      _timestamp: Date.now()
    };

    // Save minddump to Supabase if we have nodes
    if (nodes.length > 0) {
      try {
        console.log('💾 Saving minddump to Supabase with', nodes.length, 'nodes...');
        
        // Generate title based on context
        let title = 'Mind Map';
        if (parentNode) {
          title = `${parentNode} - Subprojects`;
        } else {
          title = `Projects Overview - ${new Date().toLocaleDateString()}`;
        }

        // Generate prompt based on context
        let prompt = 'Generated mind map from projects and problems';
        if (parentProjectId) {
          prompt = `Subprojects view for project: ${parentNode}`;
        } else {
          prompt = 'Overview of all active projects and problems';
        }

        // Prepare nodes data for storage
        const nodesData = {
          projects: filteredProjects.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            created_at: p.created_at,
            user_id: p.user_id
          })),
          problems: problems.filter(prob => 
            filteredProjects.some(proj => 
              prob.related_projects && prob.related_projects.includes(proj.id)
            )
          ).map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            created_at: p.created_at,
            user_id: p.user_id
          }))
        };

        // Metadata - use actual node count from layout, not total entity count
        const metadata = {
          entities_count: {
            projects: nodes.length, // Use actual nodes displayed in layout
            problems: problems.filter(prob => 
              filteredProjects.some(proj => 
                prob.related_projects && prob.related_projects.includes(proj.id)
              )
            ).length
          },
          processing_time_ms: Date.now() - result._timestamp,
          version: '1.0',
          view_type: parentProjectId ? 'subprojects' : 'overview',
          parent_project_id: parentProjectId,
          tags: [parentProjectId ? 'subprojects' : 'overview']
        };

        const minddumpData = {
          prompt,
          title,
          nodes: nodesData,
          layout_data: {}, // empty for now
          metadata
        };

        const savedMinddump = await createMinddump(minddumpData, { onJWTError });

        if (savedMinddump) {
          console.log('✅ Minddump saved successfully:', savedMinddump.id);
          result.minddumpId = savedMinddump.id;
          
          // Track this as the current minddump
          const { setCurrentMinddump } = await import('./supabaseClient.js');
          setCurrentMinddump(savedMinddump.id);
          
          // Cache is automatically updated by createMinddump function
        } else {
          console.warn('⚠️ Failed to save minddump');
        }
      } catch (error) {
        console.error('❌ Error saving minddump:', error);
        // Don't throw - continue with the result even if saving fails
      }
    } else {
      console.log('🚫 No nodes to save - skipping minddump creation');
    }

    return result;
  } catch (error) {
    console.error('Error generating mind map:', error);
    return getFallbackJson();
  }
}



function getFallbackJson() {
  return {
    nodes: [],
    parentNode: null, // Default to hidden
    _timestamp: Date.now()
  };
}