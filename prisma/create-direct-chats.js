// Script to create direct chats between users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting direct chat creation...');

  // Fetch existing users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@dapdip.com' } });
  const user1 = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });

  if (!admin || !user1 || !user2) {
    console.error('Required users not found. Please run the full seed first.');
    return;
  }

  // List of user pairs
  const userPairs = [
    { user1, user2, name1: 'David', name2: 'Sarah' },
    { user1: admin, user2: user1, name1: 'Admin', name2: 'David' },
    { user1: admin, user2: user2, name1: 'Admin', name2: 'Sarah' },
  ];

  // Process each pair
  for (const pair of userPairs) {
    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: {
            userId: pair.user1.id
          }
        },
        AND: [
          {
            participants: {
              some: {
                userId: pair.user2.id
              }
            }
          }
        ]
      },
      include: {
        participants: true,
      }
    });

    if (existingChat) {
      console.log(`Chat between ${pair.name1} and ${pair.name2} already exists (ID: ${existingChat.id})`);
      
      // Check for messages
      const messages = await prisma.message.findMany({
        where: {
          chatId: existingChat.id
        },
        take: 1
      });
      
      if (messages.length === 0) {
        console.log(`No messages found for existing chat, adding messages...`);
        
        // Add messages
        await prisma.message.create({
          data: {
            content: `Hey ${pair.name2}, how are you doing?`,
            chatId: existingChat.id,
            senderId: pair.user1.id,
            receiverId: pair.user2.id,
          },
        });
        
        await prisma.message.create({
          data: {
            content: `Hi ${pair.name1}! I'm doing great, thanks for asking!`,
            chatId: existingChat.id,
            senderId: pair.user2.id,
            receiverId: pair.user1.id,
          },
        });
        
        await prisma.message.create({
          data: {
            content: `Good to hear! Have you checked out the new chat features?`,
            chatId: existingChat.id,
            senderId: pair.user1.id,
            receiverId: pair.user2.id,
          },
        });
        
        console.log(`Added 3 messages to the chat`);
      } else {
        console.log(`Chat already has messages, skipping...`);
      }
    } else {
      console.log(`Creating new chat between ${pair.name1} and ${pair.name2}`);
      
      try {
        // Create a new chat
        const newChat = await prisma.chat.create({
          data: {
            isGroup: false,
            participants: {
              create: [
                {
                  userId: pair.user1.id,
                },
                {
                  userId: pair.user2.id,
                },
              ],
            },
          },
        });
        
        console.log(`Created new chat with ID: ${newChat.id}`);
        
        // Add messages
        await prisma.message.create({
          data: {
            content: `Hey ${pair.name2}, how are you doing?`,
            chatId: newChat.id,
            senderId: pair.user1.id,
            receiverId: pair.user2.id,
          },
        });
        
        await prisma.message.create({
          data: {
            content: `Hi ${pair.name1}! I'm doing great, thanks for asking!`,
            chatId: newChat.id,
            senderId: pair.user2.id,
            receiverId: pair.user1.id,
          },
        });
        
        await prisma.message.create({
          data: {
            content: `Good to hear! Have you checked out the new chat features?`,
            chatId: newChat.id,
            senderId: pair.user1.id,
            receiverId: pair.user2.id,
          },
        });
        
        console.log(`Added 3 messages to the new chat`);
      } catch (error) {
        console.error(`Error creating chat between ${pair.name1} and ${pair.name2}:`, error);
      }
    }
  }

  console.log('Direct chat creation completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during direct chat creation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });