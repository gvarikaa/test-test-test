import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
  SafetySetting,
  GenerationConfig
} from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Models
export enum GeminiModel {
  PRO_1_5 = 'gemini-1.5-pro',
  PRO_LATEST = 'gemini-pro',
  FLASH_2_5 = 'gemini-2.5-flash',
  VISION_1_5 = 'gemini-1.5-pro-vision',
  VISION_LATEST = 'gemini-pro-vision',
}

// Model Presets for quick configuration
export enum ModelPreset {
  DEFAULT = 'default',
  CREATIVE = 'creative',
  BALANCED = 'balanced',
  PRECISE = 'precise',
}

// Safety Levels for convenience
export enum SafetyLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  STRICT = 'strict',
  MAXIMUM = 'maximum',
}

// Context window sizes (approximate token limits)
export enum ContextSize {
  SMALL = 8192,
  MEDIUM = 16384,
  LARGE = 32768,
  MAXIMUM = 131072, // For Gemini 1.5 Pro
}

// Default safety settings
const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
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

// Strict safety settings
const STRICT_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

// Minimal safety settings
const MINIMAL_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Maximum safety settings
const MAXIMUM_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Map safety level to settings
export const getSafetySettings = (level: SafetyLevel = SafetyLevel.STANDARD): SafetySetting[] => {
  switch (level) {
    case SafetyLevel.MINIMAL:
      return MINIMAL_SAFETY_SETTINGS;
    case SafetyLevel.STRICT:
      return STRICT_SAFETY_SETTINGS;
    case SafetyLevel.MAXIMUM:
      return MAXIMUM_SAFETY_SETTINGS;
    case SafetyLevel.STANDARD:
    default:
      return DEFAULT_SAFETY_SETTINGS;
  }
};

// Generation parameters expanded
export interface GenerationParams extends GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
  logprobs?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<string, number>;
}

// Default parameters
export const DEFAULT_PARAMS: GenerationParams = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

// Preset configurations
export const getModelPreset = (preset: ModelPreset): GenerationParams => {
  switch (preset) {
    case ModelPreset.CREATIVE:
      return {
        temperature: 0.9,
        topK: 50,
        topP: 0.97,
        maxOutputTokens: 2048,
      };
    case ModelPreset.BALANCED:
      return DEFAULT_PARAMS;
    case ModelPreset.PRECISE:
      return {
        temperature: 0.3,
        topK: 20,
        topP: 0.85,
        maxOutputTokens: 1024,
      };
    case ModelPreset.DEFAULT:
    default:
      return DEFAULT_PARAMS;
  }
};

// Model instance cache to optimize performance
const modelCache: Record<string, GenerativeModel> = {};

// Get or create a model instance with configuration
export const getModelInstance = (
  model: GeminiModel = GeminiModel.PRO_1_5,
  safetyLevel: SafetyLevel = SafetyLevel.STANDARD,
  params?: GenerationParams,
  contextSize?: ContextSize
): GenerativeModel => {
  // Create a cache key based on configuration
  const cacheKey = `${model}-${safetyLevel}-${JSON.stringify(params || {})}-${contextSize || ''}`;

  // Return cached instance if available
  if (modelCache[cacheKey]) {
    return modelCache[cacheKey];
  }

  // Create configuration
  const safetySettings = getSafetySettings(safetyLevel);
  const generationConfig = {
    ...DEFAULT_PARAMS,
    ...params,
  };

  // Create model instance
  const modelInstance = genAI.getGenerativeModel({
    model,
    safetySettings,
    generationConfig,
    // Set system instructions for context window size if specified
    systemInstruction: contextSize
      ? { text: `Use a context window of approximately ${contextSize} tokens.` }
      : undefined,
  });

  // Cache the instance
  modelCache[cacheKey] = modelInstance;
  return modelInstance;
};

