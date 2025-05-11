"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/trpc/api";
import { useSession } from "next-auth/react";
import {
  Send,
  X,
  Minimize,
  Bot,
  Lightbulb,
  Sparkles,
  Settings,
  Brain,
  MemoryStick,
  Plus,
  Clock,
  MessageSquare,
  Trash2,
  Check,
  Star,
  StarOff,
  RefreshCw,
  Copy
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Memory {
  id: string;
  type: string;
  content: string;
  importance: number;
  context?: string;
  createdAt: Date;
}

interface Personality {
  id: string;
  name: string;
  description: string;
  traits: string[];
}

interface EnhancedAIAssistantProps {
  initialMessages?: Message[];
  onClose: () => void;
  onMinimize: () => void;
  isMinimized?: boolean;
}

export function EnhancedAIAssistant({
  initialMessages = [],
  onClose,
  onMinimize,
  isMinimized = false,
}: EnhancedAIAssistantProps) {
  // UI state
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<string>("long-term");
  const [newMemoryImportance, setNewMemoryImportance] = useState<number>(5);
  const [newMemoryContext, setNewMemoryContext] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Chat settings
  const [selectedPersonality, setSelectedPersonality] = useState<string>("default");
  const [contextSize, setContextSize] = useState<string>("medium");
  const [extractMemories, setExtractMemories] = useState<boolean>(true);
  const [useMemories, setUseMemories] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-pro");
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: session } = useSession();
  
  // Data state
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<number>(0);
  const [memories, setMemories] = useState<Memory[]>([]);

  // Get token limit
  const { data: tokenData } = api.ai.getTokenLimit.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Get user's preferred personality
  const { data: userPersonalityData } = api.ai.getUserPersonality.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  
  // Get available personalities
  const { data: personalitiesData } = api.ai.getChatPersonalities.useQuery(undefined, {
    enabled: !!session?.user?.id && showSettings,
  });
  
  // Get user memories
  const { data: memoriesData, refetch: refetchMemories } = api.ai.getChatMemories.useQuery(
    { limit: 50 },
    {
      enabled: !!session?.user?.id && showMemories,
    }
  );

  // TRPC mutations
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
      
      if (showMemories) {
        refetchMemories();
      }
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
  
  const { mutate: createMemory } = api.ai.createChatMemory.useMutation({
    onSuccess: () => {
      setNewMemoryContent("");
      setNewMemoryContext("");
      refetchMemories();
    },
  });
  
  const { mutate: deleteMemory } = api.ai.deleteChatMemory.useMutation({
    onSuccess: () => {
      refetchMemories();
    },
  });
  
  const { mutate: setUserPersonality } = api.ai.setUserPersonality.useMutation();

  // Update data from queries
  useEffect(() => {
    if (tokenData) {
      setTokenLimit(tokenData.limit);
      setTokenUsage(tokenData.usage);
    }
  }, [tokenData]);
  
  useEffect(() => {
    if (userPersonalityData?.personality) {
      setSelectedPersonality(userPersonalityData.personality);
    }
  }, [userPersonalityData]);
  
  useEffect(() => {
    if (memoriesData) {
      setMemories(memoriesData);
    }
  }, [memoriesData]);

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
      context: messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      model: selectedModel as "gemini-1.5-pro" | "gemini-pro" | "2.5-flash",
      personality: selectedPersonality as any,
      extractMemories,
      useMemories,
      contextSize: contextSize as "small" | "medium" | "large" | "maximum",
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
  
  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) return;
    
    createMemory({
      content: newMemoryContent,
      type: newMemoryType as any,
      importance: newMemoryImportance,
      context: newMemoryContext || undefined,
    });
  };
  
  const handleDeleteMemory = (memoryId: string) => {
    deleteMemory({ memoryId });
  };
  
  const handleSavePersonality = () => {
    setUserPersonality({ personality: selectedPersonality as any });
    setShowSettings(false);
  };
  
  const handleCopyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Suggestions for the user
  const suggestions = [
    "Can you analyze my latest posts?",
    "Help me come up with post ideas",
    "What are the trending topics today?",
    "Give me diet tips for weight loss",
    "Suggest a workout routine for beginners",
  ];
  
  // Memory types for dropdown
  const memoryTypes = [
    { value: "short-term", label: "Short-term" },
    { value: "long-term", label: "Long-term" },
    { value: "episodic", label: "Episodic" },
    { value: "semantic", label: "Semantic" },
  ];

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg cursor-pointer z-20" 
        onClick={() => onMinimize()}
      >
        <Bot className="w-6 h-6" />
      </div>
    );
  }

  const remainingTokens = tokenLimit !== null ? tokenLimit - tokenUsage : null;
  const isTokenLimitReached = remainingTokens !== null && remainingTokens <= 0;
  
  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'short-term':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'long-term':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'episodic':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'semantic':
        return <Lightbulb className="h-4 w-4 text-purple-500" />;
      default:
        return <MemoryStick className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getImportanceStars = (importance: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i}>
          {i < Math.round(importance / 2) ? (
            <Star className="h-3 w-3 inline text-amber-500" />
          ) : (
            <StarOff className="h-3 w-3 inline text-gray-300" />
          )}
        </span>
      ));
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[32rem] bg-background border border-border rounded-lg shadow-lg flex flex-col z-20 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border flex justify-between items-center bg-muted/10">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium">
            AI Assistant 
            {selectedPersonality !== 'default' && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({personalitiesData?.find(p => p.id === selectedPersonality)?.name || selectedPersonality})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMemories(!showMemories)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md"
            aria-label="Memory"
          >
            <MemoryStick className="w-4 h-4" />
          </button>
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

      {showSettings ? (
        // Settings Panel
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
            <Settings className="w-4 h-4" />
            Assistant Settings
          </h3>
          
          <div className="space-y-4">
            {/* Personality selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Personality</label>
              <select
                value={selectedPersonality}
                onChange={(e) => setSelectedPersonality(e.target.value)}
                className="w-full p-2 text-sm rounded-md border border-border bg-background"
              >
                {personalitiesData?.map((personality) => (
                  <option key={personality.id} value={personality.id}>
                    {personality.name} - {personality.description}
                  </option>
                ))}
              </select>
              
              {personalitiesData && selectedPersonality && (
                <div className="mt-2 text-xs">
                  <p className="text-muted-foreground">{personalitiesData.find(p => p.id === selectedPersonality)?.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {personalitiesData.find(p => p.id === selectedPersonality)?.traits.map((trait, index) => (
                      <span key={index} className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Model selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 text-sm rounded-md border border-border bg-background"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Best quality)</option>
                <option value="gemini-pro">Gemini Pro (Balanced)</option>
                <option value="2.5-flash">Gemini 2.5 Flash (Fastest)</option>
              </select>
            </div>
            
            {/* Context size */}
            <div>
              <label className="block text-sm font-medium mb-1">Context Window Size</label>
              <select
                value={contextSize}
                onChange={(e) => setContextSize(e.target.value)}
                className="w-full p-2 text-sm rounded-md border border-border bg-background"
              >
                <option value="small">Small (8K tokens)</option>
                <option value="medium">Medium (16K tokens)</option>
                <option value="large">Large (32K tokens)</option>
                <option value="maximum">Maximum (128K tokens)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Larger context windows help the assistant remember more of your conversation.
              </p>
            </div>
            
            {/* Memory settings */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Memory Features</label>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="use-memories"
                  checked={useMemories}
                  onChange={(e) => setUseMemories(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="use-memories" className="text-sm">
                  Use assistant memory
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extract-memories"
                  checked={extractMemories}
                  onChange={(e) => setExtractMemories(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="extract-memories" className="text-sm">
                  Automatically extract memories from conversations
                </label>
              </div>
              
              <p className="mt-1 text-xs text-muted-foreground">
                Memory features help the assistant remember important information across conversations.
              </p>
            </div>
            
            {/* Save settings button */}
            <div className="pt-2">
              <button
                onClick={handleSavePersonality}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      ) : showMemories ? (
        // Memories Panel
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
            <MemoryStick className="w-4 h-4" />
            Assistant Memory
          </h3>
          
          {/* Add memory form */}
          <div className="mb-4 p-3 border border-border rounded-md bg-muted/10">
            <h4 className="text-sm font-medium mb-2">Add New Memory</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder="What should I remember?"
                className="w-full p-2 text-sm rounded-md border border-border bg-background"
              />
              
              <div className="flex gap-2">
                <select
                  value={newMemoryType}
                  onChange={(e) => setNewMemoryType(e.target.value)}
                  className="flex-1 p-2 text-xs rounded-md border border-border bg-background"
                >
                  {memoryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={newMemoryImportance}
                  onChange={(e) => setNewMemoryImportance(Number(e.target.value))}
                  className="w-20 p-2 text-xs rounded-md border border-border bg-background"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}/10
                    </option>
                  ))}
                </select>
              </div>
              
              <input
                type="text"
                value={newMemoryContext}
                onChange={(e) => setNewMemoryContext(e.target.value)}
                placeholder="Context (optional)"
                className="w-full p-2 text-sm rounded-md border border-border bg-background"
              />
              
              <button
                onClick={handleAddMemory}
                disabled={!newMemoryContent.trim()}
                className="w-full py-1.5 mt-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Memory
              </button>
            </div>
          </div>
          
          {/* Memories list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Stored Memories</h4>
            
            {memories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No memories stored yet. Add some memories or let the assistant extract them from your conversations.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {memories.map((memory) => (
                  <div key={memory.id} className="p-2 border border-border rounded-md bg-background relative group">
                    <div className="flex items-start gap-2">
                      <div className="mt-1">
                        {getMemoryIcon(memory.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words pr-6">{memory.content}</p>
                        {memory.context && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Context: {memory.context}
                          </p>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-xs text-muted-foreground">
                            {memory.type} • {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
                          </div>
                          <div className="text-xs">
                            {getImportanceStars(memory.importance)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {memories.length > 0 && (
              <button
                onClick={() => refetchMemories()}
                className="mt-2 w-full py-1.5 bg-muted hover:bg-muted/80 rounded-md text-sm flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Memories
              </button>
            )}
          </div>
        </div>
      ) : (
        // Chat Messages
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
                  className={`max-w-[85%] rounded-lg p-3 relative group ${
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
                  
                  <button
                    onClick={() => handleCopyMessage(message)}
                    className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full 
                      ${message.role === "user" ? "text-primary-foreground/70 hover:bg-primary-foreground/10" : "text-foreground/70 hover:bg-muted-foreground/10"}`}
                    aria-label="Copy message"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
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
      )}

      {/* Suggestions */}
      {messages.length === 0 && !showSettings && !showMemories && (
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
      {tokenLimit !== null && !showSettings && !showMemories && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-t border-border">
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
      {!showSettings && !showMemories && (
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
      )}
    </div>
  );
}