import { PrismaClient, SubscriptionTier, SubscriptionPeriod } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  // Clear existing plans before seeding
  await prisma.aISubscriptionPlan.deleteMany({});

  // Free tier (monthly only)
  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Free',
      tier: SubscriptionTier.FREE,
      period: SubscriptionPeriod.MONTHLY,
      tokenAmount: 5000,
      costPerPeriod: 0,
      description: 'Basic free tier with limited AI features',
      features: JSON.parse(JSON.stringify([
        'Daily token limit: 150',
        'Basic content analysis',
        'Limited AI chat features',
        'Gemini 1.5 Pro access',
        'Standard response time'
      ])),
      carryOverPercent: 0,
      maxCarryOver: 0,
      displayOrder: 1,
      popularPlan: false,
      maxTokensPerDay: 150,
      modelPricing: JSON.parse(JSON.stringify({
        'GEMINI_1_5_PRO': 1.0
      }))
    }
  });

  // Basic tier
  const basicFeatures = [
    'Daily token limit: 1,000',
    'Full content analysis',
    'Standard AI chat features',
    'Gemini 1.5 Pro access',
    'Faster response time',
    '10% token carryover to next month'
  ];

  const basicModelPricing = {
    'GEMINI_1_5_PRO': 1.0,
    'GEMINI_2_5_PRO': 1.4
  };

  const basicDiscountPercentage = {
    'MONTHLY': 0,
    'QUARTERLY': 10,
    'BIANNUAL': 15,
    'ANNUAL': 20
  };

  // Create Basic plans for all periods
  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      period: SubscriptionPeriod.MONTHLY,
      tokenAmount: 30000,
      costPerPeriod: 9.99,
      description: 'For casual users who need basic AI capabilities',
      features: JSON.parse(JSON.stringify(basicFeatures)),
      carryOverPercent: 10,
      maxCarryOver: 5000,
      discountPercentage: JSON.parse(JSON.stringify(basicDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(basicModelPricing)),
      displayOrder: 2,
      popularPlan: false,
      maxTokensPerDay: 1000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      period: SubscriptionPeriod.QUARTERLY,
      tokenAmount: 30000,
      costPerPeriod: 9.99,
      description: 'For casual users who need basic AI capabilities',
      features: JSON.parse(JSON.stringify(basicFeatures)),
      carryOverPercent: 10,
      maxCarryOver: 5000,
      discountPercentage: JSON.parse(JSON.stringify(basicDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(basicModelPricing)),
      displayOrder: 2,
      popularPlan: false,
      maxTokensPerDay: 1000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      period: SubscriptionPeriod.BIANNUAL,
      tokenAmount: 30000,
      costPerPeriod: 9.99,
      description: 'For casual users who need basic AI capabilities',
      features: JSON.parse(JSON.stringify(basicFeatures)),
      carryOverPercent: 10,
      maxCarryOver: 5000,
      discountPercentage: JSON.parse(JSON.stringify(basicDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(basicModelPricing)),
      displayOrder: 2,
      popularPlan: false,
      maxTokensPerDay: 1000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      period: SubscriptionPeriod.ANNUAL,
      tokenAmount: 30000,
      costPerPeriod: 9.99,
      description: 'For casual users who need basic AI capabilities',
      features: JSON.parse(JSON.stringify(basicFeatures)),
      carryOverPercent: 10,
      maxCarryOver: 5000,
      discountPercentage: JSON.parse(JSON.stringify(basicDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(basicModelPricing)),
      displayOrder: 2,
      popularPlan: false,
      maxTokensPerDay: 1000
    }
  });

  // Pro tier
  const proFeatures = [
    'Daily token limit: 5,000',
    'Advanced analytics',
    'Premium AI chat with memory',
    'Gemini 1.5 & 2.5 Pro access',
    'Priority response time',
    '25% token carryover to next month'
  ];

  const proModelPricing = {
    'GEMINI_1_5_PRO': 1.0,
    'GEMINI_2_5_PRO': 1.4
  };

  const proDiscountPercentage = {
    'MONTHLY': 0,
    'QUARTERLY': 10,
    'BIANNUAL': 15,
    'ANNUAL': 20
  };

  // Create Pro plans for all periods
  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Pro',
      tier: SubscriptionTier.PRO,
      period: SubscriptionPeriod.MONTHLY,
      tokenAmount: 100000,
      costPerPeriod: 24.99,
      description: 'For power users who need advanced AI features',
      features: JSON.parse(JSON.stringify(proFeatures)),
      carryOverPercent: 25,
      maxCarryOver: 25000,
      discountPercentage: JSON.parse(JSON.stringify(proDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(proModelPricing)),
      displayOrder: 3,
      popularPlan: true,
      maxTokensPerDay: 5000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Pro',
      tier: SubscriptionTier.PRO,
      period: SubscriptionPeriod.QUARTERLY,
      tokenAmount: 100000,
      costPerPeriod: 24.99,
      description: 'For power users who need advanced AI features',
      features: JSON.parse(JSON.stringify(proFeatures)),
      carryOverPercent: 25,
      maxCarryOver: 25000,
      discountPercentage: JSON.parse(JSON.stringify(proDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(proModelPricing)),
      displayOrder: 3,
      popularPlan: true,
      maxTokensPerDay: 5000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Pro',
      tier: SubscriptionTier.PRO,
      period: SubscriptionPeriod.BIANNUAL,
      tokenAmount: 100000,
      costPerPeriod: 24.99,
      description: 'For power users who need advanced AI features',
      features: JSON.parse(JSON.stringify(proFeatures)),
      carryOverPercent: 25,
      maxCarryOver: 25000,
      discountPercentage: JSON.parse(JSON.stringify(proDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(proModelPricing)),
      displayOrder: 3,
      popularPlan: true,
      maxTokensPerDay: 5000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Pro',
      tier: SubscriptionTier.PRO,
      period: SubscriptionPeriod.ANNUAL,
      tokenAmount: 100000,
      costPerPeriod: 24.99,
      description: 'For power users who need advanced AI features',
      features: JSON.parse(JSON.stringify(proFeatures)),
      carryOverPercent: 25,
      maxCarryOver: 25000,
      discountPercentage: JSON.parse(JSON.stringify(proDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(proModelPricing)),
      displayOrder: 3,
      popularPlan: true,
      maxTokensPerDay: 5000
    }
  });

  // Enterprise tier
  const enterpriseFeatures = [
    'Daily token limit: 10,000',
    'Full analytics suite',
    'Enterprise AI features',
    'Dedicated support',
    'Unlimited access to all models',
    '50% token carryover to next month'
  ];

  const enterpriseModelPricing = {
    'GEMINI_1_5_PRO': 1.0,
    'GEMINI_2_5_PRO': 1.4
  };

  const enterpriseDiscountPercentage = {
    'MONTHLY': 0,
    'QUARTERLY': 10,
    'BIANNUAL': 15,
    'ANNUAL': 20
  };

  // Create Enterprise plans for all periods
  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      period: SubscriptionPeriod.MONTHLY,
      tokenAmount: 250000,
      costPerPeriod: 49.99,
      description: 'For businesses needing enterprise-grade AI solutions',
      features: JSON.parse(JSON.stringify(enterpriseFeatures)),
      carryOverPercent: 50,
      maxCarryOver: 125000,
      discountPercentage: JSON.parse(JSON.stringify(enterpriseDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(enterpriseModelPricing)),
      displayOrder: 4,
      popularPlan: false,
      maxTokensPerDay: 10000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      period: SubscriptionPeriod.QUARTERLY,
      tokenAmount: 250000,
      costPerPeriod: 49.99,
      description: 'For businesses needing enterprise-grade AI solutions',
      features: JSON.parse(JSON.stringify(enterpriseFeatures)),
      carryOverPercent: 50,
      maxCarryOver: 125000,
      discountPercentage: JSON.parse(JSON.stringify(enterpriseDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(enterpriseModelPricing)),
      displayOrder: 4,
      popularPlan: false,
      maxTokensPerDay: 10000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      period: SubscriptionPeriod.BIANNUAL,
      tokenAmount: 250000,
      costPerPeriod: 49.99,
      description: 'For businesses needing enterprise-grade AI solutions',
      features: JSON.parse(JSON.stringify(enterpriseFeatures)),
      carryOverPercent: 50,
      maxCarryOver: 125000,
      discountPercentage: JSON.parse(JSON.stringify(enterpriseDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(enterpriseModelPricing)),
      displayOrder: 4,
      popularPlan: false,
      maxTokensPerDay: 10000
    }
  });

  await prisma.aISubscriptionPlan.create({
    data: {
      name: 'Enterprise',
      tier: SubscriptionTier.ENTERPRISE,
      period: SubscriptionPeriod.ANNUAL,
      tokenAmount: 250000,
      costPerPeriod: 49.99,
      description: 'For businesses needing enterprise-grade AI solutions',
      features: JSON.parse(JSON.stringify(enterpriseFeatures)),
      carryOverPercent: 50,
      maxCarryOver: 125000,
      discountPercentage: JSON.parse(JSON.stringify(enterpriseDiscountPercentage)),
      modelPricing: JSON.parse(JSON.stringify(enterpriseModelPricing)),
      displayOrder: 4,
      popularPlan: false,
      maxTokensPerDay: 10000
    }
  });

  console.log('✅ Subscription plans seeded successfully!');
}

export { seedSubscriptionPlans };