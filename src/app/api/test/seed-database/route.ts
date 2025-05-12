import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcrypt';
import { Visibility, MediaType } from '@prisma/client';

/**
 * Force seed the database with test posts for debugging
 */
export async function GET() {
  try {
    // Check if we already have posts
    const postCount = await db.post.count();
    
    // If we have posts, just return that info
    if (postCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already has ${postCount} posts. No need to seed.`,
        postsFound: postCount
      });
    }
    
    // Create test users if they don't exist
    const password = await hash('password123', 12);
    
    let user1 = await db.user.findUnique({
      where: { email: 'user1@example.com' }
    });
    
    if (!user1) {
      user1 = await db.user.create({
        data: {
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
        }
      });
    }
    
    let user2 = await db.user.findUnique({
      where: { email: 'user2@example.com' }
    });
    
    if (!user2) {
      user2 = await db.user.create({
        data: {
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
        }
      });
    }
    
    // Create some posts
    const posts = [];
    
    // Post 1 with image
    const post1 = await db.post.create({
      data: {
        content: 'Just started using the new DapDip platform! Excited to connect with everyone here. #technology',
        userId: user1.id,
        visibility: Visibility.PUBLIC,
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://picsum.photos/800/600',
            },
          ],
        },
      },
    });
    posts.push(post1);
    
    // Post 2 text only
    const post2 = await db.post.create({
      data: {
        content: 'Morning workout complete! 💪 Feeling energized for the day. #fitness',
        userId: user1.id,
        visibility: Visibility.PUBLIC,
      },
    });
    posts.push(post2);
    
    // Post 3 with image
    const post3 = await db.post.create({
      data: {
        content: 'Just finished my latest digital art piece. What do you think? #art',
        userId: user2.id,
        visibility: Visibility.PUBLIC,
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://picsum.photos/800/600?random=2',
            },
          ],
        },
      },
    });
    posts.push(post3);
    
    // Add a few comments
    const comment1 = await db.comment.create({
      data: {
        content: 'Welcome to DapDip! You\'ll love it here.',
        userId: user2.id,
        postId: post1.id,
      },
    });
    
    const comment2 = await db.comment.create({
      data: {
        content: 'Impressive work! I love the colors.',
        userId: user1.id,
        postId: post3.id,
      },
    });
    
    // Add a few reactions
    const reaction1 = await db.reaction.create({
      data: {
        type: 'LIKE',
        userId: user2.id,
        postId: post1.id,
      },
    });
    
    const reaction2 = await db.reaction.create({
      data: {
        type: 'LOVE',
        userId: user1.id,
        postId: post3.id,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      users: [user1, user2],
      posts,
      comments: [comment1, comment2],
      reactions: [reaction1, reaction2],
    });
    
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}