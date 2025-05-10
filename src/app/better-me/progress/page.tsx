"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  LineChart, 
  ArrowUp,
  ArrowDown,
  Minus,
  Scale,
  Clock,
  Moon,
  Loader2,
  Camera,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";

// Loading state component
const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-pulse h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
      <LineChart className="text-primary h-10 w-10 animate-pulse" />
    </div>
    <p className="mt-4 text-muted-foreground">ინფორმაციის ჩატვირთვა...</p>
  </div>
);

// No progress state component
const NoProgressState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 border rounded-lg bg-muted/10 text-center">
    <LineChart className="h-16 w-16 text-primary/50 mb-6" />
    <h2 className="text-2xl font-medium mb-2">პროგრესის ჩანაწერები არ არის</h2>
    <p className="text-muted-foreground mb-8 max-w-md">
      დაიწყეთ თქვენი პროგრესის თვალყურის დევნება, რათა ნახოთ თქვენი მიღწევები დროთა განმავლობაში.
    </p>
    <Link 
      href="/better-me/track-progress" 
      className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
    >
      <Plus className="mr-2 h-5 w-5" />
      პროგრესის ჩაწერა
    </Link>
  </div>
);

// Progress trend icon component
const TrendIcon = ({ trend }: { trend: string }) => {
  switch (trend) {
    case 'increasing':
      return <ArrowUp className="h-4 w-4 text-red-500" />;
    case 'decreasing':
      return <ArrowDown className="h-4 w-4 text-green-500" />;
    default:
      return <Minus className="h-4 w-4 text-yellow-500" />;
  }
};

// Interface for progress record
interface ProgressRecord {
  id: string;
  date: Date;
  weight?: number;
  energyLevel?: number;
  sleepQuality?: number;
  notes?: string;
  photoUrl?: string;
}

// Interface for progress stats
interface ProgressStats {
  totalRecords: number;
  weightChangeTrend: string;
  averageEnergyLevel: number;
  averageSleepQuality: number;
  trackingDays: number;
  firstRecordDate: Date | null;
  latestRecordDate: Date | null;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch health profile and progress records
  const { data: healthProfile, isLoading: profileLoading } = api.health.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: false,
  });
  
  const { data: progressRecords, isLoading: recordsLoading } = api.health.getProgressRecords.useQuery({
    limit: 30,
  }, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: false,
  });
  
  const { data: progressStats, isLoading: statsLoading } = api.health.getProgressStats.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: false,
  });
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} დღის წინ`;
    } else {
      return `${hours} საათის წინ`;
    }
  };
  
  // Navigate to previous month
  const previousMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date);
  };
  
  // Navigate to next month
  const nextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date);
  };
  
  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/better-me/progress");
  }
  
  // Show loading state while checking authentication or loading data
  if (status === "loading" || profileLoading || recordsLoading || statsLoading) {
    return <LoadingState />;
  }
  
  // Get records data
  const records = progressRecords?.items || [];
  const stats = progressStats || {
    totalRecords: 0,
    weightChangeTrend: 'stable',
    averageEnergyLevel: 0,
    averageSleepQuality: 0,
    trackingDays: 0,
    firstRecordDate: null,
    latestRecordDate: null,
  };
  
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/better-me" className="flex items-center text-muted-foreground mb-2 hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან Better Me-ზე
          </Link>
          
          <h1 className="text-3xl font-bold">პროგრესის თვალყურის დევნება</h1>
          <p className="text-muted-foreground">თვალყური ადევნეთ თქვენს ჯანმრთელობის მაჩვენებლებს დროთა განმავლობაში</p>
        </div>
        
        <Link 
          href="/better-me/track-progress" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          დღევანდელი ჩანაწერი
        </Link>
      </div>
      
      {/* Main content */}
      {records.length === 0 ? (
        <NoProgressState />
      ) : (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight trend card */}
            <div className="border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-3">
                    <Scale className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium">წონის ტენდენცია</h3>
                </div>
                <TrendIcon trend={stats.weightChangeTrend} />
              </div>
              
              <div className="mt-3">
                <div className="text-sm text-muted-foreground mb-1">მიმდინარე წონა</div>
                <div className="text-2xl font-semibold">
                  {healthProfile?.weight ? `${healthProfile.weight} კგ` : 'არ არის მითითებული'}
                </div>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {stats.weightChangeTrend === 'increasing' && 'წონა იზრდება'}
                {stats.weightChangeTrend === 'decreasing' && 'წონა მცირდება'}
                {stats.weightChangeTrend === 'stable' && 'წონა სტაბილურია'}
              </div>
            </div>
            
            {/* Energy level card */}
            <div className="border rounded-lg p-5 bg-card">
              <div className="flex items-center mb-2">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-3">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-medium">ენერგიის დონე</h3>
              </div>
              
              <div className="mt-3">
                <div className="text-sm text-muted-foreground mb-1">საშუალო შეფასება</div>
                <div className="text-2xl font-semibold">
                  {stats.averageEnergyLevel.toFixed(1)}/10
                </div>
              </div>
              
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-yellow-500" 
                  style={{ width: `${(stats.averageEnergyLevel / 10) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Sleep quality card */}
            <div className="border rounded-lg p-5 bg-card">
              <div className="flex items-center mb-2">
                <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3">
                  <Moon className="h-5 w-5" />
                </div>
                <h3 className="font-medium">ძილის ხარისხი</h3>
              </div>
              
              <div className="mt-3">
                <div className="text-sm text-muted-foreground mb-1">საშუალო შეფასება</div>
                <div className="text-2xl font-semibold">
                  {stats.averageSleepQuality.toFixed(1)}/10
                </div>
              </div>
              
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${(stats.averageSleepQuality / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Calendar view */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">კალენდარი</h2>
              
              <div className="flex items-center">
                <button
                  onClick={previousMonth}
                  className="p-1 rounded-full hover:bg-muted/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="mx-2 font-medium">
                  {currentMonth.toLocaleString('ka-GE', { month: 'long', year: 'numeric' })}
                </div>
                
                <button
                  onClick={nextMonth}
                  className="p-1 rounded-full hover:bg-muted/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Calendar placeholder - Here you'd implement an actual calendar view */}
            <div className="border rounded-lg p-4 bg-muted/5 text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                კალენდრის ხედი შეიცავს თქვენი პროგრესის ჩანაწერების ვიზუალიზაციას
              </p>
            </div>
          </div>
          
          {/* Recent records */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-medium mb-4">ბოლო ჩანაწერები</h2>
            
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(record.date)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({getTimeAgo(record.date)})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        {record.weight && (
                          <div>
                            <span className="text-muted-foreground">წონა:</span>{" "}
                            {record.weight} კგ
                          </div>
                        )}
                        
                        {record.energyLevel && (
                          <div>
                            <span className="text-muted-foreground">ენერგია:</span>{" "}
                            {record.energyLevel}/10
                          </div>
                        )}
                        
                        {record.sleepQuality && (
                          <div>
                            <span className="text-muted-foreground">ძილი:</span>{" "}
                            {record.sleepQuality}/10
                          </div>
                        )}
                      </div>
                      
                      {record.notes && (
                        <div className="mt-3 text-sm">
                          <div className="text-muted-foreground font-medium mb-1">შენიშვნები:</div>
                          <p>{record.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    {record.photoUrl && (
                      <div className="flex-shrink-0 ml-4">
                        <div className="w-16 h-16 rounded-md bg-muted/20 flex items-center justify-center">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {records.length > 5 && (
              <div className="mt-4 text-center">
                <Link 
                  href="/better-me/progress/history" 
                  className="text-primary hover:underline text-sm font-medium inline-flex items-center"
                >
                  ყველა ჩანაწერის ნახვა
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
          
          {/* Tips/Summary */}
          <div className="border rounded-lg p-5 bg-muted/5">
            <p className="text-sm text-muted-foreground">
              თქვენ აკეთებთ თქვენი პროგრესის თვალყურის დევნებას {stats.trackingDays} დღის განმავლობაში. 
              რეგულარული ჩანაწერების წარმოება დაგეხმარებათ თქვენი ჯანმრთელობის მიზნების მიღწევაში და პროგრესის ვიზუალიზაციაში.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}