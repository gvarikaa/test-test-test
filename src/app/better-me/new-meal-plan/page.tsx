"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  X, 
  UtensilsCrossed, 
  CookingPot,
  Loader2,
  Clock,
  Banana,
  Pizza,
  Coffee,
  GlassWater,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

interface MealInput {
  id: string;
  name: string;
  type: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  recipe: string;
  imageUrl: string;
}

const mealTypes = [
  { value: "breakfast", label: "საუზმე", icon: <Coffee className="h-4 w-4" /> },
  { value: "lunch", label: "სადილი", icon: <Pizza className="h-4 w-4" /> },
  { value: "dinner", label: "ვახშამი", icon: <CookingPot className="h-4 w-4" /> },
  { value: "snack", label: "სნექი", icon: <Banana className="h-4 w-4" /> },
  { value: "drink", label: "სასმელი", icon: <GlassWater className="h-4 w-4" /> },
];

export default function NewMealPlanPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/better-me/new-meal-plan");
    },
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  
  const [meals, setMeals] = useState<MealInput[]>([]);
  const [currentMeal, setCurrentMeal] = useState<MealInput>({
    id: "",
    name: "",
    type: "breakfast",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    recipe: "",
    imageUrl: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  // Fetch profile
  const { data: healthProfile, isLoading: profileLoading } = api.health.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  
  // tRPC mutations
  const { mutate: createMealPlan, isLoading: isSubmitting } = api.health.createMealPlan.useMutation({
    onSuccess: () => {
      router.push("/better-me/meal-plans");
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });
  
  // Generate meal plan with AI
  const { mutate: generateMealPlan, isLoading: isGenerating } = api.ai.generateMealPlan.useMutation({
    onMutate: () => {
      setIsAiGenerating(true);
    },
    onSuccess: (data) => {
      // Update form with generated data
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
      }));
      
      // Add generated meals
      if (data.meals && data.meals.length > 0) {
        const formattedMeals = data.meals.map((meal) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: meal.name,
          type: meal.type,
          calories: meal.calories?.toString() || "",
          protein: meal.protein?.toString() || "",
          carbs: meal.carbs?.toString() || "",
          fat: meal.fat?.toString() || "",
          recipe: meal.recipe || "",
          imageUrl: meal.imageUrl || "",
        }));
        
        setMeals(formattedMeals);
      }
      
      setIsAiGenerating(false);
    },
    onError: (error) => {
      setErrors({ ai: error.message });
      setIsAiGenerating(false);
    },
  });
  
  // Handle input change for basic form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle input change for current meal
  const handleMealChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentMeal((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[`meal_${name}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`meal_${name}`];
        return newErrors;
      });
    }
  };
  
  // Add current meal to the list
  const addMeal = () => {
    // Validate meal
    const mealErrors: Record<string, string> = {};
    
    if (!currentMeal.name.trim()) {
      mealErrors.meal_name = "გთხოვთ მიუთითოთ კერძის სახელი";
    }
    
    if (!currentMeal.type) {
      mealErrors.meal_type = "გთხოვთ აირჩიოთ კერძის ტიპი";
    }
    
    setErrors(mealErrors);
    
    // Add meal if no errors
    if (Object.keys(mealErrors).length === 0) {
      const newMeal = {
        ...currentMeal,
        id: Date.now().toString(),
      };
      
      setMeals((prev) => [...prev, newMeal]);
      
      // Reset current meal
      setCurrentMeal({
        id: "",
        name: "",
        type: "breakfast",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        recipe: "",
        imageUrl: "",
      });
      
      setShowAddMeal(false);
    }
  };
  
  // Remove meal from the list
  const removeMeal = (id: string) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== id));
  };
  
  // Handle meal generation with AI
  const handleGenerateMeals = () => {
    if (!healthProfile) return;
    
    // Get dietary restrictions and goals from profile
    const dietaryRestrictions = healthProfile.dietaryRestrictions || "none";
    
    let goals: string[] = [];
    if (healthProfile.goals) {
      try {
        const parsedGoals = JSON.parse(healthProfile.goals);
        if (Array.isArray(parsedGoals)) {
          goals = parsedGoals;
        }
      } catch (err) {
        console.error("Failed to parse goals:", err);
      }
    }
    
    // Generate meal plan
    generateMealPlan({
      profileId: healthProfile.id,
      dietaryRestrictions,
      goals,
      daysCount: 7,
    });
  };
  
  // Validate form
  const validateForm = () => {
    const formErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      formErrors.name = "გთხოვთ მიუთითოთ გეგმის სახელი";
    }
    
    if (!formData.startDate) {
      formErrors.startDate = "გთხოვთ მიუთითოთ დაწყების თარიღი";
    }
    
    if (meals.length === 0) {
      formErrors.meals = "გთხოვთ დაამატოთ მინიმუმ ერთი კერძი";
    }
    
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Format meals for API
      const formattedMeals = meals.map((meal) => ({
        name: meal.name,
        type: meal.type,
        calories: meal.calories ? parseInt(meal.calories) : undefined,
        protein: meal.protein ? parseInt(meal.protein) : undefined,
        carbs: meal.carbs ? parseInt(meal.carbs) : undefined,
        fat: meal.fat ? parseInt(meal.fat) : undefined,
        recipe: meal.recipe || undefined,
        imageUrl: meal.imageUrl || undefined,
      }));
      
      // Create meal plan
      createMealPlan({
        name: formData.name,
        description: formData.description || undefined,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        meals: formattedMeals,
      });
    }
  };
  
  // Show loading state while checking authentication or loading profile
  if (status === "loading" || profileLoading) {
    return <LoadingState />;
  }
  
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/better-me/meal-plans" className="flex items-center text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან კვების გეგმებზე
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">ახალი კვების გეგმის შექმნა</h1>
        <p className="text-muted-foreground">
          შექმენით პერსონალიზებული კვების გეგმა თქვენი ჯანმრთელობის მიზნებისთვის.
        </p>
      </div>
      
      {/* AI Generation Button */}
      <div className="mb-6">
        <button
          onClick={handleGenerateMeals}
          disabled={isAiGenerating || isGenerating}
          className="flex items-center gap-2 p-4 w-full border border-dashed rounded-lg hover:bg-muted/5 hover:border-primary/40 transition-colors"
        >
          {isAiGenerating || isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Sparkles className="h-5 w-5 text-amber-500" />
          )}
          <span className="font-medium">
            {isAiGenerating || isGenerating
              ? "გეგმის გენერაცია მიმდინარეობს..."
              : "AI-ს დახმარებით კვების გეგმის გენერირება"}
          </span>
        </button>
        {errors.ai && <p className="mt-2 text-red-500 text-sm">{errors.ai}</p>}
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <div className="border rounded-lg p-6 bg-card space-y-6">
          <h2 className="text-xl font-medium">ძირითადი ინფორმაცია</h2>
          
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              გეგმის სახელი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-3 border rounded-md ${
                errors.name ? "border-red-500" : "border-muted"
              }`}
              placeholder="მაგ: ჯანსაღი კვების კვირეული გეგმა"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          
          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              აღწერა
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded-md border-muted h-24 resize-none"
              placeholder="აღწერეთ თქვენი კვების გეგმა..."
            />
          </div>
          
          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-medium">
                დაწყების თარიღი <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md ${
                  errors.startDate ? "border-red-500" : "border-muted"
                }`}
              />
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="endDate" className="block text-sm font-medium">
                დასრულების თარიღი
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full p-3 border rounded-md border-muted"
              />
            </div>
          </div>
        </div>
        
        {/* Meals Section */}
        <div className="border rounded-lg p-6 bg-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">კერძები</h2>
            
            <button
              type="button"
              onClick={() => setShowAddMeal(!showAddMeal)}
              className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-muted/10"
            >
              {showAddMeal ? (
                <>
                  <X className="h-4 w-4" /> დახურვა
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> კერძის დამატება
                </>
              )}
            </button>
          </div>
          
          {/* Meal List */}
          {meals.length === 0 && !showAddMeal ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mb-3 text-muted" />
              <p>ჯერ კერძები არ გაქვთ დამატებული</p>
              <button
                type="button"
                onClick={() => setShowAddMeal(true)}
                className="mt-4 px-4 py-2 bg-muted/10 rounded-md hover:bg-muted/20 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                კერძის დამატება
              </button>
            </div>
          ) : (
            <>
              {meals.length > 0 && (
                <div className="space-y-3">
                  {meals.map((meal) => (
                    <div key={meal.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {mealTypes.find((type) => type.value === meal.type)?.icon}
                            <h3 className="font-medium">{meal.name}</h3>
                            <span className="text-sm bg-muted/20 px-2 py-0.5 rounded">
                              {mealTypes.find((type) => type.value === meal.type)?.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
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
                          
                          {meal.recipe && (
                            <div className="mt-3 text-sm">
                              <div className="text-muted-foreground font-medium mb-1">რეცეპტი:</div>
                              <p className="whitespace-pre-line">{meal.recipe}</p>
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeMeal(meal.id)}
                          className="p-1 text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Meal Form */}
              {showAddMeal && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-4">ახალი კერძის დამატება</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Meal Name */}
                    <div className="space-y-2">
                      <label htmlFor="meal_name" className="block text-sm font-medium">
                        კერძის სახელი <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="meal_name"
                        name="name"
                        value={currentMeal.name}
                        onChange={handleMealChange}
                        className={`w-full p-3 border rounded-md ${
                          errors.meal_name ? "border-red-500" : "border-muted"
                        }`}
                        placeholder="მაგ: შემწვარი ქათამი ბოსტნეულით"
                      />
                      {errors.meal_name && (
                        <p className="text-red-500 text-sm">{errors.meal_name}</p>
                      )}
                    </div>
                    
                    {/* Meal Type */}
                    <div className="space-y-2">
                      <label htmlFor="meal_type" className="block text-sm font-medium">
                        კერძის ტიპი <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="meal_type"
                        name="type"
                        value={currentMeal.type}
                        onChange={handleMealChange}
                        className={`w-full p-3 border rounded-md bg-background text-foreground appearance-none ${
                          errors.meal_type ? "border-red-500" : "border-muted"
                        }`}
                      >
                        {mealTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.meal_type && (
                        <p className="text-red-500 text-sm">{errors.meal_type}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Nutritional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <label htmlFor="meal_calories" className="block text-sm font-medium">
                        კალორიები (კკალ)
                      </label>
                      <input
                        type="number"
                        id="meal_calories"
                        name="calories"
                        value={currentMeal.calories}
                        onChange={handleMealChange}
                        className="w-full p-3 border rounded-md border-muted"
                        placeholder="მაგ: 350"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="meal_protein" className="block text-sm font-medium">
                        ცილა (გ)
                      </label>
                      <input
                        type="number"
                        id="meal_protein"
                        name="protein"
                        value={currentMeal.protein}
                        onChange={handleMealChange}
                        className="w-full p-3 border rounded-md border-muted"
                        placeholder="მაგ: 20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="meal_carbs" className="block text-sm font-medium">
                        ნახშირწყლები (გ)
                      </label>
                      <input
                        type="number"
                        id="meal_carbs"
                        name="carbs"
                        value={currentMeal.carbs}
                        onChange={handleMealChange}
                        className="w-full p-3 border rounded-md border-muted"
                        placeholder="მაგ: 30"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="meal_fat" className="block text-sm font-medium">
                        ცხიმი (გ)
                      </label>
                      <input
                        type="number"
                        id="meal_fat"
                        name="fat"
                        value={currentMeal.fat}
                        onChange={handleMealChange}
                        className="w-full p-3 border rounded-md border-muted"
                        placeholder="მაგ: 10"
                      />
                    </div>
                  </div>
                  
                  {/* Recipe */}
                  <div className="space-y-2 mb-4">
                    <label htmlFor="meal_recipe" className="block text-sm font-medium">
                      რეცეპტი
                    </label>
                    <textarea
                      id="meal_recipe"
                      name="recipe"
                      value={currentMeal.recipe}
                      onChange={handleMealChange}
                      className="w-full p-3 border rounded-md border-muted h-24 resize-none"
                      placeholder="მომზადების ინსტრუქციები..."
                    />
                  </div>
                  
                  {/* Image URL */}
                  <div className="space-y-2 mb-4">
                    <label htmlFor="meal_imageUrl" className="block text-sm font-medium">
                      სურათის URL
                    </label>
                    <input
                      type="text"
                      id="meal_imageUrl"
                      name="imageUrl"
                      value={currentMeal.imageUrl}
                      onChange={handleMealChange}
                      className="w-full p-3 border rounded-md border-muted"
                      placeholder="მაგ: https://example.com/image.jpg"
                    />
                  </div>
                  
                  {/* Add Meal Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addMeal}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      კერძის დამატება
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {errors.meals && <p className="text-red-500 text-sm mt-2">{errors.meals}</p>}
        </div>
        
        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {errors.submit}
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Link
            href="/better-me/meal-plans"
            className="px-5 py-2 border rounded-md hover:bg-muted/50 mr-3"
          >
            გაუქმება
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                შენახვა...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                შენახვა
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}