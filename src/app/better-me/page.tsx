"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/trpc/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Heart, // შევცვალე HeartPulse-ი Heart-ით, რადგან lucide-react-ში HeartPulse არაა
  Utensils,
  Dumbbell,
  LineChart,
  MessageCircle,
  Plus,
  Info,
  ArrowRight,
  Settings
} from "lucide-react";

// ამასთან, ჩვენი კოდისთვის, Heart-ს გადავარქმევ HeartPulse-ად
const HeartPulse = Heart;
import { AIRecommendations } from "./components/ai-recommendations";

// Loading component
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

const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className={`animate-pulse h-20 w-20 rounded-full ${THEME.primaryGradient} bg-opacity-20 flex items-center justify-center ${THEME.glow}`}>
      <HeartPulse className="text-white h-10 w-10 animate-pulse" />
    </div>
    <p className={`mt-4 ${THEME.textSecondary}`}>ინფორმაციის ჩატვირთვა...</p>
  </div>
);

// No profile state component
const NoHealthProfile = () => (
  <div className={`flex flex-col items-center justify-center py-16 px-4 border ${THEME.borderColor} rounded-lg ${THEME.cardBg} backdrop-blur-sm text-center ${THEME.glow}`}>
    <div className={`${THEME.primaryGradient} p-5 rounded-full ${THEME.glow} mb-6`}>
      <HeartPulse className="h-14 w-14 text-white" />
    </div>
    <h2 className={`text-2xl font-medium mb-2 ${THEME.textPrimary}`}>ჯერ არ გაქვთ ჯანმრთელობის პროფილი</h2>
    <p className={`${THEME.textSecondary} mb-8 max-w-md`}>
      შექმენით თქვენი ჯანმრთელობის პროფილი პერსონალიზებული გეგმების, რჩევების და პროგრესის თვალყურის დევნებისთვის.
    </p>
    <Link
      href="/better-me/create-profile"
      className={`px-6 py-3 ${THEME.primaryGradient} text-white rounded-md hover:opacity-90 ${THEME.hoverTransition} flex items-center ${THEME.glow}`}
    >
      <Plus className="mr-2 h-5 w-5" />
      პროფილის შექმნა
    </Link>
  </div>
);

// Feature card component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  disabled?: boolean;
}

const FeatureCard = ({ title, description, icon, href, disabled = false }: FeatureCardProps) => (
  <Link
    href={disabled ? "#" : href}
    className={`group block p-6 border ${THEME.borderColor} rounded-lg ${THEME.hoverTransition} ${THEME.glow} backdrop-blur-sm ${
      disabled
        ? "opacity-50 cursor-not-allowed bg-gray-900/30"
        : `${THEME.cardBg} hover:translate-y-[-2px] hover:${THEME.glow}`
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="flex gap-4 items-start">
        <div className={`p-3 ${THEME.primaryGradient} rounded-full text-white ${THEME.hoverTransition} group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-medium mb-1 ${THEME.textPrimary} group-hover:text-indigo-300 ${THEME.hoverTransition}`}>{title}</h3>
          <p className={`text-sm ${THEME.textSecondary}`}>{description}</p>
        </div>
      </div>
      {!disabled && <ChevronRight className={`h-5 w-5 ${THEME.textSecondary} group-hover:text-indigo-400 group-hover:translate-x-1 ${THEME.hoverTransition}`} />}
      {disabled && <Info className={`h-5 w-5 ${THEME.textSecondary}`} title="მალე ხელმისაწვდომი იქნება" />}
    </div>
  </Link>
);

export default function BetterMePage() {
  const { data: session, status } = useSession();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  // Fetch health profile
  const {
    data: healthProfile,
    isLoading: profileLoading,
    error
  } = api.health.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
    retry: false
  });

  // Fetch token usage
  const { data: tokenInfo } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: status === "authenticated"
  });
  
  // Set default goals if none exist
  useEffect(() => {
    if (healthProfile?.goals) {
      try {
        const parsedGoals = JSON.parse(healthProfile.goals);
        if (Array.isArray(parsedGoals)) {
          setSelectedGoals(parsedGoals);
        }
      } catch (err) {
        console.error("Failed to parse goals:", err);
        setSelectedGoals(["ზოგადი ჯანმრთელობის გაუმჯობესება"]);
      }
    } else {
      setSelectedGoals(["ზოგადი ჯანმრთელობის გაუმჯობესება"]);
    }
  }, [healthProfile]);

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/signin?callbackUrl=/better-me");
  }
  
  // Show loading state while checking authentication or loading profile
  if (status === "loading" || (status === "authenticated" && profileLoading)) {
    return <LoadingState />;
  }

  // Show profile creation prompt if no profile exists
  if (!healthProfile) {
    return <NoHealthProfile />;
  }

  return (
    <div className={`mx-auto px-4 sm:px-6 py-8 ${THEME.textPrimary} max-w-7xl`}>
      {/* Add global styles to help with animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .backdrop-blur-sm {
          backdrop-filter: blur(8px);
        }
        .backdrop-saturate-150 {
          backdrop-filter: saturate(150%);
        }
      `}</style>
      {/* Header */}
      <header className={`w-full mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between ${THEME.glow}`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl ${THEME.primaryGradient} ${THEME.glow} hidden sm:block`}>
            <HeartPulse className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 text-transparent bg-clip-text mb-1">Better Me</h1>
            <p className={`${THEME.textSecondary}`}>თქვენი პერსონალური ჯანმრთელობისა და კეთილდღეობის ასისტენტი</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tokenInfo && (
            <div className={`px-4 py-2 text-sm ${THEME.cardBg} border ${THEME.borderColor} rounded-md backdrop-blur-sm`}>
              <span className="font-medium text-indigo-400">{tokenInfo.usage}</span>
              <span className={`${THEME.textSecondary}`}> / {tokenInfo.limit} ტოკენი</span>
            </div>
          )}

          <Link
            href="/better-me/settings"
            className={`flex items-center px-4 py-2 text-sm border ${THEME.borderColor} rounded-md ${THEME.cardBgHover} ${THEME.hoverTransition}`}
          >
            <Settings className={`h-4 w-4 mr-2 ${THEME.textSecondary}`} />
            პარამეტრები
          </Link>
        </div>
      </header>

      {/* Quick navigation buttons */}
      <div className={`w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8`}>
        <Link
          href="/better-me"
          className={`flex items-center gap-3 p-4 border ${THEME.borderColor} rounded-lg ${THEME.primaryGradient} backdrop-blur-sm ${THEME.glow}`}
        >
          <HeartPulse className="h-6 w-6 text-white" />
          <span className="font-medium text-white">მთავარი</span>
        </Link>

        <Link
          href="/better-me/meal-plans"
          className={`flex items-center gap-3 p-4 border ${THEME.borderColor} rounded-lg ${THEME.cardBg} backdrop-blur-sm ${THEME.hoverTransition} hover:bg-gray-800/60 hover:translate-x-1`}
        >
          <Utensils className="h-6 w-6 text-indigo-400" />
          <span>კვების გეგმები</span>
        </Link>

        <Link
          href="/better-me/workouts"
          className={`flex items-center gap-3 p-4 border ${THEME.borderColor} rounded-lg ${THEME.cardBg} backdrop-blur-sm ${THEME.hoverTransition} hover:bg-gray-800/60 hover:translate-x-1`}
        >
          <Dumbbell className="h-6 w-6 text-indigo-400" />
          <span>ვარჯიშები</span>
        </Link>

        <Link
          href="/better-me/progress"
          className={`flex items-center gap-3 p-4 border ${THEME.borderColor} rounded-lg ${THEME.cardBg} backdrop-blur-sm ${THEME.hoverTransition} hover:bg-gray-800/60 hover:translate-x-1`}
        >
          <LineChart className="h-6 w-6 text-indigo-400" />
          <span>პროგრესი</span>
        </Link>
      </div>

      {/* Main content grid - with better layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left sidebar - Now narrower and more compact */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile card */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.cardBg} backdrop-blur-sm ${THEME.glow}`}>
            <div className={`bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-4 py-3 border-b ${THEME.borderColor}`}>
              <h3 className={`font-medium ${THEME.textPrimary} flex items-center`}>
                <span className={`w-5 h-5 ${THEME.primaryGradient} rounded-full flex items-center justify-center mr-2`}>
                  <span className="text-white text-xs">👤</span>
                </span>
                ჩემი პროფილი
              </h3>
            </div>

            <div className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={`${THEME.textSecondary}`}>ასაკი:</span>
                  <span className="font-medium">{healthProfile.age || "—"}</span>
                </div>

                <div className="flex justify-between">
                  <span className={`${THEME.textSecondary}`}>სიმაღლე:</span>
                  <span className="font-medium">{healthProfile.height ? `${healthProfile.height} სმ` : "—"}</span>
                </div>

                <div className="flex justify-between">
                  <span className={`${THEME.textSecondary}`}>წონა:</span>
                  <span className="font-medium">{healthProfile.weight ? `${healthProfile.weight} კგ` : "—"}</span>
                </div>

                <div className="flex justify-between">
                  <span className={`${THEME.textSecondary}`}>აქტიურობა:</span>
                  <span className="font-medium">{healthProfile.activityLevel || "—"}</span>
                </div>
              </div>

              <div className={`mt-4 pt-3 border-t ${THEME.borderColor} flex justify-end`}>
                <Link
                  href="/better-me/edit-profile"
                  className="text-sm text-indigo-400 flex items-center hover:text-indigo-300 transition-colors"
                >
                  რედაქტირება
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Upgrade prompt - only show for free users */}
          {tokenInfo?.tier === "FREE" && (
            <div className={`bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-600 rounded-lg p-5 text-white ${THEME.glow}`}>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <span className="text-yellow-300 text-xs">⭐</span>
                გააუმჯობესეთ
              </h3>
              <p className="text-sm mb-4 opacity-90">
                მიიღეთ წვდომა დამატებით AI ფუნქციებზე და პერსონალიზებულ რეკომენდაციებზე.
              </p>
              <Link
                href="/better-me/upgrade"
                className="inline-block px-4 py-2 bg-white/20 rounded-md hover:bg-white/30 text-sm font-medium transition-colors"
              >
                პაკეტების ნახვა
              </Link>
            </div>
          )}

          {/* Quick actions moved to sidebar */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.cardBg} backdrop-blur-sm ${THEME.glow}`}>
            <div className={`bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-4 py-3 border-b ${THEME.borderColor}`}>
              <h3 className={`font-medium ${THEME.textPrimary} flex items-center`}>
                <span className={`w-5 h-5 ${THEME.accentGradient} rounded-full flex items-center justify-center mr-2`}>
                  <Plus className="h-3 w-3 text-white" />
                </span>
                სწრაფი მოქმედებები
              </h3>
            </div>

            <div className="p-2">
              <div className="space-y-1">
                <Link
                  href="/better-me/new-meal-plan"
                  className={`group block p-3 rounded-md ${THEME.hoverTransition} hover:bg-gray-800/60`}
                >
                  <div className="flex items-center">
                    <div className={`p-1.5 mr-3 ${THEME.accentGradient} rounded-full text-white ${THEME.hoverTransition} group-hover:scale-110`}>
                      <Plus className="h-3 w-3" />
                    </div>
                    <span className="group-hover:text-indigo-300 transition-colors text-sm">ახალი კვების გეგმა</span>
                  </div>
                </Link>

                <Link
                  href="/better-me/new-workout"
                  className={`group block p-3 rounded-md ${THEME.hoverTransition} hover:bg-gray-800/60`}
                >
                  <div className="flex items-center">
                    <div className={`p-1.5 mr-3 ${THEME.accentGradient} rounded-full text-white ${THEME.hoverTransition} group-hover:scale-110`}>
                      <Plus className="h-3 w-3" />
                    </div>
                    <span className="group-hover:text-indigo-300 transition-colors text-sm">ახალი ვარჯიში</span>
                  </div>
                </Link>

                <Link
                  href="/better-me/track-progress"
                  className={`group block p-3 rounded-md ${THEME.hoverTransition} hover:bg-gray-800/60`}
                >
                  <div className="flex items-center">
                    <div className={`p-1.5 mr-3 ${THEME.accentGradient} rounded-full text-white ${THEME.hoverTransition} group-hover:scale-110`}>
                      <Plus className="h-3 w-3" />
                    </div>
                    <span className="group-hover:text-indigo-300 transition-colors text-sm">პროგრესის ჩაწერა</span>
                  </div>
                </Link>

                <Link
                  href="/better-me/chat"
                  className={`group block p-3 rounded-md ${THEME.hoverTransition} hover:bg-gray-800/60`}
                >
                  <div className="flex items-center">
                    <div className={`p-1.5 mr-3 ${THEME.secondaryGradient} rounded-full text-white ${THEME.hoverTransition} group-hover:scale-110`}>
                      <MessageCircle className="h-3 w-3" />
                    </div>
                    <span className="group-hover:text-indigo-300 transition-colors text-sm">AI ასისტენტთან ჩეთი</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Wider and more focused */}
        <div className="lg:col-span-3 space-y-8">
          {/* Feature cards - Now more prominent */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.cardBg} backdrop-blur-sm ${THEME.glow}`}>
            <div className={`bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-4 py-3 border-b ${THEME.borderColor}`}>
              <h2 className={`font-medium ${THEME.textPrimary} flex items-center`}>
                <span className={`w-6 h-6 ${THEME.primaryGradient} rounded-full flex items-center justify-center mr-2`}>
                  <HeartPulse className="h-3 w-3 text-white" />
                </span>
                Better Me ფუნქციები
              </h2>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                  title="კვების გეგმები"
                  description="შექმენით პერსონალიზებული კვების გეგმები და შეისწავლეთ ჯანსაღი რეცეპტები"
                  icon={<Utensils className="h-5 w-5" />}
                  href="/better-me/meal-plans"
                />

                <FeatureCard
                  title="ვარჯიშის რუტინები"
                  description="აღმოაჩინეთ ვარჯიშის პროგრამები, რომლებიც შეესაბამება თქვენს მიზნებს"
                  icon={<Dumbbell className="h-5 w-5" />}
                  href="/better-me/workouts"
                />

                <FeatureCard
                  title="პროგრესის თვალყურის დევნება"
                  description="თვალყური ადევნეთ თქვენს ჯანმრთელობას, წონას და სხვა მაჩვენებლებს"
                  icon={<LineChart className="h-5 w-5" />}
                  href="/better-me/progress"
                />

                <FeatureCard
                  title="AI ასისტენტთან ჩეთი"
                  description="მიიღეთ რჩევები და პასუხები თქვენს კითხვებზე ჯანმრთელობის შესახებ"
                  icon={<MessageCircle className="h-5 w-5" />}
                  href="/better-me/chat"
                />
              </div>
            </div>
          </div>

          {/* AI Recommendations - Now in a collapsible section */}
          <div className={`border ${THEME.borderColor} rounded-lg overflow-hidden ${THEME.cardBg} backdrop-blur-sm ${THEME.glow}`}>
            <div className={`bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-4 py-3 border-b ${THEME.borderColor}`}>
              <h2 className={`font-medium ${THEME.textPrimary} flex items-center`}>
                <span className={`w-6 h-6 ${THEME.secondaryGradient} rounded-full flex items-center justify-center mr-2`}>
                  <span className="text-white text-xs">🤖</span>
                </span>
                AI ჯანმრთელობის რეკომენდაციები
              </h2>
            </div>

            <div className="p-1">
              <Suspense fallback={<LoadingState />}>
                <AIRecommendations healthProfileId={healthProfile.id} goals={selectedGoals} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}