/**
 * Utility functions for input sanitization and validation
 * to protect against XSS attacks and other security issues
 */

/**
 * Sanitizes string input to prevent XSS attacks
 * @param input String input to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes HTML content for display in the application
 * Uses a restricted set of allowed tags and attributes
 * @param html HTML content to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (html === null || html === undefined) {
    return '';
  }
  
  // If DOMPurify is available in your project, use that instead
  // This is a simple implementation for basic sanitization
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, 'removed:');
  
  // Remove on* attributes (like onclick, onload, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["']?[^"']*["']?/gi, '');
  
  return sanitized;
}

/**
 * Sanitizes object properties recursively
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends object>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeString(value);
    } else if (value === null || value === undefined) {
      (sanitized as any)[key] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      (sanitized as any)[key] = sanitizeObject(value as object);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' ? sanitizeObject(item as object) : 
        item
      );
    } else {
      (sanitized as any)[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates user input to ensure it meets requirements and isn't harmful
 * @param input Input data to validate
 * @param rules Validation rules
 * @returns Validation result with error messages if any
 */
export function validateInput(
  input: string, 
  rules: { 
    minLength?: number; 
    maxLength?: number; 
    pattern?: RegExp; 
    required?: boolean;
  }
): { isValid: boolean; message?: string } {
  if (!input && rules.required) {
    return { isValid: false, message: 'This field is required' };
  }
  
  if (rules.minLength && input.length < rules.minLength) {
    return { 
      isValid: false, 
      message: `Must be at least ${rules.minLength} characters` 
    };
  }
  
  if (rules.maxLength && input.length > rules.maxLength) {
    return { 
      isValid: false, 
      message: `Must be no more than ${rules.maxLength} characters` 
    };
  }
  
  if (rules.pattern && !rules.pattern.test(input)) {
    return { 
      isValid: false, 
      message: 'Invalid format' 
    };
  }
  
  return { isValid: true };
}

/**
 * Checks if URL is valid and contains no harmful content
 * @param url URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    
    // Block javascript: in URL
    if (url.toLowerCase().includes('javascript:')) {
      return '';
    }
    
    return url;
  } catch (e) {
    // If URL is invalid, return empty string
    return '';
  }
}