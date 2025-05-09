"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/api";
import { Loader2, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TokenTier {
  name: string;
  limit: number;
  price: string;
  features: string[];
}

export function TokenUsageDisplay() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Get token limit data from the server
  const { data, isLoading, refetch } = api.ai.getTokenLimit.useQuery();
  
  // Mutation to upgrade token tier
  const { mutate: upgradeTier } = api.ai.upgradeTokenTier.useMutation({
    onSuccess: () => {
      setIsUpgrading(false);
      refetch();
    },
  });

  const tiers: Record<string, TokenTier> = {
    FREE: {
      name: "Free",
      limit: 150,
      price: "Free",
      features: [
        "150 tokens daily",
        "Basic content analysis",
        "Limited chat interactions",
        "Basic health recommendations",
      ],
    },
    BASIC: {
      name: "Basic",
      limit: 1000,
      price: "$4.99/month",
      features: [
        "1,000 tokens daily",
        "Full content analysis",
        "Standard chat interactions",
        "Detailed health recommendations",
        "Priority response time",
      ],
    },
    PRO: {
      name: "Pro",
      limit: 5000,
      price: "$9.99/month",
      features: [
        "5,000 tokens daily",
        "Advanced content analysis with trends",
        "Premium chat with context memory",
        "Comprehensive health plans",
        "Access to Gemini 2.5 model",
      ],
    },
    ENTERPRISE: {
      name: "Enterprise",
      limit: 10000,
      price: "$24.99/month",
      features: [
        "10,000 tokens daily",
        "Unlimited content analysis",
        "Advanced AI features",
        "Dedicated AI support",
        "Custom integrations",
        "Team sharing features",
      ],
    },
  };

  const handleUpgrade = (tier: string) => {
    setSelectedTier(tier);
    setIsUpgrading(true);
    
    // In a real app, this would redirect to a payment page
    // For this demo, we'll just simulate an upgrade after a delay
    setTimeout(() => {
      upgradeTier({ tier: tier as "BASIC" | "PRO" | "ENTERPRISE" });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-muted/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span>Loading token information...</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { tier, limit, usage, resetAt } = data;
  const currentTier = tiers[tier];
  const remainingTokens = limit - usage;
  const usagePercentage = Math.min(100, Math.round((usage / limit) * 100));
  const timeToReset = resetAt ? formatDistanceToNow(new Date(resetAt)) : "24 hours";

  return (
    <div className="p-4 border rounded-lg bg-muted/10">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 text-primary mr-2" />
          <h3 className="font-medium">Gemini AI Tokens</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">{`${usage}/${limit} used`}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{`${tier} Tier`}</span>
              <span className={remainingTokens < limit * 0.1 ? "text-red-500" : ""}>{`${remainingTokens} tokens remaining`}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  usagePercentage > 90 ? "bg-red-500" : 
                  usagePercentage > 75 ? "bg-yellow-500" : 
                  "bg-primary"
                }`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{`Resets in ${timeToReset}`}</p>
          </div>

          {/* Current plan features */}
          <div>
            <h4 className="font-medium mb-2">{`Your ${currentTier.name} Plan`}</h4>
            <ul className="space-y-1">
              {currentTier.features.map((feature, index) => (
                <li key={index} className="text-sm flex items-start">
                  <span className="mr-2">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade options */}
          {tier !== "ENTERPRISE" && (
            <div>
              <h4 className="font-medium mb-2">Upgrade Options</h4>
              <div className="grid gap-2">
                {Object.entries(tiers)
                  .filter(([key]) => {
                    // Show only higher tiers than the current one
                    const tierOrder = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
                    return tierOrder.indexOf(key) > tierOrder.indexOf(tier);
                  })
                  .map(([key, tierData]) => (
                    <div key={key} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{tierData.name}</span>
                        <span className="text-sm">{tierData.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{`${tierData.limit} tokens daily`}</p>
                      {isUpgrading && selectedTier === key ? (
                        <button
                          disabled
                          className="w-full py-1 px-3 bg-primary/50 text-primary-foreground rounded-md text-sm flex items-center justify-center"
                        >
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(key)}
                          className="w-full py-1 px-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * This is a demo. No actual payments will be processed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}