"use client";

import { useEffect } from 'react';
import { StoryViewer } from '@/app/components/stories';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function StoryViewerPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const searchParams = useSearchParams();
  const storyId = searchParams.get('story');
  const { status } = useSession();

  // Prevent scroll when story viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
        <h2 className="text-white text-xl mb-4">Sign in to view stories</h2>
        <a 
          href="/auth/signin" 
          className="bg-accent-blue text-white py-2 px-6 rounded-lg font-medium"
        >
          Sign in
        </a>
      </div>
    );
  }

  return <StoryViewer userId={userId} initialStoryId={storyId || undefined} />;
}