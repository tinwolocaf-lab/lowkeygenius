/**
 * Anonymization utilities for user profile data
 * Detects and removes PII (Personally Identifiable Information) from text
 * 
 * Requirements: 5.1, 5.2
 */

/**
 * Report of detected PII in text
 */
export interface PIIReport {
  emails: number;
  phones: number;
  names: number;
  addresses: number;
}

/**
 * Result of anonymization process
 */
export interface AnonymizationResult {
  anonymizedText: string;
  piiDetected: PIIReport;
  validationPassed: boolean;
}

/**
 * Placeholder tokens for different PII types
 */
export const PII_PLACEHOLDERS = {
  EMAIL: '[EMAIL_REDACTED]',
  PHONE: '[PHONE_REDACTED]',
  NAME: '[NAME_REDACTED]',
  ADDRESS: '[ADDRESS_REDACTED]',
} as const;

/**
 * Email pattern - matches common email formats
 * Examples: john@example.com, user.name+tag@domain.co.uk
 */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Phone pattern - matches various phone formats
 * Examples: (555) 123-4567, 555-123-4567, +1 555 123 4567, 5551234567
 */
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Name pattern - matches common name patterns
 * Looks for capitalized words that appear to be names (2+ consecutive capitalized words)
 * Also matches "My name is X" or "I'm X" patterns
 */
const NAME_PATTERNS = [
  // "My name is John" or "I'm John Smith"
  /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  // Two or more consecutive capitalized words (likely full names)
  /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
];

/**
 * Address pattern - matches common US address formats
 * Examples: 123 Main St, 456 Oak Avenue, Apt 5
 */
