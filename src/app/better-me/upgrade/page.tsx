"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  X, 
  Sparkles,
  Loader2,
  LucideShoppingBag,
  Crown,
  Zap,
  Lock,
  Rocket,
  HeartPulse
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-pulse h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
      <CreditCard className="text-primary h-10 w-10 animate-pulse" />
    </div>
    <p className="mt-4 text-muted-foreground">ინფორმაციის ჩატვირთვა...</p>
  </div>
);

// Plan card component
interface PlanProps {
  title: string;
  price: string;
  tokenLimit: number;
  features: string[];
  popular?: boolean;
  onSelect: () => void;
  currentPlan?: boolean;
  disabled?: boolean;
}

const PlanCard = ({ 
  title, 
  price, 
  tokenLimit, 
  features, 
  popular, 
  onSelect, 
  currentPlan, 
  disabled 
}: PlanProps) => (
  <div className={`border rounded-lg overflow-hidden ${
    popular ? 'ring-2 ring-primary' : ''
  }`}>
    {popular && (
      <div className="bg-primary text-primary-foreground py-1 px-4 text-xs font-medium text-center">
        პოპულარული არჩევანი
      </div>
    )}
    
    <div className="p-6">
      <h3 className="text-xl font-bold mb-2 flex items-center">
        {title}
        {title !== "FREE" && <Crown className="ml-2 h-4 w-4 text-amber-400" />}
      </h3>
      
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        {price !== "უფასო" && <span className="text-muted-foreground"> / თვეში</span>}
      </div>
      
      <div className="bg-muted/10 px-4 py-2 rounded-md text-center mb-6">
        <span className="text-sm text-muted-foreground">დღიური ტოკენები:</span> <br />
        <span className="font-semibold">{tokenLimit}</span>
      </div>
      
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={onSelect}
        disabled={currentPlan || disabled}
        className={`w-full py-2 rounded-md flex justify-center items-center ${
          currentPlan
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 cursor-default'
            : disabled
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {currentPlan ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            მიმდინარე პაკეტი
          </>
        ) : (
          'აირჩიეთ პაკეტი'
        )}
      </button>
    </div>
  </div>
);

export default function UpgradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Fetch token info
  const { 
    data: tokenInfo, 
    isLoading: tokenLoading, 
    refetch: refetchTokenInfo
  } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: false,
  });
  
  // Upgrade mutation
  const { mutate: upgrade } = api.ai.upgradeTokenTier.useMutation({
    onMutate: () => {
      setIsProcessing(true);
      setError(null);
    },
    onSuccess: () => {
      setIsProcessing(false);
      setSuccess(true);
      refetchTokenInfo();
      
      // Redirect after success
      setTimeout(() => {
        router.push("/better-me");
      }, 2000);
    },
    onError: (err) => {
      setIsProcessing(false);
      setError(err.message);
    },
  });
  
  // Handle plan selection
  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
  };
  
  // Handle upgrade
  const handleUpgrade = () => {
    if (!selectedPlan) return;
    
    // In a real app, this would process payment first
    upgrade({ tier: selectedPlan as "BASIC" | "PRO" | "ENTERPRISE" });
  };
  
  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/better-me/upgrade");
  }
  
  // Show loading state while checking authentication or loading token info
  if (status === "loading" || tokenLoading) {
    return <LoadingState />;
  }
  
  // Current plan
  const currentPlan = tokenInfo?.tier || "FREE";
  
  // Plans data
  const plans = [
    {
      id: "FREE",
      title: "FREE",
      price: "უფასო",
      tokenLimit: 150,
      features: [
        "დღეში 150 AI ტოკენი",
        "წვდომა AI ჯანმრთელობის ასისტენტზე",
        "ძირითადი საკვების და ვარჯიშის გეგმები",
        "პროგრესის თვალყურის დევნება"
      ],
    },
    {
      id: "BASIC",
      title: "BASIC",
      price: "10₾",
      tokenLimit: 1000,
      features: [
        "დღეში 1000 AI ტოკენი",
        "პერსონალიზებული კვების გეგმები",
        "პერსონალიზებული ვარჯიშის გეგმები",
        "რეცეპტების სრული ბიბლიოთეკა",
        "პროგრესის გაფართოებული ანალიზი"
      ],
      popular: true,
    },
    {
      id: "PRO",
      title: "PRO",
      price: "25₾",
      tokenLimit: 5000,
      features: [
        "დღეში 5000 AI ტოკენი",
        "შეუზღუდავი AI ჯანმრთელობის ასისტენტი",
        "დეტალური კვების ანალიზი",
        "ექსპერტის მიერ შექმნილი გეგმები",
        "პერსონალიზებული რჩევები",
        "ექსკლუზიური კონტენტი"
      ],
    },
    {
      id: "ENTERPRISE",
      title: "ENTERPRISE",
      price: "50₾",
      tokenLimit: 10000,
      features: [
        "დღეში 10000 AI ტოკენი",
        "ყველა PRO ფუნქცია",
        "პერსონალური კოუჩინგი",
        "მოწინავე ჯანმრთელობის ანალიზი",
        "პრიორიტეტული ტექ. მხარდაჭერა",
        "API ინტეგრაციები"
      ],
    },
  ];
  
  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/better-me" className="flex items-center text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან Better Me-ზე
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">პაკეტის განახლება</h1>
        <p className="text-muted-foreground max-w-3xl">
          განაახლეთ თქვენი Better Me გამოცდილება დამატებითი AI ტოკენებით, პერსონალიზებული გეგმებით და 
          გაფართოებული ფუნქციებით. აირჩიეთ თქვენთვის შესაფერისი პაკეტი.
        </p>
      </div>
      
      {/* Current plan info */}
      <div className="mb-12 border rounded-lg p-6 bg-card max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium mb-1">თქვენი მიმდინარე პაკეტი</h2>
            <div className="flex items-center">
              <span className="font-bold text-xl mr-2">{currentPlan}</span>
              {currentPlan !== "FREE" && <Crown className="h-4 w-4 text-amber-400" />}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">AI ტოკენები</div>
            <div>
              <span className="font-medium">{tokenInfo?.usage}</span>
              <span className="text-muted-foreground"> / {tokenInfo?.limit}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary" 
            style={{ width: `${(tokenInfo?.usage || 0) / (tokenInfo?.limit || 1) * 100}%` }}
          />
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          განახლება მოხდება {new Date(tokenInfo?.resetAt || "").toLocaleDateString('ka-GE')}
        </div>
      </div>
      
      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            title={plan.title}
            price={plan.price}
            tokenLimit={plan.tokenLimit}
            features={plan.features}
            popular={plan.popular}
            currentPlan={currentPlan === plan.id}
            onSelect={() => handleSelectPlan(plan.id)}
            disabled={isProcessing}
          />
        ))}
      </div>
      
      {/* Action panel */}
      {selectedPlan && selectedPlan !== currentPlan && (
        <div className="border rounded-lg p-6 bg-card max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-4">პაკეტის განახლება</h3>
          
          <div className="flex items-center p-4 bg-muted/10 rounded-lg mb-6">
            <div className="mr-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="font-medium mb-1">
                განახლება პაკეტზე: {selectedPlan}
              </p>
              <p className="text-sm text-muted-foreground">
                მიიღეთ წვდომა მეტ ფუნქციონალზე და გაზარდეთ თქვენი ყოველდღიური AI ტოკენების ლიმიტი.
              </p>
            </div>
          </div>
          
          {error && (
            <div className="p-4 mb-6 bg-red-100 border border-red-300 rounded-md text-red-800 flex items-start">
              <X className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 mb-6 bg-green-100 border border-green-300 rounded-md text-green-800 flex items-start">
              <Check className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>პაკეტი წარმატებით განახლდა! გადამისამართდებით...</p>
            </div>
          )}
          
          {/* Payment form would go here in a real app */}
          <div className="border rounded-md p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">სიმულირებული გადახდა</h4>
              <div className="flex">
                <CreditCard className="h-5 w-5 text-muted-foreground mr-1" />
                <LucideShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              ეს არის სიმულირებული გადახდის პროცესი საჩვენებელი მიზნით. რეალურ აპლიკაციაში, 
              აქ იქნებოდა ბარათის დეტალების ფორმა და უსაფრთხო გადახდის პროცესორი.
            </p>
            
            {/* Dummy credit card fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <div className="border rounded p-2 bg-muted/10 text-muted-foreground text-sm text-center">
                  **** **** **** 1234
                </div>
              </div>
              <div>
                <div className="border rounded p-2 bg-muted/10 text-muted-foreground text-sm text-center">
                  12/25
                </div>
              </div>
              <div>
                <div className="border rounded p-2 bg-muted/10 text-muted-foreground text-sm text-center">
                  ***
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedPlan(null)}
              className="px-4 py-2 border rounded-md mr-3 hover:bg-muted/10"
              disabled={isProcessing || success}
            >
              გაუქმება
            </button>
            
            <button
              onClick={handleUpgrade}
              disabled={isProcessing || success}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  მიმდინარეობს...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  დაადასტურეთ განახლება
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Benefits section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Premium სარგებელი</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border rounded-lg p-5">
            <div className="p-2 w-fit rounded-full bg-primary/10 text-primary mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium mb-2">მეტი AI ტოკენი</h3>
            <p className="text-muted-foreground">
              მიიღეთ წვდომა მეტ ყოველდღიურ AI ტოკენზე პერსონალიზებული რეკომენდაციებისთვის და ასისტენტთან უფრო ხანგრძლივი საუბრებისთვის.
            </p>
          </div>
          
          <div className="border rounded-lg p-5">
            <div className="p-2 w-fit rounded-full bg-primary/10 text-primary mb-4">
              <HeartPulse className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium mb-2">გაუმჯობესებული გეგმები</h3>
            <p className="text-muted-foreground">
              მიიღეთ მეტად პერსონალიზებული კვების და ვარჯიშის გეგმები ექსპერტების რეკომენდაციებით და დეტალური ინსტრუქციებით.
            </p>
          </div>
          
          <div className="border rounded-lg p-5">
            <div className="p-2 w-fit rounded-full bg-primary/10 text-primary mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium mb-2">ექსკლუზიური ფუნქციები</h3>
            <p className="text-muted-foreground">
              მიიღეთ წვდომა ექსკლუზიურ კონტენტზე, დეტალურ ანალიზზე და პრემიუმ მომხმარებლებისთვის განკუთვნილ ფუნქციებზე.
            </p>
          </div>
          
          <div className="border rounded-lg p-5">
            <div className="p-2 w-fit rounded-full bg-primary/10 text-primary mb-4">
              <Rocket className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium mb-2">უკეთესი შედეგები</h3>
            <p className="text-muted-foreground">
              მიაღწიეთ თქვენს მიზნებს უფრო სწრაფად პროფესიონალური მხარდაჭერით და კარგად გააზრებული გეგმებით.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}