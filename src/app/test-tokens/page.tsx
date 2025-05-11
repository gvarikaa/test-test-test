"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, RefreshCw, Plus, Minus, Save, Zap } from 'lucide-react';

export default function TestTokensPage() {
  const { data: session } = useSession();
  const [tokensToUse, setTokensToUse] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get token limit data
  const { data: tokenLimit, isLoading: isLoadingLimit, refetch } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchInterval: 5000,
  });
  
  // Get purchase history
  const { data: purchaseHistory, isLoading: isLoadingHistory } = api.ai.getTokenPurchaseHistory.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  
  // Use tokens mutation
  const useTokens = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/test/token-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokensToUse,
          operationType: 'TEST_USAGE',
          model: 'GEMINI_1_5_PRO',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to use tokens');
        return;
      }
      
      setResult(data);
      refetch();
    } catch (error) {
      console.error('Error using tokens:', error);
      setErrorMessage('An error occurred while using tokens');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Upgrade tier mutation
  const { mutate: upgradeTier, isLoading: isUpgrading } = api.ai.upgradeTokenTier.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });
  
  const handleUpgrade = (tier: 'BASIC' | 'PRO' | 'ENTERPRISE') => {
    upgradeTier({
      tier,
      period: 'MONTHLY',
      model: 'AUTO',
    });
  };
  
  if (isLoadingLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading token data...</span>
      </div>
    );
  }
  
  if (!tokenLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col">
        <p className="text-red-500 mb-4">Token limit data not found</p>
        <Link
          href="/ai-settings/tokens"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Set Up Tokens
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Token System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Token Status</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Tier:</span>
              <span className="font-medium">{tokenLimit.tier}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Daily Limit:</span>
              <span className="font-medium">{tokenLimit.limit.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Current Usage:</span>
              <span className="font-medium">{tokenLimit.usage.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Remaining:</span>
              <span className="font-medium">{(tokenLimit.limit - tokenLimit.usage).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Reset Time:</span>
              <span className="font-medium">{new Date(tokenLimit.resetAt).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-text-secondary">Monthly Allocation:</span>
              <span className="font-medium">{tokenLimit.monthlyAllocation.toLocaleString()}</span>
            </div>
            
            {tokenLimit.previousMonthCarry > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Carried Over:</span>
                <span className="font-medium text-green-600">+{tokenLimit.previousMonthCarry.toLocaleString()}</span>
              </div>
            )}
            
            {tokenLimit.bonusTokens > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Bonus Tokens:</span>
                <span className="font-medium text-amber-600">+{tokenLimit.bonusTokens.toLocaleString()}</span>
              </div>
            )}
            
            {tokenLimit.preferredModel && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Preferred Model:</span>
                <span className="font-medium">
                  {tokenLimit.preferredModel === 'AUTO' 
                    ? 'Auto-select' 
                    : tokenLimit.preferredModel.replace('GEMINI_', 'Gemini ').replace('_PRO', ' Pro')}
                </span>
              </div>
            )}
            
            {tokenLimit.subscriptionPeriod && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Subscription Period:</span>
                <span className="font-medium">
                  {tokenLimit.subscriptionPeriod === 'MONTHLY' ? 'Monthly' :
                   tokenLimit.subscriptionPeriod === 'QUARTERLY' ? 'Quarterly' :
                   tokenLimit.subscriptionPeriod === 'BIANNUAL' ? 'Biannual' : 'Annual'}
                </span>
              </div>
            )}
            
            {tokenLimit.subscriptionEndsAt && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Subscription Ends:</span>
                <span className="font-medium">{new Date(tokenLimit.subscriptionEndsAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <button
              className="flex items-center justify-center w-full py-2 bg-card-secondary-bg hover:bg-hover-bg rounded-md"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Use Tokens</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tokens to Use:</label>
                <div className="flex items-center">
                  <button
                    className="p-2 bg-card-secondary-bg hover:bg-hover-bg rounded-l-md"
                    onClick={() => setTokensToUse(Math.max(1, tokensToUse - 10))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-transparent border-y border-border text-center"
                    value={tokensToUse}
                    onChange={(e) => setTokensToUse(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                  />
                  <button
                    className="p-2 bg-card-secondary-bg hover:bg-hover-bg rounded-r-md"
                    onClick={() => setTokensToUse(tokensToUse + 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <button
                className="w-full py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center"
                onClick={useTokens}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Use Tokens
                  </>
                )}
              </button>
              
              {errorMessage && (
                <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              
              {result && (
                <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
                  <p>Used {result.tokensUsed} tokens successfully!</p>
                  <p>Remaining: {result.updatedTokenLimit.remaining} tokens</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upgrade Tier</h2>
            
            <div className="space-y-3">
              <button
                className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={() => handleUpgrade('BASIC')}
                disabled={isUpgrading || tokenLimit.tier === 'BASIC'}
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Upgrade to BASIC'
                )}
              </button>
              
              <button
                className="w-full py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                onClick={() => handleUpgrade('PRO')}
                disabled={isUpgrading || tokenLimit.tier === 'PRO'}
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Upgrade to PRO'
                )}
              </button>
              
              <button
                className="w-full py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
                onClick={() => handleUpgrade('ENTERPRISE')}
                disabled={isUpgrading || tokenLimit.tier === 'ENTERPRISE'}
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Upgrade to ENTERPRISE'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Purchase History */}
      {!isLoadingHistory && purchaseHistory && purchaseHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Purchase History</h2>
          
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-card-secondary-bg">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchaseHistory.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {purchase.tier}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {purchase.period === 'MONTHLY' ? 'Monthly' :
                         purchase.period === 'QUARTERLY' ? 'Quarterly' :
                         purchase.period === 'BIANNUAL' ? 'Biannual' : 'Annual'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {purchase.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ${purchase.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link
          href="/ai-settings/tokens"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Go to Token Management
        </Link>
      </div>
    </div>
  );
}