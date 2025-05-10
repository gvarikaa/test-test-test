import { PrismaClient } from '@prisma/client';

export async function seedEventCategories(prisma: PrismaClient) {
  console.log('Seeding event categories...');
  
  // Define the event categories
  const categories = [
    {
      name: 'Social',
      description: 'Social gatherings, parties, and meetups',
      color: '#3b82f6', // blue-500
      icon: '🎉'
    },
    {
      name: 'Business',
      description: 'Business meetings, conferences, and networking events',
      color: '#10b981', // emerald-500
      icon: '💼'
    },
    {
      name: 'Education',
      description: 'Workshops, courses, lectures, and learning events',
      color: '#8b5cf6', // violet-500
      icon: '📚'
    },
    {
      name: 'Sports',
      description: 'Sports competitions, games, and fitness activities',
      color: '#ef4444', // red-500
      icon: '🏆'
    },
    {
      name: 'Arts & Culture',
      description: 'Art exhibitions, performances, and cultural events',
      color: '#f59e0b', // amber-500
      icon: '🎭'
    },
    {
      name: 'Technology',
      description: 'Tech conferences, hackathons, and tech meetups',
      color: '#6366f1', // indigo-500
      icon: '💻'
    },
    {
      name: 'Health & Wellness',
      description: 'Health workshops, wellness retreats, and fitness classes',
      color: '#ec4899', // pink-500
      icon: '🧘'
    },
    {
      name: 'Community',
      description: 'Community gatherings, neighborhood events, and charity',
      color: '#14b8a6', // teal-500
      icon: '🤝'
    },
    {
      name: 'Food & Drink',
      description: 'Food festivals, tastings, and culinary events',
      color: '#f97316', // orange-500
      icon: '🍴'
    },
    {
      name: 'Music',
      description: 'Concerts, music festivals, and performances',
      color: '#8b5cf6', // violet-500
      icon: '🎵'
    }
  ];
  
  // Create the categories in the database, skipping if they already exist
  for (const category of categories) {
    const existingCategory = await prisma.eventCategory.findUnique({
      where: { name: category.name }
    });
    
    if (!existingCategory) {
      await prisma.eventCategory.create({
        data: category
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
  }
  
  console.log('Event categories seeding complete!');
}