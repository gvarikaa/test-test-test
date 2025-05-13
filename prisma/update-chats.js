// Simple chat update script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting chat update...');

  // Fetch existing users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@dapdip.com' } });
  const user1 = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });

  if (!admin || !user1 || !user2) {
    console.error('Required users not found. Please run the full seed first.');
    return;
  }

  // Get existing chats between users
  const chats = await prisma.chat.findMany({
    where: {
      isGroup: false,
    },
    include: {
      participants: true,
      messages: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }
    }
  });

  console.log(`Found ${chats.length} existing chats`);

  // Add messages to chats with no messages
  for (const chat of chats) {
    if (chat.messages.length === 0) {
      console.log(`Adding messages to chat id: ${chat.id}`);
      
      // Find the participant IDs
      const participants = chat.participants.map(p => p.userId);
      
      if (participants.length !== 2) {
        console.log(`Skipping chat with ${participants.length} participants`);
        continue;
      }
      
      // Get user names for realistic messages
      const userName1 = participants[0] === admin.id ? 'Admin' : 
                        participants[0] === user1.id ? 'David' : 'Sarah';
                      
      const userName2 = participants[1] === admin.id ? 'Admin' : 
                        participants[1] === user1.id ? 'David' : 'Sarah';
      
      // Create sample messages
      await prisma.message.create({
        data: {
          content: `Hey ${userName2}, how are you doing?`,
          chatId: chat.id,
          senderId: participants[0],
          receiverId: participants[1],
        },
      });
      
      await prisma.message.create({
        data: {
          content: `Hi ${userName1}! I'm doing great, thanks for asking!`,
          chatId: chat.id,
          senderId: participants[1],
          receiverId: participants[0],
        },
      });
      
      await prisma.message.create({
        data: {
          content: `Good to hear! Have you checked out the latest platform updates?`,
          chatId: chat.id,
          senderId: participants[0],
          receiverId: participants[1],
        },
      });
      
      console.log(`Added messages between ${userName1} and ${userName2}`);
    } else {
      console.log(`Chat ${chat.id} already has ${chat.messages.length} messages, skipping.`);
    }
  }

  console.log('Chat update completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during chat update:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });