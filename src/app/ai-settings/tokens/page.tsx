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
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import TokenUsageDisplay from '@/app/components/common/token-usage-display';

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

export default function TokensPage() {
  const { data: session } = useSession();
  const [selectedTier, setSelectedTier] = useState<string>('PRO');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MONTHLY');
  const [customTokens, setCustomTokens] = useState<number>(5000);
  const [model, setModel] = useState<string>('GEMINI_1_5_PRO');
  const [isUpgrading, setIsUpgrading] = useState(false);
  
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
      <span className="absolute -top-2 -right-2 bg-accent-red text-white text-xs px-1.5 py-0.5 rounded-full">
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Token Packages</h1>
        <p className="text-lg text-text-secondary max-w-2xl">
          Power your AI experience with token packages. Choose the plan that fits your needs and elevate your content with advanced AI features.
        </p>
      </div>

      {/* Current Usage Status */}
      {tokenLimit && (
        <div className="bg-card border rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center">
                <Brain className="mr-2 h-5 w-5 text-primary" />
                Your Current Plan
              </h2>
              <div className="flex items-center mb-1">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  tokenLimit.tier === 'FREE' ? 'bg-zinc-200 text-zinc-800' :
                  tokenLimit.tier === 'BASIC' ? 'bg-blue-100 text-blue-800' : 
                  tokenLimit.tier === 'PRO' ? 'bg-purple-100 text-purple-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {tokenLimit.tier}
                </span>
                <span className="mx-2 text-text-secondary">•</span>
                <span className="text-sm text-text-secondary">{
                  tokenLimit.subscriptionPeriod ? periodLabels[tokenLimit.subscriptionPeriod as keyof typeof periodLabels] : 'Monthly'
                }</span>
                {tokenLimit.subscriptionEndsAt && (
                  <>
                    <span className="mx-2 text-text-secondary">•</span>
                    <span className="text-sm text-text-secondary flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Renews: {new Date(tokenLimit.subscriptionEndsAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
              <p className="text-text-secondary mb-4">
                {tokenLimit.monthlyAllocation.toLocaleString()} tokens/month • {tokenLimit.limit.toLocaleString()} tokens/day
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Monthly allocation: {tokenLimit.monthlyAllocation.toLocaleString()} tokens</span>
                </div>
                {tokenLimit.previousMonthCarry > 0 && (
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Carried over: {tokenLimit.previousMonthCarry.toLocaleString()} tokens</span>
                  </div>
                )}
                {tokenLimit.bonusTokens > 0 && (
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Bonus tokens: {tokenLimit.bonusTokens.toLocaleString()} tokens</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Preferred model: {
                    tokenLimit.preferredModel ? 
                    tokenLimit.preferredModel.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro') : 
                    'Automatic'
                  }</span>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <TokenUsageDisplay showDetails={false} className="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* Tier Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans
            .filter(plan => plan.period === 'MONTHLY')
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(plan => (
              <div 
                key={plan.id}
                className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTier === plan.tier ? 
                  'border-primary ring-2 ring-primary/20 bg-primary/5' : 
                  'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTier(plan.tier)}
              >
                {plan.popularPlan && (
                  <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  {selectedTier === plan.tier && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold">
                    {plan.costPerPeriod === 0 ? "Free" : `$${plan.costPerPeriod}`}
                  </span>
                  {plan.costPerPeriod > 0 && (
                    <span className="text-text-secondary text-sm">/month</span>
                  )}
                </div>
                <p className="text-text-secondary text-sm mb-3">{plan.description}</p>
                <div className="space-y-2 mb-4">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 3 && (
                    <div className="text-sm text-primary cursor-pointer hover:underline">
                      +{plan.features.length - 3} more features
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
        <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
            Custom Token Package
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium mb-2">Number of Tokens</label>
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
                  className="px-3 py-1 border rounded-md hover:bg-card text-sm"
                  onClick={() => setCustomTokens(10000)}
                >
                  10K
                </button>
                <button
                  className="px-3 py-1 border rounded-md hover:bg-card text-sm"
                  onClick={() => setCustomTokens(50000)}
                >
                  50K
                </button>
                <button
                  className="px-3 py-1 border rounded-md hover:bg-card text-sm"
                  onClick={() => setCustomTokens(100000)}
                >
                  100K
                </button>
                <button
                  className="px-3 py-1 border rounded-md hover:bg-card text-sm"
                  onClick={() => setCustomTokens(500000)}
                >
                  500K
                </button>
                <button
                  className="px-3 py-1 border rounded-md hover:bg-card text-sm"
                  onClick={() => setCustomTokens(1000000)}
                >
                  1M
                </button>
              </div>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold">{customTokens.toLocaleString()}</span>
                <span className="text-text-secondary ml-2">tokens</span>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Preferred Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`px-3 py-2 border rounded-md text-sm flex flex-col items-center justify-center ${
                      model === 'GEMINI_1_5_PRO' ? 'bg-primary text-primary-foreground' : 'hover:bg-card'
                    }`}
                    onClick={() => setModel('GEMINI_1_5_PRO')}
                  >
                    <span className="font-medium">Gemini 1.5 Pro</span>
                    <span className="text-xs mt-1">{customTokens.toLocaleString()} tokens</span>
                  </button>
                  <button
                    className={`px-3 py-2 border rounded-md text-sm flex flex-col items-center justify-center ${
                      model === 'GEMINI_2_5_PRO' ? 'bg-primary text-primary-foreground' : 'hover:bg-card'
                    }`}
                    onClick={() => setModel('GEMINI_2_5_PRO')}
                  >
                    <span className="font-medium">Gemini 2.5 Pro</span>
                    <span className="text-xs mt-1">{Math.floor(customTokens * 0.7).toLocaleString()} tokens</span>
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Gemini 2.5 Pro offers higher quality at a conversion rate of 0.7:1
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-medium mb-3">Package Summary</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Custom tokens:</span>
                    <span>{customTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Model:</span>
                    <span>{model.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Base price:</span>
                    <span>${customPrice.toFixed(2)}</span>
                  </div>
                  {periodDiscounts[selectedPeriod as keyof typeof periodDiscounts] > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Discount:</span>
                      <span className="text-green-600">-{periodDiscounts[selectedPeriod as keyof typeof periodDiscounts]}%</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total price:</span>
                    <span>${totalCustomPrice}</span>
                  </div>
                  <div className="text-xs text-text-secondary text-center">
                    {selectedPeriod !== 'MONTHLY' && (
                      <span>${calculateMonthlyPrice(totalCustomPrice, selectedPeriod)}/month over {
                        selectedPeriod === 'QUARTERLY' ? '3' : 
                        selectedPeriod === 'BIANNUAL' ? '6' : '12'
                      } months</span>
                    )}
                  </div>
                </div>
                <button
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium flex items-center justify-center"
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
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Choose Billing Period</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(periodLabels).map(([periodKey, periodLabel]) => (
              <div
                key={periodKey}
                className={`relative border rounded-lg p-4 cursor-pointer ${
                  selectedPeriod === periodKey ? 
                  'border-primary ring-2 ring-primary/20 bg-primary/5' : 
                  'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPeriod(periodKey)}
              >
                {getDiscountBadge(periodKey)}
                <div className="flex justify-between items-start">
                  <span className="font-medium">{periodLabel}</span>
                  {selectedPeriod === periodKey && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="mt-2">
                  {periodKey !== 'MONTHLY' && (
                    <div className="text-xs text-primary mb-1">
                      Save {periodDiscounts[periodKey as keyof typeof periodDiscounts]}%
                    </div>
                  )}
                  <div className="text-lg font-bold">
                    ${calculateFinalPrice(
                      filteredPlansByTier.find(p => p.period === 'MONTHLY')?.costPerPeriod || 0, 
                      selectedTier, 
                      periodKey
                    )}
                  </div>
                  {periodKey !== 'MONTHLY' && (
                    <div className="text-xs text-text-secondary">
                      ${calculateMonthlyPrice(
                        calculateFinalPrice(
                          filteredPlansByTier.find(p => p.period === 'MONTHLY')?.costPerPeriod || 0, 
                          selectedTier, 
                          periodKey
                        ), 
                        periodKey
                      )}/month
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
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Choose Preferred Model</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`border rounded-lg p-4 cursor-pointer ${
                model === 'AUTO' ? 
                'border-primary ring-2 ring-primary/20 bg-primary/5' : 
                'border-border hover:border-primary/50'
              }`}
              onClick={() => setModel('AUTO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Auto-select (Recommended)</h4>
                {model === 'AUTO' && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-text-secondary mb-2">
                Automatically chooses the best model for each task
              </p>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span>Optimized for each AI operation</span>
              </div>
            </div>
            
            <div
              className={`border rounded-lg p-4 cursor-pointer ${
                model === 'GEMINI_1_5_PRO' ? 
                'border-primary ring-2 ring-primary/20 bg-primary/5' : 
                'border-border hover:border-primary/50'
              }`}
              onClick={() => setModel('GEMINI_1_5_PRO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Gemini 1.5 Pro</h4>
                {model === 'GEMINI_1_5_PRO' && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-text-secondary mb-2">
                Balanced performance and efficiency
              </p>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span>{currentPlan.tokenAmount.toLocaleString()} tokens per period</span>
              </div>
            </div>
            
            <div
              className={`border rounded-lg p-4 cursor-pointer ${
                model === 'GEMINI_2_5_PRO' ? 
                'border-primary ring-2 ring-primary/20 bg-primary/5' : 
                'border-border hover:border-primary/50'
              }`}
              onClick={() => setModel('GEMINI_2_5_PRO')}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Gemini 2.5 Pro</h4>
                {model === 'GEMINI_2_5_PRO' && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-text-secondary mb-2">
                Highest quality responses and reasoning
              </p>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span>{calculateModelTokens(
                  currentPlan.tokenAmount,
                  'GEMINI_2_5_PRO',
                  currentPlan.modelPricing
                ).toLocaleString()} tokens per period</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Note: Gemini 2.5 Pro offers higher quality results but uses approximately 1.4× more tokens per operation.
          </p>
        </div>
      )}

      {/* Summary and Checkout */}
      {selectedTier !== 'CUSTOM' && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Subscription Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
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
                      {currentPlan.name} Plan - {periodLabels[selectedPeriod as keyof typeof periodLabels]}
                    </h4>
                    <p className="text-sm text-text-secondary">{currentPlan.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2 pl-10">
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>{currentPlan.tokenAmount.toLocaleString()} tokens per {
                      selectedPeriod === 'MONTHLY' ? 'month' : 
                      selectedPeriod === 'QUARTERLY' ? 'quarter' : 
                      selectedPeriod === 'BIANNUAL' ? '6 months' : 'year'
                    }</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Daily limit: {currentPlan.maxTokensPerDay?.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Preferred model: {
                      model === 'AUTO' ? 'Auto-select' : 
                      model.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro')
                    }</span>
                  </div>
                  {currentPlan.carryOverPercent > 0 && (
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
            
            <div className="bg-card-secondary-bg rounded-lg p-4">
              <h4 className="font-medium mb-3">Price Summary</h4>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{currentPlan.name} Plan ({periodLabels[selectedPeriod as keyof typeof periodLabels]})</span>
                  <span>${calculateFinalPrice(
                    currentPlan.costPerPeriod, 
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
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>${calculateFinalPrice(
                    currentPlan.costPerPeriod, 
                    selectedTier, 
                    selectedPeriod
                  )}</span>
                </div>
                {selectedPeriod !== 'MONTHLY' && (
                  <div className="text-xs text-text-secondary text-center">
                    ${calculateMonthlyPrice(
                      calculateFinalPrice(
                        currentPlan.costPerPeriod, 
                        selectedTier, 
                        selectedPeriod
                      ), 
                      selectedPeriod
                    )}/month over {
                      selectedPeriod === 'QUARTERLY' ? '3' : 
                      selectedPeriod === 'BIANNUAL' ? '6' : '12'
                    } months
                  </div>
                )}
              </div>
              
              {selectedTier === 'FREE' ? (
                <button
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium flex items-center justify-center"
                  disabled
                >
                  Current Plan
                </button>
              ) : tokenLimit?.tier === selectedTier && tokenLimit?.subscriptionPeriod === selectedPeriod ? (
                <button
                  className="w-full py-2 bg-card-bg border text-text-primary rounded-md font-medium flex items-center justify-center"
                  disabled
                >
                  Current Plan
                </button>
              ) : (
                <button
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium flex items-center justify-center"
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
              
              <div className="mt-3 text-xs text-text-secondary text-center">
                Secure payment • Cancel anytime
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">What are tokens and how do they work?</h3>
            <p className="text-text-secondary text-sm">
              Tokens are the units used to measure AI processing. Each AI operation (content analysis, chat message, etc.) 
              consumes a certain number of tokens based on the length and complexity of the task. Higher tier plans 
              provide more tokens, allowing for more extensive AI usage.
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">What happens if I run out of tokens?</h3>
            <p className="text-text-secondary text-sm">
              If you reach your daily token limit, AI features will be temporarily unavailable until your tokens reset 
              the next day. You can always upgrade your plan or purchase additional tokens to continue using AI features.
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Can I change my plan later?</h3>
            <p className="text-text-secondary text-sm">
              Yes, you can upgrade, downgrade, or cancel your plan at any time. When upgrading, you'll have immediate 
              access to the higher tier benefits. When downgrading, changes will take effect at the end of your current 
              billing period.
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">What's the difference between Gemini 1.5 Pro and Gemini 2.5 Pro?</h3>
            <p className="text-text-secondary text-sm">
              Gemini 1.5 Pro offers balanced performance and efficiency, while Gemini 2.5 Pro delivers higher quality 
              responses and better reasoning capabilities. Gemini 2.5 Pro uses approximately 1.4× more tokens per 
              operation, so your token allocation will be converted at a 0.7:1 ratio when using this model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}