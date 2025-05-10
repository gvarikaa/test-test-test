import { router } from './server';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';
import { healthRouter } from './routers/health';
import { notificationRouter } from './routers/notification';
import { chatRouter } from './routers/chat';
import { aiRouter } from './routers/ai';
import { testRouter } from './routers/test';
import { searchRouter } from './routers/search';
import { groupRouter } from './routers/group';
import { reelRouter } from './routers/reel';
import { storyRouter } from './routers/story';
import { eventRouter } from './routers/event';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  health: healthRouter,
  notification: notificationRouter,
  chat: chatRouter,
  ai: aiRouter,
  test: testRouter,
  search: searchRouter,
  group: groupRouter,
  reel: reelRouter,
  story: storyRouter,
  event: eventRouter,
});

export type AppRouter = typeof appRouter;