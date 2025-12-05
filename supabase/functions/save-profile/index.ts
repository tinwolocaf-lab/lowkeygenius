/**
 * Save Profile Edge Function
 * Saves anonymized profile data to database with AI-powered context extraction
 * 
 * Requirements: 5.3, 6.1, 6.2, 10.3
 * Security: 1.1, 1.2, 2.1, 3.1, 7.1, 7.2
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  validateAuth,
  getCorsHeaders,
  validateStringInput,
  checkRateLimit,
  createRateLimitResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createSafeErrorResponse,
} from '../_shared/security.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Maximum limits for input validation (Requirements 3.1)
const MAX_RAW_CONTENT_LENGTH = 50000;
const MAX_CONVERSATION_HISTORY_LENGTH = 50;
const MAX_HISTORY_MESSAGE_LENGTH = 10000;

type InputMethod = 'text' | 'voice' | 'conversation';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SaveProfileRequest {
  inputMethod: InputMethod;
  rawContent: string;
  conversationHistory?: ConversationMessage[];
}

interface ExtractedContext {
  education: string;
  experience: string;
  interests: string;
  expertise: string[];
  learningStyle?: string;
  preferences?: string[];
}

interface PIIReport {
  emails: number;
  phones: number;
  names: number;
  addresses: number;
}

interface AnonymizationResult {
  anonymizedText: string;
  piiDetected: PIIReport;
  validationPassed: boolean;
}

interface SaveProfileResponse {
  success: boolean;
  profileId?: string;
  extractedContext?: ExtractedContext;
  error?: string;
}

// PII Placeholder tokens
const PII_PLACEHOLDERS = {
  EMAIL: '[EMAIL_REDACTED]',
  PHONE: '[PHONE_REDACTED]',
  NAME: '[NAME_REDACTED]',
  ADDRESS: '[ADDRESS_REDACTED]',
} as const;

// PII Detection patterns
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const NAME_PATTERNS = [
  /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
];
const ADDRESS_PATTERN = /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+)+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir)\.?(?:\s*,?\s*(?:Apt|Suite|Unit|#)\s*\d+[A-Za-z]?)?\b/gi;

// Common words to exclude from name detection
const NAME_EXCLUSIONS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'There', 'Here',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'University', 'College', 'School', 'Company', 'Corporation', 'Institute',
  'Department', 'Office', 'Center', 'Foundation', 'Association', 'Organization',
  'JavaScript', 'TypeScript', 'Python', 'React', 'Angular', 'Vue', 'Node',
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Meta', 'Netflix',
  'Bachelor', 'Master', 'Doctor', 'Professor', 'Engineering', 'Science',
  'Computer', 'Software', 'Data', 'Machine', 'Learning', 'Artificial', 'Intelligence',
  'Hello', 'Welcome', 'Thanks', 'Please', 'Sorry', 'Yes', 'No',
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
  'I', 'We', 'You', 'He', 'She', 'It', 'They', 'My', 'Our', 'Your',
]);

function shouldExcludeName(name: string): boolean {
  const words = name.split(/\s+/);
  return words.every(word => NAME_EXCLUSIONS.has(word));
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Anonymize text by replacing PII with placeholder tokens
 * Requirements: 5.1, 5.2, 7.1
 */
function anonymizeText(text: string): AnonymizationResult {
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

  // Replace names
  for (const pattern of NAME_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    const namesToReplace: string[] = [];
    
    while ((match = pattern.exec(anonymizedText)) !== null) {
      const potentialName = match[1] || match[0];
      if (!shouldExcludeName(potentialName)) {
        namesToReplace.push(potentialName);
      }
    }
    
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

  // Validate that no PII remains (Requirements 7.1)
  // Reset regex lastIndex before validation
  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;
  ADDRESS_PATTERN.lastIndex = 0;

  const validationPassed = !EMAIL_PATTERN.test(anonymizedText) && 
                           !PHONE_PATTERN.test(anonymizedText) &&
                           !ADDRESS_PATTERN.test(anonymizedText);

  // Reset regex lastIndex after validation
  EMAIL_PATTERN.lastIndex = 0;
  PHONE_PATTERN.lastIndex = 0;
  ADDRESS_PATTERN.lastIndex = 0;

  return {
    anonymizedText,
    piiDetected,
    validationPassed,
  };
}

/**
 * Validate conversation history array
 * Requirements: 3.1
 */
function validateConversationHistory(
  history: unknown
): { valid: boolean; error?: string } {
  if (history === undefined || history === null) {
    return { valid: true };
  }

  if (!Array.isArray(history)) {
    return { valid: false, error: 'conversationHistory must be an array' };
  }

  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) {
    return { valid: false, error: `conversationHistory exceeds maximum length of ${MAX_CONVERSATION_HISTORY_LENGTH}` };
  }

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `conversationHistory[${i}] must be an object` };
    }

    const typedMsg = msg as Record<string, unknown>;

    if (typedMsg.role !== 'user' && typedMsg.role !== 'assistant') {
      return { valid: false, error: `conversationHistory[${i}].role must be 'user' or 'assistant'` };
    }

    const contentValidation = validateStringInput(
      typedMsg.content,
      `conversationHistory[${i}].content`,
      MAX_HISTORY_MESSAGE_LENGTH
    );
    if (!contentValidation.valid) {
      return { valid: false, error: contentValidation.error };
    }
  }

  return { valid: true };
}

/**
 * Extract structured context from user content using AI
 * Requirements: 10.3
 */
