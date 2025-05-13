import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        createdAt: true
      }
    });

    console.log('Users in the database:');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error querying the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();