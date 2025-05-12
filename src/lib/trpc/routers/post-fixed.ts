import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { Visibility, PostType, MediaType, ReactionType, ReportType, SharePlatform } from '@prisma/client';

export const postRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        cursor: z.string().nullish(),
        personalized: z.boolean().optional().default(false),
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).optional(),
        hashtag: z.string().optional(),
        postIds: z.array(z.string()).optional(), // Optional array of specific post IDs to fetch
        includeComments: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const limit = input?.limit ?? 10;
        const cursor = input?.cursor;
        const personalized = input?.personalized ?? false;
        const postType = input?.type;
        const hashtag = input?.hashtag;
        const userId = ctx.session?.user?.id;
        const specificPostIds = input?.postIds;
        const includeComments = input?.includeComments ?? false;

        // If specific post IDs are provided, fetch only those
        if (specificPostIds && specificPostIds.length > 0) {
          const posts = await ctx.db.post.findMany({
            where: {
              id: { in: specificPostIds },
              published: true,
              ...(postType ? { type: postType } : {}),
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
              // Poll relation removed - not in schema
              audioRecordings: true,
              urlPreviews: true,
              comments: includeComments ? {
                where: { parentId: null },
                take: 3,
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
                  _count: {
                    select: {
                      reactions: true,
                      replies: true,
                    },
                  },
                },
              } : undefined,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  shares: true,
                  views: true,
                },
              },
              aiAnalysis: {
                select: {
                  id: true,
                  sentiment: true,
                  topics: true,
                },
              },
              mentions: {
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
              reactions: userId ? {
                where: {
                  userId,
                },
                select: {
                  type: true,
                },
                take: 1,
              } : undefined,
            },
          }).catch(error => {
            console.error('Error fetching specific posts:', error);
            return []; // Return empty array on error
          });

          return {
            posts,
            nextCursor: undefined,
          };
        }

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
            ).catch(error => {
              console.error('Error in generatePersonalizedFeed:', error);
              return []; // Return empty array to trigger fallback
            });

            // If recommendations were returned successfully
            if (recommendations && recommendations.length > 0) {
              // Extract just the IDs, preserving order
              let postIds = recommendations.map(rec => rec.id);

              // Apply cursor if provided
              if (cursor) {
                const cursorIndex = postIds.indexOf(cursor);
                if (cursorIndex !== -1) {
                  postIds = postIds.slice(cursorIndex + 1);
                }
              }

              // Build where clause with additional filters
              const whereClause: any = {
                id: {
                  in: postIds,
                },
                published: true,
              };

              // Apply type filter if provided
              if (postType) {
                whereClause.type = postType;
              }

              // Apply hashtag filter if provided
              if (hashtag) {
                whereClause.hashtags = {
                  some: {
                    topic: {
                      name: hashtag.toLowerCase(),
                    },
                  },
                };
              }

              // Fetch the actual posts
              const posts = await ctx.db.post.findMany({
                where: whereClause,
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
                  // Poll relation removed - not in schema
                  audioRecordings: true,
                  urlPreviews: true,
                  comments: includeComments ? {
                    where: { parentId: null },
                    take: 3,
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
                      _count: {
                        select: {
                          reactions: true,
                          replies: true,
                        },
                      },
                    },
                  } : undefined,
                  _count: {
                    select: {
                      reactions: true,
                      comments: true,
                      shares: true,
                      views: true,
                    },
                  },
                  aiAnalysis: {
                    select: {
                      id: true,
                      sentiment: true,
                      topics: true,
                    },
                  },
                  mentions: {
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
                  reactions: userId ? {
                    where: {
                      userId,
                    },
                    select: {
                      type: true,
                    },
                    take: 1,
                  } : undefined,
                },
              }).catch(error => {
                console.error('Error fetching personalized posts:', error);
                return []; // Return empty array to trigger fallback
              });

              // If posts were found, return them
              if (posts && posts.length > 0) {
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
              }
            }
            // If we reach here, personalization failed or returned no results, fall back to standard feed
          } catch (error) {
            console.error('Error fetching personalized posts:', error);
            // Fall back to standard feed if personalization fails
          }
        }

        // Standard non-personalized feed or fallback
        // Build the where clause
        const whereClause: any = {
          published: true,
          OR: [
            { visibility: Visibility.PUBLIC },
            userId ? {
              visibility: Visibility.FRIENDS,
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

        // Apply type filter if provided
        if (postType) {
          whereClause.type = postType;
        }

        // Apply hashtag filter if provided
        if (hashtag) {
          whereClause.hashtags = {
            some: {
              topic: {
                name: hashtag.toLowerCase(),
              },
            },
          };
        }

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
            // Poll relation removed - not in schema
            audioRecordings: true,
            urlPreviews: true,
            comments: includeComments ? {
              where: { parentId: null },
              take: 3,
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
                _count: {
                  select: {
                    reactions: true,
                    replies: true,
                  },
                },
              },
            } : undefined,
            _count: {
              select: {
                reactions: true,
                comments: true,
                shares: true,
                views: true,
              },
            },
            aiAnalysis: {
              select: {
                id: true,
                sentiment: true,
                topics: true,
              },
            },
            mentions: {
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
            reactions: userId ? {
              where: {
                userId,
              },
              select: {
                type: true,
              },
              take: 1,
            } : undefined,
          },
        }).catch(error => {
          console.error('Error fetching standard posts:', error);
          return []; // Return empty array on error
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
      } catch (error) {
        // Catch-all error handler, returns empty array instead of throwing
        console.error('Error in getAll:', error);
        return {
          posts: [],
          nextCursor: undefined,
        };
      }
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
          // Poll relation removed - not in schema
          audioRecordings: true,
          urlPreviews: true,
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
              shares: true,
              views: true,
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
          mentions: {
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
          shares: {
            take: 5,
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
            },
          },
          analytics: userId ? {
            select: {
              viewsBySource: true,
              engagementRate: true,
              reachCount: true,
              clickCount: true,
            },
          } : undefined,
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

        if (post.visibility === Visibility.GROUP) {
          // Logic for group visibility will go here when fully implemented
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Group posts visibility checking not yet implemented',
          });
        }

        if (post.visibility === Visibility.SPECIFIC_USERS) {
          // We'd need a table linking posts to specific allowed users
          // This would be implemented in future
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Specific users visibility checking not yet implemented',
          });
        }
      }

      // Record view if the viewer is not the post author
      if (userId && userId !== post.userId && !post.isHidden) {
        try {
          // Get user agent and other data from the request if available
          const userAgent = ctx.req?.headers?.['user-agent'] || '';
          const referer = ctx.req?.headers?.referer || '';
          const ipAddress = ctx.req?.socket?.remoteAddress || '';

          // Create a new view record
          await ctx.db.postView.create({
            data: {
              postId: post.id,
              userId,
              userAgent,
              referer,
              ipAddress,
            },
          });

          // Increment the view count on the post
          await ctx.db.post.update({
            where: { id: post.id },
            data: {
              viewCount: { increment: 1 },
            },
          });
        } catch (viewError) {
          // Log error but don't fail the request
          console.error('Error recording post view:', viewError);
        }
      }

      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        formattedContent: z.any().optional(),
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).default('TEXT'),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'GROUP', 'SPECIFIC_USERS']).default('PUBLIC'),
        mediaUrls: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional(),
        audioRecordings: z.array(
          z.object({
            url: z.string().url(),
            duration: z.number().optional(),
            transcript: z.string().optional(),
            waveform: z.string().optional(),
          })
        ).optional(),
        hashtags: z.array(z.string()).optional(),
        mentions: z.array(
          z.object({
            userId: z.string(),
            startIndex: z.number().optional(),
            endIndex: z.number().optional(),
          })
        ).optional(),
        location: z.string().optional(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional(),
        urls: z.array(
          z.object({
            url: z.string().url(),
            title: z.string().optional(),
            description: z.string().optional(),
            imageUrl: z.string().optional(),
            domain: z.string().optional(),
          })
        ).optional(),
        // Poll is removed since it's not in the schema
        runAiAnalysis: z.boolean().default(false),
        scheduledFor: z.string().datetime().optional(),
        isPinned: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { 
        content, 
        formattedContent,
        type, 
        visibility, 
        mediaUrls, 
        audioRecordings,
        hashtags, 
        mentions,
        location,
        coordinates,
        urls,
        //poll, // Poll is removed
        runAiAnalysis,
        scheduledFor,
        isPinned
      } = input;

      // Don't allow scheduling in the past
      if (scheduledFor && new Date(scheduledFor) <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot schedule a post in the past',
        });
      }

      // Create base post
      const post = await ctx.db.post.create({
        data: {
          content,
          formattedContent: formattedContent || undefined,
          type: type as PostType,
          visibility: visibility as Visibility,
          userId: ctx.session.user.id,
          location,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          published: !scheduledFor, // If scheduled, don't publish yet
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          isPinned,
          // Create media records if provided
          media: mediaUrls ? {
            createMany: {
              data: mediaUrls.map(({ url, type, thumbnailUrl }) => ({
                url,
                type: type as MediaType,
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

      // Create audio recordings if provided
      if (audioRecordings && audioRecordings.length > 0) {
        await ctx.db.audioRecording.createMany({
          data: audioRecordings.map(recording => ({
            postId: post.id,
            url: recording.url,
            duration: recording.duration,
            transcript: recording.transcript,
            waveform: recording.waveform,
          })),
        });
      }

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

      // Handle mentions
      if (mentions && mentions.length > 0) {
        await ctx.db.postMention.createMany({
          data: mentions.map(mention => ({
            postId: post.id,
            userId: mention.userId,
            startIndex: mention.startIndex,
            endIndex: mention.endIndex,
          })),
        });

        // Create notifications for mentioned users
        await ctx.db.notification.createMany({
          data: mentions.map(mention => ({
            type: 'MENTION',
            recipientId: mention.userId,
            senderId: ctx.session.user.id,
            postId: post.id,
            content: `${ctx.session.user.name} mentioned you in a post`,
          })),
          skipDuplicates: true,
        });
      }

      // Handle URL previews
      if (urls && urls.length > 0) {
        await ctx.db.urlPreview.createMany({
          data: urls.map(url => ({
            postId: post.id,
            url: url.url,
            title: url.title,
            description: url.description,
            imageUrl: url.imageUrl,
            domain: url.domain,
          })),
        });
      }

      // Poll creation is removed as it's not in the schema

      // Create analytics record
      await ctx.db.postAnalytics.create({
        data: {
          postId: post.id,
        },
      });

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

      // Return the created post with associated data
      const fullPost = await ctx.db.post.findUnique({
        where: { id: post.id },
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
          audioRecordings: true,
          // Poll relation removed - not in schema
          urlPreviews: true,
          mentions: {
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
          aiAnalysis: {
            select: {
              id: true,
              sentiment: true,
              topics: true,
            },
          },
        },
      });

      return fullPost;
    }),

  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        cursor: z.string().nullish(),
        includeReasons: z.boolean().optional().default(true),
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).optional(),
        postIds: z.array(z.string()).optional(), // Allow specifying post IDs directly
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;
      const includeReasons = input?.includeReasons ?? true;
      const postType = input?.type;
      const userId = ctx.session.user.id;
      const directPostIds = input?.postIds;

      try {
        // If we have direct post IDs, skip personalization and fetch those posts
        if (directPostIds && directPostIds.length > 0) {
          const posts = await ctx.db.post.findMany({
            where: {
              id: { in: directPostIds },
              published: true,
              ...(postType ? { type: postType } : {})
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
              // Poll relation removed - not in schema
              audioRecordings: true,
              urlPreviews: true,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  shares: true,
                  views: true,
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
              mentions: {
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
              reactions: {
                where: {
                  userId,
                },
                select: {
                  type: true,
                },
                take: 1,
              },
            },
          }).catch(error => {
            console.error('Error fetching direct posts:', error);
            return []; // Return empty array on error
          });

          return {
            posts: posts.map(post => ({
              ...post,
              recommendationMetadata: includeReasons ? {
                reason: "Selected content",
                source: "direct",
                score: 1.0,
              } : undefined,
            })),
            nextCursor: undefined,
          };
        }

        // Import the personalization function
        const { generatePersonalizedFeed, ContentType, UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');

        // Generate personalized recommendations
        const recommendations = await generatePersonalizedFeed(
          userId,
          ContentType.POST,
          limit + (cursor ? 1 : 0) // Add one extra if we have a cursor
        ).catch(error => {
          console.error('Error in generatePersonalizedFeed:', error);
          return []; // Return empty array to continue with fallback
        });

        // If no recommendations or an error occurred, use fallback
        if (!recommendations || recommendations.length === 0) {
          // Fallback to standard feed if personalization fails
          const whereClause: any = {
            published: true,
            OR: [
              { visibility: Visibility.PUBLIC },
              {
                visibility: Visibility.FRIENDS,
                user: {
                  friends: {
                    some: {
                      friendId: userId,
                      status: 'ACCEPTED',
                    },
                  },
                },
              },
              { userId },
            ],
          };

          // Apply type filter if provided
          if (postType) {
            whereClause.type = postType;
          }

          // Apply cursor if provided
          if (cursor) {
            whereClause.id = {
              lt: cursor,
            };
          }

          const posts = await ctx.db.post.findMany({
            take: limit + 1,
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
              // Poll relation removed - not in schema
              audioRecordings: true,
              urlPreviews: true,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  shares: true,
                  views: true,
                },
              },
              aiAnalysis: {
                select: {
                  id: true,
                  sentiment: true,
                  topics: true,
                },
              },
              mentions: {
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
              reactions: {
                where: {
                  userId,
                },
                select: {
                  type: true,
                },
                take: 1,
              },
            },
          }).catch(error => {
            console.error('Error fetching fallback posts:', error);
            return []; // Return empty array on error
          });

          let nextCursor: typeof cursor = undefined;
          if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem!.id;
          }

          return {
            posts: posts.map(post => ({
              ...post,
              recommendationMetadata: includeReasons ? {
                reason: "Recent post",
                source: "recency",
                score: 0.9,
              } : undefined,
            })),
            nextCursor,
          };
        }

        // Extract just the IDs, preserving order
        let postIds = recommendations.map(rec => rec.id);

        // Apply cursor if provided
        if (cursor) {
          const cursorIndex = postIds.indexOf(cursor);
          if (cursorIndex !== -1) {
            postIds = postIds.slice(cursorIndex + 1);
          }
        }

        // Build base where clause
        const whereClause: any = {
          id: {
            in: postIds,
          },
          published: true,
        };

        // Apply type filter if provided
        if (postType) {
          whereClause.type = postType;
        }

        // Fetch the actual posts
        const posts = await ctx.db.post.findMany({
          where: whereClause,
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
            // Poll relation removed - not in schema
            audioRecordings: true,
            urlPreviews: true,
            _count: {
              select: {
                reactions: true,
                comments: true,
                shares: true,
                views: true,
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
            mentions: {
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
            reactions: {
              where: {
                userId,
              },
              select: {
                type: true,
              },
              take: 1,
            },
          },
        }).catch(error => {
          console.error('Error fetching personalized posts:', error);
          return []; // Return empty array to trigger the fallback below
        });

        // If no posts were found but we had recommendations, fall back to standard feed
        if (posts.length === 0) {
          const standardPosts = await ctx.db.post.findMany({
            take: limit + 1,
            where: {
              published: true,
              ...(postType ? { type: postType } : {})
            },
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
              // Poll relation removed - not in schema
              audioRecordings: true,
              urlPreviews: true,
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  shares: true,
                  views: true,
                },
              },
              aiAnalysis: {
                select: {
                  id: true,
                  sentiment: true,
                  topics: true,
                },
              },
              mentions: {
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
              reactions: {
                where: {
                  userId,
                },
                select: {
                  type: true,
                },
                take: 1,
              },
            },
          }).catch(error => {
            console.error('Error fetching standard posts:', error);
            return []; // Return empty array on error
          });

          let nextCursor: typeof cursor = undefined;
          if (standardPosts.length > limit) {
            const nextItem = standardPosts.pop();
            nextCursor = nextItem!.id;
          }

          return {
            posts: standardPosts.map(post => ({
              ...post,
              recommendationMetadata: includeReasons ? {
                reason: "Recent post",
                source: "recency",
                score: 0.9,
              } : undefined,
            })),
            nextCursor,
          };
        }

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
        try {
          await logUserBehavior(
            userId,
            UserBehaviorType.VIEW,
            'feed',
            ContentType.POST,
            {
              timestamp: new Date(),
              recommendationCount: result.length,
              sources: [...new Set(recommendations.map(rec => rec.source))],
            }
          );
        } catch (e) {
          console.error('Error logging feed view:', e);
          // Continue without interrupting the request
        }

        return {
          posts: result,
          nextCursor,
        };
      } catch (error) {
        console.error('Error fetching personalized feed:', error);
        
        // Final fallback - just return an empty result rather than throwing an error
        return {
          posts: [],
          nextCursor: undefined,
        };
      }
    }),

  // ... other methods remain (with poll references removed)
});