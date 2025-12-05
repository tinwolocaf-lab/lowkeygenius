export { checkAudioAccess } from './audioAccess';
export type { AudioAccessProfile, AudioAccessResult } from './audioAccess';

export { stripMarkdown, splitTextIntoChunks, DEFAULT_MAX_CHUNK_SIZE } from './textProcessing';

export { getAudioStoragePath } from './audioStorage';
export type { VoiceType } from './audioStorage';

export { 
  anonymizeText, 
  validateAnonymization, 
  containsPII,
  PII_PLACEHOLDERS 
} from './anonymization';
export type { PIIReport, AnonymizationResult } from './anonymization';

export {
  getThumbnailStoragePath,
  validateThumbnailFile,
  uploadThumbnail,
  deleteThumbnail,
  ACCEPTED_THUMBNAIL_TYPES,
  MAX_THUMBNAIL_SIZE_BYTES,
  THUMBNAIL_BUCKET,
} from './thumbnailStorage';
export type {
  AcceptedThumbnailType,
  ValidationResult,
  UploadResult,
  DeleteResult,
} from './thumbnailStorage';

export {
  escapeHtml,
  unescapeHtml,
  sanitizeHtml,
  containsXssPayload,
  sanitizeForMarkdown,
  sanitizeUserInput,
  sanitizeUrl,
} from './xssSanitization';
export type { SanitizationResult } from './xssSanitization';
