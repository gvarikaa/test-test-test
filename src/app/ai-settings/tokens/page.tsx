"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import {
  Zap,
  Check,
  Brain,
  Clock,
  Sparkles,
  CircleDollarSign,
  Rocket,
  ArrowRight,
  Shield,
  BarChart,
  ChevronRight,
  Crown,
  Loader2,
  Info,
  Download,
  PieChart,
  LineChart,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import TokenUsageDisplay from '@/app/components/common/token-usage-display';
import { formatDistanceToNow } from 'date-fns';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  period: string;
  tokenAmount: number;
  costPerPeriod: number;
  currency: string;
  description: string | null;
  features: string[];
  carryOverPercent: number;
  maxCarryOver: number;
  discountPercentage: Record<string, number> | null;
  modelPricing: Record<string, number> | null;
  displayOrder: number;
  popularPlan: boolean;
  maxTokensPerDay: number | null;
}

const periodLabels = {
  MONTHLY: '1 Month',
  QUARTERLY: '3 Months',
  BIANNUAL: '6 Months',
  ANNUAL: '12 Months'
};

const periodDiscounts = {
  MONTHLY: 0,
  QUARTERLY: 10,
  BIANNUAL: 15,
  ANNUAL: 20
};

// Define keyframes animations
const fadeInUpKeyframes = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

const glowPulseKeyframes = `
@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 15px 0 rgba(99, 102, 241, 0.1);
  }
  50% {
    box-shadow: 0 0 25px 5px rgba(99, 102, 241, 0.2);
  }
}
`;

