"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import { useUpload } from '@/hooks/use-upload';

interface ReelCreatorProps {
  onCancel?: () => void;
  onSuccess?: (reelId: string) => void;
}

const ReelCreator: React.FC<ReelCreatorProps> = ({ onCancel, onSuccess }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'select' | 'edit' | 'details'>('select');
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [isOriginalAudio, setIsOriginalAudio] = useState(true);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  
  const { upload } = useUpload();
  
  const createReelMutation = trpc.reel.createReel.useMutation();
  const { data: audioOptions } = trpc.reel.getAudioOptions.useQuery(
    {},
    { enabled: currentStep === 'details', staleTime: 1000 * 60 * 5 }
  );
  const { data: effectOptions } = trpc.reel.getEffects.useQuery(
    {},
    { enabled: currentStep === 'edit', staleTime: 1000 * 60 * 5 }
  );
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is video and supported format
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('edit');
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('edit');
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };
  
  const applyEffect = (effectId: string) => {
    if (selectedEffects.includes(effectId)) {
      setSelectedEffects(selectedEffects.filter(id => id !== effectId));
    } else {
      setSelectedEffects([...selectedEffects, effectId]);
    }
    
    // In a real app, you would apply visual effects to the video
    // For now, we'll just track which effects are selected
  };
  
  const handleCreateReel = async () => {
    if (!selectedFile || !session?.user) return;

    setIsUploading(true);

    try {
      // Upload video to storage
      const uploadResult = await upload({
        file: selectedFile,
        onProgress: (progress) => {
          setUploadProgress(Math.round(progress * 100));
        },
        allowedTypes: ['VIDEO']
      });

      if (!uploadResult?.url) {
        throw new Error('Failed to upload video');
      }

      // Create the reel
      const result = await createReelMutation.mutateAsync({
        caption,
        audioId: selectedAudioId,
        isOriginalAudio,
        effectIds: selectedEffects,
        media: [
          {
            url: uploadResult.url,
            type: 'VIDEO',
            thumbnailUrl: uploadResult.thumbnailUrl
          }
        ]
      });

      if (onSuccess) {
        onSuccess(result.id);
      } else {
        // Navigate to the new reel
        router.push(`/reels/${result.id}`);
      }
    } catch (error) {
      console.error('Error creating reel:', error);
      alert('Failed to create reel. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  useEffect(() => {
    // Clean up object URLs on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <button
          onClick={() => {
            if (currentStep === 'select') {
              onCancel?.();
            } else if (currentStep === 'edit') {
              setCurrentStep('select');
              setSelectedFile(null);
              setPreviewUrl(null);
            } else {
              setCurrentStep('edit');
            }
          }}
          className="text-white"
        >
          {currentStep === 'select' ? 'Cancel' : 'Back'}
        </button>
        <h1 className="text-lg font-semibold">
          {currentStep === 'select' ? 'Create Reel' : 
           currentStep === 'edit' ? 'Edit Video' : 'New Reel'}
        </h1>
        <button
          onClick={currentStep === 'details' ? handleCreateReel : () => setCurrentStep('details')}
          disabled={(!selectedFile && currentStep !== 'details') || isUploading}
          className={`px-4 py-1 rounded ${
            (!selectedFile && currentStep !== 'details') || isUploading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {currentStep === 'details' ? 'Share' : 'Next'}
        </button>
      </div>
      
      {/* Main content based on current step */}
      {currentStep === 'select' && (
        <div 
          className="flex-grow flex flex-col items-center justify-center p-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-10 text-center w-full max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="mb-4">Drag and drop a video, or click to browse</p>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer"
            >
              Select Video
            </label>
          </div>
        </div>
      )}
      
      {currentStep === 'edit' && previewUrl && (
        <div className="flex flex-col md:flex-row h-full">
          {/* Video preview */}
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <div className="relative w-full max-w-md aspect-[9/16]">
              <video
                ref={videoRef}
                src={previewUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                muted
                onLoadedMetadata={handleVideoLoad}
              />
            </div>
          </div>
          
          {/* Edit tools */}
          <div className="w-full md:w-64 p-4 border-t md:border-t-0 md:border-l border-gray-800">
            <h3 className="font-semibold mb-3">Effects & Filters</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {effectOptions ? (
                effectOptions.map(effect => (
                  <button
                    key={effect.id}
                    onClick={() => applyEffect(effect.id)}
                    className={`p-2 text-xs border rounded ${
                      selectedEffects.includes(effect.id)
                        ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                        : 'border-gray-700'
                    }`}
                  >
                    {effect.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-400 col-span-3">Loading effects...</p>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Trim Video</h3>
              <div className="bg-gray-800 h-10 rounded flex items-center justify-center">
                <p className="text-xs text-gray-400">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentStep === 'details' && previewUrl && (
        <div className="flex flex-col md:flex-row h-full">
          {/* Video preview */}
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <div className="relative w-full max-w-md aspect-[9/16]">
              <video
                src={previewUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                muted
              />
            </div>
          </div>
          
          {/* Details form */}
          <div className="w-full md:w-80 p-4 border-t md:border-t-0 md:border-l border-gray-800">
            <div className="mb-4">
              <label htmlFor="caption" className="block mb-2 font-medium">
                Caption
              </label>
              <textarea
                id="caption"
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                Audio
              </label>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="original-audio"
                  checked={isOriginalAudio}
                  onChange={() => setIsOriginalAudio(!isOriginalAudio)}
                  className="mr-2"
                />
                <label htmlFor="original-audio">
                  Use original audio
                </label>
              </div>
              
              {!isOriginalAudio && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {audioOptions ? (
                    audioOptions.map(audio => (
                      <div 
                        key={audio.id}
                        onClick={() => setSelectedAudioId(audio.id)}
                        className={`flex items-center p-2 rounded mb-1 cursor-pointer ${
                          selectedAudioId === audio.id ? 'bg-blue-900' : 'hover:bg-gray-800'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{audio.title}</p>
                          <p className="text-xs text-gray-400">{audio.artistName || 'Unknown artist'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">Loading audio options...</p>
                  )}
                </div>
              )}
            </div>
            
            {isUploading && (
              <div className="mb-4">
                <p className="mb-2">Uploading: {uploadProgress}%</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelCreator;