import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSupabaseData() {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
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

    // Check for errors
    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error);
    }
    if (knowledgeNodesResult.error) {
      console.error('Error fetching knowledge nodes:', knowledgeNodesResult.error);
    }
    if (problemsResult.error) {
      console.error('Error fetching problems:', problemsResult.error);
    }

    return {
      projects: projectsResult.data || [],
      knowledgeNodes: knowledgeNodesResult.data || [],
      problems: problemsResult.data || []
    };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return { projects: [], knowledgeNodes: [], problems: [] };
  }
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

export async function generateMindMapJson() {
  try {
    console.log('=== DEBUGGING generateMindMapJson ===');
    const { projects, knowledgeNodes, problems } = await fetchSupabaseData();

    console.log('Fetched data:', {
      projects: projects.length,
      knowledgeNodes: knowledgeNodes.length,
      problems: problems.length
    });

    // Clear used positions
    usedPositions.length = 0;

    // Create nodes from current projects
    const nodes = [];
    projects.forEach(project => {
      const node = createProjectNode(project, knowledgeNodes, problems);
      if (node) nodes.push(node);
    });

    // Determine parent node title - defaults to hidden (null)
    // This will be set by backend data when a parent node should be shown
    let parentNode = null;

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
    nodes: [
      {
        id: "sample-project",
        label: "Sample\nProject",
        x: 30,
        y: 50,
        color: "blue",
        thoughts: ["planning", "development", "testing"],
        hasProblem: false
      }
    ],
    parentNode: null, // Default to hidden
    _timestamp: Date.now()
  };
}