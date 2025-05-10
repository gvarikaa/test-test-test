"use client";

import { useEffect } from 'react';
import { StoryCreator } from '@/app/components/stories';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CreateStoryPage() {
  const { status } = useSession();
  const router = useRouter();
  
  // Prevent scroll when creator is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-t-2 border-accent-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4 text-center">
        <h2 className="text-white text-xl mb-4">Sign in to create stories</h2>
        <a 
          href="/auth/signin" 
          className="bg-accent-blue text-white py-2 px-6 rounded-lg font-medium"
        >
          Sign in
        </a>
      </div>
    );
  }

  return <StoryCreator />;
}