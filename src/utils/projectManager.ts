import { 
  getAllDataFromCache, 
  filterElements, 
  convertProblemToProject as convertProblemToProjectDB,
  updateProblem
} from './supabaseClient';

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
export async function convertProblemToProject(problem: Problem, options = {}): Promise<Project> {
  return await convertProblemToProjectDB(problem, options);
}

/**
 * Get all active problems for the current user (from cache)
 * @returns Array of active problems
 */
export function getActiveProblems(): Problem[] {
  const { problems } = getAllDataFromCache();
  return filterElements(problems, 'status', 'active');
}

/**
 * Update problem status
 * @param problemId - Problem ID
 * @param status - New status ('active', 'ongoing', 'resolved')
 * @returns Updated problem
 */
export async function updateProblemStatus(problemId: string, status: Problem['status'], options = {}): Promise<Problem> {
  return await updateProblem(problemId, { status }, options);
}