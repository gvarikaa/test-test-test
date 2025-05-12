/**
 * Reality Check - advanced content truth analysis system
 * Analyzes social media posts to determine factual accuracy and truthfulness
 */

// Reality verification levels
export enum RealityCheckLevel {
  VERIFIED = "verified",              // Fully verified content, backed by credible sources
  LIKELY_TRUE = "likely_true",        // Probably true but lacks complete verification
  MIXED = "mixed",                    // Contains both factual and questionable elements
  MISLEADING = "misleading",          // Factual but presented in a misleading way
  UNVERIFIED = "unverified",          // Unable to verify claims made
  FALSE = "false",                    // Contains demonstrably false information
  SATIRE = "satire",                  // Content is intentional satire/parody
  MANIPULATED = "manipulated",        // Media that has been altered or manipulated
  OPINION_ONLY = "opinion_only",      // Just personal opinion without factual claims
  NONSENSICAL = "nonsensical",        // Gibberish or meaningless text
  SOCIAL_ONLY = "social_only",        // Just greetings or social interaction without claims
  ENTERTAINMENT_ONLY = "entertainment_only" // Purely entertainment without factual claims
}

// For detailed overlay visualization
export interface OverlaySegment {
  text: string;                  // The specific text segment
  startOffset: number;           // Where this segment starts in the full text
  endOffset: number;             // Where this segment ends in the full text
  truthLevel: RealityCheckLevel; // Truth assessment of this segment
  confidenceScore: number;       // AI confidence in assessment (0-1)
  explanation: string;           // Explanation of why this was assessed this way
  sources?: string[];            // Optional supporting sources
}

// For image/video content analysis
export interface MediaAnalysis {
  isTampered: boolean;           // Whether the media shows signs of tampering
  deepfakeProbability: number;   // If applicable, likelihood it's a deepfake (0-1)
  manipulationDetails?: string;  // Details about what was altered if manipulated
  originalSource?: string;       // If known, original source of the media
  creationDate?: string;         // If known from metadata, when media was created
  generatedByAI: boolean;        // Whether AI likely generated this media
  confidenceScore: number;       // Overall confidence in media analysis (0-1)
}

// Complete analysis result
export interface RealityCheckResult {
  overallRating: RealityCheckLevel;  // Overall assessment of content truthfulness
  truthScore: number | null;         // 0-100 score of truthfulness, or null if not applicable
  contentType: string;               // "text", "image", "video", "mixed"
  toneAssessment: string;            // Analysis of emotional tone and intent
  needsFactCheck: boolean;           // Whether this content contains factual claims that can be verified
  analysisMessage: string;           // Message explaining why analysis was or wasn't performed
  segments?: OverlaySegment[];       // Detailed segment-by-segment analysis
  mediaAnalysis?: MediaAnalysis;     // Analysis of images/videos if present
  factualClaims: {                   // Specific factual claims identified
    claim: string;
    assessment: RealityCheckLevel;
    explanation: string;
  }[];
  summary: string;                   // Brief summary of the analysis
  recommendedAction?: string;        // Recommended user action based on assessment
  processingTime: number;            // How long the analysis took (ms)
  dataVersion: string;               // Version of the analysis model used
}

/**
 * Gemini-powered implementation of reality check
 * Uses the Gemini API to analyze content truthfulness
 */
import { GeminiModel, SafetyLevel, getModelInstance } from './gemini';

export async function analyzeContent(
  content: string,
  mediaUrls?: string[]
): Promise<RealityCheckResult> {
  const startTime = Date.now();

  try {
    // Get a Gemini model instance with appropriate settings
    const model = getModelInstance(
      mediaUrls && mediaUrls.length > 0 ? GeminiModel.VISION_1_5 : GeminiModel.PRO_1_5,
      SafetyLevel.STANDARD,
      {
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxOutputTokens: 2048, // Larger output for comprehensive analysis
      }
    );

    // Construct our prompt for fact-checking
    let prompt = `
      Analyze the following social media post content for factual accuracy and truthfulness.

      Content: """
      ${content}
      """

      ${mediaUrls && mediaUrls.length > 0 ? "This post also contains media which should be considered in the analysis." : ""}

      IMPORTANT FIRST STEP - Evaluate whether this content needs fact-checking:
      - If the post is just personal opinion without factual claims, label it as "opinion_only"
      - If the post is nonsensical, gibberish, or just meaningless text, label it as "nonsensical"
      - If the post is just a greeting or simple social interaction without claims, label it as "social_only"
      - If the post is purely entertainment or humor without factual claims, label it as "entertainment_only"

      Please provide a comprehensive fact-check analysis including:
      1. Overall truthfulness rating (verified, likely_true, mixed, misleading, unverified, false, satire, manipulated, opinion_only, nonsensical, social_only, entertainment_only)
      2. Truth score (0-100 percentage, or null if post doesn't contain factual claims)
      3. Content type classification (text, image, video, mixed)
      4. Tone assessment
      5. Whether this content contains factual claims that can be verified (true/false)
      6. Analysis message explaining why analysis was or wasn't performed in detail
      7. Detailed segment-by-segment analysis breaking down each claim (if applicable)
      8. Media analysis if applicable
      9. List of factual claims with assessment of each (if applicable)
      10. Summary of analysis

      Format your response as a structured JSON object matching this TypeScript interface:

      interface RealityCheckResult {
        overallRating: "verified" | "likely_true" | "mixed" | "misleading" | "unverified" | "false" | "satire" | "manipulated" | "opinion_only" | "nonsensical" | "social_only" | "entertainment_only";
        truthScore: number | null; // 0-100 or null if not applicable
        contentType: "text" | "image" | "video" | "mixed";
        toneAssessment: string;
        needsFactCheck: boolean; // whether this content contains factual claims that can be verified
        analysisMessage: string; // message explaining why analysis was or wasn't performed
        segments?: {
          text: string;
          startOffset: number;
          endOffset: number;
          truthLevel: "verified" | "likely_true" | "mixed" | "misleading" | "unverified" | "false" | "satire" | "manipulated" | "opinion_only" | "nonsensical" | "social_only" | "entertainment_only";
          confidenceScore: number; // 0-1
          explanation: string;
          sources?: string[];
        }[];
        mediaAnalysis?: {
          isTampered: boolean;
          deepfakeProbability: number; // 0-1
          manipulationDetails?: string;
          originalSource?: string;
          creationDate?: string;
          generatedByAI: boolean;
          confidenceScore: number; // 0-1
        };
        factualClaims: {
          claim: string;
          assessment: "verified" | "likely_true" | "mixed" | "misleading" | "unverified" | "false" | "satire" | "manipulated" | "opinion_only";
          explanation: string;
        }[];
        summary: string;
        recommendedAction?: string;
        processingTime: number;
        dataVersion: string;
      }

      Pay special attention to:
      - First determining if the content actually needs fact-checking (does it contain factual claims?)
      - For content without factual claims, provide a clear explanation in "analysisMessage"
      - For content with factual claims, cite sources for fact checking when possible
      - Identifying potential misinformation or misleading content
      - Flagging content that needs further verification
      - Determining if media has been manipulated
      - Breaking down complex claims into components for analysis
    `;

    // If we have media, we need to analyze it as well
    let parts = [prompt];

    if (mediaUrls && mediaUrls.length > 0) {
      try {
        // For this simplified example, we'll just use the first image
        // In a full implementation, you'd analyze all images
        const mediaUrl = mediaUrls[0];

        // Check if the URL is already base64 encoded
        if (mediaUrl.startsWith('data:')) {
          // Extract just the base64 part
          const base64Data = mediaUrl.split(',')[1];
          const mimeType = mediaUrl.split(';')[0].split(':')[1];

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          });
        } else {
          // For external URLs, we need to fetch the image
          console.log("Using external image URL:", mediaUrl);

          // Simply include the URL in the prompt for now
          // In a full implementation, you would fetch and convert to base64
          prompt += `\n\nImage URL: ${mediaUrl}\n`;
        }
      } catch (error) {
        console.error("Error processing media for Gemini:", error);
        // Continue without the media if there's an error
      }
    }

    // Generate content with Gemini
    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from Gemini');
    }

    // Parse the JSON response
    const geminiAnalysis = JSON.parse(jsonMatch[0]);

    // Create the complete analysis result
    const analysis: RealityCheckResult = {
      ...geminiAnalysis,
      processingTime: Date.now() - startTime,
      dataVersion: "1.0.1-gemini"
    };

    return analysis;
  } catch (error) {
    console.error('Error analyzing content with Gemini:', error);

    // Fallback to a basic analysis in case of error
    // Create segments from the content
    const segments = breakContentIntoSegments(content, RealityCheckLevel.UNVERIFIED);

    // Analyze media if provided
    const mediaAnalysis = mediaUrls && mediaUrls.length > 0
      ? analyzeMedia(mediaUrls[0], RealityCheckLevel.UNVERIFIED)
      : undefined;

    // Generate factual claims
    const factualClaims = generateFactualClaims(content, RealityCheckLevel.UNVERIFIED);

    // Return a fallback analysis
    return {
      overallRating: RealityCheckLevel.UNVERIFIED,
      truthScore: 50,
      contentType: mediaUrls && mediaUrls.length > 0 ? "mixed" : "text",
      toneAssessment: "Unable to analyze tone with AI. Falling back to basic analysis.",
      needsFactCheck: true, // Assume it needs fact checking since we couldn't determine otherwise
      analysisMessage: "Unable to determine if content needs fact-checking due to Gemini API error. Proceeding with fallback analysis.",
      segments,
      mediaAnalysis,
      factualClaims,
      summary: `Unable to analyze with Gemini API. Error: ${error.message}. Falling back to basic analysis.`,
      processingTime: Date.now() - startTime,
      dataVersion: "1.0.1-gemini-fallback"
    };
  }
}

