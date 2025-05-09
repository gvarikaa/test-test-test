import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Models
export enum GeminiModel {
  PRO = 'gemini-1.5-pro',
  FLASH = '2.5-flash',
}

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

// Generation parameters
interface GenerationParams {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// Default parameters
const DEFAULT_PARAMS: GenerationParams = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

// Create a chat session
export const createChatSession = async (
  model: GeminiModel = GeminiModel.PRO,
  initialPrompt?: string,
  params?: GenerationParams
) => {
  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      safetySettings,
      generationConfig: {
        ...DEFAULT_PARAMS,
        ...params,
      },
    });

    const chat = geminiModel.startChat({
      history: initialPrompt ? [{ role: 'user', parts: [{ text: initialPrompt }] }] : [],
    });

    return chat;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

// Analyze text content
export const analyzeContent = async (
  content: string,
  model: GeminiModel = GeminiModel.PRO
): Promise<ContentAnalysis> => {
  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      safetySettings,
      generationConfig: {
        ...DEFAULT_PARAMS,
        temperature: 0.2, // Lower temperature for more consistent analysis
      },
    });

    const prompt = `
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
    };
  }
};

// Generate health recommendations
export const generateHealthRecommendations = async (
  healthProfile: {
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel?: string;
    dietaryRestrictions?: string;
  },
  goals: string[],
  model: GeminiModel = GeminiModel.PRO
): Promise<HealthRecommendations> => {
  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      safetySettings,
      generationConfig: {
        ...DEFAULT_PARAMS,
        temperature: 0.4, // More consistent for health recommendations
      },
    });

    const prompt = `
    Generate personalized health recommendations based on the following profile and goals.
    
    Health Profile:
    - Age: ${healthProfile.age || 'Not specified'}
    - Weight: ${healthProfile.weight ? `${healthProfile.weight} kg` : 'Not specified'}
    - Height: ${healthProfile.height ? `${healthProfile.height} cm` : 'Not specified'}
    - Gender: ${healthProfile.gender || 'Not specified'}
    - Activity Level: ${healthProfile.activityLevel || 'Not specified'}
    - Dietary Restrictions: ${healthProfile.dietaryRestrictions || 'None specified'}
    
    Goals:
    ${goals.map(goal => `- ${goal}`).join('\n')}
    
    Please provide comprehensive health recommendations including:
    1. Diet plan with meal suggestions
    2. Exercise routine tailored to their profile
    3. Habit recommendations
    4. Lifestyle adjustments
    
    IMPORTANT: Do not provide specific calorie counts or medical advice. Focus on general wellness recommendations.
    
    Format your response as a structured JSON object with the following keys:
    - dietPlan: object with "overview", "recommendations", "mealIdeas" (array), "snackIdeas" (array)
    - exerciseRoutine: object with "overview", "weeklyPlan" (array of daily recommendations)
    - habits: array of objects with "title" and "description" fields
    - lifestyle: array of objects with "area" and "recommendations" fields
    - disclaimer: string (general health advice disclaimer)
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

// Type definitions
export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  topics: string[];
  entities: { name: string; type: string }[];
  tone: string;
  suggestions: string[];
  engagementPrediction: 'high' | 'medium' | 'low';
  reasonForEngagementPrediction: string;
}

export interface HealthRecommendations {
  dietPlan: {
    overview: string;
    recommendations: string[];
    mealIdeas: string[];
    snackIdeas: string[];
  };
  exerciseRoutine: {
    overview: string;
    weeklyPlan: Array<{
      day: string;
      focus: string;
      exercises: Array<{
        name: string;
        details?: string;
      }>;
    }>;
  };
  habits: { title: string; description: string }[];
  lifestyle: { area: string; recommendations: string[] }[];
  disclaimer: string;
}