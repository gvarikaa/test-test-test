"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import dynamic from 'next/dynamic';

// Dynamically import the ReactQueryDevtools to avoid including in production bundle
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(mod => mod.ReactQueryDevtools),
  { ssr: false }
);
import type { AppRouter } from "@/lib/trpc/root";

export const api = createTRPCReact<AppRouter>();

// Helper function to determine the base URL
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // Browser should use relative URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use Vercel URL
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // Keep data fresh for 5 seconds
        cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
        retry: (failureCount, error) => {
          // Don't retry on 400 errors (client errors)
          if (
            error instanceof Error &&
            'status' in (error as any) &&
            (error as any).status === 400
          ) {
            return false;
          }
          // Otherwise retry up to 3 times
          return failureCount < 3;
        },
        // Add refetch on window focus for better UX with real-time data
        refetchOnWindowFocus: true,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          // You can pass any HTTP headers you wish here
          headers() {
            return {
              "x-trpc-source": "react",
              // We'll let the server know if this is for a protected procedure
              // with enabled: false (this is a workaround since tRPC doesn't
              // directly support conditional auth)
              "x-trpc-skip-auth": "true",
            };
          },
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Only include DevTools in development */}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
      </QueryClientProvider>
    </api.Provider>
  );
}