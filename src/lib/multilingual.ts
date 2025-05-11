import { GeminiModel, getModelInstance, SafetyLevel } from '@/lib/gemini';
import { estimateTokenCount, recordTokenUsage } from '@/lib/token-management';

// Languages supported for translation and detection
export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar',
  HINDI = 'hi',
  GEORGIAN = 'ka',
  UKRAINIAN = 'uk',
  DUTCH = 'nl',
  POLISH = 'pl',
  SWEDISH = 'sv',
  TURKISH = 'tr',
  VIETNAMESE = 'vi',
  THAI = 'th',
}

// Language names for display
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ka: 'Georgian',
  uk: 'Ukrainian',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
};

// Language detection result interface
export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  languageName: string;
  otherPossibilities: Array<{
    language: string;
    languageName: string;
    confidence: number;
  }>;
  isReliable: boolean;
  textSample: string;
}

// Translation result interface
export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  quality: 'high' | 'medium' | 'low';
  preservedFormatting: boolean;
  tokenCount: number;
}

// Language analysis result interface
export interface LanguageAnalysisResult {
  language: string;
  languageName: string;
  formalityLevel: 'formal' | 'neutral' | 'informal';
  complexity: 'simple' | 'standard' | 'complex' | 'technical';
  toneAssessment: string[];
  suggestions: string[];
  grammarIssues: Array<{
    issue: string;
    suggestion: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
}

/**
 * Detect the language of a text
 */
export const detectLanguage = async (
  text: string,
  userId?: string,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<LanguageDetectionResult> => {
  try {
    // Get model instance
    const geminiModel = getModelInstance(model, SafetyLevel.STANDARD, {
      temperature: 0.1, // Lower temperature for more consistent detection
    });

    // Create a prompt for language detection
    const prompt = `
    Detect the language of the following text:
    
    """
    ${text.substring(0, 500)}
    """
    
    Analyze the language and return a detailed result including:
    - The ISO 639-1 language code (e.g., 'en', 'es', 'fr')
    - Confidence score (0.0-1.0)
    - Full language name (e.g., 'English', 'Spanish', 'French')
    - Other possible languages with confidence scores
    - Whether the detection is reliable
    
    Format your response as a structured JSON object with the following keys:
    {
      "detectedLanguage": "ISO 639-1 code",
      "confidence": number between 0 and 1,
      "languageName": "Full language name",
      "otherPossibilities": [
        {
          "language": "ISO 639-1 code",
          "languageName": "Full language name",
          "confidence": number between 0 and 1
        }
      ],
      "isReliable": boolean,
      "textSample": "brief sample from the text that helped in detection"
    }
    `;

    // Measure start time for performance tracking
    const startTime = Date.now();
    
    // Generate content
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Measure response time
    const responseTime = Date.now() - startTime;

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from language detection');
    }
    
    const detectionResult: LanguageDetectionResult = JSON.parse(jsonMatch[0]);
    
    // Get proper language name if missing
    if (!detectionResult.languageName && detectionResult.detectedLanguage) {
      detectionResult.languageName = LANGUAGE_NAMES[detectionResult.detectedLanguage] || 'Unknown';
    }
    
    // Add language names to other possibilities if missing
    if (detectionResult.otherPossibilities) {
      detectionResult.otherPossibilities = detectionResult.otherPossibilities.map(possibility => ({
        ...possibility,
        languageName: possibility.languageName || LANGUAGE_NAMES[possibility.language] || 'Unknown'
      }));
    }
    
    // Record token usage if userId is provided
    if (userId) {
      const promptTokens = estimateTokenCount(prompt);
      const completionTokens = estimateTokenCount(responseText);
      
      await recordTokenUsage({
        userId,
        operationType: 'LANGUAGE_DETECTION',
        tokensUsed: promptTokens + completionTokens,
        model: model,
        endpoint: 'multilingual.detectLanguage',
        featureArea: 'language',
        promptTokens,
        completionTokens,
        success: true,
        responseTime,
        metadata: {
          detectedLanguage: detectionResult.detectedLanguage,
          confidence: detectionResult.confidence,
          isReliable: detectionResult.isReliable,
        }
      });
    }
    
    return detectionResult;
  } catch (error) {
    console.error('Error detecting language:', error);
    // Return a default error response
    return {
      detectedLanguage: 'unknown',
      confidence: 0,
      languageName: 'Unknown',
      otherPossibilities: [],
      isReliable: false,
      textSample: text.substring(0, 50),
    };
  }
};

/**
 * Translate text between languages
 */
export const translateText = async (
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage?: SupportedLanguage,
  userId?: string,
  preserveFormatting: boolean = true,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<TranslationResult> => {
  try {
    // If source language is not provided, detect it
    let detectedSourceLanguage = sourceLanguage;
    if (!detectedSourceLanguage) {
      const detection = await detectLanguage(text, userId, model);
      detectedSourceLanguage = detection.detectedLanguage as SupportedLanguage;
    }
    
    // Don't translate if source and target languages are the same
    if (detectedSourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage,
        quality: 'high',
        preservedFormatting: true,
        tokenCount: 0
      };
    }
    
    // Get model instance
    const geminiModel = getModelInstance(model, SafetyLevel.STANDARD, {
      temperature: 0.1, // Lower temperature for more consistent translations
    });

    // Create a prompt for translation with formatting instructions
    const prompt = `
    Translate the following text from ${LANGUAGE_NAMES[detectedSourceLanguage] || detectedSourceLanguage} to ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}:
    
    """
    ${text}
    """
    
    ${preserveFormatting ? 'IMPORTANT: Preserve all original formatting, line breaks, bullet points, and special characters.' : ''}
    Provide a natural-sounding, accurate translation that maintains the original meaning and tone.
    
    Respond with a structured JSON object containing:
    {
      "translatedText": "the translated text",
      "sourceLanguage": "ISO 639-1 code of the source language",
      "targetLanguage": "ISO 639-1 code of the target language",
      "quality": "high/medium/low based on confidence",
      "preservedFormatting": boolean
    }
    `;

    // Measure start time for performance tracking
    const startTime = Date.now();
    
    // Generate content
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Measure response time
    const responseTime = Date.now() - startTime;

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from translation');
    }
    
    const translationResult: TranslationResult = JSON.parse(jsonMatch[0]);
    
    // Add token count
    const promptTokens = estimateTokenCount(prompt);
    const completionTokens = estimateTokenCount(responseText);
    translationResult.tokenCount = promptTokens + completionTokens;
    
    // Record token usage if userId is provided
    if (userId) {
      await recordTokenUsage({
        userId,
        operationType: 'TRANSLATION',
        tokensUsed: translationResult.tokenCount,
        model: model,
        endpoint: 'multilingual.translateText',
        featureArea: 'language',
        promptTokens,
        completionTokens,
        success: true,
        responseTime,
        metadata: {
          sourceLanguage: translationResult.sourceLanguage,
          targetLanguage: translationResult.targetLanguage,
          quality: translationResult.quality,
          textLength: text.length,
        }
      });
    }
    
    return translationResult;
  } catch (error) {
    console.error('Error translating text:', error);
    // Return a default error response
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage || 'unknown',
      targetLanguage,
      quality: 'low',
      preservedFormatting: false,
      tokenCount: 0
    };
  }
};