/**
 * Breaks content into segments and analyzes each segment
 */
function breakContentIntoSegments(
  content: string, 
  defaultLevel: RealityCheckLevel
): OverlaySegment[] {
  // Simple algorithm that breaks the content at sentence boundaries
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  
  let currentOffset = 0;
  return sentences.map(sentence => {
    // For each sentence, assign a random truthfulness level
    // In a real implementation, this would be a sophisticated analysis
    const levels = Object.values(RealityCheckLevel);
    const truthLevel = Math.random() > 0.7 
      ? levels[Math.floor(Math.random() * levels.length)] as RealityCheckLevel
      : defaultLevel;
    
    const startOffset = content.indexOf(sentence, currentOffset);
    const endOffset = startOffset + sentence.length;
    currentOffset = endOffset;
    
    return {
      text: sentence.trim(),
      startOffset,
      endOffset,
      truthLevel,
      confidenceScore: 0.5 + Math.random() * 0.5, // 0.5-1.0
      explanation: generateExplanation(sentence, truthLevel)
    };
  });
}

/**
 * Analyzes images or videos for authenticity
 */
function analyzeMedia(
  mediaUrl: string, 
  contentRating: RealityCheckLevel
): MediaAnalysis {
  // In a real implementation, this would use image recognition, metadata analysis,
  // and deepfake detection techniques
  
  // For the demo, generate a result that's somewhat aligned with the content rating
  const isTruthful = [
    RealityCheckLevel.VERIFIED, 
    RealityCheckLevel.LIKELY_TRUE
  ].includes(contentRating);
  
  return {
    isTampered: !isTruthful && Math.random() > 0.5,
    deepfakeProbability: isTruthful ? Math.random() * 0.2 : Math.random() * 0.8,
    manipulationDetails: !isTruthful ? "Potential image filtering or manipulation detected" : undefined,
    generatedByAI: Math.random() > 0.7,
    confidenceScore: 0.6 + Math.random() * 0.3
  };
}

/**
 * Analyzes the emotional tone of the content
 */
function analyzeTone(content: string): string {
  // In a real implementation, this would use sentiment analysis
  
  // For the demo, use some simple patterns
  const content_lower = content.toLowerCase();
  
  if (content_lower.includes("!") && (content_lower.includes("amazing") || content_lower.includes("incredible"))) {
    return "Overly enthusiastic, potentially exaggerated";
  } else if (content_lower.includes("urgent") || content_lower.includes("warning")) {
    return "Alarmist";
  } else if (content_lower.match(/\?{2,}/)) {
    return "Questioning or doubtful";
  } else if (content_lower.includes("research") || content_lower.includes("study")) {
    return "Informative";
  } else if (content_lower.includes("lol") || content_lower.includes("haha")) {
    return "Humorous";
  } else {
    return "Neutral";
  }
}

/**
 * Generates explanations for why content was assessed a certain way
 */
