/**
 * Voice type for audio generation
 */
export type VoiceType = 'male' | 'female';

/**
 * Generates a consistent storage path for audio files.
 * 
 * The path follows the pattern: {courseId}/{lessonId}-{voiceType}.mp3
 * 
 * @param courseId - The UUID of the course
 * @param lessonId - The UUID of the lesson
 * @param voiceType - The voice type ('male' or 'female')
 * @returns The storage path string
 * 
 * Requirements: 7.4
 */
export function getAudioStoragePath(
  courseId: string,
  lessonId: string,
  voiceType: VoiceType
): string {
  return `${courseId}/${lessonId}-${voiceType}.mp3`;
}
