import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import {
  analyzeContent,
  generateHealthRecommendations,
  GeminiModel,
  createChatSession,
  analyzeImage,
  getModelInstance,
  ModelPreset,
  getModelPreset,
  SafetyLevel,
  ContextSize
} from '@/lib/gemini';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  TokenTier,
  TOKEN_TIER_LIMITS,
  MONTHLY_ALLOCATIONS,
  TOKEN_COSTS,
  initializeTokenLimit,
  checkTokenAvailability,
  recordTokenUsage,
  resetTokenUsage,
  upgradeTier as upgradeUserTier,
  getTokenUsageStats,
  grantBonusTokens,
  estimateTokenCount
} from '@/lib/token-management';
import {
  detectLanguage,
  translateText,
  analyzeLanguageQuality,
  generateMultilingualContent,
  SupportedLanguage,
  LANGUAGE_NAMES
} from '@/lib/multilingual';
import {
  ChatPersonality,
  MemoryType,
  createMemoryItem,
  getUserMemories,
  updateMemoryImportance,
  deleteMemory,
  extractMemoryFromChat,
  buildChatContext,
  getPersonalityPrompt,
  getPersonalityTemperature,
  getAvailablePersonalities,
  getUserPreferredPersonality,
  setUserPreferredPersonality
} from '@/lib/chat-memory';

// Token tiers
const TOKEN_TIERS = {
  FREE: 150,
  BASIC: 1000,
  PRO: 5000,
  ENTERPRISE: 10000,
};

// Estimated token costs for different operations
const TOKEN_COSTS = {
  CONTENT_ANALYSIS: 50,
  HEALTH_RECOMMENDATIONS: 100,
  CHAT_MESSAGE: 30,
  MEAL_PLAN_GENERATION: 150,
  WORKOUT_PLAN_GENERATION: 150,
};

export const aiRouter = router({
  // Get the user's token limit and current usage
  getTokenLimit: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;

        // Use the token management service to get or create the token limit
        let tokenLimit = await initializeTokenLimit(userId);

        // Check if the reset time has passed
        if (tokenLimit.resetAt < new Date()) {
          await resetTokenUsage(userId);
          tokenLimit = await ctx.db.aiTokenLimit.findUnique({
            where: { userId },
          }) || tokenLimit;
        }

        return {
          tier: tokenLimit.tier,
          limit: tokenLimit.limit,
          usage: tokenLimit.usage,
          resetAt: tokenLimit.resetAt,
          monthlyAllocation: tokenLimit.monthlyAllocation,
          previousMonthCarry: tokenLimit.previousMonthCarry,
          bonusTokens: tokenLimit.bonusTokens,
          lifetimeUsage: tokenLimit.lifetimeUsage,
          lifetimeAllocated: tokenLimit.lifetimeAllocated,
          lastActivity: tokenLimit.lastActivity,
        };
      } catch (error) {
        console.error('Error in getTokenLimit:', error);
        // Return default values if anything fails
        return {
          tier: TokenTier.FREE,
          limit: TOKEN_TIER_LIMITS[TokenTier.FREE],
          usage: 0,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          monthlyAllocation: MONTHLY_ALLOCATIONS[TokenTier.FREE],
          previousMonthCarry: 0,
          bonusTokens: 0,
          lifetimeUsage: 0,
          lifetimeAllocated: 0,
        };
      }
    }),

  // Get token usage statistics
  getTokenUsageStats: protectedProcedure
    .input(
      z.object({
        timeframe: z.enum(['day', 'week', 'month', 'year']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { timeframe = 'month' } = input;

        // Get token usage statistics using the token management service
        const stats = await getTokenUsageStats(userId, timeframe);

        return stats;
      } catch (error) {
        console.error('Error in getTokenUsageStats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve token usage statistics',
        });
      }
    }),
  
  // Analyze content with Gemini
  analyzeContent: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
          'gemini-1.5-pro-vision',
          'gemini-pro-vision'
        ]).optional(),
        analysisType: z.enum(['standard', 'detailed', 'sentiment', 'moderation']).optional(),
        modelPreset: z.enum(['default', 'creative', 'balanced', 'precise']).optional(),
        safetyLevel: z.enum(['minimal', 'standard', 'strict', 'maximum']).optional(),
        contextSize: z.enum(['small', 'medium', 'large', 'maximum']).optional(),
        customConfig: z.object({
          temperature: z.number().min(0).max(1).optional(),
          topK: z.number().optional(),
          topP: z.number().min(0).max(1).optional(),
          maxOutputTokens: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const {
          content,
          model = GeminiModel.PRO_1_5,
          analysisType = 'standard',
          modelPreset = 'balanced',
          safetyLevel = 'standard',
          contextSize,
          customConfig = {}
        } = input;

        // Check if tokens are available for this operation
        const operationCost = TOKEN_COSTS.CONTENT_ANALYSIS[analysisType];
        const hasTokens = await checkTokenAvailability(userId, 'CONTENT_ANALYSIS', analysisType);

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Prepare generation parameters
        const params = customConfig && Object.keys(customConfig).length > 0
          ? customConfig
          : getModelPreset(modelPreset as ModelPreset);

        // Get context size enumeration if specified
        const contextSizeEnum = contextSize
          ? ContextSize[contextSize.toUpperCase() as keyof typeof ContextSize]
          : undefined;

        // Analyze the content
        const startTime = Date.now();
        const analysis = await analyzeContent(
          content,
          model as GeminiModel,
          analysisType as 'standard' | 'detailed' | 'sentiment' | 'moderation',
          params,
          safetyLevel as SafetyLevel
        );
        const responseTime = Date.now() - startTime;

        // Estimate token usage
        const promptTokens = estimateTokenCount(content) + 300; // Add 300 for system prompts
        const completionTokens = estimateTokenCount(JSON.stringify(analysis));
        const totalTokens = operationCost || promptTokens + completionTokens;

        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'CONTENT_ANALYSIS',
          tokensUsed: totalTokens,
          model: model,
          endpoint: 'ai.analyzeContent',
          featureArea: 'content',
          prompt: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          promptTokens,
          completionTokens,
          success: true,
          responseTime,
          metadata: {
            analysisType,
            modelPreset,
            safetyLevel,
            contentLength: content.length,
          }
        });

        // Create a record of the analysis
        if (ctx.db.aiContentAnalysis) {
          await ctx.db.aiContentAnalysis.create({
            data: {
              userId,
              content: content.substring(0, 500), // Limit stored content for privacy
              sentiment: analysis.sentiment,
              topics: analysis.topics.join(', '),
              engagementPrediction: analysis.engagementPrediction,
              modelUsed: model,
              tokenUsage: totalTokens,
            },
          });
        }

        return {
          analysis,
          tokenUsage: totalTokens,
          responseTime,
          model,
        };
      } catch (error) {
        console.error('Error in analyzeContent:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze content',
        });
      }
    }),
  
  // Generate health recommendations
  generateHealthRecommendations: protectedProcedure
    .input(
      z.object({
        healthProfileId: z.string(),
        goals: z.array(z.string()).min(1).max(5),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { healthProfileId, goals, model = GeminiModel.PRO } = input;

        // Check if token models are available
        let tokenLimit;
        if (ctx.db.aiTokenLimit) {
          try {
            // Check token limits
            tokenLimit = await ctx.db.aiTokenLimit.findUnique({
              where: { userId },
            });

            if (!tokenLimit) {
              // Create a new token limit record
              tokenLimit = await ctx.db.aiTokenLimit.create({
                data: {
                  userId,
                  tier: 'FREE',
                  limit: TOKEN_TIERS.FREE,
                  usage: 0,
                  resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
                },
              });
            }

            if (tokenLimit.usage + TOKEN_COSTS.HEALTH_RECOMMENDATIONS > tokenLimit.limit) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Token limit exceeded',
              });
            }
          } catch (error) {
            console.error('Error checking token limits:', error);
            // Proceed without token checking if there's an error
          }
        }

        // Get the health profile
        const healthProfile = await ctx.db.healthProfile.findUnique({
          where: { id: healthProfileId },
        });

        if (!healthProfile || healthProfile.userId !== userId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Health profile not found',
          });
        }

        // Generate recommendations
        const recommendations = await generateHealthRecommendations(healthProfile, goals, model);

        // Update token usage if possible
        try {
          if (tokenLimit && ctx.db.aiTokenLimit) {
            await ctx.db.aiTokenLimit.update({
              where: { userId },
              data: {
                usage: tokenLimit.usage + TOKEN_COSTS.HEALTH_RECOMMENDATIONS,
              },
            });
          }

          // Create a record of the recommendations if model exists
          if (ctx.db.aiHealthRecommendation) {
            await ctx.db.aiHealthRecommendation.create({
              data: {
                userId,
                healthProfileId,
                goals: goals.join(', '),
                recommendations: JSON.stringify(recommendations),
                modelUsed: model,
                tokenUsage: TOKEN_COSTS.HEALTH_RECOMMENDATIONS,
              },
            });
          }
        } catch (error) {
          console.error('Error updating token usage or creating recommendation record:', error);
        }

        return {
          recommendations,
          tokenUsage: TOKEN_COSTS.HEALTH_RECOMMENDATIONS,
        };
      } catch (error) {
        console.error('Error in generateHealthRecommendations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate health recommendations',
        });
      }
    }),
  
  // Chat with AI assistant
  chatWithAssistant: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(1000),
        context: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            timestamp: z.date().optional(),
          })
        ).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash'
        ]).optional(),
        personality: z.enum([
          'default',
          'friendly',
          'professional',
          'creative',
          'concise',
          'caring',
          'humorous'
        ]).optional(),
        extractMemories: z.boolean().optional(),
        saveMemories: z.boolean().optional(),
        useMemories: z.boolean().optional(),
        contextSize: z.enum(['small', 'medium', 'large', 'maximum']).optional(),
        memoryToAdd: z.object({
          content: z.string(),
          type: z.enum(['short-term', 'long-term', 'episodic', 'semantic']),
          importance: z.number().min(1).max(10).optional(),
          context: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const {
          message,
          context = [],
          model = GeminiModel.PRO_1_5,
          personality: requestedPersonality,
          extractMemories = false,
          saveMemories = true,
          useMemories = true,
          contextSize,
          memoryToAdd
        } = input;

        // Get message length category for token cost calculation
        const messageLength = message.length < 100 ? 'short' : message.length < 500 ? 'medium' : 'long';
        const tokenCost = TOKEN_COSTS.CHAT_MESSAGE[messageLength];

        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'CHAT_MESSAGE', messageLength);

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Add user memory if provided
        if (memoryToAdd) {
          await createMemoryItem(
            userId,
            memoryToAdd.type as MemoryType,
            memoryToAdd.content,
            memoryToAdd.importance || 5,
            memoryToAdd.context,
            { source: 'user-provided' }
          );
        }

        // Get user's preferred personality if not specified
        let personality = requestedPersonality as ChatPersonality | undefined;
        if (!personality) {
          personality = await getUserPreferredPersonality(userId);
        }

        // Format context with timestamps
        const formattedContext = context.map(msg => ({
          ...msg,
          timestamp: msg.timestamp || new Date(),
        }));

        // Build chat context with memories if requested
        let chatContext;
        if (useMemories) {
          chatContext = await buildChatContext(
            userId,
            formattedContext,
            personality
          );
        }

        // Get personality-specific system prompt
        const systemPrompt = getPersonalityPrompt(personality, chatContext);

        // Get personality-specific temperature
        const temperature = getPersonalityTemperature(personality);

        // Convert context format for Gemini API
        const convertedContext = formattedContext.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));

        // Get context size enum if specified
        const contextSizeEnum = contextSize
          ? ContextSize[contextSize.toUpperCase() as keyof typeof ContextSize]
          : undefined;

        // Measure start time for performance tracking
        const startTime = Date.now();

        // Create a chat session with personality and context awareness
        const chat = await createChatSession(
          model as GeminiModel,
          undefined,
          {
            temperature,
            maxOutputTokens: 1024
          },
          SafetyLevel.STANDARD,
          contextSizeEnum,
          systemPrompt
        );

        // Add previous context messages
        if (convertedContext.length > 0) {
          // Limiting to last 10 messages for better performance
          for (const msg of convertedContext.slice(-10)) {
            await chat.sendMessage(msg.parts[0].text);
          }
        }

        // Send the new message and get a response
        const result = await chat.sendMessage(message);
        const response = result.response.text();

        // Measure response time
        const responseTime = Date.now() - startTime;

        // Extract memories from conversation if requested
        if (extractMemories && saveMemories && formattedContext.length >= 3) {
          extractMemoryFromChat(
            userId,
            [...formattedContext, { role: 'user', content: message }, { role: 'assistant', content: response }],
            model as GeminiModel
          ).catch(error => {
            console.error('Error extracting memories:', error);
          });
        }

        // Estimate token usage
        const promptTokens = estimateTokenCount(systemPrompt + message) +
          formattedContext.slice(-10).reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
        const completionTokens = estimateTokenCount(response);
        const totalTokens = promptTokens + completionTokens;

        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'CHAT_MESSAGE',
          tokensUsed: totalTokens,
          model: model,
          endpoint: 'ai.chatWithAssistant',
          featureArea: 'chat',
          prompt: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          promptTokens,
          completionTokens,
          success: true,
          responseTime,
          metadata: {
            messageLength,
            contextLength: formattedContext.length,
            personality,
            usedMemories: useMemories,
            extractedMemories: extractMemories,
          }
        });

        // Log the interaction
        await ctx.db.aiChatInteraction.create({
          data: {
            userId,
            userMessage: message,
            aiResponse: response,
            modelUsed: model,
            tokenUsage: totalTokens,
            personality,
            metadata: {
              messageLength,
              contextLength: formattedContext.length,
              usedMemories: useMemories,
              extractedMemories: extractMemories,
              responseTime,
            },
          },
        });

        return {
          response,
          tokenUsage: totalTokens,
          personality,
          responseTime,
          model,
        };
      } catch (error) {
        console.error('Error in AI chat:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get AI response',
        });
      }
    }),

  // Get user chat memories
  getChatMemories: protectedProcedure
    .input(
      z.object({
        type: z.enum(['short-term', 'long-term', 'episodic', 'semantic']).optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { type, limit } = input;

        // Get user memories
        const memories = await getUserMemories(
          userId,
          type as MemoryType | undefined,
          limit
        );

        return memories;
      } catch (error) {
        console.error('Error getting chat memories:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve chat memories',
        });
      }
    }),

  // Add a new memory item
  createChatMemory: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(1000),
        type: z.enum(['short-term', 'long-term', 'episodic', 'semantic']),
        importance: z.number().min(1).max(10).optional(),
        context: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { content, type, importance = 5, context, metadata } = input;

        // Create memory item
        const memory = await createMemoryItem(
          userId,
          type as MemoryType,
          content,
          importance,
          context,
          metadata
        );

        return memory;
      } catch (error) {
        console.error('Error creating chat memory:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create chat memory',
        });
      }
    }),

  // Delete a memory item
  deleteChatMemory: protectedProcedure
    .input(
      z.object({
        memoryId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { memoryId } = input;

        // Verify memory belongs to user
        const memory = await ctx.db.aIChatMemory.findFirst({
          where: {
            id: memoryId,
            userId,
          },
        });

        if (!memory) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Memory not found',
          });
        }

        // Delete memory
        await deleteMemory(memoryId);

        return { success: true };
      } catch (error) {
        console.error('Error deleting chat memory:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete chat memory',
        });
      }
    }),

  // Get available chat personalities
  getChatPersonalities: protectedProcedure
    .query(async () => {
      try {
        // Get available personalities
        const personalities = getAvailablePersonalities();

        return personalities;
      } catch (error) {
        console.error('Error getting chat personalities:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve chat personalities',
        });
      }
    }),

  // Get user's preferred chat personality
  getUserPersonality: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;

        // Get user's preferred personality
        const personality = await getUserPreferredPersonality(userId);

        return { personality };
      } catch (error) {
        console.error('Error getting user personality:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user personality',
        });
      }
    }),

  // Set user's preferred chat personality
  setUserPersonality: protectedProcedure
    .input(
      z.object({
        personality: z.enum([
          'default',
          'friendly',
          'professional',
          'creative',
          'concise',
          'caring',
          'humorous'
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { personality } = input;

        // Set user's preferred personality
        await setUserPreferredPersonality(userId, personality as ChatPersonality);

        return { success: true, personality };
      } catch (error) {
        console.error('Error setting user personality:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set user personality',
        });
      }
    }),
  
  // Upgrade token tier
  upgradeTokenTier: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM']),
        period: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']).optional(),
        model: z.enum(['GEMINI_1_5_PRO', 'GEMINI_2_5_PRO', 'AUTO']).optional(),
        customTokens: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { tier, period = 'MONTHLY', model = 'AUTO', customTokens } = input;

      // Upgrade user tier using token management service
      await upgradeUserTier(userId, {
        tier: tier as TokenTier,
        resetType: 'none',
        bonusTokens: 50, // Bonus tokens for upgrading
        subscriptionPeriod: period,
        preferredModel: model,
        customTokens: tier === 'CUSTOM' ? customTokens : undefined,
      });

      // Get the updated token limit
      const tokenLimit = await ctx.db.aiTokenLimit.findUnique({
        where: { userId },
      });

      if (!tokenLimit) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token limit not found after upgrade',
        });
      }

      return {
        tier: tokenLimit.tier,
        limit: tokenLimit.limit,
        usage: tokenLimit.usage,
        resetAt: tokenLimit.resetAt,
        monthlyAllocation: tokenLimit.monthlyAllocation,
        previousMonthCarry: tokenLimit.previousMonthCarry,
        bonusTokens: tokenLimit.bonusTokens,
        subscriptionPeriod: tokenLimit.subscriptionPeriod,
        preferredModel: tokenLimit.preferredModel,
        subscriptionEndsAt: tokenLimit.subscriptionEndsAt,
      };
    }),

  // Get subscription plans
  getSubscriptionPlans: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Get subscription plans from the database
        const plans = await ctx.db.aISubscriptionPlan.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        });

        return plans;
      } catch (error) {
        console.error('Error getting subscription plans:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve subscription plans',
        });
      }
    }),

  // Purchase token package
  purchaseTokenPackage: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM']),
        period: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']),
        model: z.enum(['GEMINI_1_5_PRO', 'GEMINI_2_5_PRO', 'AUTO']),
        paymentMethod: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CRYPTO', 'MANUAL']),
        customTokens: z.number().optional(),
        transactionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const {
          tier,
          period,
          model,
          paymentMethod,
          customTokens,
          transactionId
        } = input;

        // Get pricing info
        const tierPrices = {
          'BASIC': 9.99,
          'PRO': 24.99,
          'ENTERPRISE': 49.99,
          'CUSTOM': customTokens ? customTokens * 0.00025 : 39.99,
        };

        const periodMultipliers = {
          'MONTHLY': 1,
          'QUARTERLY': 3,
          'BIANNUAL': 6,
          'ANNUAL': 12,
        };

        const periodDiscounts = {
          'MONTHLY': 0,
          'QUARTERLY': 10,
          'BIANNUAL': 15,
          'ANNUAL': 20,
        };

        // Calculate cost with period discount
        const basePrice = tierPrices[tier];
        const discount = periodDiscounts[period];
        const discountedPrice = basePrice * (1 - discount / 100);
        const totalCost = discountedPrice * periodMultipliers[period];

        // Calculate token amounts
        const monthlyTokens = tier === 'BASIC' ? 30000 :
                            tier === 'PRO' ? 100000 :
                            tier === 'ENTERPRISE' ? 250000 :
                            customTokens || 50000;

        const totalTokens = monthlyTokens * periodMultipliers[period];

        // Calculate subscription end date
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + periodMultipliers[period]);

        // Daily token limits
        const dailyLimits = {
          'BASIC': 1000,
          'PRO': 5000,
          'ENTERPRISE': 10000,
          'CUSTOM': Math.max(1000, Math.floor(customTokens ? customTokens / 30 : 2000)),
        };

        // Get token limit record or create it
        let tokenLimit = await ctx.db.aiTokenLimit.findUnique({
          where: { userId },
        });

        if (!tokenLimit) {
          tokenLimit = await ctx.db.aiTokenLimit.create({
            data: {
              userId,
              tier: 'FREE',
              limit: 150,
              usage: 0,
              resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
              monthlyAllocation: 5000,
            },
          });
        }

        // Create token purchase history
        await ctx.db.tokenPurchaseHistory.create({
          data: {
            tokenLimitId: tokenLimit.id,
            amount: totalTokens,
            cost: totalCost,
            currency: 'USD',
            expiryDate: endDate,
            tier: tier,
            period: period,
            paymentMethod: paymentMethod,
            transactionId: transactionId || `TR-${Date.now()}`,
            isRecurring: true,
            model: model,
            discountPercent: discount,
          },
        });

        // Calculate carryover percentages
        const carryOverPercentages = {
          'BASIC': 10,
          'PRO': 25,
          'ENTERPRISE': 50,
          'CUSTOM': 40,
        };

        // Update token limit
        await ctx.db.aiTokenLimit.update({
          where: { id: tokenLimit.id },
          data: {
            tier: tier,
            limit: dailyLimits[tier],
            monthlyAllocation: monthlyTokens,
            subscriptionPeriod: period,
            subscriptionStartedAt: now,
            subscriptionEndsAt: endDate,
            preferredModel: model,
            carryOverPercent: carryOverPercentages[tier],
            carryOverLimit: Math.floor(monthlyTokens * carryOverPercentages[tier] / 100),
            autoRenew: true,
            paymentMethod: paymentMethod,
            lastBillingDate: now,
            nextBillingDate: endDate,
            discountPercent: discount,
            subscriptionActive: true,
            customTokens: tier === 'CUSTOM' ? customTokens : null,
          },
        });

        // Get updated token limit
        const updatedTokenLimit = await ctx.db.aiTokenLimit.findUnique({
          where: { userId },
        });

        if (!updatedTokenLimit) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve updated token limit after purchase',
          });
        }

        return {
          success: true,
          transactionId: transactionId || `TR-${Date.now()}`,
          purchaseDate: now,
          expiryDate: endDate,
          tier: updatedTokenLimit.tier,
          monthlyAllocation: updatedTokenLimit.monthlyAllocation,
          cost: totalCost,
          currency: 'USD',
        };
      } catch (error) {
        console.error('Error purchasing token package:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to purchase token package',
        });
      }
    }),

  // Get user token purchase history
  getTokenPurchaseHistory: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;

        // Get token limit ID
        const tokenLimit = await ctx.db.aiTokenLimit.findUnique({
          where: { userId },
        });

        if (!tokenLimit) {
          return [];
        }

        // Get purchase history
        const purchases = await ctx.db.tokenPurchaseHistory.findMany({
          where: {
            tokenLimitId: tokenLimit.id,
          },
          orderBy: {
            purchaseDate: 'desc',
          },
        });

        return purchases;
      } catch (error) {
        console.error('Error getting token purchase history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve token purchase history',
        });
      }
    }),

  // Detect language of text
  detectLanguage: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro'
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { text, model = GeminiModel.PRO_1_5 } = input;

        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'TRANSLATION', 'detection');

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Detect language
        const detectionResult = await detectLanguage(
          text,
          userId,
          model as GeminiModel
        );

        return detectionResult;
      } catch (error) {
        console.error('Error detecting language:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to detect language',
        });
      }
    }),

  // Translate text between languages
  translateText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        targetLanguage: z.string().min(2).max(5),
        sourceLanguage: z.string().min(2).max(5).optional(),
        preserveFormatting: z.boolean().optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro'
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const {
          text,
          targetLanguage,
          sourceLanguage,
          preserveFormatting = true,
          model = GeminiModel.PRO_1_5
        } = input;

        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'TRANSLATION', 'standard');

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Translate text
        const translationResult = await translateText(
          text,
          targetLanguage as SupportedLanguage,
          sourceLanguage as SupportedLanguage | undefined,
          userId,
          preserveFormatting,
          model as GeminiModel
        );

        return translationResult;
      } catch (error) {
        console.error('Error translating text:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to translate text',
        });
      }
    }),

  // Analyze language quality
  analyzeLanguageQuality: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        language: z.string().min(2).max(5).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro'
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { text, language, model = GeminiModel.PRO_1_5 } = input;

        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'LANGUAGE_ANALYSIS', 'standard');

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Analyze language quality
        const analysisResult = await analyzeLanguageQuality(
          text,
          language as SupportedLanguage | undefined,
          userId,
          model as GeminiModel
        );

        return analysisResult;
      } catch (error) {
        console.error('Error analyzing language quality:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze language quality',
        });
      }
    }),

  // Generate multilingual content
  generateMultilingualContent: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(1000),
        targetLanguage: z.string().min(2).max(5),
        contentType: z.enum(['post', 'comment', 'headline', 'story', 'response']),
        tone: z.enum(['formal', 'casual', 'professional', 'friendly']).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro'
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const {
          prompt,
          targetLanguage,
          contentType,
          tone = 'casual',
          model = GeminiModel.PRO_1_5
        } = input;

        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'MULTILINGUAL_GENERATION', 'standard');

        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }

        // Generate multilingual content
        const generatedContent = await generateMultilingualContent(
          prompt,
          targetLanguage as SupportedLanguage,
          contentType,
          tone as 'formal' | 'casual' | 'professional' | 'friendly',
          userId,
          model as GeminiModel
        );

        return {
          content: generatedContent,
          targetLanguage,
          languageName: LANGUAGE_NAMES[targetLanguage] || targetLanguage,
          contentType
        };
      } catch (error) {
        console.error('Error generating multilingual content:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate multilingual content',
        });
      }
    }),

  // Get supported languages
  getSupportedLanguages: protectedProcedure
    .query(async () => {
      try {
        // Return the list of supported languages
        return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
          code,
          name
        }));
      } catch (error) {
        console.error('Error getting supported languages:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get supported languages',
        });
      }
    }),

  // Generate meal plan with AI
  generateMealPlan: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        dietaryRestrictions: z.string(),
        goals: z.array(z.string()),
        daysCount: z.number().min(1).max(30).optional().default(7),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { profileId, dietaryRestrictions, goals, daysCount = 7, model = GeminiModel.PRO } = input;

      // Check token limits
      const tokenLimit = await ctx.db.aiTokenLimit.findUnique({
        where: { userId },
      });

      if (!tokenLimit) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token limit record not found',
        });
      }

      if (tokenLimit.usage + TOKEN_COSTS.MEAL_PLAN_GENERATION > tokenLimit.limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Token limit exceeded',
        });
      }

      // Get the health profile
      const healthProfile = await ctx.db.healthProfile.findUnique({
        where: { id: profileId },
      });

      if (!healthProfile || healthProfile.userId !== userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Health profile not found',
        });
      }

      try {
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

        // Safety settings
        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ];

        // Create a model instance
        const geminiModel = genAI.getGenerativeModel({
          model,
          safetySettings,
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        // Prepare prompt
        const prompt = `
        Generate a personalized meal plan based on the following profile and requirements:

        Health Profile:
        - Age: ${healthProfile.age || 'Not specified'}
        - Weight: ${healthProfile.weight ? `${healthProfile.weight} kg` : 'Not specified'}
        - Height: ${healthProfile.height ? `${healthProfile.height} cm` : 'Not specified'}
        - Gender: ${healthProfile.gender || 'Not specified'}
        - Activity Level: ${healthProfile.activityLevel || 'Not specified'}
        - Dietary Restrictions: ${dietaryRestrictions || 'None'}

        Goals:
        ${goals.map(goal => `- ${goal}`).join('\n')}

        Requirements:
        - Create a meal plan for ${daysCount} days
        - Include a variety of meals (breakfast, lunch, dinner, snacks)
        - Meals should be balanced and nutritious
        - Respect any dietary restrictions
        - Include nutritional information when possible (calories, protein, carbs, fat)
        - Add simple recipes for some meals

        Format your response as a JSON object with the following structure:
        {
          "name": "A descriptive name for the meal plan",
          "description": "Brief description of the meal plan",
          "meals": [
            {
              "name": "Meal name",
              "type": "breakfast/lunch/dinner/snack",
              "calories": number,
              "protein": number,
              "carbs": number,
              "fat": number,
              "recipe": "Brief recipe or instructions"
            }
          ]
        }

        IMPORTANT: Ensure all content is non-specific health advice only, mentioning that this is general information and not medical advice.
        `;

        // Generate content
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error('Failed to parse JSON response');
        }

        const mealPlan = JSON.parse(jsonMatch[0]);

        // Update token usage
        await ctx.db.aiTokenLimit.update({
          where: { userId },
          data: {
            usage: tokenLimit.usage + TOKEN_COSTS.MEAL_PLAN_GENERATION,
          },
        });

        // Log the AI interaction
        await ctx.db.aiChatInteraction.create({
          data: {
            userId,
            userMessage: 'Generate meal plan',
            aiResponse: text,
            modelUsed: model,
            tokenUsage: TOKEN_COSTS.MEAL_PLAN_GENERATION,
          },
        });

        return mealPlan;
      } catch (error) {
        console.error('Error generating meal plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate meal plan',
        });
      }
    }),

  // Generate workout plan with AI
  generateWorkoutPlan: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        fitnessLevel: z.string(),
        goals: z.array(z.string()),
        daysPerWeek: z.number().min(1).max(7).optional().default(3),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { profileId, fitnessLevel, goals, daysPerWeek = 3, model = GeminiModel.PRO } = input;

      // Check token limits
      const tokenLimit = await ctx.db.aiTokenLimit.findUnique({
        where: { userId },
      });

      if (!tokenLimit) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token limit record not found',
        });
      }

      if (tokenLimit.usage + TOKEN_COSTS.WORKOUT_PLAN_GENERATION > tokenLimit.limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Token limit exceeded',
        });
      }

      // Get the health profile
      const healthProfile = await ctx.db.healthProfile.findUnique({
        where: { id: profileId },
      });

      if (!healthProfile || healthProfile.userId !== userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Health profile not found',
        });
      }

      try {
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

        // Safety settings
        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ];

        // Create a model instance
        const geminiModel = genAI.getGenerativeModel({
          model,
          safetySettings,
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });

        // Prepare prompt
        const prompt = `
        Generate a personalized workout plan based on the following profile and requirements:

        Health Profile:
        - Age: ${healthProfile.age || 'Not specified'}
        - Weight: ${healthProfile.weight ? `${healthProfile.weight} kg` : 'Not specified'}
        - Height: ${healthProfile.height ? `${healthProfile.height} cm` : 'Not specified'}
        - Gender: ${healthProfile.gender || 'Not specified'}
        - Activity Level: ${healthProfile.activityLevel || 'Not specified'}
        - Fitness Level: ${fitnessLevel || 'Not specified'}

        Goals:
        ${goals.map(goal => `- ${goal}`).join('\n')}

        Requirements:
        - Create a workout plan with exercises for ${daysPerWeek} days per week
        - Include a variety of exercises that target different muscle groups
        - Provide details like sets, reps, and rest times
        - Appropriate for their fitness level (${fitnessLevel})
        - Include warm-up and cool-down suggestions

        Format your response as a JSON object with the following structure:
        {
          "name": "A descriptive name for the workout plan",
          "description": "Brief description of the workout plan",
          "workouts": [
            {
              "name": "Workout name (e.g., 'Day 1: Lower Body')",
              "type": "Strength/Cardio/Flexibility/etc.",
              "duration": estimated_minutes,
              "exercises": [
                {
                  "name": "Exercise name",
                  "sets": number_of_sets,
                  "reps": reps_per_set,
                  "restTime": rest_time_in_seconds,
                  "notes": "Any special instructions or form tips"
                }
              ]
            }
          ]
        }

        IMPORTANT: Ensure all content is non-specific health advice only, mentioning that this is general information and not medical advice.
        `;

        // Generate content
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error('Failed to parse JSON response');
        }

        const workoutPlan = JSON.parse(jsonMatch[0]);

        // Update token usage
        await ctx.db.aiTokenLimit.update({
          where: { userId },
          data: {
            usage: tokenLimit.usage + TOKEN_COSTS.WORKOUT_PLAN_GENERATION,
          },
        });

        // Log the AI interaction
        await ctx.db.aiChatInteraction.create({
          data: {
            userId,
            userMessage: 'Generate workout plan',
            aiResponse: text,
            modelUsed: model,
            tokenUsage: TOKEN_COSTS.WORKOUT_PLAN_GENERATION,
          },
        });

        return workoutPlan;
      } catch (error) {
        console.error('Error generating workout plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate workout plan',
        });
      }
    }),
});