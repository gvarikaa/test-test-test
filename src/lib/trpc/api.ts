/**
 * This file is used as a reference for how the tRPC client is configured.
 * The actual tRPC client is now created in @/providers/trpc-provider.tsx
 * which is specifically designed for the Next.js App Router.
 *
 * @deprecated Use the API from @/providers/trpc-provider.tsx instead
 */

// Import the provider
import { api } from '@/providers/trpc-provider';

// Re-export the API from the provider
export { api };