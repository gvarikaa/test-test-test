import { GeminiModel, getModelInstance, createChatSession, SafetyLevel } from './gemini';
import { estimateTokenCount } from './token-management';
import { db } from './db';

/**
 * SEO analysis result types
 */
export enum SEOScoreLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
  CRITICAL = 'critical',
}

/**
 * SEO analysis category
 */
export enum SEOCategory {
  META_TAGS = 'meta_tags',
  CONTENT_QUALITY = 'content_quality',
  KEYWORDS = 'keywords',
  READABILITY = 'readability',
  STRUCTURE = 'structure',
  LINKS = 'links',
  MOBILE = 'mobile',
  TECHNICAL = 'technical',
  SOCIAL = 'social',
  LOCAL = 'local',
}

/**
 * SEO recommendation priority
 */
export enum SEOPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  OPTIONAL = 'optional',
}

/**
 * SEO analysis result interface
 */
export interface SEOAnalysisResult {
  score: number; // 0-100
  scoreLevel: SEOScoreLevel;
  categoryScores: Record<SEOCategory, number>;
  strengths: Array<{
    category: SEOCategory;
    description: string;
  }>;
  weaknesses: Array<{
    category: SEOCategory;
    description: string;
    priority: SEOPriority;
    suggestion: string;
  }>;
  keywords: {
    primary: string;
    secondary: string[];
    missing: string[];
    opportunities: string[];
  };
  metaTags: {
    title: {
      value: string;
      score: number;
      optimal: string;
    };
    description: {
      value: string;
      score: number;
      optimal: string;
    };
    og: Record<string, {
      value: string;
      score: number;
      optimal: string;
    }>;
    twitter: Record<string, {
      value: string;
      score: number;
      optimal: string;
    }>;
  };
  readability: {
    score: number;
    level: string;
    analysis: {
      sentenceLength: number;
      paragraphLength: number;
      wordComplexity: number;
      passiveVoice: number;
    };
  };
  contentAnalysis: {
    wordCount: number;
    recommendedWordCount: number;
    headingDistribution: Record<string, number>;
    keywordDensity: Record<string, number>;
    optimalKeywordDensity: Record<string, number>;
  };
  structureSuggestions: {
    headings: string[];
    sections: string[];
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };
  competitorAnalysis?: Array<{
    url: string;
    keywords: string[];
    strengths: string[];
    gaps: string[];
  }>;
}

/**
 * Metadata generation options
 */
export interface MetadataGenerationOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  locale?: string;
  type?: 'article' | 'website' | 'profile' | 'product';
  optimizeFor?: 'clicks' | 'relevance' | 'shareability';
  maxTitleLength?: number;
  maxDescriptionLength?: number;
  includeSocial?: boolean;
  includeSiteName?: boolean;
  siteName?: string;
  twitterHandle?: string;
}

/**
 * Generated metadata interface
 */
export interface GeneratedMetadata {
  title: string;
  description: string;
  keywords: string[];
  openGraph: {
    title: string;
    description: string;
    images?: string[];
    type?: string;
    locale?: string;
    siteName?: string;
  };
  twitter?: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    images?: string[];
    site?: string;
  };
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
  };
  structuredData?: Record<string, any>;
}

/**
 * Keyword analysis interface
 */
export interface KeywordAnalysisResult {
  primary: string;
  secondary: string[];
  related: string[];
  questions: string[];
  trending: string[];
  difficulty: Record<string, number>; // 0-100 scale
  searchVolume: Record<string, number>;
  competition: Record<string, number>; // 0-100 scale
  opportunities: string[];
}

/**
 * Link suggestions interface
 */
export interface LinkSuggestions {
  internal: Array<{
    url: string;
    text: string;
    relevance: number; // 0-100
  }>;
  external: Array<{
    url: string;
    text: string;
    relevance: number; // 0-100
  }>;
  anchor: Array<{
    text: string;
    relevance: number; // 0-100
  }>;
}

/**
 * Content optimization interface
 */
