"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { EventForm } from '@/app/components/events';

export default function EditEventPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const eventId = params.id;
  
  const { data: event, isLoading, error } = trpc.event.getById.useQuery(
    { id: eventId },
    {
      refetchOnWindowFocus: false,
    }
  );
  
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
  
  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Please sign in to edit this event
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
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
          <Link
            href={`/events/${eventId}`}
            className="text-accent-blue hover:underline"
          >
            Back to Event
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
            Error Loading Event
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {error.message || 'An error occurred while loading the event.'}
          </p>
          <Link
            href="/events"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Event Not Found
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The event you're trying to edit doesn't exist or has been removed.
          </p>
          <Link
            href="/events"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            Back to Events
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
            Permission Denied
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You don't have permission to edit this event.
          </p>
          <Link
            href={`/events/${eventId}`}
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md"
          >
            View Event
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
        <Link
          href={`/events/${eventId}`}
          className="text-accent-blue hover:underline"
        >
          Back to Event
        </Link>
      </div>
      
      <EventForm existingEvent={event} isEditing={true} />
    </div>
  );
}