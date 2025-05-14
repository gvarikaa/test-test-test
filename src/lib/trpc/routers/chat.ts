import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { triggerEvent, getChatChannel, getUserChannel, PusherEvents } from '@/lib/pusher';
import { CallStatus, CallType, MediaType, MessageType, PollStatus, TranscriptionQuality } from '@prisma/client';
import { detectLanguage, translateText, SupportedLanguage } from '@/lib/multilingual';

// Voice call schemas
const callInputSchema = z.object({
  chatId: z.string(),
  type: z.enum(['AUDIO', 'VIDEO', 'GROUP_AUDIO', 'GROUP_VIDEO', 'SCREEN_SHARE'])
});

const callParticipantInputSchema = z.object({
  callId: z.string(),
  hasVideo: z.boolean().default(false),
  hasAudio: z.boolean().default(true),
  isScreenSharing: z.boolean().default(false),
  deviceInfo: z.string().optional(),
});

// Translation schemas
const translationInputSchema = z.object({
  messageId: z.string(),
  targetLanguage: z.string(),
});

// Thread schemas
const threadInputSchema = z.object({
  chatId: z.string(),
  parentMessageId: z.string().optional(),
  title: z.string().optional(),
});

// Chat poll schemas
const pollOptionSchema = z.object({
  text: z.string(),
  imageUrl: z.string().optional(),
});

const createPollInputSchema = z.object({
  chatId: z.string(),
  question: z.string(),
  options: z.array(pollOptionSchema).min(2),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  expiresAt: z.date().optional(),
});

const votePollInputSchema = z.object({
  pollId: z.string(),
  optionId: z.string(),
});

// Watch together schemas
const watchTogetherSchema = z.object({
  chatId: z.string(),
  mediaUrl: z.string(),
  mediaTitle: z.string().optional(),
  mediaThumbnail: z.string().optional(),
  mediaType: z.string().default('video'),
  mediaSource: z.string().default('youtube'),
  mediaLengthSec: z.number().optional(),
});

const watchTogetherUpdateSchema = z.object({
  sessionId: z.string(),
  currentPosition: z.number(),
  isPlaying: z.boolean(),
});

// Handwriting schemas
const handwritingMessageSchema = z.object({
  chatId: z.string(),
  receiverId: z.string(),
  strokes: z.any(), // JSON data for strokes
  backgroundColor: z.string().optional(),
  penColor: z.string().optional(),
  penWidth: z.number().optional(),
});

// User chat preferences schema
const userChatPreferencesSchema = z.object({
  preferredLanguage: z.string().optional(),
  autoTranslationEnabled: z.boolean().optional(),
  translateTo: z.string().optional(),
  subtitlesEnabled: z.boolean().optional(),
  subtitlesLanguage: z.string().optional(),
  voiceCallTranscription: z.boolean().optional(),
  handwritingRecognition: z.boolean().optional(),
});

