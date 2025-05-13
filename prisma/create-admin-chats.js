// Script to create chats between admin and other users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting admin chat creation...');

  // Fetch existing users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@dapdip.com' } });
  const user1 = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });

  if (!admin || !user1 || !user2) {
    console.error('Required users not found. Please run the full seed first.');
    return;
  }

  // Create chats between admin and other users
  const userPairs = [
    { user1: admin, user2: user1, name1: 'Admin', name2: 'David' },
    { user1: admin, user2: user2, name1: 'Admin', name2: 'Sarah' },
  ];

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
      console.log(`Chat between ${pair.name1} and ${pair.name2} already exists, skipping...`);
      
      // Check if there are messages
      const messages = await prisma.message.findMany({
        where: {
          chatId: existingChat.id
        },
        take: 1
      });
      
      if (messages.length === 0) {
        console.log(`Adding messages to chat between ${pair.name1} and ${pair.name2}`);
        
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
            content: `Good to hear! Have you checked out the latest platform updates?`,
            chatId: existingChat.id,
            senderId: pair.user1.id,
            receiverId: pair.user2.id,
          },
        });
        
        console.log(`Added messages to existing chat`);
      }
    } else {
      console.log(`Creating new chat between ${pair.name1} and ${pair.name2}`);
      
      // Create new chat
      const newChat = await prisma.chat.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              {
                userId: pair.user1.id,
                role: 'MEMBER',
              },
              {
                userId: pair.user2.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });
      
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
          content: `Good to hear! Have you checked out the latest platform updates?`,
          chatId: newChat.id,
          senderId: pair.user1.id,
          receiverId: pair.user2.id,
        },
      });
      
      console.log(`Created new chat and added messages`);
    }
  }

  // Check if group chat exists
  const existingGroupChat = await prisma.chat.findFirst({
    where: {
      isGroup: true,
      name: 'DapDip Team',
    },
  });
  
  if (existingGroupChat) {
    console.log('Group chat already exists, checking messages...');
    
    // Check if there are messages
    const messages = await prisma.message.findMany({
      where: {
        chatId: existingGroupChat.id
      },
      take: 1
    });
    
    if (messages.length === 0) {
      console.log('Adding messages to group chat');
      
      // Add group messages
      await prisma.message.create({
        data: {
          content: `Welcome everyone to the official DapDip platform team chat!`,
          chatId: existingGroupChat.id,
          senderId: admin.id,
        },
      });
      
      await prisma.message.create({
        data: {
          content: `Thanks for adding me! Looking forward to collaborating with everyone.`,
          chatId: existingGroupChat.id,
          senderId: user1.id,
        },
      });
      
      await prisma.message.create({
        data: {
          content: `Hello everyone! Excited to be part of this group!`,
          chatId: existingGroupChat.id,
          senderId: user2.id,
        },
      });
      
      console.log('Added messages to group chat');
    }
  } else {
    console.log('Creating new group chat');
    
    // Create group chat
    const groupChat = await prisma.chat.create({
      data: {
        name: 'DapDip Team',
        isGroup: true,
        participants: {
          create: [
            {
              userId: admin.id,
              role: 'OWNER',
              isAdmin: true,
            },
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
    
    // Add group messages
    await prisma.message.create({
      data: {
        content: `Welcome everyone to the official DapDip platform team chat!`,
        chatId: groupChat.id,
        senderId: admin.id,
      },
    });
    
    await prisma.message.create({
      data: {
        content: `Thanks for adding me! Looking forward to collaborating with everyone.`,
        chatId: groupChat.id,
        senderId: user1.id,
      },
    });
    
    await prisma.message.create({
      data: {
        content: `Hello everyone! Excited to be part of this group!`,
        chatId: groupChat.id,
        senderId: user2.id,
      },
    });
    
    console.log('Created group chat and added messages');
  }

  console.log('Admin chat creation completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during admin chat creation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });