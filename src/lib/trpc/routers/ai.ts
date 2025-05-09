import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { 
  analyzeContent, 
  generateHealthRecommendations, 
  GeminiModel, 
  createChatSession 
} from '@/lib/gemini';
// Import necessary modules

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
};

export const aiRouter = router({
  // Get the user's token limit and current usage
  getTokenLimit: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check for a token limit record
      let tokenLimit = await ctx.db.aiTokenLimit.findUnique({
        where: { userId },
      });
      
      // Create a new record if one doesn't exist
      if (!tokenLimit) {
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
      
      // Check if the reset time has passed
      if (tokenLimit.resetAt < new Date()) {
        tokenLimit = await ctx.db.aiTokenLimit.update({
          where: { userId },
          data: {
            usage: 0,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
          },
        });
      }
      
      return {
        tier: tokenLimit.tier,
        limit: tokenLimit.limit,
        usage: tokenLimit.usage,
        resetAt: tokenLimit.resetAt,
      };
    }),
  
  // Analyze content with Gemini
  analyzeContent: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { content, model = GeminiModel.PRO } = input;
      
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
      
      if (tokenLimit.usage + TOKEN_COSTS.CONTENT_ANALYSIS > tokenLimit.limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Token limit exceeded',
        });
      }
      
      // Analyze the content
      const analysis = await analyzeContent(content, model);
      
      // Update token usage
      await ctx.db.aiTokenLimit.update({
        where: { userId },
        data: {
          usage: tokenLimit.usage + TOKEN_COSTS.CONTENT_ANALYSIS,
        },
      });
      
      // Create a record of the analysis
      await ctx.db.aiContentAnalysis.create({
        data: {
          userId,
          content,
          sentiment: analysis.sentiment,
          topics: analysis.topics.join(', '),
          engagementPrediction: analysis.engagementPrediction,
          modelUsed: model,
          tokenUsage: TOKEN_COSTS.CONTENT_ANALYSIS,
        },
      });
      
      return {
        analysis,
        tokenUsage: TOKEN_COSTS.CONTENT_ANALYSIS,
      };
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
      const userId = ctx.session.user.id;
      const { healthProfileId, goals, model = GeminiModel.PRO } = input;
      
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
      
      if (tokenLimit.usage + TOKEN_COSTS.HEALTH_RECOMMENDATIONS > tokenLimit.limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Token limit exceeded',
        });
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
      
      // Update token usage
      await ctx.db.aiTokenLimit.update({
        where: { userId },
        data: {
          usage: tokenLimit.usage + TOKEN_COSTS.HEALTH_RECOMMENDATIONS,
        },
      });
      
      // Create a record of the recommendations
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
      
      return {
        recommendations,
        tokenUsage: TOKEN_COSTS.HEALTH_RECOMMENDATIONS,
      };
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
          })
        ).optional(),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { message, context = [], model = GeminiModel.PRO } = input;
      
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
      
      if (tokenLimit.usage + TOKEN_COSTS.CHAT_MESSAGE > tokenLimit.limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Token limit exceeded',
        });
      }
      
      try {
        // Create a system prompt
        const initialPrompt = `
          You are a helpful AI assistant for the DapDip social network. Your name is DapBot.
          
          About DapDip:
          - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
          - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
          
          Your capabilities:
          - Help users with platform navigation and features
          - Provide content suggestions for posts
          - Generate ideas for stories and updates
          - Offer health and wellness advice (but always clarify you're not a medical professional)
          - Analyze social media trends and topics
          
          Your tone should be friendly, helpful, and conversational. Keep responses concise and focused.
          
          Important:
          - Never provide medical diagnoses or specific medical advice
          - Respect user privacy and don't ask for personal information
          - If you don't know something, be honest about it
          
          Let's help the user in a friendly, helpful way!
        `;
        
        // Create a chat session
        const chat = await createChatSession(model, initialPrompt);
        
        // Convert context format for Gemini API
        context.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));
        
        // Send the message and get a response
        const result = await chat.sendMessage(message);
        const response = result.response.text();
        
        // Update token usage
        await ctx.db.aiTokenLimit.update({
          where: { userId },
          data: {
            usage: tokenLimit.usage + TOKEN_COSTS.CHAT_MESSAGE,
          },
        });
        
        // Log the interaction
        await ctx.db.aiChatInteraction.create({
          data: {
            userId,
            userMessage: message,
            aiResponse: response,
            modelUsed: model,
            tokenUsage: TOKEN_COSTS.CHAT_MESSAGE,
          },
        });
        
        return {
          response,
          tokenUsage: TOKEN_COSTS.CHAT_MESSAGE,
        };
      } catch (err: unknown) {
        console.error('Error in AI chat:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
        });
      }
    }),
  
  // Upgrade token tier
  upgradeTokenTier: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { tier } = input;
      
      // In a real app, this would involve payment processing
      // For now, we'll just update the tier
      
      const updatedLimit = await ctx.db.aiTokenLimit.update({
        where: { userId },
        data: {
          tier,
          limit: TOKEN_TIERS[tier],
          // Don't reset usage, but extend the reset time
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      
      return {
        tier: updatedLimit.tier,
        limit: updatedLimit.limit,
        usage: updatedLimit.usage,
        resetAt: updatedLimit.resetAt,
      };
    }),
});