"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { EventList, EventCalendar } from '@/app/components/events';

export default function EventsPage() {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
        
        <div className="flex space-x-2">
          {/* View toggle */}
          <div className="flex rounded-md shadow-sm p-1 bg-gray-100 dark:bg-gray-700">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-accent-blue shadow-sm'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-gray-800 text-accent-blue shadow-sm'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              Calendar
            </button>
          </div>
          
          {/* Create event button */}
          {session?.user && (
            <Link
              href="/events/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-blue hover:bg-blue-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              Create Event
            </Link>
          )}
        </div>
      </div>
      
      {viewMode === 'list' ? <EventList /> : <EventCalendar />}
    </div>
  );
}