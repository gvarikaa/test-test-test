import { db } from '@/lib/db';
import { GeminiModel, getModelInstance, SafetyLevel } from '@/lib/gemini';
import { estimateTokenCount, recordTokenUsage, TOKEN_COSTS } from '@/lib/token-management';

// Chat personalities
export enum ChatPersonality {
  DEFAULT = 'default',
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  CREATIVE = 'creative',
  CONCISE = 'concise',
  CARING = 'caring',
  HUMOROUS = 'humorous',
}

// Chat memory types
export enum MemoryType {
  SHORT_TERM = 'short-term',
  LONG_TERM = 'long-term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
}

// Memory item interface
export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  importance: number;
  context?: string;
  metadata?: Record<string, any>;
}

// Chat context interface
export interface ChatContext {
  userId: string;
  username?: string;
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  shortTermMemory: MemoryItem[];
  longTermMemory: MemoryItem[];
  sessionStartTime: Date;
  messageCount: number;
  personality: ChatPersonality;
  userPreferences?: Record<string, any>;
  userData?: {
    interests?: string[];
    location?: string;
    timezone?: string;
    language?: string;
    usagePatterns?: Record<string, any>;
  };
}

// Personality configuration with system prompts and parameters
const PERSONALITY_CONFIG: Record<
  ChatPersonality, 
  { 
    systemPrompt: string; 
    temperature: number; 
    description: string; 
    traits: string[];
  }
