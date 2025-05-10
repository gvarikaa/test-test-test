"use client";

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface CreateReelButtonProps {
  variant?: 'fixed' | 'inline';
  className?: string;
}

const CreateReelButton: React.FC<CreateReelButtonProps> = ({ 
  variant = 'fixed',
  className = '' 
}) => {
  const { data: session } = useSession();
  
  if (!session) {
    return null;
  }
  
  const isFixed = variant === 'fixed';
  
  return (
    <Link
      href="/reels/create"
      className={`${
        isFixed 
          ? 'fixed bottom-20 right-4 z-40 rounded-full bg-accent-blue shadow-lg' 
          : 'inline-flex bg-accent-blue hover:bg-blue-600 rounded-md'
      } ${className}`}
    >
      <div className={`flex items-center justify-center text-white ${isFixed ? 'h-14 w-14' : 'py-2 px-4'}`}>
        {isFixed ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
        ) : (
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <span className="font-medium">Create Reel</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default CreateReelButton;