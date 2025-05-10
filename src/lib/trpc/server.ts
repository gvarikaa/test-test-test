import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// Define context type for App Router
type CreateContextOptions = {
  req: Request;
  res: Response;
};

export const createTRPCContext = async (opts: CreateContextOptions) => {
  const session = await getServerSession(authOptions);

  return {
    db,
    session,
    req: opts.req,
    res: opts.res,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Middleware to check if the user is an admin
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Check if the user has admin role in the database
  const user = await ctx.db.user.findUnique({
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