import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { triggerEvent, getChatChannel, getUserChannel, PusherEvents } from '@/lib/pusher';
import { MediaType } from '@prisma/client';

export const chatRouter = router({
  getRecentChats: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      
      // Get all chats where the user is a participant
      const whereClause: {
        participants: {
          some: {
            userId: string;
          };
        };
        id?: {
          lt: string;
        };
      } = {
        participants: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      };
      
      // If a cursor is provided, only fetch chats created after the cursor
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }
      
      const chats = await ctx.db.chat.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              lastReadMessage: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });
      
      let nextCursor: typeof cursor = undefined;
      if (chats.length > limit) {
        const nextItem = chats.pop();
        nextCursor = nextItem!.id;
      }
      
      // Calculate unread messages for each chat
      const chatsWithUnreadCounts = await Promise.all(
        chats.map(async (chat) => {
          const participant = chat.participants.find(
            (p) => p.userId === ctx.session.user.id
          );
          
          if (!participant) {
            return { ...chat, unreadCount: 0 };
          }
          
          const unreadCount = await ctx.db.message.count({
            where: {
              chatId: chat.id,
              senderId: { not: ctx.session.user.id },
              createdAt: {
                gt: participant.lastReadMessage?.createdAt || new Date(0),
              },
            },
          });
          
          return { ...chat, unreadCount };
        })
      );
      
      return {
        chats: chatsWithUnreadCounts,
        nextCursor,
      };
    }),
  
  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { chatId, limit, cursor } = input;
      
      // Check if the user is a participant in this chat
      const participant = await ctx.db.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId: ctx.session.user.id,
          },
        },
      });
      
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }
      
      // Build the where clause
      const whereClause: {
        chatId: string;
        id?: { lt: string };
      } = {
        chatId,
      };
      
      // If a cursor is provided, only fetch messages created before the cursor (for pagination)
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }
      
      // Get messages
      const messages = await ctx.db.message.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          media: true,
        },
      });
      
      // Reverse to get chronological order
      messages.reverse();
      
      let nextCursor: typeof cursor = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }
      
      // Count unread messages
      const unreadCount = await ctx.db.message.count({
        where: {
          chatId,
          senderId: { not: ctx.session.user.id },
          createdAt: {
            gt: participant.lastReadMessage?.createdAt || new Date(0),
          },
        },
      });
      
      return {
        messages,
        nextCursor,
        unreadCount,
      };
    }),
  
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        content: z.string(),
        receiverId: z.string(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).optional(),
        thumbnailUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, content, receiverId, mediaUrl, mediaType, thumbnailUrl } = input;
      
      // Check if the user is a participant in this chat
      const participant = await ctx.db.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId: ctx.session.user.id,
          },
        },
      });
      
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }
      
      // Create the message
      const messageData: {
        chatId: string;
        content: string | null;
        senderId: string;
        receiverId: string;
      } = {
        chatId,
        content: content || null,
        senderId: ctx.session.user.id,
        receiverId,
      };
      
      // Add media if provided
      let media = [];
      if (mediaUrl && mediaType) {
        media = [{
          type: mediaType as MediaType,
          url: mediaUrl,
          thumbnailUrl: thumbnailUrl || null,
        }];
      }
      
      const message = await ctx.db.message.create({
        data: {
          ...messageData,
          media: {
            create: media,
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          media: true,
        },
      });
      
      // Update chat's updatedAt
      await ctx.db.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
      
      // Trigger real-time message via Pusher
      await triggerEvent(
        getChatChannel(chatId),
        PusherEvents.NEW_MESSAGE,
        message
      );
      
      // Also trigger a notification for the user's notification channel
      await triggerEvent(
        getUserChannel(receiverId, 'chat'),
        PusherEvents.NEW_MESSAGE,
        { chatId, senderId: ctx.session.user.id }
      );
      
      // Create a notification
      await ctx.db.notification.create({
        data: {
          type: 'MESSAGE',
          content: mediaUrl ? 'Sent you media' : content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          recipientId: receiverId,
          senderId: ctx.session.user.id,
          messageId: message.id,
          url: `/messages/${chatId}`,
        },
      });
      
      // Trigger real-time notification
      await triggerEvent(
        getUserChannel(receiverId),
        PusherEvents.NEW_NOTIFICATION,
        {
          type: 'MESSAGE',
          senderId: ctx.session.user.id,
          chatId,
          messageId: message.id,
        }
      );
      
      return message;
    }),
  
  markAsRead: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        messageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, messageId } = input;
      
      // Get the participant record
      const participant = await ctx.db.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId: ctx.session.user.id,
          },
        },
      });
      
      if (!participant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }
      
      // If messageId is provided, mark that specific message as last read
      if (messageId) {
        await ctx.db.chatParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            lastReadMessageId: messageId,
          },
        });
      } else {
        // Otherwise, get the latest message and mark it as read
        const latestMessage = await ctx.db.message.findFirst({
          where: { chatId },
          orderBy: { createdAt: 'desc' },
        });
        
        if (latestMessage) {
          await ctx.db.chatParticipant.update({
            where: {
              id: participant.id,
            },
            data: {
              lastReadMessageId: latestMessage.id,
            },
          });
        }
      }
      
      return { success: true };
    }),
  
  createOrGetChat: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      
      // Don't allow creating a chat with yourself
      if (userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create a chat with yourself',
        });
      }
      
      // Check if a direct chat already exists between these users
      const existingChat = await ctx.db.chat.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: [ctx.session.user.id, userId],
              },
            },
          },
          // Make sure there are exactly 2 participants
          _count: {
            participants: 2,
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });
      
      if (existingChat) {
        return existingChat;
      }
      
      // Check if the other user exists
      const otherUser = await ctx.db.user.findUnique({
        where: { id: userId },
      });
      
      if (!otherUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      // Create a new chat
      const newChat = await ctx.db.chat.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              {
                userId: ctx.session.user.id,
                role: 'ADMIN',
              },
              {
                userId,
                role: 'MEMBER',
              },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });
      
      return newChat;
    }),
});