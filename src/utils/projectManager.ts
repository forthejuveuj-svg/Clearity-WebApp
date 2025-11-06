import { 
  getAllDataFromCache, 
  filterElements, 
  convertProblemToProject as convertProblemToProjectDB,
  updateProblem
} from './supabaseClient';

/**
 * Convert a problem into a project
 * @param problem - The problem object to convert
 * @returns The created project
 */
export async function convertProblemToProject(problem: any, options = {}): Promise<any> {
  return await convertProblemToProjectDB(problem, options);
}

/**
 * Get all active problems for the current user (from cache)
 * @returns Array of active problems
 */
export function getActiveProblems(): any[] {
  const { problems } = getAllDataFromCache();
  return filterElements(problems, 'status', 'active');
}

/**
 * Update problem status
 * @param problemId - Problem ID
 * @param status - New status ('active', 'ongoing', 'resolved')
 * @returns Updated problem
 */
export async function updateProblemStatus(problemId: string, status: string, options = {}): Promise<any> {
  return await updateProblem(problemId, { status }, options);
}