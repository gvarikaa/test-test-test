"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { 
  ArrowLeft, 
  HeartPulse, 
  Check, 
  Loader2,
  Apple,
  Dumbbell,
  Brain,
  Battery,
  Wind
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Activity level options
const activityLevels = [
  {
    id: "sedentary",
    label: "მჯდომარე",
    description: "მინიმალური ან არანაირი ფიზიკური აქტივობა",
    icon: <div className="p-2 rounded-full bg-muted/20">🧘</div>,
  },
  {
    id: "light",
    label: "მსუბუქი აქტიურობა",
    description: "კვირაში 1-3 დღე ვარჯიში",
    icon: <div className="p-2 rounded-full bg-muted/20">🚶</div>,
  },
  {
    id: "moderate",
    label: "საშუალო აქტიურობა",
    description: "კვირაში 3-5 დღე ვარჯიში",
    icon: <div className="p-2 rounded-full bg-muted/20">🏊</div>,
  },
  {
    id: "active",
    label: "აქტიური",
    description: "კვირაში 5-7 დღე ინტენსიური ვარჯიში",
    icon: <div className="p-2 rounded-full bg-muted/20">🏃</div>,
  },
  {
    id: "very_active",
    label: "ძალიან აქტიური",
    description: "ყოველდღიური ინტენსიური ვარჯიში ან ფიზიკური შრომა",
    icon: <div className="p-2 rounded-full bg-muted/20">🏋️</div>,
  },
];

// Goal options
const goalOptions = [
  {
    id: "weight_loss",
    label: "წონაში კლება",
    icon: <Battery className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "muscle_gain",
    label: "კუნთების მასის მომატება",
    icon: <Dumbbell className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "general_health",
    label: "ზოგადი ჯანმრთელობის გაუმჯობესება",
    icon: <HeartPulse className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "increase_energy",
    label: "ენერგიის დონის გაზრდა",
    icon: <Wind className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "improve_sleep",
    label: "ძილის ხარისხის გაუმჯობესება",
    icon: <Brain className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "improved_nutrition",
    label: "კვების ხარისხის გაუმჯობესება",
    icon: <Apple className="h-5 w-5 text-blue-500" />,
  },
];

// Dietary restrictions options
const dietaryRestrictions = [
  { id: "none", label: "არ მაქვს შეზღუდვები" },
  { id: "vegetarian", label: "ვეგეტარიანული" },
  { id: "vegan", label: "ვეგანი" },
  { id: "gluten_free", label: "უგლუტენო" },
  { id: "lactose_free", label: "უ-ლაქტოზო" },
  { id: "keto", label: "კეტო" },
  { id: "paleo", label: "პალეო" },
  { id: "low_carb", label: "დაბალი ნახშირწყლები" },
  { id: "other", label: "სხვა" },
];

