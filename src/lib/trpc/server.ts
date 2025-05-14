import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// Define context type for App Router
type CreateContextOptions = {
  req: Request;
  res: Response;
};

export const createTRPCContext = async (opts: CreateContextOptions) => {
  const session = await getServerSession(authOptions);

  // Check if this is a query that has enabled: false in useQuery
  // This can be detected by checking headers or query parameters
  const url = new URL(opts.req.url);
  const isSkippedRequest = url.searchParams.has('skipAuth') ||
                           opts.req.headers.get('x-trpc-skip-auth') === 'true';

  return {
    db,
    session,
    req: opts.req,
    res: opts.res,
    isSkippedRequest,
  };
};

// Enable detailed logging in development only
const enableDebugLogging = process.env.NODE_ENV === 'development';

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  // Enhanced error formatting for better debugging
  errorFormatter({ shape, error }) {
    // Log error details in development for debugging
    if (enableDebugLogging) {
      console.error('[tRPC Error]', {
        path: shape.path,
        error: error.message,
        stack: error.stack,
        cause: error.cause,
      });
      
      // Enhanced logging for ZodError to help diagnose validation issues
      if (error.cause instanceof ZodError) {
        const zodError = error.cause;
        console.error('[ZodError Details]', {
          issues: zodError.issues,
          formErrors: zodError.flatten().formErrors,
          fieldErrors: zodError.flatten().fieldErrors,
        });
        
        // Show more detailed information about expected vs received
        zodError.issues.forEach((issue, i) => {
          console.error(`[ZodIssue ${i}]`, {
            code: issue.code,
            path: issue.path,
            message: issue.message,
            expected: issue.expected,
            received: issue.received,
          });
        });
      }
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Include more helpful error details for easier debugging
        code: shape.code,
        httpStatus: shape.httpStatus,
        path: shape.path,
        stack: enableDebugLogging ? error.stack : undefined,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

// Define middleware for performance logging in development
const performanceMiddleware = t.middleware(async ({ path, type, next }) => {
  // Skip performance tracking in production
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  // Log slow queries (> 100ms) to console
  if (durationMs > 100) {
    console.warn(`[tRPC Performance] 🐢 Slow ${type} on ${path}: ${durationMs}ms`);
  } else if (enableDebugLogging) {
    console.log(`[tRPC Performance] ⚡ ${type} on ${path}: ${durationMs}ms`);
  }

  return result;
});

// Middleware for token rate limiting
const tokenLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  // Skip for non-authenticated users
  if (!ctx.session?.user) {
    return next();
  }

  try {
    // Add token usage data to context for protected routes
    const userId = ctx.session.user.id;

    // This could be extended to check for rate limiting or token limits
    // Here we just pass through for now but update the context

    return next({
      ctx: {
        ...ctx,
        // Add token info to context for AI operations later
        tokenInfo: {
          userId,
          checked: true,
          timestamp: Date.now(),
        }
      }
    });
  } catch (error) {
    // Don't block the request, just log the error
    console.error('Error in token middleware:', error);
    return next();
  }
});

// Cache manager to avoid redundant requests
// A simple in-memory cache for development
const cacheManager = new Map<string, { data: any; timestamp: number }>();

// Middleware for caching repetitive queries with added safety for undefined inputs
const cacheMiddleware = t.middleware(async ({ path, rawInput, type, next }) => {
  // Only apply caching to queries, not mutations
  if (type !== 'query') {
    return next();
  }

  // Check if rawInput is undefined and convert it to an empty object to prevent JSON.stringify issues
  const safeInput = rawInput === undefined ? {} : rawInput;

  // Generate a cache key based on path and input
  const cacheKey = `${path}-${JSON.stringify(safeInput)}`;

  // Check if we have a cached response and it's less than 1 minute old
  const cachedItem = cacheManager.get(cacheKey);
  if (cachedItem && Date.now() - cachedItem.timestamp < 60000) {
    if (enableDebugLogging) {
      console.log(`[tRPC Cache] 🔵 Cache hit for ${path}`);
    }
    return { ok: true, data: cachedItem.data };
  }

  try {
    // Execute the request with error handling
    const result = await next();

    // Cache the response for future requests
    if (result.ok) {
      cacheManager.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });

      // Prevent the cache from growing too large
      if (cacheManager.size > 1000) {
        // Remove the oldest entry
        const oldestKey = [...cacheManager.entries()]
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
        cacheManager.delete(oldestKey);
      }

      if (enableDebugLogging) {
        console.log(`[tRPC Cache] 🟢 Cache set for ${path}`);
      }
    }

    return result;
  } catch (error) {
    if (enableDebugLogging) {
      console.error(`[tRPC Cache] ❌ Error in ${path}:`, error);
    }
    throw error;
  }
});

// Base procedures with performance tracking and optional caching
const baseProcedure = t.procedure
  .use(performanceMiddleware)
  .use(cacheMiddleware);

export const router = t.router;
export const publicProcedure = baseProcedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  // Skip auth check if the query is disabled via useQuery's enabled: false
  if (ctx.isSkippedRequest) {
    return next({ ctx });
  }

  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = baseProcedure
  .use(tokenLimitMiddleware)
  .use(enforceUserIsAuthed);

// Middleware to check if the user is an admin
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Check if the user has admin role in the database
  const user = await ctx.db.User.findUnique({
    where: { id: ctx.session.user.id },
    select: { id: true, email: true }
  });

  // For now, we're using a simplified check - in a real system
  // this would likely check a role field or admin table
  const adminEmails = ['admin@dapdip.com', 'moderator@dapdip.com'];
  const isAdmin = user && user.email && adminEmails.includes(user.email);

  if (!isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not an admin' });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      isAdmin: true,
    },
  });
});

export const adminProcedure = t.procedure.use(enforceUserIsAdmin);