// Demo messages for when we're using demo contacts
export const getDemoMessages = (contactName: string, currentUserName: string = 'You'): any[] => {
  // Generate message times from the past few hours to now
  const getTimes = (count: number) => {
    const now = new Date();
    const times = [];
    for (let i = count; i > 0; i--) {
      // Hours ago decreasing as i decreases
      const date = new Date(now.getTime() - (i * 30 * 60 * 1000)); // i * 30 minutes ago
      times.push(date);
    }
    return times;
  };
  
  const times = getTimes(5);
  
  // General messages that can work for any contact
  const messages = [
    { 
      id: `demo-1-${contactName}`,
      content: `Hi ${currentUserName}, how are you today?`,
      createdAt: times[0],
      senderId: 'demo-contact',
      receiverId: 'current-user',
      media: [],
      sender: {
        id: 'demo-contact',
        name: contactName,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=0D8ABC&color=fff`
      }
    },
    {
      id: `demo-2-${contactName}`,
      content: "I'm doing well, thanks for asking! How about you?",
      createdAt: times[1],
      senderId: 'current-user',
      receiverId: 'demo-contact',
      media: [],
      sender: {
        id: 'current-user',
        name: currentUserName,
        image: null
      }
    },
    {
      id: `demo-3-${contactName}`,
      content: "Everything's going great! I've been checking out the platform's new features.",
      createdAt: times[2],
      senderId: 'demo-contact',
      receiverId: 'current-user',
      media: [],
      sender: {
        id: 'demo-contact',
        name: contactName,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=0D8ABC&color=fff`
      }
    },
    {
      id: `demo-4-${contactName}`,
      content: "That sounds interesting! What do you think of them so far?",
      createdAt: times[3],
      senderId: 'current-user',
      receiverId: 'demo-contact',
      media: [],
      sender: {
        id: 'current-user',
        name: currentUserName,
        image: null
      }
    },
    {
      id: `demo-5-${contactName}`,
      content: "I'm really impressed with the chat functionality and how smoothly everything works.",
      createdAt: times[4],
      senderId: 'demo-contact',
      receiverId: 'current-user',
      media: [],
      sender: {
        id: 'demo-contact',
        name: contactName,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=0D8ABC&color=fff`
      }
    }
  ];
  
  return messages;
};

// Helper function to add a new message to a demo conversation
export const addDemoMessage = (
  messages: any[],
  content: string,
  isCurrentUser: boolean,
  contactName: string,
  currentUserName: string = 'You'
): any => {
  const lastMessage = messages[messages.length - 1];
  const now = new Date();
  const messageId = `demo-${messages.length + 1}-${isCurrentUser ? 'user' : contactName}`;
  
  return {
    id: messageId,
    content,
    createdAt: now,
    senderId: isCurrentUser ? 'current-user' : 'demo-contact',
    receiverId: isCurrentUser ? 'demo-contact' : 'current-user',
    media: [],
    sender: {
      id: isCurrentUser ? 'current-user' : 'demo-contact',
      name: isCurrentUser ? currentUserName : contactName,
      image: isCurrentUser ? null : `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=0D8ABC&color=fff`
    }
  };
};