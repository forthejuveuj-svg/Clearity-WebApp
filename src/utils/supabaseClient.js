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

// Unified function to fetch projects with all fields
export async function fetchProjectsFromSupabase(options = {}) {
  const { onlyToday = false, selectFields = '*' } = options;
  
  try {
    console.log('🚀 Fetching projects from Supabase...');
    console.log('🚀 Options:', { onlyToday, selectFields });
    
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
      return [];
    }
    
    console.log('🚀 User ID:', session.user.id);
    
    // Build the query
    let query = supabase
      .from('projects')
      .select(selectFields)
      .order('created_at', { ascending: false });
    
    // Execute the query
    const { data, error } = await query;
    
    console.log('🚀 Raw Supabase response:');
    console.log('🚀 Data:', data);
    console.log('🚀 Error:', error);
    console.log('🚀 Data length:', data?.length);
    
    if (error) {
      console.error('Error fetching projects:', error);
      if (isJWTError(error)) {
        throw error;
      }
      return [];
    }
    
    let projects = data || [];
    
    // Filter for today if requested
    if (onlyToday && projects.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      console.log('🚀 Today\'s date:', today);
      
      const todayProjects = projects.filter(project => {
        let createdDate = null;
        let updatedDate = null;
        
        if (project.created_at) {
          const createdDateObj = new Date(project.created_at);
          createdDate = createdDateObj.toISOString().split('T')[0];
        }
        
        if (project.last_updated) {
          const updatedDateObj = new Date(project.last_updated);
          updatedDate = updatedDateObj.toISOString().split('T')[0];
        }
        
        const isFromToday = createdDate === today || updatedDate === today;
        
        console.log(`🚀 Project "${project.name}":`, {
          created_at: project.created_at,
          createdDate,
          last_updated: project.last_updated,
          updatedDate,
          today,
          isFromToday
        });
        
        return isFromToday;
      });
      
      console.log(`🚀 Filtered to ${todayProjects.length} projects from today (out of ${projects.length} total)`);
      return todayProjects;
    }
    
    return projects;
    
  } catch (error) {
    console.error('Error in fetchProjectsFromSupabase:', error);
    throw error;
  }
}