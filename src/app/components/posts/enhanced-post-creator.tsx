'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/trpc/api';
import PostTypeSelector, { PostType } from './post-type-selector';
import LocationPicker from './location-picker';
import AudioRecorder from './audio-recorder';
import AudioPlayer from './audio-player';
import PollCreator from './poll-creator';
import { MediaUploadSection } from './media-upload-section';
import {
  Zap,
  Calendar,
  GlobeIcon,
  Users,
  Lock,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  XCircle,
  LinkIcon,
  File
} from 'lucide-react';

// Extended MediaItem with additional fields
interface MediaItem {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  thumbnailUrl?: string;
}

// Audio recording structure
interface AudioRecording {
  url: string;
  duration: number;
  transcript?: string;
  waveform?: string;
}

// Poll structure
interface PollData {
  question: string;
  options: { text: string; position: number }[];
  allowMultipleChoices: boolean;
  isAnonymous: boolean;
  expiresAt?: string;
}

// URL preview structure
interface UrlPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  domain?: string;
}

// Location structure
interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
}

export default function EnhancedPostCreator() {
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [postType, setPostType] = useState<PostType>('TEXT');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [audioRecordings, setAudioRecordings] = useState<AudioRecording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [urlPreviews, setUrlPreviews] = useState<UrlPreview[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [runAiAnalysis, setRunAiAnalysis] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrlPreview, setIsLoadingUrlPreview] = useState(false);
  
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);
  
  // Get create post mutation from tRPC
  const { mutate: createPost } = api.post.create.useMutation({
    onSuccess: () => {
      // Reset form after successful post creation
      resetForm();
      setSubmitting(false);
    },
    onError: (err) => {
      setError(err.message || 'Error creating post');
      setSubmitting(false);
    },
  });
  
  // Close visibility dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        visibilityDropdownRef.current && 
        !visibilityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowVisibilityDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // URL extraction from text for previews
  useEffect(() => {
    // If post type is already LINK and we have previews, don't extract more
    if (postType === 'LINK' && urlPreviews.length > 0) {
      return;
    }
    
    // Simple URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
      // Get unique URLs
      const uniqueUrls = [...new Set(matches)];
      
      // Check for new URLs that aren't already in previews
      const existingUrls = urlPreviews.map(preview => preview.url);
      const newUrls = uniqueUrls.filter(url => !existingUrls.includes(url));
      
      if (newUrls.length > 0) {
        // Fetch previews for new URLs
        fetchUrlPreviews(newUrls[0]); // For demo, just fetch the first new URL
      }
    }
  }, [text, postType, urlPreviews]);
  
  // Reset the form
  const resetForm = () => {
    setText('');
    setPostType('TEXT');
    setMedia([]);
    setAudioRecordings([]);
    setPoll(null);
    setIsCreatingPoll(false);
    setUrlPreviews([]);
    setLocation(null);
    setVisibility('PUBLIC');
    setIsScheduled(false);
    setScheduledDate('');
    setScheduledTime('');
    setRunAiAnalysis(false);
    setError(null);
    setUrlInput('');
  };
  
  // Handle media upload complete
  const handleMediaChange = (newMedia: MediaItem[]) => {
    setMedia(newMedia);
    
    // Update post type based on media if needed
    if (newMedia.length > 0 && postType === 'TEXT') {
      if (newMedia[0].type === 'IMAGE') {
        setPostType('PHOTO');
      } else if (newMedia[0].type === 'VIDEO') {
        setPostType('VIDEO');
      } else if (newMedia[0].type === 'DOCUMENT') {
        setPostType('DOCUMENT');
      }
    }
  };
  
  // Handle audio recording
  const handleAudioRecorded = (recording: AudioRecording) => {
    setAudioRecordings([...audioRecordings, recording]);
    setIsRecording(false);
    
    // Set post type to AUDIO if it was TEXT
    if (postType === 'TEXT') {
      setPostType('AUDIO');
    }
  };
  
  // Handle poll creation
  const handlePollCreated = (pollData: PollData) => {
    setPoll(pollData);
    setIsCreatingPoll(false);
    setPostType('POLL');
  };
  
  // Handle location selection
  const handleLocationSelected = (locationData: LocationData) => {
    setLocation(locationData);
  };
  
  // Fetch URL preview
  const fetchUrlPreviews = async (url: string) => {
    // Don't fetch if URL is already in previews
    if (urlPreviews.some(preview => preview.url === url)) {
      return;
    }
    
    setIsLoadingUrlPreview(true);
    
    try {
      // In a real implementation, this would call your API
      // For demo purposes, we'll simulate with a timeout and fake data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a fake preview based on the URL
      const domain = new URL(url).hostname;
      const urlPreview: UrlPreview = {
        url,
        title: `Title for ${domain}`,
        description: 'This is a simulated description for the URL preview. In a real implementation, this would be fetched from the URL metadata.',
        imageUrl: 'https://placehold.co/600x400?text=URL+Preview',
        domain,
      };
      
      setUrlPreviews([...urlPreviews, urlPreview]);
      
      // If this is the first preview and post type is TEXT, change to LINK
      if (urlPreviews.length === 0 && postType === 'TEXT') {
        setPostType('LINK');
      }
    } catch (err) {
      console.error('Error fetching URL preview:', err);
      setError('Failed to fetch URL preview');
    } finally {
      setIsLoadingUrlPreview(false);
    }
  };
  
  // Add a URL manually
  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    
    try {
      // Basic URL validation
      new URL(urlInput); // Will throw if invalid
      fetchUrlPreviews(urlInput);
      setUrlInput('');
    } catch (err) {
      setError('Please enter a valid URL');
    }
  };
  
  // Remove a URL preview
  const handleRemoveUrlPreview = (url: string) => {
    setUrlPreviews(urlPreviews.filter(preview => preview.url !== url));
    
    // If there are no more previews and post type is LINK, change back to TEXT
    if (urlPreviews.length <= 1 && postType === 'LINK') {
      setPostType('TEXT');
    }
  };
  
  // Submit the post
  const handleSubmitPost = () => {
    if (!text.trim() && media.length === 0 && audioRecordings.length === 0 && !poll && urlPreviews.length === 0) {
      setError('Please enter some content for your post');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    // Prepare scheduled datetime if needed
    let scheduledFor: string | undefined = undefined;
    if (isScheduled && scheduledDate) {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime || '00:00'}`);
      
      if (dateTime <= new Date()) {
        setError('Scheduled time must be in the future');
        setSubmitting(false);
        return;
      }
      
      scheduledFor = dateTime.toISOString();
    }
    
    // Prepare the post data
    createPost({
      content: text,
      type: postType,
      visibility,
      mediaUrls: media.length > 0 ? media : undefined,
      audioRecordings: audioRecordings.length > 0 
        ? audioRecordings.map(({ url, duration, transcript, waveform }) => ({
            url, duration, transcript, waveform
          })) 
        : undefined,
      poll,
      location: location?.name,
      coordinates: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
      } : undefined,
      urls: urlPreviews.length > 0 
        ? urlPreviews.map(({ url, title, description, imageUrl, domain }) => ({ 
            url, title, description, imageUrl, domain 
          })) 
        : undefined,
      runAiAnalysis,
      scheduledFor,
    });
  };
  
  // Get visibility icon
  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'PUBLIC':
        return <GlobeIcon size={16} />;
      case 'FRIENDS':
        return <Users size={16} />;
      case 'PRIVATE':
        return <Lock size={16} />;
      default:
        return <GlobeIcon size={16} />;
    }
  };
  
  // Get visibility label
  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'PUBLIC':
        return 'Public';
      case 'FRIENDS':
        return 'Friends';
      case 'PRIVATE':
        return 'Only me';
      default:
        return 'Public';
    }
  };
  
  // Check if today's date in YYYY-MM-DD format for the date input min
  const today = new Date().toISOString().split('T')[0];
  
  // Render URL preview
  const renderUrlPreview = (preview: UrlPreview) => {
    return (
      <div key={preview.url} className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        <button
          onClick={() => handleRemoveUrlPreview(preview.url)}
          className="absolute top-2 right-2 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-white z-10"
        >
          <XCircle size={16} />
        </button>
        
        <div className="flex flex-col sm:flex-row">
          {preview.imageUrl && (
            <div className="w-full sm:w-1/3 h-32 relative">
              <Image
                src={preview.imageUrl}
                alt={preview.title || 'URL preview'}
                fill
                className="object-cover"
              />
            </div>
          )}
          
          <div className="p-3 flex-1">
            {preview.domain && (
              <div className="text-xs text-gray-400 mb-1">{preview.domain}</div>
            )}
            
            {preview.title && (
              <h3 className="font-medium text-white mb-1 line-clamp-1">{preview.title}</h3>
            )}
            
            {preview.description && (
              <p className="text-sm text-gray-300 line-clamp-2">{preview.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render link input for LINK post type
  const renderLinkInput = () => {
    return (
      <div className="space-y-3 mt-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL..."
              className="pl-10 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || isLoadingUrlPreview}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingUrlPreview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <span>Add URL</span>
            )}
          </button>
        </div>
        
        {/* URL Previews */}
        {urlPreviews.length > 0 && (
          <div className="space-y-3">
            {urlPreviews.map(preview => renderUrlPreview(preview))}
          </div>
        )}
      </div>
    );
  };
  
  // Render based on post type
  const renderPostTypeSpecificUI = () => {
    switch (postType) {
      case 'PHOTO':
      case 'VIDEO':
      case 'DOCUMENT':
        return (
          <div className="mt-3">
            <MediaUploadSection
              onMediaChange={handleMediaChange}
              initialMedia={media}
              maxItems={10}
              allowedTypes={
                postType === 'PHOTO' 
                  ? ['IMAGE'] 
                  : postType === 'VIDEO' 
                    ? ['VIDEO'] 
                    : ['DOCUMENT']
              }
            />
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className="mt-3">
            {isRecording ? (
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                onCancel={() => setIsRecording(false)}
              />
            ) : (
              <div className="space-y-3">
                {audioRecordings.map((recording, index) => (
                  <AudioPlayer
                    key={index}
                    src={recording.url}
                    transcript={recording.transcript}
                    waveform={recording.waveform}
                    duration={recording.duration}
                  />
                ))}
                
                {audioRecordings.length < 3 && (
                  <button
                    onClick={() => setIsRecording(true)}
                    className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Mic size={16} />
                    <span>Record Audio</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      
      case 'POLL':
        return (
          <div className="mt-3">
            {isCreatingPoll ? (
              <PollCreator
                onPollCreated={handlePollCreated}
                onCancel={() => setIsCreatingPoll(false)}
              />
            ) : poll ? (
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="font-medium text-white mb-2">{poll.question}</h3>
                <ul className="space-y-2 mb-3">
                  {poll.options.map((option, index) => (
                    <li key={index} className="p-2 bg-gray-700 rounded-md text-white">
                      {option.text}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>
                    {poll.allowMultipleChoices ? 'Multiple choice' : 'Single choice'}
                  </span>
                  <span>
                    {poll.isAnonymous ? 'Anonymous' : 'Public voting'}
                  </span>
                  {poll.expiresAt && (
                    <span>
                      Expires: {new Date(poll.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsCreatingPoll(true);
                    setPoll(null);
                  }}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                >
                  Edit poll
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingPoll(true)}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <BarChart2 size={16} />
                <span>Create Poll</span>
              </button>
            )}
          </div>
        );
      
      case 'LINK':
        return renderLinkInput();
      
      default:
        return null;
    }
  };
  
  if (!session) {
    return (
      <div className="card mb-4 overflow-hidden p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center text-gray-300">
          Please sign in to create a post.
        </div>
      </div>
    );
  }
  
  return (
    <div className="card mb-4 overflow-hidden p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Image
          src={session.user?.image || "https://ui-avatars.com/api/?name=User&background=4CAF50&color=fff"}
          alt="Your profile"
          width={40}
          height={40}
          className="h-10 w-10 rounded-full"
        />
        <div className="flex-1">
          <div className="font-medium text-white">
            {session.user?.name || 'User'}
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            {/* Visibility Dropdown */}
            <div className="relative" ref={visibilityDropdownRef}>
              <button
                className="flex items-center gap-1 hover:text-gray-200"
                onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
              >
                {getVisibilityIcon()}
                <span>{getVisibilityLabel()}</span>
                <ChevronDown size={14} />
              </button>
              
              {showVisibilityDropdown && (
                <div className="absolute z-10 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden min-w-40">
                  <ul>
                    <li>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-700"
                        onClick={() => {
                          setVisibility('PUBLIC');
                          setShowVisibilityDropdown(false);
                        }}
                      >
                        <GlobeIcon size={16} />
                        <div>
                          <div className="text-white">Public</div>
                          <div className="text-xs text-gray-400">Anyone can see this post</div>
                        </div>
                      </button>
                    </li>
                    <li>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-700"
                        onClick={() => {
                          setVisibility('FRIENDS');
                          setShowVisibilityDropdown(false);
                        }}
                      >
                        <Users size={16} />
                        <div>
                          <div className="text-white">Friends</div>
                          <div className="text-xs text-gray-400">Only your friends can see this post</div>
                        </div>
                      </button>
                    </li>
                    <li>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-700"
                        onClick={() => {
                          setVisibility('PRIVATE');
                          setShowVisibilityDropdown(false);
                        }}
                      >
                        <Lock size={16} />
                        <div>
                          <div className="text-white">Only me</div>
                          <div className="text-xs text-gray-400">Only you can see this post</div>
                        </div>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            {/* Post scheduling */}
            <span>•</span>
            <div>
              <button
                className="flex items-center gap-1 hover:text-gray-200"
                onClick={() => setIsScheduled(!isScheduled)}
              >
                <Calendar size={16} />
                <span>{isScheduled ? 'Scheduled' : 'Post now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Post type selector */}
      <div className="mb-4">
        <PostTypeSelector onSelect={setPostType} currentType={postType} />
      </div>
      
      {/* Text input */}
      <div className="mb-4">
        <textarea
          placeholder={`What's on your mind, ${session.user?.name?.split(' ')[0] || 'User'}?`}
          className="w-full min-h-24 bg-gray-700 rounded-md p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      
      {/* Post type specific UI */}
      {renderPostTypeSpecificUI()}
      
      {/* Location picker */}
      <div className="mt-4">
        <LocationPicker
          onLocationSelected={handleLocationSelected}
          onClear={() => setLocation(null)}
          initialLocation={location || undefined}
        />
      </div>
      
      {/* Scheduled time picker */}
      {isScheduled && (
        <div className="mt-4 p-3 bg-gray-700 rounded-md">
          <div className="text-sm font-medium text-white mb-2">Schedule post</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Error message display */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Post actions and submission */}
      <div className="mt-4 border-t border-gray-700 pt-4 flex justify-between items-center">
        <div className="flex items-center">
          <label className="flex items-center text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={runAiAnalysis}
              onChange={(e) => setRunAiAnalysis(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              disabled={submitting}
            />
            <span className="flex items-center gap-1">
              <Sparkles size={14} className="text-blue-400" />
              AI Analysis
            </span>
          </label>
        </div>
        
        <button
          onClick={handleSubmitPost}
          disabled={submitting || (text.trim() === '' && media.length === 0 && audioRecordings.length === 0 && !poll && urlPreviews.length === 0)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isScheduled ? 'Scheduling...' : 'Posting...'}</span>
            </>
          ) : (
            <span>{isScheduled ? 'Schedule' : 'Post'}</span>
          )}
        </button>
      </div>
    </div>
  );
}