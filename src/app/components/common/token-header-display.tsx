"use client";

import { useState } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Brain, Loader2, ChevronDown, ChevronUp, Sparkles, Zap } from 'lucide-react';
import TokenUsageDisplay from './token-usage-display';

export default function TokenHeaderDisplay() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Get token limit data
  const { data: tokenLimit, isLoading } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="relative flex items-center gap-1 h-8 ml-3">
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
      </div>
    );
  }

  if (!tokenLimit) {
    return null;
  }

  const { tier, limit, usage, preferredModel, monthlyAllocation, previousMonthCarry, bonusTokens } = tokenLimit;
  const remainingTokens = limit - usage;
  const percentUsed = Math.min(100, Math.round((usage / limit) * 100));

  // Determine color based on percentage used
  const getUsageColor = () => {
    if (percentUsed < 50) return 'bg-green-500';
    if (percentUsed < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTierBadgeColor = () => {
    switch (tier) {
      case 'FREE': return 'bg-zinc-500 text-white';
      case 'BASIC': return 'bg-blue-500 text-white';
      case 'PRO': return 'bg-purple-500 text-white';
      case 'ENTERPRISE': return 'bg-yellow-500 text-black';
      case 'CUSTOM': return 'bg-gradient-to-r from-purple-600 to-pink-500 text-white';
      default: return 'bg-zinc-500 text-white';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center rounded-md border px-2 py-1 hover:bg-card transition-all"
      >
        <Brain className="h-4 w-4 mr-1.5 text-primary" />
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`text-xs px-1.5 py-0.5 rounded-sm font-semibold ${getTierBadgeColor()}`}>
              {tier}
            </span>
            {preferredModel && (
              <span className="ml-1 text-[10px] bg-zinc-700 text-white px-1 rounded">
                {preferredModel.replace('GEMINI_', '').replace('_PRO', '')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor()} transition-all duration-300`}
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
            <span className="text-xs whitespace-nowrap">
              {remainingTokens.toLocaleString()}
            </span>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 md:w-96 rounded-md border bg-card shadow-lg">
          <div className="p-3 border-b border-border flex justify-between items-center">
            <div className="text-sm font-semibold">Token Overview</div>
            <Link href="/ai-settings/tokens" className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Packages
            </Link>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Current allocation */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Today's Usage:</span>
              <span className="text-sm font-medium">{usage.toLocaleString()} / {limit.toLocaleString()}</span>
            </div>
            
            {/* Monthly allocation */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Monthly Allocation:</span>
              <span className="text-sm font-medium">{monthlyAllocation.toLocaleString()}</span>
            </div>
            
            {/* Carryover tokens */}
            {previousMonthCarry > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Carried Over:</span>
                <span className="text-sm font-medium text-green-500">+{previousMonthCarry.toLocaleString()}</span>
              </div>
            )}
            
            {/* Bonus tokens */}
            {bonusTokens > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bonus Tokens:</span>
                <span className="text-sm font-medium text-amber-500">+{bonusTokens.toLocaleString()}</span>
              </div>
            )}
            
            {/* Current model */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current Model:</span>
              <span className="text-xs bg-zinc-700 text-white px-1.5 py-0.5 rounded">
                {preferredModel ? preferredModel.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro') : 'Auto-select'}
              </span>
            </div>
            
            {/* Quick links */}
            <div className="flex justify-between gap-2 mt-2">
              <Link 
                href="/ai-analytics" 
                className="flex-1 bg-card-secondary-bg hover:bg-hover-bg py-1.5 rounded text-center text-xs"
              >
                Usage Analytics
              </Link>
              <Link 
                href="/ai-settings/tokens/purchase" 
                className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-center text-xs flex items-center justify-center"
              >
                <Zap className="h-3 w-3 mr-1" />
                Get More Tokens
              </Link>
            </div>
          </div>
          
          {/* Full token usage display */}
          <div className="p-3 pt-0">
            <TokenUsageDisplay compact={true} showDetails={false} className="mt-2" />
          </div>
        </div>
      )}
    </div>
  );
}