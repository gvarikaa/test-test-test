"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/trpc/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  User, 
  MessageCircleMore, 
  ChevronRight,
  HeartPulse,
  CookingPot,
  Dumbbell,
  CalendarCheck,
  Loader2,
  InfoIcon,
  ArrowUpFromLine,
  Crown
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const LoadingState = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-pulse h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
      <HeartPulse className="text-primary h-10 w-10 animate-pulse" />
    </div>
    <p className="mt-4 text-muted-foreground">ინფორმაციის ჩატვირთვა...</p>
  </div>
);

const PremiumBadge = () => (
  <div className="inline-flex items-center px-2 py-0.5 text-xs bg-gradient-to-r from-amber-500 to-yellow-300 rounded text-black font-medium">
    <Crown className="h-3 w-3 mr-1" />
    Premium
  </div>
);

export default function HealthChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // tRPC hooks
  const { data: tokenInfo, isLoading: tokenLoading } = api.ai.getTokenLimit.useQuery();
  const { data: healthProfile, isLoading: profileLoading } = api.health.getProfile.useQuery();
  
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "გამარჯობა! მე ვარ Better Me AI ასისტენტი. როგორ შემიძლია დაგეხმაროთ ჯანმრთელობისა და კეთილდღეობის საკითხებში?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat mutation
  const { mutate: sendMessage } = api.ai.chatWithAssistant.useMutation({
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: (data) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, newMessage]);
      setIsLoading(false);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `ბოდიში, მოხდა შეცდომა: ${error.message}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    },
  });
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Handle redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/better-me/chat");
    }
  }, [status, router]);
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return;
    
    // Add user message to state
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    // Get previous messages for context (up to last 5 messages)
    const contextMessages = messages
      .slice(-5)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    
    // Send message to API
    sendMessage({
      message: input,
      context: contextMessages,
    });
  };
  
  // Handle input keypress
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Suggested questions
  const suggestedQuestions = [
    "როგორ გავაუმჯობესო ჩემი ძილის ხარისხი?",
    "რა სახის ვარჯიშებია საუკეთესო წონაში კლებისთვის?",
    "რას ურჩევდით სტრესის შესამცირებლად?",
    "რა საკვები პროდუქტები დამეხმარება ენერგიის დონის გაზრდაში?",
    "როგორ უნდა შევისწავლო ჩემი დღიური კალორიების რაოდენობა?",
  ];
  
  // Show loading state while checking authentication or loading profile
  if (status === "loading" || profileLoading || tokenLoading) {
    return <LoadingState />;
  }
  
  // Redirect to create profile if no profile exists
  if (status === "authenticated" && !profileLoading && !healthProfile) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <Link href="/better-me" className="flex items-center text-muted-foreground mb-4 hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან Better Me-ზე
          </Link>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16 px-4 border rounded-lg bg-muted/10 text-center">
          <HeartPulse className="h-16 w-16 text-primary/50 mb-6" />
          <h2 className="text-2xl font-medium mb-2">ჯერ არ გაქვთ ჯანმრთელობის პროფილი</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            AI ასისტენტთან სასაუბროდ საჭიროა პირველად შექმნათ ჯანმრთელობის პროფილი.
          </p>
          <Link 
            href="/better-me/create-profile" 
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center"
          >
            პროფილის შექმნა
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-1/4 space-y-6">
          <div>
            <Link href="/better-me" className="flex items-center text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              უკან Better Me-ზე
            </Link>
            
            <h1 className="text-2xl font-bold mb-1">ჯანმრთელობის AI ასისტენტი</h1>
            <p className="text-muted-foreground text-sm">
              დასვით კითხვები და მიიღეთ პერსონალიზებული რჩევები ჯანმრთელობასა და კეთილდღეობაზე.
            </p>
          </div>
          
          {/* Token usage */}
          {tokenInfo && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">AI ტოკენების გამოყენება</h3>
                {tokenInfo.tier !== "FREE" && <PremiumBadge />}
              </div>
              
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${(tokenInfo.usage / tokenInfo.limit) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span>{tokenInfo.usage} / {tokenInfo.limit}</span>
                <span className="text-muted-foreground">განახლდება {new Date(tokenInfo.resetAt).toLocaleDateString()}</span>
              </div>
              
              {tokenInfo.tier === "FREE" && (
                <Link href="/better-me/upgrade" className="block mt-2 text-sm text-primary hover:underline">
                  გააუმჯობესეთ მეტი ტოკენისთვის
                </Link>
              )}
            </div>
          )}
          
          {/* Quick links */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/10 px-4 py-3">
              <h3 className="font-medium">სწრაფი ბმულები</h3>
            </div>
            
            <div className="divide-y">
              <Link href="/better-me/meal-plans" className="flex items-center justify-between p-3 hover:bg-muted/5">
                <div className="flex items-center">
                  <CookingPot className="h-5 w-5 mr-3 text-muted-foreground" />
                  <span>კვების გეგმები</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              
              <Link href="/better-me/workouts" className="flex items-center justify-between p-3 hover:bg-muted/5">
                <div className="flex items-center">
                  <Dumbbell className="h-5 w-5 mr-3 text-muted-foreground" />
                  <span>ვარჯიშის რუტინები</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              
              <Link href="/better-me/progress" className="flex items-center justify-between p-3 hover:bg-muted/5">
                <div className="flex items-center">
                  <CalendarCheck className="h-5 w-5 mr-3 text-muted-foreground" />
                  <span>პროგრესის თვალყურის დევნება</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="border rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                ჩვენი AI ასისტენტი გთავაზობთ ზოგად რჩევებს. ეს არ არის სამედიცინო რჩევის ჩანაცვლება. ყოველთვის გაიარეთ კონსულტაცია ჯანდაცვის სპეციალისტთან.
              </p>
            </div>
          </div>
        </div>
        
        {/* Chat area */}
        <div className="md:w-3/4 border rounded-lg flex flex-col h-[70vh]">
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary/10 rounded-l-lg rounded-tr-lg"
                      : "bg-muted/10 rounded-r-lg rounded-tl-lg"
                  } p-3`}
                >
                  <div className="flex-shrink-0 mr-3">
                    {message.role === "user" ? (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <MessageCircleMore className="h-4 w-4 text-indigo-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted/10 rounded-r-lg rounded-tl-lg p-3 flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <MessageCircleMore className="h-4 w-4 text-indigo-500" />
                    </div>
                  </div>
                  <Loader2 className="animate-spin h-5 w-5 text-primary" />
                </div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Suggested questions (show only when conversation is new) */}
          {messages.length <= 2 && (
            <div className="border-t p-4">
              <p className="text-sm font-medium mb-2">შემოთავაზებული კითხვები:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="text-sm py-1 px-3 bg-muted/20 rounded-full hover:bg-muted/30 truncate max-w-full"
                    onClick={() => {
                      setInput(question);
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Input area */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                className="flex-1 p-3 border rounded-md resize-none h-[70px] focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="დაწერეთ თქვენი შეკითხვა..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`px-4 self-end h-[46px] rounded-md flex items-center justify-center ${
                  !input.trim() || isLoading
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {tokenInfo && tokenInfo.usage >= tokenInfo.limit && (
              <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                <InfoIcon className="h-4 w-4" />
                თქვენ მიაღწიეთ დღიური ტოკენების ლიმიტს. 
                <Link href="/better-me/upgrade" className="underline font-medium">
                  აწარმოეთ აფგრეიდი
                </Link> მეტი ფუნქციონალისთვის.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}