export interface ContentOptimizationResult {
  title: string;
  description: string;
  score: number; // 0-100
  optimizedContent?: string;
  headingSuggestions: Record<string, string[]>;
  sectionsToAdd: string[];
  paragraphSuggestions: Record<string, string>;
  keywords: {
    primary: string;
    secondary: string[];
    missing: string[];
  };
  readability: {
    score: number;
    suggestions: string[];
  };
  improvements: Array<{
    type: string;
    suggestion: string;
    priority: SEOPriority;
  }>;
}

/**
 * FAQ generation interface
 */
export interface GeneratedFAQs {
  questions: Array<{
    question: string;
    answer: string;
    keywords: string[];
  }>;
  schema: Record<string, any>; // FAQPage schema for structured data
}

/**
 * Analyze content for SEO optimization
 */
export async function analyzeSEO(
  content: string,
  url: string,
  options?: {
    targetKeywords?: string[];
    locale?: string;
    competitorUrls?: string[];
    model?: GeminiModel;
  }
): Promise<SEOAnalysisResult> {
  try {
    const model = getModelInstance(options?.model || GeminiModel.PRO_1_5);
    
    // Create a detailed prompt for SEO analysis
    const prompt = `
    You are an expert SEO analyst. Analyze the following webpage content and provide a detailed SEO analysis.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    URL: ${url}
    
    ${options?.targetKeywords ? `TARGET KEYWORDS: ${options.targetKeywords.join(', ')}` : ''}
    ${options?.locale ? `LOCALE: ${options.locale}` : ''}
    ${options?.competitorUrls ? `COMPETITOR URLS: ${options.competitorUrls.join(', ')}` : ''}
    
    Provide a comprehensive SEO analysis with the following:
    1. Overall SEO score (0-100)
    2. Score breakdown by category (meta tags, content quality, keywords, readability, structure, links)
    3. Strengths and weaknesses with specific suggestions for improvement
    4. Keyword analysis (primary, secondary, missing, opportunities)
    5. Meta tag analysis with optimization suggestions
    6. Readability analysis
    7. Content analysis (word count, heading distribution, keyword density)
    8. Structure suggestions (headings, sections, FAQs)
    
    Return the analysis in JSON format with this structure:
    {
      "score": number,
      "scoreLevel": "excellent"|"good"|"average"|"poor"|"critical",
      "categoryScores": {
        "meta_tags": number,
        "content_quality": number,
        "keywords": number,
        "readability": number,
        "structure": number,
        "links": number
      },
      "strengths": [
        {
          "category": string,
          "description": string
        }
      ],
      "weaknesses": [
        {
          "category": string,
          "description": string,
          "priority": "critical"|"high"|"medium"|"low"|"optional",
          "suggestion": string
        }
      ],
      "keywords": {
        "primary": string,
        "secondary": string[],
        "missing": string[],
        "opportunities": string[]
      },
      "metaTags": {
        "title": {
          "value": string,
          "score": number,
          "optimal": string
        },
        "description": {
          "value": string,
          "score": number,
          "optimal": string
        }
      },
      "readability": {
        "score": number,
        "level": string,
        "analysis": {
          "sentenceLength": number,
          "paragraphLength": number,
          "wordComplexity": number,
          "passiveVoice": number
        }
      },
      "contentAnalysis": {
        "wordCount": number,
        "recommendedWordCount": number,
        "headingDistribution": object,
        "keywordDensity": object,
        "optimalKeywordDensity": object
      },
      "structureSuggestions": {
        "headings": string[],
        "sections": string[],
        "faq": [
          {
            "question": string,
            "answer": string
          }
        ]
      }
    }
    `;
    
    // Generate analysis
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from SEO analysis response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]) as SEOAnalysisResult;
    
    // Store the analysis in the database if it's for a post
    try {
      const urlParts = url.split('/');
      const contentId = urlParts[urlParts.length - 1];
      
      if (contentId && /^[a-zA-Z0-9]+$/.test(contentId)) {
        // Check if this is a post
        const post = await db.post.findUnique({
          where: { id: contentId },
        });
        
        if (post) {
          // Save SEO analysis
          await db.sEOAnalysis.upsert({
            where: { contentId },
            update: {
              score: analysis.score,
              scoreLevel: analysis.scoreLevel,
              categoryScores: analysis.categoryScores,
              keywords: analysis.keywords,
              metaTags: analysis.metaTags,
              readability: analysis.readability,
              contentAnalysis: analysis.contentAnalysis,
              strengths: analysis.strengths,
              weaknesses: analysis.weaknesses,
              structureSuggestions: analysis.structureSuggestions,
              lastUpdated: new Date(),
            },
            create: {
              contentId,
              contentType: 'post',
              score: analysis.score,
              scoreLevel: analysis.scoreLevel,
              categoryScores: analysis.categoryScores,
              keywords: analysis.keywords,
              metaTags: analysis.metaTags,
              readability: analysis.readability,
              contentAnalysis: analysis.contentAnalysis,
              strengths: analysis.strengths,
              weaknesses: analysis.weaknesses,
              structureSuggestions: analysis.structureSuggestions,
              lastUpdated: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error saving SEO analysis:', error);
      // Continue without failing if DB save fails
    }
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing SEO:', error);
    throw error;
  }
}

/**
 * Generate optimized metadata for a webpage
 */
export async function generateMetadata(
  content: string,
  options?: MetadataGenerationOptions,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<GeneratedMetadata> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for metadata generation
    const prompt = `
    You are an SEO expert specialized in generating optimized metadata. Create the best possible metadata 
    for the following content to maximize search engine visibility and click-through rates.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    ${options?.title ? `EXISTING TITLE: ${options.title}` : ''}
    ${options?.description ? `EXISTING DESCRIPTION: ${options.description}` : ''}
    ${options?.keywords ? `TARGET KEYWORDS: ${options.keywords.join(', ')}` : ''}
    ${options?.type ? `CONTENT TYPE: ${options.type}` : ''}
    ${options?.locale ? `LOCALE: ${options.locale}` : ''}
    ${options?.optimizeFor ? `OPTIMIZE FOR: ${options.optimizeFor}` : ''}
    ${options?.maxTitleLength ? `MAX TITLE LENGTH: ${options.maxTitleLength}` : 'MAX TITLE LENGTH: 60'}
    ${options?.maxDescriptionLength ? `MAX DESCRIPTION LENGTH: ${options.maxDescriptionLength}` : 'MAX DESCRIPTION LENGTH: 160'}
    ${options?.includeSiteName ? `SITE NAME: ${options.siteName}` : ''}
    ${options?.twitterHandle ? `TWITTER HANDLE: ${options.twitterHandle}` : ''}
    
    Generate optimized metadata in JSON format with this structure:
    {
      "title": string,
      "description": string,
      "keywords": string[],
      "openGraph": {
        "title": string,
        "description": string,
        "type": string,
        "locale": string,
        "siteName": string
      },
      "twitter": {
        "card": "summary" | "summary_large_image",
        "title": string,
        "description": string,
        "site": string
      },
      "structuredData": {
        // Schema.org structured data
      }
    }
    
    Guidelines:
    1. Title should be compelling, include primary keyword, and be under ${options?.maxTitleLength || 60} characters
    2. Description should be informative, include key benefits, call to action, and be under ${options?.maxDescriptionLength || 160} characters
    3. Include 5-10 relevant keywords
    4. OpenGraph and Twitter metadata should be optimized for sharing
    5. Use schema.org structured data appropriate for the content type
    `;
    
    // Generate metadata
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from metadata generation response');
    }
    
    const metadata = JSON.parse(jsonMatch[0]) as GeneratedMetadata;
    
    return metadata;
  } catch (error) {
    console.error('Error generating metadata:', error);
    throw error;
  }
}

/**
 * Analyze and suggest keywords for content
 */
export async function analyzeKeywords(
  content: string,
  targetKeywords?: string[],
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<KeywordAnalysisResult> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for keyword analysis
    const prompt = `
    You are an SEO keyword research expert. Analyze the following content and identify the best keywords 
    for search engine optimization.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    ${targetKeywords ? `TARGET KEYWORDS: ${targetKeywords.join(', ')}` : ''}
    
    Provide a comprehensive keyword analysis in JSON format with this structure:
    {
      "primary": string,
      "secondary": string[],
      "related": string[],
      "questions": string[],
      "trending": string[],
      "difficulty": {
        "keyword1": number,
        "keyword2": number
      },
      "searchVolume": {
        "keyword1": number,
        "keyword2": number
      },
      "competition": {
        "keyword1": number,
        "keyword2": number
      },
      "opportunities": string[]
    }
    
    Guidelines:
    1. Primary keyword should be the main focus of the content
    2. Secondary keywords should support the primary keyword and be used throughout the content
    3. Related keywords are semantically related to the primary topic
    4. Questions should be relevant search queries users might ask
    5. Trending keywords should be timely and gaining search popularity
    6. Difficulty, search volume, and competition should be estimated on a 0-100 scale
    7. Opportunities are keywords with high potential and low competition
    `;
    
    // Generate keyword analysis
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from keyword analysis response');
    }
    
    const keywordAnalysis = JSON.parse(jsonMatch[0]) as KeywordAnalysisResult;
    
    return keywordAnalysis;
  } catch (error) {
    console.error('Error analyzing keywords:', error);
    throw error;
  }
}

/**
 * Suggest internal and external links for content
 */
export async function suggestLinks(
  content: string,
  existingLinks: string[] = [],
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<LinkSuggestions> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for link suggestions
    const prompt = `
    You are an SEO linking specialist. Based on the following content, suggest internal and external 
    links that would improve the SEO value and user experience.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    EXISTING LINKS: ${existingLinks.join(', ')}
    
    Provide link suggestions in JSON format with this structure:
    {
      "internal": [
        {
          "url": string,
          "text": string,
          "relevance": number
        }
      ],
      "external": [
        {
          "url": string,
          "text": string,
          "relevance": number
        }
      ],
      "anchor": [
        {
          "text": string,
          "relevance": number
        }
      ]
    }
    
    Guidelines:
    1. Internal links should connect to relevant content within the same site
    2. External links should be to authoritative sources that enhance the content
    3. Anchor text should be descriptive and include relevant keywords
    4. Relevance score should be on a scale of 0-100
    5. Suggest 5-10 of each type of link
    `;
    
    // Generate link suggestions
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from link suggestions response');
    }
    
    const linkSuggestions = JSON.parse(jsonMatch[0]) as LinkSuggestions;
    
    return linkSuggestions;
  } catch (error) {
    console.error('Error suggesting links:', error);
    throw error;
  }
}

