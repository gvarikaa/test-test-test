/**
 * This utility provides helper functions to ensure that input objects are always
 * properly formatted before being sent to the server, particularly for tRPC calls.
 */

import { TRPCClientError } from '@trpc/client';

/**
 * Ensures that an input object is valid and contains required fields
 * @param input The input object to validate
 * @param requiredFields List of field names that must be present and non-empty
 * @returns The validated input or throws an error
 */
export function validateInput<T extends Record<string, any>>(
  input: T | undefined | null,
  requiredFields: string[] = []
): T {
  // Make sure input exists
  if (!input) {
    throw new Error('Input cannot be null or undefined');
  }

  // Make sure input is an object
  if (typeof input !== 'object') {
    throw new Error(`Input must be an object, received ${typeof input}`);
  }

  // Check for required fields
  for (const field of requiredFields) {
    if (!input[field]) {
      throw new Error(`Required field '${field}' is missing or empty`);
    }
  }

  return input;
}

/**
 * Creates a safe input object that has fallback values for all potentially undefined properties
 * @param input The original input that might have undefined values
 * @param defaultValues Default values to use for missing fields
 * @returns A new object with no undefined values
 */
export function createSafeInput<T extends Record<string, any>>(
  input: Partial<T> | undefined | null,
  defaultValues: Partial<T> = {}
): T {
  // Start with empty object if input is null/undefined
  const baseInput = input || {};
  
  // Combine with default values
  return { ...defaultValues, ...baseInput } as T;
}

/**
 * Safely handles errors from tRPC calls, especially focusing on detecting 
 * "object expected, received undefined" errors
 * @param error The error to handle
 * @returns A user-friendly error message
 */
export function handleTRPCError(error: unknown): string {
  if (error instanceof TRPCClientError) {
    // Check for the specific "object expected, received undefined" error pattern
    if (error.message.includes('object') && error.message.includes('undefined')) {
      return 'Invalid data format. Please check input values and try again.';
    }
    
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}