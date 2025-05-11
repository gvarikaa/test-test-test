import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { checkUserTokens, recordUserTokenUsage } from '@/lib/token-middleware';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get token limit information
    const tokenLimit = await prisma.aiTokenLimit.findUnique({
      where: { userId },
    });
    
    if (!tokenLimit) {
      return NextResponse.json(
        { error: 'Token limit record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tokenLimit: {
        tier: tokenLimit.tier,
        limit: tokenLimit.limit,
        usage: tokenLimit.usage,
        resetAt: tokenLimit.resetAt,
        monthlyAllocation: tokenLimit.monthlyAllocation,
        previousMonthCarry: tokenLimit.previousMonthCarry,
        bonusTokens: tokenLimit.bonusTokens,
        subscriptionPeriod: tokenLimit.subscriptionPeriod,
        subscriptionEndsAt: tokenLimit.subscriptionEndsAt,
        preferredModel: tokenLimit.preferredModel,
      }
    });
  } catch (error) {
    console.error('Error in token system test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test token usage
export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse request body
    const body = await req.json();
    const { tokensToUse = 10, operationType = 'TEST', model = 'GEMINI_1_5_PRO' } = body;
    
    // Check if user has enough tokens
    const { hasTokens, tokenLimit } = await checkUserTokens(userId, tokensToUse);
    
    if (!hasTokens) {
      return NextResponse.json(
        { 
          error: 'Token limit exceeded',
          code: 'TOKEN_LIMIT_EXCEEDED',
          currentUsage: tokenLimit?.usage || 0,
          limit: tokenLimit?.limit || 0,
          remaining: tokenLimit ? tokenLimit.limit - tokenLimit.usage : 0
        },
        { status: 403 }
      );
    }
    
    // Record token usage
    const success = await recordUserTokenUsage(
      userId,
      operationType,
      tokensToUse,
      model,
      {
        endpoint: 'api/test/token-system',
        featureArea: 'test',
        prompt: 'Test token usage',
        promptTokens: Math.floor(tokensToUse * 0.4),
        completionTokens: Math.floor(tokensToUse * 0.6),
        success: true,
        responseTime: 500,
        userAction: 'test',
        featureCategory: 'testing',
      }
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record token usage' },
        { status: 500 }
      );
    }
    
    // Get updated token limit
    const updatedTokenLimit = await prisma.aiTokenLimit.findUnique({
      where: { userId },
    });
    
    return NextResponse.json({
      success: true,
      tokensUsed: tokensToUse,
      updatedTokenLimit: {
        tier: updatedTokenLimit?.tier || 'FREE',
        limit: updatedTokenLimit?.limit || 150,
        usage: updatedTokenLimit?.usage || 0,
        resetAt: updatedTokenLimit?.resetAt || new Date(),
        remaining: updatedTokenLimit ? updatedTokenLimit.limit - updatedTokenLimit.usage : 0
      }
    });
  } catch (error) {
    console.error('Error in token usage test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}