export const chatRouter = router({
  getChatSettings: protectedProcedure
    .input(z.object({ 
      chatId: z.string().min(1, 'Chat ID is required') 
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Log the request for debugging
        console.log('getChatSettings called with:', { 
          input,
          chatId: input.chatId,
          userId: ctx.session.user.id 
        });

        // Validate chatId
        if (!input.chatId || input.chatId === 'demo' || input.chatId.length === 0) {
          console.error('Invalid chatId in getChatSettings:', input);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid chat ID provided: "${input.chatId}"`,
          });
        }

        const chat = await ctx.db.chat.findUnique({
          where: { id: input.chatId },
          include: {
            users: true,
            settings: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!chat) {
          console.log('Chat not found for ID:', input.chatId);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Chat not found with ID: ${input.chatId}`,
          });
        }

        // Ensure user is part of the chat
        const isUserInChat = chat.users.some(user => user.id === ctx.session.user.id);
        if (!isUserInChat) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not part of this chat',
          });
        }

        const lastMessage = chat.messages[0];
        
        return {
          chatId: chat.id,
          isGroup: chat.isGroup,
          settings: chat.settings,
          lastActivity: lastMessage?.createdAt || chat.updatedAt,
          members: chat.users,
        };
      } catch (error) {
        console.error('Error fetching chat settings:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch chat settings',
        });
      }
    }),

  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Get all chat participants for the user
        const participants = await ctx.db.chatParticipant.findMany({
          where: { userId },
          include: {
            chat: {
              include: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
        
        let totalUnread = 0;
        
        for (const participant of participants) {
          const chat = participant.chat;
          const lastMessage = chat.messages[0];
          
          if (!lastMessage || !participant.lastReadMessageId) {
            continue;
          }
          
          // Count unread messages in this chat
          if (lastMessage.id !== participant.lastReadMessageId) {
            const unreadCount = await ctx.db.message.count({
              where: {
                chatId: chat.id,
                createdAt: {
                  gt: participant.lastReadMessageId ? 
                    (await ctx.db.message.findUnique({
                      where: { id: participant.lastReadMessageId },
                      select: { createdAt: true },
                    }))?.createdAt : 
                    new Date(0),
                },
                senderId: {
                  not: userId,
                },
              },
            });
            
            totalUnread += unreadCount;
          }
        }
        
        return { totalUnread };
      } catch (error) {
        console.error('Error getting unread count:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get unread count',
        });
      }
    }),

  getRecentChats: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullish(),
      }).optional().default({
        limit: 20,
        cursor: null
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
      
      // Notify via Pusher that messages have been read
      await triggerEvent(
        getUserChannel(ctx.session.user.id),
        'message:read',
        { chatId, userId: ctx.session.user.id }
      );
      
      return { success: true };
    }),

  addReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { messageId, emoji } = input;
      
      try {
        // Verify the message exists
        const message = await ctx.db.message.findUnique({
          where: { id: messageId },
          include: { chat: { include: { users: true } } },
        });
        
        if (!message) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found',
          });
        }
        
        // Verify user has access to this chat
        const isUserInChat = message.chat.users.some(user => user.id === ctx.session.user.id);
        if (!isUserInChat) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a participant in this chat',
          });
        }
        
        // Check if user already reacted with this emoji
        const existingReaction = await ctx.db.reaction.findFirst({
          where: {
            messageId,
            userId: ctx.session.user.id,
            emoji,
          },
        });
        
        if (existingReaction) {
          // Remove reaction if already exists (toggle)
          await ctx.db.reaction.delete({
            where: { id: existingReaction.id },
          });
          
          // Notify via Pusher
          await triggerEvent(getChatChannel(message.chatId), PusherEvents.REACTION_REMOVED, {
            messageId,
            emoji,
            userId: ctx.session.user.id,
          });
          
          return { action: 'removed', reaction: existingReaction };
        } else {
          // Add new reaction
          const reaction = await ctx.db.reaction.create({
            data: {
              messageId,
              userId: ctx.session.user.id,
              emoji,
            },
          });
          
          // Notify via Pusher
          await triggerEvent(getChatChannel(message.chatId), PusherEvents.REACTION_ADDED, {
            messageId,
            emoji,
            userId: ctx.session.user.id,
          });
          
          return { action: 'added', reaction };
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add reaction',
        });
      }
    }),
  
  createOrGetChat: protectedProcedure
    .input(
      z.object({
        userId: z.string({
          required_error: "userId is required", 
          invalid_type_error: "userId must be a string",
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Log the received input for debugging
      console.log('createOrGetChat received input:', input);
      console.log('Current user:', ctx.session.user.id);
      
      // Extra validation to ensure we have a userId
      if (!input || typeof input !== 'object') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input: expected an object with userId',
        });
      }
      
      const { userId } = input;
      
      if (!userId || typeof userId !== 'string') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid userId: expected a non-empty string',
        });
      }
      
      // Don't allow creating a chat with yourself
      if (userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create a chat with yourself',
        });
      }
      
      try {
        // First check if the other user exists
        const otherUser = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, image: true },
        });
        
        if (!otherUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }
        
        // Check if a direct chat already exists between these users
        // Get all the participant IDs where the current user is a participant
        const userChats = await ctx.db.chatParticipant.findMany({
          where: {
            userId: ctx.session.user.id,
          },
          select: {
            chatId: true,
          },
        });
        
        const userChatIds = userChats.map(chat => chat.chatId);
        
        // Get all the participant IDs where the other user is a participant
        const otherUserChats = await ctx.db.chatParticipant.findMany({
          where: {
            userId: userId,
          },
          select: {
            chatId: true,
          },
        });
        
        const otherUserChatIds = otherUserChats.map(chat => chat.chatId);
        
        // Find chat IDs that are common to both users (potential direct chats)
        const commonChatIds = userChatIds.filter(id => otherUserChatIds.includes(id));
        
        // Now find a direct chat (not a group) with exactly 2 participants
        let existingChat = null;
        
        if (commonChatIds.length > 0) {
          for (const chatId of commonChatIds) {
            const chat = await ctx.db.chat.findFirst({
              where: {
                id: chatId,
                isGroup: false,
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
            
            if (chat && chat.participants.length === 2) {
              existingChat = chat;
              break;
            }
          }
        }
        
        if (existingChat) {
          console.log('Found existing chat:', existingChat.id);
          
          // Safely convert date objects or use fallbacks for missing dates
          const safeDate = (date: Date | null | undefined) => {
            if (!date) return null;
            try {
              return date.toISOString();
            } catch (e) {
              console.error('Error converting date to ISO string:', e);
              return new Date().toISOString(); // Fallback to current date
            }
          };
          
          // Handle the case where Date objects might be serialized already
          const safeParticipant = (p: any) => {
            // Deep clone to avoid mutation
            const participant = { ...p };
            
            // Check if dates are already strings
            if (typeof participant.createdAt === 'string') {
              return participant;
            }
            
            return {
              ...participant,
              createdAt: safeDate(participant.createdAt) || new Date().toISOString(),
              updatedAt: safeDate(participant.updatedAt) || new Date().toISOString(),
              lastActiveAt: participant.lastActiveAt ? safeDate(participant.lastActiveAt) : null,
              muteUntil: participant.muteUntil ? safeDate(participant.muteUntil) : null,
              leftAt: participant.leftAt ? safeDate(participant.leftAt) : null,
            };
          };
          
          return {
            ...existingChat,
            createdAt: safeDate(existingChat.createdAt) || new Date().toISOString(),
            updatedAt: safeDate(existingChat.updatedAt) || new Date().toISOString(),
            participants: existingChat.participants.map(safeParticipant),
          };
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
            settings: {
              create: {
                // Default settings for new chat
                defaultLanguage: 'en',
                translationEnabled: true,
                autoTranslateEnabled: false,
                mediaAutoDownload: true,
                readReceiptsEnabled: true,
                typingIndicatorsEnabled: true,
                enableVoiceCalls: true,
                enableVideoCalls: true,
                enableGroupCalls: true,
                enableScreenSharing: true,
                enableMessageThreads: true,
                enableReactions: true,
                enablePolls: true,
                enableWatchTogether: true,
                enableHandwriting: true,
                enableAIAssistant: true,
              },
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
            settings: true,
          },
        });
        
        console.log('Created new chat:', newChat.id);
        console.log('New chat settings:', newChat.settings);
        
        // Use the same safe date conversion functions for the new chat
        const safeDate = (date: Date | null | undefined) => {
          if (!date) return null;
          try {
            return date.toISOString();
          } catch (e) {
            console.error('Error converting date to ISO string:', e);
            return new Date().toISOString(); // Fallback to current date
          }
        };
        
        const safeParticipant = (p: any) => {
          // Deep clone to avoid mutation
          const participant = { ...p };
          
          // Check if dates are already strings
          if (typeof participant.createdAt === 'string') {
            return participant;
          }
          
          return {
            ...participant,
            createdAt: safeDate(participant.createdAt) || new Date().toISOString(),
            updatedAt: safeDate(participant.updatedAt) || new Date().toISOString(),
            lastActiveAt: participant.lastActiveAt ? safeDate(participant.lastActiveAt) : null,
            muteUntil: participant.muteUntil ? safeDate(participant.muteUntil) : null,
            leftAt: participant.leftAt ? safeDate(participant.leftAt) : null,
          };
        };
        
        // Convert and return safely
        return {
          ...newChat,
          createdAt: safeDate(newChat.createdAt) || new Date().toISOString(),
          updatedAt: safeDate(newChat.updatedAt) || new Date().toISOString(),
          participants: newChat.participants.map(safeParticipant),
        };
      } catch (error) {
        console.error('Error in createOrGetChat:', error);
        
        // Log detailed error information
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }
        
        // For date conversion errors, provide more helpful messages
        if (error instanceof TypeError && error.message.includes('toISOString')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error processing chat dates. Please try again.',
            cause: error,
          });
        }
        
        // Re-throw TRPCErrors
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // For any other errors, wrap in a generic TRPC error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while processing your chat request.',
          cause: error,
        });
      }
    }),

  // Voice calls
  initiateCall: protectedProcedure
    .input(callInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { chatId, type } = input;

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

      // Create a new call
      const call = await ctx.db.call.create({
        data: {
          chatId,
          type: type as CallType,
          status: 'RINGING',
          initiatedBy: ctx.session.user.id,
          participants: {
            create: {
              participantId: participant.id,
              hasVideo: type.includes('VIDEO') || type === 'SCREEN_SHARE',
              hasAudio: true,
            },
          },
        },
        include: {
          participants: true,
        },
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getChatChannel(chatId),
        PusherEvents.CALL_STARTED,
        {
          callId: call.id,
          type,
          initiatedBy: ctx.session.user.id,
          chatId
        }
      );

      // Notify all chat participants individually
      const chatParticipants = await ctx.db.chatParticipant.findMany({
        where: {
          chatId,
          userId: { not: ctx.session.user.id },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      for (const chatParticipant of chatParticipants) {
        await triggerEvent(
          getUserChannel(chatParticipant.user.id),
          PusherEvents.INCOMING_CALL,
          {
            callId: call.id,
            type,
            initiatedBy: ctx.session.user.id,
            chatId,
          }
        );
      }

      // Create a message in the chat to indicate a call was started
      const message = await ctx.db.message.create({
        data: {
          chatId,
          messageType: 'VOICE_CALL',
          content: `${type.includes('VIDEO') ? 'Video' : 'Audio'} call started`,
          senderId: ctx.session.user.id,
        },
      });

      return call;
    }),

  joinCall: protectedProcedure
    .input(callParticipantInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { callId, hasVideo, hasAudio, isScreenSharing, deviceInfo } = input;

      // Get the call
      const call = await ctx.db.call.findUnique({
        where: { id: callId },
        include: {
          chat: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!call) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Call not found',
        });
      }

      // Check if the user is a participant in the chat
      const chatParticipant = call.chat.participants.find(
        (p) => p.userId === ctx.session.user.id
      );

      if (!chatParticipant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }

      // Check if user is already in the call
      const existingCallParticipant = await ctx.db.callParticipant.findFirst({
        where: {
          callId,
          participantId: chatParticipant.id,
        },
      });

      let callParticipant;

      if (existingCallParticipant) {
        // Update existing participant
        callParticipant = await ctx.db.callParticipant.update({
          where: { id: existingCallParticipant.id },
          data: {
            hasVideo,
            hasAudio,
            isScreenSharing,
            deviceInfo,
            leftAt: null, // They've rejoined if they left
          },
        });
      } else {
        // Add new participant
        callParticipant = await ctx.db.callParticipant.create({
          data: {
            callId,
            participantId: chatParticipant.id,
            hasVideo,
            hasAudio,
            isScreenSharing,
            deviceInfo,
          },
        });
      }

      // If call was in RINGING status, update it to ONGOING
      if (call.status === 'RINGING') {
        await ctx.db.call.update({
          where: { id: callId },
          data: { status: 'ONGOING' },
        });
      }

      // Notify other participants that someone joined
      await triggerEvent(
        getChatChannel(call.chatId),
        PusherEvents.CALL_PARTICIPANT_JOINED,
        {
          callId,
          userId: ctx.session.user.id,
          hasVideo,
          hasAudio,
          isScreenSharing
        }
      );

      return callParticipant;
    }),

  leaveCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { callId } = input;

      // Get the call
      const call = await ctx.db.call.findUnique({
        where: { id: callId },
        include: {
          chat: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!call) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Call not found',
        });
      }

      // Find the chat participant
      const chatParticipant = call.chat.participants.find(
        (p) => p.userId === ctx.session.user.id
      );

      if (!chatParticipant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }

      // Update the call participant
      const callParticipant = await ctx.db.callParticipant.updateMany({
        where: {
          callId,
          participantId: chatParticipant.id,
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
        },
      });

      // Check if all participants have left
      const activeParticipants = await ctx.db.callParticipant.count({
        where: {
          callId,
          leftAt: null,
        },
      });

      // If no active participants, end the call
      if (activeParticipants === 0) {
        const endTime = new Date();
        const startTime = call.startedAt;
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        await ctx.db.call.update({
          where: { id: callId },
          data: {
            status: 'ENDED',
            endedAt: endTime,
            duration: durationSeconds,
          },
        });

        // Notify chat that call has ended
        await triggerEvent(
          getChatChannel(call.chatId),
          PusherEvents.CALL_ENDED,
          { callId, duration: durationSeconds }
        );

        // Create a message in the chat to indicate the call ended
        await ctx.db.message.create({
          data: {
            chatId: call.chatId,
            messageType: 'SYSTEM',
            content: `Call ended. Duration: ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`,
            senderId: ctx.session.user.id,
          },
        });
      } else {
        // Notify other participants that someone left
        await triggerEvent(
          getChatChannel(call.chatId),
          PusherEvents.CALL_PARTICIPANT_LEFT,
          { callId, userId: ctx.session.user.id }
        );
      }

      return { success: true };
    }),

  // Message translation
  translateMessage: protectedProcedure
    .input(translationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { messageId, targetLanguage } = input;

      // Get the message
      const message = await ctx.db.message.findUnique({
        where: { id: messageId },
        include: {
          chat: {
            include: {
              participants: {
                where: { userId: ctx.session.user.id },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Message not found',
        });
      }

      // Check if the user is a participant in this chat
      if (message.chat.participants.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }

      // No text content to translate
      if (!message.content) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No content to translate',
        });
      }

      // Check if translation already exists
      if (message.translatedText && message.targetLanguage === targetLanguage) {
        return {
          translatedText: message.translatedText,
          sourceLanguage: message.sourceLanguage,
          targetLanguage: message.targetLanguage,
        };
      }

      try {
        // Translate the message
        const translation = await translateText(
          message.content,
          targetLanguage as SupportedLanguage,
          message.sourceLanguage as SupportedLanguage,
          ctx.session.user.id,
          true
        );

        // Update the message with translation
        await ctx.db.message.update({
          where: { id: messageId },
          data: {
            translatedText: translation.translatedText,
            sourceLanguage: translation.sourceLanguage,
            targetLanguage: translation.targetLanguage,
          },
        });

        return {
          translatedText: translation.translatedText,
          sourceLanguage: translation.sourceLanguage,
          targetLanguage: translation.targetLanguage,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to translate message',
          cause: error,
        });
      }
    }),

  // Message threads
  createThread: protectedProcedure
    .input(threadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { chatId, parentMessageId, title } = input;

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

      // Create thread
      const thread = await ctx.db.chatThread.create({
        data: {
          chatId,
          parentMessageId,
          title: title || 'New Thread',
          createdBy: ctx.session.user.id,
          lastActivityAt: new Date(),
        },
      });

      return thread;
    }),

  getThreads: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { chatId } = input;

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

      // Get threads
      const threads = await ctx.db.chatThread.findMany({
        where: {
          chatId,
          isArchived: false,
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
      });

      return threads;
    }),

  // Chat polls
  createPoll: protectedProcedure
    .input(createPollInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { chatId, question, options, allowMultiple, isAnonymous, expiresAt } = input;

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

      // Create poll
      const poll = await ctx.db.chatPoll.create({
        data: {
          chatId,
          question,
          createdBy: ctx.session.user.id,
          allowMultiple,
          isAnonymous,
          expiresAt,
          status: expiresAt && expiresAt > new Date() ? 'SCHEDULED' : 'ACTIVE',
          options: {
            create: options.map((option, index) => ({
              text: option.text,
              imageUrl: option.imageUrl,
              position: index,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      // Create message with the poll
      const message = await ctx.db.message.create({
        data: {
          chatId,
          messageType: 'POLL',
          content: question,
          senderId: ctx.session.user.id,
          poll: {
            connect: {
              id: poll.id,
            },
          },
        },
      });

      // Trigger real-time message via Pusher
      await triggerEvent(
        getChatChannel(chatId),
        PusherEvents.NEW_POLL,
        { pollId: poll.id, messageId: message.id }
      );

      return {
        poll,
        message,
      };
    }),

  votePoll: protectedProcedure
    .input(votePollInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { pollId, optionId } = input;

      // Get the poll
      const poll = await ctx.db.chatPoll.findUnique({
        where: { id: pollId },
        include: {
          chat: {
            include: {
              participants: {
                where: { userId: ctx.session.user.id },
              },
            },
          },
          options: true,
        },
      });

      if (!poll) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Poll not found',
        });
      }

      // Check if the user is a participant in this chat
      if (poll.chat.participants.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }

      // Check if the poll is active
      if (poll.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Poll is ${poll.status.toLowerCase()}, voting not allowed`,
        });
      }

      // Check if the option exists
      const option = poll.options.find((opt) => opt.id === optionId);
      if (!option) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Poll option not found',
        });
      }

      // Check if multiple votes are allowed
      if (!poll.allowMultiple) {
        // Check if user has already voted
        const existingVote = await ctx.db.chatPollVote.findFirst({
          where: {
            pollId,
            userId: ctx.session.user.id,
          },
        });

        if (existingVote) {
          // If same option, remove vote (toggle)
          if (existingVote.optionId === optionId) {
            await ctx.db.chatPollVote.delete({
              where: { id: existingVote.id },
            });

            // Trigger real-time update
            await triggerEvent(
              getChatChannel(poll.chatId),
              PusherEvents.POLL_VOTE_UPDATED,
              { pollId, userId: ctx.session.user.id, action: 'removed' }
            );

            return { success: true, action: 'removed' };
          } else {
            // Update vote to new option
            await ctx.db.chatPollVote.update({
              where: { id: existingVote.id },
              data: { optionId },
            });

            // Trigger real-time update
            await triggerEvent(
              getChatChannel(poll.chatId),
              PusherEvents.POLL_VOTE_UPDATED,
              { pollId, userId: ctx.session.user.id, action: 'changed', optionId }
            );

            return { success: true, action: 'changed' };
          }
        }
      }

      // Create new vote
      await ctx.db.chatPollVote.create({
        data: {
          pollId,
          optionId,
          userId: ctx.session.user.id,
          participantId: poll.chat.participants[0].id,
        },
      });

      // Trigger real-time update
      await triggerEvent(
        getChatChannel(poll.chatId),
        PusherEvents.POLL_VOTE_UPDATED,
        { pollId, userId: ctx.session.user.id, action: 'added', optionId }
      );

      return { success: true, action: 'added' };
    }),

  getPollResults: protectedProcedure
    .input(z.object({ pollId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { pollId } = input;

      // Get the poll with options and votes
      const poll = await ctx.db.chatPoll.findUnique({
        where: { id: pollId },
        include: {
          chat: {
            include: {
              participants: {
                where: { userId: ctx.session.user.id },
              },
            },
          },
          options: {
            include: {
              votes: true,
            },
          },
        },
      });

      if (!poll) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Poll not found',
        });
      }

      // Check if the user is a participant in this chat
      if (poll.chat.participants.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this chat',
        });
      }

      // Process results
      const totalVotes = poll.options.reduce(
        (sum, option) => sum + option.votes.length,
        0
      );

      const results = poll.options.map((option) => {
        const voteCount = option.votes.length;
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

        // Only include voter info if poll is not anonymous
        const voters = !poll.isAnonymous
          ? option.votes.map((vote) => vote.userId)
          : [];

        // Check if current user voted for this option
        const userVoted = option.votes.some(
          (vote) => vote.userId === ctx.session.user.id
        );

        return {
          optionId: option.id,
          text: option.text,
          voteCount,
          percentage,
          userVoted,
          voters: voters,
        };
      });

      return {
        pollId,
        question: poll.question,
        totalVotes,
        results,
        status: poll.status,
        isAnonymous: poll.isAnonymous,
        allowMultiple: poll.allowMultiple,
        expiresAt: poll.expiresAt,
      };
    }),

  // Watch Together
  createWatchTogetherSession: protectedProcedure
    .input(watchTogetherSchema)
    .mutation(async ({ ctx, input }) => {
      const { chatId, mediaUrl, mediaTitle, mediaThumbnail, mediaType, mediaSource, mediaLengthSec } = input;

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

      // Create watch together session
      const session = await ctx.db.watchTogetherSession.create({
        data: {
          chatId,
          createdBy: ctx.session.user.id,
          mediaUrl,
          mediaTitle: mediaTitle || 'Untitled Media',
          mediaThumbnail,
          mediaType,
          mediaSource,
          mediaLengthSec,
          isPlaying: true,
          currentPosition: 0,
          participants: { [ctx.session.user.id]: { joined: new Date() } },
        },
      });

      // Create message
      const message = await ctx.db.message.create({
        data: {
          chatId,
          messageType: 'WATCH_TOGETHER',
          content: `Started watching ${mediaTitle || mediaUrl}`,
          senderId: ctx.session.user.id,
          receiverId: null,
        },
      });

      // Trigger real-time notification via Pusher
      await triggerEvent(
        getChatChannel(chatId),
        PusherEvents.WATCH_TOGETHER_STARTED,
        { sessionId: session.id, mediaUrl, createdBy: ctx.session.user.id }
      );

      return session;
    }),

  updateWatchTogetherSession: protectedProcedure
    .input(watchTogetherUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { sessionId, currentPosition, isPlaying } = input;

      // Get the session
      const session = await ctx.db.watchTogetherSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Watch together session not found',
        });
      }

      // Check if the user is a participant in this chat
      const participant = await ctx.db.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId: session.chatId,
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

      // Update session
      const updatedSession = await ctx.db.watchTogetherSession.update({
        where: { id: sessionId },
        data: {
          currentPosition,
          isPlaying,
          updatedAt: new Date(),
        },
      });

      // Trigger real-time update via Pusher
      await triggerEvent(
        getChatChannel(session.chatId),
        PusherEvents.WATCH_TOGETHER_UPDATED,
        { sessionId, currentPosition, isPlaying, updatedBy: ctx.session.user.id }
      );

      return updatedSession;
    }),

  // Handwriting Message
  sendHandwritingMessage: protectedProcedure
    .input(handwritingMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { chatId, receiverId, strokes, backgroundColor, penColor, penWidth } = input;

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
      const message = await ctx.db.message.create({
        data: {
          chatId,
          messageType: 'HANDWRITING',
          content: 'Handwritten message',
          senderId: ctx.session.user.id,
          receiverId,
        },
      });

      // Create the handwriting data
      const handwriting = await ctx.db.handwritingMessage.create({
        data: {
          messageId: message.id,
          strokes,
          backgroundColor,
          penColor,
          penWidth,
        },
      });

      // Trigger real-time message via Pusher
      await triggerEvent(
        getChatChannel(chatId),
        PusherEvents.NEW_MESSAGE,
        { ...message, handwriting }
      );

      // Also trigger a notification for the user's notification channel
      if (receiverId) {
        await triggerEvent(
          getUserChannel(receiverId, 'chat'),
          PusherEvents.NEW_MESSAGE,
          { chatId, senderId: ctx.session.user.id }
        );
      }

      return { message, handwriting };
    }),

  // Voice Message (reusing existing audio recorder)
  sendVoiceMessage: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      receiverId: z.string(),
      audioUrl: z.string(),
      duration: z.number(),
      transcript: z.string().optional(),
      waveform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { chatId, receiverId, audioUrl, duration, transcript, waveform } = input;

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
      const message = await ctx.db.message.create({
        data: {
          chatId,
          messageType: 'VOICE_MESSAGE',
          content: transcript || 'Voice message',
          senderId: ctx.session.user.id,
          receiverId,
          voiceTranscript: transcript,
          waveform,
          media: {
            create: [{
              type: 'AUDIO',
              url: audioUrl,
              duration,
            }],
          },
        },
        include: {
          media: true,
        },
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

      return message;
    }),

  // Chat preferences
  updateUserChatPreferences: protectedProcedure
    .input(userChatPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if preferences already exist
      const existingPreferences = await ctx.db.userChatPreference.findUnique({
        where: { userId },
      });

      let preferences;

      if (existingPreferences) {
        // Update existing preferences
        preferences = await ctx.db.userChatPreference.update({
          where: { userId },
          data: input,
        });
      } else {
        // Create new preferences
        preferences = await ctx.db.userChatPreference.create({
          data: {
            userId,
            ...input,
          },
        });
      }

      return preferences;
    }),

  getUserChatPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // Get user preferences
      const preferences = await ctx.db.userChatPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Return default preferences
        return {
          preferredLanguage: 'en',
          autoTranslationEnabled: false,
          subtitlesEnabled: true,
          subtitlesLanguage: 'en',
          voiceCallTranscription: true,
          handwritingRecognition: true,
        };
      }

      return preferences;
    }),
});