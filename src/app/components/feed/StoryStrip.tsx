"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';

export default function StoryStrip() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userStories, setUserStories] = useState<any[]>([]);

  const { data: storiesData } = trpc.story.getStories.useQuery(undefined, {
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      setUserStories(data || []);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Error fetching stories:', error);
      setIsLoading(false);
    }
  });

  // Function to handle viewing a story
  const handleViewStory = (userId: string, storyId: string) => {
    router.push(`/stories/${userId}?story=${storyId}`);
  };

  // Function to check if user has unviewed stories
  const hasUnviewedStories = (userStoryGroup: any) => {
    return userStoryGroup.stories.some((story: any) => !story.isViewed);
  };

  // Loading placeholders
  if (isLoading) {
    return (
      <div className="story-container my-4 w-full max-w-full sm:max-w-5xl mx-auto px-4 py-2 flex justify-start sm:justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="story-item min-w-[90px] w-[24vw] max-w-[150px] h-[25vh] md:h-[30vh] lg:h-[35vh] max-h-[240px] cursor-pointer bg-gray-200 animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  // No stories to display
  if (userStories.length === 0) {
    return (
      <div className="story-container my-4 w-full max-w-full sm:max-w-5xl mx-auto px-4 py-2 flex justify-start sm:justify-center overflow-x-auto pb-2 no-scrollbar">
        {/* Only show Create Story card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
          <Link href="/stories/create" className="flex flex-col items-center justify-center mb-3">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg font-medium">Create Story</span>
          </Link>
          <p className="text-gray-600 dark:text-gray-300">No stories to display. Be the first to create a story!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="story-container my-4 w-full max-w-full sm:max-w-5xl mx-auto px-4 py-2 flex justify-start sm:justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
      {/* Create story card */}
      <Link href="/stories/create" className="story-item min-w-[90px] w-[24vw] max-w-[150px] h-[25vh] md:h-[30vh] lg:h-[35vh] max-h-[240px] rounded-xl flex flex-col items-center bg-white dark:bg-gray-800 shadow overflow-hidden">
        <div className="relative w-full h-2/3 overflow-hidden">
          <Image
            src="https://picsum.photos/200/350?random=11"
            alt="Create Story"
            width={112}
            height={144}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        <div className="relative w-full flex-1 flex flex-col items-center justify-center">
          <div className="absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="mt-4 text-sm font-medium dark:text-white">Create Story</span>
        </div>
      </Link>

      {/* Story cards */}
      {userStories.map((userStoryGroup) => {
        // Get the most recent story to display as preview
        const previewStory = userStoryGroup.stories[0];
        // Check if user has unviewed stories
        const hasUnviewed = hasUnviewedStories(userStoryGroup);

        // Get first image from the media array or use a placeholder
        const previewImage = previewStory?.media?.length > 0
          ? previewStory.media[0].url
          : `https://picsum.photos/200/350?random=${userStoryGroup.user.id}`;

        return (
          <div
            key={userStoryGroup.user.id}
            className="story-item min-w-[90px] w-[24vw] max-w-[150px] h-[25vh] md:h-[30vh] lg:h-[35vh] max-h-[240px] rounded-xl cursor-pointer overflow-hidden"
            onClick={() => handleViewStory(userStoryGroup.user.id, previewStory.id)}
          >
            {/* Preview image */}
            <div className="relative w-full h-full">
              <Image
                src={previewImage}
                alt={userStoryGroup.user.name || 'Story'}
                width={112}
                height={200}
                className="h-full w-full object-cover"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>

              {/* User avatar with ring indicating status */}
              <div className={`absolute top-3 left-1/2 transform -translate-x-1/2 rounded-full p-0.5 ${hasUnviewed ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-400'}`}>
                <Image
                  src={userStoryGroup.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userStoryGroup.user.name || 'User')}`}
                  alt={userStoryGroup.user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full w-8 h-8 object-cover border-2 border-white"
                />
              </div>

              {/* Username */}
              <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-medium truncate px-2">
                {userStoryGroup.user.id === session?.user?.id ? 'Your Story' : userStoryGroup.user.name || 'User'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}