const ADDRESS_PATTERN = /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+)+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir)\.?(?:\s*,?\s*(?:Apt|Suite|Unit|#)\s*\d+[A-Za-z]?)?\b/gi;

/**
 * Common words that should not be treated as names
 */
const NAME_EXCLUSIONS = new Set([
  // Common sentence starters
  'The', 'This', 'That', 'These', 'Those', 'There', 'Here',
  // Time-related
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
  'September', 'October', 'November', 'December',
  // Common nouns often capitalized
  'University', 'College', 'School', 'Company', 'Corporation', 'Institute',
  'Department', 'Office', 'Center', 'Foundation', 'Association', 'Organization',
  // Technology terms
  'JavaScript', 'TypeScript', 'Python', 'React', 'Angular', 'Vue', 'Node',
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Meta', 'Netflix',
  // Education terms
  'Bachelor', 'Master', 'Doctor', 'Professor', 'Engineering', 'Science',
  'Computer', 'Software', 'Data', 'Machine', 'Learning', 'Artificial', 'Intelligence',
  // Common words
  'Hello', 'Welcome', 'Thanks', 'Please', 'Sorry', 'Yes', 'No',
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
  // Pronouns and articles that might be capitalized at sentence start
  'I', 'We', 'You', 'He', 'She', 'It', 'They', 'My', 'Our', 'Your',
]);

/**
 * Check if a potential name match should be excluded
 */
function shouldExcludeName(name: string): boolean {
  const words = name.split(/\s+/);
  // If all words are in exclusion list, exclude the match
  return words.every(word => NAME_EXCLUSIONS.has(word));
}

/**
 * Anonymize text by replacing PII with placeholder tokens
 * 
 * @param text - The text to anonymize
 * @returns AnonymizationResult with anonymized text and PII report
 * 
 * Requirements: 5.1, 5.2
 */
export function anonymizeText(text: string): AnonymizationResult {
  if (!text || typeof text !== 'string') {
    return {
      anonymizedText: '',
      piiDetected: { emails: 0, phones: 0, names: 0, addresses: 0 },
      validationPassed: true,
    };
  }

  let anonymizedText = text;
  const piiDetected: PIIReport = { emails: 0, phones: 0, names: 0, addresses: 0 };

  // Replace emails first (most specific pattern)
  const emailMatches = anonymizedText.match(EMAIL_PATTERN);
  if (emailMatches) {
    piiDetected.emails = emailMatches.length;
    anonymizedText = anonymizedText.replace(EMAIL_PATTERN, PII_PLACEHOLDERS.EMAIL);
  }

  // Replace phone numbers
  const phoneMatches = anonymizedText.match(PHONE_PATTERN);
  if (phoneMatches) {
    piiDetected.phones = phoneMatches.length;
    anonymizedText = anonymizedText.replace(PHONE_PATTERN, PII_PLACEHOLDERS.PHONE);
  }

  // Replace addresses
  const addressMatches = anonymizedText.match(ADDRESS_PATTERN);
  if (addressMatches) {
    piiDetected.addresses = addressMatches.length;
    anonymizedText = anonymizedText.replace(ADDRESS_PATTERN, PII_PLACEHOLDERS.ADDRESS);
  }

  // Replace names (most complex - use multiple patterns)
  for (const pattern of NAME_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    
    let match;
    const namesToReplace: string[] = [];
    
    while ((match = pattern.exec(anonymizedText)) !== null) {
      const potentialName = match[1] || match[0];
      if (!shouldExcludeName(potentialName)) {
        namesToReplace.push(potentialName);
      }
    }
    
    // Replace unique names
    const uniqueNames = [...new Set(namesToReplace)];
    for (const name of uniqueNames) {
      const nameRegex = new RegExp(escapeRegExp(name), 'g');
      const beforeReplace = anonymizedText;
      anonymizedText = anonymizedText.replace(nameRegex, PII_PLACEHOLDERS.NAME);
      if (beforeReplace !== anonymizedText) {
        piiDetected.names++;
      }
    }
  }

  const validationPassed = validateAnonymization(anonymizedText);

  return {
    anonymizedText,
    piiDetected,
    validationPassed,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that text has been properly anonymized
 * Checks that no obvious PII patterns remain
 * 
 * @param text - The text to validate
 * @returns true if no PII patterns are detected
 * 
 * Requirements: 5.3, 5.4
 */
export function validateAnonymization(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return true;
  }

  // Check for remaining emails
  if (EMAIL_PATTERN.test(text)) {
    EMAIL_PATTERN.lastIndex = 0; // Reset for next use
    return false;
  }
  EMAIL_PATTERN.lastIndex = 0;

  // Check for remaining phone numbers
  if (PHONE_PATTERN.test(text)) {
    PHONE_PATTERN.lastIndex = 0;
    return false;
  }
  PHONE_PATTERN.lastIndex = 0;

  // Check for remaining addresses
  if (ADDRESS_PATTERN.test(text)) {
    ADDRESS_PATTERN.lastIndex = 0;
    return false;
  }
  ADDRESS_PATTERN.lastIndex = 0;

  return true;
}

/**
 * Check if text contains any detectable PII
 * 
 * @param text - The text to check
 * @returns true if PII is detected
 */
export function containsPII(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Check emails
  if (EMAIL_PATTERN.test(text)) {
    EMAIL_PATTERN.lastIndex = 0;
    return true;
  }
  EMAIL_PATTERN.lastIndex = 0;

  // Check phones
  if (PHONE_PATTERN.test(text)) {
    PHONE_PATTERN.lastIndex = 0;
    return true;
  }
  PHONE_PATTERN.lastIndex = 0;

  // Check addresses
  if (ADDRESS_PATTERN.test(text)) {
    ADDRESS_PATTERN.lastIndex = 0;
    return true;
  }
  ADDRESS_PATTERN.lastIndex = 0;

  // Check names using patterns
  for (const pattern of NAME_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const potentialName = match[1] || match[0];
      if (!shouldExcludeName(potentialName)) {
        pattern.lastIndex = 0;
        return true;
      }
    }
    pattern.lastIndex = 0;
  }

  return false;
}