/**
 * Analyze language quality, formality, and grammar
 */
export const analyzeLanguageQuality = async (
  text: string,
  language?: SupportedLanguage,
  userId?: string,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<LanguageAnalysisResult> => {
  try {
    // If language is not provided, detect it
    let detectedLanguage = language;
    if (!detectedLanguage) {
      const detection = await detectLanguage(text, userId, model);
      detectedLanguage = detection.detectedLanguage as SupportedLanguage;
    }
    
    // Get model instance
    const geminiModel = getModelInstance(model, SafetyLevel.STANDARD, {
      temperature: 0.2, // Lower temperature for more consistent analysis
    });

    // Create a prompt for language quality analysis
    const prompt = `
    Analyze the language quality, formality, complexity, and grammar of the following text in ${LANGUAGE_NAMES[detectedLanguage] || detectedLanguage}:
    
    """
    ${text.substring(0, 1000)}
    """
    
    Provide a detailed analysis including:
    - Formality level (formal, neutral, informal)
    - Complexity level (simple, standard, complex, technical)
    - Tone assessment
    - Improvement suggestions
    - Grammar issues with corrections
    
    Format your response as a structured JSON object with the following keys:
    {
      "language": "ISO 639-1 language code",
      "languageName": "full language name",
      "formalityLevel": "formal, neutral, or informal",
      "complexity": "simple, standard, complex, or technical",
      "toneAssessment": ["array", "of", "tone", "descriptors"],
      "suggestions": ["array", "of", "improvement", "suggestions"],
      "grammarIssues": [
        {
          "issue": "description of the issue",
          "suggestion": "correction suggestion",
          "severity": "minor, moderate, or major"
        }
      ]
    }
    `;

    // Measure start time for performance tracking
    const startTime = Date.now();
    
    // Generate content
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Measure response time
    const responseTime = Date.now() - startTime;

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from language quality analysis');
    }
    
    const analysisResult: LanguageAnalysisResult = JSON.parse(jsonMatch[0]);
    
    // Get proper language name if missing
    if (!analysisResult.languageName && analysisResult.language) {
      analysisResult.languageName = LANGUAGE_NAMES[analysisResult.language] || 'Unknown';
    }
    
    // Record token usage if userId is provided
    if (userId) {
      const promptTokens = estimateTokenCount(prompt);
      const completionTokens = estimateTokenCount(responseText);
      
      await recordTokenUsage({
        userId,
        operationType: 'LANGUAGE_ANALYSIS',
        tokensUsed: promptTokens + completionTokens,
        model: model,
        endpoint: 'multilingual.analyzeLanguageQuality',
        featureArea: 'language',
        promptTokens,
        completionTokens,
        success: true,
        responseTime,
        metadata: {
          language: analysisResult.language,
          formalityLevel: analysisResult.formalityLevel,
          complexity: analysisResult.complexity,
          grammarIssuesCount: analysisResult.grammarIssues?.length || 0,
        }
      });
    }
    
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing language quality:', error);
    // Return a default error response
    return {
      language: language || 'unknown',
      languageName: language ? LANGUAGE_NAMES[language] || 'Unknown' : 'Unknown',
      formalityLevel: 'neutral',
      complexity: 'standard',
      toneAssessment: ['Unable to analyze tone'],
      suggestions: ['Analysis failed, please try again'],
      grammarIssues: [],
    };
  }
};

