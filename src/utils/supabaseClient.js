import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Global data store - all data is cached here
let globalDataStore = {
  projects: [],
  knowledgeNodes: [],
  problems: [],
  lastUpdated: null,
  isLoading: false
};

// Subscribers for data updates
let dataSubscribers = [];

// Subscribe to data changes
export function subscribeToDataUpdates(callback) {
  dataSubscribers.push(callback);
  return () => {
    dataSubscribers = dataSubscribers.filter(cb => cb !== callback);
  };
}

// Notify all subscribers of data changes
function notifyDataSubscribers() {
  dataSubscribers.forEach(callback => {
    try {
      callback(globalDataStore);
    } catch (error) {
      console.error('Error in data subscriber:', error);
    }
  });
}

// Helper function to detect JWT errors
export function isJWTError(error) {
  if (!error) return false;

  const errorMessage = typeof error === 'string' ? error :
    error.message || error.error_description || error.details || JSON.stringify(error);

  const jwtErrorPatterns = [
    'JWT expired', 'jwt expired', 'token expired', 'invalid jwt', 'Invalid JWT',
    'JWT malformed', 'jwt malformed', 'Authentication failed', 'Unauthorized',
    'Invalid token', 'Token has expired'
  ];

  return jwtErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Internal function to fetch fresh data from Supabase
async function fetchFreshDataFromSupabase(options = {}) {
  const { selectFields = '*', onJWTError = null } = options;

  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      if (isJWTError(sessionError)) {
        if (onJWTError) {
          onJWTError('Session expired. Please log in again.');
        }
        throw sessionError;
      }
    }

    if (!session?.user) {
      return { projects: [], knowledgeNodes: [], problems: [] };
    }

    // Fetch only projects and problems
    const [projectsResult, problemsResult] = await Promise.all([
      supabase.from('projects').select(selectFields).order('created_at', { ascending: false }),
      supabase.from('problems').select('*').eq('status', 'active').order('created_at', { ascending: false })
    ]);

    // Check for errors
    const errors = [projectsResult.error, problemsResult.error].filter(Boolean);

    for (const error of errors) {
      console.error('Database query error:', error);
      if (isJWTError(error)) {
        if (onJWTError) {
          onJWTError('Session expired. Please log in again.');
        }
        throw error;
      }
    }

    const freshData = {
      projects: projectsResult.data || [],
      knowledgeNodes: [], // Removed knowledge nodes
      problems: problemsResult.data || []
    };

    console.log('📊 Fresh data loaded:', {
      projects: freshData.projects.length,
      knowledgeNodes: freshData.knowledgeNodes.length,
      problems: freshData.problems.length,
      user: session.user.id
    });

    return freshData;

  } catch (error) {
    console.error('Error in fetchFreshDataFromSupabase:', error);
    throw error;
  }
}

// Get all data from cache (fast)
export function getAllDataFromCache() {
  return {
    projects: [...globalDataStore.projects],
    knowledgeNodes: [...globalDataStore.knowledgeNodes],
    problems: [...globalDataStore.problems],
    lastUpdated: globalDataStore.lastUpdated,
    isLoading: globalDataStore.isLoading
  };
}

// Refresh all data from Supabase and update cache
export async function refreshAllData(options = {}) {
  const { onJWTError = null } = options;

  try {
    globalDataStore.isLoading = true;
    notifyDataSubscribers();

    const freshData = await fetchFreshDataFromSupabase({ onJWTError });

    // Update global store
    globalDataStore.projects = freshData.projects;
    globalDataStore.knowledgeNodes = freshData.knowledgeNodes;
    globalDataStore.problems = freshData.problems;
    globalDataStore.lastUpdated = new Date();
    globalDataStore.isLoading = false;

    // Notify all subscribers
    notifyDataSubscribers();

    return getAllDataFromCache();

  } catch (error) {
    globalDataStore.isLoading = false;
    notifyDataSubscribers();
    throw error;
  }
}

// Initialize data on first load
export async function initializeData(options = {}) {
  if (globalDataStore.lastUpdated === null) {
    return await refreshAllData(options);
  }
  return getAllDataFromCache();
}

// Legacy function for backward compatibility - now uses cache
export async function fetchAllDataFromSupabase(options = {}) {
  // If data is not loaded yet, load it
  if (globalDataStore.lastUpdated === null) {
    return await refreshAllData(options);
  }
  // Return cached data
  return getAllDataFromCache();
}

/**
 * Universal filtering function for JSON data arrays
 * 
 * IMPORTANT: This is a one-function-fits-all solution for filtering JSON arrays.
 * If you need new filtering capabilities, UPDATE this function instead of creating new ones.
 * This keeps the codebase clean and maintainable.
 * 
 * @param {Array} data - Array of JSON objects to filter
 * @param {string} key - The JSON key to check (e.g., 'status', 'subproject_from', 'created_at')
 * @param {any} criteria - The value to match against. Can be:
 *   - A string/number for exact match
 *   - 'today' for date fields (checks created_at and last_updated)
 *   - 'empty' to find items where the key is empty/null/undefined/empty array
 *   - An array to check if criteria is included in the key's array value
 * 
 * Examples:
 *   filterElements(projects, 'status', 'active') - finds projects with status='active'
 *   filterElements(projects, 'subproject_from', 'empty') - finds projects with empty subproject_from
 *   filterElements(projects, 'created_at', 'today') - finds projects created today
 *   filterElements(projects, 'subproject_from', 'parent-id') - finds projects that include 'parent-id' in subproject_from array
 */
export function filterElements(data, key, criteria) {
  if (!data || !Array.isArray(data) || !key) {
    return [];
  }

  if (!criteria) {
    return data;
  }

  const filteredResults = data.filter(item => {
    const fieldValue = item[key];

    // Handle 'empty' criteria - check if field is empty/null/undefined/empty array
    if (criteria === 'empty') {
      return !fieldValue ||
        fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (Array.isArray(fieldValue) && fieldValue.every(val => !val || val.trim() === ''));
    }



    // Handle array fields - check if criteria is included in the array
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(criteria);
    }


    // Log filtering results for debugging
    console.log('🔍 Filter applied:', {
      key: key,
      criteria: criteria,
      output: fieldValue
    });

    // Handle exact match for simple values
    return fieldValue === criteria;
  });


  return filteredResults;
}

// Data manipulation functions that update both cache and database

// Create a new project
export async function createProject(projectData, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert([{ ...projectData, user_id: session.user.id }])
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    globalDataStore.projects.unshift(project);
    notifyDataSubscribers();

    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

// Update a project
export async function updateProject(projectId, updates, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    const index = globalDataStore.projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      globalDataStore.projects[index] = project;
      notifyDataSubscribers();
    }

    return project;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

// Create a new problem
export async function createProblem(problemData, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    const { data: problem, error } = await supabase
      .from('problems')
      .insert([{ ...problemData, user_id: session.user.id }])
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    globalDataStore.problems.unshift(problem);
    notifyDataSubscribers();

    return problem;
  } catch (error) {
    console.error('Error creating problem:', error);
    throw error;
  }
}

// Update a problem
export async function updateProblem(problemId, updates, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: problem, error } = await supabase
      .from('problems')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', problemId)
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    const index = globalDataStore.problems.findIndex(p => p.id === problemId);
    if (index !== -1) {
      globalDataStore.problems[index] = problem;
      notifyDataSubscribers();
    }

    return problem;
  } catch (error) {
    console.error('Error updating problem:', error);
    throw error;
  }
}

// Convert problem to project (combines create project + update problem)
export async function convertProblemToProject(problem, options = {}) {
  const { onJWTError = null } = options;

  try {
    // Create project from problem
    const projectData = {
      name: problem.title,
      description: problem.description || problem.effect || 'Converted from problem',
      status: 'active',
      priority: 'medium',
      category: 'problem-conversion',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const project = await createProject(projectData, { onJWTError });

    // Update problem status
    await updateProblem(problem.id, {
      status: 'ongoing',
      project_id: project.id
    }, { onJWTError });

    console.log('Successfully converted problem to project:', {
      problemId: problem.id,
      projectId: project.id,
      projectName: project.name
    });

    return project;
  } catch (error) {
    console.error('Error converting problem to project:', error);
    throw error;
  }
}

// Global current minddump tracking
let currentMinddumpId = null;

// Load current minddump from localStorage on module load
try {
  const stored = localStorage.getItem('clearity_current_minddump');
  if (stored && stored !== 'null') {
    currentMinddumpId = stored;
  }
} catch (error) {
  console.warn('Failed to load current minddump from localStorage:', error);
}

// Minddump cache
let minddumpCache = {
  data: [],
  lastUpdated: null,
  isLoading: false
};

// Minddump cache subscribers
let minddumpSubscribers = [];

// Subscribe to minddump cache updates
export function subscribeToMinddumpUpdates(callback) {
  minddumpSubscribers.push(callback);
  return () => {
    minddumpSubscribers = minddumpSubscribers.filter(cb => cb !== callback);
  };
}

// Notify minddump subscribers
function notifyMinddumpSubscribers() {
  minddumpSubscribers.forEach(callback => {
    try {
      callback(minddumpCache);
    } catch (error) {
      console.error('Error in minddump subscriber:', error);
    }
  });
}

// Get minddumps from cache
export function getMinddumpsFromCache() {
  return {
    data: [...minddumpCache.data],
    lastUpdated: minddumpCache.lastUpdated,
    isLoading: minddumpCache.isLoading,
    currentMinddumpId: getCurrentMinddumpId()
  };
}

// Refresh minddumps cache
export async function refreshMinddumpsCache(options = {}) {
  const { onJWTError = null } = options;

  try {
    minddumpCache.isLoading = true;
    notifyMinddumpSubscribers();

    const freshData = await searchMinddumps('', { onJWTError });
    
    minddumpCache.data = freshData || [];
    minddumpCache.lastUpdated = new Date();
    minddumpCache.isLoading = false;

    notifyMinddumpSubscribers();
    
    console.log('📋 Minddumps cache refreshed:', minddumpCache.data.length, 'minddumps');
    return getMinddumpsFromCache();

  } catch (error) {
    minddumpCache.isLoading = false;
    notifyMinddumpSubscribers();
    throw error;
  }
}

// Initialize minddumps cache
export async function initializeMinddumpsCache(options = {}) {
  if (minddumpCache.lastUpdated === null) {
    return await refreshMinddumpsCache(options);
  }
  return getMinddumpsFromCache();
}

// Clear minddumps cache
export function clearMinddumpsCache() {
  minddumpCache = {
    data: [],
    lastUpdated: null,
    isLoading: false
  };
  notifyMinddumpSubscribers();
}

// Set current minddump (for tracking what's currently loaded)
export function setCurrentMinddump(minddumpId) {
  currentMinddumpId = minddumpId;
  try {
    if (minddumpId) {
      localStorage.setItem('clearity_current_minddump', minddumpId);
    } else {
      localStorage.removeItem('clearity_current_minddump');
    }
  } catch (error) {
    console.warn('Failed to save current minddump to localStorage:', error);
  }
  notifyMinddumpSubscribers();
  console.log('Current minddump set to:', minddumpId);
}

// Clear current minddump (for starting fresh)
export function clearCurrentMinddump() {
  currentMinddumpId = null;
  try {
    localStorage.removeItem('clearity_current_minddump');
  } catch (error) {
    console.warn('Failed to clear current minddump from localStorage:', error);
  }
  notifyMinddumpSubscribers();
  console.log('Current minddump cleared - will show empty canvas');
}

// Get current minddump ID
export function getCurrentMinddumpId() {
  return currentMinddumpId;
}

// Debug function to check current state
export function debugCurrentMinddumpState() {
  console.log('=== Current Minddump State ===');
  console.log('Current minddump ID:', currentMinddumpId);
  console.log('LocalStorage value:', localStorage.getItem('clearity_current_minddump'));
  console.log('==============================');
  return {
    currentMinddumpId,
    localStorage: localStorage.getItem('clearity_current_minddump')
  };
}

// Minddump functions

// Create a new minddump
export async function createMinddump(minddumpData, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    const { data: minddump, error } = await supabase
      .from('minddumps')
      .insert([{ ...minddumpData, user_id: session.user.id }])
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    minddumpCache.data.unshift(minddump);
    notifyMinddumpSubscribers();

    return minddump;
  } catch (error) {
    console.error('Error creating minddump:', error);
    throw error;
  }
}

// Get latest minddump for user
export async function getLatestMinddump(options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      return null;
    }

    const { data: minddumps, error } = await supabase
      .from('minddumps')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    return minddumps && minddumps.length > 0 ? minddumps[0] : null;
  } catch (error) {
    console.error('Error getting latest minddump:', error);
    throw error;
  }
}

// Search minddumps
export async function searchMinddumps(query, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      return [];
    }

    let supabaseQuery = supabase
      .from('minddumps')
      .select('id, title, prompt, created_at, metadata, conversation')
      .eq('user_id', session.user.id);

    // If query is provided, add search filter
    if (query && query.trim()) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,prompt.ilike.%${query}%`);
    }

    const { data: minddumps, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    return minddumps || [];
  } catch (error) {
    console.error('Error searching minddumps:', error);
    throw error;
  }
}

// Get specific minddump by ID
export async function getMinddump(minddumpId, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      return null;
    }

    const { data: minddumps, error } = await supabase
      .from('minddumps')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('id', minddumpId);

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    return minddumps && minddumps.length > 0 ? minddumps[0] : null;
  } catch (error) {
    console.error('Error getting minddump:', error);
    throw error;
  }
}

// Update minddump title
export async function updateMinddumpTitle(minddumpId, newTitle, options = {}) {
  const { onJWTError = null } = options;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    const { data: minddump, error } = await supabase
      .from('minddumps')
      .update({ 
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', minddumpId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    const index = minddumpCache.data.findIndex(m => m.id === minddumpId);
    if (index !== -1) {
      minddumpCache.data[index] = { ...minddumpCache.data[index], title: newTitle };
      notifyMinddumpSubscribers();
    }

    return minddump;
  } catch (error) {
    console.error('Error updating minddump title:', error);
    throw error;
  }
}

// Update minddump conversation
export async function updateMinddumpConversation(minddumpId, conversation, options = {}) {
  const { onJWTError = null } = options;
  
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      if (isJWTError(sessionError)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw sessionError;
      }
    }

    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    const { data: minddump, error } = await supabase
      .from('minddumps')
      .update({ 
        conversation: conversation,
        updated_at: new Date().toISOString()
      })
      .eq('id', minddumpId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      if (isJWTError(error)) {
        if (onJWTError) onJWTError('Session expired. Please log in again.');
        throw error;
      }
      throw error;
    }

    // Update cache
    const index = minddumpCache.data.findIndex(m => m.id === minddumpId);
    if (index !== -1) {
      minddumpCache.data[index] = { ...minddumpCache.data[index], conversation: conversation };
      notifyMinddumpSubscribers();
    }

    return true;
  } catch (error) {
    console.error('Error updating minddump conversation:', error);
    throw error;
  }
}

// Clear cache (useful for logout)
export function clearDataCache() {
  globalDataStore = {
    projects: [],
    knowledgeNodes: [],
    problems: [],
    lastUpdated: null,
    isLoading: false
  };
  notifyDataSubscribers();
  clearMinddumpsCache();
}