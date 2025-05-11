import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { Visibility } from '@prisma/client';

export const postRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        personalized: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, personalized } = input;
      const userId = ctx.session?.user?.id;

      // If user is logged in and wants personalized content, use personalization system
      if (personalized && userId) {
        try {
          // Import the personalization function
          const { generatePersonalizedFeed, ContentType } = await import('@/lib/personalization');

          // Get personalized content IDs with scores and reasons
          const recommendations = await generatePersonalizedFeed(
            userId,
            ContentType.POST,
            limit + (cursor ? 1 : 0) // Add one extra if we have a cursor
          );

          // Extract just the IDs, preserving order
          let postIds = recommendations.map(rec => rec.id);

          // Apply cursor if provided
          if (cursor) {
            const cursorIndex = postIds.indexOf(cursor);
            if (cursorIndex !== -1) {
              postIds = postIds.slice(cursorIndex + 1);
            }
          }

          // Fetch the actual posts
          const posts = await ctx.db.post.findMany({
            where: {
              id: {
                in: postIds,
              },
              published: true,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              media: true,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                },
              },
              aiAnalysis: {
                select: {
                  id: true,
                  sentiment: true,
                  topics: true,
                },
              },
            },
          });

          // Re-sort to match the original recommendation order
          const sortedPosts = postIds
            .map(id => posts.find(post => post.id === id))
            .filter(Boolean);

          // Determine next cursor
          let nextCursor: typeof cursor = undefined;
          if (sortedPosts.length > 0 && recommendations.length > postIds.length) {
            nextCursor = sortedPosts[sortedPosts.length - 1]?.id;
          }

          // Add recommendation metadata to each post
          const postsWithRecommendationData = sortedPosts.map(post => {
            const recommendation = recommendations.find(rec => rec.id === post?.id);
            return {
              ...post,
              recommendationMetadata: recommendation ? {
                reason: recommendation.reason,
                source: recommendation.source,
                score: recommendation.score,
                explanation: recommendation.metadata?.explanation,
              } : null,
            };
          });

          return {
            posts: postsWithRecommendationData,
            nextCursor,
          };
        } catch (error) {
          console.error('Error fetching personalized posts:', error);
          // Fall back to standard feed if personalization fails
        }
      }

      // Standard non-personalized feed or fallback
      // Build the where clause
      const whereClause: {
        published: boolean;
        OR: Array<object>;
        id?: { lt: string };
      } = {
        published: true,
        OR: [
          { visibility: 'PUBLIC' },
          userId ? {
            visibility: 'FRIENDS',
            user: {
              friends: {
                some: {
                  friendId: userId,
                  status: 'ACCEPTED',
                },
              },
            },
          } : {},
          userId ? { userId } : {},
        ],
      };

      // If a cursor is provided, only fetch posts created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          media: true,
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
          aiAnalysis: {
            select: {
              id: true,
              sentiment: true,
              topics: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          media: true,
          comments: {
            where: {
              parentId: null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  reactions: true,
                  replies: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
          reactions: userId ? {
            where: {
              userId,
            },
            select: {
              type: true,
            },
            take: 1,
          } : undefined,
          _count: {
            select: {
              reactions: true,
              comments: true,
              savedBy: true,
            },
          },
          aiAnalysis: {
            select: {
              id: true,
              sentiment: true,
              topics: true,
              suggestions: true,
              detectedEntities: true,
              modelVersion: true,
              createdAt: true
            }
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check visibility permissions
      if (post.visibility !== Visibility.PUBLIC) {
        if (!userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this post',
          });
        }

        if (post.visibility === Visibility.PRIVATE && post.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this post',
          });
        }

        if (post.visibility === Visibility.FRIENDS && post.userId !== userId) {
          // Check if the user is a friend
          const friendship = await ctx.db.friendship.findFirst({
            where: {
              OR: [
                {
                  userId: post.userId,
                  friendId: userId,
                  status: 'ACCEPTED',
                },
                {
                  userId: userId,
                  friendId: post.userId,
                  status: 'ACCEPTED',
                },
              ],
            },
          });

          if (!friendship) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to view this post',
            });
          }
        }
      }

      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).default('PUBLIC'),
        mediaUrls: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional(),
        hashtags: z.array(z.string()).optional(),
        runAiAnalysis: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { content, visibility, mediaUrls, hashtags, runAiAnalysis } = input;

      const post = await ctx.db.post.create({
        data: {
          content,
          visibility,
          userId: ctx.session.user.id,
          media: mediaUrls ? {
            createMany: {
              data: mediaUrls.map(({ url, type, thumbnailUrl }) => ({
                url,
                type,
                thumbnailUrl,
              })),
            },
          } : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          media: true,
        },
      });

      // Handle hashtags
      if (hashtags && hashtags.length > 0) {
        // Process each hashtag
        for (const tag of hashtags) {
          // Find or create the topic
          const topic = await ctx.db.topic.upsert({
            where: { name: tag.toLowerCase() },
            update: {},
            create: { name: tag.toLowerCase() },
          });

          // Link the topic to the post
          await ctx.db.postHashtag.create({
            data: {
              postId: post.id,
              topicId: topic.id,
            },
          });
        }
      }

      // Perform AI analysis if requested
      if (runAiAnalysis) {
        try {
          // Import the Gemini analysis function and ContentAnalysis type
          const { analyzeContent, GeminiModel, ContentAnalysis } = await import('@/lib/gemini');

          // Perform content analysis
          const analysis = await analyzeContent(
            content,
            GeminiModel.PRO_1_5,
            'standard'
          );

          // Save the analysis result
          await ctx.db.aIAnalysis.create({
            data: {
              postId: post.id,
              sentiment: analysis.sentiment,
              topics: analysis.topics.join(', '),
              suggestions: analysis.suggestions.join('\n'),
              detectedEntities: JSON.stringify(analysis.entities),
              modelVersion: GeminiModel.PRO_1_5,
            },
          });

          // Record token usage if available
          if (ctx.db.aiTokenUsageStat) {
            try {
              const { estimateTokenCount } = await import('@/lib/token-management');
              const promptTokens = estimateTokenCount(content) + 300; // Add 300 for system prompts
              const completionTokens = estimateTokenCount(JSON.stringify(analysis));
              const totalTokens = promptTokens + completionTokens;

              // Try to find or create token limit for the user
              let tokenLimit = await ctx.db.aiTokenLimit.findUnique({
                where: { userId: ctx.session.user.id },
              });

              if (!tokenLimit) {
                // Initialize token limit if it doesn't exist
                tokenLimit = await ctx.db.aiTokenLimit.create({
                  data: {
                    userId: ctx.session.user.id,
                    tier: 'FREE',
                    limit: 150,
                    usage: totalTokens,
                    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  },
                });
              } else {
                // Update existing token limit
                await ctx.db.aiTokenLimit.update({
                  where: { userId: ctx.session.user.id },
                  data: {
                    usage: tokenLimit.usage + totalTokens,
                  },
                });
              }

              // Record token usage statistics
              await ctx.db.aiTokenUsageStat.create({
                data: {
                  tokenLimitId: tokenLimit.id,
                  operationType: 'CONTENT_ANALYSIS',
                  tokensUsed: totalTokens,
                  model: GeminiModel.PRO_1_5,
                  endpoint: 'post.create',
                  featureArea: 'post',
                  promptTokens,
                  completionTokens,
                  success: true,
                  metadata: {
                    postId: post.id,
                    analysisType: 'standard',
                    contentLength: content.length,
                  },
                },
              });
            } catch (tokenError) {
              console.error('Error recording token usage:', tokenError);
              // Continue without token tracking if it fails
            }
          }
        } catch (analysisError) {
          console.error('Error performing AI analysis:', analysisError);
          // Create a placeholder record if analysis fails
          await ctx.db.aIAnalysis.create({
            data: {
              postId: post.id,
              sentiment: 'ERROR',
              topics: 'Analysis failed',
              modelVersion: 'ERROR',
            },
          });
        }
      }

      return post;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).max(5000).optional(),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const post = await ctx.db.post.findUnique({
        where: { id },
        select: {
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (post.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to update this post',
        });
      }

      return await ctx.db.post.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          media: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        select: {
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (post.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to delete this post',
        });
      }

      await ctx.db.post.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullish(),
        includeReasons: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, includeReasons } = input;
      const userId = ctx.session.user.id;

      try {
        // Import the personalization function
        const { generatePersonalizedFeed, ContentType, UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');

        // Generate personalized recommendations
        const recommendations = await generatePersonalizedFeed(
          userId,
          ContentType.POST,
          limit + (cursor ? 1 : 0) // Add one extra if we have a cursor
        );

        // Extract just the IDs, preserving order
        let postIds = recommendations.map(rec => rec.id);

        // Apply cursor if provided
        if (cursor) {
          const cursorIndex = postIds.indexOf(cursor);
          if (cursorIndex !== -1) {
            postIds = postIds.slice(cursorIndex + 1);
          }
        }

        // Fetch the actual posts
        const posts = await ctx.db.post.findMany({
          where: {
            id: {
              in: postIds,
            },
            published: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            media: true,
            _count: {
              select: {
                reactions: true,
                comments: true,
              },
            },
            aiAnalysis: {
              select: {
                id: true,
                sentiment: true,
                topics: true,
                suggestions: true,
              },
            },
          },
        });

        // Re-sort to match the original recommendation order
        const sortedPosts = postIds
          .map(id => posts.find(post => post.id === id))
          .filter(Boolean);

        // Determine next cursor
        let nextCursor: typeof cursor = undefined;
        if (sortedPosts.length > 0 && recommendations.length > postIds.length) {
          nextCursor = sortedPosts[sortedPosts.length - 1]?.id;
        }

        // Add recommendation metadata to each post if requested
        const result = sortedPosts.map(post => {
          const recommendation = recommendations.find(rec => rec.id === post?.id);

          if (includeReasons && recommendation) {
            return {
              ...post,
              recommendationMetadata: {
                reason: recommendation.reason,
                source: recommendation.source,
                score: recommendation.score,
                explanation: recommendation.metadata?.explanation,
              },
            };
          }

          return post;
        });

        // Log user behavior for viewing feed
        logUserBehavior(
          userId,
          UserBehaviorType.VIEW,
          'feed',
          ContentType.POST,
          {
            timestamp: new Date(),
            recommendationCount: result.length,
            sources: [...new Set(recommendations.map(rec => rec.source))],
          }
        ).catch(e => console.error('Error logging feed view:', e));

        return {
          posts: result,
          nextCursor,
        };
      } catch (error) {
        console.error('Error fetching personalized feed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate personalized feed',
        });
      }
    }),

  react: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        type: z.enum(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, type } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check if the user already reacted to this post
      const existingReaction = await ctx.db.reaction.findUnique({
        where: {
          userId_postId_commentId: {
            userId: ctx.session.user.id,
            postId,
            commentId: null,
          },
        },
      });

      if (existingReaction) {
        // Update existing reaction if the type is different
        if (existingReaction.type !== type) {
          await ctx.db.reaction.update({
            where: { id: existingReaction.id },
            data: { type },
          });
        }
      } else {
        // Create new reaction
        await ctx.db.reaction.create({
          data: {
            type,
            userId: ctx.session.user.id,
            postId,
          },
        });

        // Create notification if the reaction is not from the post author
        if (post.userId !== ctx.session.user.id) {
          await ctx.db.notification.create({
            data: {
              type: 'LIKE',
              recipientId: post.userId,
              senderId: ctx.session.user.id,
              postId,
            },
          });
        }
      }

      return { success: true };
    }),

  removeReaction: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const existingReaction = await ctx.db.reaction.findUnique({
        where: {
          userId_postId_commentId: {
            userId: ctx.session.user.id,
            postId,
            commentId: null,
          },
        },
      });

      if (!existingReaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reaction not found',
        });
      }

      await ctx.db.reaction.delete({
        where: { id: existingReaction.id },
      });

      return { success: true };
    }),

  savePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      const existingSave = await ctx.db.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      if (existingSave) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Post already saved',
        });
      }

      await ctx.db.savedPost.create({
        data: {
          userId: ctx.session.user.id,
          postId,
        },
      });

      return { success: true };
    }),

  unsavePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const existingSave = await ctx.db.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      if (!existingSave) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved post not found',
        });
      }

      await ctx.db.savedPost.delete({
        where: {
          userId_postId: {
            userId: ctx.session.user.id,
            postId,
          },
        },
      });

      return { success: true };
    }),

  getSavedPosts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // Build the where clause
      const whereClause: {
        userId: string;
        id?: { lt: string };
      } = {
        userId: ctx.session.user.id,
      };

      // If a cursor is provided, only fetch saved posts created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const savedPosts = await ctx.db.savedPost.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
              media: true,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (savedPosts.length > limit) {
        const nextItem = savedPosts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        savedPosts: savedPosts.map((savedPost) => savedPost.post),
        nextCursor,
      };
    }),

  getPostAnalytics: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(['week', 'month', 'all']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { timeframe } = input;
      const userId = ctx.session.user.id;

      // Calculate date filter based on timeframe
      let dateFilter: Date | null = null;
      if (timeframe === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get posts with AI analysis for the user within timeframe
      const posts = await ctx.db.post.findMany({
        where: {
          userId,
          createdAt: dateFilter ? {
            gte: dateFilter,
          } : undefined,
          aiAnalysis: {
            isNot: null,
          },
        },
        include: {
          aiAnalysis: {
            select: {
              sentiment: true,
              topics: true,
              suggestions: true,
              detectedEntities: true,
            },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
              savedBy: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Fetch previous time period for comparison
      let previousTimeframeStart: Date | null = null;
      let previousTimeframeEnd: Date | null = null;
      if (timeframe === 'week') {
        previousTimeframeStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        previousTimeframeEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        previousTimeframeStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        previousTimeframeEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get post count for previous time period for comparison
      const previousPeriodPostCount = previousTimeframeStart && previousTimeframeEnd ? await ctx.db.post.count({
        where: {
          userId,
          aiAnalysis: {
            isNot: null,
          },
          createdAt: {
            gte: previousTimeframeStart,
            lt: previousTimeframeEnd,
          },
        },
      }) : 0;

      // Calculate sentiment statistics
      const sentimentStats = {
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0,
      };

      // Calculate engagement predictions
      const engagementStats = {
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      };

      // Keep track of topics for aggregation
      const topicsMap = new Map<string, number>();

      // Parse topics and entities from each post
      posts.forEach(post => {
        // Count sentiments
        const sentiment = post.aiAnalysis?.sentiment?.toLowerCase() || 'neutral';
        if (sentiment === 'positive') sentimentStats.positive++;
        else if (sentiment === 'negative') sentimentStats.negative++;
        else if (sentiment === 'neutral') sentimentStats.neutral++;
        else if (sentiment === 'mixed') sentimentStats.mixed++;

        // Determine engagement (using reaction + comment count as proxy)
        const engagement = post._count.reactions + post._count.comments;
        if (engagement > 10) engagementStats.high++;
        else if (engagement > 3) engagementStats.medium++;
        else engagementStats.low++;
        engagementStats.total += engagement;

        // Extract topics
        if (post.aiAnalysis?.topics) {
          const topics = post.aiAnalysis.topics.split(',').map(t => t.trim());
          topics.forEach(topic => {
            if (topic) {
              topicsMap.set(topic, (topicsMap.get(topic) || 0) + 1);
            }
          });
        }
      });

      // Calculate change percentage from previous period
      const changePercentage = previousPeriodPostCount > 0
        ? Math.round(((posts.length - previousPeriodPostCount) / previousPeriodPostCount) * 100)
        : null;

      // Calculate average engagement score
      const averageEngagementScore = posts.length > 0
        ? Math.round((engagementStats.total / posts.length) * 100) / 100
        : 0;

      // Calculate change in engagement score
      const previousPeriodPosts = previousTimeframeStart && previousTimeframeEnd ? await ctx.db.post.findMany({
        where: {
          userId,
          createdAt: {
            gte: previousTimeframeStart,
            lt: previousTimeframeEnd,
          },
        },
        include: {
          _count: {
            select: {
              reactions: true,
              comments: true,
            },
          },
        },
      }) : [];

      const previousAvgEngagement = previousPeriodPosts.length > 0
        ? previousPeriodPosts.reduce((acc, post) => acc + post._count.reactions + post._count.comments, 0) / previousPeriodPosts.length
        : 0;

      const engagementChange = previousAvgEngagement > 0
        ? ((averageEngagementScore - previousAvgEngagement) / previousAvgEngagement) * 100
        : 0;

      // Get top topics
      const topTopics = Array.from(topicsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      // Get recent posts with analysis
      const recentPosts = posts.slice(0, 5).map(post => {
        // Extract topics from the comma-separated string
        const topics = post.aiAnalysis?.topics
          ? post.aiAnalysis.topics.split(',').map(t => t.trim())
          : [];

        // Determine engagement level
        const engagement = post._count.reactions + post._count.comments;
        let engagementLevel: 'low' | 'medium' | 'high' = 'low';
        if (engagement > 10) engagementLevel = 'high';
        else if (engagement > 3) engagementLevel = 'medium';

        return {
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          sentiment: post.aiAnalysis?.sentiment?.toLowerCase() || 'neutral',
          engagement: engagementLevel,
          topics,
          shares: post._count.savedBy || 0,
          user: {
            id: userId,
            name: ctx.session.user.name || 'User',
            image: ctx.session.user.image,
          },
        };
      });

      return {
        totalAnalyzed: posts.length,
        changePercentage,
        sentimentStats,
        engagementStats,
        averageEngagementScore,
        engagementChange,
        topTopics,
        recentPosts,
      };
    }),

  getPostAnalysis: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { postId } = input;

      // Get post with AI analysis
      const post = await ctx.db.post.findUnique({
        where: {
          id: postId,
        },
        include: {
          aiAnalysis: true,
        },
      });

      if (!post || !post.aiAnalysis) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post analysis not found',
        });
      }

      // Convert AI analysis to ContentAnalysis format
      try {
        // Import ContentAnalysis type
        const { ContentAnalysis } = await import('@/lib/gemini');

        // Parse entities from stored JSON string
        const entities = post.aiAnalysis.detectedEntities
          ? JSON.parse(post.aiAnalysis.detectedEntities)
          : [];

        // Parse topics from stored comma-separated string
        const topics = post.aiAnalysis.topics
          ? post.aiAnalysis.topics.split(',').map((t: string) => t.trim())
          : [];

        // Parse suggestions from stored newline-separated string
        const suggestions = post.aiAnalysis.suggestions
          ? post.aiAnalysis.suggestions.split('\n').filter(Boolean)
          : [];

        // Create a ContentAnalysis object
        const analysis: ContentAnalysis = {
          sentiment: (post.aiAnalysis.sentiment as any) || 'neutral',
          topics,
          entities,
          tone: 'neutral', // Default value since we don't store this
          suggestions,
          engagementPrediction: 'medium', // Default value since we don't store this
          reasonForEngagementPrediction: 'Based on past content performance',
        };

        return analysis;
      } catch (error) {
        console.error('Error parsing post analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse post analysis',
        });
      }
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1).max(1000),
        parentId: z.string().optional(),
        mediaUrls: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(['IMAGE', 'VIDEO', 'AUDIO']),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content, parentId, mediaUrls } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // If a parentId is provided, verify it exists and belongs to the post
      if (parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            postId: true,
            userId: true,
          },
        });

        if (!parentComment || parentComment.postId !== postId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid parent comment',
          });
        }
      }

      const comment = await ctx.db.comment.create({
        data: {
          content,
          userId: ctx.session.user.id,
          postId,
          parentId,
          media: mediaUrls ? {
            createMany: {
              data: mediaUrls.map(({ url, type, thumbnailUrl }) => ({
                url,
                type,
                thumbnailUrl,
              })),
            },
          } : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          media: true,
        },
      });

      // Create notification for the post author (if it's not their own comment)
      if (post.userId !== ctx.session.user.id) {
        await ctx.db.notification.create({
          data: {
            type: 'COMMENT',
            recipientId: post.userId,
            senderId: ctx.session.user.id,
            postId,
            commentId: comment.id,
          },
        });
      }

      // If it's a reply, also notify the parent comment author
      if (parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });

        if (parentComment && parentComment.userId !== ctx.session.user.id && parentComment.userId !== post.userId) {
          await ctx.db.notification.create({
            data: {
              type: 'COMMENT',
              recipientId: parentComment.userId,
              senderId: ctx.session.user.id,
              postId,
              commentId: comment.id,
            },
          });
        }
      }

      return comment;
    }),
});