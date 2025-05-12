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
              poll: {
                include: {
                  options: {
                    include: {
                      _count: {
                        select: {
                          votes: true,
                        }
                      },
                      votes: userId ? {
                        where: {
                          userId,
                        },
                        select: {
                          id: true,
                        },
                      } : undefined,
                    },
                  },
                },
              },
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
                  poll: {
                    include: {
                      options: {
                        include: {
                          _count: {
                            select: {
                              votes: true,
                            }
                          },
                          votes: userId ? {
                            where: {
                              userId,
                            },
                            select: {
                              id: true,
                            },
                          } : undefined,
                        },
                      },
                    },
                  },
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
            poll: {
              include: {
                options: {
                  include: {
                    _count: {
                      select: {
                        votes: true,
                      }
                    },
                    votes: userId ? {
                      where: {
                        userId,
                      },
                      select: {
                        id: true,
                      },
                    } : undefined,
                  },
                },
              },
            },
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
          poll: {
            include: {
              options: {
                include: {
                  _count: {
                    select: {
                      votes: true,
                    }
                  },
                  votes: userId ? {
                    where: {
                      userId,
                    },
                    select: {
                      id: true,
                    },
                  } : undefined,
                },
              },
            },
          },
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
        poll: z.object({
          question: z.string(),
          options: z.array(z.object({
            text: z.string(),
            position: z.number(),
          })),
          allowMultipleChoices: z.boolean().default(false),
          isAnonymous: z.boolean().default(false),
          expiresAt: z.string().datetime().optional(),
        }).optional(),
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
        poll,
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

      // Handle poll creation
      if (poll) {
        const newPoll = await ctx.db.poll.create({
          data: {
            postId: post.id,
            question: poll.question,
            allowMultipleChoices: poll.allowMultipleChoices,
            isAnonymous: poll.isAnonymous,
            expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : undefined,
            options: {
              createMany: {
                data: poll.options.map(option => ({
                  text: option.text,
                  position: option.position,
                })),
              },
            },
          },
        });
      }

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
          poll: {
            include: {
              options: true,
            },
          },
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).max(5000).optional(),
        formattedContent: z.any().optional(),
        visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'GROUP', 'SPECIFIC_USERS']).optional(),
        hashtags: z.array(z.string()).optional(),
        location: z.string().optional().nullable(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional().nullable(),
        isPinned: z.boolean().optional(),
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

      // Prepare update data
      const updateData: any = {
        ...data,
        isEdited: true,
        editedAt: new Date(),
      };

      // If coordinates are being removed, also remove latitude and longitude
      if (data.coordinates === null) {
        updateData.latitude = null;
        updateData.longitude = null;
      } else if (data.coordinates) {
        updateData.latitude = data.coordinates.latitude;
        updateData.longitude = data.coordinates.longitude;
        delete updateData.coordinates;
      }

      // Update the post
      const updatedPost = await ctx.db.post.update({
        where: { id },
        data: updateData,
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
          poll: {
            include: {
              options: true,
            },
          },
        },
      });

      // Handle hashtags if they were updated
      if (data.hashtags !== undefined) {
        // Delete existing hashtags
        await ctx.db.postHashtag.deleteMany({
          where: { postId: id },
        });

        // Add new hashtags
        if (data.hashtags && data.hashtags.length > 0) {
          for (const tag of data.hashtags) {
            // Find or create the topic
            const topic = await ctx.db.topic.upsert({
              where: { name: tag.toLowerCase() },
              update: {},
              create: { name: tag.toLowerCase() },
            });

            // Link the topic to the post
            await ctx.db.postHashtag.create({
              data: {
                postId: id,
                topicId: topic.id,
              },
            });
          }
        }
      }

      return updatedPost;
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
              poll: {
                include: {
                  options: {
                    include: {
                      _count: {
                        select: {
                          votes: true,
                        }
                      },
                      votes: {
                        where: {
                          userId,
                        },
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
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
              poll: {
                include: {
                  options: {
                    include: {
                      _count: {
                        select: {
                          votes: true,
                        }
                      },
                      votes: {
                        where: {
                          userId,
                        },
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
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
            poll: {
              include: {
                options: {
                  include: {
                    _count: {
                      select: {
                        votes: true,
                      }
                    },
                    votes: {
                      where: {
                        userId,
                      },
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
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
              poll: {
                include: {
                  options: {
                    include: {
                      _count: {
                        select: {
                          votes: true,
                        }
                      },
                      votes: {
                        where: {
                          userId,
                        },
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
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

  react: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        type: z.enum([
          'LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 
          'CARE', 'CURIOUS', 'INSIGHTFUL', 'CELEBRATE', 'SUPPORT', 'FIRE'
        ]),
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
            data: { type: type as ReactionType },
          });
        }
      } else {
        // Create new reaction
        await ctx.db.reaction.create({
          data: {
            type: type as ReactionType,
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

      // Log user behavior if available
      try {
        const { UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');
        
        await logUserBehavior(
          ctx.session.user.id,
          UserBehaviorType.REACT,
          postId,
          'POST',
          {
            reactionType: type,
            timestamp: new Date(),
          }
        );
      } catch (error) {
        // Continue without behavior logging if it fails
        console.error('Failed to log reaction behavior:', error);
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

      // Log user behavior if available
      try {
        const { UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');
        
        await logUserBehavior(
          ctx.session.user.id,
          UserBehaviorType.SAVE,
          postId,
          'POST',
          {
            timestamp: new Date(),
          }
        );
      } catch (error) {
        // Continue without behavior logging if it fails
        console.error('Failed to log save behavior:', error);
      }

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
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, type } = input;

      // Build the where clause
      const whereClause: any = {
        userId: ctx.session.user.id,
      };

      // If a cursor is provided, only fetch saved posts created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      // Build the post filter for post type, if provided
      const postFilter = type ? {
        post: {
          type,
        }
      } : {};

      const savedPosts = await ctx.db.savedPost.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: {
          ...whereClause,
          ...postFilter,
        },
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
              poll: {
                include: {
                  options: true,
                },
              },
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
        timeframe: z.enum(['day', 'week', 'month', 'all']).default('month'),
        postId: z.string().optional(), // Optional specific post ID
      })
    )
    .query(async ({ ctx, input }) => {
      const { timeframe, postId } = input;
      const userId = ctx.session.user.id;

      // Calculate date filter based on timeframe
      let dateFilter: Date | null = null;
      if (timeframe === 'day') {
        dateFilter = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Base query for user's posts (or specific post if ID provided)
      const whereClause: any = {
        userId,
        ...(postId ? { id: postId } : {}),
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      };

      // Get posts with AI analysis
      const posts = await ctx.db.post.findMany({
        where: whereClause,
        include: {
          aiAnalysis: {
            select: {
              sentiment: true,
              topics: true,
              suggestions: true,
              detectedEntities: true,
            },
          },
          media: true,
          _count: {
            select: {
              reactions: true,
              comments: true,
              savedBy: true,
              shares: true,
              views: true,
            },
          },
          analytics: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get previous period for comparison
      let previousTimeframeStart: Date | null = null;
      let previousTimeframeEnd: Date | null = null;
      
      if (timeframe === 'day') {
        previousTimeframeStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        previousTimeframeEnd = dateFilter;
      } else if (timeframe === 'week') {
        previousTimeframeStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        previousTimeframeEnd = dateFilter;
      } else if (timeframe === 'month') {
        previousTimeframeStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        previousTimeframeEnd = dateFilter;
      }

      // Get post count for previous time period for comparison
      const previousPeriodPostCount = previousTimeframeStart && previousTimeframeEnd 
        ? await ctx.db.post.count({
            where: {
              userId,
              ...(postId ? { id: postId } : {}),
              createdAt: {
                gte: previousTimeframeStart,
                lt: previousTimeframeEnd,
              },
            },
          }) 
        : 0;

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
        total: posts.reduce((acc, post) => acc + 
          (post._count.reactions + post._count.comments + post._count.shares), 0),
      };

      // Calculate post types
      const postTypes: Record<string, number> = {};

      // Track likes by type
      const reactionTypes: Record<string, number> = {};

      // Keep track of topics for aggregation
      const topicsMap = new Map<string, number>();

      // Total views
      const totalViews = posts.reduce((sum, post) => sum + post._count.views, 0);

      // Calculate time of day distribution for posts
      const timeDistribution: Record<string, number> = {
        morning: 0,    // 6am - 12pm
        afternoon: 0,  // 12pm - 6pm
        evening: 0,    // 6pm - 12am
        night: 0,      // 12am - 6am
      };

      // Parse data from each post
      posts.forEach(post => {
        // Count sentiments
        if (post.aiAnalysis) {
          const sentiment = post.aiAnalysis.sentiment?.toLowerCase() || 'neutral';
          if (sentiment === 'positive') sentimentStats.positive++;
          else if (sentiment === 'negative') sentimentStats.negative++;
          else if (sentiment === 'neutral') sentimentStats.neutral++;
          else if (sentiment === 'mixed') sentimentStats.mixed++;
        }

        // Count post types
        postTypes[post.type] = (postTypes[post.type] || 0) + 1;

        // Determine engagement level
        const engagement = post._count.reactions + post._count.comments + post._count.shares;
        if (engagement > 10) engagementStats.high++;
        else if (engagement > 3) engagementStats.medium++;
        else engagementStats.low++;

        // Time of day counting
        const hour = new Date(post.createdAt).getHours();
        if (hour >= 6 && hour < 12) timeDistribution.morning++;
        else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
        else if (hour >= 18) timeDistribution.evening++;
        else timeDistribution.night++;

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

      // Calculate average views per post
      const averageViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

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
        const engagement = post._count.reactions + post._count.comments + post._count.shares;
        let engagementLevel: 'low' | 'medium' | 'high' = 'low';
        if (engagement > 10) engagementLevel = 'high';
        else if (engagement > 3) engagementLevel = 'medium';

        return {
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          type: post.type,
          sentiment: post.aiAnalysis?.sentiment?.toLowerCase() || 'neutral',
          engagement: engagementLevel,
          topics,
          views: post._count.views,
          shares: post._count.shares,
          reactions: post._count.reactions,
          comments: post._count.comments,
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
        postTypes,
        reactionTypes,
        averageEngagementScore,
        averageViews,
        totalViews,
        topTopics,
        recentPosts,
        timeDistribution,
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
        audioRecordings: z.array(
          z.object({
            url: z.string().url(),
            duration: z.number().optional(),
            transcript: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content, parentId, mediaUrls, audioRecordings } = input;

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
            commentId: comment.id,
            url: recording.url,
            duration: recording.duration,
            transcript: recording.transcript,
          })),
        });
      }

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

      // Log user behavior if available
      try {
        const { UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');
        
        await logUserBehavior(
          ctx.session.user.id,
          UserBehaviorType.COMMENT,
          postId,
          'POST',
          {
            commentId: comment.id,
            timestamp: new Date(),
            replyToCommentId: parentId,
          }
        );
      } catch (error) {
        // Continue without behavior logging if it fails
        console.error('Failed to log comment behavior:', error);
      }

      return comment;
    }),

  sharePost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        platform: z.enum([
          'INTERNAL', 'FACEBOOK', 'TWITTER', 'INSTAGRAM',
          'WHATSAPP', 'TELEGRAM', 'EMAIL', 'LINK', 'OTHER'
        ]).default('INTERNAL'),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, platform, message } = input;

      // Verify the post exists
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          userId: true,
          visibility: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      // Check if post can be shared based on visibility
      if (post.visibility === 'PRIVATE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This post cannot be shared due to privacy settings',
        });
      }

      // Create share record
      const share = await ctx.db.postShare.create({
        data: {
          postId,
          userId: ctx.session.user.id,
          platform: platform as SharePlatform,
          message,
        },
      });

      // Increment share count on the post
      await ctx.db.post.update({
        where: { id: postId },
        data: {
          shareCount: { increment: 1 },
        },
      });

      // Create notification for post author if shared internally
      if (platform === 'INTERNAL' && post.userId !== ctx.session.user.id) {
        await ctx.db.notification.create({
          data: {
            type: 'POST_TRENDING',
            recipientId: post.userId,
            senderId: ctx.session.user.id,
            postId,
            content: `${ctx.session.user.name} shared your post`,
          },
        });
      }

      // Log user behavior if available
      try {
        const { UserBehaviorType, logUserBehavior } = await import('@/lib/personalization');
        
        await logUserBehavior(
          ctx.session.user.id,
          UserBehaviorType.SHARE,
          postId,
          'POST',
          {
            platform,
            timestamp: new Date(),
          }
        );
      } catch (error) {
        // Continue without behavior logging if it fails
        console.error('Failed to log share behavior:', error);
      }

      return { success: true, shareId: share.id };
    }),

  reportPost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        type: z.enum([
          'SPAM', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION',
          'INAPPROPRIATE_CONTENT', 'OTHER'
        ]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, type, reason } = input;

      // Verify the post exists
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

      // Check if user already reported this post
      const existingReport = await ctx.db.postReport.findFirst({
        where: {
          postId,
          reporterId: ctx.session.user.id,
        },
      });

      if (existingReport) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have already reported this post',
        });
      }

      // Create report
      const report = await ctx.db.postReport.create({
        data: {
          postId,
          reporterId: ctx.session.user.id,
          type: type as ReportType,
          reason: reason || '',
        },
      });

      return { success: true, reportId: report.id };
    }),

  voteOnPoll: protectedProcedure
    .input(
      z.object({
        optionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { optionId } = input;

      // Get the poll option and its poll
      const option = await ctx.db.pollOption.findUnique({
        where: { id: optionId },
        include: {
          poll: true,
        },
      });

      if (!option) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Poll option not found',
        });
      }

      // Check if poll has expired
      if (option.poll.expiresAt && new Date(option.poll.expiresAt) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This poll has expired',
        });
      }

      // If this is a single-choice poll, check if user already voted
      if (!option.poll.allowMultipleChoices) {
        const existingVote = await ctx.db.pollVote.findFirst({
          where: {
            userId: ctx.session.user.id,
            pollOptionId: {
              in: await ctx.db.pollOption.findMany({
                where: { pollId: option.pollId },
                select: { id: true },
              }).then(options => options.map(o => o.id)),
            },
          },
        });

        if (existingVote) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You have already voted on this poll',
          });
        }
      } else {
        // For multiple-choice polls, check if user already voted for this option
        const existingVote = await ctx.db.pollVote.findFirst({
          where: {
            userId: ctx.session.user.id,
            pollOptionId: optionId,
          },
        });

        if (existingVote) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You have already voted for this option',
          });
        }
      }

      // Create the vote
      await ctx.db.pollVote.create({
        data: {
          userId: ctx.session.user.id,
          pollOptionId: optionId,
        },
      });

      // Get updated poll results
      const pollResults = await ctx.db.pollOption.findMany({
        where: { pollId: option.pollId },
        include: {
          _count: {
            select: { votes: true },
          },
        },
        orderBy: { position: 'asc' },
      });

      return {
        success: true,
        results: pollResults.map(opt => ({
          id: opt.id,
          text: opt.text,
          votes: opt._count.votes,
        })),
      };
    }),

  pinPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
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
          message: 'You can only pin your own posts',
        });
      }

      // First unpin any currently pinned posts
      await ctx.db.post.updateMany({
        where: {
          userId: ctx.session.user.id,
          isPinned: true,
        },
        data: {
          isPinned: false,
        },
      });

      // Then pin the requested post
      await ctx.db.post.update({
        where: { id: postId },
        data: {
          isPinned: true,
        },
      });

      return { success: true };
    }),

  unpinPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        select: {
          userId: true,
          isPinned: true,
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
          message: 'You can only unpin your own posts',
        });
      }

      if (!post.isPinned) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This post is not pinned',
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          isPinned: false,
        },
      });

      return { success: true };
    }),

  getPinnedPost: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;

      const pinnedPost = await ctx.db.post.findFirst({
        where: {
          userId,
          isPinned: true,
          published: true,
          visibility: 'PUBLIC',
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
          poll: {
            include: {
              options: {
                include: {
                  _count: {
                    select: {
                      votes: true,
                    }
                  },
                },
              },
            },
          },
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
        },
      });

      return pinnedPost;
    }),

  realityCheck: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      // Get post content and media
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          media: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      try {
        // Import the reality check function
        const { analyzeContent, RealityCheckResult } = await import('@/lib/reality-check');

        // Get media URLs if available
        const mediaUrls = post.media.length > 0 
          ? post.media.map(m => m.url)
          : undefined;

        // Analyze content
        const analysis = await analyzeContent(post.content, mediaUrls);

        return {
          success: true,
          postId,
          realityCheck: analysis,
        };
      } catch (error) {
        console.error('Error performing reality check:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze post content',
        });
      }
    }),

  getTrending: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        timeframe: z.enum(['day', 'week', 'month']).default('day'),
        type: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'LINK', 'POLL', 'AUDIO', 'DOCUMENT']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const timeframe = input?.timeframe ?? 'day';
      const postType = input?.type;
      const userId = ctx.session?.user?.id;

      // Calculate the date range based on timeframe
      const startDate = new Date();
      if (timeframe === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (timeframe === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeframe === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Build base where clause for public posts created in the timeframe
      const whereClause: any = {
        createdAt: {
          gte: startDate,
        },
        published: true,
        visibility: 'PUBLIC',
      };

      // Add type filter if specified
      if (postType) {
        whereClause.type = postType;
      }

      // Fetch posts with their engagement metrics
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
          poll: {
            include: {
              options: {
                include: {
                  _count: {
                    select: {
                      votes: true,
                    }
                  },
                  votes: userId ? {
                    where: {
                      userId,
                    },
                    select: {
                      id: true,
                    },
                  } : undefined,
                },
              },
            },
          },
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
          reactions: userId ? {
            where: {
              userId,
            },
            select: {
              type: true,
            },
          } : undefined,
        },
      });

      // Calculate engagement score for each post
      const postsWithEngagement = posts.map(post => {
        // Engagement formula: views + (reactions*2) + (comments*3) + (shares*5)
        const engagementScore = 
          post._count.views + 
          (post._count.reactions * 2) + 
          (post._count.comments * 3) + 
          (post._count.shares * 5);
        
        return {
          ...post,
          engagementScore,
        };
      });

      // Sort by engagement score and return top posts
      const trendingPosts = postsWithEngagement
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

      return {
        posts: trendingPosts.map(post => ({
          ...post,
          trending: true,
        })),
      };
    }),
});