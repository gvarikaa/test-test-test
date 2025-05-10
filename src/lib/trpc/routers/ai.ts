import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import {
  analyzeContent,
  generateHealthRecommendations,
  GeminiModel,
  createChatSession
} from '@/lib/gemini';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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
  MEAL_PLAN_GENERATION: 150,
  WORKOUT_PLAN_GENERATION: 150,
};

export const aiRouter = router({
  // Get the user's token limit and current usage
  getTokenLimit: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;

        // Check if aiTokenLimit is available
        if (!ctx.db.aiTokenLimit) {
          console.error('aiTokenLimit model not available in database context');
          // Return a default token limit
          return {
            tier: 'FREE',
            limit: TOKEN_TIERS.FREE,
            usage: 0,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          };
        }

        // Check for a token limit record
        let tokenLimit = await ctx.db.aiTokenLimit.findUnique({
          where: { userId },
        });

        // Create a new record if one doesn't exist
        if (!tokenLimit) {
          try {
            tokenLimit = await ctx.db.aiTokenLimit.create({
              data: {
                userId,
                tier: 'FREE',
                limit: TOKEN_TIERS.FREE,
                usage: 0,
                resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
              },
            });
          } catch (error) {
            console.error('Error creating token limit record:', error);
            // Return a default token limit if creation fails
            return {
              tier: 'FREE',
              limit: TOKEN_TIERS.FREE,
              usage: 0,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };
          }
        }

        // Check if the reset time has passed
        if (tokenLimit.resetAt < new Date()) {
          try {
            tokenLimit = await ctx.db.aiTokenLimit.update({
              where: { userId },
              data: {
                usage: 0,
                resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
              },
            });
          } catch (error) {
            console.error('Error updating token limit reset time:', error);
          }
        }

        return {
          tier: tokenLimit.tier,
          limit: tokenLimit.limit,
          usage: tokenLimit.usage,
          resetAt: tokenLimit.resetAt,
        };
      } catch (error) {
        console.error('Error in getTokenLimit:', error);
        // Return default values if anything fails
        return {
          tier: 'FREE',
          limit: TOKEN_TIERS.FREE,
          usage: 0,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      }
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
      try {
        const userId = ctx.session.user.id;
        const { content, model = GeminiModel.PRO } = input;

        // Check if aiTokenLimit is available
        if (!ctx.db.aiTokenLimit) {
          console.error('aiTokenLimit model not available in database context');
          // Proceed without token checking
          const analysis = await analyzeContent(content, model);
          return {
            analysis,
            tokenUsage: TOKEN_COSTS.CONTENT_ANALYSIS,
          };
        }

        // Check token limits
        let tokenLimit;
        try {
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

          if (tokenLimit.usage + TOKEN_COSTS.CONTENT_ANALYSIS > tokenLimit.limit) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Token limit exceeded',
            });
          }
        } catch (error) {
          console.error('Error checking token limits:', error);
          // Proceed without token checking
        }

        // Analyze the content
        const analysis = await analyzeContent(content, model);

        // Update token usage if possible
        try {
          if (tokenLimit) {
            await ctx.db.aiTokenLimit.update({
              where: { userId },
              data: {
                usage: tokenLimit.usage + TOKEN_COSTS.CONTENT_ANALYSIS,
              },
            });
          }

          // Create a record of the analysis if possible
          if (ctx.db.aiContentAnalysis) {
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
          }
        } catch (error) {
          console.error('Error updating token usage or creating analysis record:', error);
        }

        return {
          analysis,
          tokenUsage: TOKEN_COSTS.CONTENT_ANALYSIS,
        };
      } catch (error) {
        console.error('Error in analyzeContent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
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
          })
        ).optional(),
        model: z.enum(['gemini-1.5-pro', '2.5-flash']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { message, context = [], model = GeminiModel.PRO } = input;

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

            if (tokenLimit.usage + TOKEN_COSTS.CHAT_MESSAGE > tokenLimit.limit) {
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

        // Update token usage if possible
        try {
          if (tokenLimit && ctx.db.aiTokenLimit) {
            await ctx.db.aiTokenLimit.update({
              where: { userId },
              data: {
                usage: tokenLimit.usage + TOKEN_COSTS.CHAT_MESSAGE,
              },
            });
          }

          // Log the interaction if model exists
          if (ctx.db.aiChatInteraction) {
            await ctx.db.aiChatInteraction.create({
              data: {
                userId,
                userMessage: message,
                aiResponse: response,
                modelUsed: model,
                tokenUsage: TOKEN_COSTS.CHAT_MESSAGE,
              },
            });
          }
        } catch (error) {
          console.error('Error updating token usage or creating chat record:', error);
        }

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