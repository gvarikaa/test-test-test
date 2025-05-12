import { router } from './server';
import { userRouter } from './routers/user';
// import { postRouter } from './routers/post';  // Original post router with errors
// import { postRouter } from './routers/post-fixed';  // Fixed post router without poll references
import { postRouter } from './routers/post-minimal';  // Minimal post router with minimal relations
import { healthRouter } from './routers/health';
import { notificationRouter } from './routers/notification';
import { chatRouter } from './routers/chat';
import { aiRouter } from './routers/ai';
import { testRouter } from './routers/test';
import { searchRouter } from './routers/search';
import { groupRouter } from './routers/group';
import { reelRouter } from './routers/reel';
// import { storyRouter } from './routers/story';  // Original story router with potential errors
import { storyRouter } from './routers/story-minimal';  // Minimal story router with simplified queries
import { eventRouter } from './routers/event';
import { personalizationRouter } from './routers/personalization';
import { seoRouter } from './routers/seo';
import { commentAnalysisRouter } from './routers/comment-analysis';
import { postFallbackRouter } from './routers/post-fallback'; // Fallback router as backup

// Debug flag to help troubleshoot tRPC import issues
console.log("🔧 TRPC Root: Using post-minimal and story-minimal routers with simplified queries");

export const appRouter = router({
  user: userRouter,
  post: postRouter, // Using minimal post router with minimal relations
  postFallback: postFallbackRouter, // Keeping fallback router available if needed
  health: healthRouter,
  notification: notificationRouter,
  chat: chatRouter,
  ai: aiRouter,
  test: testRouter,
  search: searchRouter,
  group: groupRouter,
  reel: reelRouter,
  story: storyRouter, // Using minimal story router with simplified queries
  event: eventRouter,
  personalization: personalizationRouter,
  seo: seoRouter,
  commentAnalysis: commentAnalysisRouter,
});

export type AppRouter = typeof appRouter;