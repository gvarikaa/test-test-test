import { PrismaClient, EffectType } from '@prisma/client';

export async function seedReelData(prisma: PrismaClient) {
  console.log('Seeding reel data...');

  // Seed reel categories
  const categories = [
    { name: 'Comedy', iconUrl: '/icons/comedy.svg' },
    { name: 'Dance', iconUrl: '/icons/dance.svg' },
    { name: 'Music', iconUrl: '/icons/music.svg' },
    { name: 'Fashion', iconUrl: '/icons/fashion.svg' },
    { name: 'Sports', iconUrl: '/icons/sports.svg' },
    { name: 'Food', iconUrl: '/icons/food.svg' },
    { name: 'Travel', iconUrl: '/icons/travel.svg' },
    { name: 'Pets', iconUrl: '/icons/pets.svg' },
    { name: 'Beauty', iconUrl: '/icons/beauty.svg' },
    { name: 'DIY', iconUrl: '/icons/diy.svg' },
  ];

  // Check if categories already exist
  const existingCategories = await prisma.reelCategory.findMany();
  if (existingCategories.length === 0) {
    for (const category of categories) {
      await prisma.reelCategory.create({
        data: category,
      });
    }
    console.log(`Created ${categories.length} reel categories`);
  } else {
    console.log(`Skipping categories, ${existingCategories.length} already exist`);
  }

  // Seed reel effects
  const effects = [
    // Filters
    { name: 'Vintage', type: 'FILTER' as EffectType, description: 'Old-time film look' },
    { name: 'B&W', type: 'FILTER' as EffectType, description: 'Classic black and white' },
    { name: 'Sepia', type: 'FILTER' as EffectType, description: 'Warm brownish tone' },
    { name: 'Neon', type: 'FILTER' as EffectType, description: 'Vibrant neon colors' },
    { name: 'Chill', type: 'FILTER' as EffectType, description: 'Cool blue tones' },
    { name: 'Warm', type: 'FILTER' as EffectType, description: 'Warm orange tones' },
    
    // Transitions
    { name: 'Wipe', type: 'TRANSITION' as EffectType, description: 'Wipe transition' },
    { name: 'Fade', type: 'TRANSITION' as EffectType, description: 'Smooth fade' },
    { name: 'Zoom', type: 'TRANSITION' as EffectType, description: 'Zoom in/out' },
    { name: 'Spin', type: 'TRANSITION' as EffectType, description: '360 degree spin' },
    
    // Stickers
    { name: 'Hearts', type: 'STICKER' as EffectType, description: 'Animated hearts' },
    { name: 'Stars', type: 'STICKER' as EffectType, description: 'Sparkling stars' },
    { name: 'Emoji Pack', type: 'STICKER' as EffectType, description: 'Popular emojis' },
    { name: 'Text Bubbles', type: 'STICKER' as EffectType, description: 'Speech bubbles' },
    
    // Speed effects
    { name: 'Slow-Mo', type: 'SPEED' as EffectType, description: 'Slow motion' },
    { name: 'Fast Forward', type: 'SPEED' as EffectType, description: 'Speed up' },
    { name: 'Reverse', type: 'SPEED' as EffectType, description: 'Play backwards' },
    { name: 'Freeze Frame', type: 'SPEED' as EffectType, description: 'Pause momentarily' },
    
    // AR effects
    { name: 'Face Mask', type: 'AR' as EffectType, description: 'Virtual face mask' },
    { name: 'Background Blur', type: 'AR' as EffectType, description: 'Blur background' },
    { name: 'Green Screen', type: 'AR' as EffectType, description: 'Replace background' },
  ];

  // Check if effects already exist
  const existingEffects = await prisma.reelEffect.findMany();
  if (existingEffects.length === 0) {
    for (const effect of effects) {
      await prisma.reelEffect.create({
        data: effect,
      });
    }
    console.log(`Created ${effects.length} reel effects`);
  } else {
    console.log(`Skipping effects, ${existingEffects.length} already exist`);
  }
}