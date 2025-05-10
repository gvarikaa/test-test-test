"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  CalendarCheck, 
  Utensils, 
  Info,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pizza,
  Coffee,
  CookingPot,
  Banana
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-pulse h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
      <Utensils className="text-primary h-10 w-10 animate-pulse" />
    </div>
    <p className="mt-4 text-muted-foreground">ინფორმაციის ჩატვირთვა...</p>
  </div>
);

// No meal plans state component
const NoMealPlansState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 border rounded-lg bg-muted/10 text-center">
    <Utensils className="h-16 w-16 text-primary/50 mb-6" />
    <h2 className="text-2xl font-medium mb-2">კვების გეგმები არ გაქვთ</h2>
    <p className="text-muted-foreground mb-8 max-w-md">
      შექმენით თქვენი პირველი კვების გეგმა ჯანსაღი კვების ჩვევების ჩამოსაყალიბებლად.
    </p>
    <Link 
      href="/better-me/new-meal-plan" 
      className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
    >
      <Plus className="mr-2 h-5 w-5" />
      კვების გეგმის შექმნა
    </Link>
  </div>
);

// Meal type icon mapper
const getMealTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'breakfast':
      return <Coffee className="h-4 w-4" />;
    case 'lunch':
      return <Pizza className="h-4 w-4" />;
    case 'dinner':
      return <CookingPot className="h-4 w-4" />;
    case 'snack':
      return <Banana className="h-4 w-4" />;
    default:
      return <Utensils className="h-4 w-4" />;
  }
};

// Interface for meal plan
interface Meal {
  id: string;
  name: string;
  type: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  recipe?: string;
  imageUrl?: string;
}

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  meals: Meal[];
}

export default function MealPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  
  // Fetch meal plans
  const { 
    data: mealPlansData, 
    isLoading: plansLoading,
    error
  } = api.health.getMealPlans.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: false,
  });
  
  // Toggle expanded state for a plan
  const togglePlanExpanded = (planId: string) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Calculate date range text
  const getDateRangeText = (startDate: Date, endDate?: Date) => {
    if (!endDate) {
      return `დაიწყო ${formatDate(startDate)}-დან`;
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };
  
  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/better-me/meal-plans");
  }
  
  // Show loading state while checking authentication or loading plans
  if (status === "loading" || plansLoading) {
    return <LoadingState />;
  }
  
  const mealPlans = mealPlansData || [];
  
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/better-me" className="flex items-center text-muted-foreground mb-2 hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან Better Me-ზე
          </Link>
          
          <h1 className="text-3xl font-bold">კვების გეგმები</h1>
          <p className="text-muted-foreground">მართეთ თქვენი ჯანსაღი კვების გეგმები და რეცეპტები</p>
        </div>
        
        <Link 
          href="/better-me/new-meal-plan" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          ახალი გეგმა
        </Link>
      </div>
      
      {/* Main content */}
      {mealPlans.length === 0 ? (
        <NoMealPlansState />
      ) : (
        <div className="space-y-6">
          {/* Active meal plan */}
          {mealPlans.length > 0 && (
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-medium mb-4">მიმდინარე კვების გეგმა</h2>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{mealPlans[0].name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <CalendarCheck className="h-4 w-4 mr-1" />
                        {getDateRangeText(mealPlans[0].startDate, mealPlans[0].endDate)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/better-me/meal-plans/${mealPlans[0].id}`} 
                        className="text-sm text-primary hover:underline flex items-center"
                      >
                        დეტალები 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                      
                      <button
                        onClick={() => togglePlanExpanded(mealPlans[0].id)}
                        className="p-1 rounded-full hover:bg-muted/20"
                      >
                        {expandedPlans[mealPlans[0].id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {mealPlans[0].description && (
                    <p className="text-sm mt-2">{mealPlans[0].description}</p>
                  )}
                </div>
                
                {expandedPlans[mealPlans[0].id] && (
                  <div className="p-4 divide-y">
                    {mealPlans[0].meals && mealPlans[0].meals.length > 0 ? (
                      mealPlans[0].meals.map((meal) => (
                        <div key={meal.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-muted/10 rounded">
                              {getMealTypeIcon(meal.type)}
                            </div>
                            <span className="font-medium">{meal.name}</span>
                            <span className="text-xs bg-muted/20 px-1.5 py-0.5 rounded">
                              {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            {meal.calories && (
                              <div>
                                <span className="text-muted-foreground">კალორიები:</span>{" "}
                                {meal.calories} კკალ
                              </div>
                            )}
                            {meal.protein && (
                              <div>
                                <span className="text-muted-foreground">ცილა:</span> {meal.protein}გ
                              </div>
                            )}
                            {meal.carbs && (
                              <div>
                                <span className="text-muted-foreground">ნახშირწყლები:</span>{" "}
                                {meal.carbs}გ
                              </div>
                            )}
                            {meal.fat && (
                              <div>
                                <span className="text-muted-foreground">ცხიმი:</span> {meal.fat}გ
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-muted-foreground">
                        ამ გეგმას არ აქვს კერძები
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Previous meal plans */}
          {mealPlans.length > 1 && (
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-medium mb-4">წინა კვების გეგმები</h2>
              
              <div className="space-y-3">
                {mealPlans.slice(1).map((plan) => (
                  <div key={plan.id} className="border rounded-lg">
                    <div 
                      className="p-4 flex justify-between items-center hover:bg-muted/5 cursor-pointer"
                      onClick={() => togglePlanExpanded(plan.id)}
                    >
                      <div>
                        <h3 className="font-medium">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <CalendarCheck className="h-4 w-4 mr-1" />
                          {getDateRangeText(plan.startDate, plan.endDate)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/better-me/meal-plans/${plan.id}`} 
                          className="text-sm text-primary hover:underline flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          დეტალები 
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                        
                        {expandedPlans[plan.id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    
                    {expandedPlans[plan.id] && (
                      <div className="p-4 border-t">
                        {plan.description && (
                          <p className="text-sm mb-3">{plan.description}</p>
                        )}
                        
                        <div className="text-sm">
                          {plan.meals && plan.meals.length > 0 ? (
                            <div className="space-y-2">
                              {plan.meals.map((meal) => (
                                <div key={meal.id} className="flex items-center gap-2">
                                  <div className="p-1 bg-muted/10 rounded">
                                    {getMealTypeIcon(meal.type)}
                                  </div>
                                  <span>{meal.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-2">
                              ამ გეგმას არ აქვს კერძები
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tips/Info section */}
          <div className="border rounded-lg p-5 bg-muted/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Info className="h-5 w-5" />
              </div>
              
              <div>
                <h3 className="font-medium mb-1">რჩევები ჯანსაღი კვებისთვის</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    მიირთვით მრავალფეროვანი საკვები პროდუქტები, მათ შორის ხილი, ბოსტნეული, მარცვლეული და ცილები.
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    დალიეთ საკმარისი რაოდენობის წყალი დღის განმავლობაში.
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    შეზღუდეთ მაღალი შაქრისა და ცხიმის შემცველი საკვები.
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ყურადღება მიაქციეთ პორციების ზომას და შეეცადეთ დაიცვათ რეგულარული კვების რეჟიმი.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}