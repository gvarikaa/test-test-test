import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../server';
import { TRPCError } from '@trpc/server';
import { EffectType, SharePlatform } from '@prisma/client';
import { getReelRecommendations, logReelView, markRecommendationsViewed } from '@/lib/reel-recommendation';

export const reelRouter = router({
  getRecommendedReels: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
        includeFollowing: z.boolean().optional(),
        includeTopics: z.boolean().optional(),
        includeTrending: z.boolean().optional(),
        includeSimilarContent: z.boolean().optional(),
        includeExplore: z.boolean().optional(),
        diversityFactor: z.number().min(0).max(1).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        includeFollowing,
        includeTopics,
        includeTrending,
        includeSimilarContent,
        includeExplore,
        diversityFactor
      } = input;
      const { session } = ctx;

      if (!session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to get recommendations',
        });
      }

      try {
        // Get recommendations
        const recommendations = await getReelRecommendations(session.user.id, {
          limit,
          includeFollowing,
          includeTopics,
          includeTrending,
          includeSimilarContent,
          includeExplore,
          diversityFactor,
        });

        if (recommendations.length === 0) {
          return {
            reels: [],
            nextCursor: undefined,
          };
        }

        // Fetch the actual reel data
        const reelIds = recommendations.map(rec => rec.reelId);
        const reels = await ctx.db.reel.findMany({
          where: {
            id: { in: reelIds },
            isPublished: true,
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
            audio: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                shares: true,
              },
            },
          },
        });

        // Check if items have been liked by current user
        const likes = await ctx.db.reelLike.findMany({
          where: {
            reelId: { in: reelIds },
            userId: session.user.id,
          },
        });

        const likedReelIds = new Set(likes.map(like => like.reelId));

        // Mark recommendations as viewed
        await markRecommendationsViewed(session.user.id, reelIds);

        // Map reels to include recommendation data and like status
        const reelsWithMetadata = reels.map(reel => {
          const recommendation = recommendations.find(r => r.reelId === reel.id);

          return {
            ...reel,
            likeCount: reel._count.likes,
            commentCount: reel._count.comments,
            shareCount: reel._count.shares,
            isLikedByUser: likedReelIds.has(reel.id),
            recommendation: recommendation ? {
              reason: recommendation.reason,
              source: recommendation.source,
            } : null,
          };
        });

        // Sort by recommendation score to maintain order
        const sortedReels = reelsWithMetadata.sort((a, b) => {
          const scoreA = recommendations.find(r => r.reelId === a.id)?.score || 0;
          const scoreB = recommendations.find(r => r.reelId === b.id)?.score || 0;
          return scoreB - scoreA;
        });

        // Get last item for cursor
        const lastItem = sortedReels[sortedReels.length - 1];
        const recommendationForCursor = recommendations.find(r => r.reelId === lastItem?.id);

        return {
          reels: sortedReels,
          nextCursor: recommendationForCursor?.reelId,
        };
      } catch (error) {
        console.error('Error fetching reel recommendations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch reel recommendations',
          cause: error,
        });
      }
    }),

  logReelViewed: protectedProcedure
    .input(
      z.object({
        reelId: z.string(),
        completionRate: z.number().min(0).max(1),
        watchDuration: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reelId, completionRate, watchDuration } = input;
      const { session } = ctx;

      if (!session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to log views',
        });
      }

      try {
        // Log to ReelView
        await ctx.db.reelView.create({
          data: {
            watchDuration,
            completionRate,
            reel: { connect: { id: reelId } },
            user: { connect: { id: session.user.id } },
          },
        });

        // Call recommendation log function
        await logReelView(
          session.user.id,
          reelId,
          completionRate,
          watchDuration
        );

        // Update reel view count
        await ctx.db.reel.update({
          where: { id: reelId },
          data: { viewCount: { increment: 1 } },
        });

        return { success: true };
      } catch (error) {
        console.error('Error logging reel view:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to log reel view',
          cause: error,
        });
      }
    }),
  getReels: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
        userId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Set default values if input is undefined
      const { limit = 10, cursor, userId } = input || {};
      const { db, session } = ctx;

      // Build query conditions
      const where = {
        isPublished: true,
        ...(userId ? { userId } : {}),
      };

      try {
        // Get reels with pagination
        const reels = await db.reel.findMany({
          where,
          take: limit + 1, // take an extra item to determine if there are more items
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { createdAt: 'desc' },
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
            audio: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                shares: true,
              },
            },
          },
        });

      // Check if items have been liked by current user
      let reelsWithLikeStatus = reels;
      if (session?.user) {
        const reelIds = reels.map((reel) => reel.id);
        const likes = await db.reelLike.findMany({
          where: {
            reelId: { in: reelIds },
            userId: session.user.id,
          },
        });

        const likedReelIds = new Set(likes.map((like) => like.reelId));

        reelsWithLikeStatus = reels.map((reel) => ({
          ...reel,
          isLikedByUser: likedReelIds.has(reel.id),
        }));
      }

      // Format the response
      const formattedReels = reelsWithLikeStatus.map((reel) => ({
        ...reel,
        likeCount: reel._count.likes,
        commentCount: reel._count.comments,
        shareCount: reel._count.shares,
      }));

      let nextCursor: typeof cursor | undefined = undefined;
      if (formattedReels.length > limit) {
        const nextItem = formattedReels.pop();
        nextCursor = nextItem!.id;
      }

      return {
        reels: formattedReels,
        nextCursor,
      };
    } catch (error) {
      console.error('Error fetching reels:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reels',
        cause: error,
      });
    }
    }),

  getReelById: publicProcedure
    .input(z.object({ reelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { reelId } = input;
      const { db, session } = ctx;

      const reel = await db.reel.findUnique({
        where: { id: reelId },
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
          audio: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true,
            },
          },
        },
      });

      if (!reel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reel not found',
        });
      }

      // Check if the reel is liked by the current user
      let isLikedByUser = false;
      if (session?.user) {
        const like = await db.reelLike.findUnique({
          where: {
            reelId_userId: {
              reelId,
              userId: session.user.id,
            },
          },
        });
        isLikedByUser = !!like;
      }

      return {
        ...reel,
        likeCount: reel._count.likes,
        commentCount: reel._count.comments,
        shareCount: reel._count.shares,
        isLikedByUser,
      };
    }),

  createReel: protectedProcedure
    .input(
      z.object({
        caption: z.string().optional(),
        media: z.array(
          z.object({
            url: z.string(),
            type: z.string(),
            thumbnailUrl: z.string().optional(),
          })
        ),
        audioId: z.string().optional(),
        isOriginalAudio: z.boolean().default(true),
        effectIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { caption, media, audioId, isOriginalAudio, effectIds } = input;

      // Create the reel
      const reel = await db.reel.create({
        data: {
          caption,
          user: {
            connect: {
              id: session.user.id,
            },
          },
          media: {
            create: media.map((m) => ({
              url: m.url,
              type: m.type as any, // Cast to MediaType
              thumbnailUrl: m.thumbnailUrl,
            })),
          },
          // Connect effects if provided
          ...(effectIds && effectIds.length > 0
            ? {
                effects: {
                  connect: effectIds.map((id) => ({ id })),
                },
              }
            : {}),
        },
      });

      // If using original audio, create an audio entry
      if (isOriginalAudio) {
        await db.reelAudio.create({
          data: {
            title: `Original audio - ${session.user.name || session.user.username || 'User'}`,
            duration: 0, // This would be determined from the video
            audioUrl: '', // This would be extracted from the video
            isOriginal: true,
            reel: {
              connect: {
                id: reel.id,
              },
            },
          },
        });
      } else if (audioId) {
        // Connect existing audio
        await db.reel.update({
          where: { id: reel.id },
          data: {
            audio: {
              connect: {
                id: audioId,
              },
            },
          },
        });

        // Increment the use count for the audio
        await db.reelAudio.update({
          where: { id: audioId },
          data: {
            useCount: {
              increment: 1,
            },
          },
        });
      }

      return reel;
    }),

  likeReel: protectedProcedure
    .input(z.object({ reelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { reelId } = input;
      const { db, session } = ctx;

      // Check if reel exists
      const reel = await db.reel.findUnique({
        where: { id: reelId },
      });

      if (!reel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reel not found',
        });
      }

      // Check if already liked
      const existingLike = await db.reelLike.findUnique({
        where: {
          reelId_userId: {
            reelId,
            userId: session.user.id,
          },
        },
      });

      if (existingLike) {
        // Unlike
        await db.reelLike.delete({
          where: {
            id: existingLike.id,
          },
        });
        
        // Update like count
        await db.reel.update({
          where: { id: reelId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });

        return { liked: false };
      } else {
        // Like
        await db.reelLike.create({
          data: {
            reel: {
              connect: {
                id: reelId,
              },
            },
            user: {
              connect: {
                id: session.user.id,
              },
            },
          },
        });
        
        // Update like count
        await db.reel.update({
          where: { id: reelId },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });

        // Create notification if the reel is not by the current user
        if (reel.userId !== session.user.id) {
          await db.notification.create({
            data: {
              type: "REEL_LIKE",
              recipient: {
                connect: {
                  id: reel.userId,
                },
              },
              sender: {
                connect: {
                  id: session.user.id,
                },
              },
              content: `liked your reel`,
              url: `/reels/${reelId}`,
            },
          });
        }

        return { liked: true };
      }
    }),

  shareReel: protectedProcedure
    .input(
      z.object({
        reelId: z.string(),
        platform: z.nativeEnum(SharePlatform),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reelId, platform } = input;
      const { db, session } = ctx;

      // Check if reel exists
      const reel = await db.reel.findUnique({
        where: { id: reelId },
      });

      if (!reel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reel not found',
        });
      }

      // Record the share
      await db.reelShare.create({
        data: {
          platform,
          reel: {
            connect: {
              id: reelId,
            },
          },
          user: {
            connect: {
              id: session.user.id,
            },
          },
        },
      });
      
      // Update share count
      await db.reel.update({
        where: { id: reelId },
        data: {
          shareCount: {
            increment: 1,
          },
        },
      });

      // Create notification if the reel is not by the current user
      if (reel.userId !== session.user.id) {
        await db.notification.create({
          data: {
            type: "REEL_SHARE",
            recipient: {
              connect: {
                id: reel.userId,
              },
            },
            sender: {
              connect: {
                id: session.user.id,
              },
            },
            content: `shared your reel`,
            url: `/reels/${reelId}`,
          },
        });
      }

      return { shared: true };
    }),

  addReelComment: protectedProcedure
    .input(
      z.object({
        reelId: z.string(),
        content: z.string(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reelId, content, parentId } = input;
      const { db, session } = ctx;

      // Check if reel exists
      const reel = await db.reel.findUnique({
        where: { id: reelId },
      });

      if (!reel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reel not found',
        });
      }

      // Create the comment
      const comment = await db.reelComment.create({
        data: {
          content,
          reel: {
            connect: {
              id: reelId,
            },
          },
          user: {
            connect: {
              id: session.user.id,
            },
          },
          ...(parentId
            ? {
                parent: {
                  connect: {
                    id: parentId,
                  },
                },
              }
            : {}),
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
        },
      });
      
      // Update comment count
      await db.reel.update({
        where: { id: reelId },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });

      // Create notification if the reel is not by the current user
      if (reel.userId !== session.user.id) {
        await db.notification.create({
          data: {
            type: "REEL_COMMENT",
            recipient: {
              connect: {
                id: reel.userId,
              },
            },
            sender: {
              connect: {
                id: session.user.id,
              },
            },
            content: `commented on your reel: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`,
            url: `/reels/${reelId}`,
          },
        });
      }

      return comment;
    }),

  getReelComments: publicProcedure
    .input(
      z.object({
        reelId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { reelId, limit, cursor } = input;
      const { db } = ctx;

      // Get top-level comments with pagination
      const comments = await db.reelComment.findMany({
        where: {
          reelId,
          parentId: null, // Only top-level comments
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          replies: {
            take: 3, // Just get the first few replies
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (comments.length > limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem!.id;
      }

      return {
        comments,
        nextCursor,
      };
    }),

  getAudioOptions: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        query: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Set default values if input is undefined
      const { limit = 20, query } = input || {};
      const { db } = ctx;

      const where = query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { artistName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {};

      const audioOptions = await db.reelAudio.findMany({
        where,
        take: limit,
        orderBy: [
          { useCount: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return audioOptions;
    }),

  getEffects: publicProcedure
    .input(
      z.object({
        type: z.nativeEnum(EffectType).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Set default values if input is undefined
      const { type } = input || {};
      const { db } = ctx;

      const where = type ? { type } : {};

      const effects = await db.reelEffect.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return effects;
    }),
});