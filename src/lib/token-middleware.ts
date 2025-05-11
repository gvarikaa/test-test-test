import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

/**
 * Middleware to check if a user has enough tokens for an AI operation
 * @param userId The user ID to check tokens for
 * @param operationCost The cost of the operation in tokens
 * @param skipCheck Whether to skip the token check (for certain operations)
 * @returns An object with hasTokens and tokenLimit
 */
export async function checkUserTokens(
  userId: string, 
  operationCost: number,
  skipCheck: boolean = false
) {
  if (skipCheck) {
    return { hasTokens: true, tokenLimit: null };
  }
  
  // Get token limit
  const tokenLimit = await prisma.aiTokenLimit.findUnique({
    where: { userId },
  });
  
  // If no token limit record exists, create one with default values
  if (!tokenLimit) {
    const now = new Date();
    const resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Reset in 24 hours
    
    const newTokenLimit = await prisma.aiTokenLimit.create({
      data: {
        userId,
        tier: 'FREE',
        limit: 150,
        usage: 0,
        resetAt,
        monthlyAllocation: 5000,
        subscriptionStartedAt: now,
        subscriptionPeriod: 'MONTHLY',
        carryOverPercent: 0,
        carryOverLimit: 0,
        autoRenew: false,
        preferredModel: 'AUTO',
      },
    });
    
    return { 
      hasTokens: operationCost <= newTokenLimit.limit, 
      tokenLimit: newTokenLimit 
    };
  }
  
  // Check if token usage should be reset
  if (tokenLimit.resetAt < new Date()) {
    // Reset daily token usage
    await prisma.aiTokenLimit.update({
      where: { userId },
      data: {
        usage: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
        lastActivity: new Date(),
      },
    });
    
    // Get updated token limit
    const updatedTokenLimit = await prisma.aiTokenLimit.findUnique({
      where: { userId },
    });
    
    return { 
      hasTokens: updatedTokenLimit ? operationCost <= updatedTokenLimit.limit : false, 
      tokenLimit: updatedTokenLimit 
    };
  }
  
  // Check if user has enough tokens
  const hasTokens = tokenLimit.usage + operationCost <= tokenLimit.limit;
  
  return { hasTokens, tokenLimit };
}

/**
 * Records token usage for an AI operation
 * @param userId The user ID
 * @param operationType The type of operation being performed
 * @param tokensUsed Number of tokens used
 * @param model The AI model used
 * @param metadata Additional metadata about the operation
 */
export async function recordUserTokenUsage(
  userId: string,
  operationType: string,
  tokensUsed: number,
  model: string,
  metadata: Record<string, any> = {}
) {
  try {
    // Get token limit
    const tokenLimit = await prisma.aiTokenLimit.findUnique({
      where: { userId },
    });
    
    if (!tokenLimit) {
      throw new Error('Token limit record not found');
    }
    
    // Update token usage
    await prisma.aiTokenLimit.update({
      where: { userId },
      data: {
        usage: tokenLimit.usage + tokensUsed,
        lifetimeUsage: tokenLimit.lifetimeUsage + tokensUsed,
        lastActivity: new Date(),
      },
    });
    
    // Record token usage stats
    await prisma.aiTokenUsageStat.create({
      data: {
        tokenLimitId: tokenLimit.id,
        operationType,
        tokensUsed,
        model: model as any, // Handle enum conversion
        timestamp: new Date(),
        endpoint: metadata.endpoint || 'unknown',
        featureArea: metadata.featureArea || 'unknown',
        prompt: metadata.prompt || null,
        promptTokens: metadata.promptTokens || null,
        completionTokens: metadata.completionTokens || null,
        success: metadata.success !== false,
        errorCode: metadata.errorCode || null,
        metadata: metadata || null,
        responseTime: metadata.responseTime || null,
        costMultiplier: metadata.costMultiplier || 1.0,
        contentType: metadata.contentType || null,
        contentId: metadata.contentId || null,
        userAction: metadata.userAction || null,
        tokenCost: metadata.tokenCost || null,
        featureCategory: metadata.featureCategory || null,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error recording token usage:', error);
    return false;
  }
}

/**
 * API route middleware to check token limits
 * @param req The incoming request
 * @param res The response object
 * @param operationCost The cost of the operation in tokens
 * @param skipCheck Whether to skip the token check (for certain operations)
 */
export async function tokenMiddleware(
  req: NextRequest,
  operationCost: number,
  skipCheck: boolean = false
) {
  // Skip middleware if operationCost is 0 or check is skipped
  if (operationCost === 0 || skipCheck) {
    return NextResponse.next();
  }
  
  try {
    // Get user ID from session
    const session = req.cookies.get('next-auth.session-token')?.value;
    
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // TODO: Extract user ID from session - this is a placeholder
    // In a real implementation, you'd decode the session token
    const userId = 'user_id_from_session';
    
    // Check if user has enough tokens
    const { hasTokens } = await checkUserTokens(userId, operationCost);
    
    if (!hasTokens) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Token limit exceeded', 
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: 'You have reached your token limit. Please upgrade your subscription or wait for your tokens to reset.'
        }),
        { status: 403 }
      );
    }
    
    // Continue to the next middleware or handler
    return NextResponse.next();
  } catch (error) {
    console.error('Error in token middleware:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An error occurred while checking token limits.'
      }),
      { status: 500 }
    );
  }
}