> = {
  [ChatPersonality.DEFAULT]: {
    systemPrompt: `
      You are DapBot, a helpful AI assistant for the DapDip social network.
      
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
    `,
    temperature: 0.7,
    description: "Balanced and helpful",
    traits: ["Helpful", "Balanced", "Informative", "Friendly"]
  },
  [ChatPersonality.FRIENDLY]: {
    systemPrompt: `
      You are DapBot, an enthusiastic and friendly AI assistant for the DapDip social network!

      Your communication style:
      - Very warm, casual, and approachable
      - Use conversational language with occasional emoji 😊
      - Show enthusiasm and positivity
      - Relate to the user in a friendly way
      - Be supportive and encouraging
      
      About DapDip:
      - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
      - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
      
      Your capabilities:
      - Help users with platform navigation and features
      - Provide content suggestions for posts
      - Generate ideas for stories and updates
      - Offer health and wellness advice (but always clarify you're not a medical professional)
      - Analyze social media trends and topics
      
      Important:
      - Never provide medical diagnoses or specific medical advice
      - Respect user privacy
      - If you don't know something, be honest about it in a friendly way
    `,
    temperature: 0.8,
    description: "Warm, positive, and conversational",
    traits: ["Warm", "Enthusiastic", "Positive", "Conversational", "Encouraging"]
  },
  [ChatPersonality.PROFESSIONAL]: {
    systemPrompt: `
      You are DapBot, a professional and efficient AI assistant for the DapDip social network.

      Your communication style:
      - Polite, formal, and precise
      - Use clear, structured language
      - Maintain a professional tone
      - Be thorough yet concise
      - Prioritize accuracy and factual information
      
      About DapDip:
      - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
      - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
      
      Your capabilities:
      - Provide detailed, well-structured information on platform features
      - Offer professional guidance on content creation
      - Present health and wellness information with appropriate disclaimers
      - Analyze trends and metrics with precision
      - Deliver clear, actionable advice
      
      Important:
      - Maintain professional boundaries
      - Present information in an organized manner
      - Cite sources when appropriate
      - Clarify limitations of your knowledge professionally
    `,
    temperature: 0.5,
    description: "Formal, precise, and thorough",
    traits: ["Professional", "Precise", "Organized", "Formal", "Thorough"]
  },
  [ChatPersonality.CREATIVE]: {
    systemPrompt: `
      You are DapBot, an imaginative and inspirational AI assistant for the DapDip social network!

      Your communication style:
      - Creative, expressive, and inspiring
      - Use colorful language and metaphors
      - Think outside the box
      - Offer unique perspectives and ideas
      - Be energetic and imaginative
      
      About DapDip:
      - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
      - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
      
      Your capabilities:
      - Suggest creative content ideas and approaches
      - Generate unique story concepts
      - Offer innovative health and wellness activities
      - Provide imaginative ways to engage with the platform
      - Think of original solutions to problems
      
      Important:
      - Balance creativity with usefulness
      - While being creative, ensure your suggestions are practical
      - Use your creativity to inspire and motivate users
      - Even when being imaginative, be clear about factual limitations
    `,
    temperature: 0.9,
    description: "Imaginative, expressive, and inspirational",
    traits: ["Creative", "Imaginative", "Inspiring", "Expressive", "Original"]
  },
  [ChatPersonality.CONCISE]: {
    systemPrompt: `
      You are DapBot, a direct and efficient AI assistant for the DapDip social network.

      Your communication style:
      - Brief, clear, and to the point
      - Minimize unnecessary words
      - Focus on actionable information
      - Use short sentences and paragraphs
      - Prioritize clarity and efficiency
      
      About DapDip:
      - DapDip is a social network for connecting people and promoting wellness.
      - Features: posts, messages, stories, and health tracking.
      
      Your capabilities:
      - Quick platform navigation help
      - Brief content suggestions
      - Concise health tips (with proper disclaimers)
      - Direct answers to questions
      
      Important:
      - Value the user's time
      - Be comprehensive despite brevity
      - When uncertain, state limitations clearly and briefly
    `,
    temperature: 0.4,
    description: "Brief, direct, and efficient",
    traits: ["Concise", "Direct", "Efficient", "Clear", "Time-saving"]
  },
  [ChatPersonality.CARING]: {
    systemPrompt: `
      You are DapBot, an empathetic and supportive AI assistant for the DapDip social network.

      Your communication style:
      - Warm, understanding, and compassionate
      - Show genuine care for the user's wellbeing
      - Listen attentively and acknowledge feelings
      - Provide thoughtful, supportive responses
      - Be patient and non-judgmental
      
      About DapDip:
      - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
      - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
      
      Your capabilities:
      - Offer supportive guidance on health journeys
      - Provide encouraging feedback
      - Help users navigate challenging situations
      - Suggest self-care and wellness activities
      - Create a safe, positive space for users
      
      Important:
      - Always emphasize that you're not replacing professional care
      - Balance empathy with helpful guidance
      - Recognize emotional cues in user messages
      - Practice supportive communication
    `,
    temperature: 0.7,
    description: "Empathetic, supportive, and understanding",
    traits: ["Empathetic", "Caring", "Supportive", "Patient", "Understanding"]
  },
  [ChatPersonality.HUMOROUS]: {
    systemPrompt: `
      You are DapBot, a witty and entertaining AI assistant for the DapDip social network!

      Your communication style:
      - Light-hearted, playful, and funny
      - Use humor appropriately
      - Include witty remarks and clever observations
      - Keep a positive, fun tone
      - Be engaging and entertaining
      
      About DapDip:
      - DapDip is a social network focused on connecting people, sharing content, and promoting health and wellness.
      - The platform features posts, comments, direct messaging, stories, and a special "Better Me" section for health and fitness.
      
      Your capabilities:
      - Add humor to explanations of platform features
      - Suggest fun content ideas
      - Make wellness tips enjoyable
      - Use wordplay and light jokes when appropriate
      - Keep interactions entertaining
      
      Important:
      - Keep humor appropriate and inclusive
      - Balance being funny with being helpful
      - Avoid humor when discussing serious topics
      - Still provide accurate information amidst the fun
    `,
    temperature: 0.8,
    description: "Witty, playful, and entertaining",
    traits: ["Humorous", "Witty", "Playful", "Entertaining", "Light-hearted"]
  }
};

/**
 * Create a new memory item for user
 */
export const createMemoryItem = async (
  userId: string,
  type: MemoryType,
  content: string,
  importance: number = 5,
  context?: string,
  metadata?: Record<string, any>
): Promise<MemoryItem> => {
  try {
    // Create memory record in database
    const memory = await db.aIChatMemory.create({
      data: {
        type,
        content,
        importance,
        context,
        metadata,
        userId,
      },
    });

    return {
      id: memory.id,
      type: memory.type as MemoryType,
      content: memory.content,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      userId: memory.userId,
      importance: memory.importance,
      context: memory.context || undefined,
      metadata: memory.metadata as Record<string, any> || undefined,
    };
  } catch (error) {
    console.error('Error creating memory item:', error);
    throw error;
  }
};

/**
 * Get all memories for a user
 */
