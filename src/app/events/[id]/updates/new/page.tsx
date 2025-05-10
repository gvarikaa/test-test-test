"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';

export default function NewEventUpdatePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const eventId = params.id;
  
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: event } = trpc.event.getById.useQuery(
    { id: eventId },
    {
      enabled: !!eventId,
      refetchOnWindowFocus: false,
    }
  );
  
  const addUpdateMutation = trpc.event.addUpdate.useMutation({
    onSuccess: () => {
      router.push(`/events/${eventId}`);
    },
    onError: (err) => {
      setError(err.message || 'Failed to add update');
      setIsSubmitting(false);
    },
  });
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Check if user is the creator of the event
  useEffect(() => {
    if (event && session?.user && event.creatorId !== session.user.id) {
      router.push(`/events/${eventId}`);
    }
  }, [event, session, router, eventId]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter update content');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    addUpdateMutation.mutate({
      eventId,
      content,
      isImportant,
    });
  };
  
  if (status === 'loading' || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Event Update</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Event Update</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Please sign in to post updates
          </h2>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  // Check if current user is the creator
  if (session?.user?.id !== event.creatorId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Event Update</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
            Permission Denied
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Only the event creator can post updates.
          </p>
          <Link
            href={`/events/${eventId}`}
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            Back to Event
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Event Update</h1>
        <Link
          href={`/events/${eventId}`}
          className="text-accent-blue hover:underline"
        >
          Back to Event
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">
          Post an update for: <span className="font-bold">{event.title}</span>
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="content" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Update Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share updates with event participants..."
              rows={6}
              className="block w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isImportant"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="w-4 h-4 text-accent-blue focus:ring-accent-blue border-gray-300 rounded"
            />
            <label htmlFor="isImportant" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Mark as important (will send notifications to participants)
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Link
              href={`/events/${eventId}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium dark:border-gray-600 dark:text-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 bg-accent-blue text-white rounded-md font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}