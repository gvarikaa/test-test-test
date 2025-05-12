/**
 * Extended type definitions for the API
 * These types augment the default API types with additional properties and metadata
 * for improved type safety and developer experience
 */

export type APIResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type APIErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  cursor?: string;
};

export type SortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type FilterParams = {
  [key: string]: string | number | boolean | string[] | undefined;
};

export type QueryParams = PaginationParams & SortParams & FilterParams;

export type APIResourceType = 
  | 'post'
  | 'user'
  | 'comment'
  | 'story'
  | 'notification'
  | 'message'
  | 'event'
  | 'group'
  | 'reel'
  | 'token'
  | 'aiAnalysis';

// Define custom error types for better error handling
export type APIErrorCode = 
  | 'VALIDATION_ERROR' 
  | 'AUTHENTICATION_ERROR' 
  | 'AUTHORIZATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

// Hook response types
export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
};

// Enhanced token types
export type TokenStatistics = {
  used: number;
  total: number;
  remaining: number;
  nextRefresh: string;
  usageHistory: {
    date: string;
    used: number;
  }[];
  usageByFeature: {
    [feature: string]: number;
  };
};

// AI specific types
export type AIModel = 'gemini-1.5-pro' | 'gemini-pro' | 'gemini-pro-vision';

export type AIRequest = {
  model: AIModel;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
};

export type AIFeature = 
  | 'content-analysis'
  | 'fact-checking'
  | 'post-enhancement'
  | 'sentiment-analysis'
  | 'feed-personalization'
  | 'chat-assistant';

export type AIOperation = {
  featureId: AIFeature;
  modelId: AIModel;
  tokensUsed: number;
  startTime: string;
  duration: number;
  success: boolean;
};

// Notification specific types
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type NotificationPayload = {
  title: string;
  message: string;
  level: NotificationLevel;
  link?: string;
  image?: string;
  expiresAt?: string;
};