/**
 * Shared Security Utilities for Edge Functions
 * 
 * This module provides reusable security functions for authentication,
 * CORS handling, input validation, and rate limiting.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

// ============================================================================
// Constants
// ============================================================================

// Input validation limits
export const MAX_STRING_LENGTH = 10000;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 100000;

// Rate limit configurations per endpoint
// AI generation endpoints have stricter limits due to higher resource costs
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI generation endpoints - stricter limits (Requirements 4.3)
  'generate-outline': { windowMs: 60000, maxRequests: 5 },
  'generate-lesson': { windowMs: 60000, maxRequests: 10 },
  'generate-audio': { windowMs: 60000, maxRequests: 3 },
  'generate-course-audio': { windowMs: 60000, maxRequests: 2 },
  'generate-definition': { windowMs: 60000, maxRequests: 20 },
  'generate-flashcards': { windowMs: 60000, maxRequests: 10 },
  'generate-quiz': { windowMs: 60000, maxRequests: 10 },
  'regenerate-lesson': { windowMs: 60000, maxRequests: 5 },
  // Profile/onboarding endpoints
  'profile-chat': { windowMs: 60000, maxRequests: 30 },
  'save-profile': { windowMs: 60000, maxRequests: 10 },
  'speech-to-text': { windowMs: 60000, maxRequests: 20 },
  // Course management endpoints
  'update-outline': { windowMs: 60000, maxRequests: 20 },
  // Default for unspecified endpoints
  'default': { windowMs: 60000, maxRequests: 30 },
};

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Get allowed origins from environment or use defaults for development
 */
export function getAllowedOrigins(): string[] {
  const origins = Deno.env.get('ALLOWED_ORIGINS');
  if (origins) {
    return origins.split(',').map(o => o.trim());
  }
  // Fallback for development
  return ['http://localhost:5173', 'http://localhost:3000'];
}

/**
 * Get CORS headers for a request, validating the origin
 * @param origin - The origin header from the request
 * @param methods - Allowed HTTP methods (default: POST, OPTIONS)
 */
export function getCorsHeaders(
  origin: string | null,
  methods: string = 'POST, OPTIONS'
): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // In production, validate origin; in development, allow all
  const isProduction = Deno.env.get('ALLOWED_ORIGINS') !== undefined;
  let allowedOrigin: string;
  
  if (isProduction) {
    allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  } else {
    // Development mode - allow any origin
    allowedOrigin = origin || '*';
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Validate authentication token and return user info
 * Requirements: 1.1, 1.2, 1.3
 * 
 * @param req - The incoming request
 * @param supabase - Supabase client instance
 */
export async function validateAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token === 'Bearer') {
    return { user: null, error: 'Invalid authorization header format' };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid user token' };
    }
    
    return { user: { id: user.id, email: user.email }, error: null };
  } catch {
    return { user: null, error: 'Token validation failed' };
  }
}

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate a string input field
 * Requirements: 3.1, 3.2
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Maximum allowed length
 * @param required - Whether the field is required
 */
export function validateStringInput(
  value: unknown,
  fieldName: string,
  maxLength: number = MAX_STRING_LENGTH,
  required: boolean = true
): ValidationResult {
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  if (required && value.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
  }
  
  return { valid: true };
}

/**
 * Validate that a value is a valid UUID
 */
export function validateUUID(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }
  
  return { valid: true };
}

// ============================================================================
// Prompt Injection Sanitization
// ============================================================================

/**
 * Sanitize user input that will be included in AI prompts
 * Requirements: 3.4
 * 
 * Removes potential prompt injection patterns while preserving legitimate content
 */
