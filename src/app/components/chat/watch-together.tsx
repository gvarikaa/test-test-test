'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Play, Pause, X, Film, Youtube, Link as LinkIcon, SkipBack, SkipForward, Users, Clock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/trpc/api';
import { clientPusher, getChatChannel, PusherEvents } from '@/lib/pusher';

interface WatchTogetherProps {
  chatId: string;
  sessionId?: string;
  onClose: () => void;
  mode: 'create' | 'join';
}

interface WatchSession {
  id: string;
  mediaUrl: string;
  mediaTitle: string | null;
  mediaThumbnail: string | null;
  mediaType: string;
  mediaSource: string;
  mediaLengthSec: number | null;
  currentPosition: number;
  isPlaying: boolean;
  createdBy: string;
  createdAt: Date;
  participants: Record<string, { joined: Date }>;
}

export default function WatchTogether({
  chatId,
  sessionId,
  onClose,
  mode,
}: WatchTogetherProps) {
  // State for creating a new session
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<{
    type: string;
    source: string;
    thumbnail?: string;
    length?: number;
  } | null>(null);
  
  // State for viewing/controlling a session
  const [session, setSession] = useState<WatchSession | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'join');
  const [localPosition, setLocalPosition] = useState(0);
  const [isLocallyPaused, setIsLocallyPaused] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  const { data: session: authSession } = useSession();
  
  // TRPC mutations and queries
  const { mutate: createSession } = api.chat.createWatchTogetherSession.useMutation({
    onSuccess: (createdSession) => {
      setSession(createdSession);
      setIsCreating(false);
    },
    onError: (err) => {
      setError(`Failed to create watch session: ${err.message}`);
      setIsCreating(false);
    },
  });
  
  const { mutate: updateSession } = api.chat.updateWatchTogetherSession.useMutation({
    onError: (err) => {
      console.error('Failed to update session:', err);
    },
  });
  
  // Function to extract info from a URL
  const parseMediaUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // YouTube
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.substring(1);
        } else if (urlObj.pathname.includes('embed')) {
          videoId = urlObj.pathname.split('/').pop() || '';
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
        
        if (videoId) {
          // Get video info using the video ID
          return {
            type: 'video',
            source: 'youtube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            videoId,
          };
        }
      }
      
      // Direct video URL
      if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
        return {
          type: 'video',
          source: 'direct',
        };
      }
      
      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.substring(1);
        return {
          type: 'video',
          source: 'vimeo',
          videoId,
        };
      }
      
      // Default
      return {
        type: 'unknown',
        source: 'unknown',
      };
    } catch (err) {
      console.error('Error parsing URL:', err);
      return null;
    }
  };
  
  // Get session info when joining
  useEffect(() => {
    if (mode === 'join' && sessionId) {
      // TODO: Implement API to get session info
      // For now, we'll simulate it
      setSession({
        id: sessionId,
        mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mediaTitle: 'Sample Video',
        mediaThumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        mediaType: 'video',
        mediaSource: 'youtube',
        mediaLengthSec: 213,
        currentPosition: 0,
        isPlaying: false,
        createdBy: 'user1',
        createdAt: new Date(),
        participants: {},
      });
      setIsLoading(false);
    }
  }, [mode, sessionId]);
  
  // Set up Pusher subscription for session updates
  useEffect(() => {
    if (!authSession?.user?.id || !chatId || !sessionId) return;

    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    // Listen for updates to the watch session
    channel.bind(PusherEvents.WATCH_TOGETHER_UPDATED, (data: {
      sessionId: string;
      currentPosition: number;
      isPlaying: boolean;
      updatedBy: string;
    }) => {
      if (data.sessionId === sessionId && data.updatedBy !== authSession.user.id) {
        if (session) {
          setSession({
            ...session,
            currentPosition: data.currentPosition,
            isPlaying: data.isPlaying,
          });
          
          // Apply changes to the video
          if (videoRef.current) {
            // Only seek if the difference is significant
            if (Math.abs(videoRef.current.currentTime - data.currentPosition) > 3) {
              videoRef.current.currentTime = data.currentPosition;
            }
            
            if (data.isPlaying) {
              videoRef.current.play().catch(console.error);
            } else {
              videoRef.current.pause();
            }
          }
          
          // Apply changes to YouTube player
          if (youtubePlayerRef.current) {
            if (Math.abs(youtubePlayerRef.current.getCurrentTime() - data.currentPosition) > 3) {
              youtubePlayerRef.current.seekTo(data.currentPosition);
            }
            
            if (data.isPlaying) {
              youtubePlayerRef.current.playVideo();
            } else {
              youtubePlayerRef.current.pauseVideo();
            }
          }
        }
      }
    });
    
    // Listen for participant updates
    channel.bind(PusherEvents.WATCH_TOGETHER_JOINED, (data: { sessionId: string; userId: string }) => {
      if (data.sessionId === sessionId) {
        setParticipants(prev => Array.from(new Set([...prev, data.userId])));
      }
    });
    
    channel.bind(PusherEvents.WATCH_TOGETHER_LEFT, (data: { sessionId: string; userId: string }) => {
      if (data.sessionId === sessionId) {
        setParticipants(prev => prev.filter(id => id !== data.userId));
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getChatChannel(chatId));
    };
  }, [authSession?.user?.id, chatId, sessionId, session]);
  
  // Set up periodic sync for the current position
  useEffect(() => {
    if (!session || !sessionId || !authSession?.user?.id) return;
    
    // Send updates to the server when local position changes
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }
    
    updateTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 2000) return; // Limit updates to once every 2 seconds
      
      let currentTime = 0;
      if (videoRef.current) {
        currentTime = videoRef.current.currentTime;
      } else if (youtubePlayerRef.current) {
        currentTime = youtubePlayerRef.current.getCurrentTime();
      } else {
        return;
      }
      
      // Only update if position has changed significantly
      if (Math.abs(currentTime - localPosition) > 1) {
        setLocalPosition(currentTime);
        
        // Update server if we're not in the middle of seeking
        if (!isSeeking && session) {
          updateSession({
            sessionId,
            currentPosition: Math.floor(currentTime),
            isPlaying: !isLocallyPaused,
          });
          lastUpdateRef.current = now;
        }
      }
    }, 1000);
    
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [session, sessionId, authSession?.user?.id, localPosition, isLocallyPaused, isSeeking, updateSession]);
  
  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle url input change
  const handleUrlChange = (url: string) => {
    setMediaUrl(url);
    setError(null);
    
    // Try to parse the URL for media info
    if (url) {
      const info = parseMediaUrl(url);
      if (info) {
        setMediaInfo(info);
      } else {
        setMediaInfo(null);
      }
    } else {
      setMediaInfo(null);
    }
  };
  
  // Create a new watch session
  const handleCreateSession = () => {
    if (!mediaUrl.trim()) {
      setError('Please enter a valid media URL');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    createSession({
      chatId,
      mediaUrl: mediaUrl.trim(),
      mediaTitle: mediaTitle.trim() || undefined,
      mediaThumbnail: mediaInfo?.thumbnail,
      mediaType: mediaInfo?.type || 'video',
      mediaSource: mediaInfo?.source || 'unknown',
      mediaLengthSec: mediaInfo?.length,
    });
  };
  
  // Play/pause the media
  const togglePlayPause = () => {
    if (!session) return;
    
    const newIsPlaying = isLocallyPaused; // Inverse of current state
    setIsLocallyPaused(!newIsPlaying);
    
    // Update local players
    if (videoRef.current) {
      if (newIsPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
    
    if (youtubePlayerRef.current) {
      if (newIsPlaying) {
        youtubePlayerRef.current.playVideo();
      } else {
        youtubePlayerRef.current.pauseVideo();
      }
    }
    
    // Update the server
    updateSession({
      sessionId: session.id,
      currentPosition: Math.floor(localPosition),
      isPlaying: newIsPlaying,
    });
  };
  
  // Seek forward/backward
  const seek = (seconds: number) => {
    if (!session) return;
    
    setIsSeeking(true);
    
    let newPosition = localPosition + seconds;
    if (newPosition < 0) newPosition = 0;
    if (session.mediaLengthSec && newPosition > session.mediaLengthSec) {
      newPosition = session.mediaLengthSec;
    }
    
    setLocalPosition(newPosition);
    
    // Update video position
    if (videoRef.current) {
      videoRef.current.currentTime = newPosition;
    }
    
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(newPosition);
    }
    
    // Update the server after a short delay
    setTimeout(() => {
      if (session) {
        updateSession({
          sessionId: session.id,
          currentPosition: Math.floor(newPosition),
          isPlaying: !isLocallyPaused,
        });
        setIsSeeking(false);
      }
    }, 500);
  };
  
  // Handle seeking with progress bar
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session || !session.mediaLengthSec) return;
    
    const value = parseInt(e.target.value, 10);
    const newPosition = (value / 100) * session.mediaLengthSec;
    
    setIsSeeking(true);
    setLocalPosition(newPosition);
    
    // Update video position
    if (videoRef.current) {
      videoRef.current.currentTime = newPosition;
    }
    
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(newPosition);
    }
    
    // Update the server after releasing the slider
  };
  
  // Handle progress bar release
  const handleProgressChangeEnd = () => {
    if (!session) return;
    
    updateSession({
      sessionId: session.id,
      currentPosition: Math.floor(localPosition),
      isPlaying: !isLocallyPaused,
    });
    
    setTimeout(() => {
      setIsSeeking(false);
    }, 500);
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    const container = document.getElementById('watch-together-container');
    if (!container) return;
    
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  
  // Render create session form
  const renderCreateForm = () => (
    <div className="p-4 bg-card-bg rounded-lg border border-border-color">
      <h3 className="text-lg font-medium text-text-primary mb-3">
        Watch Together
      </h3>
      
      <div className="space-y-4">
        {/* Media URL input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Video URL
          </label>
          <div className="flex">
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 p-2 bg-input-bg border border-border-color rounded-l-md text-text-primary"
            />
            <div className="p-2 bg-gray-700 border border-l-0 border-border-color rounded-r-md">
              {mediaInfo?.source === 'youtube' ? (
                <Youtube className="h-5 w-5 text-red-500" />
              ) : mediaInfo?.type === 'video' ? (
                <Film className="h-5 w-5 text-blue-500" />
              ) : (
                <LinkIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        
        {/* Media title input (optional) */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={mediaTitle}
            onChange={(e) => setMediaTitle(e.target.value)}
            placeholder="Give your video a title..."
            className="w-full p-2 bg-input-bg border border-border-color rounded-md text-text-primary"
          />
        </div>
        
        {/* Media preview */}
        {mediaInfo?.thumbnail && (
          <div className="mt-2">
            <div className="relative w-full h-40 bg-gray-800 rounded-md overflow-hidden">
              <Image
                src={mediaInfo.thumbnail}
                alt="Media preview"
                layout="fill"
                objectFit="contain"
              />
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-text-primary rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateSession}
            disabled={isCreating || !mediaUrl.trim()}
            className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue-hover disabled:opacity-50 flex items-center gap-1"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Watching'
            )}
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render video player
  const renderVideoPlayer = () => {
    if (!session) return null;
    
    return (
      <div className="flex flex-col h-full" id="watch-together-container">
        {/* Video header */}
        <div className="p-3 border-b border-border-color flex justify-between items-center bg-header-bg">
          <div className="flex items-center">
            <Film className="h-4 w-4 text-text-secondary mr-2" />
            <h3 className="font-medium text-sm text-text-primary">
              {session.mediaTitle || 'Watch Together'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-text-secondary flex items-center">
              <Users className="h-3 w-3 mr-1" />
              <span>{Object.keys(session.participants || {}).length || 1}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-text-secondary hover:text-text-primary rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Video container */}
        <div className="flex-1 bg-black flex justify-center items-center">
          {session.mediaSource === 'youtube' ? (
            <div className="w-full h-full">
              {/* YouTube iframe would go here */}
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-white">YouTube Player Placeholder</div>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={session.mediaUrl}
              className="max-w-full max-h-full"
              onPlay={() => setIsLocallyPaused(false)}
              onPause={() => setIsLocallyPaused(true)}
              onSeeked={() => {
                if (videoRef.current) {
                  setLocalPosition(videoRef.current.currentTime);
                }
              }}
            />
          )}
        </div>
        
        {/* Video controls */}
        <div className="p-3 bg-card-bg border-t border-border-color">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
              <span>{formatTime(localPosition)}</span>
              <span>{session.mediaLengthSec ? formatTime(session.mediaLengthSec) : '00:00'}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={session.mediaLengthSec ? (localPosition / session.mediaLengthSec) * 100 : 0}
                onChange={handleProgressChange}
                onMouseUp={handleProgressChangeEnd}
                onTouchEnd={handleProgressChangeEnd}
                className="w-full appearance-none bg-gray-700 h-2 rounded-md cursor-pointer"
              />
              <div
                className="absolute top-0 left-0 h-2 bg-accent-blue rounded-md"
                style={{ width: `${session.mediaLengthSec ? (localPosition / session.mediaLengthSec) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {/* Playback controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => seek(-10)}
                className="p-2 text-text-secondary hover:text-text-primary rounded-full"
                title="Skip back 10 seconds"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlayPause}
                className="p-3 bg-accent-blue rounded-full hover:bg-accent-blue-hover"
              >
                {isLocallyPaused ? (
                  <Play className="h-5 w-5 text-white" />
                ) : (
                  <Pause className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                onClick={() => seek(10)}
                className="p-2 text-text-secondary hover:text-text-primary rounded-full"
                title="Skip forward 10 seconds"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                {participants.length} watching
              </span>
              {/* More controls can be added here */}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-card-bg rounded-lg border border-border-color h-64 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-text-secondary mb-3 mx-auto" />
          <p className="text-text-secondary">Loading watch session...</p>
        </div>
      </div>
    );
  }
  
  // Show creation form or video player
  return (
    <div className="bg-card-bg rounded-lg border border-border-color overflow-hidden h-full">
      {session ? renderVideoPlayer() : renderCreateForm()}
    </div>
  );
}