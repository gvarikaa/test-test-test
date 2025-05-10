import { PrismaClient, ParticipationStatus } from '@prisma/client';
import { addDays, addHours } from 'date-fns';

export async function seedEvents(prisma: PrismaClient) {
  console.log('Seeding events...');

  // Get users to assign as creators
  const users = await prisma.user.findMany({ take: 2 });
  if (users.length < 2) {
    console.log('Not enough users to seed events, skipping...');
    return;
  }

  const [user1, user2] = users;

  // Get categories
  const categories = await prisma.eventCategory.findMany();
  if (categories.length === 0) {
    console.log('No event categories found, skipping event creation...');
    return;
  }

  // Create events only if there are none already
  const existingEventsCount = await prisma.event.count();
  if (existingEventsCount > 0) {
    console.log(`${existingEventsCount} events already exist, skipping...`);
    return;
  }

  // Create sample events
  const now = new Date();
  const events = [
    // User 1's events
    {
      title: 'Tech Meetup: The Future of AI',
      description: 'Join us for an exciting discussion about the future of AI technology and its impact on society. We\'ll have guest speakers and networking opportunities.',
      location: 'Tech Hub, Downtown',
      isOnline: false,
      startsAt: addDays(now, 7),
      endsAt: addHours(addDays(now, 7), 2),
      coverImage: 'https://source.unsplash.com/random/1200x600/?technology',
      isPrivate: false,
      maxParticipants: 50,
      creatorId: user1.id,
      categoryId: categories.find(c => c.name === 'Technology' || c.name === 'Educational' || c.name === 'Professional')?.id,
      eventTags: {
        create: [
          { tag: { connectOrCreate: { where: { name: 'ai' }, create: { name: 'ai' } } } },
          { tag: { connectOrCreate: { where: { name: 'technology' }, create: { name: 'technology' } } } },
          { tag: { connectOrCreate: { where: { name: 'networking' }, create: { name: 'networking' } } } }
        ]
      },
      participants: {
        create: [
          { userId: user1.id, status: ParticipationStatus.GOING },
          { userId: user2.id, status: ParticipationStatus.MAYBE }
        ]
      }
    },
    {
      title: 'Weekend Hiking Adventure',
      description: 'Let\'s explore the beautiful trails of the nearby national park. All skill levels welcome!',
      location: 'Mountain View National Park, East Entrance',
      isOnline: false,
      startsAt: addDays(now, 10),
      endsAt: addHours(addDays(now, 10), 4),
      coverImage: 'https://source.unsplash.com/random/1200x600/?hiking',
      isPrivate: false,
      creatorId: user1.id,
      categoryId: categories.find(c => c.name === 'Sports' || c.name === 'Social')?.id,
      eventTags: {
        create: [
          { tag: { connectOrCreate: { where: { name: 'hiking' }, create: { name: 'hiking' } } } },
          { tag: { connectOrCreate: { where: { name: 'outdoors' }, create: { name: 'outdoors' } } } },
          { tag: { connectOrCreate: { where: { name: 'fitness' }, create: { name: 'fitness' } } } }
        ]
      },
      participants: {
        create: [
          { userId: user1.id, status: ParticipationStatus.GOING }
        ]
      }
    },

    // User 2's events
    {
      title: 'Art Workshop: Digital Painting Basics',
      description: 'Learn the fundamentals of digital painting in this beginner-friendly workshop. Bring your own tablet or use one of our provided tablets.',
      isOnline: false,
      location: 'Creative Space Gallery',
      startsAt: addDays(now, 5),
      endsAt: addHours(addDays(now, 5), 3),
      coverImage: 'https://source.unsplash.com/random/1200x600/?art',
      isPrivate: false,
      maxParticipants: 15,
      creatorId: user2.id,
      categoryId: categories.find(c => c.name === 'Arts & Culture' || c.name === 'Educational' || c.name === 'Entertainment')?.id,
      eventTags: {
        create: [
          { tag: { connectOrCreate: { where: { name: 'art' }, create: { name: 'art' } } } },
          { tag: { connectOrCreate: { where: { name: 'workshop' }, create: { name: 'workshop' } } } },
          { tag: { connectOrCreate: { where: { name: 'digitalart' }, create: { name: 'digitalart' } } } }
        ]
      },
      participants: {
        create: [
          { userId: user2.id, status: ParticipationStatus.GOING }
        ]
      }
    },
    {
      title: 'Online Yoga Session: Mind & Body Wellness',
      description: 'Join our virtual yoga session from the comfort of your home. This session will focus on relaxation and mindfulness techniques.',
      isOnline: true,
      onlineUrl: 'https://zoom.us/j/example',
      startsAt: addDays(now, 3),
      endsAt: addHours(addDays(now, 3), 1),
      coverImage: 'https://source.unsplash.com/random/1200x600/?yoga',
      isPrivate: false,
      isRecurring: true,
      recurrencePattern: 'RRULE:FREQ=WEEKLY',
      recurrenceEndDate: addDays(now, 60),
      creatorId: user2.id,
      categoryId: categories.find(c => c.name === 'Health & Wellness' || c.name === 'Sports')?.id,
      eventTags: {
        create: [
          { tag: { connectOrCreate: { where: { name: 'yoga' }, create: { name: 'yoga' } } } },
          { tag: { connectOrCreate: { where: { name: 'wellness' }, create: { name: 'wellness' } } } },
          { tag: { connectOrCreate: { where: { name: 'mindfulness' }, create: { name: 'mindfulness' } } } }
        ]
      },
      participants: {
        create: [
          { userId: user2.id, status: ParticipationStatus.GOING }
        ]
      }
    }
  ];

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    });
    console.log(`Created event: ${event.title}`);

    // Add a comment to events created by user1
    if (eventData.creatorId === user1.id) {
      await prisma.eventComment.create({
        data: {
          content: 'This looks amazing! Can\'t wait to attend.',
          eventId: event.id,
          userId: user2.id,
        }
      });
    }

    // Add updates to events created by user2
    if (eventData.creatorId === user2.id) {
      await prisma.eventUpdate.create({
        data: {
          content: 'Just a reminder that this event is coming up soon! Please prepare by reading the attached materials.',
          isImportant: true,
          eventId: event.id,
          userId: user2.id,
        }
      });
    }
  }

  console.log('✅ Events seeded successfully');
}