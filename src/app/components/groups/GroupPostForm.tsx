"use client";

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';

interface GroupPostFormProps {
  groupId: string;
  onPostCreated?: () => void;
  topicId?: string;
}

export default function GroupPostForm({ 
  groupId, 
  onPostCreated, 
  topicId 
}: GroupPostFormProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = trpc.group.createPost.useMutation({
    onSuccess: () => {
      // Reset form
      setContent('');
      setSelectedFiles([]);
      setMediaPreviewUrls([]);
      setIsAnnouncement(false);
      setIsExpanded(false);
      setError(null);
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    },
    onError: (error) => {
      setError(error.message);
      setIsSubmitting(false);
    },
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!isExpanded && e.target.value.length > 0) {
      setIsExpanded(true);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Convert FileList to array and append to existing selectedFiles
    const newFiles = Array.from(files);
    const updatedFiles = [...selectedFiles, ...newFiles].slice(0, 4); // Limit to 4 files
    setSelectedFiles(updatedFiles);
    
    // Create preview URLs for the files
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    const updatedPreviewUrls = [...mediaPreviewUrls, ...newPreviewUrls].slice(0, 4);
    setMediaPreviewUrls(updatedPreviewUrls);
    
    // Automatically expand the form when files are selected
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const removeFile = (index: number) => {
    // Remove the file and its preview URL
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviewUrls = mediaPreviewUrls.filter((_, i) => i !== index);
    
    // Release the object URL to free memory
    URL.revokeObjectURL(mediaPreviewUrls[index]);
    
    setSelectedFiles(updatedFiles);
    setMediaPreviewUrls(updatedPreviewUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    if (!content.trim() && selectedFiles.length === 0) {
      setError('Please enter a message or attach media to create a post.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // TODO: Upload files to get media IDs
      // For now, implement without media
      
      await createPost.mutateAsync({
        groupId,
        content: content.trim(),
        isAnnouncement,
        topicId,
        mediaIds: [], // Will be implemented in the future with proper media handling
      });
      
      setIsSubmitting(false);
    } catch (err) {
      // Error is handled by the mutation's onError
      console.error('Error creating post:', err);
    }
  };

  if (!session) {
    return null; // Don't show the form if user is not authenticated
  }

  return (
    <div className="mb-4 rounded-lg bg-gray-900 border border-gray-800/40 p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex">
          {/* User avatar */}
          <div className="mr-3 flex-shrink-0">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User profile'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-700">
                  <span className="text-xs font-bold text-white">
                    {(session.user?.name || 'U').charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Post content textarea */}
          <div className="flex-grow">
            <textarea
              placeholder="Share something with the group..."
              value={content}
              onChange={handleContentChange}
              onClick={() => !isExpanded && setIsExpanded(true)}
              className="min-h-[60px] w-full rounded-lg bg-gray-800/80 px-4 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-gray-700/30"
              rows={isExpanded ? 4 : 2}
            />
            
            {/* Media previews */}
            {mediaPreviewUrls.length > 0 && (
              <div className={`mt-2 grid gap-2 ${
                mediaPreviewUrls.length === 1 ? 'grid-cols-1' : 
                mediaPreviewUrls.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2'
              }`}>
                {mediaPreviewUrls.map((url, index) => (
                  <div key={index} className="relative h-24 overflow-hidden rounded-lg bg-gray-800">
                    <Image
                      src={url}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute right-1 top-1 rounded-full bg-gray-900/80 p-1 text-gray-400 hover:bg-red-800/80 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="mt-2 text-sm text-red-400">
                {error}
              </div>
            )}
            
            {/* Extended options (visible when expanded) */}
            {isExpanded && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Add media button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-indigo-400 border border-gray-700/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Add Media
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelection}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  
                  {/* Announcement toggle (visible for admins only) */}
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 border border-gray-700/30">
                    <input
                      type="checkbox"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="mr-1.5 h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-indigo-500/50"
                    />
                    Announcement
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={() => {
                      setContent('');
                      setSelectedFiles([]);
                      setMediaPreviewUrls([]);
                      setIsAnnouncement(false);
                      setIsExpanded(false);
                      setError(null);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  
                  {/* Post button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0)}
                    className={`rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-indigo-900/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                        Posting...
                      </div>
                    ) : (
                      'Post'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}