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
  InfoIcon,
  Heart as HeartPulse // აქ Heart გამოვიყენებთ HeartPulse-ის მაგივრად
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

  // Define theme colors for consistent styling
  const THEME = {
    // Primary gradients
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",

    // Background levels
    pageBg: "bg-gray-950",
    cardBg: "bg-gray-900/70",
    cardBgHover: "hover:bg-gray-800/80",
    inputBg: "bg-gray-800/60",

    // Text colors
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    textMuted: "text-gray-500",

    // Border colors
    borderColor: "border-gray-800/40",

    // Effects
    glow: "shadow-lg shadow-indigo-950/30",
    hoverTransition: "transition-all duration-200"
  };

  return (
    <div className={`w-full ${THEME.cardBg} rounded-lg p-6 border ${THEME.borderColor} ${THEME.glow} backdrop-blur-sm space-y-4`}>
      <div className="flex justify-between items-center">
        <h3 className={`font-medium text-lg ${THEME.textPrimary} flex items-center`}>
          <span className={`w-8 h-8 ${THEME.secondaryGradient} rounded-full flex items-center justify-center mr-2`}>
            <HeartPulse className="h-4 w-4 text-white" />
          </span>
          AI Health Recommendations
        </h3>
        <span className={`text-xs ${THEME.textSecondary} bg-gray-800/60 px-2 py-1 rounded-md`}>Powered by Gemini AI</span>
      </div>

      {error && (
        <div className="p-3 bg-rose-900/20 text-rose-400 border border-rose-800/40 rounded-md text-sm">
          {error}
        </div>
      )}

      {!recommendations && !isLoading && (
        <div className="space-y-4">
          <p className={`${THEME.textSecondary}`}>
            Get personalized health and wellness recommendations based on your profile and goals.
          </p>

          <div className={`${THEME.inputBg} p-4 rounded-md text-sm flex items-start gap-3 border ${THEME.borderColor}`}>
            <InfoIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className={`${THEME.textSecondary}`}>
              This feature uses AI to generate recommendations. Results are for informational purposes only and not a substitute for professional medical advice.
            </p>
          </div>

          <button
            onClick={handleGenerateRecommendations}
            className={`w-full py-3 px-4 ${THEME.primaryGradient} text-white rounded-md hover:opacity-90 ${THEME.hoverTransition} ${THEME.glow} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
          >
            Generate Recommendations
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className={`p-4 rounded-full ${THEME.primaryGradient} ${THEME.glow} mb-4`}>
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className={`${THEME.textSecondary}`}>Generating your personalized recommendations...</p>
          <p className={`text-xs ${THEME.textMuted} mt-2`}>This may take a moment</p>
        </div>
      )}

      {recommendations && (
        <div className="space-y-6">
          {/* Diet Plan Section */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.glow}`}>
            <div
              className={`flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 cursor-pointer ${THEME.hoverTransition} hover:bg-gray-800/90`}
              onClick={() => toggleSection("diet")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <Apple className="w-5 h-5 text-green-400" />
                </div>
                <h4 className={`font-medium ${THEME.textPrimary}`}>Diet Plan</h4>
              </div>
              {expandedSections.diet ? (
                <ChevronUp className={`w-5 h-5 ${THEME.textSecondary}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${THEME.textSecondary}`} />
              )}
            </div>

            {expandedSections.diet && (
              <div className={`p-5 space-y-4 ${THEME.cardBg} backdrop-blur-sm animate-fadeIn`}>
                <p className={THEME.textSecondary}>{recommendations.dietPlan.overview}</p>

                <div>
                  <h5 className={`font-medium mb-3 ${THEME.textPrimary}`}>Recommendations</h5>
                  <ul className="space-y-3">
                    {recommendations.dietPlan.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="p-1 bg-green-500/20 rounded-full mt-0.5">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        </div>
                        <span className={THEME.textSecondary}>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg ${THEME.inputBg} border ${THEME.borderColor}`}>
                    <h5 className={`font-medium mb-3 ${THEME.textPrimary} flex items-center`}>
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-2">
                        <span className="text-green-400 text-xs">🍽️</span>
                      </div>
                      Meal Ideas
                    </h5>
                    <ul className="space-y-2">
                      {recommendations.dietPlan.mealIdeas.map((meal, index) => (
                        <li key={index} className={`text-sm ${THEME.textSecondary} flex items-start gap-2`}>
                          <span className="text-green-400">•</span> {meal}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`p-4 rounded-lg ${THEME.inputBg} border ${THEME.borderColor}`}>
                    <h5 className={`font-medium mb-3 ${THEME.textPrimary} flex items-center`}>
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-2">
                        <span className="text-green-400 text-xs">🥕</span>
                      </div>
                      Snack Ideas
                    </h5>
                    <ul className="space-y-2">
                      {recommendations.dietPlan.snackIdeas.map((snack, index) => (
                        <li key={index} className={`text-sm ${THEME.textSecondary} flex items-start gap-2`}>
                          <span className="text-green-400">•</span> {snack}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exercise Routine Section */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.glow}`}>
            <div
              className={`flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 cursor-pointer ${THEME.hoverTransition} hover:bg-gray-800/90`}
              onClick={() => toggleSection("exercise")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <Dumbbell className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className={`font-medium ${THEME.textPrimary}`}>Exercise Routine</h4>
              </div>
              {expandedSections.exercise ? (
                <ChevronUp className={`w-5 h-5 ${THEME.textSecondary}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${THEME.textSecondary}`} />
              )}
            </div>

            {expandedSections.exercise && (
              <div className={`p-5 space-y-4 ${THEME.cardBg} backdrop-blur-sm animate-fadeIn`}>
                <p className={THEME.textSecondary}>{recommendations.exerciseRoutine.overview}</p>

                <div>
                  <h5 className={`font-medium mb-3 ${THEME.textPrimary}`}>Weekly Plan</h5>
                  <div className="space-y-3">
                    {recommendations.exerciseRoutine.weeklyPlan.map((day, index) => (
                      <div key={index} className={`border ${THEME.borderColor} p-4 rounded-lg ${THEME.inputBg}`}>
                        <div className="flex items-center mb-2">
                          <div className="p-1.5 bg-blue-500/20 rounded-full mr-2">
                            <Dumbbell className="w-4 h-4 text-blue-400" />
                          </div>
                          <h6 className={`font-medium ${THEME.textPrimary}`}>{day.day}</h6>
                        </div>
                        <p className={`text-sm ${THEME.textSecondary} mb-3`}>{day.focus}</p>
                        <ul className="mt-2 space-y-2">
                          {day.exercises.map((exercise: { name: string; details?: string }, i: number) => (
                            <li key={i} className={`text-sm flex items-start gap-2 ${THEME.textSecondary}`}>
                              <span className="text-blue-400">•</span>
                              <span>
                                <span className="font-medium text-indigo-400">{exercise.name}</span>
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
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.glow}`}>
            <div
              className={`flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 cursor-pointer ${THEME.hoverTransition} hover:bg-gray-800/90`}
              onClick={() => toggleSection("habits")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <Coffee className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className={`font-medium ${THEME.textPrimary}`}>Healthy Habits</h4>
              </div>
              {expandedSections.habits ? (
                <ChevronUp className={`w-5 h-5 ${THEME.textSecondary}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${THEME.textSecondary}`} />
              )}
            </div>

            {expandedSections.habits && (
              <div className={`p-5 ${THEME.cardBg} backdrop-blur-sm animate-fadeIn`}>
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendations.habits.map((habit, index) => (
                    <div key={index} className={`border ${THEME.borderColor} p-4 rounded-lg ${THEME.inputBg} hover:translate-y-[-2px] ${THEME.hoverTransition}`}>
                      <div className="flex items-center mb-2">
                        <div className="p-1.5 bg-amber-500/20 rounded-full mr-2">
                          <Coffee className="w-4 h-4 text-amber-400" />
                        </div>
                        <h5 className={`font-medium ${THEME.textPrimary}`}>{habit.title}</h5>
                      </div>
                      <p className={`text-sm mt-1 ${THEME.textSecondary}`}>{habit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle Section */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.glow}`}>
            <div
              className={`flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/90 to-gray-800/90 cursor-pointer ${THEME.hoverTransition} hover:bg-gray-800/90`}
              onClick={() => toggleSection("lifestyle")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                  <Sun className="w-5 h-5 text-yellow-400" />
                </div>
                <h4 className={`font-medium ${THEME.textPrimary}`}>Lifestyle Adjustments</h4>
              </div>
              {expandedSections.lifestyle ? (
                <ChevronUp className={`w-5 h-5 ${THEME.textSecondary}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${THEME.textSecondary}`} />
              )}
            </div>

            {expandedSections.lifestyle && (
              <div className={`p-5 space-y-5 ${THEME.cardBg} backdrop-blur-sm animate-fadeIn`}>
                {recommendations.lifestyle.map((area, index) => (
                  <div key={index} className={`p-4 rounded-lg ${THEME.inputBg} border ${THEME.borderColor}`}>
                    <h5 className={`font-medium mb-3 ${THEME.textPrimary} flex items-center`}>
                      <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center mr-2">
                        <Sun className="w-3 h-3 text-yellow-400" />
                      </div>
                      {area.area}
                    </h5>
                    <ul className="space-y-2">
                      {area.recommendations.map((recommendation, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-1">•</span>
                          <span className={THEME.textSecondary}>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`p-4 ${THEME.inputBg} rounded-lg text-sm border ${THEME.borderColor}`}>
            <p className={`font-medium mb-2 ${THEME.textPrimary}`}>Disclaimer</p>
            <p className={THEME.textSecondary}>{recommendations.disclaimer}</p>
          </div>

          <div className="flex justify-between items-center">
            <span className={`text-xs ${THEME.textSecondary} bg-gray-800/50 px-3 py-1.5 rounded-md`}>
              Token usage: <span className="text-indigo-400">{tokenUsage}</span> tokens
            </span>
            <button
              onClick={handleGenerateRecommendations}
              className={`py-1.5 px-4 ${THEME.secondaryGradient} text-white rounded-md hover:opacity-90 ${THEME.hoverTransition} text-sm`}
            >
              Regenerate
            </button>
          </div>

          {/* Add animation styles */}
          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}