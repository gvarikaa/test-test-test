"use client";

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { EventDetail } from '@/app/components/events';

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const eventId = params.id;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Details</h1>
        <Link
          href="/events"
          className="text-accent-blue hover:underline"
        >
          Back to Events
        </Link>
      </div>
      
      <EventDetail eventId={eventId} />
    </div>
  );
}