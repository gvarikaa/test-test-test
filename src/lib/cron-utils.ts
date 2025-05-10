import * as cronParser from 'cron-parser';

/**
 * Utility functions for working with cron expressions
 */

/**
 * Format a cron pattern into a human-readable string
 * @param pattern The cron pattern (e.g., "0 9 * * 1")
 * @returns Human-readable description of the pattern
 */
export function formatCronPattern(pattern: string): string {
  // Common cron patterns
  const commonPatterns: Record<string, string> = {
    "0 9 * * 1": "Every Monday at 9:00 AM",
    "0 9 * * 1-5": "Every weekday at 9:00 AM",
    "0 12 * * *": "Every day at 12:00 PM",
    "0 0 1 * *": "First day of each month at 12:00 AM",
    "0 0 * * 0": "Every Sunday at 12:00 AM",
    "0 0 * * *": "Every day at 12:00 AM",
    "0 */2 * * *": "Every 2 hours",
    "0 */6 * * *": "Every 6 hours",
    "*/5 * * * *": "Every 5 minutes",
    "*/30 * * * *": "Every 30 minutes",
    "0 0 */7 * *": "Every 7 days",
    "0 8 15 * *": "15th day of each month at 8:00 AM",
    "0 0 * * 1,3,5": "Every Monday, Wednesday, and Friday at 12:00 AM",
  };

  // Check if it's a common pattern
  if (commonPatterns[pattern]) {
    return commonPatterns[pattern];
  }

  // Try to parse and describe the pattern
  try {
    const interval = cronParser.parseExpression(pattern);
    const next = interval.next().toDate();
    const next2 = interval.next().toDate();
    const next3 = interval.next().toDate();
    
    // Reset the interval for description
    const parts = pattern.split(' ');
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Dynamic description based on pattern parts
    let description = "";
    
    // Check for frequency type
    if (minute.includes('*/')) {
      const minutes = parseInt(minute.replace('*/', ''));
      if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
    
    if (hour.includes('*/')) {
      const hours = parseInt(hour.replace('*/', ''));
      if (minute.startsWith('0') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
      }
    }
    
    // Just return the next few occurrence times
    return `Next occurrences: ${next.toLocaleString()}, ${next2.toLocaleString()}, ${next3.toLocaleString()}`;
  } catch (error) {
    return `Invalid cron pattern: ${error.message}`;
  }
}

/**
 * Get the next N occurrences for a cron pattern
 * @param pattern The cron pattern
 * @param count Number of occurrences to get (default: 5)
 * @returns Array of dates for the next occurrences
 */
export function getNextOccurrences(pattern: string, count: number = 5): Date[] {
  try {
    const interval = cronParser.parseExpression(pattern);
    const occurrences: Date[] = [];
    
    for (let i = 0; i < count; i++) {
      occurrences.push(interval.next().toDate());
    }
    
    return occurrences;
  } catch (error) {
    console.error(`Error parsing cron pattern: ${pattern}`, error);
    return [];
  }
}

/**
 * Check if a cron pattern is valid
 * @param pattern The cron pattern to validate
 * @returns A validation result object
 */
export function validateCronPattern(pattern: string): { 
  isValid: boolean; 
  error?: string;
  nextOccurrence?: Date;
} {
  try {
    const interval = cronParser.parseExpression(pattern);
    const nextOccurrence = interval.next().toDate();
    
    return { isValid: true, nextOccurrence };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Create common cron expression options
 * @returns An array of cron pattern options
 */
export function getCronOptions(): Array<{ label: string; value: string; }> {
  return [
    { label: "Every minute", value: "* * * * *" },
    { label: "Every 5 minutes", value: "*/5 * * * *" },
    { label: "Every 30 minutes", value: "*/30 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every day at midnight", value: "0 0 * * *" },
    { label: "Every day at 8 AM", value: "0 8 * * *" },
    { label: "Every day at noon", value: "0 12 * * *" },
    { label: "Every weekday at 9 AM", value: "0 9 * * 1-5" },
    { label: "Every Monday at 9 AM", value: "0 9 * * 1" },
    { label: "First day of month at midnight", value: "0 0 1 * *" },
    { label: "Every Sunday at midnight", value: "0 0 * * 0" },
  ];
}