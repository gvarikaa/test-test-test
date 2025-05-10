import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { ParticipationStatus } from '@prisma/client';

// Validation schemas
const eventCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  onlineUrl: z.string().url().optional(),
  startsAt: z.date(),
  endsAt: z.date().optional(),
  coverImage: z.string().url().optional(),
  pageId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(), // RRULE format
  recurrenceEndDate: z.date().optional(),
  maxParticipants: z.number().int().positive().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().default(false),
});

const eventUpdateSchema = eventCreateSchema.partial().extend({
  id: z.string(),
});

export const eventRouter = router({
  // Public procedures
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
        filters: z.object({
          upcoming: z.boolean().optional(),
          categoryId: z.string().optional(),
          searchQuery: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          isOnline: z.boolean().optional(),
        }).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { limit = 10, cursor, filters } = input || {};
      const now = new Date();

      // Build filter conditions
      const where = {
        // For public events or events the user is invited to
        OR: [
          { isPrivate: false },
          ...(session?.user
            ? [{ participants: { some: { userId: session.user.id } } }]
            : []),
        ],
        ...(filters?.upcoming ? { startsAt: { gte: now } } : {}),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.isOnline !== undefined ? { isOnline: filters.isOnline } : {}),
        ...(filters?.startDate ? { startsAt: { gte: filters.startDate } } : {}),
        ...(filters?.endDate ? { startsAt: { lte: filters.endDate } } : {}),
        ...(filters?.searchQuery
          ? {
              OR: [
                { title: { contains: filters.searchQuery, mode: 'insensitive' } },
                { description: { contains: filters.searchQuery, mode: 'insensitive' } },
                { location: { contains: filters.searchQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      try {
        // Get events with pagination
        const events = await db.event.findMany({
          where,
          take: limit + 1, // Fetch one extra to determine if there are more
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { startsAt: 'asc' },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            page: {
              select: {
                id: true,
                name: true,
                handle: true,
                logoImage: true,
              },
            },
            participants: {
              take: 5,
              select: {
                id: true,
                status: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            _count: {
              select: {
                participants: true,
              },
            },
            category: true,
            eventTags: {
              include: {
                tag: true,
              },
            },
          },
        });

        // Check if the current user is participating in these events
        let eventsWithParticipation = events;
        if (session?.user) {
          const eventIds = events.map((event) => event.id);
          const userParticipations = await db.eventParticipation.findMany({
            where: {
              eventId: { in: eventIds },
              userId: session.user.id,
            },
          });

          const participationMap = new Map(
            userParticipations.map((p) => [p.eventId, p.status])
          );

          eventsWithParticipation = events.map((event) => ({
            ...event,
            userParticipationStatus: participationMap.get(event.id) || null,
          }));
        }

        // Handle pagination
        let nextCursor: string | undefined = undefined;
        if (eventsWithParticipation.length > limit) {
          const nextItem = eventsWithParticipation.pop();
          nextCursor = nextItem?.id;
        }

        return {
          events: eventsWithParticipation,
          nextCursor,
        };
      } catch (error) {
        console.error('Error fetching events:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch events',
          cause: error,
        });
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { id } = input;

      const event = await db.event.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          page: {
            select: {
              id: true,
              name: true,
              handle: true,
              logoImage: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          category: true,
          eventTags: {
            include: {
              tag: true,
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          updates: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          media: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      // Check if this is a private event and if the user is allowed to view it
      if (
        event.isPrivate &&
        (!session?.user ||
          (session.user.id !== event.creatorId &&
            !event.participants.some((p) => p.userId === session.user.id)))
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this event',
        });
      }

      // Check if the current user is participating in this event
      let userParticipation = null;
      if (session?.user) {
        userParticipation = event.participants.find(
          (p) => p.userId === session.user.id
        );
      }

      return {
        ...event,
        userParticipationStatus: userParticipation?.status || null,
      };
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.eventCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }),

  getTags: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.eventTag.findMany({
      orderBy: { name: 'asc' },
    });
  }),

  getByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { userId } = input;
      const now = new Date();

      // Check if the requested user exists
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Determine if the current user can see private events
      const canSeePrivateEvents = session?.user?.id === userId;

      // Build the query
      const where = {
        OR: [
          // Events created by the user
          { creatorId: userId },
          // Events the user is participating in
          { participants: { some: { userId } } },
        ],
        // Only include public events unless the current user is the requested user
        ...(canSeePrivateEvents ? {} : { isPrivate: false }),
      };

      const events = await db.event.findMany({
        where,
        orderBy: [
          // Upcoming events first
          { startsAt: 'asc' },
        ],
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          participants: {
            take: 5,
            select: {
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });

      // Split events into upcoming and past
      const upcomingEvents = events.filter((e) => e.startsAt >= now);
      const pastEvents = events.filter((e) => e.startsAt < now);

      return {
        upcoming: upcomingEvents,
        past: pastEvents,
      };
    }),

  getCalendarEvents: publicProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { startDate, endDate } = input;

      // Build filter conditions
      const where = {
        startsAt: {
          gte: startDate,
          lte: endDate,
        },
        // Only include public events or events the user is invited to
        OR: [
          { isPrivate: false },
          ...(session?.user
            ? [{ participants: { some: { userId: session.user.id } } }]
            : []),
        ],
      };

      const events = await db.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          participants: {
            take: 3,
            where: {
              status: ParticipationStatus.GOING,
            },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });

      // Format events for calendar display
      return events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.startsAt,
        end: event.endsAt || undefined,
        location: event.location,
        isOnline: event.isOnline,
        creator: event.creator,
        participantCount: event._count.participants,
        coverImage: event.coverImage,
      }));
    }),

  // Protected procedures (require authentication)
  create: protectedProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      try {
        // Extract tags from input if provided
        const { tags, ...eventData } = input;

        // Create the event
        const event = await db.event.create({
          data: {
            ...eventData,
            creatorId: session.user.id,
            // If this is a recurring event, set up recurrence fields
            isRecurring: !!input.recurrencePattern,
            // If this is a private event, add the creator as a participant automatically
            participants: {
              create: [
                {
                  status: ParticipationStatus.GOING,
                  userId: session.user.id,
                },
              ],
            },
            // Connect event to category if provided
            ...(input.categoryId
              ? {
                  category: {
                    connect: {
                      id: input.categoryId,
                    },
                  },
                }
              : {}),
          },
        });

        // Add tags if provided
        if (tags && tags.length > 0) {
          // Get existing tags and create new ones if needed
          const existingTags = await db.eventTag.findMany({
            where: {
              name: {
                in: tags,
              },
            },
          });

          const existingTagNames = existingTags.map((tag) => tag.name);
          const newTagNames = tags.filter(
            (tag) => !existingTagNames.includes(tag)
          );

          // Create new tags
          if (newTagNames.length > 0) {
            await Promise.all(
              newTagNames.map((name) =>
                db.eventTag.create({
                  data: { name },
                })
              )
            );
          }

          // Get all tag IDs
          const allTags = await db.eventTag.findMany({
            where: {
              name: {
                in: tags,
              },
            },
          });

          // Connect tags to event
          await Promise.all(
            allTags.map((tag) =>
              db.eventTagRelation.create({
                data: {
                  eventId: event.id,
                  tagId: tag.id,
                },
              })
            )
          );
        }

        return event;
      } catch (error) {
        console.error('Error creating event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event',
          cause: error,
        });
      }
    }),

  update: protectedProcedure
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { id, tags, ...updateData } = input;

      // Check if the event exists and if the user is the creator
      const event = await db.event.findUnique({
        where: { id },
        include: {
          eventTags: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.creatorId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this event',
        });
      }

      try {
        // Update the event
        const updatedEvent = await db.event.update({
          where: { id },
          data: updateData,
        });

        // Update tags if provided
        if (tags) {
          // Get existing tags and create new ones if needed
          const existingTags = await db.eventTag.findMany({
            where: {
              name: {
                in: tags,
              },
            },
          });

          const existingTagNames = existingTags.map((tag) => tag.name);
          const newTagNames = tags.filter(
            (tag) => !existingTagNames.includes(tag)
          );

          // Create new tags
          if (newTagNames.length > 0) {
            await Promise.all(
              newTagNames.map((name) =>
                db.eventTag.create({
                  data: { name },
                })
              )
            );
          }

          // Get all tag IDs
          const allTags = await db.eventTag.findMany({
            where: {
              name: {
                in: tags,
              },
            },
          });

          // Remove existing tag relations
          await db.eventTagRelation.deleteMany({
            where: {
              eventId: id,
            },
          });

          // Add new tag relations
          await Promise.all(
            allTags.map((tag) =>
              db.eventTagRelation.create({
                data: {
                  eventId: id,
                  tagId: tag.id,
                },
              })
            )
          );
        }

        // Create an event update to notify participants
        await db.eventUpdate.create({
          data: {
            eventId: id,
            userId: session.user.id,
            content: 'Event details have been updated',
            isImportant: true,
          },
        });

        return updatedEvent;
      } catch (error) {
        console.error('Error updating event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update event',
          cause: error,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { id } = input;

      // Check if the event exists and if the user is the creator
      const event = await db.event.findUnique({
        where: { id },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.creatorId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this event',
        });
      }

      try {
        // Notify participants about event cancellation
        const participants = await db.eventParticipation.findMany({
          where: {
            eventId: id,
            userId: { not: session.user.id }, // Don't notify the creator
          },
          select: {
            userId: true,
          },
        });

        if (participants.length > 0) {
          await db.notification.createMany({
            data: participants.map((participant) => ({
              type: 'SYSTEM',
              recipientId: participant.userId,
              senderId: session.user.id,
              content: `Event "${event.title}" has been cancelled`,
              url: `/events`,
            })),
          });
        }

        // Delete the event
        await db.event.delete({
          where: { id },
        });

        return { success: true };
      } catch (error) {
        console.error('Error deleting event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete event',
          cause: error,
        });
      }
    }),

  respondToEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z.nativeEnum(ParticipationStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { eventId, status } = input;

      // Check if the event exists
      const event = await db.event.findUnique({
        where: { id: eventId },
        include: {
          participants: {
            where: {
              userId: session.user.id,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      try {
        // Check if user is already a participant
        const existingParticipation = event.participants[0];

        if (existingParticipation) {
          // Update existing participation
          await db.eventParticipation.update({
            where: { id: existingParticipation.id },
            data: { status },
          });
        } else {
          // Create new participation
          await db.eventParticipation.create({
            data: {
              eventId,
              userId: session.user.id,
              status,
            },
          });
        }

        // Notify event creator if the user is going
        if (
          status === ParticipationStatus.GOING &&
          session.user.id !== event.creatorId
        ) {
          await db.notification.create({
            data: {
              type: 'SYSTEM',
              recipientId: event.creatorId,
              senderId: session.user.id,
              content: `is going to your event "${event.title}"`,
              url: `/events/${eventId}`,
            },
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error responding to event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to respond to event',
          cause: error,
        });
      }
    }),

  inviteUsers: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        userIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { eventId, userIds } = input;

      // Check if the event exists and the user is the creator
      const event = await db.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.creatorId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the event creator can invite users',
        });
      }

      try {
        // Get existing participants to avoid duplicates
        const existingParticipants = await db.eventParticipation.findMany({
          where: {
            eventId,
            userId: {
              in: userIds,
            },
          },
          select: {
            userId: true,
          },
        });

        const existingUserIds = existingParticipants.map((p) => p.userId);
        const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

        if (newUserIds.length === 0) {
          return { success: true, message: 'No new users to invite' };
        }

        // Create invitations for new users
        await db.eventParticipation.createMany({
          data: newUserIds.map((userId) => ({
            eventId,
            userId,
            status: ParticipationStatus.INVITED,
          })),
        });

        // Create notifications for invited users
        await db.notification.createMany({
          data: newUserIds.map((userId) => ({
            type: 'SYSTEM',
            recipientId: userId,
            senderId: session.user.id,
            content: `invited you to the event "${event.title}"`,
            url: `/events/${eventId}`,
          })),
        });

        return {
          success: true,
          invitedCount: newUserIds.length,
        };
      } catch (error) {
        console.error('Error inviting users to event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to invite users to event',
          cause: error,
        });
      }
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { eventId, content } = input;

      // Check if the event exists
      const event = await db.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      try {
        // Add comment
        const comment = await db.eventComment.create({
          data: {
            eventId,
            content,
            userId: session.user.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        });

        // Notify event creator if someone else commented
        if (session.user.id !== event.creatorId) {
          await db.notification.create({
            data: {
              type: 'SYSTEM',
              recipientId: event.creatorId,
              senderId: session.user.id,
              content: `commented on your event "${event.title}"`,
              url: `/events/${eventId}`,
            },
          });
        }

        return comment;
      } catch (error) {
        console.error('Error adding comment to event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add comment to event',
          cause: error,
        });
      }
    }),

  addUpdate: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        content: z.string().min(1),
        isImportant: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { eventId, content, isImportant } = input;

      // Check if the event exists and the user is the creator
      const event = await db.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.creatorId !== session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the event creator can add updates',
        });
      }

      try {
        // Add update
        const update = await db.eventUpdate.create({
          data: {
            eventId,
            userId: session.user.id,
            content,
            isImportant,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        });

        // Notify participants about the update
        if (isImportant) {
          const participants = await db.eventParticipation.findMany({
            where: {
              eventId,
              userId: { not: session.user.id }, // Don't notify the creator
              status: {
                in: [ParticipationStatus.GOING, ParticipationStatus.MAYBE],
              },
            },
            select: {
              userId: true,
            },
          });

          if (participants.length > 0) {
            await db.notification.createMany({
              data: participants.map((participant) => ({
                type: 'SYSTEM',
                recipientId: participant.userId,
                senderId: session.user.id,
                content: `posted an important update for "${event.title}"`,
                url: `/events/${eventId}`,
              })),
            });
          }
        }

        return update;
      } catch (error) {
        console.error('Error adding update to event:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add update to event',
          cause: error,
        });
      }
    }),

  generateEventICS: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { eventId } = input;

      const event = await db.event.findUnique({
        where: { id: eventId },
        include: {
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      // Generate ICS content
      const icsContent = generateICSContent(event);
      return { icsContent };
    }),
});

// Helper function to generate ICS content
function generateICSContent(event: any) {
  const formatDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/-/g, '')
      .replace(/:/g, '')
      .split('.')[0] + 'Z';
  };

  const now = formatDate(new Date());
  const start = formatDate(event.startsAt);
  const end = event.endsAt ? formatDate(event.endsAt) : '';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Social Network//Event Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTAMP:${now}
DTSTART:${start}
${end ? `DTEND:${end}` : ''}
SUMMARY:${event.title}
${event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : ''}
${event.location ? `LOCATION:${event.location}` : ''}
URL:${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}
ORGANIZER;CN=${event.creator.name}:mailto:${event.creator.email || 'noreply@example.com'}
UID:${event.id}@${process.env.NEXT_PUBLIC_APP_URL || 'example.com'}
END:VEVENT
END:VCALENDAR`;
}