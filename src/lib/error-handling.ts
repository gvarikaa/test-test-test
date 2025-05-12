/**
 * Centralized error handling utilities for the application
 * Provides consistent error handling, logging, and reporting
 */

import { TRPCError } from '@trpc/server';
import { loggers } from './utils/debug';

/**
 * Custom error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  RATE_LIMIT = 'RATE_LIMIT',
  TOKEN_LIMIT = 'TOKEN_LIMIT',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Maps application error types to HTTP status codes
 */
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.RESOURCE_NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.EXTERNAL_SERVICE]: 502,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.TOKEN_LIMIT]: 403,
  [ErrorType.INTERNAL_SERVER]: 500,
  [ErrorType.UNKNOWN]: 500,
};

/**
 * Maps application error types to TRPC error codes
 */
const TRPC_ERROR_CODES: Record<ErrorType, any> = {
  [ErrorType.VALIDATION]: 'BAD_REQUEST',
  [ErrorType.AUTHENTICATION]: 'UNAUTHORIZED',
  [ErrorType.AUTHORIZATION]: 'FORBIDDEN',
  [ErrorType.RESOURCE_NOT_FOUND]: 'NOT_FOUND',
  [ErrorType.CONFLICT]: 'CONFLICT',
  [ErrorType.EXTERNAL_SERVICE]: 'INTERNAL_SERVER_ERROR',
  [ErrorType.RATE_LIMIT]: 'TOO_MANY_REQUESTS',
  [ErrorType.TOKEN_LIMIT]: 'FORBIDDEN',
  [ErrorType.INTERNAL_SERVER]: 'INTERNAL_SERVER_ERROR',
  [ErrorType.UNKNOWN]: 'INTERNAL_SERVER_ERROR',
};

/**
 * Application error class with improved error handling
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: any;
  public readonly isSafeForClient: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    details?: any,
    isSafeForClient: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = ERROR_STATUS_CODES[type];
    this.errorCode = type;
    this.details = details;
    this.isSafeForClient = isSafeForClient;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to a TRPC error
   */
  toTRPCError(): TRPCError {
    return new TRPCError({
      code: TRPC_ERROR_CODES[this.type],
      message: this.message,
      cause: this,
    });
  }

  /**
   * Convert to a JSON serializable object
   */
  toJSON(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      message: this.message,
      ...(this.isSafeForClient && this.details ? { details: this.details } : {}),
    };
  }

  /**
   * Get a client-safe version of this error
   * Removes any sensitive information
   */
  toClientError(): Record<string, any> {
    if (this.isSafeForClient) {
      return this.toJSON();
    }

    return {
      errorCode: this.errorCode,
      message: 'An error occurred',
    };
  }
}

/**
 * Handle an error consistently throughout the application
 * Logs the error and returns an appropriate response
 */
export function handleError(error: unknown, context: string): AppError {
  if (error instanceof AppError) {
    // Log the error with its details
    loggers.api.error(`${context}: ${error.message}`, {
      trace: true,
    });
    return error;
  }

  // Handle TRPCError
  if (error instanceof TRPCError) {
    const appErrorType = Object.entries(TRPC_ERROR_CODES).find(
      ([, code]) => code === error.code
    )?.[0] as ErrorType | undefined;

    const appError = new AppError(
      error.message,
      appErrorType || ErrorType.UNKNOWN,
      error.cause
    );

    loggers.api.error(`${context}: ${error.message}`, {
      trace: true,
    });

    return appError;
  }

  // Handle standard Error
  if (error instanceof Error) {
    const appError = new AppError(
      error.message,
      ErrorType.UNKNOWN,
      { stack: error.stack }
    );

    loggers.api.error(`${context}: ${error.message}`, {
      trace: true,
    });

    return appError;
  }

  // Handle unknown errors
  const appError = new AppError(
    'An unknown error occurred',
    ErrorType.UNKNOWN,
    { originalError: error }
  );

  loggers.api.error(`${context}: Unknown error`, {
    trace: true,
  });

  return appError;
}

/**
 * Global error handler for unhandled errors
 * Should be installed at app startup
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    loggers.api.error('Unhandled Promise Rejection', {
      area: 'system',
      level: 'error',
      trace: true,
    });
    console.error('Unhandled Promise Rejection:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    loggers.api.error('Uncaught Exception', {
      area: 'system',
      level: 'error',
      trace: true,
    });
    console.error('Uncaught Exception:', error);
    
    // In production, you might want to:
    // 1. Log the error to an error reporting service
    // 2. Attempt to gracefully shutdown 
    // 3. Notify operators
    
    // Don't exit the process in development
    if (process.env.NODE_ENV === 'production') {
      // Give the process time to log the error
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
}

/**
 * Install client-side error handlers
 * Should be called in a client component
 */
export function setupClientErrorHandlers() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections in the browser
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      // Log to service
      // logToService('Unhandled Promise Rejection', event.reason);
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught Error:', event.error);
      // Log to service
      // logToService('Uncaught Error', event.error);
    });
  }
}