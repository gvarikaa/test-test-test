"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/trpc/api";
import { useSession } from "next-auth/react";
import { Send, X, Minimize, Bot, Lightbulb, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  initialMessages?: Message[];
  onClose: () => void;
  onMinimize: () => void;
  isMinimized?: boolean;
}

export function AIAssistant({
  initialMessages = [],
  onClose,
  onMinimize,
  isMinimized = false,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: session } = useSession();
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<number>(0);

  // tRPC query to get token limit
  const { data: tokenData } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // tRPC mutation to chat with the AI assistant
  const { mutate: sendMessage } = api.ai.chatWithAssistant.useMutation({
    onSuccess: (data) => {
      const newAssistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, newAssistantMessage]);
      setTokenUsage((prev) => prev + data.tokenUsage);
      setIsLoading(false);
      scrollToBottom();
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${error.message || "Something went wrong. Please try again."}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      scrollToBottom();
    },
  });

  // Update token limit when data changes
  useEffect(() => {
    if (tokenData) {
      setTokenLimit(tokenData.limit);
      setTokenUsage(tokenData.usage);
    }
  }, [tokenData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when assistant is opened
  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus();
    }
  }, [isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);

    // Send message to API
    sendMessage({
      message: input.trim(),
      context: messages.slice(-5).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Suggestions for the user
  const suggestions = [
    "Can you analyze my latest posts?",
    "Help me come up with post ideas",
    "What are the trending topics today?",
    "Give me diet tips for weight loss",
    "Suggest a workout routine for beginners",
  ];

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg cursor-pointer z-20" onClick={() => onMinimize()}>
        <Bot className="w-6 h-6" />
      </div>
    );
  }

  const remainingTokens = tokenLimit !== null ? tokenLimit - tokenUsage : null;
  const isTokenLimitReached = remainingTokens !== null && remainingTokens <= 0;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-background border border-border rounded-lg shadow-lg flex flex-col z-20 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border flex justify-between items-center bg-muted/10">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onMinimize}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
            aria-label="Minimize"
          >
            <Minimize className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">AI Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me anything about DapDip, get content suggestions, or help with your health journey!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-75"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="p-3 border-t border-border overflow-x-auto whitespace-nowrap">
          <p className="text-xs text-muted-foreground mb-2 flex items-center">
            <Lightbulb className="w-3 h-3 mr-1" />
            Try asking:
          </p>
          <div className="flex gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 whitespace-nowrap"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Token limit indicator */}
      {tokenLimit !== null && (
        <div className="px-3 py-1 text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Token usage: {tokenUsage}/{tokenLimit}</span>
            <span className={remainingTokens && remainingTokens < 100 ? "text-red-500" : ""}>
              {remainingTokens} remaining
            </span>
          </div>
          <div className="mt-1 bg-muted rounded-full h-1 overflow-hidden">
            <div
              className={`h-full ${remainingTokens && remainingTokens < 100 ? "bg-red-500" : "bg-primary"}`}
              style={{ width: `${(tokenUsage / tokenLimit) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end">
          <textarea
            ref={inputRef}
            placeholder={isTokenLimitReached ? "Token limit reached" : "Type a message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isTokenLimitReached}
            className="flex-1 p-2 bg-transparent border-none focus:outline-none resize-none text-sm max-h-20"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isTokenLimitReached}
            className="p-2 text-muted-foreground hover:text-primary disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}