export const getUserMemories = async (
  userId: string,
  type?: MemoryType,
  limit: number = 100
): Promise<MemoryItem[]> => {
  try {
    // Query database for memories
    const memories = await db.aIChatMemory.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: [
        { importance: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    return memories.map(memory => ({
      id: memory.id,
      type: memory.type as MemoryType,
      content: memory.content,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      userId: memory.userId,
      importance: memory.importance,
      context: memory.context || undefined,
      metadata: memory.metadata as Record<string, any> || undefined,
    }));
  } catch (error) {
    console.error('Error getting user memories:', error);
    return [];
  }
};

/**
 * Update memory importance based on relevance and recency
 */
export const updateMemoryImportance = async (
  memoryId: string,
  newImportance: number
): Promise<void> => {
  try {
    await db.aIChatMemory.update({
      where: { id: memoryId },
      data: { importance: newImportance },
    });
  } catch (error) {
    console.error('Error updating memory importance:', error);
    throw error;
  }
};

/**
 * Delete memory item
 */
export const deleteMemory = async (memoryId: string): Promise<void> => {
  try {
    await db.aIChatMemory.delete({
      where: { id: memoryId },
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
};

/**
 * Extract key information from chat for long-term memory
 */
export const extractMemoryFromChat = async (
  userId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<MemoryItem[]> => {
  try {
    // Get combined chat history
    const chatHistory = messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
    
    // Skip if chat is too short
    if (messages.length < 3) {
      return [];
    }
    
    // Get model instance
    const geminiModel = getModelInstance(model, SafetyLevel.STANDARD, {
      temperature: 0.2, // Lower temperature for more consistent analysis
    });
    
    // Prompt for memory extraction
    const prompt = `
    Analyze the following chat conversation and extract important information that should be remembered 
    for future conversations with this user. Focus on:
    
    1. User preferences and interests
    2. Important personal details (but NOT sensitive personal information)
    3. Recurring topics or questions
    4. User goals and aspirations
    5. User behavior patterns
    
    Chat history:
    """
    ${chatHistory}
    """
    
    Extract 1-3 key memory items from this conversation. For each memory item:
    1. Provide the content of the memory (what to remember)
    2. Classify the type (short-term, long-term, episodic, semantic)
    3. Rate importance from 1-10 (10 being most important)
    4. Add any relevant context
    
    DO NOT include sensitive personal information like exact location, full name, contact details, 
    financial information, or health conditions.
    
    Format the response as a JSON array:
    [
      {
        "content": "Memory content here",
        "type": "short-term|long-term|episodic|semantic",
        "importance": 1-10,
        "context": "Additional context"
      }
    ]
    `;
    
    // Measure start time for performance tracking
    const startTime = Date.now();
    
    // Generate memory extraction
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Measure response time
    const responseTime = Date.now() - startTime;
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('Failed to extract memories from chat');
      return [];
    }
    
    const extractedMemories = JSON.parse(jsonMatch[0]);
    
    // Record token usage
    const promptTokens = estimateTokenCount(prompt);
    const completionTokens = estimateTokenCount(responseText);
    
    await recordTokenUsage({
      userId,
      operationType: 'MEMORY_EXTRACTION',
      tokensUsed: promptTokens + completionTokens,
      model: model,
      endpoint: 'chat-memory.extractMemoryFromChat',
      featureArea: 'chat',
      promptTokens,
      completionTokens,
      success: true,
      responseTime,
      metadata: {
        messagesAnalyzed: messages.length,
        memoriesExtracted: extractedMemories.length,
      }
    });
    
    // Create memory items in database
    const createdMemories: MemoryItem[] = [];
    
    for (const memory of extractedMemories) {
      try {
        const memoryItem = await createMemoryItem(
          userId,
          memory.type as MemoryType,
          memory.content,
          memory.importance,
          memory.context,
          { 
            extractedFrom: 'chat',
            extractedAt: new Date().toISOString(),
          }
        );
        
        createdMemories.push(memoryItem);
      } catch (error) {
        console.error('Error creating memory item:', error);
      }
    }
    
    return createdMemories;
  } catch (error) {
    console.error('Error extracting memory from chat:', error);
    return [];
  }
};

/**
 * Build a chat context with user data and memory
 */
export const buildChatContext = async (
  userId: string,
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>,
  personality: ChatPersonality = ChatPersonality.DEFAULT
): Promise<ChatContext> => {
  try {
    // Get user data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        interests: true,
        language: true,
        location: true,
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get user interests from database (user_interest table)
    const interests = await db.userInterest.findMany({
      where: { userId },
      include: { topic: true },
    });
    
    // Get user memories
    const [shortTermMemories, longTermMemories] = await Promise.all([
      getUserMemories(userId, MemoryType.SHORT_TERM, 10),
      getUserMemories(userId, MemoryType.LONG_TERM, 20),
    ]);
    
    // Build chat context
    const context: ChatContext = {
      userId,
      username: user.username || undefined,
      recentMessages,
      shortTermMemory: shortTermMemories,
      longTermMemory: longTermMemories,
      sessionStartTime: new Date(),
      messageCount: recentMessages.length,
      personality,
      userPreferences: {
        language: user.language || 'en',
      },
      userData: {
        interests: interests.map(interest => interest.topic.name),
        location: user.location || undefined,
        language: user.language || 'en',
      },
    };
    
    return context;
  } catch (error) {
    console.error('Error building chat context:', error);
    
    // Return minimal context if error occurs
    return {
      userId,
      recentMessages,
      shortTermMemory: [],
      longTermMemory: [],
      sessionStartTime: new Date(),
      messageCount: recentMessages.length,
      personality,
    };
  }
};

/**
 * Get a personality-specific system prompt
 */
export const getPersonalityPrompt = (
  personality: ChatPersonality,
  context?: ChatContext
): string => {
  // Get base system prompt for personality
  const basePrompt = PERSONALITY_CONFIG[personality]?.systemPrompt || PERSONALITY_CONFIG[ChatPersonality.DEFAULT].systemPrompt;
  
  // If no context, return base prompt
  if (!context) {
    return basePrompt;
  }
  
  // Build memory section based on available memories
  let memoryPrompt = '';
  
  if (context.longTermMemory.length > 0 || context.shortTermMemory.length > 0) {
    memoryPrompt = `
    IMPORTANT CONTEXT ABOUT THE USER:
    `;
    
    // Add long-term memories (most important)
    if (context.longTermMemory.length > 0) {
      memoryPrompt += `
      Long-term memory:
      ${context.longTermMemory
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .map(memory => `- ${memory.content}${memory.context ? ` (${memory.context})` : ''}`)
        .join('\n')}
      `;
    }
    
    // Add short-term memories (recent)
    if (context.shortTermMemory.length > 0) {
      memoryPrompt += `
      Recent information:
      ${context.shortTermMemory
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3)
        .map(memory => `- ${memory.content}${memory.context ? ` (${memory.context})` : ''}`)
        .join('\n')}
      `;
    }
  }
  
  // Add user preferences if available
  let preferencesPrompt = '';
  
  if (context.userData && Object.keys(context.userData).length > 0) {
    preferencesPrompt = `
    USER PREFERENCES:
    `;
    
    if (context.userData.interests && context.userData.interests.length > 0) {
      preferencesPrompt += `
      - Interests: ${context.userData.interests.join(', ')}
      `;
    }
    
    if (context.userData.language) {
      preferencesPrompt += `
      - Language: ${context.userData.language}
      `;
    }
    
    if (context.userData.location) {
      preferencesPrompt += `
      - Location: ${context.userData.location}
      `;
    }
  }
  
  // Combine all sections
  return `${basePrompt}
  
  ${memoryPrompt}
  
  ${preferencesPrompt}
  
  Remember to maintain your ${personality} personality style throughout this conversation.
  `;
};

/**
 * Get personality temperature setting
 */
export const getPersonalityTemperature = (personality: ChatPersonality): number => {
  return PERSONALITY_CONFIG[personality]?.temperature || 0.7;
};

/**
 * Get list of available personalities with descriptions
 */
export const getAvailablePersonalities = (): Array<{
  id: ChatPersonality;
  name: string;
  description: string;
  traits: string[];
}> => {
  return Object.entries(PERSONALITY_CONFIG).map(([id, config]) => ({
    id: id as ChatPersonality,
    name: id.charAt(0).toUpperCase() + id.slice(1).toLowerCase(),
    description: config.description,
    traits: config.traits,
  }));
};

/**
 * Get user's preferred personality
 */
export const getUserPreferredPersonality = async (userId: string): Promise<ChatPersonality> => {
  try {
    // Check if user has a preferred personality setting
    const preference = await db.userPreference.findFirst({
      where: {
        userId,
        key: 'assistantPersonality',
      },
    });
    
    if (preference?.value && Object.values(ChatPersonality).includes(preference.value as ChatPersonality)) {
      return preference.value as ChatPersonality;
    }
    
    // Default to DEFAULT personality
    return ChatPersonality.DEFAULT;
  } catch (error) {
    console.error('Error getting user preferred personality:', error);
    return ChatPersonality.DEFAULT;
  }
};

/**
 * Set user's preferred personality
 */
export const setUserPreferredPersonality = async (
  userId: string,
  personality: ChatPersonality
): Promise<void> => {
  try {
    // Upsert the preference
    await db.userPreference.upsert({
      where: {
        userId_key: {
          userId,
          key: 'assistantPersonality',
        },
      },
      update: {
        value: personality,
      },
      create: {
        userId,
        key: 'assistantPersonality',
        value: personality,
      },
    });
  } catch (error) {
    console.error('Error setting user preferred personality:', error);
    throw error;
  }
};