"use client";

import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

/**
 * A client component wrapper for ErrorBoundary 
 * that can be used in server components through dynamic imports
 */
export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error);
      // logErrorToService(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}