"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/trpc/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  ChevronRight, 
  HeartPulse, 
  Utensils, 
  Dumbbell, 
  LineChart, 
  MessageCircle,
  Plus, 
  Info,
  ArrowRight,
  Settings
} from "lucide-react";
import { AIRecommendations } from "./components/ai-recommendations";

// Loading component
const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-pulse h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
      <HeartPulse className="text-primary h-10 w-10 animate-pulse" />
    </div>
    <p className="mt-4 text-muted-foreground">ინფორმაციის ჩატვირთვა...</p>
  </div>
);

// No profile state component
const NoHealthProfile = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 border rounded-lg bg-muted/10 text-center">
    <HeartPulse className="h-16 w-16 text-primary/50 mb-6" />
    <h2 className="text-2xl font-medium mb-2">ჯერ არ გაქვთ ჯანმრთელობის პროფილი</h2>
    <p className="text-muted-foreground mb-8 max-w-md">
      შექმენით თქვენი ჯანმრთელობის პროფილი პერსონალიზებული გეგმების, რჩევების და პროგრესის თვალყურის დევნებისთვის.
    </p>
    <Link 
      href="/better-me/create-profile" 
      className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
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
    className={`block p-6 border rounded-lg hover:shadow-md transition-all ${
      disabled 
        ? "opacity-50 cursor-not-allowed bg-muted/5" 
        : "hover:border-primary/50 hover:bg-primary/5"
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="flex gap-4 items-start">
        <div className="p-2 bg-primary/10 rounded-md text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-medium mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {!disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      {disabled && <Info className="h-5 w-5 text-muted-foreground" title="მალე ხელმისაწვდომი იქნება" />}
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
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Better Me</h1>
          <p className="text-muted-foreground">თქვენი პერსონალური ჯანმრთელობისა და კეთილდღეობის ასისტენტი</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/better-me/settings" 
            className="flex items-center px-4 py-2 text-sm border rounded-md hover:bg-muted/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            პარამეტრები
          </Link>
          
          {tokenInfo && (
            <div className="px-4 py-2 text-sm bg-muted/10 rounded-md">
              <span className="font-medium">{tokenInfo.usage}</span>
              <span className="text-muted-foreground"> / {tokenInfo.limit} ტოკენი</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left sidebar - Profile & Menu */}
        <div className="space-y-6">
          {/* Profile card */}
          <div className="border rounded-lg p-5 bg-card">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-1">ჩემი პროფილი</h3>
              <p className="text-sm text-muted-foreground">ჯანმრთელობის პერსონალური ინფორმაცია</p>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">ასაკი:</div>
                <div>{healthProfile.age || "არ არის მითითებული"}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">სიმაღლე:</div>
                <div>{healthProfile.height ? `${healthProfile.height} სმ` : "არ არის მითითებული"}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">წონა:</div>
                <div>{healthProfile.weight ? `${healthProfile.weight} კგ` : "არ არის მითითებული"}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">აქტიურობა:</div>
                <div>{healthProfile.activityLevel || "არ არის მითითებული"}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">კვებითი შეზღუდვები:</div>
                <div>{healthProfile.dietaryRestrictions || "არ არის მითითებული"}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Link
                href="/better-me/edit-profile"
                className="text-sm text-primary flex items-center hover:underline"
              >
                პროფილის რედაქტირება
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
          
          {/* Navigation menu */}
          <nav className="border rounded-lg overflow-hidden">
            <div className="bg-muted/10 px-4 py-3">
              <h3 className="font-medium">Better Me მენიუ</h3>
            </div>
            <div className="divide-y">
              <Link href="/better-me" className="flex items-center px-4 py-3 hover:bg-muted/5 bg-primary/5">
                <HeartPulse className="h-5 w-5 mr-3 text-primary" />
                <span>მთავარი</span>
              </Link>
              
              <Link href="/better-me/meal-plans" className="flex items-center px-4 py-3 hover:bg-muted/5">
                <Utensils className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>კვების გეგმები</span>
              </Link>
              
              <Link href="/better-me/workouts" className="flex items-center px-4 py-3 hover:bg-muted/5">
                <Dumbbell className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>ვარჯიშის რუტინები</span>
              </Link>
              
              <Link href="/better-me/progress" className="flex items-center px-4 py-3 hover:bg-muted/5">
                <LineChart className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>პროგრესის თვალყურის დევნება</span>
              </Link>
              
              <Link href="/better-me/chat" className="flex items-center px-4 py-3 hover:bg-muted/5">
                <MessageCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>AI ასისტენტი</span>
              </Link>
            </div>
          </nav>
          
          {/* Upgrade prompt - only show for free users */}
          {tokenInfo?.tier === "FREE" && (
            <div className="bg-gradient-to-br from-accent-blue via-purple-600 to-pink-500 rounded-lg p-5 text-white">
              <h3 className="font-medium mb-2">გააუმჯობესეთ თქვენი გამოცდილება</h3>
              <p className="text-sm mb-4 opacity-90">
                მიიღეთ წვდომა დამატებით AI ფუნქციებზე, მეტი კვების გეგმაზე და პერსონალიზებულ რეკომენდაციებზე.
              </p>
              <Link 
                href="/better-me/upgrade" 
                className="inline-block px-4 py-2 bg-white/20 rounded hover:bg-white/30 text-sm font-medium"
              >
                პაკეტების ნახვა
              </Link>
            </div>
          )}
        </div>
        
        {/* Main content */}
        <div className="md:col-span-2 space-y-8">
          {/* AI Recommendations */}
          <Suspense fallback={<LoadingState />}>
            <AIRecommendations healthProfileId={healthProfile.id} goals={selectedGoals} />
          </Suspense>
          
          {/* Feature cards */}
          <div>
            <h2 className="text-xl font-medium mb-4">Better Me ფუნქციები</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          
          {/* Quick actions */}
          <div>
            <h2 className="text-xl font-medium mb-4">სწრაფი მოქმედებები</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/better-me/new-meal-plan"
                className="block p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center">
                  <div className="p-2 mr-4 bg-primary/10 rounded-md text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>ახალი კვების გეგმის შექმნა</span>
                </div>
              </Link>
              
              <Link
                href="/better-me/new-workout"
                className="block p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center">
                  <div className="p-2 mr-4 bg-primary/10 rounded-md text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>ახალი ვარჯიშის პროგრამის შექმნა</span>
                </div>
              </Link>
              
              <Link
                href="/better-me/track-progress"
                className="block p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center">
                  <div className="p-2 mr-4 bg-primary/10 rounded-md text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>დღევანდელი პროგრესის ჩაწერა</span>
                </div>
              </Link>
              
              <Link
                href="/better-me/chat"
                className="block p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center">
                  <div className="p-2 mr-4 bg-primary/10 rounded-md text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span>რჩევის კითხვა AI ასისტენტისგან</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}