export default function TokensPage() {
  const { data: session } = useSession();
  const [selectedTier, setSelectedTier] = useState<string>('PRO');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MONTHLY');
  const [customTokens, setCustomTokens] = useState<number>(5000);
  const [model, setModel] = useState<string>('GEMINI_1_5_PRO');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Custom theme colors for dark mode
  const themeColors = {
    primary: 'from-indigo-600 to-purple-700',
    secondary: 'from-violet-700 to-fuchsia-700',
    accent: 'from-amber-600 to-orange-600',
    success: 'from-emerald-600 to-green-700',
    warning: 'from-amber-600 to-orange-600',
    danger: 'from-rose-600 to-red-700',
    cardBg: 'bg-gray-900',
    cardBorder: 'border-indigo-900/40',
    textPrimary: 'text-gray-100',
    textSecondary: 'text-gray-400',
    glowPrimary: 'shadow-indigo-900/40',
  };
  
  // Get token limit data
  const { data: tokenLimit, isLoading: isLoadingLimit } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Get all available plans (mock data for now)
  const plans: SubscriptionPlan[] = [
    {
      id: 'free-monthly',
      name: 'Free',
      tier: 'FREE',
      period: 'MONTHLY',
      tokenAmount: 5000,
      costPerPeriod: 0,
      currency: 'USD',
      description: 'For casual users',
      features: [
        'Daily token limit: 150',
        'Basic content analysis',
        'Limited AI chat features',
        'Gemini 1.5 Pro access',
        'Standard response time'
      ],
      carryOverPercent: 0,
      maxCarryOver: 0,
      discountPercentage: null,
      modelPricing: { 'GEMINI_1_5_PRO': 1.0 },
      displayOrder: 1,
      popularPlan: false,
      maxTokensPerDay: 150
    },
    {
      id: 'basic-monthly',
      name: 'Basic',
      tier: 'BASIC',
      period: 'MONTHLY',
      tokenAmount: 30000,
      costPerPeriod: 9.99,
      currency: 'USD',
      description: 'For regular users',
      features: [
        'Daily token limit: 1,000',
        'Full content analysis',
        'Standard AI chat features',
        'Gemini 1.5 Pro access',
        'Faster response time',
        '10% token carryover to next month'
      ],
      carryOverPercent: 10,
      maxCarryOver: 5000,
      discountPercentage: periodDiscounts,
      modelPricing: { 'GEMINI_1_5_PRO': 1.0, 'GEMINI_2_5_PRO': 1.4 },
      displayOrder: 2,
      popularPlan: false,
      maxTokensPerDay: 1000
    },
    {
      id: 'pro-monthly',
      name: 'Pro',
      tier: 'PRO',
      period: 'MONTHLY',
      tokenAmount: 100000,
      costPerPeriod: 24.99,
      currency: 'USD',
      description: 'For power users',
      features: [
        'Daily token limit: 5,000',
        'Advanced analytics',
        'Premium AI chat with memory',
        'Gemini 1.5 & 2.5 Pro access',
        'Priority response time',
        '25% token carryover to next month'
      ],
      carryOverPercent: 25,
      maxCarryOver: 25000,
      discountPercentage: periodDiscounts,
      modelPricing: { 'GEMINI_1_5_PRO': 1.0, 'GEMINI_2_5_PRO': 1.4 },
      displayOrder: 3,
      popularPlan: true,
      maxTokensPerDay: 5000
    },
    {
      id: 'enterprise-monthly',
      name: 'Enterprise',
      tier: 'ENTERPRISE',
      period: 'MONTHLY',
      tokenAmount: 250000,
      costPerPeriod: 49.99,
      currency: 'USD',
      description: 'For businesses',
      features: [
        'Daily token limit: 10,000',
        'Full analytics suite',
        'Enterprise AI features',
        'Dedicated support',
        'Unlimited access to all models',
        '50% token carryover to next month'
      ],
      carryOverPercent: 50,
      maxCarryOver: 125000,
      discountPercentage: periodDiscounts,
      modelPricing: { 'GEMINI_1_5_PRO': 1.0, 'GEMINI_2_5_PRO': 1.4 },
      displayOrder: 4,
      popularPlan: false,
      maxTokensPerDay: 10000
    }
  ];

  // Get current plan based on user's token limit
  useEffect(() => {
    if (tokenLimit) {
      setSelectedTier(tokenLimit.tier);
      setSelectedPeriod(tokenLimit.subscriptionPeriod || 'MONTHLY');
      setModel(tokenLimit.preferredModel || 'GEMINI_1_5_PRO');
    }
  }, [tokenLimit]);

  // Calculate final price with period discount
  const calculateFinalPrice = (baseCost: number, tier: string, period: string) => {
    if (tier === 'FREE') return 0;
    
    const discount = periodDiscounts[period as keyof typeof periodDiscounts] || 0;
    let finalPrice = baseCost;
    
    // Apply discount for longer periods
    if (discount > 0) {
      finalPrice = baseCost * (1 - discount / 100);
    }
    
    // Multiply by months in period
    const monthMultiplier = period === 'MONTHLY' ? 1 : 
                           period === 'QUARTERLY' ? 3 : 
                           period === 'BIANNUAL' ? 6 : 12;
    
    return (finalPrice * monthMultiplier).toFixed(2);
  };

  // Calculate price per month
  const calculateMonthlyPrice = (totalPrice: string, period: string) => {
    const monthMultiplier = period === 'MONTHLY' ? 1 : 
                           period === 'QUARTERLY' ? 3 : 
                           period === 'BIANNUAL' ? 6 : 12;
    
    return (parseFloat(totalPrice) / monthMultiplier).toFixed(2);
  };

  // Calculate tokens per model
  const calculateModelTokens = (tokenAmount: number, model: string, modelPricing: Record<string, number> | null) => {
    if (!modelPricing) return tokenAmount;
    
    const baseModel = 'GEMINI_1_5_PRO';
    const modelRate = modelPricing[model] || 1.0;
    const baseRate = modelPricing[baseModel] || 1.0;
    
    // Convert tokens based on model rates
    return Math.floor(tokenAmount * (baseRate / modelRate));
  };

  // Calculate percentage discount based on period
  const getDiscountBadge = (period: string) => {
    const discount = periodDiscounts[period as keyof typeof periodDiscounts];
    if (!discount || discount === 0) return null;

    return (
      <span className="absolute -top-2 -right-2 bg-gradient-to-r ${themeColors.accent} text-white text-xs px-2 py-0.5 rounded-full shadow-lg font-medium">
        {discount}% off
      </span>
    );
  };

  // Handle subscription purchase
  const handleSubscribe = (tier: string, period: string) => {
    setIsUpgrading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsUpgrading(false);
      // In a real app, we would call the purchase mutation here
      window.location.href = '/ai-settings/tokens/success';
    }, 2000);
  };

  // Get filtered plans by tier
  const filteredPlansByTier = plans.filter(plan => plan.tier === selectedTier);
  
  // Get current plan for display
  const currentPlan = filteredPlansByTier.find(plan => plan.period === selectedPeriod) || filteredPlansByTier[0];
  
  // Custom pricing logic
  const baseTokenPrice = 0.00025; // $0.00025 per token
  const customPrice = customTokens * baseTokenPrice;
  const discountedCustomPrice = customPrice * (1 - (periodDiscounts[selectedPeriod as keyof typeof periodDiscounts] || 0) / 100);
  const totalCustomPrice = (discountedCustomPrice * (selectedPeriod === 'MONTHLY' ? 1 : selectedPeriod === 'QUARTERLY' ? 3 : selectedPeriod === 'BIANNUAL' ? 6 : 12)).toFixed(2);

  if (isLoadingLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 animate-pulse flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 animate-pulse flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-medium ${themeColors.textPrimary} mt-6">Loading subscription data...</p>
          <p className="text-sm ${themeColors.textSecondary} mt-2">Please wait while we retrieve your token information</p>
          <div className="mt-6 w-full max-w-xs bg-gray-800/60 rounded-xl p-3 border border-gray-800">
            <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Insert the style element for animations
  return (
    <div className="mx-auto max-w-5xl py-8 px-4 sm:px-6 md:px-8 flex flex-col items-center">
      <style jsx global>{`
        ${fadeInUpKeyframes}
        ${glowPulseKeyframes}

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-glow-pulse {
          animation: glowPulse 3s infinite;
        }

        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
      `}</style>

      <div className="mb-8 animate-fade-in-up text-center w-full">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <div className="bg-gradient-to-r ${themeColors.primary} p-2 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight ${themeColors.textPrimary}">AI Token Packages</h1>
        </div>
        <p className="text-lg ${themeColors.textSecondary} max-w-2xl mx-auto">
          Power your AI experience with token packages. Choose the plan that fits your needs and elevate your content with advanced AI features.
        </p>
      </div>

      {/* Current Usage Status */}
      {tokenLimit && (
        <div className={`${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl p-4 sm:p-6 mb-8 shadow-lg ${themeColors.glowPrimary} animate-glow-pulse animate-fade-in-up stagger-1 w-full`}>
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            <div className="w-full lg:w-1/2">
              <h2 className="text-xl font-semibold mb-4 flex items-center ${themeColors.textPrimary}">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${themeColors.primary} mr-3">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                Your Current Plan
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tokenLimit.tier === 'FREE' ? 'bg-zinc-800 text-zinc-100' :
                  tokenLimit.tier === 'BASIC' ? 'bg-blue-900 text-blue-100' :
                  tokenLimit.tier === 'PRO' ? 'bg-purple-900 text-purple-100' :
                  'bg-amber-900 text-amber-100'
                }`}>
                  {tokenLimit.tier}
                </span>
                <span className="${themeColors.textSecondary}">•</span>
                <span className="text-sm ${themeColors.textSecondary} bg-gray-800/50 px-2 py-1 rounded-full">
                  {tokenLimit.subscriptionPeriod ? periodLabels[tokenLimit.subscriptionPeriod as keyof typeof periodLabels] : 'Monthly'}
                </span>
                {tokenLimit.subscriptionEndsAt && (
                  <>
                    <span className="${themeColors.textSecondary}">•</span>
                    <span className="text-sm ${themeColors.textSecondary} flex items-center bg-gray-800/50 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3 mr-1" />
                      Renews: {formatDistanceToNow(new Date(tokenLimit.subscriptionEndsAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
              <div className="mb-4 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 p-3 border border-gray-800">
                <div className="flex justify-between mb-1">
                  <span className="text-sm ${themeColors.textSecondary}">Monthly tokens</span>
                  <span className="text-sm font-medium ${themeColors.textPrimary}">{tokenLimit?.monthlyAllocation?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm ${themeColors.textSecondary}">Daily limit</span>
                  <span className="text-sm font-medium ${themeColors.textPrimary}">{tokenLimit?.limit?.toLocaleString() || '0'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-sm ${themeColors.textPrimary}">
                  <div className="h-6 w-6 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span>Monthly allocation: <span className="font-medium">{tokenLimit?.monthlyAllocation?.toLocaleString() || '0'}</span> tokens</span>
                </div>
                {tokenLimit?.previousMonthCarry > 0 && (
                  <div className="flex items-center text-sm ${themeColors.textPrimary}">
                    <div className="h-6 w-6 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span>Carried over: <span className="font-medium">{tokenLimit?.previousMonthCarry?.toLocaleString() || '0'}</span> tokens</span>
                  </div>
                )}
                {tokenLimit?.bonusTokens > 0 && (
                  <div className="flex items-center text-sm ${themeColors.textPrimary}">
                    <div className="h-6 w-6 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span>Bonus tokens: <span className="font-medium">{tokenLimit?.bonusTokens?.toLocaleString() || '0'}</span> tokens</span>
                  </div>
                )}
                <div className="flex items-center text-sm ${themeColors.textPrimary}">
                  <div className="h-6 w-6 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span>Preferred model: <span className="font-medium">{
                    tokenLimit?.preferredModel ?
                    tokenLimit?.preferredModel.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro') :
                    'Automatic'
                  }</span></span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col mt-6 lg:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-medium ${themeColors.textPrimary}">Current Usage</h3>
                <div className="flex space-x-2">
                  <button className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                    <PieChart className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                    <LineChart className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                    <Download className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <TokenUsageDisplay showDetails={false} className="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* Tier Selection */}
      <div className="mb-8 animate-fade-in-up stagger-2 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold ${themeColors.textPrimary} flex items-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r ${themeColors.primary} mr-2">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            Choose Your Plan
          </h2>
          <div className="flex items-center bg-gray-800 rounded-lg p-1 shadow-md">
            <button className="px-3 py-1.5 text-sm font-medium rounded bg-indigo-600 text-white">Monthly</button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-300">Quarterly</button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-300">Annual</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans
            .filter(plan => plan.period === 'MONTHLY')
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(plan => (
              <div
                key={plan.id}
                className={`relative border ${themeColors.cardBorder} rounded-xl p-5 cursor-pointer transition-all ${
                  selectedTier === plan.tier ?
                  'ring-2 ring-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-purple-900/10 backdrop-blur-sm' :
                  'bg-gray-900/60 hover:bg-gray-900 hover:border-indigo-800/40 hover:shadow-lg hover:shadow-indigo-900/10'
                }`}
                onClick={() => setSelectedTier(plan.tier)}
              >
                {plan.popularPlan && (
                  <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r ${themeColors.accent} text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                    Most Popular
                  </span>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg ${themeColors.textPrimary}">{plan.name}</h3>
                  {selectedTier === plan.tier ? (
                    <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border border-gray-700"></div>
                  )}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-bold ${themeColors.textPrimary}">
                    {plan.costPerPeriod === 0 ? "Free" : `$${plan.costPerPeriod}`}
                  </span>
                  {plan.costPerPeriod > 0 && (
                    <span className="${themeColors.textSecondary} text-sm">/month</span>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 mb-3 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-300">{plan.tokenAmount.toLocaleString()} tokens/month</span>
                </div>
                <p className="${themeColors.textSecondary} text-sm mb-3">{plan.description}</p>
                <div className="space-y-2 mb-4">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-start text-sm">
                      <div className="h-5 w-5 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <span className="${themeColors.textPrimary}">{feature}</span>
                    </div>
                  ))}
                  {plan?.features?.length > 3 && (
                    <div className="text-sm text-indigo-400 cursor-pointer hover:underline flex items-center">
                      <span>+{plan?.features?.length - 3} more features</span>
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Custom Plan */}
      {selectedTier === 'CUSTOM' && (
        <div className="mb-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-xl p-4 sm:p-6 border border-indigo-900/30 shadow-lg animate-fade-in-up stagger-2 w-full">
          <h3 className="text-xl font-semibold mb-4 flex items-center ${themeColors.textPrimary}">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${themeColors.secondary} mr-2">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Custom Token Package
          </h3>
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-1/2 mb-6 lg:mb-0">
              <label className="block text-sm font-medium mb-2 ${themeColors.textPrimary}">Number of Tokens</label>
              <div className="flex items-center mb-4">
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={customTokens}
                  onChange={(e) => setCustomTokens(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between mb-6">
                <button
                  className="px-3 py-1.5 border border-indigo-800/30 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm ${themeColors.textPrimary} transition-colors"
                  onClick={() => setCustomTokens(10000)}
                >
                  10K
                </button>
                <button
                  className="px-3 py-1.5 border border-indigo-800/30 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm ${themeColors.textPrimary} transition-colors"
                  onClick={() => setCustomTokens(50000)}
                >
                  50K
                </button>
                <button
                  className="px-3 py-1.5 border border-indigo-800/30 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm ${themeColors.textPrimary} transition-colors"
                  onClick={() => setCustomTokens(100000)}
                >
                  100K
                </button>
                <button
                  className="px-3 py-1.5 border border-indigo-800/30 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm ${themeColors.textPrimary} transition-colors"
                  onClick={() => setCustomTokens(500000)}
                >
                  500K
                </button>
                <button
                  className="px-3 py-1.5 border border-indigo-800/30 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm ${themeColors.textPrimary} transition-colors"
                  onClick={() => setCustomTokens(1000000)}
                >
                  1M
                </button>
              </div>
              <div className="text-center mb-4 p-3 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-800">
                <span className="text-3xl font-bold ${themeColors.textPrimary}">{customTokens.toLocaleString()}</span>
                <span className="${themeColors.textSecondary} ml-2">tokens</span>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 ${themeColors.textPrimary}">Preferred Model</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={`px-3 py-3 border ${themeColors.cardBorder} rounded-xl text-sm flex flex-col items-center justify-center gap-2 ${
                      model === 'GEMINI_1_5_PRO' ?
                      'bg-gradient-to-b from-indigo-900/30 to-purple-900/20 border-indigo-700/30 shadow-lg shadow-indigo-900/20' :
                      'bg-gray-900/60 hover:bg-gray-800/80 hover:border-indigo-800/30'
                    }`}
                    onClick={() => setModel('GEMINI_1_5_PRO')}
                  >
                    <span className="font-medium ${themeColors.textPrimary}">Gemini 1.5 Pro</span>
                    <div className="bg-indigo-900/30 rounded-lg px-2 py-1 w-full text-center">
                      <span className="text-xs ${themeColors.textPrimary}">{customTokens.toLocaleString()} tokens</span>
                    </div>
                  </button>
                  <button
                    className={`px-3 py-3 border ${themeColors.cardBorder} rounded-xl text-sm flex flex-col items-center justify-center gap-2 ${
                      model === 'GEMINI_2_5_PRO' ?
                      'bg-gradient-to-b from-purple-900/30 to-fuchsia-900/20 border-purple-700/30 shadow-lg shadow-purple-900/20' :
                      'bg-gray-900/60 hover:bg-gray-800/80 hover:border-purple-800/30'
                    }`}
                    onClick={() => setModel('GEMINI_2_5_PRO')}
                  >
                    <span className="font-medium ${themeColors.textPrimary}">Gemini 2.5 Pro</span>
                    <div className="bg-purple-900/30 rounded-lg px-2 py-1 w-full text-center">
                      <span className="text-xs ${themeColors.textPrimary}">{Math.floor(customTokens * 0.7).toLocaleString()} tokens</span>
                    </div>
                  </button>
                </div>
                <div className="mt-2 p-2 rounded-lg bg-indigo-900/10 border border-indigo-900/20 flex items-start">
                  <Info className="h-4 w-4 text-indigo-400 mr-2 mt-px shrink-0" />
                  <p className="text-xs ${themeColors.textSecondary}">
                    Gemini 2.5 Pro offers higher quality responses at a conversion rate of 0.7:1
                  </p>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <div className="${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl p-5 shadow-lg">
                <h4 className="font-medium mb-3 ${themeColors.textPrimary}">Package Summary</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="${themeColors.textSecondary}">Custom tokens:</span>
                    <span className="${themeColors.textPrimary}">{customTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="${themeColors.textSecondary}">Model:</span>
                    <span className="${themeColors.textPrimary}">{model.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="${themeColors.textSecondary}">Base price:</span>
                    <span className="${themeColors.textPrimary}">${customPrice.toFixed(2)}</span>
                  </div>
                  {periodDiscounts[selectedPeriod as keyof typeof periodDiscounts] > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="${themeColors.textSecondary}">Discount:</span>
                      <span className="text-emerald-400">-{periodDiscounts[selectedPeriod as keyof typeof periodDiscounts]}%</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-3 flex justify-between font-medium">
                    <span className="${themeColors.textPrimary}">Total price:</span>
                    <span className="${themeColors.textPrimary} text-lg">${totalCustomPrice}</span>
                  </div>
                  <div className="text-xs ${themeColors.textSecondary} text-center bg-gray-800 p-2 rounded-lg">
                    {selectedPeriod !== 'MONTHLY' && (
                      <span><span className="text-indigo-400 font-medium">${calculateMonthlyPrice(totalCustomPrice, selectedPeriod)}</span> per month over {
                        selectedPeriod === 'QUARTERLY' ? '3' :
                        selectedPeriod === 'BIANNUAL' ? '6' : '12'
                      } months</span>
                    )}
                  </div>
                </div>
                <button
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 font-medium flex items-center justify-center shadow-lg shadow-indigo-900/20 transition-all hover:shadow-indigo-900/30 hover:scale-[1.02]"
                  onClick={() => handleSubscribe('CUSTOM', selectedPeriod)}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CircleDollarSign className="mr-2 h-4 w-4" />
                      Purchase Package
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Selection */}
      {selectedTier !== 'FREE' && selectedTier !== 'CUSTOM' && (
        <div className="mb-8 animate-fade-in-up stagger-2 w-full">
          <h3 className="text-lg font-semibold mb-4 ${themeColors.textPrimary} flex items-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r ${themeColors.primary} mr-2">
              <Clock className="h-4 w-4 text-white" />
            </div>
            Choose Billing Period
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Object.entries(periodLabels).map(([periodKey, periodLabel]) => (
              <div
                key={periodKey}
                className={`relative border ${themeColors.cardBorder} rounded-xl p-5 cursor-pointer transition-all ${
                  selectedPeriod === periodKey ?
                  'ring-2 ring-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-purple-900/10' :
                  'bg-gray-900/60 hover:bg-gray-900 hover:border-indigo-800/40 hover:shadow-lg hover:shadow-indigo-900/10'
                }`}
                onClick={() => setSelectedPeriod(periodKey)}
              >
                {getDiscountBadge(periodKey) && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r ${themeColors.accent} text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
                    {periodDiscounts[periodKey as keyof typeof periodDiscounts]}% off
                  </span>
                )}
                <div className="flex justify-between items-start">
                  <span className="font-medium ${themeColors.textPrimary}">{periodLabel}</span>
                  {selectedPeriod === periodKey ? (
                    <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border border-gray-700"></div>
                  )}
                </div>
                <div className="mt-3">
                  {periodKey !== 'MONTHLY' && (
                    <div className="text-xs text-emerald-400 font-medium mb-1 flex items-center">
                      <div className="h-4 w-4 rounded-full bg-emerald-900/30 flex items-center justify-center mr-1">
                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                      </div>
                      Save {periodDiscounts[periodKey as keyof typeof periodDiscounts]}%
                    </div>
                  )}
                  <div className="p-2 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 mb-2 flex items-center justify-center border border-gray-800">
                    <span className="text-lg font-bold ${themeColors.textPrimary}">
                      ${calculateFinalPrice(
                        filteredPlansByTier.find(p => p.period === 'MONTHLY')?.costPerPeriod || 0,
                        selectedTier,
                        periodKey
                      )}
                    </span>
                  </div>
                  {periodKey !== 'MONTHLY' && (
                    <div className="text-xs ${themeColors.textSecondary} text-center bg-gray-800/50 py-1 px-2 rounded-lg">
                      <span className="text-indigo-400">${calculateMonthlyPrice(
                        calculateFinalPrice(
                          filteredPlansByTier.find(p => p.period === 'MONTHLY')?.costPerPeriod || 0,
                          selectedTier,
                          periodKey
                        ),
                        periodKey
                      )}</span> per month
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Selection */}
      {selectedTier !== 'FREE' && selectedTier !== 'CUSTOM' && (
        <div className="mb-8 animate-fade-in-up stagger-3 w-full">
          <h3 className="text-lg font-semibold mb-4 ${themeColors.textPrimary} flex items-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r ${themeColors.secondary} mr-2">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Choose Preferred Model
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div
              className={`border ${themeColors.cardBorder} rounded-xl p-5 cursor-pointer transition-all ${
                model === 'AUTO' ?
                'ring-2 ring-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-purple-900/10' :
                'bg-gray-900/60 hover:bg-gray-900 hover:border-indigo-800/40 hover:shadow-lg hover:shadow-indigo-900/10'
              }`}
              onClick={() => setModel('AUTO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium ${themeColors.textPrimary}">Auto-select (Recommended)</h4>
                {model === 'AUTO' ? (
                  <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-gray-700"></div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 mb-3 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-300">Smart AI Selection</span>
              </div>
              <p className="text-sm ${themeColors.textSecondary} mb-3">
                Automatically chooses the best model for each task
              </p>
              <div className="flex items-center text-sm ${themeColors.textPrimary}">
                <div className="h-5 w-5 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2 shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>Optimized for each AI operation</span>
              </div>
            </div>
            
            <div
              className={`border ${themeColors.cardBorder} rounded-xl p-5 cursor-pointer transition-all ${
                model === 'GEMINI_1_5_PRO' ?
                'ring-2 ring-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-purple-900/10' :
                'bg-gray-900/60 hover:bg-gray-900 hover:border-indigo-800/40 hover:shadow-lg hover:shadow-indigo-900/10'
              }`}
              onClick={() => setModel('GEMINI_1_5_PRO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium ${themeColors.textPrimary}">Gemini 1.5 Pro</h4>
                {model === 'GEMINI_1_5_PRO' ? (
                  <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-gray-700"></div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-900/20 to-purple-900/20 mb-3 flex items-center justify-center border border-blue-900/20">
                <span className="text-sm font-medium text-gray-300">Standard Model</span>
              </div>
              <p className="text-sm ${themeColors.textSecondary} mb-3">
                Balanced performance and efficiency
              </p>
              <div className="flex items-center text-sm ${themeColors.textPrimary}">
                <div className="h-5 w-5 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2 shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>{currentPlan?.tokenAmount?.toLocaleString() || '0'} tokens per period</span>
              </div>
            </div>
            
            <div
              className={`border ${themeColors.cardBorder} rounded-xl p-5 cursor-pointer transition-all ${
                model === 'GEMINI_2_5_PRO' ?
                'ring-2 ring-indigo-500/30 bg-gradient-to-b from-purple-900/20 to-fuchsia-900/10' :
                'bg-gray-900/60 hover:bg-gray-900 hover:border-indigo-800/40 hover:shadow-lg hover:shadow-indigo-900/10'
              }`}
              onClick={() => setModel('GEMINI_2_5_PRO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium ${themeColors.textPrimary}">Gemini 2.5 Pro</h4>
                {model === 'GEMINI_2_5_PRO' ? (
                  <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-gray-700"></div>
                )}
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 mb-3 flex items-center justify-center border border-fuchsia-900/20">
                <span className="text-sm font-medium text-gray-300">Premium Model</span>
              </div>
              <p className="text-sm ${themeColors.textSecondary} mb-3">
                Highest quality responses and reasoning
              </p>
              <div className="flex items-center text-sm ${themeColors.textPrimary}">
                <div className="h-5 w-5 rounded-full bg-emerald-900/30 flex items-center justify-center mr-2 shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>{calculateModelTokens(
                  currentPlan?.tokenAmount || 0,
                  'GEMINI_2_5_PRO',
                  currentPlan?.modelPricing || null
                ).toLocaleString()} tokens per period</span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-indigo-900/10 border border-indigo-900/20 flex items-start">
            <Info className="h-4 w-4 text-indigo-400 mr-2 mt-0.5 shrink-0" />
            <p className="text-xs ${themeColors.textSecondary}">
              Note: Gemini 2.5 Pro offers higher quality results with enhanced reasoning capabilities but uses approximately 1.4× more tokens per operation than Gemini 1.5 Pro.
            </p>
          </div>
        </div>
      )}

      {/* Summary and Checkout */}
      {selectedTier !== 'CUSTOM' && (
        <div className="${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl p-4 sm:p-6 shadow-lg animate-fade-in-up stagger-3 w-full">
          <h3 className="text-xl font-semibold mb-4 ${themeColors.textPrimary} flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${themeColors.success} mr-2">
              <CircleDollarSign className="h-4 w-4 text-white" />
            </div>
            Subscription Summary
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
            <div>
              <div className="space-y-4 mb-6 lg:mb-0">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-full ${
                    selectedTier === 'FREE' ? 'bg-zinc-100' :
                    selectedTier === 'BASIC' ? 'bg-blue-100' : 
                    selectedTier === 'PRO' ? 'bg-purple-100' : 
                    'bg-yellow-100'
                  }`}>
                    {selectedTier === 'FREE' ? (
                      <Shield className="h-5 w-5 text-zinc-800" />
                    ) : selectedTier === 'BASIC' ? (
                      <Zap className="h-5 w-5 text-blue-600" />
                    ) : selectedTier === 'PRO' ? (
                      <Rocket className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Crown className="h-5 w-5 text-yellow-600" />
                    )}
                  </span>
                  <div>
                    <h4 className="font-semibold">
                      {currentPlan?.name || 'Custom'} Plan - {periodLabels[selectedPeriod as keyof typeof periodLabels]}
                    </h4>
                    <p className="text-sm text-text-secondary">{currentPlan?.description || 'Custom plan'}</p>
                  </div>
                </div>
                
                <div className="space-y-2 pl-10">
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>{currentPlan?.tokenAmount?.toLocaleString() || '0'} tokens per {
                      selectedPeriod === 'MONTHLY' ? 'month' :
                      selectedPeriod === 'QUARTERLY' ? 'quarter' :
                      selectedPeriod === 'BIANNUAL' ? '6 months' : 'year'
                    }</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Daily limit: {currentPlan?.maxTokensPerDay?.toLocaleString() || '0'} tokens</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Preferred model: {
                      model === 'AUTO' ? 'Auto-select' : 
                      model.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro')
                    }</span>
                  </div>
                  {currentPlan?.carryOverPercent && currentPlan.carryOverPercent > 0 && (
                    <div className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span>{currentPlan.carryOverPercent}% token carryover to next period</span>
                    </div>
                  )}
                </div>
                
                <div className="pl-10 pt-2">
                  <Link 
                    href="/ai-settings/tokens/features" 
                    className="text-primary text-sm flex items-center hover:underline"
                  >
                    View all features
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-800 shadow-lg mt-8 lg:mt-0">
              <h4 className="font-medium mb-3 ${themeColors.textPrimary}">Price Summary</h4>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="${themeColors.textSecondary}">{currentPlan?.name || 'Custom'} Plan ({periodLabels[selectedPeriod as keyof typeof periodLabels]})</span>
                  <span className="${themeColors.textPrimary}">${calculateFinalPrice(
                    currentPlan?.costPerPeriod || 0,
                    selectedTier,
                    selectedPeriod
                  )}</span>
                </div>
                {periodDiscounts[selectedPeriod as keyof typeof periodDiscounts] > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{periodDiscounts[selectedPeriod as keyof typeof periodDiscounts]}%</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-3 flex justify-between font-medium">
                  <span className="${themeColors.textPrimary}">Total</span>
                  <span className="${themeColors.textPrimary} text-lg">${calculateFinalPrice(
                    currentPlan?.costPerPeriod || 0,
                    selectedTier,
                    selectedPeriod
                  )}</span>
                </div>
                {selectedPeriod !== 'MONTHLY' && (
                  <div className="text-xs ${themeColors.textSecondary} text-center mt-2 bg-gray-800 rounded-lg p-2">
                    <span className="font-medium text-indigo-400">${calculateMonthlyPrice(
                      calculateFinalPrice(
                        currentPlan?.costPerPeriod || 0,
                        selectedTier,
                        selectedPeriod
                      ),
                      selectedPeriod
                    )}</span> per month over {
                      selectedPeriod === 'QUARTERLY' ? '3' :
                      selectedPeriod === 'BIANNUAL' ? '6' : '12'
                    } months
                  </div>
                )}
              </div>
              
              {selectedTier === 'FREE' ? (
                <button
                  className="w-full py-2.5 bg-gray-800 text-gray-400 rounded-lg font-medium flex items-center justify-center border border-gray-700"
                  disabled
                >
                  Current Plan
                </button>
              ) : tokenLimit?.tier === selectedTier && tokenLimit?.subscriptionPeriod === selectedPeriod ? (
                <button
                  className="w-full py-2.5 bg-gray-800 text-gray-400 rounded-lg font-medium flex items-center justify-center border border-gray-700"
                  disabled
                >
                  Current Plan
                </button>
              ) : (
                <button
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 font-medium flex items-center justify-center shadow-lg shadow-indigo-900/20 transition-all hover:shadow-indigo-900/30 hover:scale-[1.02]"
                  onClick={() => handleSubscribe(selectedTier, selectedPeriod)}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Subscribe Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              )}
              
              <div className="mt-3 text-xs ${themeColors.textSecondary} text-center flex items-center justify-center gap-2">
                <Shield className="h-3 w-3 text-indigo-400" />
                <span>Secure payment</span>
                <span className="mx-1">•</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-12 mb-8 animate-fade-in-up stagger-4 w-full">
        <h2 className="text-xl font-semibold mb-6 ${themeColors.textPrimary} flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r ${themeColors.secondary} mr-2">
            <Info className="h-4 w-4 text-white" />
          </div>
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="border ${themeColors.cardBorder} ${themeColors.cardBg} rounded-xl p-5 transition-all hover:shadow-md hover:shadow-indigo-900/10">
            <div className="flex items-start">
              <div className="mr-3 mt-1 p-2 rounded-lg bg-indigo-900/30">
                <Brain className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium mb-2 ${themeColors.textPrimary}">What are tokens and how do they work?</h3>
                <p className="${themeColors.textSecondary} text-sm">
                  Tokens are the units used to measure AI processing. Each AI operation (content analysis, chat message, etc.)
                  consumes a certain number of tokens based on the length and complexity of the task. Higher tier plans
                  provide more tokens, allowing for more extensive AI usage.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border ${themeColors.cardBorder} ${themeColors.cardBg} rounded-xl p-5 transition-all hover:shadow-md hover:shadow-indigo-900/10">
            <div className="flex items-start">
              <div className="mr-3 mt-1 p-2 rounded-lg bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium mb-2 ${themeColors.textPrimary}">What happens if I run out of tokens?</h3>
                <p className="${themeColors.textSecondary} text-sm">
                  If you reach your daily token limit, AI features will be temporarily unavailable until your tokens reset
                  the next day. You can always upgrade your plan or purchase additional tokens to continue using AI features.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border ${themeColors.cardBorder} ${themeColors.cardBg} rounded-xl p-5 transition-all hover:shadow-md hover:shadow-indigo-900/10">
            <div className="flex items-start">
              <div className="mr-3 mt-1 p-2 rounded-lg bg-emerald-900/30">
                <ArrowRight className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-medium mb-2 ${themeColors.textPrimary}">Can I change my plan later?</h3>
                <p className="${themeColors.textSecondary} text-sm">
                  Yes, you can upgrade, downgrade, or cancel your plan at any time. When upgrading, you'll have immediate
                  access to the higher tier benefits. When downgrading, changes will take effect at the end of your current
                  billing period.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border ${themeColors.cardBorder} ${themeColors.cardBg} rounded-xl p-5 transition-all hover:shadow-md hover:shadow-indigo-900/10">
            <div className="flex items-start">
              <div className="mr-3 mt-1 p-2 rounded-lg bg-purple-900/30">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium mb-2 ${themeColors.textPrimary}">What's the difference between Gemini 1.5 Pro and Gemini 2.5 Pro?</h3>
                <p className="${themeColors.textSecondary} text-sm">
                  Gemini 1.5 Pro offers balanced performance and efficiency, while Gemini 2.5 Pro delivers higher quality
                  responses and better reasoning capabilities. Gemini 2.5 Pro uses approximately 1.4× more tokens per
                  operation, so your token allocation will be converted at a 0.7:1 ratio when using this model.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}