import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSupabaseData() {
  try {
    const [projectsResult, knowledgeNodesResult, problemsResult] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('knowledge_nodes').select('*'),
      supabase.from('problems').select('*')
    ]);

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
    const projectDate = getDateKey(new Date(project.created_at || project.updated_at || project.last_updated));
    additionalThoughts = knowledgeNodes
      .filter(kn => {
        // Skip if already included by project_id
        if (kn.project_id === project.id) return false;

        const knowledgeDates = [
          kn.created_at && getDateKey(new Date(kn.created_at)),
          kn.updated_at && getDateKey(new Date(kn.updated_at)),
          kn.last_updated && getDateKey(new Date(kn.last_updated))
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
    size: "medium",
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

function organizeDataByDates(projects, knowledgeNodes, problems) {
  const today = new Date();
  const todayKey = getDateKey(today);

  // Get all unique dates from all data sources
  const allDates = new Set();

  [...projects, ...knowledgeNodes, ...problems].forEach(item => {
    if (item.created_at) allDates.add(getDateKey(new Date(item.created_at)));
    if (item.updated_at) allDates.add(getDateKey(new Date(item.updated_at)));
    if (item.last_updated) allDates.add(getDateKey(new Date(item.last_updated)));
  });

  // Sort dates and get the last 3 (excluding today if present)
  const sortedDates = Array.from(allDates)
    .filter(date => date !== todayKey)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 3);

  // If today exists in data, add it
  if (allDates.has(todayKey)) {
    sortedDates.unshift(todayKey);
  }

  return sortedDates;
}

function getItemsForDate(items, targetDate) {
  return items.filter(item => {
    const itemDates = [
      item.created_at && getDateKey(new Date(item.created_at)),
      item.updated_at && getDateKey(new Date(item.updated_at)),
      item.last_updated && getDateKey(new Date(item.last_updated))
    ].filter(Boolean);

    return itemDates.includes(targetDate);
  });
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

    const mindMapStates = {};
    const dates = organizeDataByDates(projects, knowledgeNodes, problems);
    const today = getDateKey(new Date());

    console.log('Organized dates:', dates);
    console.log('Today:', today);

    // Process dates and assign to time slots
    dates.forEach((date) => {
      let timeSlot;

      if (date === today) {
        timeSlot = "0"; // Today
      } else {
        // Assign to -1, -2, -3 based on how recent they are
        const dayIndex = dates.filter(d => d !== today).indexOf(date);
        timeSlot = (-1 - dayIndex).toString();
      }

      console.log(`Processing date ${date} -> timeSlot ${timeSlot}`);

      // Get data for this date
      const dateProjects = getItemsForDate(projects, date);
      console.log(`Projects for ${date}:`, dateProjects.length);

      // Clear used positions for this time slot
      usedPositions.length = 0;

      // Create nodes for this date - only project nodes
      const nodes = [];

      // Add project nodes (knowledge and problems are integrated into project nodes)
      dateProjects.forEach(project => {
        const node = createProjectNode(project, knowledgeNodes, problems);
        if (node) nodes.push(node);
      });

      console.log(`Created ${nodes.length} nodes for timeSlot ${timeSlot}`);
      mindMapStates[timeSlot] = nodes;
    });

    // Ensure we have all required time slots (empty arrays for slots with no data)
    ["-3", "-2", "-1", "0"].forEach(slot => {
      if (!mindMapStates[slot]) {
        console.log(`Creating empty array for slot ${slot}`);
        mindMapStates[slot] = [];
      }
    });

    // Future maps (without Clearity node)
    const futureMaps = [
      [{ id: "productivity", label: "Productivity", x: 30, y: 50, size: "medium", color: "blue", thoughts: ["efficiency", "output", "systems"] }],
      [{ id: "mastery", label: "Mastery", x: 35, y: 45, size: "medium", color: "blue", thoughts: ["expertise", "skill", "practice"] }],
      [{ id: "fulfillment", label: "Fulfillment", x: 40, y: 50, size: "medium", color: "blue", thoughts: ["purpose", "meaning", "joy"] }]
    ];

    futureMaps.forEach((nodes, index) => {
      const slot = (index + 1).toString();
      console.log(`Adding future map to slot ${slot}:`, nodes.length, 'nodes');
      // Clear positions for future maps (they have fixed positions anyway)
      usedPositions.length = 0;
      mindMapStates[slot] = nodes;
    });

    console.log('Final mindMapStates:', mindMapStates);
    console.log('=== END DEBUGGING ===');

    // Add timestamp to force cache refresh
    mindMapStates._timestamp = Date.now();
    return mindMapStates;
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
    "-3": [
      {
        id: "stress",
        label: "Stress",
        x: 25,
        y: 45,
        size: "medium",
        color: "red",
        thoughts: ["work", "deadlines", "pressure"],
        hasProblem: true,
        problemData: [
          { id: 1, title: "High workload", status: "active", description: "Too many tasks" },
          { id: 2, title: "Tight deadlines", status: "active", description: "Not enough time" }
        ]
      }
    ],
    "-2": [{ id: "mindfulness", label: "Mindfulness", x: 30, y: 50, size: "medium", color: "blue", thoughts: ["meditation", "present", "awareness"] }],
    "-1": [{ id: "thinking", label: "Thinking", x: 25, y: 45, size: "medium", color: "blue", thoughts: ["logic", "reason", "analysis"] }],
    "0": [],
    "1": [{ id: "productivity", label: "Productivity", x: 30, y: 50, size: "medium", color: "blue", thoughts: ["efficiency", "output", "systems"] }],
    "2": [{ id: "mastery", label: "Mastery", x: 35, y: 45, size: "medium", color: "blue", thoughts: ["expertise", "skill", "practice"] }],
    "3": [{ id: "fulfillment", label: "Fulfillment", x: 40, y: 50, size: "medium", color: "blue", thoughts: ["purpose", "meaning", "joy"] }]
  };
}