export function sanitizeForPrompt(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove prompt injection patterns
    .replace(/\b(ignore|disregard|forget)\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi, '[filtered]')
    .replace(/\b(system|assistant|user)\s*:/gi, '[role]:')
    // Remove attempts to escape context
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/system|assistant|user/gi, '[role]'))
    // Remove control characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if a user has exceeded the rate limit for an endpoint
 * Requirements: 4.1, 4.2, 4.3
 * 
 * @param supabase - Supabase client with service role
 * @param userId - The authenticated user's ID
 * @param endpoint - The endpoint being accessed
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();
  
  try {
    // Count recent requests within the time window
    const { count, error: countError } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart);
    
    if (countError) {
      // Log error but don't block the request on rate limit failures
      console.error('Rate limit check error:', countError);
      return { allowed: true };
    }
    
    const currentCount = count || 0;
    
    if (currentCount >= config.maxRequests) {
      // Calculate retry-after based on oldest request in window
      const retryAfterSeconds = Math.ceil(config.windowMs / 1000);
      
      // Log rate limit event for security monitoring (Requirements 4.4)
      console.warn(`Rate limit exceeded: user=${userId}, endpoint=${endpoint}, count=${currentCount}`);
      
      return {
        allowed: false,
        retryAfter: retryAfterSeconds,
        remaining: 0,
      };
    }
    
    // Log this request
    const { error: insertError } = await supabase
      .from('rate_limit_log')
      .insert({
        user_id: userId,
        endpoint,
      });
    
    if (insertError) {
      console.error('Failed to log rate limit entry:', insertError);
      // Don't block the request if logging fails
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - don't block requests if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Create a 429 Too Many Requests response
 * Requirements: 4.1
 * 
 * @param retryAfter - Seconds until the client can retry
 * @param corsHeaders - CORS headers to include
 */
export function createRateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

// ============================================================================
// Error Response Utilities
// ============================================================================

/**
 * Patterns that indicate internal/sensitive details in error messages
 * Requirements: 7.2
 */
const INTERNAL_ERROR_PATTERNS: RegExp[] = [
  // Stack trace patterns
  /at\s+[\w.<>]+\s*\(/i,
  /^\s*at\s+/m,
  /Error\s*:\s*\n/i,
  
  // File paths with line numbers
  /\/[\w/.-]+\.(ts|js|tsx|jsx):\d+/i,
  /\w+\.(ts|js|tsx|jsx):\d+:\d+/i,
  
  // Common path patterns
  /node_modules/i,
  /supabase\/functions/i,
  /\/home\//i,
  /\/var\//i,
  /\/tmp\//i,
  /\/usr\//i,
  /C:\\|D:\\/i,
  /file:\/\//i,
  
  // Environment variable names
  /SUPABASE_/i,
  /GEMINI_/i,
  /MURF_/i,
  /POLAR_/i,
  /API_KEY/i,
  /SECRET/i,
  /PASSWORD/i,
  /TOKEN/i,
  /PRIVATE/i,
  
  // Database/internal identifiers
  /postgres:/i,
  /postgresql:/i,
  /connection\s+refused/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  
  // Internal error types
  /TypeError:/i,
  /ReferenceError:/i,
  /SyntaxError:/i,
  /RangeError:/i,
  
  // Deno/Node specific
  /Deno\./i,
  /deno:/i,
  /npm:/i,
  /jsr:/i,
];

/**
 * Safe error messages for common error types
 * Maps internal error patterns to user-friendly messages
 */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  'connection': 'Service temporarily unavailable',
  'timeout': 'Request timed out',
  'rate limit': 'Too many requests. Please try again later',
  'unauthorized': 'Authentication required',
  'forbidden': 'Access denied',
  'not found': 'Resource not found',
  'validation': 'Invalid request data',
  'internal': 'An internal error occurred',
};

/**
 * Sanitize error messages to remove internal details
 * Requirements: 7.2
 * 
 * This function ensures that error messages returned to clients do not contain:
 * - Stack traces
 * - Internal file paths
 * - Environment variable names
 * - Database connection strings
 * - Internal error types
 * 
 * @param message - The original error message
 * @returns A sanitized, user-safe error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }
  
  // Trim and normalize whitespace
  const normalizedMessage = message.trim().replace(/\s+/g, ' ');
  
  // Check for patterns that indicate internal details
  for (const pattern of INTERNAL_ERROR_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      // Try to provide a more specific safe message based on content
      const lowerMessage = normalizedMessage.toLowerCase();
      for (const [key, safeMessage] of Object.entries(SAFE_ERROR_MESSAGES)) {
        if (lowerMessage.includes(key)) {
          return safeMessage;
        }
      }
      return 'An internal error occurred';
    }
  }
  
  // Check for multi-line messages (often contain stack traces)
  if (message.includes('\n') && message.split('\n').length > 2) {
    // Take only the first line if it looks safe
    const firstLine = message.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 200) {
      // Recursively check if first line is safe
      return sanitizeErrorMessage(firstLine);
    }
    return 'An internal error occurred';
  }
  
  // Truncate very long messages (may contain sensitive data)
  if (normalizedMessage.length > 200) {
    // Find a safe truncation point (end of sentence or word)
    const truncated = normalizedMessage.substring(0, 200);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPeriod = truncated.lastIndexOf('.');
    
    if (lastPeriod > 150) {
      return truncated.substring(0, lastPeriod + 1);
    } else if (lastSpace > 150) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  
  return normalizedMessage;
}

/**
 * Create a safe error from an unknown error value
 * Extracts message safely and sanitizes it
 * Requirements: 7.2
 * 
 * @param error - The error value (can be Error, string, or unknown)
 * @param fallbackMessage - Message to use if error cannot be processed
 * @returns A sanitized error message safe for client response
 */
export function getSafeErrorMessage(
  error: unknown,
  fallbackMessage: string = 'An error occurred'
): string {
  if (!error) {
    return sanitizeErrorMessage(fallbackMessage);
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Never expose stack traces
    // Only use the message, and sanitize it
    return sanitizeErrorMessage(error.message || fallbackMessage);
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return sanitizeErrorMessage(error);
  }
  
  // Handle objects with message property
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return sanitizeErrorMessage(errorObj.message);
    }
    if (typeof errorObj.error === 'string') {
      return sanitizeErrorMessage(errorObj.error);
    }
  }
  
  return sanitizeErrorMessage(fallbackMessage);
}

