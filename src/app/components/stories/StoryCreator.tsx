"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import { MediaType } from '@prisma/client';
import { useStoryUpload } from '@/hooks/use-story-upload';

export default function StoryCreator() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.IMAGE);
  const [caption, setCaption] = useState('');
  const [expiresIn, setExpiresIn] = useState(24); // Default: 24 hours
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const upload = useStoryUpload();
  const createStoryMutation = trpc.story.createStory.useMutation({
    onSuccess: () => {
      router.push('/');
    },
    onError: (error) => {
      setError(error.message);
      setIsLoading(false);
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image or video
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }

    // Set media type
    setMediaType(file.type.startsWith('image/') ? MediaType.IMAGE : MediaType.VIDEO);

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Reset error
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!preview) {
      setError('Please select a media file');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError('Please select a file');
        setIsLoading(false);
        return;
      }

      // Upload file using our new story-specific upload hook
      const result = await upload.uploadMedia(file, (progress) => {
        setUploadProgress(progress);
      });

      if (!result) {
        setError('Failed to upload media');
        setIsLoading(false);
        return;
      }

      // Create story with properties from our new hook response
      createStoryMutation.mutate({
        media: [{
          url: result.url,
          type: result.mediaType,
          thumbnailUrl: result.thumbnailUrl,
          width: result.width,
          height: result.height,
          duration: result.duration,
        }],
        expiresInHours: expiresIn,
      });
    } catch (err) {
      console.error('Error creating story:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the story');
      setIsLoading(false);
    }
  };

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center z-50">
      <div className="w-full max-w-md flex flex-col h-full p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleCancel} className="text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-medium">Create Story</h1>
          <div className="w-6"></div> {/* Placeholder for alignment */}
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {preview ? (
            <div className="relative w-full max-w-sm h-[70vh] rounded-lg overflow-hidden mb-4">
              {mediaType === MediaType.IMAGE ? (
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <video 
                  src={preview}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                />
              )}
              
              <button 
                onClick={triggerFileInput}
                className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                  <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                </svg>
              </button>
            </div>
          ) : (
            <div 
              onClick={triggerFileInput}
              className="w-full max-w-sm h-[50vh] border-2 border-dashed border-gray-500 rounded-lg flex flex-col items-center justify-center cursor-pointer mb-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-gray-400 mb-4">
                <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-400 text-center mb-2">Click to upload an image or video</p>
              <p className="text-gray-500 text-sm text-center">Recommended: 9:16 ratio</p>
            </div>
          )}

          {/* Options and caption */}
          {preview && (
            <div className="w-full space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-white/10 text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>

              <div className="flex items-center justify-between text-white">
                <span>Expires after</span>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="bg-white/10 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                </select>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-red-500 mt-2 text-center">
              {error}
            </div>
          )}

          {/* Upload progress */}
          {isLoading && (
            <div className="w-full mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-accent-blue h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-gray-400 text-sm mt-2">
                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
              </p>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />
        
        {/* Action buttons */}
        <div className="mt-4 flex space-x-4">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-lg bg-gray-700 text-white font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 rounded-lg bg-accent-blue text-white font-medium disabled:opacity-50"
            disabled={!preview || isLoading}
          >
            {isLoading ? 'Creating...' : 'Share to Story'}
          </button>
        </div>
      </div>
    </div>
  );
}