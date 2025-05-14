// Custom event system for chat-related events
export const CHAT_EVENTS = {
  START_CHAT: 'chat:start',
  CLOSE_CHAT: 'chat:close',
  MINIMIZE_CHAT: 'chat:minimize',
  MAXIMIZE_CHAT: 'chat:maximize',
} as const;

// Event dispatcher
export const chatEventBus = {
  // Emit event
  emit(event: string, data: any) {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  
  // Listen to event
  on(event: string, callback: (data: any) => void) {
    const handler = (e: CustomEvent) => callback(e.detail);
    window.addEventListener(event, handler as EventListener);
    return () => window.removeEventListener(event, handler as EventListener);
  },
  
  // Start chat helper
  startChat(userId: string) {
    this.emit(CHAT_EVENTS.START_CHAT, { userId });
  }
};