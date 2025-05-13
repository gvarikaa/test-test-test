// Chat-specific seed script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting chat seed...');

  // Fetch existing users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@dapdip.com' } });
  const user1 = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });

  if (!admin || !user1 || !user2) {
    console.error('Required users not found. Please run the full seed first.');
    return;
  }

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

  console.log('Chat seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during chat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });