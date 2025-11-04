import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSupabaseData(onJWTError = null) {
  try {
    // Get current user session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Check for JWT errors in session retrieval
    if (sessionError) {
      console.error('Session error:', sessionError);
      if (onJWTError && isJWTError(sessionError)) {
        onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    // Try to refresh session if it exists but might be expired
    if (session?.refresh_token) {
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token
        });

        if (refreshError) {
          console.warn('Session refresh failed:', refreshError);
          if (isJWTError(refreshError) && onJWTError) {
            onJWTError('Session expired. Please log in again.');
            throw refreshError;
          }
        } else if (refreshData?.session) {
          console.log('Session refreshed successfully');
          session = refreshData.session;
        }
      } catch (refreshErr) {
        console.warn('Session refresh attempt failed:', refreshErr);
        // Continue with existing session
      }
    }

    if (!session?.user) {
      console.log('No authenticated user, returning empty data');
      return { projects: [], knowledgeNodes: [], problems: [] };
    }

    console.log('Fetching data for user:', session.user.id);

    const [projectsResult, knowledgeNodesResult, problemsResult] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('knowledge_nodes').select('*').order('created_at', { ascending: false }),
      supabase.from('problems').select('*').eq('status', 'active').order('created_at', { ascending: false })
    ]);

    // Check for JWT errors in database queries
    const errors = [projectsResult.error, knowledgeNodesResult.error, problemsResult.error].filter(Boolean);

    for (const error of errors) {
      console.error('Database query error:', error);

      if (isJWTError(error)) {
        if (onJWTError) {
          onJWTError('Session expired. Please log in again.');
        }
        throw error; // Throw JWT errors to trigger logout
      }
    }

    // Log non-JWT errors but continue
    if (projectsResult.error && !isJWTError(projectsResult.error)) {
      console.error('Error fetching projects:', projectsResult.error);
    }
    if (knowledgeNodesResult.error && !isJWTError(knowledgeNodesResult.error)) {
      console.error('Error fetching knowledge nodes:', knowledgeNodesResult.error);
    }
    if (problemsResult.error && !isJWTError(problemsResult.error)) {
      console.error('Error fetching problems:', problemsResult.error);
    }

    return {
      projects: projectsResult.data || [],
      knowledgeNodes: knowledgeNodesResult.data || [],
      problems: problemsResult.data || []
    };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);

    // Re-throw JWT errors to be handled by caller
    if (isJWTError(error)) {
      throw error;
    }

    return { projects: [], knowledgeNodes: [], problems: [] };
  }
}

// Helper function to detect JWT errors
function isJWTError(error) {
  if (!error) return false;

  const errorMessage = typeof error === 'string' ? error :
    error.message || error.error_description || error.details || JSON.stringify(error);

  const jwtErrorPatterns = [
    'JWT expired',
    'jwt expired',
    'token expired',
    'invalid jwt',
    'Invalid JWT',
    'JWT malformed',
    'jwt malformed',
    'Authentication failed',
    'Unauthorized',
    'Invalid token',
    'Token has expired'
  ];

  return jwtErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

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

  while (attempts < maxAttempts) {
    const position = {
      x: Math.floor(Math.random() * 80) + 10, // 10-90 range (80% width)
      y: Math.floor(Math.random() * 80) + 10  // 10-90 range (80% height)
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

  // If we can't find a non-overlapping position, return a random one
  const fallbackPosition = {
    x: Math.floor(Math.random() * 80) + 10,
    y: Math.floor(Math.random() * 80) + 10
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

  // Debug logging
  console.log(`Project: ${project.name} (ID: ${project.id})`);
  console.log(`- Knowledge nodes: ${relatedKnowledge.length}`, relatedKnowledge);
  console.log(`- Problems: ${projectProblems.length}`, projectProblems);

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

  console.log('Created node:', node);
  return node;
}

function getDateKey(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export async function generateMindMapJson(options = {}) {
  try {
    console.log('=== DEBUGGING generateMindMapJson ===');
    const { showSubprojects = false, parentProjectId = null, onJWTError = null, showTodayOnly = true } = options;
    const { projects, knowledgeNodes, problems } = await fetchSupabaseData(onJWTError);

    console.log('Fetched data:', {
      projects: projects.length,
      knowledgeNodes: knowledgeNodes.length,
      problems: problems.length,
      showSubprojects,
      parentProjectId,
      showTodayOnly
    });

    // Filter for today's projects if showTodayOnly is true
    let filteredByDate = projects;
    if (showTodayOnly) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      filteredByDate = projects.filter(project => {
        const createdDate = project.created_at ? project.created_at.split('T')[0] : null;
        const updatedDate = project.last_updated ? project.last_updated.split('T')[0] : null;

        const isFromToday = createdDate === today || updatedDate === today;
        if (isFromToday) {
          console.log(`Project "${project.name}" is from today (created: ${createdDate}, updated: ${updatedDate})`);
        }
        return isFromToday;
      });

      console.log(`Filtered to ${filteredByDate.length} projects from today (out of ${projects.length} total)`);
    }

    // Clear used positions
    usedPositions.length = 0;

    let filteredProjects = [];
    let parentNode = null;

    if (parentProjectId) {
      // Show subprojects for a specific parent project
      const parentProject = filteredByDate.find(p => p.id === parentProjectId);
      if (parentProject) {
        parentNode = parentProject.name;
        // Filter to only subprojects of this parent
        filteredProjects = filteredByDate.filter(p =>
          p.subproject_from &&
          (p.subproject_from.includes(parentProject.name) || p.subproject_from.includes(parentProject.id))
        );
      }
    } else if (showSubprojects) {
      // Show all projects (both parents and subprojects) - used after minddump
      filteredProjects = filteredByDate;
    } else {
      // Default: Show only parent projects (no subproject_from or empty array)
      filteredProjects = filteredByDate.filter(p =>
        !p.subproject_from ||
        p.subproject_from.length === 0 ||
        (Array.isArray(p.subproject_from) && p.subproject_from.every(item => !item || item.trim() === ''))
      );
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
          const subprojects = filteredByDate.filter(p =>
            p.subproject_from &&
            (p.subproject_from.includes(project.name) || p.subproject_from.includes(project.id))
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

    console.log(`Created ${nodes.length} nodes`);
    console.log(`Parent node: ${parentNode}`);

    const result = {
      nodes,
      parentNode,
      _timestamp: Date.now()
    };

    console.log('Final result:', result);
    console.log('=== END DEBUGGING ===');

    return result;
  } catch (error) {
    console.error('Error generating mind map:', error);
    console.log('Falling back to getFallbackJson()');
    const fallback = getFallbackJson();
    console.log('Fallback data:', fallback);
    return fallback;
  }
}

function getFallbackJson() {
  return {
    nodes: [],
    parentNode: null, // Default to hidden
    _timestamp: Date.now()
  };
}