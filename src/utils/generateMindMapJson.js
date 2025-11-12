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

function limitWords(text, maxWords) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

function toTitleCase(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/gi, match => match.toUpperCase());
}

function formatNameList(names) {
  const formatted = names
    .filter(Boolean)
    .map(name => toTitleCase(name.trim()))
    .filter(Boolean);

  if (formatted.length === 0) return '';
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]}`;
}

function generateMinddumpTitle(results, processed) {
  const projects = results?.projects || [];
  const problems = results?.problems || [];

  const rootProjects = projects.filter(
    project => !project.parent_project_id || project.parent_project_id === 'null'
  );
  const secondaryProjects = projects.filter(
    project => project.parent_project_id && project.parent_project_id !== 'null'
  );

  const problemCandidates = [...problems].sort((a, b) => (b.severity || 0) - (a.severity || 0));
  const topProblem = problemCandidates.find(problem => (problem.severity || 0) >= 6) || problemCandidates[0];

  const focusSource = rootProjects.length > 0 ? rootProjects : projects;
  const focusNames = focusSource.map(project => project.name).filter(Boolean).slice(0, 3);
  const formattedFocus = formatNameList(focusNames);

  const secondaryNames = secondaryProjects.map(project => project.name).filter(Boolean).slice(0, 2);
  const formattedSecondary = formatNameList(secondaryNames);

  const formattedProblem = toTitleCase(topProblem?.name);

  if (formattedFocus) {
    if (formattedProblem) {
      const baseTitle = focusNames.length > 1
        ? `Balancing ${formattedFocus}: Tackling ${formattedProblem}`
        : `${formattedFocus}: Tackling ${formattedProblem}`;
      return limitWords(baseTitle, 7);
    }

    if (formattedSecondary) {
      return limitWords(`Organizing ${formattedFocus} with ${formattedSecondary}`, 7);
    }

    const baseTitle = focusNames.length > 1
      ? `Balancing ${formattedFocus}`
      : `Clarifying ${formattedFocus}`;
    return limitWords(baseTitle, 7);
  }

  if (formattedProblem) {
    return limitWords(`Untangling ${formattedProblem}`, 7);
  }

  const emotion =
    results?.insights?.emotional_state ||
    results?.insights?.dominant_emotion ||
    processed?.projects?.[0]?.emotion ||
    null;

  if (emotion) {
    return limitWords(`Finding Clarity in ${toTitleCase(emotion)}`, 7);
  }

  return 'Clarifying Your Focus';
}

// Fixed positions for nodes in a mindmap layout
// 5 positions arranged in a balanced layout
const FIXED_POSITIONS = [
  { x: 50, y: 30 },  // Top center
  { x: 25, y: 50 },  // Left middle
  { x: 75, y: 50 },  // Right middle
  { x: 38, y: 70 },  // Bottom left (more centered)
  { x: 62, y: 70 }   // Bottom right (more centered)
];

// Track which positions have been used
let positionIndex = 0;

function getFixedPosition() {
  // Get the next position from the fixed positions array
  const position = FIXED_POSITIONS[positionIndex % FIXED_POSITIONS.length];
  positionIndex++;

  console.log(`✓ Using fixed position ${positionIndex}: (${position.x}%, ${position.y}%)`);
  return position;
}

// Reset position index when generating new mindmap
function resetPositions() {
  positionIndex = 0;
}

function createProjectNode(project, knowledgeNodes = [], problems = []) {
  const position = getFixedPosition();
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
  // Include both 'active' and 'identified' status as active problems
  const projectProblems = problems.filter(p =>
    p.project_id === project.id && (p.status === 'active' || p.status === 'identified')
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
    const { processSubmindmaps } = await import('./submindmapManager.js');

    // Process submindmaps - this will create submindmaps for subprojects
    const processed = await processSubmindmaps(
      results.projects || [],
      results.problems || [],
      null, // No parent minddump ID yet
      null
    );

    // Generate nodes from TOP-LEVEL projects only (for display)
    const nodes = [];
    resetPositions(); // Reset position index

    const topLevelProjects = Array.isArray(processed.projects) ? [...processed.projects] : [];
    let projectsForDisplay = topLevelProjects;

    if (topLevelProjects.length > 5) {
      console.log('[Minddump] Grouping projects to keep display ≤ 5');
      const keep = topLevelProjects.slice(0, 4);
      const overflow = topLevelProjects.slice(4);

      const overflowProjectId = `supporting-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const overflowProject = {
        id: overflowProjectId,
        name: 'Supporting Focus Areas',
        description: 'Grouped focus areas to keep the map focused.',
        status: 'in_progress',
        key_points: overflow.map(p => p.name).filter(Boolean).slice(0, 3),
        parent_project_id: null,
        grouped_projects: overflow.map(p => ({
          id: p.id,
          name: p.name
        })),
        subNodes: overflow.map(p => ({
          label: p.name,
          id: p.id
        }))
      };

      projectsForDisplay = [...keep, overflowProject];
    }

    // Create project nodes with fixed positions for top-level projects only
    if (projectsForDisplay) {
      projectsForDisplay.forEach(project => {
        const position = getFixedPosition(); // Uses fixed positions
        const color = getRandomColor();
        const nodeId = projectToId(project.name);

        const node = {
          id: nodeId,
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

    // Generate a meaningful title from the extracted structure
    let title = generateMinddumpTitle(results, processed);
    title = limitWords(title, 7);
    if (title.length > 70) {
      title = `${title.substring(0, 67)}...`;
    }

    // Create minddump data - IMPORTANT: Store ALL projects (including subprojects) in nodes.projects
    // The filtering happens when displaying, not when storing
    const minddumpData = {
      prompt: results.chat_response || 'Chat workflow result',
      title: title,
      nodes: {
        projects: results.projects || [], // Store ALL projects (including subprojects)
        problems: results.problems || []   // Store ALL problems
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
          problems: processed.problems?.length || 0
        },
        ai_model: 'gpt-4o-mini',
        version: '1.0',
        created_from: 'chat_workflow',
        workflow_insights: results.insights || null,
        submindmaps_created: processed.submindmaps?.length || 0
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
    console.log('Submindmaps created:', processed.submindmaps?.length || 0);
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

    console.log('Loaded:', minddump.title);

    // Generate nodes from stored data
    const nodes = [];
    const storedPositions = minddump.layout_data?.node_positions || [];

    // Reset position index for fixed positions
    resetPositions();

    // Get the parent_project_id of this minddump (null for main mindmaps, ID for submindmaps)
    const parentProjectId = minddump.parent_project_id;
    const isSubmindmap = parentProjectId !== null && parentProjectId !== undefined;

    // Create project nodes
    if (minddump.nodes.projects) {
      // Filter projects based on the minddump's parent_project_id:
      // - If NULL: show projects with parent_project_id = NULL (top-level projects)
      // - If some ID: show projects with parent_project_id = that ID (subprojects of that parent)
      const projectsToShow = minddump.nodes.projects.filter(project => {
        if (isSubmindmap) {
          // Submindmap: show projects that belong to this parent
          return project.parent_project_id === parentProjectId;
        } else {
          // Main mindmap: show only top-level projects (no parent)
          return !project.parent_project_id;
        }
      });

      console.log('📊 Objects:', {
        isSubmindmap: isSubmindmap,
        projects: projectsToShow.length,
        filtered: minddump.nodes.projects.length - projectsToShow.length,
        problems: minddump.nodes.problems?.length || 0
      });

      projectsToShow.forEach(project => {
        const nodeId = projectToId(project.name);
        const storedPos = storedPositions.find(p => p.id === nodeId);

        // Always use stored position if available, otherwise use fixed position
        let position;
        if (storedPos && storedPos.x !== undefined && storedPos.y !== undefined) {
          position = { x: storedPos.x, y: storedPos.y };
        } else {
          position = getFixedPosition();
        }

        // Check if there are related problems
        const relatedProblems = minddump.nodes.problems ?
          minddump.nodes.problems.filter(problem => {
            const isRelated = problem.project_id === project.id ||
              (problem.related_projects && problem.related_projects.includes(project.id));
            return isRelated;
          }) : [];

        // Check if this project has subprojects in the original data
        // This works for BOTH main mindmaps AND submindmaps (recursive)
        const subprojects = minddump.nodes.projects.filter(p => p.parent_project_id === project.id);

        if (subprojects.length > 0) {
          console.log(`🔵 Project "${project.name}" has ${subprojects.length} subprojects:`, subprojects.map(sp => sp.name));
        }

        const node = {
          id: nodeId,
          projectId: project.id,
          label: project.name.length > 12 ? project.name.replace(/\s+/g, '\n') : project.name,
          x: position.x,
          y: position.y,
          color: storedPos?.color || getRandomColor(),
          type: 'project',
          data: project,
          hasProblem: relatedProblems.length > 0,
          problemData: relatedProblems.length > 0 ? relatedProblems : undefined,
          thoughts: project.key_points || [],
          // Add subNodes if there are subprojects (works recursively)
          subNodes: subprojects.length > 0 ? subprojects.map(sp => ({
            label: sp.name,
            id: sp.id
          })) : undefined
        };

        if (node.subNodes) {
          console.log(`✅ Node "${node.label}" created with ${node.subNodes.length} subNodes`);
        }

        nodes.push(node);
      });
    }

    // Don't create separate problem nodes - problems are handled through the data structure
    // The AI merger can work with problems directly from the minddump.nodes.problems array

    let conversation = minddump.conversation || [];
    if (typeof conversation === 'string') {
      try {
        conversation = JSON.parse(conversation);
      } catch (error) {
        console.warn('[MindMapLoader] Failed to parse conversation JSON, returning empty array', error);
        conversation = [];
      }
    }

    // Ensure conversation items have at least role/content keys
    const normalizedConversation = Array.isArray(conversation)
      ? conversation
          .filter(entry => entry && typeof entry.role === 'string' && typeof entry.content === 'string')
          .map((entry, idx) => {
            const baseTime = entry.timestamp
              ? new Date(entry.timestamp).getTime()
              : new Date(minddump.updated_at || minddump.created_at || Date.now()).getTime();
            const syntheticTime = new Date(baseTime + idx).toISOString();

            return {
              role: entry.role,
              content: entry.content,
              timestamp: entry.timestamp || syntheticTime
            };
          })
      : [];

    return {
      nodes,
      parentNode: minddump.title,
      _timestamp: Date.now(),
      minddumpId: minddump.id,
      conversation: normalizedConversation
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
    const { showSubprojects = false, parentProjectId = null, onJWTError = null, forceRefresh = false } = options;

    // Get fresh data from database
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

    // Reset position index for fixed positions
    resetPositions();

    // Determine parent node name if filtering by parent project
    let parentNode = null;
    if (parentProjectId) {
      const parentProject = projects.find(p => p.id === parentProjectId);
      if (parentProject) {
        parentNode = parentProject.name;
      }
    }

    // Create nodes from filtered projects with 250px spacing
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

    // Don't automatically create minddumps - let explicit actions handle that
    console.log('Generated mind map with', nodes.length, 'nodes from database');

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