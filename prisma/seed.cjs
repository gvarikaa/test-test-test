// Using CommonJS format with .cjs extension to avoid ESM issues
const { PrismaClient, Visibility, MediaType } = require('@prisma/client');
const { hash } = require('bcrypt');
const { seedReelData } = require('./seeds/reels.js');
const { seedEvents } = require('./seeds/events');
const { seedEventCategories } = require('./seeds/event-categories');
const { seedSubscriptionPlans } = require('./seeds/subscription-plans');

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

  // Create chats between all users with enhanced functionality
  console.log('Creating chats between users...');

  // Function to create a chat between two users with improved error handling and validation
  async function createChatBetweenUsers(user1Id, user2Id, user1Name, user2Name) {
    try {
      if (user1Id === user2Id) {
        console.log(`Skipping self-chat for ${user1Name}`);
        return null;
      }

      // Check if a chat already exists between these users using a more reliable query
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          participants: {
            some: {
              userId: user1Id
            }
          },
          AND: [
            {
              participants: {
                some: {
                  userId: user2Id
                }
              }
            }
          ]
        },
        include: {
          participants: true,
          messages: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      let chat;
      if (existingChat) {
        console.log(`Chat between ${user1Name} and ${user2Name} already exists, checking messages...`);
        chat = existingChat;
      } else {
        // Create a new chat
        chat = await prisma.chat.create({
          data: {
            isGroup: false,
            participants: {
              create: [
                {
                  userId: user1Id,
                  role: 'MEMBER',
                  lastActiveAt: new Date(),
                },
                {
                  userId: user2Id,
                  role: 'MEMBER',
                  lastActiveAt: new Date(),
                },
              ],
            },
            lastMessageAt: new Date(),
          },
          include: {
            participants: true,
            messages: true,
          },
        });
        console.log(`Created new chat between ${user1Name} and ${user2Name}`);
      }

      // Add sample messages if they don't exist or add more conversation if minimal
      const existingMessages = chat.messages || [];
      
      if (existingMessages.length === 0) {
        // Create a natural conversation flow with multiple messages
        const messages = [
          {
            content: `Hey ${user2Name}, how are you doing?`,
            chatId: chat.id,
            senderId: user1Id,
            receiverId: user2Id,
            createdAt: new Date(Date.now() - 3600000 * 24 * 2) // 2 days ago
          },
          {
            content: `Hi ${user1Name}! I'm doing great, thanks for asking!`,
            chatId: chat.id,
            senderId: user2Id,
            receiverId: user1Id,
            createdAt: new Date(Date.now() - 3600000 * 24 * 2 + 60000) // 2 days ago + 1 minute
          },
          {
            content: `Good to hear! Have you checked out the new features on the platform?`,
            chatId: chat.id,
            senderId: user1Id,
            receiverId: user2Id,
            createdAt: new Date(Date.now() - 3600000 * 24 * 1) // 1 day ago
          },
          {
            content: `Yes, I love the new AI analytics section. It's really helpful!`,
            chatId: chat.id,
            senderId: user2Id,
            receiverId: user1Id,
            createdAt: new Date(Date.now() - 3600000 * 12) // 12 hours ago
          },
          {
            content: `That's great! Let's catch up soon to discuss more ideas.`,
            chatId: chat.id,
            senderId: user1Id,
            receiverId: user2Id,
            createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
          }
        ];

        for (const message of messages) {
          await prisma.message.create({ data: message });
        }
        
        // Update the lastMessageAt field on the chat
        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageAt: new Date(Date.now() - 3600000 * 2) }
        });
        
        console.log(`Added conversation between ${user1Name} and ${user2Name}`);
      } else if (existingMessages.length < 3) {
        // Add a few more messages if there are only a couple
        const additionalMessages = [
          {
            content: `By the way, have you seen the latest updates to the platform?`,
            chatId: chat.id,
            senderId: user1Id,
            receiverId: user2Id,
            createdAt: new Date(Date.now() - 3600000 * 6) // 6 hours ago
          },
          {
            content: `Yes, the new features are awesome! Especially the chat improvements.`,
            chatId: chat.id,
            senderId: user2Id,
            receiverId: user1Id,
            createdAt: new Date(Date.now() - 3600000 * 5) // 5 hours ago
          },
          {
            content: `Definitely! Looking forward to using them more.`,
            chatId: chat.id,
            senderId: user1Id,
            receiverId: user2Id,
            createdAt: new Date(Date.now() - 3600000 * 1) // 1 hour ago
          }
        ];
        
        for (const message of additionalMessages) {
          await prisma.message.create({ data: message });
        }
        
        // Update the lastMessageAt field
        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageAt: new Date(Date.now() - 3600000 * 1) }
        });
        
        console.log(`Added supplementary messages between ${user1Name} and ${user2Name}`);
      } else {
        console.log(`Conversation between ${user1Name} and ${user2Name} already exists with ${existingMessages.length} messages`);
      }

      // Update participants' last active timestamp
      for (const participant of chat.participants) {
        await prisma.chatParticipant.update({
          where: { id: participant.id },
          data: { 
            lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)), // Random activity within last hour
            lastReadMessageId: existingMessages.length > 0 ? existingMessages[0].id : undefined
          }
        });
      }

      return chat;
    } catch (error) {
      console.error(`Error creating chat between ${user1Name} and ${user2Name}:`, error);
      return null;
    }
  }

  // Create chats between all user combinations
  const userPairs = [
    { user1: user1, user2: user2, name1: 'David', name2: 'Sarah' },
    { user1: admin, user2: user1, name1: 'Admin', name2: 'David' },
    { user1: admin, user2: user2, name1: 'Admin', name2: 'Sarah' },
  ];

  // Process chat creation for all pairs
  for (const pair of userPairs) {
    await createChatBetweenUsers(pair.user1.id, pair.user2.id, pair.name1, pair.name2);
  }
  
  // Create a group chat with all users
  console.log('Creating a group chat with all users...');
  
  try {
    const existingGroupChat = await prisma.chat.findFirst({
      where: {
        isGroup: true,
        name: 'DapDip Team',
      },
      include: {
        participants: true,
      },
    });
    
    if (!existingGroupChat) {
      const groupChat = await prisma.chat.create({
        data: {
          name: 'DapDip Team',
          isGroup: true,
          description: 'Official team chat for DapDip platform users',
          image: 'https://ui-avatars.com/api/?name=DapDip+Team&background=8A2BE2&color=fff',
          lastMessageAt: new Date(),
          participants: {
            create: [
              {
                userId: admin.id,
                role: 'OWNER',
                isAdmin: true,
                lastActiveAt: new Date(),
              },
              {
                userId: user1.id,
                role: 'MEMBER',
                lastActiveAt: new Date(Date.now() - 1800000), // 30 minutes ago
              },
              {
                userId: user2.id,
                role: 'MEMBER',
                lastActiveAt: new Date(Date.now() - 3600000), // 1 hour ago
              },
            ],
          },
          settings: {
            create: {
              defaultLanguage: 'en',
              translationEnabled: true,
              readReceiptsEnabled: true,
              typingIndicatorsEnabled: true,
            }
          }
        },
        include: {
          participants: true,
        },
      });
      
      // Add some group messages
      const groupMessages = [
        {
          content: `Welcome everyone to the official DapDip platform team chat!`,
          chatId: groupChat.id,
          senderId: admin.id,
          messageType: 'TEXT',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          content: `Thanks for adding me! Looking forward to collaborating with everyone.`,
          chatId: groupChat.id,
          senderId: user1.id,
          messageType: 'TEXT',
          createdAt: new Date(Date.now() - 86400000 + 3600000), // 1 day ago + 1 hour
        },
        {
          content: `Hello everyone! Excited to be part of this group!`,
          chatId: groupChat.id,
          senderId: user2.id,
          messageType: 'TEXT',
          createdAt: new Date(Date.now() - 86400000 + 7200000), // 1 day ago + 2 hours
        },
        {
          content: `Let's use this space to share updates and collaborate on platform features.`,
          chatId: groupChat.id,
          senderId: admin.id,
          messageType: 'TEXT',
          createdAt: new Date(Date.now() - 43200000), // 12 hours ago
        },
      ];
      
      for (const message of groupMessages) {
        await prisma.message.create({ data: message });
      }
      
      // Update the lastMessageAt field
      await prisma.chat.update({
        where: { id: groupChat.id },
        data: { lastMessageAt: new Date(Date.now() - 43200000) }
      });
      
      console.log('Created group chat with all users');
    } else {
      console.log('Group chat already exists, skipping creation...');
    }
  } catch (error) {
    console.error('Error creating group chat:', error);
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