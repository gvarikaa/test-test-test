'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatManager } from './chat-manager';

interface ChatButtonProps {
  userId: string;
  className?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ChatButton({ 
  userId, 
  className = '', 
  children, 
  size = 'md',
  label 
}: ChatButtonProps) {
  // Get the chat manager context with error handling
  const { startChat, error, isLoading, clearError } = useChatManager();
  const [showError, setShowError] = useState(false);

  // Check for errors related to this specific user
  useEffect(() => {
    if (error && error.userId === userId) {
      setShowError(true);
      // Auto-hide error after 3 seconds
      const timer = setTimeout(() => {
        setShowError(false);
        clearError();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error, userId, clearError]);

  // Handle click to start chat
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startChat(userId);
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4.5 w-4.5',
    lg: 'h-5.5 w-5.5',
  };

  if (label) {
    // If label is provided, render a button with text
    return (
      <div className="relative">
        {showError && error && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs p-2 rounded shadow-md whitespace-nowrap z-50">
            {error.message}
          </div>
        )}
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent-blue hover:bg-accent-blue-hover'} text-white rounded-md py-2 px-4 shadow-md transition-all duration-200 ${className}`}
          title="მიწერა"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              {label}
            </>
          )}
        </button>
      </div>
    );
  }

  // Default icon button
  return (
    <div className="relative">
      {showError && error && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs p-2 rounded shadow-md whitespace-nowrap z-50">
          {error.message}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center justify-center rounded-full ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent-blue hover:bg-accent-blue-hover'} text-white shadow-md transition-all duration-200 ${sizeClasses[size]} ${className}`}
        title="მიწერა"
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          children || <MessageSquare className={iconSizes[size]} />
        )}
      </button>
    </div>
  );
}

// For backwards compatibility
export default ChatButton;