export default function CreateHealthProfilePage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/better-me/create-profile");
    },
  });
  
  // Form state
  const [formData, setFormData] = useState({
    age: "",
    weight: "",
    height: "",
    gender: "",
    activityLevel: "",
    dietaryRestrictions: "",
    otherDietaryRestrictions: "",
    goals: [] as string[],
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // tRPC mutation
  const { mutate: createProfile, isLoading } = api.health.createProfile.useMutation({
    onSuccess: () => {
      router.push("/better-me");
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
  
  // Handle activity level selection
  const handleActivityLevelSelect = (level: string) => {
    setFormData((prev) => ({ ...prev, activityLevel: level }));
    if (errors.activityLevel) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.activityLevel;
        return newErrors;
      });
    }
  };
  
  // Handle goal selection
  const handleGoalToggle = (goalId: string) => {
    setFormData((prev) => {
      const currentGoals = [...prev.goals];
      if (currentGoals.includes(goalId)) {
        return { ...prev, goals: currentGoals.filter((id) => id !== goalId) };
      } else {
        return { ...prev, goals: [...currentGoals, goalId] };
      }
    });
    
    if (errors.goals) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.goals;
        return newErrors;
      });
    }
  };
  
  // Handle dietary restriction selection
  const handleDietaryRestrictionSelect = (restriction: string) => {
    setFormData((prev) => ({ ...prev, dietaryRestrictions: restriction }));
    if (errors.dietaryRestrictions) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.dietaryRestrictions;
        return newErrors;
      });
    }
  };
  
  // Validate current step
  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.age) newErrors.age = "გთხოვთ მიუთითოთ თქვენი ასაკი";
      else if (parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
        newErrors.age = "ასაკი უნდა იყოს 13-დან 120 წლამდე";
      }
      
      if (!formData.gender) newErrors.gender = "გთხოვთ აირჩიოთ სქესი";
    } else if (currentStep === 2) {
      if (!formData.weight) newErrors.weight = "გთხოვთ მიუთითოთ თქვენი წონა";
      else if (parseFloat(formData.weight) <= 0) {
        newErrors.weight = "წონა უნდა იყოს დადებითი რიცხვი";
      }
      
      if (!formData.height) newErrors.height = "გთხოვთ მიუთითოთ თქვენი სიმაღლე";
      else if (parseFloat(formData.height) <= 0) {
        newErrors.height = "სიმაღლე უნდა იყოს დადებითი რიცხვი";
      }
      
      if (!formData.activityLevel) newErrors.activityLevel = "გთხოვთ აირჩიოთ აქტიურობის დონე";
    } else if (currentStep === 3) {
      if (formData.goals.length === 0) newErrors.goals = "გთხოვთ აირჩიოთ მინიმუმ ერთი მიზანი";
      
      if (!formData.dietaryRestrictions) newErrors.dietaryRestrictions = "გთხოვთ აირჩიოთ კვებითი შეზღუდვა";
      else if (formData.dietaryRestrictions === "other" && !formData.otherDietaryRestrictions) {
        newErrors.otherDietaryRestrictions = "გთხოვთ მიუთითოთ თქვენი კვებითი შეზღუდვა";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      const finalDietaryRestrictions = 
        formData.dietaryRestrictions === "other" 
          ? formData.otherDietaryRestrictions 
          : formData.dietaryRestrictions;
      
      // Map selected goal IDs to human-readable strings
      const mappedGoals = formData.goals.map(goalId => {
        const goal = goalOptions.find(g => g.id === goalId);
        return goal?.label || goalId;
      });
      
      createProfile({
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goals: JSON.stringify(mappedGoals),
        dietaryRestrictions: finalDietaryRestrictions,
      });
    }
  };
  
  // Show loading state if checking authentication
  if (status === "loading") {
    return <LoadingState />;
  }
  
  return (
    <div className="container max-w-3xl py-8 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-left mb-4">
          <Link href="/better-me" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან Better Me-ზე
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">ჯანმრთელობის პროფილის შექმნა</h1>
          <p className="text-muted-foreground">
            შეავსეთ თქვენი ინფორმაცია პერსონალიზებული ჯანმრთელობის გეგმისთვის და რეკომენდაციებისთვის.
          </p>
        </div>
      </div>
      
      {/* Progress steps */}
      <div className="flex mb-8 max-w-2xl mx-auto">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex-1">
            <div
              className={`h-2 rounded-full ${
                step < currentStep
                  ? "bg-primary"
                  : step === currentStep
                  ? "bg-primary/60"
                  : "bg-muted"
              }`}
            />
            <div className="mt-2 text-center text-sm">
              {step < currentStep && <Check className="h-4 w-4 inline text-primary mr-1" />}
              {step === 1 && "პირადი ინფორმაცია"}
              {step === 2 && "ფიზიკური მონაცემები"}
              {step === 3 && "მიზნები და კვება"}
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-card max-w-2xl mx-auto">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">პირადი ინფორმაცია</h2>
            
            {/* Age Field */}
            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-medium">
                ასაკი <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md ${
                  errors.age ? "border-red-500" : "border-muted"
                }`}
                placeholder="მაგ: 25"
                min="13"
                max="120"
              />
              {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
            </div>
            
            {/* Gender Field */}
            <div className="space-y-2">
              <label htmlFor="gender" className="block text-sm font-medium">
                სქესი <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md bg-background text-foreground appearance-none ${
                  errors.gender ? "border-red-500" : "border-muted"
                }`}
              >
                <option value="">აირჩიეთ...</option>
                <option value="male">მამრობითი</option>
                <option value="female">მდედრობითი</option>
                <option value="other">სხვა</option>
                <option value="prefer_not_to_say">არ მსურს მითითება</option>
              </select>
              {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
            </div>
          </div>
        )}
        
        {/* Step 2: Physical Data */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">ფიზიკური მონაცემები</h2>
            
            {/* Weight & Height Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="weight" className="block text-sm font-medium">
                  წონა (კგ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-md ${
                    errors.weight ? "border-red-500" : "border-muted"
                  }`}
                  placeholder="მაგ: 70"
                  step="0.1"
                  min="0"
                />
                {errors.weight && <p className="text-red-500 text-sm">{errors.weight}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="height" className="block text-sm font-medium">
                  სიმაღლე (სმ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-md ${
                    errors.height ? "border-red-500" : "border-muted"
                  }`}
                  placeholder="მაგ: 175"
                  step="0.1"
                  min="0"
                />
                {errors.height && <p className="text-red-500 text-sm">{errors.height}</p>}
              </div>
            </div>
            
            {/* Activity Level */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                აქტიურობის დონე <span className="text-red-500">*</span>
              </label>
              
              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <div
                    key={level.id}
                    onClick={() => handleActivityLevelSelect(level.id)}
                    className={`p-4 border rounded-md cursor-pointer transition-colors ${
                      formData.activityLevel === level.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {level.icon}
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-muted-foreground">{level.description}</div>
                      </div>
                      
                      {formData.activityLevel === level.id && (
                        <div className="ml-auto">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.activityLevel && (
                <p className="text-red-500 text-sm">{errors.activityLevel}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Step 3: Goals & Diet */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium">მიზნები და კვებითი ჩვევები</h2>
            
            {/* Health Goals */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                ჯანმრთელობის მიზნები <span className="text-red-500">*</span>
                <span className="text-muted-foreground ml-2 font-normal">
                  (აირჩიეთ ყველა რაც შეესაბამება)
                </span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goalOptions.map((goal) => (
                  <div
                    key={goal.id}
                    onClick={() => handleGoalToggle(goal.id)}
                    className={`p-4 border rounded-md cursor-pointer transition-colors ${
                      formData.goals.includes(goal.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {goal.icon}
                      <div className="font-medium">{goal.label}</div>
                      
                      {formData.goals.includes(goal.id) && (
                        <div className="ml-auto">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.goals && <p className="text-red-500 text-sm">{errors.goals}</p>}
            </div>
            
            {/* Dietary Restrictions */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                კვებითი შეზღუდვები <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {dietaryRestrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    onClick={() => handleDietaryRestrictionSelect(restriction.id)}
                    className={`p-3 border rounded-md cursor-pointer text-center transition-colors ${
                      formData.dietaryRestrictions === restriction.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    {restriction.label}
                  </div>
                ))}
              </div>
              
              {formData.dietaryRestrictions === "other" && (
                <div className="mt-3">
                  <input
                    type="text"
                    id="otherDietaryRestrictions"
                    name="otherDietaryRestrictions"
                    value={formData.otherDietaryRestrictions}
                    onChange={handleChange}
                    className={`w-full p-3 border rounded-md ${
                      errors.otherDietaryRestrictions ? "border-red-500" : "border-muted"
                    }`}
                    placeholder="მიუთითეთ თქვენი კვებითი შეზღუდვები"
                  />
                  {errors.otherDietaryRestrictions && (
                    <p className="text-red-500 text-sm">{errors.otherDietaryRestrictions}</p>
                  )}
                </div>
              )}
              
              {errors.dietaryRestrictions && (
                <p className="text-red-500 text-sm">{errors.dietaryRestrictions}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 mt-6">
            {errors.submit}
          </div>
        )}
        
        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2 border rounded-md hover:bg-muted/50 min-w-[100px]"
            >
              უკან
            </button>
          ) : (
            <Link href="/better-me" className="px-5 py-2 border rounded-md hover:bg-muted/50 min-w-[100px] text-center">
              გაუქმება
            </Link>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 min-w-[100px]"
            >
              შემდეგი
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center min-w-[150px] justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  მიმდინარეობს...
                </>
              ) : (
                "პროფილის შექმნა"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}