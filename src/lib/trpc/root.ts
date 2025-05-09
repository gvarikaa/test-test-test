import { router } from './server';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';
import { healthRouter } from './routers/health';
import { notificationRouter } from './routers/notification';
import { chatRouter } from './routers/chat';
import { aiRouter } from './routers/ai';
import { testRouter } from './routers/test';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  health: healthRouter,
  notification: notificationRouter,
  chat: chatRouter,
  ai: aiRouter,
  test: testRouter,
});

export type AppRouter = typeof appRouter;