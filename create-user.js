import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user...');
  
  const password = await bcrypt.hash('password123', 12);
  
  // Test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      hashedPassword: password,
      bio: 'This is a test user account',
      image: 'https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff',
      language: 'en',
    },
  });

  console.log('Created test user:', testUser);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });