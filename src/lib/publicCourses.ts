import { supabase } from './supabase';
import type { PublicCoursePreview } from '../types/database';

/**
 * Fetches public course previews from the database.
 * This function queries the public_courses_preview view which only returns
 * courses where is_public = true, ordered by published_at descending.
 * 
 * @returns Promise<PublicCoursePreview[]> Array of public course previews
 * @throws Error if the database query fails
 */
export async function fetchPublicCoursePreviews(): Promise<PublicCoursePreview[]> {
  const { data, error } = await supabase
    .from('public_courses_preview')
    .select('id, title, description, topic, level, thumbnail_url, published_at');

  if (error) {
    throw new Error(`Failed to fetch public courses: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fills a grid with courses by repeating them if fewer than required exist.
 * This ensures the grid always has the exact number of courses needed for display.
 * 
 * @param courses - Array of courses to fill the grid with
 * @param requiredCount - The exact number of courses needed for the grid
 * @returns Array of exactly requiredCount courses, with courses repeated if necessary
 */
export function fillGridCourses<T>(courses: T[], requiredCount: number): T[] {
  if (courses.length === 0 || requiredCount <= 0) {
    return [];
  }

  const result: T[] = [];
  
  for (let i = 0; i < requiredCount; i++) {
    result.push(courses[i % courses.length]);
  }

  return result;
}
