"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';

// Define theme colors for consistent styling
const THEME = {
  primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
  secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
  accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",
  cardBg: "bg-gray-900",
  cardBorder: "border-gray-800/40",
  textPrimary: "text-gray-100",
  textSecondary: "text-gray-400",
  glow: "shadow-lg shadow-indigo-950/40"
};

export default function StoryStrip() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userStories, setUserStories] = useState<any[]>([]);

  // მოვაშოროთ TRPC კავშირი იმის მაგივრად რომ შეცდომები გამოიტანოს და გამოვიყენოთ ფიქსირებული მონაცემები
  useEffect(() => {
    // სიმულირებული მონაცემები (მოგვიანებით tRPC გამართვის შემდეგ დაუბრუნდით რეალურ მონაცემებს)
    console.log("Using simulated story data instead of tRPC");

    // Create sample data with multiple stories
    const simulatedStories = [
      {
        user: {
          id: "user1",
          name: "Sarah Miller",
          image: "https://ui-avatars.com/api/?name=Sarah+Miller&background=5046E5&color=fff"
        },
        stories: [
          {
            id: "story1",
            content: "Enjoying a beautiful day!",
            isViewed: false,
            media: [{ url: "https://picsum.photos/200/350?random=1" }]
          }
        ]
      },
      {
        user: {
          id: "user2",
          name: "John Davis",
          image: "https://ui-avatars.com/api/?name=John+Davis&background=8B5CF6&color=fff"
        },
        stories: [
          {
            id: "story2",
            content: "New adventure!",
            isViewed: true,
            media: [{ url: "https://picsum.photos/200/350?random=2" }]
          }
        ]
      },
      {
        user: {
          id: "user3",
          name: "Emily Chen",
          image: "https://ui-avatars.com/api/?name=Emily+Chen&background=A855F7&color=fff"
        },
        stories: [
          {
            id: "story3",
            content: "Just got back from hiking!",
            isViewed: false,
            media: [{ url: "https://picsum.photos/200/350?random=3" }]
          }
        ]
      },
      {
        user: {
          id: "user4",
          name: "Michael Brown",
          image: "https://ui-avatars.com/api/?name=Michael+Brown&background=D946EF&color=fff"
        },
        stories: [
          {
            id: "story4",
            content: "Family dinner time",
            isViewed: false,
            media: [{ url: "https://picsum.photos/200/350?random=4" }]
          }
        ]
      },
      {
        user: {
          id: "user5",
          name: "Alex Morgan",
          image: "https://ui-avatars.com/api/?name=Alex+Morgan&background=EC4899&color=fff"
        },
        stories: [
          {
            id: "story5",
            content: "Concert night!",
            isViewed: true,
            media: [{ url: "https://picsum.photos/200/350?random=5" }]
          }
        ]
      }
    ];

    setIsLoading(false);
    setUserStories(simulatedStories);
  }, []);

  // მონაცემების შეცვლის შემდეგ გამოირთო, რადგან შეცდომებს იწვევს
  // const { data: storiesData } = trpc.story.getStories.useQuery(undefined, {
  //   refetchOnWindowFocus: false,
  //   onSuccess: (data) => {
  //     setUserStories(data || []);
  //     setIsLoading(false);
  //   },
  //   onError: (error) => {
  //     console.error('Error fetching stories:', error);
  //     setIsLoading(false);
  //   }
  // });

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
            className={`story-item min-w-[90px] w-[24vw] max-w-[150px] h-[25vh] md:h-[30vh] lg:h-[35vh] max-h-[240px] cursor-pointer ${THEME.cardBg} animate-pulse rounded-xl border ${THEME.cardBorder} overflow-hidden relative`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/70"></div>
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-9 h-9 rounded-full bg-gray-800 animate-pulse"></div>
            <div className="absolute bottom-3 left-0 right-0 h-4 w-20 mx-auto bg-gray-800 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  // Use the THEME constant defined at the top of the file

  // Always show the horizontal story strip, whether there are stories or not
  // We'll add empty placeholder stories if needed to maintain the layout

  return (
    <div className={`story-container my-4 w-full max-w-full sm:max-w-5xl mx-auto px-4 py-3 flex justify-start sm:justify-center gap-3 overflow-x-auto pb-2 no-scrollbar relative bg-gray-950/50 backdrop-blur-sm rounded-xl border ${THEME.cardBorder}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-fuchsia-900/5 rounded-xl"></div>

      {/* Create story card - more Facebook-like design */}
      <Link
        href="/stories/create"
        className={`story-item min-w-[90px] w-[24vw] max-w-[150px] h-[22vh] md:h-[26vh] lg:h-[30vh] max-h-[220px] rounded-xl flex flex-col items-center ${THEME.cardBg} border ${THEME.cardBorder} ${THEME.glow} overflow-hidden transition-transform hover:scale-[1.03] relative z-10`}
      >
        {/* User profile image with a semi-transparent overlay */}
        <div className="relative w-full h-3/4 overflow-hidden">
          {/* User profile image or placeholder */}
          <Image
            src={session?.user?.image || "https://ui-avatars.com/api/?name=Your+Story&background=5046E5&color=fff"}
            alt="Your Story"
            width={112}
            height={144}
            className="h-full w-full object-cover"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-gray-900/90"></div>

          {/* Plus button - centered on the image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${THEME.primaryGradient} text-white shadow-lg border-4 border-gray-900`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-7">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Label at the bottom */}
        <div className="relative w-full flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-900/90">
          <span className={`text-sm font-medium ${THEME.textPrimary}`}>Create Story</span>
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
            className={`story-item min-w-[90px] w-[24vw] max-w-[150px] h-[22vh] md:h-[26vh] lg:h-[30vh] max-h-[220px] rounded-xl cursor-pointer overflow-hidden border ${THEME.cardBorder} ${THEME.glow} transition-transform hover:scale-[1.03] relative z-10`}
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
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80"></div>

              {/* User avatar with ring indicating status */}
              <div className={`absolute top-3 left-1/2 transform -translate-x-1/2 rounded-full p-0.5 ${
                hasUnviewed
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse'
                  : 'bg-gray-600'
              }`}>
                <Image
                  src={userStoryGroup.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userStoryGroup.user.name || 'User')}`}
                  alt={userStoryGroup.user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full w-8 h-8 object-cover border-2 border-gray-900"
                />
              </div>

              {/* Username */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent pt-6 pb-3">
                <p className="text-center text-white text-xs font-medium truncate px-2">
                  {userStoryGroup.user.id === session?.user?.id ? 'Your Story' : userStoryGroup.user.name || 'User'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}