// Create a chat session with enhanced options
export const createChatSession = async (
  model: GeminiModel = GeminiModel.PRO_1_5,
  initialPrompt?: string,
  params?: GenerationParams,
  safetyLevel: SafetyLevel = SafetyLevel.STANDARD,
  contextSize?: ContextSize,
  systemPrompt?: string
) => {
  try {
    // Get model instance
    const geminiModel = getModelInstance(model, safetyLevel, params, contextSize);

    // Create initial history with system prompt if provided
    const history: Array<{role: string, parts: Array<{text: string}>}> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      history.push({
        role: 'model',
        parts: [{ text: systemPrompt }]
      });
    }

    // Add initial user prompt if provided
    if (initialPrompt) {
      history.push({
        role: 'user',
        parts: [{ text: initialPrompt }]
      });
    }

    // Start chat session
    const chat = geminiModel.startChat({
      history,
      generationConfig: params,
    });

    return chat;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

// Analyze text content with enhanced options
export const analyzeContent = async (
  content: string,
  model: GeminiModel = GeminiModel.PRO_1_5,
  analysisType: 'standard' | 'detailed' | 'sentiment' | 'moderation' = 'standard',
  params?: GenerationParams,
  safetyLevel: SafetyLevel = SafetyLevel.STANDARD
): Promise<ContentAnalysis> => {
  try {
    // Use more precise parameters for analysis
    const analysisParams: GenerationParams = {
      ...DEFAULT_PARAMS,
      temperature: 0.2, // Lower temperature for more consistent analysis
      ...params,
    };

    // Get model instance
    const geminiModel = getModelInstance(model, safetyLevel, analysisParams);

    // Choose prompt based on analysis type
    let prompt = '';

    switch (analysisType) {
      case 'detailed':
        prompt = `
        Analyze the following social media post content and provide detailed insights.

        Content: """
        ${content}
        """

        Please provide a comprehensive analysis including:
        1. Sentiment (positive, negative, neutral, or mixed)
        2. Main topics or themes (comma-separated list)
        3. Key entities mentioned (people, places, organizations, events)
        4. Tone assessment (formal, casual, humorous, serious, etc.)
        5. Content suggestions for improvement
        6. Potential engagement prediction (high, medium, low)
        7. Content quality assessment (poor, average, good, excellent)
        8. Content category/classification
        9. Keywords for SEO optimization
        10. Potential content warnings or moderation flags

        Format your response as a structured JSON object with the following keys:
        - sentiment: string (one of: "positive", "negative", "neutral", "mixed")
        - topics: array of strings
        - entities: array of objects with "name" and "type" fields
        - tone: string
        - suggestions: array of strings
        - engagementPrediction: string (one of: "high", "medium", "low")
        - reasonForEngagementPrediction: string
        - contentQuality: string
        - contentCategory: string
        - keywords: array of strings
        - contentWarnings: array of strings
        `;
        break;

      case 'sentiment':
        prompt = `
        Analyze the sentiment of the following social media post content.

        Content: """
        ${content}
        """

        Please provide a focused sentiment analysis including:
        1. Overall sentiment (positive, negative, neutral, or mixed)
        2. Confidence score (0.0-1.0)
        3. Key sentiment drivers (what aspects drive the sentiment)
        4. Sentiment breakdown by sentence if applicable

        Format your response as a structured JSON object with the following keys:
        - sentiment: string (one of: "positive", "negative", "neutral", "mixed")
        - confidenceScore: number
        - sentimentDrivers: array of strings
        - sentenceBreakdown: array of objects with "sentence" and "sentiment" fields
        - topics: array of strings (minimal)
        - tone: string
        `;
        break;

      case 'moderation':
        prompt = `
        Perform a content moderation check on the following social media post content.

        Content: """
        ${content}
        """

        Please provide a content moderation assessment including:
        1. Safety rating (safe, low_risk, medium_risk, high_risk)
        2. Potential policy violations
        3. Toxicity indicators
        4. Content category classifications
        5. Age appropriateness

        Format your response as a structured JSON object with the following keys:
        - safetyRating: string (one of: "safe", "low_risk", "medium_risk", "high_risk")
        - policyViolations: array of strings
        - toxicityIndicators: array of objects with "category" and "severity" fields
        - contentCategories: array of strings
        - ageAppropriateness: string
        - sentiment: string (one of: "positive", "negative", "neutral", "mixed")
        - topics: array of strings (minimal)
        `;
        break;

      case 'standard':
      default:
        prompt = `
        Analyze the following social media post content and provide insights.

        Content: """
        ${content}
        """

        Please provide a comprehensive analysis including:
        1. Sentiment (positive, negative, neutral, or mixed)
        2. Main topics or themes (comma-separated list)
        3. Key entities mentioned (people, places, organizations, events)
        4. Tone assessment (formal, casual, humorous, serious, etc.)
        5. Content suggestions for improvement
        6. Potential engagement prediction (high, medium, low)

        Format your response as a structured JSON object with the following keys:
        - sentiment: string (one of: "positive", "negative", "neutral", "mixed")
        - topics: array of strings
        - entities: array of objects with "name" and "type" fields
        - tone: string
        - suggestions: array of strings
        - engagementPrediction: string (one of: "high", "medium", "low")
        - reasonForEngagementPrediction: string
        `;
    }

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response');
    }

    const analysisData: ContentAnalysis = JSON.parse(jsonMatch[0]);

    return analysisData;
  } catch (error) {
    console.error('Error analyzing content:', error);

    // Return a default error response
    return {
      sentiment: 'neutral',
      topics: ['Unable to analyze content'],
      entities: [],
      tone: 'unknown',
      suggestions: ['Try again with different content'],
      engagementPrediction: 'medium',
      reasonForEngagementPrediction: 'Analysis failed',
      contentQuality: 'unknown',
      contentCategory: 'unknown',
      keywords: [],
      contentWarnings: [],
      safetyRating: 'unknown',
      confidenceScore: 0,
    };
  }
};

