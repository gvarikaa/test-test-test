import { PrismaClient, Visibility, MediaType } from '@prisma/client';
import { hash } from 'bcrypt';
import { seedReelData } from './seeds/reels.js';
import { seedEvents } from './seeds/events';
import { seedEventCategories } from './seeds/event-categories';
import { seedSubscriptionPlans } from './seeds/subscription-plans';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create users
  const password = await hash('password123', 12);
  
  // Main admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dapdip.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@dapdip.com',
      username: 'admin',
      hashedPassword: password,
      bio: 'DapDip platform administrator',
      image: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff',
      coverImage: 'https://source.unsplash.com/random/1200x300/?gradient',
      language: 'en',
    },
  });

  // Regular user 1
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      name: 'David Johnson',
      email: 'user1@example.com',
      username: 'davidj',
      hashedPassword: password,
      bio: 'Tech enthusiast and fitness lover',
      image: 'https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff',
      coverImage: 'https://source.unsplash.com/random/1200x300/?nature',
      language: 'en',
      location: 'New York',
      theme: 'system',
    },
  });

  // Regular user 2
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      name: 'Sarah Williams',
      email: 'user2@example.com',
      username: 'sarahw',
      hashedPassword: password,
      bio: 'Digital artist and yoga practitioner',
      image: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff',
      coverImage: 'https://source.unsplash.com/random/1200x300/?art',
      language: 'en',
      location: 'San Francisco',
      theme: 'dark',
    },
  });

  // Create some topics/hashtags
  const topics = [
    { name: 'technology', description: 'Tech-related discussions' },
    { name: 'fitness', description: 'Fitness and workout tips' },
    { name: 'art', description: 'Art and creative content' },
    { name: 'food', description: 'Cooking and food experiences' },
    { name: 'travel', description: 'Travel adventures and tips' },
  ];

  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { name: topic.name },
      update: {},
      create: topic,
    });
  }

  // Create some posts
  const post1 = await prisma.post.create({
    data: {
      content: 'Just started using the new DapDip platform! Excited to connect with everyone here. #technology',
      userId: user1.id,
      visibility: Visibility.PUBLIC,
      media: {
        create: [
          {
            type: 'IMAGE',
            url: 'https://source.unsplash.com/random/800x600/?technology',
          },
        ],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      content: 'Morning workout complete! 💪 Feeling energized for the day. #fitness',
      userId: user1.id,
      visibility: Visibility.PUBLIC,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      content: 'Just finished my latest digital art piece. What do you think? #art',
      userId: user2.id,
      visibility: Visibility.PUBLIC,
      media: {
        create: [
          {
            type: 'IMAGE',
            url: 'https://source.unsplash.com/random/800x600/?digitalart',
          },
        ],
      },
    },
  });

  // Add comments
  await prisma.comment.create({
    data: {
      content: 'Welcome to DapDip! You\'ll love it here.',
      userId: user2.id,
      postId: post1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Impressive work! I love the colors.',
      userId: user1.id,
      postId: post3.id,
    },
  });

  // Add reactions
  await prisma.reaction.create({
    data: {
      type: 'LIKE',
      userId: user2.id,
      postId: post1.id,
    },
  });

  await prisma.reaction.create({
    data: {
      type: 'LOVE',
      userId: user1.id,
      postId: post3.id,
    },
  });

  // Create a follow relationship
  try {
    await prisma.follow.create({
      data: {
        followerId: user1.id,
        followingId: user2.id,
      },
    });
  } catch (error) {
    console.log('Follow relationship already exists, skipping...');
  }

  // Create a friendship
  try {
    await prisma.friendship.create({
      data: {
        userId: user1.id,
        friendId: user2.id,
        status: 'ACCEPTED',
      },
    });
  } catch (error) {
    console.log('Friendship already exists, skipping...');
  }

  // Create health profiles for Better Me section
  try {
    await prisma.healthProfile.upsert({
      where: { userId: user1.id },
      update: {},
      create: {
        userId: user1.id,
        age: 32,
        weight: 78.5,
        height: 180,
        gender: 'male',
        activityLevel: 'moderate',
        goals: 'Weight loss, muscle gain',
        dietaryRestrictions: 'None',
      },
    });
  } catch (error) {
    console.log('Health profile for user1 already exists, skipping...');
  }

  try {
    await prisma.healthProfile.upsert({
      where: { userId: user2.id },
      update: {},
      create: {
        userId: user2.id,
        age: 28,
        weight: 65,
        height: 165,
        gender: 'female',
        activityLevel: 'high',
        goals: 'Maintain fitness, improve flexibility',
        dietaryRestrictions: 'Vegetarian',
      },
    });
  } catch (error) {
    console.log('Health profile for user2 already exists, skipping...');
  }

  // Create a chat between users
  let chat;
  try {
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: {
              in: [user1.id, user2.id],
            },
          },
        },
      },
    });

    if (existingChat) {
      console.log('Chat already exists, skipping creation...');
      chat = existingChat;
    } else {
      chat = await prisma.chat.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              {
                userId: user1.id,
                role: 'MEMBER',
              },
              {
                userId: user2.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });
    }
  } catch (error) {
    console.log('Error creating chat:', error);
    // Create a new chat anyway
    chat = await prisma.chat.create({
      data: {
        isGroup: false,
      },
    });

    // Then add participants
    try {
      await prisma.chatParticipant.createMany({
        data: [
          {
            userId: user1.id,
            chatId: chat.id,
            role: 'MEMBER',
          },
          {
            userId: user2.id,
            chatId: chat.id,
            role: 'MEMBER',
          },
        ],
        skipDuplicates: true,
      });
    } catch (participantError) {
      console.log('Error adding chat participants:', participantError);
    }
  }

  // Add some messages to the chat
  try {
    const existingMessages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
      take: 1,
    });

    if (existingMessages.length === 0) {
      await prisma.message.create({
        data: {
          content: 'Hey Sarah, how are you doing?',
          chatId: chat.id,
          senderId: user1.id,
          receiverId: user2.id,
        },
      });

      await prisma.message.create({
        data: {
          content: 'Hi David! I\'m good, just finished my latest art project.',
          chatId: chat.id,
          senderId: user2.id,
          receiverId: user1.id,
        },
      });
    } else {
      console.log('Messages already exist, skipping...');
    }
  } catch (error) {
    console.log('Error creating messages:', error);
  }

  // Create AI token limits for users
  try {
    await prisma.aITokenLimit.upsert({
      where: { userId: user1.id },
      update: {
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user1.id,
        tier: 'FREE',
        limit: 150,
        usage: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.log('AI token limit for user1 already exists, skipping...');
  }

  try {
    await prisma.aITokenLimit.upsert({
      where: { userId: user2.id },
      update: {
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user2.id,
        tier: 'FREE',
        limit: 150,
        usage: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.log('AI token limit for user2 already exists, skipping...');
  }

  // Add a sample reel for testing
  try {
    const existingReel = await prisma.reel.findFirst({
      where: {
        userId: user1.id,
        caption: 'First test reel on DapDip! #TechTok',
      },
    });

    if (!existingReel) {
      await prisma.reel.create({
        data: {
          caption: 'First test reel on DapDip! #TechTok',
          userId: user1.id,
          visibility: Visibility.PUBLIC,
          duration: 15.5,
          media: {
            create: [
              {
                type: MediaType.VIDEO,
                url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
                thumbnailUrl: 'https://i.imgur.com/1234.jpg',
                duration: 15.5,
                width: 1080,
                height: 1920,
              },
            ],
          },
        },
      });
      console.log('Created sample reel');
    } else {
      console.log('Sample reel already exists, skipping...');
    }
  } catch (error) {
    console.log('Error creating sample reel:', error);
  }

  // Seed reel categories and effects
  await seedReelData(prisma);

  // Seed event categories
  await seedEventCategories(prisma);

  // Seed events
  await seedEvents(prisma);

  // Seed subscription plans
  await seedSubscriptionPlans();

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });