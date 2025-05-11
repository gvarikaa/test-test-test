"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  BarChart,
  MessageSquare,
  FileText
} from 'lucide-react';

export default function SuccessPage() {
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    // Auto-redirect countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.href = '/ai-settings/tokens';
    }
  }, [countdown]);

  return (
    <div className="container max-w-3xl py-16 px-4 sm:px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Subscription Confirmed!</h1>
        <p className="text-lg text-text-secondary mb-6">
          Thank you for upgrading your AI token package. Your account has been updated with the new token allocation.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm">Your tokens are ready to use</span>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Try Advanced AI Features</h3>
              <p className="text-text-secondary text-sm mb-2">
                Explore the enhanced AI capabilities available with your new subscription tier.
              </p>
              <Link 
                href="/ai-settings/tokens/features" 
                className="text-primary text-sm flex items-center hover:underline"
              >
                View all features
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <BarChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">View Your Usage Analytics</h3>
              <p className="text-text-secondary text-sm mb-2">
                Monitor your token usage and see detailed analytics of your AI interactions.
              </p>
              <Link 
                href="/ai-analytics" 
                className="text-primary text-sm flex items-center hover:underline"
              >
                Go to Analytics Dashboard
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Chat with AI Assistant</h3>
              <p className="text-text-secondary text-sm mb-2">
                Experience improved AI chat capabilities with enhanced context memory.
              </p>
              <Link 
                href="/better-me/chat" 
                className="text-primary text-sm flex items-center hover:underline"
              >
                Start chatting
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">View Subscription Details</h3>
              <p className="text-text-secondary text-sm mb-2">
                Review your subscription details, billing information, and token allocation.
              </p>
              <Link 
                href="/ai-settings/tokens" 
                className="text-primary text-sm flex items-center hover:underline"
              >
                View subscription
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-text-secondary mb-4">
          Redirecting to token dashboard in {countdown} seconds...
        </p>
        <Link 
          href="/ai-settings/tokens" 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90"
        >
          Go to Dashboard Now
        </Link>
      </div>
      
      <div className="mt-12 px-4 py-3 bg-card-secondary-bg rounded-lg text-sm text-text-secondary text-center">
        <p>
          Need help with your subscription? Contact support at <a href="mailto:support@dapdip.com" className="text-primary hover:underline">support@dapdip.com</a>
        </p>
      </div>
    </div>
  );
}