async function extractContext(
  content: string,
  conversationHistory?: ConversationMessage[]
): Promise<ExtractedContext> {
  // Build context from conversation history if available
  let fullContext = content;
  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    fullContext = `${historyText}\n\nFinal content: ${content}`;
  }

  const prompt = `Analyze the following user profile information and extract structured data.

User Information:
${fullContext}

Extract and return a JSON object with the following structure:
{
  "education": "Brief summary of educational background (degrees, certifications, relevant courses)",
  "experience": "Brief summary of professional experience level and areas",
  "interests": "Learning interests and goals",
  "expertise": ["array", "of", "known", "skills", "or", "technologies"],
  "learningStyle": "Preferred learning approach if mentioned (visual, hands-on, reading, etc.)",
  "preferences": ["array", "of", "additional", "preferences", "if", "any"]
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown or code blocks
- If information is not available for a field, use empty string or empty array
- Keep summaries concise (1-2 sentences max)
- Focus on learning-relevant information`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    console.error('Failed to extract context from Gemini');
    // Return default structure if API fails
    return {
      education: '',
      experience: '',
      interests: content.substring(0, 200),
      expertise: [],
    };
  }

  const geminiData = await geminiResponse.json();
  const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  try {
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extracted = JSON.parse(cleanedText) as ExtractedContext;
    
    // Ensure required fields have defaults
    return {
      education: extracted.education || '',
      experience: extracted.experience || '',
      interests: extracted.interests || '',
      expertise: Array.isArray(extracted.expertise) ? extracted.expertise : [],
      learningStyle: extracted.learningStyle,
      preferences: Array.isArray(extracted.preferences) ? extracted.preferences : undefined,
    };
  } catch {
    console.error('Failed to parse extracted context:', responseText);
    // Return default structure if parsing fails
    return {
      education: '',
      experience: '',
      interests: content.substring(0, 200),
      expertise: [],
    };
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests (Requirements 2.2)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return createErrorResponse(
        'Service configuration error',
        500,
        corsHeaders,
        'INTERNAL_ERROR'
      );
    }

    // Validate authentication (Requirements 1.1, 1.2, 1.3)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authResult = await validateAuth(req, supabase);
    if (authResult.error || !authResult.user) {
      console.warn('Authentication failed:', authResult.error);
      return createUnauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized');
    }

    // Check rate limit (Requirements 4.1, 4.2)
    const rateLimitResult = await checkRateLimit(supabase, authResult.user.id, 'save-profile');
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Parse and validate request body
    let requestData: SaveProfileRequest;
    try {
      requestData = await req.json();
    } catch {
      return createValidationErrorResponse(corsHeaders, 'Invalid JSON in request body');
    }

    const { inputMethod, rawContent, conversationHistory } = requestData;

    // Validate inputMethod (Requirements 3.1)
    if (!inputMethod || !['text', 'voice', 'conversation'].includes(inputMethod)) {
      return createValidationErrorResponse(corsHeaders, 'Invalid input method. Must be text, voice, or conversation');
    }

    // Validate rawContent (Requirements 3.1)
    const contentValidation = validateStringInput(rawContent, 'rawContent', MAX_RAW_CONTENT_LENGTH);
    if (!contentValidation.valid) {
      return createValidationErrorResponse(corsHeaders, contentValidation.error || 'Invalid content');
    }

    // Validate conversation history if provided (Requirements 3.1)
    const historyValidation = validateConversationHistory(conversationHistory);
    if (!historyValidation.valid) {
      return createValidationErrorResponse(corsHeaders, historyValidation.error || 'Invalid conversation history');
    }

    // Anonymize the content (Requirements 5.3, 7.1)
    const anonymizationResult = anonymizeText(rawContent);
    
    if (!anonymizationResult.validationPassed) {
      // Log warning but continue - some edge cases may slip through
      console.warn('Anonymization validation failed for user:', authResult.user.id);
    }

    // Extract structured context using AI (Requirements 10.3)
    const extractedContext = await extractContext(
      anonymizationResult.anonymizedText,
      conversationHistory
    );

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', authResult.user.id)
      .single();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          input_method: inputMethod,
          anonymized_content: anonymizationResult.anonymizedText,
          extracted_context: extractedContext,
          anonymization_metadata: anonymizationResult.piiDetected,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authResult.user.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        return createErrorResponse(
          'Failed to update profile',
          500,
          corsHeaders,
          'INTERNAL_ERROR'
        );
      }

      profileId = updatedProfile.id;
    } else {
      // Create new profile (Requirements 6.1, 6.2)
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authResult.user.id,
          input_method: inputMethod,
          anonymized_content: anonymizationResult.anonymizedText,
          extracted_context: extractedContext,
          anonymization_metadata: anonymizationResult.piiDetected,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return createErrorResponse(
          'Failed to create profile',
          500,
          corsHeaders,
          'INTERNAL_ERROR'
        );
      }

      profileId = newProfile.id;
    }

    const successResponse: SaveProfileResponse = {
      success: true,
      profileId,
      extractedContext,
    };

    return new Response(
      JSON.stringify(successResponse),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    // Log error internally but don't expose details (Requirements 7.2)
    console.error('Error in save-profile:', error);

    // Use createSafeErrorResponse to ensure no stack traces or internal paths are exposed
    return createSafeErrorResponse(error, 500, corsHeaders, 'INTERNAL_ERROR', 'An error occurred processing your request');
  }
});
