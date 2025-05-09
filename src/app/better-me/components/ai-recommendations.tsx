"use client";

import { useState } from "react";
import { HealthRecommendations } from "@/lib/gemini";
import { api } from "@/lib/trpc/api";
import { 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Apple, 
  Dumbbell, 
  Coffee, 
  Sun,
  Check,
  InfoIcon
} from "lucide-react";

interface AIRecommendationsProps {
  healthProfileId: string;
  goals: string[];
}

export function AIRecommendations({ healthProfileId, goals }: AIRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<HealthRecommendations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    diet: boolean;
    exercise: boolean;
    habits: boolean;
    lifestyle: boolean;
  }>({ diet: true, exercise: false, habits: false, lifestyle: false });
  const [tokenUsage, setTokenUsage] = useState(0);

  // tRPC mutation to generate recommendations
  const { mutate: generateRecommendations } = api.ai.generateHealthRecommendations.useMutation({
    onSuccess: (data) => {
      setRecommendations(data.recommendations);
      setTokenUsage(data.tokenUsage);
      setIsLoading(false);
    },
    onError: (err) => {
      setError(err.message || "Failed to generate recommendations");
      setIsLoading(false);
    },
  });

  const handleGenerateRecommendations = () => {
    setIsLoading(true);
    setError(null);
    generateRecommendations({ healthProfileId, goals });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-full bg-background rounded-lg p-4 border space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">AI Health Recommendations</h3>
        <span className="text-xs text-muted-foreground">Powered by Gemini AI</span>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {!recommendations && !isLoading && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Get personalized health and wellness recommendations based on your profile and goals.
          </p>
          
          <div className="bg-muted/20 p-3 rounded-md text-sm flex items-start gap-2">
            <InfoIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p>
              This feature uses AI to generate recommendations. Results are for informational purposes only and not a substitute for professional medical advice.
            </p>
          </div>

          <button
            onClick={handleGenerateRecommendations}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Generate Recommendations
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating your personalized recommendations...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
        </div>
      )}

      {recommendations && (
        <div className="space-y-6">
          {/* Diet Plan Section */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-4 bg-muted/10 cursor-pointer"
              onClick={() => toggleSection("diet")}
            >
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-green-500" />
                <h4 className="font-medium">Diet Plan</h4>
              </div>
              {expandedSections.diet ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            {expandedSections.diet && (
              <div className="p-4 space-y-4">
                <p>{recommendations.dietPlan.overview}</p>
                
                <div>
                  <h5 className="font-medium mb-2">Recommendations</h5>
                  <ul className="space-y-2">
                    {recommendations.dietPlan.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Meal Ideas</h5>
                    <ul className="space-y-1">
                      {recommendations.dietPlan.mealIdeas.map((meal, index) => (
                        <li key={index} className="text-sm">• {meal}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Snack Ideas</h5>
                    <ul className="space-y-1">
                      {recommendations.dietPlan.snackIdeas.map((snack, index) => (
                        <li key={index} className="text-sm">• {snack}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exercise Routine Section */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-4 bg-muted/10 cursor-pointer"
              onClick={() => toggleSection("exercise")}
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium">Exercise Routine</h4>
              </div>
              {expandedSections.exercise ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            {expandedSections.exercise && (
              <div className="p-4 space-y-4">
                <p>{recommendations.exerciseRoutine.overview}</p>
                
                <div>
                  <h5 className="font-medium mb-2">Weekly Plan</h5>
                  <div className="space-y-3">
                    {recommendations.exerciseRoutine.weeklyPlan.map((day, index) => (
                      <div key={index} className="border p-3 rounded-md">
                        <h6 className="font-medium">{day.day}</h6>
                        <p className="text-sm">{day.focus}</p>
                        <ul className="mt-2 space-y-1">
                          {day.exercises.map((exercise: { name: string; details?: string }, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-1">
                              <span>•</span>
                              <span>
                                <span className="font-medium">{exercise.name}</span>
                                {exercise.details && `: ${exercise.details}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Habits Section */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-4 bg-muted/10 cursor-pointer"
              onClick={() => toggleSection("habits")}
            >
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                <h4 className="font-medium">Healthy Habits</h4>
              </div>
              {expandedSections.habits ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            {expandedSections.habits && (
              <div className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendations.habits.map((habit, index) => (
                    <div key={index} className="border p-3 rounded-md">
                      <h5 className="font-medium">{habit.title}</h5>
                      <p className="text-sm mt-1">{habit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle Section */}
          <div className="border rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-4 bg-muted/10 cursor-pointer"
              onClick={() => toggleSection("lifestyle")}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                <h4 className="font-medium">Lifestyle Adjustments</h4>
              </div>
              {expandedSections.lifestyle ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            {expandedSections.lifestyle && (
              <div className="p-4 space-y-4">
                {recommendations.lifestyle.map((area, index) => (
                  <div key={index}>
                    <h5 className="font-medium mb-2">{area.area}</h5>
                    <ul className="space-y-2">
                      {area.recommendations.map((recommendation, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/10 rounded-md text-sm">
            <p className="font-medium mb-1">Disclaimer</p>
            <p className="text-muted-foreground">{recommendations.disclaimer}</p>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{`Token usage: ${tokenUsage} tokens`}</span>
            <button
              onClick={handleGenerateRecommendations}
              className="py-1 px-3 bg-muted hover:bg-muted/80 rounded-md"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}