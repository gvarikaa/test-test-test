"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { User } from '@prisma/client';

interface ReelPlayerProps {
  reel: {
    id: string;
    caption?: string | null;
    media: {
      id: string;
      url: string;
      type: string;
      thumbnailUrl?: string | null;
    }[];
    user: {
      id: string;
      name?: string | null;
      username?: string | null;
      image?: string | null;
    };
    likeCount: number;
    commentCount: number;
    shareCount: number;
    audio?: {
      title: string;
      artistName?: string | null;
    } | null;
    isLikedByUser?: boolean;
  };
  onLike: (reelId: string) => void;
  onComment: (reelId: string) => void;
  onShare: (reelId: string) => void;
  onFollow?: (userId: string) => void;
  onUserClick?: (userId: string) => void;
  isActive: boolean;
  currentUser?: User | null;
}

const ReelPlayer: React.FC<ReelPlayerProps> = ({
  reel,
  onLike,
  onComment,
  onShare,
  onFollow,
  onUserClick,
  isActive,
  currentUser
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.7,
  });

  const isOwnReel = currentUser?.id === reel.user.id;
  const videoUrl = reel.media.find(m => m.type === 'VIDEO')?.url;
  const thumbnailUrl = reel.media.find(m => m.type === 'VIDEO')?.thumbnailUrl;

  useEffect(() => {
    if (isActive && inView) {
      if (videoRef.current) {
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
        });
        setIsPlaying(true);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, inView]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
        });
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progressValue = 
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progressValue);
    }
  };

  const handleVideoLoaded = () => {
    setLoading(false);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling to buttons
    e.stopPropagation();
    togglePlay();
  };

  return (
    <div 
      ref={inViewRef}
      className="relative flex flex-col w-full h-full max-h-[100vh] snap-start bg-black"
    >
      {/* Video */}
      <div className="relative flex-grow w-full h-full overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        {thumbnailUrl && loading && (
          <Image 
            src={thumbnailUrl} 
            alt="Thumbnail"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        
        {videoUrl && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={videoUrl}
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={handleVideoLoaded}
            onClick={handleVideoClick}
          />
        )}
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 bg-opacity-50">
          <div 
            className="h-full bg-white"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* User info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center mb-2">
            <div 
              className="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
              onClick={() => onUserClick && onUserClick(reel.user.id)}
            >
              {reel.user.image ? (
                <Image 
                  src={reel.user.image} 
                  alt={reel.user.name || 'User'} 
                  width={40} 
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  {(reel.user.name || reel.user.username || 'U').charAt(0)}
                </div>
              )}
            </div>
            <div className="ml-2 flex-grow">
              <p 
                className="text-white font-bold cursor-pointer"
                onClick={() => onUserClick && onUserClick(reel.user.id)}
              >
                {reel.user.username || reel.user.name || 'User'}
              </p>
              {!isOwnReel && (
                <button 
                  className="text-sm text-white hover:text-blue-400"
                  onClick={() => onFollow && onFollow(reel.user.id)}
                >
                  Follow
                </button>
              )}
            </div>
          </div>
          <p className="text-white text-sm mb-4">{reel.caption}</p>
          
          {/* Audio info */}
          {reel.audio && (
            <div className="flex items-center text-white text-xs mb-4">
              <span className="mr-2">♫</span>
              <div className="animate-marquee whitespace-nowrap">
                {reel.audio.title} {reel.audio.artistName ? `• ${reel.audio.artistName}` : ''}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Side controls */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6">
        {/* Like button */}
        <button 
          className="flex flex-col items-center text-white"
          onClick={() => onLike(reel.id)}
        >
          <div className={`p-2 rounded-full ${reel.isLikedByUser ? 'text-red-500' : 'text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={reel.isLikedByUser ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-xs">{reel.likeCount}</span>
        </button>
        
        {/* Comment button */}
        <button 
          className="flex flex-col items-center text-white"
          onClick={() => onComment(reel.id)}
        >
          <div className="p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-xs">{reel.commentCount}</span>
        </button>
        
        {/* Share button */}
        <button 
          className="flex flex-col items-center text-white"
          onClick={() => onShare(reel.id)}
        >
          <div className="p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-xs">{reel.shareCount}</span>
        </button>
        
        {/* Mute/Unmute button */}
        <button 
          className="p-2 rounded-full text-white"
          onClick={toggleMute}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReelPlayer;