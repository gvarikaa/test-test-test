/**
 * This file is an alias to the API from the trpc provider.
 * This is mainly for backward compatibility with code that imports from @/lib/trpc/client.
 */

import { api } from '@/providers/trpc-provider';

// Export the API as 'trpc' to match the old import name
export const trpc = api;