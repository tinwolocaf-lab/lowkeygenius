/**
 * XSS Sanitization utilities for user-generated content
 * Provides functions to escape and sanitize content to prevent Cross-Site Scripting attacks
 * 
 * Requirements: 3.5 - WHEN user input contains potential XSS payloads 
 * THEN the system SHALL sanitize or escape the content before storage and display
 */

/**
 * Result of XSS sanitization
 */
export interface SanitizationResult {
  sanitizedText: string;
  wasModified: boolean;
  detectedPatterns: string[];
}

/**
 * HTML entities map for escaping special characters
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Dangerous HTML tags that should be removed or escaped
 */
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'style',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'layer',
  'ilayer',
  'bgsound',
  'title',
  'svg',
  'math',
];

/**
 * Dangerous attributes that can execute JavaScript
 */
const DANGEROUS_ATTRIBUTES = [
  'onabort',
  'onblur',
  'onchange',
  'onclick',
  'ondblclick',
  'onerror',
  'onfocus',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onmousedown',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onreset',
  'onresize',
  'onscroll',
  'onselect',
  'onsubmit',
  'onunload',
  'onbeforeunload',
  'oncontextmenu',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'oninput',
  'oninvalid',
  'onmouseenter',
  'onmouseleave',
  'onmousewheel',
  'onwheel',
  'oncopy',
  'oncut',
  'onpaste',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'ontransitionend',
  'onpointerdown',
  'onpointermove',
  'onpointerup',
  'onpointercancel',
  'onpointerenter',
  'onpointerleave',
  'onpointerover',
  'onpointerout',
  'ontouchstart',
  'ontouchmove',
  'ontouchend',
  'ontouchcancel',
];

/**
 * Patterns that indicate potential XSS attacks
 */
const XSS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Script tags
  { pattern: /<script\b[^>]*>[\s\S]*?<\/script>/gi, name: 'script-tag' },
  { pattern: /<script\b[^>]*>/gi, name: 'script-open-tag' },
  
  // Event handlers
  { pattern: /\bon\w+\s*=/gi, name: 'event-handler' },
  
  // JavaScript URLs
  { pattern: /javascript\s*:/gi, name: 'javascript-url' },
  { pattern: /vbscript\s*:/gi, name: 'vbscript-url' },
  { pattern: /data\s*:\s*text\/html/gi, name: 'data-html-url' },
  
  // Expression injection
  { pattern: /expression\s*\(/gi, name: 'css-expression' },
  
  // SVG/XML injection
  { pattern: /<svg\b[^>]*>/gi, name: 'svg-tag' },
  { pattern: /<math\b[^>]*>/gi, name: 'math-tag' },
  
  // Iframe injection
  { pattern: /<iframe\b[^>]*>/gi, name: 'iframe-tag' },
  
  // Object/embed injection
  { pattern: /<object\b[^>]*>/gi, name: 'object-tag' },
  { pattern: /<embed\b[^>]*>/gi, name: 'embed-tag' },
  
  // Form injection
  { pattern: /<form\b[^>]*>/gi, name: 'form-tag' },
  
  // Style injection
  { pattern: /<style\b[^>]*>[\s\S]*?<\/style>/gi, name: 'style-tag' },
  
  // Base tag (can redirect all relative URLs)
  { pattern: /<base\b[^>]*>/gi, name: 'base-tag' },
  
  // Meta refresh
  { pattern: /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/gi, name: 'meta-refresh' },
];

/**
 * Escape HTML special characters to prevent XSS
 * This is the safest approach - converts all special characters to HTML entities
 * 
 * Use this when you want to display user content as plain text
 * 
 * @param text - The text to escape
 * @returns Escaped text safe for HTML display
 * 
 * Requirements: 3.5
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Unescape HTML entities back to their original characters
 * Use with caution - only on content you trust
 * 
 * @param text - The escaped text to unescape
 * @returns Original text with HTML entities decoded
 */
export function unescapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const reverseEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&#39;': "'",
    '&#47;': '/',
    '&#96;': '`',
    '&#61;': '=',
  };

  return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#39|#47|#96|#61);/g, 
    (entity) => reverseEntities[entity] || entity
  );
}

/**
 * Remove dangerous HTML tags and attributes while preserving safe content
 * This is more permissive than escapeHtml - allows some HTML but removes dangerous elements
 * 
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML with dangerous elements removed
 * 
 * Requirements: 3.5
 */
