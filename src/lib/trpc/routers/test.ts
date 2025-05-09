import { z } from 'zod';
import { publicProcedure, router } from '../server';

export const testRouter = router({
  hello: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
      }),
    )
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name || 'World'}!`,
        timestamp: new Date().toISOString(),
      };
    }),
  
  ping: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }),
});