/**
 * Create a safe error response that doesn't expose internal details
 * Requirements: 7.2
 * 
 * @param message - The error message (will be sanitized)
 * @param status - HTTP status code
 * @param corsHeaders - CORS headers to include
 * @param code - Optional error code for client handling
 */
export function createErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  code?: string
): Response {
  // Strip internal details from error messages
  const safeMessage = sanitizeErrorMessage(message);
  
  const body: { error: string; code?: string } = { error: safeMessage };
  if (code) {
    body.code = code;
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create a safe error response from an unknown error
 * Convenience function that combines getSafeErrorMessage and createErrorResponse
 * Requirements: 7.2
 * 
 * @param error - The error value (can be Error, string, or unknown)
 * @param status - HTTP status code
 * @param corsHeaders - CORS headers to include
 * @param code - Optional error code for client handling
 * @param fallbackMessage - Message to use if error cannot be processed
 */
export function createSafeErrorResponse(
  error: unknown,
  status: number,
  corsHeaders: Record<string, string>,
  code?: string,
  fallbackMessage: string = 'An error occurred'
): Response {
  const safeMessage = getSafeErrorMessage(error, fallbackMessage);
  return createErrorResponse(safeMessage, status, corsHeaders, code);
}

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthorizedResponse(
  corsHeaders: Record<string, string>,
  message: string = 'Unauthorized'
): Response {
  return createErrorResponse(message, 401, corsHeaders, 'AUTH_INVALID');
}

/**
 * Create a 400 Bad Request response for validation errors
 */
export function createValidationErrorResponse(
  corsHeaders: Record<string, string>,
  message: string
): Response {
  return createErrorResponse(message, 400, corsHeaders, 'VALIDATION_ERROR');
}