export function sanitizeHtml(html: string): SanitizationResult {
  if (!html || typeof html !== 'string') {
    return {
      sanitizedText: '',
      wasModified: false,
      detectedPatterns: [],
    };
  }

  let sanitized = html;
  const detectedPatterns: string[] = [];
  const originalLength = html.length;

  // Detect and remove XSS patterns
  for (const { pattern, name } of XSS_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    
    if (pattern.test(sanitized)) {
      detectedPatterns.push(name);
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, '');
    }
    pattern.lastIndex = 0;
  }

  // Remove dangerous tags (opening and closing)
  for (const tag of DANGEROUS_TAGS) {
    const openTagPattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    const closeTagPattern = new RegExp(`</${tag}>`, 'gi');
    
    if (openTagPattern.test(sanitized)) {
      detectedPatterns.push(`${tag}-tag`);
      sanitized = sanitized.replace(openTagPattern, '');
    }
    sanitized = sanitized.replace(closeTagPattern, '');
  }

  // Remove dangerous attributes from remaining tags
  for (const attr of DANGEROUS_ATTRIBUTES) {
    const attrPattern = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    const attrPatternUnquoted = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    
    if (attrPattern.test(sanitized) || attrPatternUnquoted.test(sanitized)) {
      detectedPatterns.push(`${attr}-attribute`);
      sanitized = sanitized.replace(attrPattern, '');
      sanitized = sanitized.replace(attrPatternUnquoted, '');
    }
  }

  // Remove javascript: and vbscript: URLs from href and src attributes
  sanitized = sanitized.replace(
    /\b(href|src|action|formaction|poster|data)\s*=\s*["']?\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"'\s>]*/gi,
    '$1=""'
  );

  // Remove style attributes that might contain expressions
  sanitized = sanitized.replace(
    /\bstyle\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi,
    ''
  );

  // Deduplicate detected patterns
  const uniquePatterns = [...new Set(detectedPatterns)];

  return {
    sanitizedText: sanitized,
    wasModified: sanitized.length !== originalLength || uniquePatterns.length > 0,
    detectedPatterns: uniquePatterns,
  };
}

/**
 * Check if text contains potential XSS payloads
 * 
 * @param text - The text to check
 * @returns true if potential XSS patterns are detected
 * 
 * Requirements: 3.5
 */
export function containsXssPayload(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  for (const { pattern } of XSS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      return true;
    }
    pattern.lastIndex = 0;
  }

  return false;
}

/**
 * Sanitize content for safe display in markdown
 * Escapes HTML but preserves markdown formatting
 * 
 * @param content - The markdown content to sanitize
 * @returns Sanitized content safe for markdown rendering
 * 
 * Requirements: 3.5
 */
export function sanitizeForMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // First, detect if there are any XSS patterns
  if (!containsXssPayload(content)) {
    return content;
  }

  // Remove script tags and their content
  let sanitized = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:[^"'\s)>]*/gi, '');
  sanitized = sanitized.replace(/vbscript\s*:[^"'\s)>]*/gi, '');
  
  // Remove dangerous tags but keep their content
  for (const tag of DANGEROUS_TAGS) {
    const tagPattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '$1');
    
    // Also remove self-closing or unclosed dangerous tags
    const selfClosingPattern = new RegExp(`<${tag}\\b[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingPattern, '');
  }

  return sanitized;
}

/**
 * Sanitize user input for safe storage
 * More aggressive sanitization for content that will be stored in the database
 * 
 * @param input - The user input to sanitize
 * @returns Sanitized input safe for storage
 * 
 * Requirements: 3.5
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Escape all HTML entities for storage
  return escapeHtml(input);
}

/**
 * Sanitize URL to prevent javascript: and other dangerous protocols
 * 
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 * 
 * Requirements: 3.5
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application/javascript',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', '#', '/'];
  const hasProtocol = trimmedUrl.includes(':');
  
  if (hasProtocol) {
    const isSafe = safeProtocols.some(protocol => 
      trimmedUrl.startsWith(protocol) || trimmedUrl.startsWith(protocol.replace(':', '://'))
    );
    
    if (!isSafe) {
      return '';
    }
  }

  return url;
}
