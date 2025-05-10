"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { MediaType } from '@prisma/client';

interface StoryViewerProps {
  userId: string;
  initialStoryId?: string;
}

export default function StoryViewer({ userId, initialStoryId }: StoryViewerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get stories for the user
  const { data: storiesData, isLoading: storiesLoading } = trpc.story.getStories.useQuery(
    { userId },
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        if (data && data.length > 0) {
          const userStoryGroup = data[0]; // There should only be one user's stories
          setUserStories(userStoryGroup.stories || []);
          
          // If initialStoryId is provided, set currentStoryIndex to that story
          if (initialStoryId) {
            const storyIndex = userStoryGroup.stories.findIndex((s: any) => s.id === initialStoryId);
            if (storyIndex !== -1) {
              setCurrentStoryIndex(storyIndex);
            }
          }
        }
        setIsLoading(false);
      },
      onError: (error) => {
        console.error('Error fetching stories:', error);
        setIsLoading(false);
      }
    }
  );

  const viewStoryMutation = trpc.story.viewStory.useMutation();
  const { data: viewersData, refetch: refetchViewers } = trpc.story.getViewers.useQuery(
    { storyId: userStories[currentStoryIndex]?.id || '' },
    {
      enabled: showViewers && userStories.length > 0 && userStories[currentStoryIndex]?.userId === session?.user?.id,
      refetchOnWindowFocus: false,
    }
  );

  // When story changes, mark it as viewed and reset progress
  useEffect(() => {
    setProgress(0);
    if (userStories.length > 0 && currentStoryIndex < userStories.length && session?.user) {
      const currentStory = userStories[currentStoryIndex];
      
      // Mark story as viewed if it's not the user's own story
      if (currentStory.userId !== session.user.id) {
        viewStoryMutation.mutate({ storyId: currentStory.id });
      }
      
      // Update the URL with the current story ID without refreshing
      router.replace(`/stories/${userId}?story=${currentStory.id}`, { scroll: false });
    }
  }, [currentStoryIndex, userStories, session, userId, router, viewStoryMutation]);

  // Progress timer
  useEffect(() => {
    if (isLoading || userStories.length === 0 || paused) return;
    
    // Calculate the duration based on media type
    const currentStory = userStories[currentStoryIndex];
    let duration = 5000; // Default 5 seconds for images
    
    const mediaItem = currentStory?.media?.[0];
    if (mediaItem?.type === MediaType.VIDEO && mediaItem.duration) {
      duration = mediaItem.duration * 1000; // Convert seconds to ms
    }
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Set up a new interval
    const interval = 100; // Update progress every 100ms
    const steps = duration / interval;
    let currentStep = 0;
    
    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      const newProgress = (currentStep / steps) * 100;
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        goToNextStory();
      }
    }, interval);
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStoryIndex, userStories, isLoading, paused]);

  // Handle video elements
  useEffect(() => {
    const currentStory = userStories[currentStoryIndex];
    const mediaItem = currentStory?.media?.[0];
    
    if (mediaItem?.type === MediaType.VIDEO && videoRef.current) {
      if (paused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => console.error('Error playing video:', err));
      }
    }
  }, [currentStoryIndex, userStories, paused]);

  const goToNextStory = () => {
    if (currentStoryIndex < userStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      // If it's the last story, close the viewer
      router.push('/');
    }
  };

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  const togglePause = () => {
    setPaused(!paused);
  };

  const toggleViewers = () => {
    if (showViewers) {
      setShowViewers(false);
    } else {
      setShowViewers(true);
      refetchViewers();
    }
  };

  if (isLoading || storiesLoading || userStories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-t-2 border-accent-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentStory = userStories[currentStoryIndex];
  const mediaItem = currentStory?.media?.[0];
  const isOwnStory = currentStory?.userId === session?.user?.id;
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex space-x-1 z-20">
        {userStories.map((story, index) => (
          <div 
            key={story.id} 
            className="h-1 bg-gray-700 rounded-full flex-1 overflow-hidden"
          >
            <div 
              className={`h-full bg-white transition-all duration-100 ease-linear ${
                index < currentStoryIndex ? 'w-full' : index > currentStoryIndex ? 'w-0' : ''
              }`}
              style={index === currentStoryIndex ? { width: `${progress}%` } : {}}
            ></div>
          </div>
        ))}
      </div>
      
      {/* Story content */}
      <div className="relative w-full h-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Media content */}
        {mediaItem?.type === MediaType.IMAGE && (
          <Image
            src={mediaItem.url}
            alt="Story"
            fill
            className="object-contain"
            onClick={togglePause}
          />
        )}
        
        {mediaItem?.type === MediaType.VIDEO && (
          <video
            ref={videoRef}
            src={mediaItem.url}
            className="w-full h-full object-contain"
            playsInline
            muted={false}
            controls={false}
            onClick={togglePause}
          />
        )}
        
        {/* User info bar */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between p-4 z-10">
          <div className="flex items-center space-x-2">
            <Image
              src={currentStory.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.user?.name || 'User')}`}
              alt={currentStory.user?.name || 'User'}
              width={40}
              height={40}
              className="rounded-full w-8 h-8 object-cover"
            />
            <div>
              <p className="text-white text-sm font-medium">
                {isOwnStory ? 'Your Story' : currentStory.user?.name || 'User'}
              </p>
              <p className="text-gray-300 text-xs">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            {isOwnStory && (
              <button 
                onClick={toggleViewers} 
                className="text-white flex items-center text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                </svg>
                <span>{currentStory.viewCount || 0}</span>
              </button>
            )}
            
            <button onClick={handleClose} className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Navigation controls */}
        <div className="absolute inset-0 flex justify-between z-10">
          <div 
            className="w-1/3 h-full" 
            onClick={(e) => {
              e.stopPropagation();
              goToPrevStory();
            }}
          ></div>
          <div 
            className="w-1/3 h-full" 
            onClick={(e) => {
              e.stopPropagation();
              goToNextStory();
            }}
          ></div>
        </div>
        
        {/* Caption if any */}
        {currentStory.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm">{currentStory.caption}</p>
          </div>
        )}
      </div>
      
      {/* Viewers panel */}
      {showViewers && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-4 z-30 rounded-t-2xl max-h-[50%] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">Viewers ({viewersData?.length || 0})</h3>
            <button onClick={() => setShowViewers(false)} className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {viewersData?.map((view) => (
              <div key={view.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src={view.viewer.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(view.viewer.name || 'User')}`}
                    alt={view.viewer.name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full w-10 h-10 object-cover"
                  />
                  <div>
                    <p className="text-white font-medium">{view.viewer.name || view.viewer.username}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(view.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {viewersData?.length === 0 && (
              <p className="text-gray-400 text-center py-4">No views yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}