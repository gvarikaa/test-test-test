import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/root";
import { createTRPCContext } from "@/lib/trpc/server";

// Create a response object for the context
// App Router needs this pattern instead of the old Pages Router context
export const GET = async (req: Request, _params: { params: { trpc: string } }) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => createTRPCContext({
      req,
      res: new Response()
    }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
};

export const POST = async (req: Request, _params: { params: { trpc: string } }) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => createTRPCContext({
      req,
      res: new Response()
    }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
};