import { db } from './db';
import { GeminiModel, getModelInstance } from './gemini';
import { recordTokenUsage } from './token-management';

export enum DiscussionTone {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
  CONTROVERSIAL = 'controversial',
  CONSTRUCTIVE = 'constructive',
  TOXIC = 'toxic'
}

export enum EngagementLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum DiscussionQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}

export interface CommentAnalysisResult {
  id: string;
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0 to 1
  };
  toxicity: {
    score: number; // 0 to 1
    isToxic: boolean;
    categories?: {
      hate?: number;
      harassment?: number;
      selfHarm?: number;
      sexual?: number;
      violence?: number;
      profanity?: number;
    };
  };
  topics: string[];
  relevance: number; // 0 to 1, how relevant to the parent content
  quality: {
    score: number; // 0 to 1
    length: 'short' | 'medium' | 'long';
    insightful: boolean;
    actionable: boolean;
  };
  isSpam: boolean;
  language: string;
  keywords: string[];
  entities?: {
    name: string;
    type: string;
    salience: number;
  }[];
}

export interface DiscussionAnalysisResult {
  id: string;
  postId?: string;
  reelId?: string;
  commentCount: number;
  participantCount: number;
  overallTone: DiscussionTone;
  engagementLevel: EngagementLevel;
  discussionQuality: DiscussionQuality;
  topTopics: string[];
  sentimentBreakdown: {
    positive: number; // percentage
    negative: number;
    neutral: number;
  };
  controversyScore: number; // 0 to 1
  toxicityLevel: number; // 0 to 1
  topContributors: {
    userId: string;
    commentCount: number;
    averageQuality: number;
  }[];
  timeline?: {
    timePoint: string;
    commentCount: number;
    averageSentiment: number;
  }[];
  languageDistribution?: Record<string, number>; // percentage by language
  mostDiscussedEntities?: {
    name: string;
    type: string;
    mentionCount: number;
  }[];
  recommendedActions?: {
    type: 'moderation' | 'engagement' | 'content';
    description: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentAnalysisOptions {
  model?: GeminiModel;
  language?: string;
  includeToxicity?: boolean;
  includeEntities?: boolean;
  includeTopics?: boolean;
  parentContent?: string; // For relevance calculation
}

export interface DiscussionAnalysisOptions {
  model?: GeminiModel;
  includeSummary?: boolean;
  includeTimeline?: boolean;
  includeRecommendedActions?: boolean;
  includeLanguageDistribution?: boolean;
  includeMostDiscussedEntities?: boolean;
}

/**
 * Analyzes a single comment
 */
export async function analyzeComment(
  commentId: string,
  content: string,
  options: CommentAnalysisOptions = {}
): Promise<CommentAnalysisResult> {
  const {
    model = GeminiModel.GEMINI_PRO,
    language,
    includeToxicity = true,
    includeEntities = false,
    includeTopics = true,
    parentContent = ''
  } = options;

  // Prepare the prompt
  const prompt = `
    Analyze the following comment${parentContent ? ' in response to the given content' : ''}:
    
    ${parentContent ? `PARENT CONTENT: ${parentContent}\n\n` : ''}
    COMMENT: ${content}
    
    Provide a structured analysis with the following information:
    1. Sentiment analysis (score from -1 to 1, label, and confidence)
    2. ${includeToxicity ? 'Toxicity assessment (score, categories if applicable)' : ''}
    3. ${includeTopics ? 'Main topics discussed' : ''}
    4. ${parentContent ? 'Relevance to the parent content (score from 0 to 1)' : ''}
    5. Quality assessment (score, length classification, insightfulness, actionability)
    6. Spam detection
    7. ${language ? '' : 'Language identification'}
    8. Key phrases and keywords
    9. ${includeEntities ? 'Named entities (people, organizations, locations, etc.)' : ''}
    
    Format your response as a JSON object.
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'comment_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const jsonContent = extractJSON(responseText);
    if (!jsonContent) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    // Store analysis result in the database
    await storeCommentAnalysis(commentId, jsonContent);

    return {
      id: commentId,
      ...jsonContent,
    };
  } catch (error) {
    console.error('Error analyzing comment:', error);
    throw error;
  }
}

/**
 * Analyzes a complete discussion thread
 */
export async function analyzeDiscussion(
  discussionId: string,
  comments: { id: string; content: string; userId: string; createdAt: Date }[],
  parentContent: string = '',
  options: DiscussionAnalysisOptions = {}
): Promise<DiscussionAnalysisResult> {
  const {
    model = GeminiModel.GEMINI_PRO,
    includeSummary = true,
    includeTimeline = false,
    includeRecommendedActions = true,
    includeLanguageDistribution = false,
    includeMostDiscussedEntities = false,
  } = options;

  // If there are more than 20 comments, analyze only a representative sample
  let commentsToAnalyze = comments;
  if (comments.length > 20) {
    commentsToAnalyze = getRepresentativeSample(comments, 20);
  }

  // Analyze individual comments first
  const commentAnalyses: CommentAnalysisResult[] = [];
  for (const comment of commentsToAnalyze) {
    try {
      const analysis = await analyzeComment(comment.id, comment.content, {
        model,
        parentContent,
        includeEntities: includeMostDiscussedEntities,
      });
      commentAnalyses.push(analysis);
    } catch (error) {
      console.error(`Error analyzing comment ${comment.id}:`, error);
      // Continue with other comments if one fails
    }
  }

  // Prepare the discussion analysis prompt
  const prompt = `
    Analyze the following discussion consisting of ${comments.length} comments:
    
    PARENT CONTENT: ${parentContent}
    
    COMMENTS ANALYSIS: ${JSON.stringify(commentAnalyses)}
    
    Provide a comprehensive analysis of this discussion with the following:
    1. Overall tone of the discussion
    2. Engagement level
    3. Discussion quality
    4. Main topics being discussed
    5. Sentiment breakdown (% positive, negative, neutral)
    6. Controversy score (0-1)
    7. Toxicity level (0-1)
    8. Top contributors and their impact
    ${includeTimeline ? '9. Timeline of engagement and sentiment changes' : ''}
    ${includeLanguageDistribution ? '10. Language distribution' : ''}
    ${includeMostDiscussedEntities ? '11. Most discussed entities (people, organizations, etc.)' : ''}
    ${includeRecommendedActions ? '12. Recommended moderation or engagement actions' : ''}
    ${includeSummary ? '13. Brief summary of the discussion' : ''}
    
    Format your response as a JSON object.
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'discussion_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const jsonContent = extractJSON(responseText);
    if (!jsonContent) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    // Format the result
    const result: DiscussionAnalysisResult = {
      id: discussionId,
      postId: jsonContent.postId,
      reelId: jsonContent.reelId,
      commentCount: comments.length,
      participantCount: new Set(comments.map(c => c.userId)).size,
      overallTone: jsonContent.overallTone || DiscussionTone.NEUTRAL,
      engagementLevel: jsonContent.engagementLevel || EngagementLevel.MODERATE,
      discussionQuality: jsonContent.discussionQuality || DiscussionQuality.FAIR,
      topTopics: jsonContent.topTopics || [],
      sentimentBreakdown: jsonContent.sentimentBreakdown || { positive: 0, negative: 0, neutral: 0 },
      controversyScore: jsonContent.controversyScore || 0,
      toxicityLevel: jsonContent.toxicityLevel || 0,
      topContributors: jsonContent.topContributors || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add optional fields if available
    if (includeTimeline && jsonContent.timeline) {
      result.timeline = jsonContent.timeline;
    }

    if (includeLanguageDistribution && jsonContent.languageDistribution) {
      result.languageDistribution = jsonContent.languageDistribution;
    }

    if (includeMostDiscussedEntities && jsonContent.mostDiscussedEntities) {
      result.mostDiscussedEntities = jsonContent.mostDiscussedEntities;
    }

    if (includeRecommendedActions && jsonContent.recommendedActions) {
      result.recommendedActions = jsonContent.recommendedActions;
    }

    if (includeSummary && jsonContent.summary) {
      result.summary = jsonContent.summary;
    }

    // Store analysis result in the database
    await storeDiscussionAnalysis(result);

    return result;
  } catch (error) {
    console.error('Error analyzing discussion:', error);
    throw error;
  }
}

/**
 * Batch analyzes multiple comments for efficiency
 */
export async function batchAnalyzeComments(
  comments: { id: string; content: string }[],
  parentContent: string = '',
  options: CommentAnalysisOptions = {}
): Promise<CommentAnalysisResult[]> {
  const {
    model = GeminiModel.GEMINI_PRO,
    includeToxicity = true,
    includeEntities = false,
    includeTopics = true,
  } = options;

  // Prepare the prompt
  const prompt = `
    Analyze the following comments in response to the given content:
    
    PARENT CONTENT: ${parentContent}
    
    COMMENTS:
    ${comments.map((comment, index) => `[${index + 1}] ${comment.content}`).join('\n\n')}
    
    For each comment, provide:
    1. Sentiment analysis (score from -1 to 1, label, and confidence)
    2. ${includeToxicity ? 'Toxicity assessment (score, categories if applicable)' : ''}
    3. ${includeTopics ? 'Main topics discussed' : ''}
    4. Relevance to the parent content (score from 0 to 1)
    5. Quality assessment (score, length classification, insightfulness, actionability)
    6. Spam detection
    7. Language identification
    8. Key phrases and keywords
    9. ${includeEntities ? 'Named entities (people, organizations, locations, etc.)' : ''}
    
    Format your response as a JSON array with one object per comment. Each object should be 
    structured with all analysis fields and include the comment index.
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    });

    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'comment_batch_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const jsonContent = extractJSON(responseText);
    if (!Array.isArray(jsonContent)) {
      throw new Error('Failed to parse JSON array from Gemini response');
    }

    // Process and store the results
    const results: CommentAnalysisResult[] = [];
    
    for (let i = 0; i < jsonContent.length; i++) {
      const analysis = jsonContent[i];
      const commentId = comments[analysis.index - 1]?.id || comments[i]?.id;
      
      if (!commentId) {
        console.error('Could not match analysis to comment:', analysis);
        continue;
      }

      const result: CommentAnalysisResult = {
        id: commentId,
        ...analysis,
      };

      // Store in database
      await storeCommentAnalysis(commentId, result);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Error in batch comment analysis:', error);
    throw error;
  }
}

/**
 * Analyzes engagement trends over time for a post or content item
 */
export async function analyzeEngagementTrends(
  contentId: string,
  comments: { id: string; content: string; userId: string; createdAt: Date }[],
  timeframe: 'hourly' | 'daily' | 'weekly' = 'daily',
  options: DiscussionAnalysisOptions = {}
): Promise<{
  timePoints: {
    timePoint: string;
    commentCount: number;
    participantCount: number;
    averageSentiment: number;
    topTopics: string[];
  }[];
  trends: {
    overallTrend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    sentimentTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
    engagementTrend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    insights: string[];
  };
}> {
  const { model = GeminiModel.GEMINI_PRO } = options;

  // Group comments by time period
  const groupedComments = groupCommentsByTime(comments, timeframe);
  
  // Analyze each time period
  const timePointsAnalysis = [];
  
  for (const [timePoint, timeComments] of Object.entries(groupedComments)) {
    // Analyze comments for this time period
    const commentAnalyses = await batchAnalyzeComments(
      timeComments.map(c => ({ id: c.id, content: c.content })),
      '',
      { model }
    );
    
    // Calculate stats for this time period
    const averageSentiment = calculateAverageSentiment(commentAnalyses);
    const topTopics = extractTopTopics(commentAnalyses);
    const participantCount = new Set(timeComments.map(c => c.userId)).size;
    
    timePointsAnalysis.push({
      timePoint,
      commentCount: timeComments.length,
      participantCount,
      averageSentiment,
      topTopics,
    });
  }
  
  // Analyze the trends
  const prompt = `
    Analyze the following engagement data over time:
    
    TIME_POINTS_DATA: ${JSON.stringify(timePointsAnalysis)}
    
    Based on this data, analyze:
    1. The overall engagement trend (increasing, decreasing, stable, or fluctuating)
    2. The sentiment trend (improving, worsening, stable, or fluctuating)
    3. The participation trend 
    4. Provide 3-5 key insights about these trends
    
    Format your response as a JSON object with the fields: overallTrend, sentimentTrend, 
    engagementTrend, and insights (array of strings).
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });
    
    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'engagement_trends_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const trendsAnalysis = extractJSON(responseText);
    if (!trendsAnalysis) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    return {
      timePoints: timePointsAnalysis,
      trends: trendsAnalysis,
    };
  } catch (error) {
    console.error('Error analyzing engagement trends:', error);
    throw error;
  }
}

/**
 * Identifies discussion threads that may need moderation
 */
export async function identifyDiscussionsNeedingModeration(
  discussionAnalyses: DiscussionAnalysisResult[],
  options: { model?: GeminiModel; threshold?: number } = {}
): Promise<{
  discussions: {
    id: string;
    moderationScore: number;
    reasons: string[];
    recommendedActions: {
      type: 'remove' | 'warn' | 'restrict' | 'monitor';
      description: string;
    }[];
  }[];
}> {
  const { model = GeminiModel.GEMINI_PRO, threshold = 0.7 } = options;

  // Filter discussions that may need moderation based on toxicity and controversy
  const potentialDiscussions = discussionAnalyses.filter(
    d => d.toxicityLevel > threshold || d.controversyScore > threshold
  );

  if (potentialDiscussions.length === 0) {
    return { discussions: [] };
  }

  // Prepare the prompt
  const prompt = `
    Review the following discussion analyses and identify which ones need moderation:
    
    DISCUSSION_ANALYSES: ${JSON.stringify(potentialDiscussions)}
    
    For each discussion that needs moderation, provide:
    1. A moderation score (0-1) indicating the urgency of moderation
    2. Specific reasons why moderation is needed
    3. Recommended moderation actions (remove, warn, restrict, monitor)
    
    Only include discussions that truly need moderation. Format your response as a JSON array.
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'moderation_needs_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const jsonContent = extractJSON(responseText);
    if (!jsonContent) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    return { discussions: jsonContent };
  } catch (error) {
    console.error('Error identifying discussions needing moderation:', error);
    throw error;
  }
}

/**
 * Analyzes user behavior across discussions
 */
export async function analyzeUserDiscussionBehavior(
  userId: string,
  comments: { id: string; content: string; discussionId: string; createdAt: Date }[],
  options: { model?: GeminiModel } = {}
): Promise<{
  userId: string;
  commentCount: number;
  discussionCount: number;
  averageSentiment: number;
  topicPreferences: string[];
  avgQualityScore: number;
  languageProfile: Record<string, number>;
  toxicityRate: number;
  engagementPattern: 'initiator' | 'responder' | 'mixed';
  interactionStyle: 'constructive' | 'critical' | 'neutral' | 'toxic';
  insights: string[];
}> {
  const { model = GeminiModel.GEMINI_PRO } = options;

  // Analyze each comment
  const commentAnalyses = await batchAnalyzeComments(
    comments.map(c => ({ id: c.id, content: c.content })),
    '',
    { model, includeEntities: true, includeTopics: true }
  );

  // Calculate basic statistics
  const uniqueDiscussions = new Set(comments.map(c => c.discussionId)).size;
  const avgSentiment = calculateAverageSentiment(commentAnalyses);
  const topics = extractTopTopics(commentAnalyses);
  const toxicRate = commentAnalyses.filter(a => a.toxicity?.isToxic).length / commentAnalyses.length;
  
  // Prepare the prompt for deeper analysis
  const prompt = `
    Analyze the behavior of a user based on their comments across ${uniqueDiscussions} discussions:
    
    USER_COMMENTS_ANALYSIS: ${JSON.stringify(commentAnalyses)}
    
    RAW_COMMENTS: ${JSON.stringify(comments.map(c => c.content))}
    
    Based on this data, analyze:
    1. The user's engagement pattern (initiator, responder, or mixed)
    2. The user's interaction style (constructive, critical, neutral, or toxic)
    3. Language profile (languages used and their percentages)
    4. Average quality of contributions
    5. 3-5 key insights about this user's behavior in discussions
    
    Format your response as a JSON object.
  `;

  try {
    // Get the analysis from Gemini
    const response = await geminiAPI.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Track token usage
    await trackTokenUsage({
      model,
      promptTokens: response.promptFeedback?.tokenCount || 0,
      completionTokens: response.candidates?.[0]?.tokenCount || 0,
      feature: 'user_behavior_analysis',
    });

    // Process the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON content from the response
    const userAnalysis = extractJSON(responseText);
    if (!userAnalysis) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    // Combine calculated stats with Gemini analysis
    return {
      userId,
      commentCount: comments.length,
      discussionCount: uniqueDiscussions,
      averageSentiment: avgSentiment,
      topicPreferences: topics,
      toxicityRate: toxicRate,
      ...userAnalysis,
    };
  } catch (error) {
    console.error('Error analyzing user discussion behavior:', error);
    throw error;
  }
}

// Helper functions

/**
 * Store comment analysis in the database
 */
async function storeCommentAnalysis(commentId: string, analysis: any): Promise<void> {
  try {
    await db.commentAnalysis.upsert({
      where: { commentId },
      update: {
        data: analysis,
        updatedAt: new Date(),
      },
      create: {
        commentId,
        data: analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error storing comment analysis:', error);
  }
}

/**
 * Store discussion analysis in the database
 */
async function storeDiscussionAnalysis(analysis: DiscussionAnalysisResult): Promise<void> {
  try {
    await db.discussionAnalysis.upsert({
      where: { id: analysis.id },
      update: {
        data: analysis,
        updatedAt: new Date(),
      },
      create: {
        id: analysis.id,
        data: analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error storing discussion analysis:', error);
  }
}

/**
 * Extract JSON from a string response
 */
function extractJSON(text: string): any {
  try {
    // Find JSON-like content in the string
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Error extracting JSON:', error);
    return null;
  }
}

/**
 * Calculate average sentiment from comment analyses
 */
function calculateAverageSentiment(analyses: CommentAnalysisResult[]): number {
  if (analyses.length === 0) return 0;
  const sum = analyses.reduce((acc, analysis) => acc + (analysis.sentiment?.score || 0), 0);
  return sum / analyses.length;
}

/**
 * Extract top topics from comment analyses
 */
function extractTopTopics(analyses: CommentAnalysisResult[]): string[] {
  const topicCounts: Record<string, number> = {};
  
  analyses.forEach(analysis => {
    if (analysis.topics && Array.isArray(analysis.topics)) {
      analysis.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });
  
  // Sort topics by frequency and return top 5
  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * Group comments by time period
 */
function groupCommentsByTime(
  comments: { id: string; content: string; userId: string; createdAt: Date }[],
  timeframe: 'hourly' | 'daily' | 'weekly'
): Record<string, typeof comments> {
  const grouped: Record<string, typeof comments> = {};
  
  comments.forEach(comment => {
    const date = new Date(comment.createdAt);
    let timeKey: string;
    
    if (timeframe === 'hourly') {
      timeKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
    } else if (timeframe === 'daily') {
      timeKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    } else { // weekly
      const firstDay = new Date(date);
      firstDay.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      timeKey = `Week of ${firstDay.getFullYear()}-${firstDay.getMonth() + 1}-${firstDay.getDate()}`;
    }
    
    if (!grouped[timeKey]) {
      grouped[timeKey] = [];
    }
    
    grouped[timeKey].push(comment);
  });
  
  return grouped;
}

/**
 * Get a representative sample of comments for analysis
 */
function getRepresentativeSample(
  comments: { id: string; content: string; userId: string; createdAt: Date }[],
  sampleSize: number
): typeof comments {
  if (comments.length <= sampleSize) return comments;
  
  // Sort by date
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  const result = [];
  const step = comments.length / sampleSize;
  
  // Take evenly distributed samples
  for (let i = 0; i < sampleSize; i++) {
    const index = Math.min(Math.floor(i * step), comments.length - 1);
    result.push(sortedComments[index]);
  }
  
  return result;
}