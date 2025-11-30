/**
 * Text processing utilities for audio generation
 * These utilities prepare text content for text-to-speech conversion
 */

/**
 * Strip markdown formatting to get plain text for TTS
 * Removes code blocks, headers, bold/italic, links, images, blockquotes, list markers
 * while preserving readable text content.
 * 
 * @param text - The markdown text to strip
 * @returns Plain text with markdown formatting removed
 * 
 * Requirements: 7.3
 */
export function stripMarkdown(text: string): string {
  if (!text) {
    return '';
  }

  return text
    // Remove code blocks (fenced)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove headers (must come before other processing)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove images (must come before links to avoid partial matches)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold (double asterisks)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic (single asterisks)
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove bold (double underscores)
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic (single underscores)
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove unordered list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list markers
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up extra whitespace (multiple newlines to double)
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Split text into chunks respecting sentence boundaries and maximum size limits.
 * Handles edge cases for very long sentences by splitting at commas or force-splitting.
 * 
 * @param text - The text to split into chunks
 * @param maxChunkSize - Maximum size of each chunk in characters
 * @returns Array of text chunks
 * 
 * Requirements: 7.1
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  if (!text || maxChunkSize <= 0) {
    return [];
  }

  const plainText = stripMarkdown(text);
  
  if (plainText.length === 0) {
    return [];
  }

  if (plainText.length <= maxChunkSize) {
    return [plainText];
  }

  const chunks: string[] = [];
  // Split at sentence boundaries (after . ! ?)
  const sentences = plainText.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    // If single sentence is too long, split by commas or force split
    if (sentence.length > maxChunkSize) {
      // Push current chunk if exists
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Try splitting by commas first
      const parts = sentence.split(/,\s*/);
      let partChunk = '';
      
      for (const part of parts) {
        if (part.length > maxChunkSize) {
          // Force split very long parts that don't have commas
          if (partChunk) {
            chunks.push(partChunk.trim());
            partChunk = '';
          }
          // Split at maxChunkSize boundaries
          for (let i = 0; i < part.length; i += maxChunkSize) {
            const slice = part.slice(i, i + maxChunkSize).trim();
            if (slice) {
              chunks.push(slice);
            }
          }
        } else if ((partChunk + ', ' + part).length > maxChunkSize) {
          // Current part would exceed limit, push current and start new
          if (partChunk) {
            chunks.push(partChunk.trim());
          }
          partChunk = part;
        } else {
          // Add part to current chunk
          partChunk = partChunk ? partChunk + ', ' + part : part;
        }
      }
      
      if (partChunk) {
        currentChunk = partChunk;
      }
      continue;
    }

    // Normal case: sentence fits within limit
    if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
      // Adding this sentence would exceed limit
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      // Add sentence to current chunk
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/** Default maximum chunk size for Murf AI (leaving buffer under 3000 limit) */
export const DEFAULT_MAX_CHUNK_SIZE = 2800;
