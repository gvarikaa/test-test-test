"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  Scale,
  Moon,
  Calendar,
  Clock,
  Loader2,
  Camera,
  Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function TrackProgressPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/better-me/track-progress");
    },
  });
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight: "",
    energyLevel: 5,
    sleepQuality: 5,
    notes: "",
    photoUrl: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Fetch health profile
  const { data: healthProfile, isLoading: profileLoading } = api.health.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
    onSuccess: (data) => {
      if (data?.weight) {
        setFormData((prev) => ({ ...prev, weight: data.weight?.toString() || "" }));
      }
    },
  });
  
  // tRPC mutation
  const { mutate: createProgressRecord, isLoading: isSubmitting } = api.health.createProgressRecord.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/better-me/progress");
      }, 1500);
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });
  
  // Handle input change
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
  
  // Handle energy level change
  const handleEnergyLevelChange = (value: number) => {
    setFormData((prev) => ({ ...prev, energyLevel: value }));
  };
  
  // Handle sleep quality change
  const handleSleepQualityChange = (value: number) => {
    setFormData((prev) => ({ ...prev, sleepQuality: value }));
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.weight && parseFloat(formData.weight) <= 0) {
      newErrors.weight = "წონა უნდა იყოს დადებითი რიცხვი";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      createProgressRecord({
        date: new Date(formData.date),
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        energyLevel: formData.energyLevel,
        sleepQuality: formData.sleepQuality,
        notes: formData.notes || undefined,
        photoUrl: formData.photoUrl || undefined,
      });
    }
  };
  
  // Show loading state while checking authentication or loading profile
  if (status === "loading" || profileLoading) {
    return <LoadingState />;
  }
  
  // Render rating scale
  const renderRatingScale = (
    name: string,
    value: number,
    onChange: (value: number) => void,
    icon: React.ReactNode,
    title: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon}
          <label htmlFor={name} className="block text-sm font-medium ml-2">
            {title}
          </label>
        </div>
        <span className="font-medium">{value}/10</span>
      </div>
      
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="p-1 rounded-full hover:bg-muted/20 text-muted-foreground"
          aria-label="Decrease"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-1 mx-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${name === 'energyLevel' ? 'bg-yellow-500' : 'bg-indigo-500'}`}
              style={{ width: `${(value / 10) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => onChange(Math.min(10, value + 1))}
          className="p-1 rounded-full hover:bg-muted/20 text-muted-foreground"
          aria-label="Increase"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/better-me/progress" className="flex items-center text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან პროგრესზე
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">პროგრესის ჩაწერა</h1>
        <p className="text-muted-foreground">
          ჩაიწერეთ დღევანდელი პროგრესი თქვენი ჯანმრთელობის მაჩვენებლების თვალყურის დევნებისთვის.
        </p>
      </div>
      
      {/* Success message */}
      {isSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-md text-green-800 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          პროგრესი წარმატებით დაფიქსირდა! გადამისამართდებით...
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-6 bg-card">
        {/* Date Field */}
        <div className="space-y-2">
          <label htmlFor="date" className="flex items-center text-sm font-medium">
            <Calendar className="h-4 w-4 mr-2" />
            თარიღი
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-3 border rounded-md border-muted"
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        
        {/* Weight Field */}
        <div className="space-y-2">
          <label htmlFor="weight" className="flex items-center text-sm font-medium">
            <Scale className="h-4 w-4 mr-2" />
            წონა (კგ)
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
            placeholder="ჩაწერეთ თქვენი წონა"
            step="0.1"
            min="0"
          />
          {errors.weight && <p className="text-red-500 text-sm">{errors.weight}</p>}
        </div>
        
        {/* Energy Level Field */}
        {renderRatingScale(
          'energyLevel',
          formData.energyLevel,
          handleEnergyLevelChange,
          <Clock className="h-4 w-4 text-yellow-500" />,
          'ენერგიის დონე'
        )}
        
        {/* Sleep Quality Field */}
        {renderRatingScale(
          'sleepQuality',
          formData.sleepQuality,
          handleSleepQualityChange,
          <Moon className="h-4 w-4 text-indigo-500" />,
          'ძილის ხარისხი'
        )}
        
        {/* Notes Field */}
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium">
            შენიშვნები
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full p-3 border rounded-md border-muted h-24 resize-none"
            placeholder="ჩაწერეთ ნებისმიერი შენიშვნა თქვენი დღის შესახებ..."
          />
        </div>
        
        {/* Photo URL Field */}
        <div className="space-y-2">
          <label htmlFor="photoUrl" className="flex items-center text-sm font-medium">
            <Camera className="h-4 w-4 mr-2" />
            ფოტოს URL (არასავალდებულო)
          </label>
          <input
            type="text"
            id="photoUrl"
            name="photoUrl"
            value={formData.photoUrl}
            onChange={handleChange}
            className="w-full p-3 border rounded-md border-muted"
            placeholder="შეიყვანეთ ფოტოს URL"
          />
        </div>
        
        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 mt-6">
            {errors.submit}
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Link 
            href="/better-me/progress" 
            className="px-5 py-2 border rounded-md hover:bg-muted/50 mr-3"
          >
            გაუქმება
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                გთხოვთ მოიცადოთ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                პროგრესის შენახვა
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}