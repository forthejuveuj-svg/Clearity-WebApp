import { supabase } from '../lib/supabase';

interface Problem {
  id: string;
  title: string;
  description?: string;
  effect?: string;
  status: 'active' | 'ongoing' | 'resolved';
  created_at: string;
  updated_at?: string;
  project_id?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  priority?: string;
  category?: string;
}

/**
 * Convert a problem into a project
 * @param problem - The problem object to convert
 * @returns The created project
 */
export async function convertProblemToProject(problem: Problem): Promise<Project> {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('No authenticated user');
    }

    // Create new project from problem
    const projectData = {
      name: problem.title,
      description: problem.description || problem.effect || 'Converted from problem',
      status: 'active',
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add any additional fields that might be relevant
      priority: 'medium',
      category: 'problem-conversion'
    };

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    // Update problem status to 'ongoing' and link to project
    const { error: problemError } = await supabase
      .from('problems')
      .update({ 
        status: 'ongoing' as const,
        project_id: project.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', problem.id);

    if (problemError) {
      console.error('Error updating problem status:', problemError);
      // Don't throw here as the project was created successfully
    }

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

/**
 * Get all active problems for the current user
 * @returns Array of active problems
 */
export async function getActiveProblems(): Promise<Problem[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return [];
    }

    const { data: problems, error } = await supabase
      .from('problems')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return problems || [];

  } catch (error) {
    console.error('Error fetching active problems:', error);
    return [];
  }
}

/**
 * Update problem status
 * @param problemId - Problem ID
 * @param status - New status ('active', 'ongoing', 'resolved')
 * @returns Updated problem
 */
export async function updateProblemStatus(problemId: string, status: Problem['status']): Promise<Problem> {
  try {
    const { data: problem, error } = await supabase
      .from('problems')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', problemId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return problem;

  } catch (error) {
    console.error('Error updating problem status:', error);
    throw error;
  }
}