function generateExplanation(text: string, level: RealityCheckLevel): string {
  // In a real implementation, this would provide specific reasoning
  
  // For the demo, use templates
  const explanations: {[key in RealityCheckLevel]: string[]} = {
    [RealityCheckLevel.VERIFIED]: [
      "This statement is backed by multiple reliable sources.",
      "This is a verified fact.",
      "This is accurate according to official records."
    ],
    [RealityCheckLevel.LIKELY_TRUE]: [
      "This appears accurate but lacks full verification.",
      "This is supported by preliminary evidence.",
      "This is consistent with expert consensus."
    ],
    [RealityCheckLevel.MIXED]: [
      "This contains both accurate and questionable elements.",
      "This statement mixes facts with speculation.",
      "This has some truth but includes unverified claims."
    ],
    [RealityCheckLevel.MISLEADING]: [
      "This uses facts in a misleading context.",
      "This omits important context that would change interpretation.",
      "This statement is technically correct but misleadingly presented."
    ],
    [RealityCheckLevel.UNVERIFIED]: [
      "This claim lacks sufficient evidence to verify.",
      "This statement cannot be confirmed with available information.",
      "This requires additional sources to verify."
    ],
    [RealityCheckLevel.FALSE]: [
      "This statement contradicts established facts.",
      "This contains verifiably false information.",
      "This claim has been debunked by reliable sources."
    ],
    [RealityCheckLevel.SATIRE]: [
      "This appears to be satire or parody.",
      "This is likely intended as humor, not factual content.",
      "This statement uses exaggeration for comedic effect."
    ],
    [RealityCheckLevel.MANIPULATED]: [
      "This media shows signs of digital manipulation.",
      "This content has been edited to alter its meaning.",
      "This appears to have been artificially generated or modified."
    ]
  };
  
  const options = explanations[level] || explanations[RealityCheckLevel.UNVERIFIED];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Extracts and analyzes specific factual claims from content
 */
function generateFactualClaims(
  content: string, 
  overallRating: RealityCheckLevel
): { claim: string; assessment: RealityCheckLevel; explanation: string }[] {
  // In a real implementation, this would use NLP to extract claims
  // For the demo, generate 1-3 claims with varying truthfulness
  
  const numberOfClaims = 1 + Math.floor(Math.random() * 3);
  const claims = [];
  
  // Split content into sentences
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  
  // Select random sentences to treat as claims
  for (let i = 0; i < Math.min(numberOfClaims, sentences.length); i++) {
    // Select a random sentence
    const randomIndex = Math.floor(Math.random() * sentences.length);
    const sentence = sentences[randomIndex].trim();
    
    // Assign a level that's usually similar to the overall rating
    const useOverallRating = Math.random() > 0.3;
    const levels = Object.values(RealityCheckLevel);
    const assessment = useOverallRating
      ? overallRating
      : levels[Math.floor(Math.random() * levels.length)] as RealityCheckLevel;
    
    claims.push({
      claim: sentence,
      assessment,
      explanation: generateExplanation(sentence, assessment)
    });
    
    // Remove this sentence to avoid duplicates
    sentences.splice(randomIndex, 1);
    if (sentences.length === 0) break;
  }
  
  return claims;
}

/**
 * Generates a summary of the analysis
 */
function generateSummary(
  content: string, 
  overallRating: RealityCheckLevel, 
  truthScore: number
): string {
  // In a real implementation, this would synthesize the analysis results
  
  // For the demo, use templates based on the overall rating
  const summaries: {[key in RealityCheckLevel]: string[]} = {
    [RealityCheckLevel.VERIFIED]: [
      `This content is verified with ${truthScore}% accuracy.`,
      `This content can be considered factual with high confidence (${truthScore}%).`,
      `This post contains verified information with ${truthScore}% accuracy.`
    ],
    [RealityCheckLevel.LIKELY_TRUE]: [
      `This content is likely accurate (${truthScore}%), but some details warrant verification.`,
      `This post appears mostly truthful (${truthScore}% accuracy), with minor uncertainties.`,
      `This information is probably correct (${truthScore}%), though not fully verified.`
    ],
    [RealityCheckLevel.MIXED]: [
      `This content contains a mix of factual and questionable claims (${truthScore}% overall accuracy).`,
      `This post mixes verified facts with unverified claims, averaging ${truthScore}% accuracy.`,
      `This information is partially accurate (${truthScore}%), but includes questionable elements.`
    ],
    [RealityCheckLevel.MISLEADING]: [
      `This content uses facts in a misleading way, with ${truthScore}% overall accuracy.`,
      `This post presents information in a potentially misleading context (${truthScore}% accuracy).`,
      `This content omits important context, resulting in a misleading impression (${truthScore}% accuracy).`
    ],
    [RealityCheckLevel.UNVERIFIED]: [
      `This content contains claims that cannot be verified (${truthScore}% confidence).`,
      `This post makes assertions that lack supporting evidence (${truthScore}% verifiable).`,
      `This information requires additional sources to verify (${truthScore}% confidence).`
    ],
    [RealityCheckLevel.FALSE]: [
      `This content contains false information (${truthScore}% accuracy).`,
      `This post makes claims that contradict verified facts (${truthScore}% accuracy).`,
      `This information is largely incorrect (${truthScore}% accuracy).`
    ],
    [RealityCheckLevel.SATIRE]: [
      `This content appears to be satire or parody, not intended as factual (${truthScore}% factual content).`,
      `This post likely uses exaggeration for comedic effect (${truthScore}% factual content).`,
      `This information should be interpreted as humor, not fact (${truthScore}% factual content).`
    ],
    [RealityCheckLevel.MANIPULATED]: [
      `This content shows signs of manipulation (${truthScore}% authenticity).`,
      `This post contains media that appears to have been altered (${truthScore}% authentic).`,
      `This information includes manipulated elements (${truthScore}% authentic content).`
    ]
  };
  
  const options = summaries[overallRating] || summaries[RealityCheckLevel.UNVERIFIED];
  return options[Math.floor(Math.random() * options.length)];
}