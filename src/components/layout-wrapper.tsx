"use client";

import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { AuthProvider } from "@/providers/auth-provider";
import { TRPCProvider } from "@/providers/trpc-provider";
import { ThemeProvider } from "@/providers/theme-provider";

interface LayoutWrapperProps {
  children: ReactNode;
}

/**
 * A client component wrapper for the entire application layout
 * This is used to wrap server components with client functionality
 */
export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error);
      // logErrorToService(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <AuthProvider>
        <TRPCProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <script dangerouslySetInnerHTML={{
              __html: `
                // Force dark mode
                document.documentElement.classList.add('dark');
              `
            }} />
            {children}
          </ThemeProvider>
        </TRPCProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}