/**
 * Generate multilingual content
 */
export const generateMultilingualContent = async (
  prompt: string,
  targetLanguage: SupportedLanguage,
  contentType: 'post' | 'comment' | 'headline' | 'story' | 'response',
  tone: 'formal' | 'casual' | 'professional' | 'friendly' = 'casual',
  userId?: string,
  model: GeminiModel = GeminiModel.PRO_1_5
): Promise<string> => {
  try {
    // Get model instance
    const geminiModel = getModelInstance(model, SafetyLevel.STRICT, {
      temperature: 0.7, // Higher temperature for creative content
    });

    // Create a prompt for content generation
    const systemPrompt = `
    Generate ${contentType} content in ${LANGUAGE_NAMES[targetLanguage]} (${targetLanguage}) based on the provided prompt.
    The content should have a ${tone} tone and be appropriate for social media.
    
    Prompt: "${prompt}"
    
    Generate ONLY the content in ${LANGUAGE_NAMES[targetLanguage]}, without any explanations or notes in English.
    The response should be natural and fluent in the target language, as if written by a native speaker.
    `;

    // Measure start time for performance tracking
    const startTime = Date.now();
    
    // Generate content
    const result = await geminiModel.generateContent(systemPrompt);
    const response = result.response;
    const generatedContent = response.text().trim();
    
    // Measure response time
    const responseTime = Date.now() - startTime;
    
    // Record token usage if userId is provided
    if (userId) {
      const promptTokens = estimateTokenCount(systemPrompt);
      const completionTokens = estimateTokenCount(generatedContent);
      
      await recordTokenUsage({
        userId,
        operationType: 'MULTILINGUAL_GENERATION',
        tokensUsed: promptTokens + completionTokens,
        model: model,
        endpoint: 'multilingual.generateMultilingualContent',
        featureArea: 'language',
        promptTokens,
        completionTokens,
        success: true,
        responseTime,
        metadata: {
          targetLanguage,
          contentType,
          tone,
          promptLength: prompt.length,
        }
      });
    }
    
    return generatedContent;
  } catch (error) {
    console.error('Error generating multilingual content:', error);
    // Return a default error response
    return `[Error generating content in ${LANGUAGE_NAMES[targetLanguage]}]`;
  }
};