// Enhanced health recommendations generation with more options
export const generateHealthRecommendations = async (
  healthProfile: {
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel?: string;
    dietaryRestrictions?: string;
    medicalConditions?: string[];
    allergies?: string[];
    preferences?: string[];
  },
  goals: string[],
  model: GeminiModel = GeminiModel.PRO_1_5,
  detailLevel: 'basic' | 'standard' | 'detailed' = 'standard',
  params?: GenerationParams,
  safetyLevel: SafetyLevel = SafetyLevel.STRICT
): Promise<HealthRecommendations> => {
  try {
    // Use more consistent parameters for health recommendations
    const healthParams: GenerationParams = {
      ...DEFAULT_PARAMS,
      temperature: 0.4, // More consistent for health recommendations
      ...params,
    };

    // Get model instance with strict safety for health recommendations
    const geminiModel = getModelInstance(model, safetyLevel, healthParams);

    // Additional profile details if available
    const medicalConditions = healthProfile.medicalConditions?.length
      ? `- Medical Conditions: ${healthProfile.medicalConditions.join(', ')}`
      : '';

    const allergies = healthProfile.allergies?.length
      ? `- Allergies: ${healthProfile.allergies.join(', ')}`
      : '';

    const preferences = healthProfile.preferences?.length
      ? `- Preferences: ${healthProfile.preferences.join(', ')}`
      : '';

    // Vary detail level based on user preference
    let detailPrompt = '';
    let outputFormat = '';

    switch (detailLevel) {
      case 'basic':
        detailPrompt = `
        Please provide simple health recommendations including:
        1. Basic diet suggestions
        2. Simple exercise ideas
        3. A few habit recommendations
        `;
        outputFormat = `
        Format your response as a structured JSON object with the following keys:
        - dietPlan: object with "overview", "recommendations" (array)
        - exerciseRoutine: object with "overview", "suggestions" (array)
        - habits: array of objects with "title" and "description" fields
        - disclaimer: string (general health advice disclaimer)
        `;
        break;

      case 'detailed':
        detailPrompt = `
        Please provide highly detailed health recommendations including:
        1. Comprehensive diet plan with meal suggestions for each day of the week
        2. Detailed exercise routine with specific exercises, sets, reps, and progression plan
        3. Comprehensive habit tracking system
        4. Lifestyle adjustments with implementation strategies
        5. Sleep optimization recommendations
        6. Stress management techniques
        7. Hydration recommendations
        8. Supplement considerations (general, not medical advice)
        9. Progress tracking metrics and benchmarks
        `;
        outputFormat = `
        Format your response as a structured JSON object with the following keys:
        - dietPlan: object with "overview", "recommendations", "mealIdeas" (array), "snackIdeas" (array), "weeklyMealPlan" (object with days)
        - exerciseRoutine: object with "overview", "weeklyPlan" (array of daily recommendations with exercises, sets, reps)
        - habits: array of objects with "title", "description", and "implementationSteps" fields
        - lifestyle: array of objects with "area", "recommendations", and "implementationStrategy" fields
        - sleep: object with "recommendations", "schedule", "optimizationTips"
        - stressManagement: array of techniques with descriptions
        - hydration: object with "recommendations", "schedule"
        - supplements: array of general considerations (not prescriptive)
        - progressTracking: object with "metrics", "benchmarks", "trackingSchedule"
        - disclaimer: string (general health advice disclaimer)
        `;
        break;

      case 'standard':
      default:
        detailPrompt = `
        Please provide comprehensive health recommendations including:
        1. Diet plan with meal suggestions
        2. Exercise routine tailored to their profile
        3. Habit recommendations
        4. Lifestyle adjustments
        `;
        outputFormat = `
        Format your response as a structured JSON object with the following keys:
        - dietPlan: object with "overview", "recommendations", "mealIdeas" (array), "snackIdeas" (array)
        - exerciseRoutine: object with "overview", "weeklyPlan" (array of daily recommendations)
        - habits: array of objects with "title" and "description" fields
        - lifestyle: array of objects with "area" and "recommendations" fields
        - disclaimer: string (general health advice disclaimer)
        `;
    }

    const prompt = `
    Generate personalized health recommendations based on the following profile and goals.

    Health Profile:
    - Age: ${healthProfile.age || 'Not specified'}
    - Weight: ${healthProfile.weight ? `${healthProfile.weight} kg` : 'Not specified'}
    - Height: ${healthProfile.height ? `${healthProfile.height} cm` : 'Not specified'}
    - Gender: ${healthProfile.gender || 'Not specified'}
    - Activity Level: ${healthProfile.activityLevel || 'Not specified'}
    - Dietary Restrictions: ${healthProfile.dietaryRestrictions || 'None specified'}
    ${medicalConditions}
    ${allergies}
    ${preferences}

    Goals:
    ${goals.map(goal => `- ${goal}`).join('\n')}

    ${detailPrompt}

    IMPORTANT: Do not provide specific calorie counts or medical advice. Focus on general wellness recommendations.

    ${outputFormat}
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response');
    }

    const recommendations: HealthRecommendations = JSON.parse(jsonMatch[0]);

    return recommendations;
  } catch (error) {
    console.error('Error generating health recommendations:', error);

    // Return a default error response
    return {
      dietPlan: {
        overview: 'Unable to generate diet plan',
        recommendations: ['Please try again later'],
        mealIdeas: [],
        snackIdeas: [],
      },
      exerciseRoutine: {
        overview: 'Unable to generate exercise routine',
        weeklyPlan: [],
      },
      habits: [],
      lifestyle: [],
      disclaimer: 'This is a general recommendation. Always consult healthcare professionals for personalized advice.',
    };
  }
};

// Generate image description from image data (multimodal support)
export const analyzeImage = async (
  imageData: string | Blob,
  model: GeminiModel = GeminiModel.VISION_1_5,
  analysisType: 'description' | 'detailed' | 'moderation' = 'description',
  params?: GenerationParams,
  safetyLevel: SafetyLevel = SafetyLevel.STANDARD
): Promise<ImageAnalysis> => {
  try {
    // Get model instance
    const geminiModel = getModelInstance(model, safetyLevel, params);

    // Choose prompt based on analysis type
    let prompt = '';

    switch (analysisType) {
      case 'detailed':
        prompt = `
        Analyze this image in detail and provide the following information:
        1. A comprehensive description of what appears in the image
        2. Objects and entities present
        3. Actions being performed
        4. Setting and environment
        5. Colors and visual elements
        6. Emotions or mood conveyed
        7. Any text visible in the image
        8. Potential content categories
        9. Accessibility description for visually impaired users

        Format your response as a structured JSON object with the following keys:
        - description: string (comprehensive description)
        - objects: array of strings (objects and entities present)
        - actions: array of strings
        - setting: string
        - visualElements: object with color schemes, composition notes, etc.
        - mood: string
        - textContent: string or null
        - categories: array of strings
        - accessibilityDescription: string (optimized for screen readers)
        `;
        break;

      case 'moderation':
        prompt = `
        Perform content moderation on this image and provide:
        1. Safety assessment
        2. Content category classification
        3. Age appropriateness
        4. Potential policy violations
        5. Brief description of the image content

        Format your response as a structured JSON object with the following keys:
        - safetyRating: string (safe, low_risk, medium_risk, high_risk)
        - description: string (brief description)
        - contentCategories: array of strings
        - ageAppropriateness: string
        - potentialViolations: array of strings or empty array
        `;
        break;

      case 'description':
      default:
        prompt = `
        Describe what you see in this image in detail.

        Format your response as a structured JSON object with the following keys:
        - description: string (comprehensive description)
        - objects: array of strings (key objects identified)
        - setting: string (where the image appears to be taken)
        - colors: array of strings (dominant colors)
        - categories: array of strings (content categories)
        `;
    }

    // Create input parts with image
    const imagePart = {
      inlineData: {
        data: typeof imageData === 'string' ? imageData : await blobToBase64(imageData),
        mimeType: typeof imageData === 'string' ? 'image/jpeg' : imageData.type,
      },
    };

    const result = await geminiModel.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response');
    }

    const analysisData: ImageAnalysis = JSON.parse(jsonMatch[0]);

    return analysisData;
  } catch (error) {
    console.error('Error analyzing image:', error);

    // Return a default error response
    return {
      description: 'Unable to analyze image',
      objects: [],
      setting: 'unknown',
      colors: [],
      categories: [],
      safetyRating: 'unknown',
    };
  }
};

// Helper function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64String.indexOf(',') !== -1
        ? base64String.split(',')[1]
        : base64String;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Type definitions
export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  topics: string[];
  entities: { name: string; type: string }[];
  tone: string;
  suggestions: string[];
  engagementPrediction: 'high' | 'medium' | 'low';
  reasonForEngagementPrediction: string;
  // Extended properties for detailed analysis
  contentQuality?: string;
  contentCategory?: string;
  keywords?: string[];
  contentWarnings?: string[];
  // Specific properties for sentiment analysis
  confidenceScore?: number;
  sentimentDrivers?: string[];
  sentenceBreakdown?: Array<{ sentence: string; sentiment: string }>;
  // Specific properties for moderation
  safetyRating?: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'unknown';
  policyViolations?: string[];
  toxicityIndicators?: Array<{ category: string; severity: string }>;
  contentCategories?: string[];
  ageAppropriateness?: string;
}

export interface ImageAnalysis {
  description: string;
  objects: string[];
  setting: string;
  colors: string[];
  categories: string[];
  // Extended properties for detailed analysis
  actions?: string[];
  visualElements?: {
    colorScheme?: string;
    composition?: string;
    style?: string;
    lighting?: string;
  };
  mood?: string;
  textContent?: string | null;
  accessibilityDescription?: string;
  // Specific properties for moderation
  safetyRating?: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'unknown';
  ageAppropriateness?: string;
  potentialViolations?: string[];
}

export interface HealthRecommendations {
  dietPlan: {
    overview: string;
    recommendations: string[];
    mealIdeas: string[];
    snackIdeas: string[];
    weeklyMealPlan?: Record<string, any>; // For detailed plans
  };
  exerciseRoutine: {
    overview: string;
    weeklyPlan: Array<{
      day: string;
      focus: string;
      exercises: Array<{
        name: string;
        details?: string;
        sets?: number;
        reps?: number;
        duration?: string;
        restTime?: string;
      }>;
    }>;
  };
  habits: { title: string; description: string; implementationSteps?: string[] }[];
  lifestyle: { area: string; recommendations: string[]; implementationStrategy?: string }[];
  // Extended properties for detailed recommendations
  sleep?: {
    recommendations: string[];
    schedule?: string;
    optimizationTips?: string[];
  };
  stressManagement?: Array<{
    technique: string;
    description: string;
    frequency?: string;
  }>;
  hydration?: {
    recommendations: string[];
    schedule?: string;
  };
  supplements?: string[];
  progressTracking?: {
    metrics: string[];
    benchmarks?: Record<string, string>;
    trackingSchedule?: string;
  };
  disclaimer: string;
}