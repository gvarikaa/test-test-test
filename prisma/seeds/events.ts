import { PrismaClient } from '@prisma/client';

export async function seedEvents(prisma: PrismaClient) {
  console.log('Seeding event categories...');
  
  // Create event categories
  const eventCategories = [
    {
      name: 'Social',
      description: 'Casual social gatherings and meetups',
      color: '#4F46E5', // indigo-600
      icon: '👋',
    },
    {
      name: 'Professional',
      description: 'Networking, conferences, and business events',
      color: '#0EA5E9', // sky-500
      icon: '💼',
    },
    {
      name: 'Educational',
      description: 'Workshops, seminars, and learning opportunities',
      color: '#10B981', // emerald-500
      icon: '📚',
    },
    {
      name: 'Entertainment',
      description: 'Concerts, shows, and performances',
      color: '#8B5CF6', // violet-500
      icon: '🎭',
    },
    {
      name: 'Sports',
      description: 'Games, tournaments, and fitness activities',
      color: '#EF4444', // red-500
      icon: '⚽',
    },
    {
      name: 'Community',
      description: 'Local community events and volunteer opportunities',
      color: '#F97316', // orange-500
      icon: '🏙️',
    },
  ];
  
  for (const category of eventCategories) {
    await prisma.eventCategory.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }
  
  console.log('✅ Event categories seeded');
}