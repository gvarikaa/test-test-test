import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import {
  analyzeSEO,
  generateMetadata,
  analyzeKeywords,
  suggestLinks,
  optimizeContent,
  generateFAQs,
  analyzeCompetitors,
  generateStructuredData,
  optimizeURLStructure,
  identifyTrendingTopics,
  SEOCategory,
  SEOPriority,
  SEOScoreLevel,
} from '@/lib/seo-optimization';
import { GeminiModel } from '@/lib/gemini';
import { checkTokenAvailability, recordTokenUsage } from '@/lib/token-management';

export const seoRouter = router({
  // Get SEO analysis for content
  analyzeSEO: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        url: z.string().url(),
        targetKeywords: z.array(z.string()).optional(),
        locale: z.string().optional(),
        competitorUrls: z.array(z.string().url()).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'analysis');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Analyze SEO
        const startTime = Date.now();
        const analysis = await analyzeSEO(
          input.content,
          input.url,
          {
            targetKeywords: input.targetKeywords,
            locale: input.locale,
            competitorUrls: input.competitorUrls,
            model: input.model as GeminiModel,
          }
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: Math.ceil(input.content.length / 4) + 500, // Rough estimate
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.analyzeSEO',
          featureArea: 'seo',
          prompt: `SEO analysis for ${input.url}`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            targetKeywords: input.targetKeywords,
            url: input.url,
          },
        });
        
        return analysis;
      } catch (error) {
        console.error('Error analyzing SEO:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze SEO',
        });
      }
    }),
  
  // Generate optimized metadata
  generateMetadata: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        locale: z.string().optional(),
        type: z.enum(['article', 'website', 'profile', 'product']).optional(),
        optimizeFor: z.enum(['clicks', 'relevance', 'shareability']).optional(),
        maxTitleLength: z.number().min(30).max(100).optional(),
        maxDescriptionLength: z.number().min(70).max(320).optional(),
        includeSocial: z.boolean().optional(),
        includeSiteName: z.boolean().optional(),
        siteName: z.string().optional(),
        twitterHandle: z.string().optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'metadata');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Generate metadata
        const startTime = Date.now();
        const metadata = await generateMetadata(
          input.content,
          {
            title: input.title,
            description: input.description,
            keywords: input.keywords,
            locale: input.locale,
            type: input.type,
            optimizeFor: input.optimizeFor,
            maxTitleLength: input.maxTitleLength,
            maxDescriptionLength: input.maxDescriptionLength,
            includeSocial: input.includeSocial,
            includeSiteName: input.includeSiteName,
            siteName: input.siteName,
            twitterHandle: input.twitterHandle,
          },
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 300, // Metadata generation is relatively lightweight
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.generateMetadata',
          featureArea: 'seo',
          prompt: `Generate metadata for ${input.title || 'content'}`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            type: input.type,
          },
        });
        
        return metadata;
      } catch (error) {
        console.error('Error generating metadata:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate metadata',
        });
      }
    }),
  
  // Analyze and suggest keywords
  analyzeKeywords: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        targetKeywords: z.array(z.string()).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'keywords');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Analyze keywords
        const startTime = Date.now();
        const keywordAnalysis = await analyzeKeywords(
          input.content,
          input.targetKeywords,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 400, // Keyword analysis is moderate in token usage
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.analyzeKeywords',
          featureArea: 'seo',
          prompt: `Analyze keywords for content`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            targetKeywords: input.targetKeywords,
          },
        });
        
        return keywordAnalysis;
      } catch (error) {
        console.error('Error analyzing keywords:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze keywords',
        });
      }
    }),
  
  // Suggest links for content
  suggestLinks: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        existingLinks: z.array(z.string()).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'links');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Suggest links
        const startTime = Date.now();
        const linkSuggestions = await suggestLinks(
          input.content,
          input.existingLinks,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 300, // Link suggestions are relatively lightweight
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.suggestLinks',
          featureArea: 'seo',
          prompt: `Suggest links for content`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            existingLinkCount: input.existingLinks?.length || 0,
          },
        });
        
        return linkSuggestions;
      } catch (error) {
        console.error('Error suggesting links:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to suggest links',
        });
      }
    }),
  
  // Optimize content for SEO
  optimizeContent: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        targetKeywords: z.array(z.string()).optional(),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'content');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Optimize content
        const startTime = Date.now();
        const optimizedContent = await optimizeContent(
          input.content,
          input.targetKeywords,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: Math.ceil(input.content.length / 3) + 600, // Content optimization is token intensive
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.optimizeContent',
          featureArea: 'seo',
          prompt: `Optimize content for SEO`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            targetKeywords: input.targetKeywords,
          },
        });
        
        return optimizedContent;
      } catch (error) {
        console.error('Error optimizing content:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to optimize content',
        });
      }
    }),
  
  // Generate FAQs for content
  generateFAQs: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        count: z.number().min(1).max(20).default(5),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'faqs');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Generate FAQs
        const startTime = Date.now();
        const faqs = await generateFAQs(
          input.content,
          input.count,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 500 + (input.count * 50), // Base cost plus per FAQ
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.generateFAQs',
          featureArea: 'seo',
          prompt: `Generate ${input.count} FAQs for content`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            faqCount: input.count,
          },
        });
        
        return faqs;
      } catch (error) {
        console.error('Error generating FAQs:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate FAQs',
        });
      }
    }),
  
  // Analyze competitors
  analyzeCompetitors: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(100),
        competitors: z.array(z.string()).min(1).max(10),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'competitors');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Analyze competitors
        const startTime = Date.now();
        const competitorAnalysis = await analyzeCompetitors(
          input.keyword,
          input.competitors,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 600 + (input.competitors.length * 100), // Base cost plus per competitor
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.analyzeCompetitors',
          featureArea: 'seo',
          prompt: `Analyze competitors for "${input.keyword}"`,
          success: true,
          responseTime,
          metadata: {
            keyword: input.keyword,
            competitorCount: input.competitors.length,
          },
        });
        
        return competitorAnalysis;
      } catch (error) {
        console.error('Error analyzing competitors:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze competitors',
        });
      }
    }),
  
  // Generate structured data
  generateStructuredData: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50).max(50000),
        type: z.enum([
          'Article',
          'Product',
          'Event',
          'Organization',
          'LocalBusiness',
          'Recipe',
          'Review',
          'Person',
          'WebPage',
        ]),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'structured_data');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Generate structured data
        const startTime = Date.now();
        const structuredData = await generateStructuredData(
          input.content,
          input.type,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 400, // Structured data generation is moderate in token usage
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.generateStructuredData',
          featureArea: 'seo',
          prompt: `Generate ${input.type} structured data`,
          success: true,
          responseTime,
          metadata: {
            contentLength: input.content.length,
            schemaType: input.type,
          },
        });
        
        return structuredData;
      } catch (error) {
        console.error('Error generating structured data:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate structured data',
        });
      }
    }),
  
  // Optimize URL structure
  optimizeURLStructure: protectedProcedure
    .input(
      z.object({
        url: z.string(),
        title: z.string().min(1).max(200),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'url');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Optimize URL structure
        const startTime = Date.now();
        const optimizedURL = await optimizeURLStructure(
          input.url,
          input.title,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 200, // URL optimization is lightweight
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.optimizeURLStructure',
          featureArea: 'seo',
          prompt: `Optimize URL structure for "${input.title}"`,
          success: true,
          responseTime,
          metadata: {
            originalUrl: input.url,
            titleLength: input.title.length,
          },
        });
        
        return optimizedURL;
      } catch (error) {
        console.error('Error optimizing URL structure:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to optimize URL structure',
        });
      }
    }),
  
  // Identify trending topics
  identifyTrendingTopics: protectedProcedure
    .input(
      z.object({
        niche: z.string().min(1).max(100),
        count: z.number().min(1).max(20).default(10),
        model: z.enum([
          'gemini-1.5-pro',
          'gemini-pro',
          '2.5-flash',
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Check if tokens are available
        const hasTokens = await checkTokenAvailability(userId, 'SEO_OPTIMIZATION', 'trends');
        
        if (!hasTokens) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Token limit exceeded',
          });
        }
        
        // Identify trending topics
        const startTime = Date.now();
        const trendingTopics = await identifyTrendingTopics(
          input.niche,
          input.count,
          input.model as GeminiModel
        );
        const responseTime = Date.now() - startTime;
        
        // Record token usage
        await recordTokenUsage({
          userId,
          operationType: 'SEO_OPTIMIZATION',
          tokensUsed: 400 + (input.count * 30), // Base cost plus per topic
          model: input.model || GeminiModel.PRO_1_5,
          endpoint: 'seo.identifyTrendingTopics',
          featureArea: 'seo',
          prompt: `Identify trending topics in "${input.niche}"`,
          success: true,
          responseTime,
          metadata: {
            niche: input.niche,
            topicCount: input.count,
          },
        });
        
        return trendingTopics;
      } catch (error) {
        console.error('Error identifying trending topics:', error);
        throw new TRPCError({
          code: error instanceof TRPCError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to identify trending topics',
        });
      }
    }),
});