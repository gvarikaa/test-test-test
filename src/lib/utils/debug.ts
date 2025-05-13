/**
 * Debug utilities for easier troubleshooting without polluting the console
 * in production environments.
 */

// Configuration
const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_LEVELS = ['info', 'warn', 'error', 'debug'];
const ACTIVE_AREAS = process.env.DEBUG_AREAS ? 
  process.env.DEBUG_AREAS.split(',') : 
  ['auth', 'api', 'db', 'ai', 'ui', 'feed', 'performance'];

// Type definitions
type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type DebugArea = 'auth' | 'api' | 'db' | 'ai' | 'ui' | 'feed' | 'performance' | string;

interface LogOptions {
  area: DebugArea;
  level?: LogLevel;
  timestamp?: boolean;
  trace?: boolean;
}

/**
 * Log a message to the console if debug mode is enabled
 */
export function debug(message: string, options: LogOptions): void {
  const { area, level = 'info', timestamp = true, trace = false } = options;
  
  // Only log if debug mode is enabled and area is active
  if (!DEBUG_MODE || !ACTIVE_AREAS.includes(area)) {
    return;
  }
  
  // Create formatted message
  const formattedMessage = formatMessage(message, area, timestamp);
  
  // Log based on level
  switch (level) {
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      if (trace) {
        console.trace();
      }
      break;
    case 'debug':
      console.debug(formattedMessage);
      break;
    case 'info':
    default:
      console.log(formattedMessage);
      break;
  }
}

/**
 * Format a debug message with timestamp and area
 */
function formatMessage(message: string, area: string, includeTimestamp: boolean): string {
  const timestamp = includeTimestamp ? `[${new Date().toISOString()}]` : '';
  return `${timestamp} [${area.toUpperCase()}] ${message}`;
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, startTime: number, data?: any): void {
  const duration = Date.now() - startTime;
  
  debug(`Operation: ${operation} - Duration: ${duration}ms`, {
    area: 'performance',
    level: duration > 500 ? 'warn' : 'info'
  });
  
  if (data && DEBUG_MODE) {
    debug(`Performance data: ${JSON.stringify(data)}`, {
      area: 'performance',
      level: 'debug'
    });
  }
}

/**
 * Create area-specific loggers
 */
export function createLogger(defaultArea: DebugArea) {
  return {
    info: (message: string, options: Partial<LogOptions> = {}) => {
      debug(message, { area: defaultArea, level: 'info', ...options });
    },
    warn: (message: string, options: Partial<LogOptions> = {}) => {
      debug(message, { area: defaultArea, level: 'warn', ...options });
    },
    error: (message: string, options: Partial<LogOptions> = {}) => {
      debug(message, { area: defaultArea, level: 'error', ...options });
    },
    debug: (message: string, options: Partial<LogOptions> = {}) => {
      debug(message, { area: defaultArea, level: 'debug', ...options });
    },
    performance: (operation: string, startTime: number, data?: any) => {
      logPerformance(operation, startTime, data);
    }
  };
}

// Create pre-configured loggers for common areas
export const loggers = {
  auth: createLogger('auth'),
  api: createLogger('api'),
  db: createLogger('db'),
  ai: createLogger('ai'),
  ui: createLogger('ui'),
  feed: createLogger('feed'),
  performance: createLogger('performance')
};