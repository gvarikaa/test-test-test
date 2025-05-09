import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Initialize Pusher server for server-side usage
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_APP_KEY || '',
  secret: process.env.PUSHER_APP_SECRET || '',
  cluster: process.env.PUSHER_APP_CLUSTER || 'eu',
  useTLS: true,
});

// Initialize Pusher client for client-side usage
export const clientPusher = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '',
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'eu',
  }
);

// Define valid channel types
export type ChannelType = 'notification' | 'chat' | 'presence';

// Create a user-specific channel name
export const getUserChannel = (userId: string, type: ChannelType = 'notification') => {
  return `private-${type}-${userId}`;
};

// Create a chat channel name
export const getChatChannel = (chatId: string) => {
  return `private-chat-${chatId}`;
};

// Event types
export enum PusherEvents {
  // Notification events
  NEW_NOTIFICATION = 'new-notification',
  READ_NOTIFICATION = 'read-notification',
  
  // Chat events
  NEW_MESSAGE = 'new-message',
  READ_MESSAGE = 'read-message',
  TYPING = 'typing',
  STOP_TYPING = 'stop-typing',
  
  // Presence events
  USER_ONLINE = 'user-online',
  USER_OFFLINE = 'user-offline',
}

// Helper function to trigger an event on the server side
export const triggerEvent = async (
  channel: string,
  event: PusherEvents | string,
  data: Record<string, unknown>
) => {
  try {
    await pusherServer.trigger(channel, event, data);
    return true;
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error);
    return false;
  }
};

// Helper function to authenticate private channels
export const authorizePusher = (socketId: string, channel: string, userId: string) => {
  // Parse the channel name to extract the type and target ID
  const channelMatch = channel.match(/^private-(notification|chat|presence)-(.+)$/);
  
  if (!channelMatch) {
    throw new Error('Invalid channel format');
  }
  
  const [, type, targetId] = channelMatch;
  
  // Ensure the user is authorized to subscribe to this channel
  if (type === 'notification' && targetId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // For chat channels, check if the user is a participant (this would require a DB check)
  // For simplicity, we're omitting that check here
  
  return pusherServer.authorizeChannel(socketId, channel);
};