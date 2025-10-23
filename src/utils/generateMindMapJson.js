const API_BASE_URL = 'http://localhost:8000';

async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    return response.ok ? await response.json() : [];
  } catch (error) {
    return [];
  }
}

function projectToId(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 20);
}

function getColor(index) {
  return ['blue', 'violet', 'red', 'teal'][index % 4];
}

function projectToNode(project, knowledgeNodes, problems, index) {
  const thoughts = project.required_knowledge
    .map(rel => knowledgeNodes.find(kn => kn.id === rel.target_id)?.title)
    .filter(Boolean)
    .slice(0, 4);

  const projectProblems = problems.filter(p => 
    p.related_projects.some(rel => rel.target_id === project.id) && p.status === 'active'
  );

  return {
    id: projectToId(project.name),
    label: project.name.length > 12 ? project.name.replace(/\s+/g, '\n') : project.name,
    x: 40,
    y: 50,
    size: "large",
    color: getColor(index),
    thoughts,
    hasProblem: projectProblems.length > 0,
    problemData: projectProblems.length > 0 ? projectProblems : undefined
  };
}

export async function generateMindMapJson() {
  try {
    const [projects, knowledgeNodes, problems] = await Promise.all([
      fetchData('projects'),
      fetchData('knowledge_nodes'),
      fetchData('problems')
    ]);

    const recentProjects = projects
      .filter(p => p.last_updated)
      .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
      .slice(0, 3);
    
    const clearityNode = { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" };
    const mindMapStates = {};

    // Past maps (-3, -2, -1)
    for (let i = 0; i < 3; i++) {
      const mapKey = (-3 + i).toString();
      const nodes = [clearityNode];
      
      if (recentProjects[i]) {
        const projectNode = projectToNode(recentProjects[i], knowledgeNodes, problems, i);
        nodes.unshift(projectNode);
      }
      
      mindMapStates[mapKey] = nodes;
    }

    // Current map (empty)
    mindMapStates["0"] = [clearityNode];

    // Future maps
    const futureMaps = [
      [{ id: "productivity", label: "Productivity", x: 30, y: 50, size: "large", color: "blue", thoughts: ["efficiency", "output", "systems"] }, clearityNode],
      [{ id: "mastery", label: "Mastery", x: 35, y: 45, size: "large", color: "blue", thoughts: ["expertise", "skill", "practice"] }, clearityNode],
      [{ id: "fulfillment", label: "Fulfillment", x: 40, y: 50, size: "large", color: "blue", thoughts: ["purpose", "meaning", "joy"] }, clearityNode]
    ];

    futureMaps.forEach((nodes, index) => {
      mindMapStates[(index + 1).toString()] = nodes;
    });
    
    return mindMapStates;
  } catch (error) {
    return getFallbackJson();
  }
}

function getFallbackJson() {
  const clearity = { id: "clearity", label: "Clearity", x: 95, y: 15, size: "large", color: "teal" };
  return {
    "-3": [{ id: "stress", label: "Stress", x: 25, y: 45, size: "large", color: "red", thoughts: ["work", "deadlines", "pressure"] }, clearity],
    "-2": [{ id: "mindfulness", label: "Mindfulness", x: 30, y: 50, size: "large", color: "blue", thoughts: ["meditation", "present", "awareness"] }, clearity],
    "-1": [{ id: "thinking", label: "Thinking", x: 25, y: 45, size: "large", color: "blue", thoughts: ["logic", "reason", "analysis"] }, clearity],
    "0": [clearity],
    "1": [{ id: "productivity", label: "Productivity", x: 30, y: 50, size: "large", color: "blue", thoughts: ["efficiency", "output", "systems"] }, clearity],
    "2": [{ id: "mastery", label: "Mastery", x: 35, y: 45, size: "large", color: "blue", thoughts: ["expertise", "skill", "practice"] }, clearity],
    "3": [{ id: "fulfillment", label: "Fulfillment", x: 40, y: 50, size: "large", color: "blue", thoughts: ["purpose", "meaning", "joy"] }, clearity]
  };
}