/**
 * Optimize content for SEO
 */
export async function optimizeContent(
  content: string,
  targetKeywords?: string[],
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<ContentOptimizationResult> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for content optimization
    const prompt = `
    You are an SEO content optimization expert. Analyze and optimize the following content for better search engine visibility while maintaining readability and user value.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    ${targetKeywords ? `TARGET KEYWORDS: ${targetKeywords.join(', ')}` : ''}
    
    Provide a detailed content optimization analysis in JSON format with this structure:
    {
      "title": string,
      "description": string,
      "score": number,
      "optimizedContent": string,
      "headingSuggestions": {
        "h1": string[],
        "h2": string[],
        "h3": string[]
      },
      "sectionsToAdd": string[],
      "paragraphSuggestions": {
        "paragraph1": string,
        "paragraph2": string
      },
      "keywords": {
        "primary": string,
        "secondary": string[],
        "missing": string[]
      },
      "readability": {
        "score": number,
        "suggestions": string[]
      },
      "improvements": [
        {
          "type": string,
          "suggestion": string,
          "priority": "critical"|"high"|"medium"|"low"|"optional"
        }
      ]
    }
    
    Guidelines:
    1. Optimize the title and description for CTR and keyword placement
    2. Maintain a natural writing style while incorporating target keywords
    3. Suggest better heading structure with keywords in important headings
    4. Identify missing sections that would improve completeness
    5. Suggest specific paragraph improvements for key sections
    6. Analyze keyword usage and suggest additions or adjustments
    7. Evaluate readability and suggest improvements
    8. Provide an overall optimization score (0-100)
    `;
    
    // Generate content optimization
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from content optimization response');
    }
    
    const optimization = JSON.parse(jsonMatch[0]) as ContentOptimizationResult;
    
    return optimization;
  } catch (error) {
    console.error('Error optimizing content:', error);
    throw error;
  }
}

