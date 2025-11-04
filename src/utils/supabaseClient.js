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

// Unified function to fetch all data from Supabase
export async function fetchAllDataFromSupabase(options = {}) {
  const { selectFields = '*' } = options;
  
  try {
    console.log('🚀 Fetching all data from Supabase...');
    console.log('🚀 Options:', { selectFields });
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      if (isJWTError(sessionError)) {
        throw sessionError;
      }
    }
    
    if (!session?.user) {
      console.log('No authenticated user');
      return { projects: [], knowledgeNodes: [], problems: [] };
    }
    
    console.log('🚀 User ID:', session.user.id);
    
    // Fetch all data in parallel
    const [projectsResult, knowledgeNodesResult, problemsResult] = await Promise.all([
      supabase.from('projects').select(selectFields).order('created_at', { ascending: false }),
      supabase.from('knowledge_nodes').select('*').order('created_at', { ascending: false }),
      supabase.from('problems').select('*').eq('status', 'active').order('created_at', { ascending: false })
    ]);
    
    console.log('🚀 Raw Supabase responses:');
    console.log('🚀 Projects:', projectsResult.data?.length || 0);
    console.log('🚀 Knowledge nodes:', knowledgeNodesResult.data?.length || 0);
    console.log('🚀 Problems:', problemsResult.data?.length || 0);
    
    // Check for errors
    const errors = [projectsResult.error, knowledgeNodesResult.error, problemsResult.error].filter(Boolean);
    
    for (const error of errors) {
      console.error('Database query error:', error);
      if (isJWTError(error)) {
        throw error;
      }
    }
    
    return {
      projects: projectsResult.data || [],
      knowledgeNodes: knowledgeNodesResult.data || [],
      problems: problemsResult.data || []
    };
    
  } catch (error) {
    console.error('Error in fetchAllDataFromSupabase:', error);
    throw error;
  }
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
  
  return data.filter(item => {
    const fieldValue = item[key];
    
    // Handle 'empty' criteria - check if field is empty/null/undefined/empty array
    if (criteria === 'empty') {
      return !fieldValue || 
             fieldValue === '' || 
             (Array.isArray(fieldValue) && fieldValue.length === 0) ||
             (Array.isArray(fieldValue) && fieldValue.every(val => !val || val.trim() === ''));
    }
    
    // Handle 'today' criteria for date fields
    if (criteria === 'today') {
      const today = new Date().toISOString().split('T')[0];
      
      // Check both created_at and last_updated fields
      let createdDate = null;
      let updatedDate = null;
      
      if (item.created_at) {
        try {
          createdDate = new Date(item.created_at).toISOString().split('T')[0];
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      if (item.last_updated) {
        try {
          updatedDate = new Date(item.last_updated).toISOString().split('T')[0];
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return createdDate === today || updatedDate === today;
    }
    
    // Handle array fields - check if criteria is included in the array
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(criteria);
    }
    
    // Handle exact match for simple values
    return fieldValue === criteria;
  });
}