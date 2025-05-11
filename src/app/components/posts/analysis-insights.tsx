"use client";

import { useState } from "react";
import { ContentAnalysis } from "@/lib/gemini";
import { LightbulbIcon, TrendingUpIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

interface AnalysisInsightsProps {
  analysis: ContentAnalysis;
  className?: string;
}

export function AnalysisInsights({ analysis, className = "" }: AnalysisInsightsProps) {
  const [expanded, setExpanded] = useState(false);

  // Generate audience targeting recommendation
  const getAudienceRecommendation = () => {
    const topicKeywords = {
      youth: ["gaming", "tiktok", "student", "college", "meme", "trend"],
      professional: ["career", "finance", "investment", "technology", "business", "growth"],
      family: ["parenting", "children", "family", "education", "school", "kids"],
      health: ["fitness", "health", "wellness", "nutrition", "exercise", "diet"],
    };

    const toneKeywords = {
      youth: ["casual", "fun", "youthful", "energetic", "playful"],
      professional: ["formal", "professional", "serious", "informative", "analytical"],
      family: ["warm", "friendly", "supportive", "kind", "encouraging"],
      health: ["motivational", "inspirational", "encouraging", "positive"],
    };

    // Check topic matches
    let audienceMatches = {
      youth: 0,
      professional: 0,
      family: 0,
      health: 0,
    };

    // Check topics
    analysis.topics.forEach(topic => {
      const lowerTopic = topic.toLowerCase();
      Object.entries(topicKeywords).forEach(([audience, keywords]) => {
        if (keywords.some(kw => lowerTopic.includes(kw))) {
          audienceMatches[audience as keyof typeof audienceMatches]++;
        }
      });
    });

    // Check tone
    if (analysis.tone) {
      const lowerTone = analysis.tone.toLowerCase();
      Object.entries(toneKeywords).forEach(([audience, keywords]) => {
        if (keywords.some(kw => lowerTone.includes(kw))) {
          audienceMatches[audience as keyof typeof audienceMatches]++;
        }
      });
    }

    // Determine primary audience
    const primaryAudience = Object.entries(audienceMatches)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Get audience-specific recommendations
    switch (primaryAudience) {
      case "youth":
        return {
          audience: "Young Adults (18-24)",
          platforms: ["TikTok", "Instagram", "Snapchat"],
          timing: "Evenings and late night (7PM-11PM)",
          format: "Short-form visual content with trending audio",
          strategy: "Create authentic, trendy content that resonates with Gen Z values and interests. Use casual language and incorporate current memes and trends.",
        };
      case "professional":
        return {
          audience: "Professionals (25-45)",
          platforms: ["LinkedIn", "Twitter", "Facebook"],
          timing: "Early mornings (7AM-9AM) and lunch breaks (12PM-1PM)",
          format: "Informative articles, case studies, and infographics",
          strategy: "Focus on delivering valuable insights and professional growth tips. Use data-backed content and maintain a professional tone while being conversational.",
        };
      case "family":
        return {
          audience: "Parents and Family-Focused (30-50)",
          platforms: ["Facebook", "Pinterest", "Instagram"],
          timing: "Mid-mornings (9AM-11AM) and evenings (6PM-8PM)",
          format: "Helpful guides, tips, and relatable stories",
          strategy: "Share supportive, solution-oriented content that helps families navigate challenges. Use warm, inclusive language and highlight practical advice.",
        };
      case "health":
        return {
          audience: "Health & Wellness Enthusiasts (25-55)",
          platforms: ["Instagram", "YouTube", "Pinterest"],
          timing: "Early mornings (6AM-8AM) and evenings (5PM-7PM)",
          format: "Visual tutorials, transformation stories, and tips",
          strategy: "Create motivational content that inspires action. Balance aspirational content with practical, achievable advice. Use encouraging and positive language.",
        };
      default:
        return {
          audience: "General Audience",
          platforms: ["Instagram", "Facebook", "Twitter"],
          timing: "Midday (11AM-1PM) and evenings (7PM-9PM)",
          format: "Mix of visual and text content",
          strategy: "Create balanced content that appeals to a broad audience. Focus on universal themes and use an approachable, friendly tone.",
        };
    }
  };

  // Generate content improvement recommendations
  const getContentImprovements = () => {
    const improvements = [];

    // Sentiment-based recommendations
    if (analysis.sentiment === "negative") {
      improvements.push({
        title: "Consider a more positive tone",
        description: "Negative content tends to receive less engagement unless it addresses a shared frustration. Consider reframing with a solution-oriented approach.",
      });
    } else if (analysis.sentiment === "mixed") {
      improvements.push({
        title: "Clarify your emotional tone",
        description: "Mixed sentiment can confuse readers about your stance. Consider making your perspective more consistent or clearly separating contrasting viewpoints.",
      });
    }

    // Entities-based recommendations
    const hasPersonEntities = analysis.entities.some(entity => entity.type === "person");
    const hasLocationEntities = analysis.entities.some(entity => entity.type === "location");
    const hasOrganizationEntities = analysis.entities.some(entity => entity.type === "organization");

    if (!hasPersonEntities && !hasLocationEntities && !hasOrganizationEntities) {
      improvements.push({
        title: "Add specific references",
        description: "Including specific people, places, or organizations can make your content more relatable and authoritative.",
      });
    }

    // Topic-based recommendations
    if (analysis.topics.length < 3) {
      improvements.push({
        title: "Expand your topic coverage",
        description: "Adding more relevant topics can help your content reach a wider audience and provide more value.",
      });
    }

    // Add suggestion-based improvements
    analysis.suggestions.forEach(suggestion => {
      // Only add if it's not already in the list
      if (!improvements.some(imp => imp.description.includes(suggestion))) {
        improvements.push({
          title: "Improvement opportunity",
          description: suggestion,
        });
      }
    });

    // Add engagement prediction improvement if it's low or medium
    if (analysis.engagementPrediction === "low" || analysis.engagementPrediction === "medium") {
      improvements.push({
        title: "Boost engagement potential",
        description: analysis.reasonForEngagementPrediction || "Consider adding a clear call-to-action, questions to the audience, or more relatable examples.",
      });
    }

    return improvements.slice(0, 5); // Limit to top 5 improvements
  };

  // Get audience recommendation
  const audienceRecommendation = getAudienceRecommendation();

  // Get content improvements
  const contentImprovements = getContentImprovements();

  // Hashtag recommendations
  const getHashtagRecommendations = () => {
    const hashtags = [];

    // Add hashtags from topics
    analysis.topics.forEach(topic => {
      hashtags.push(`#${topic.toLowerCase().replace(/\s+/g, '')}`);
    });

    // Add hashtags from entities
    analysis.entities
      .filter(entity => entity.type !== "date" && entity.type !== "time")
      .slice(0, 3)
      .forEach(entity => {
        const hashtag = `#${entity.name.toLowerCase().replace(/\s+/g, '')}`;
        if (!hashtags.includes(hashtag)) {
          hashtags.push(hashtag);
        }
      });

    // Add trending hashtag suggestions based on content
    const trendingOptions = [
      "#trending",
      "#viral",
      "#follow",
      "#photooftheday",
      "#instagood",
      "#love",
      "#like",
      "#photography",
      "#fashion",
      "#art",
      "#beautiful",
      "#instagram",
      "#happy",
      "#picoftheday",
      "#style",
      "#nature",
      "#followme",
      "#travel",
      "#fitness",
      "#model",
    ];

    // Add 2-3 trending hashtags
    const trendingCount = 3 - Math.min(2, hashtags.length);
    for (let i = 0; i < trendingCount; i++) {
      const randomIndex = Math.floor(Math.random() * trendingOptions.length);
      const hashtag = trendingOptions[randomIndex];
      if (!hashtags.includes(hashtag)) {
        hashtags.push(hashtag);
      }
      // Remove used hashtag from options
      trendingOptions.splice(randomIndex, 1);
    }

    return hashtags.slice(0, 8); // Limit to 8 hashtags
  };

  const hashtagRecommendations = getHashtagRecommendations();

  return (
    <div className={`w-full bg-card rounded-lg p-4 border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <LightbulbIcon className="w-5 h-5 text-primary" />
          AI Content Insights
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show Less" : "Show More"}
          {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Target Audience Section */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <TrendingUpIcon className="w-4 h-4 mr-1 text-primary" />
          Targeted Audience Strategy
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/20 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Audience</p>
            <p className="text-sm">{audienceRecommendation.audience}</p>
          </div>
          <div className="bg-muted/20 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Best Platforms</p>
            <p className="text-sm">{audienceRecommendation.platforms.join(", ")}</p>
          </div>
          <div className="bg-muted/20 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Optimal Timing</p>
            <p className="text-sm">{audienceRecommendation.timing}</p>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 bg-muted/20 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Content Strategy</p>
            <p className="text-sm">{audienceRecommendation.strategy}</p>
          </div>
        )}
      </div>

      {/* Content Improvement Suggestions */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <LightbulbIcon className="w-4 h-4 mr-1 text-primary" />
          Actionable Improvements
        </h4>
        <div className="space-y-2">
          {contentImprovements.slice(0, expanded ? undefined : 2).map((improvement, index) => (
            <div key={index} className="bg-muted/20 p-3 rounded-md">
              <p className="text-sm font-medium">{improvement.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{improvement.description}</p>
            </div>
          ))}
          {!expanded && contentImprovements.length > 2 && (
            <div className="text-xs text-muted-foreground text-center">
              +{contentImprovements.length - 2} more improvements
            </div>
          )}
        </div>
      </div>

      {/* Hashtag Recommendations */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <ArrowRightIcon className="w-4 h-4 mr-1 text-primary" />
          Recommended Hashtags
        </h4>
        <div className="flex flex-wrap gap-2">
          {hashtagRecommendations.map((hashtag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
            >
              {hashtag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}