/**
 * Generate FAQs for content
 */
export async function generateFAQs(
  content: string,
  count: number = 5,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<GeneratedFAQs> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for FAQ generation
    const prompt = `
    You are an SEO FAQ specialist. Generate relevant and valuable FAQs for the following content 
    that would improve SEO and user experience.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    NUMBER OF FAQS: ${count}
    
    Provide FAQs in JSON format with this structure:
    {
      "questions": [
        {
          "question": string,
          "answer": string,
          "keywords": string[]
        }
      ],
      "schema": {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Question text",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Answer text"
            }
          }
        ]
      }
    }
    
    Guidelines:
    1. Questions should be relevant to the content and address likely user queries
    2. Questions should incorporate target keywords where natural
    3. Answers should be comprehensive but concise (50-150 words)
    4. Include a mix of informational, navigational, and transactional questions
    5. Format answers in a clear, readable style
    6. Include structured data schema for FAQPage to enable rich results
    `;
    
    // Generate FAQs
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from FAQ generation response');
    }
    
    const faqs = JSON.parse(jsonMatch[0]) as GeneratedFAQs;
    
    return faqs;
  } catch (error) {
    console.error('Error generating FAQs:', error);
    throw error;
  }
}

/**
 * Analyze competitors for a given keyword
 */
export async function analyzeCompetitors(
  keyword: string,
  competitors: string[] = [],
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<any> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for competitor analysis
    const prompt = `
    You are an SEO competitive analysis expert. Analyze the following competitors for the specified
    keyword and provide a detailed competitive analysis.
    
    TARGET KEYWORD: ${keyword}
    
    COMPETITORS: ${competitors.join(', ')}
    
    Provide a detailed competitive analysis in JSON format with this structure:
    {
      "keyword": string,
      "competitors": [
        {
          "url": string,
          "strengths": string[],
          "weaknesses": string[],
          "contentGaps": string[],
          "keywordUsage": {
            "title": boolean,
            "headings": boolean,
            "body": boolean,
            "density": number
          },
          "contentLength": number,
          "readabilityScore": number
        }
      ],
      "opportunities": string[],
      "recommendedStrategy": string
    }
    
    Guidelines:
    1. Analyze each competitor's strengths and weaknesses
    2. Identify content gaps that are not covered by competitors
    3. Evaluate keyword usage in titles, headings, and body content
    4. Assess content length and readability
    5. Identify opportunities for differentiation
    6. Recommend an overall strategy to outperform competitors
    `;
    
    // Generate competitor analysis
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from competitor analysis response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    throw error;
  }
}

/**
 * Generate structured data for a webpage
 */
export async function generateStructuredData(
  content: string,
  type: 'Article' | 'Product' | 'Event' | 'Organization' | 'LocalBusiness' | 'Recipe' | 'Review' | 'Person' | 'WebPage',
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<Record<string, any>> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for structured data generation
    const prompt = `
    You are an SEO structured data expert. Generate Schema.org structured data for the following content
    based on the specified type.
    
    CONTENT:
    ${content.substring(0, 15000)} ${content.length > 15000 ? '... (content truncated)' : ''}
    
    SCHEMA TYPE: ${type}
    
    Provide structured data in JSON-LD format with this structure:
    {
      "@context": "https://schema.org",
      "@type": "${type}",
      // Additional properties based on the schema type
    }
    
    Guidelines:
    1. Include all required properties for the specified schema type
    2. Extract necessary information from the content
    3. Use ISO 8601 format for dates and times
    4. Follow Google's structured data guidelines
    5. Ensure the structured data is valid and complete
    `;
    
    // Generate structured data
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from structured data generation response');
    }
    
    const structuredData = JSON.parse(jsonMatch[0]);
    
    return structuredData;
  } catch (error) {
    console.error('Error generating structured data:', error);
    throw error;
  }
}

/**
 * Optimize a URL structure for SEO
 */
export async function optimizeURLStructure(
  url: string,
  title: string,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<{
  optimizedURL: string;
  score: number;
  explanation: string;
}> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for URL optimization
    const prompt = `
    You are an SEO URL optimization expert. Optimize the following URL for better search engine visibility
    and user experience based on the content title.
    
    CURRENT URL: ${url}
    CONTENT TITLE: ${title}
    
    Provide an optimized URL in JSON format with this structure:
    {
      "optimizedURL": string,
      "score": number,
      "explanation": string
    }
    
    Guidelines:
    1. Keep the URL short and descriptive
    2. Include the primary keyword
    3. Use hyphens to separate words
    4. Remove unnecessary words (a, the, and, or, but, etc.)
    5. Avoid special characters, spaces, and capital letters
    6. Maintain a logical hierarchy
    7. Include a score (0-100) for the optimized URL
    8. Explain the improvements made
    `;
    
    // Generate URL optimization
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from URL optimization response');
    }
    
    const optimization = JSON.parse(jsonMatch[0]) as {
      optimizedURL: string;
      score: number;
      explanation: string;
    };
    
    return optimization;
  } catch (error) {
    console.error('Error optimizing URL structure:', error);
    throw error;
  }
}

/**
 * Identify trending topics for content creation
 */
export async function identifyTrendingTopics(
  niche: string,
  count: number = 10,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<{
  topics: Array<{
    topic: string;
    keywords: string[];
    relevance: number;
    difficulty: number;
    contentIdeas: string[];
  }>;
}> {
  try {
    const modelInstance = getModelInstance(model);
    
    // Create a prompt for trending topic identification
    const prompt = `
    You are an SEO trend analysis expert. Identify trending topics in the specified niche that 
    would be valuable for content creation.
    
    NICHE: ${niche}
    TOPIC COUNT: ${count}
    
    Provide trending topics in JSON format with this structure:
    {
      "topics": [
        {
          "topic": string,
          "keywords": string[],
          "relevance": number,
          "difficulty": number,
          "contentIdeas": string[]
        }
      ]
    }
    
    Guidelines:
    1. Focus on currently trending and relevant topics in the niche
    2. Include a mix of evergreen and timely topics
    3. Suggest 5-7 keywords for each topic
    4. Rate the relevance to the niche on a scale of 0-100
    5. Rate the difficulty to rank for on a scale of 0-100
    6. Provide 3-5 content ideas for each topic
    `;
    
    // Generate trending topics
    const response = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });
    
    const result = response.response.text();
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from trending topics response');
    }
    
    const topics = JSON.parse(jsonMatch[0]) as {
      topics: Array<{
        topic: string;
        keywords: string[];
        relevance: number;
        difficulty: number;
        contentIdeas: string[];
      }>;
    };
    
    return topics;
  } catch (error) {
    console.error('Error identifying trending topics:', error);
    throw error;
  }
}

/**
 * Setup database schema for SEO optimization
 * Note: Call this once during setup
 */
export async function setupSEOSchema(): Promise<void> {
  try {
    // This would actually use database migrations in a real system
    console.log('Setting up SEO optimization schema...');
    
    // Since we're using Prisma, we'd update the schema.prisma file and run migrations
    // For this example, we assume the schema already contains the required tables
    
    // Here's what the schema looks like (for reference):
    /*
    model SEOAnalysis {
      id                     String                  @id @default(cuid())
      contentId              String                  @unique
      contentType            String                  // post, page, product, etc.
      score                  Int
      scoreLevel             String
      categoryScores         Json
      keywords               Json
      metaTags               Json
      readability            Json
      contentAnalysis        Json
      strengths              Json
      weaknesses             Json
      structureSuggestions   Json
      competitorAnalysis     Json?
      lastUpdated            DateTime
    }
    
    model SEOKeyword {
      id                     String                  @id @default(cuid())
      keyword                String                  @unique
      searchVolume           Int?
      difficulty             Int?
      competition            Int?
      trend                  String?
      relatedKeywords        Json?
      lastUpdated            DateTime
    }
    */
  } catch (error) {
    console.error('Error setting up SEO schema:', error);
  }
}