"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EventForm } from '@/app/components/events';
import Link from 'next/link';

export default function CreateEventPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Event</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Event</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Please sign in to create an event
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Event</h1>
        <Link
          href="/events"
          className="text-accent-blue hover:underline"
        >
          Back to Events
        </Link>
      </div>
      
      <EventForm />
    </div>
  );
}