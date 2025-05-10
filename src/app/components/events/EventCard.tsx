"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ParticipationStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';

type EventCardProps = {
  event: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    isOnline: boolean;
    onlineUrl?: string | null;
    startsAt: Date;
    endsAt?: Date | null;
    coverImage?: string | null;
    isPrivate: boolean;
    isRecurring: boolean;
    maxParticipants?: number | null;
    userParticipationStatus?: ParticipationStatus | null;
    creator: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
    category?: {
      id: string;
      name: string;
      color?: string | null;
      icon?: string | null;
    } | null;
    eventTags?: Array<{
      tag: {
        id: string;
        name: string;
      }
    }>;
    _count: {
      participants: number;
    };
  };
  showActions?: boolean;
};

export default function EventCard({ event, showActions = true }: EventCardProps) {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);

  const utils = trpc.useUtils();
  const respondToEvent = trpc.event.respondToEvent.useMutation({
    onSuccess: () => {
      utils.event.getAll.invalidate();
      utils.event.getById.invalidate({ id: event.id });
    },
  });

  const isCreator = session?.user?.id === event?.creator?.id;
  const startDate = format(new Date(event.startsAt), 'MMM d, yyyy');
  const startTime = format(new Date(event.startsAt), 'h:mm a');

  const handleResponse = (status: ParticipationStatus) => {
    if (!session?.user) return;

    respondToEvent.mutate({
      eventId: event.id,
      status,
    });
  };

  // Function to get status style
  const getStatusStyle = (status: ParticipationStatus | null | undefined) => {
    switch (status) {
      case 'GOING':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'MAYBE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'DECLINED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'INVITED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Cover image */}
      <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-r from-accent-blue to-accent-purple">
            <span className="text-white text-2xl font-bold">{event.title.charAt(0)}</span>
          </div>
        )}

        {/* Date overlay */}
        <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded-md shadow-md p-2 text-center min-w-[60px]">
          <div className="text-sm font-bold text-accent-blue">{format(new Date(event.startsAt), 'MMM')}</div>
          <div className="text-xl font-bold">{format(new Date(event.startsAt), 'd')}</div>
        </div>

        {/* Badges container - right side */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {/* Status badge if user is participating */}
          {event.userParticipationStatus && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(event.userParticipationStatus)}`}>
              {event.userParticipationStatus}
            </div>
          )}

          {/* Private event badge */}
          {event.isPrivate && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
              Private
            </div>
          )}

          {/* Recurring event badge */}
          {event.isRecurring && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
              </svg>
              Recurring
            </div>
          )}
        </div>
      </div>

      {/* Event details */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">{event.title}</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {startDate} at {startTime}
            </div>
          </div>

          {/* Creator info */}
          {event.creator && event.creator.id && (
            <Link href={`/profile/${event.creator.id}`} className="flex items-center">
              <Image
                src={event.creator.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.creator.name || 'User')}`}
                width={24}
                height={24}
                alt={event.creator.name || 'User'}
                className="rounded-full"
              />
            </Link>
          )}
        </div>

        {/* Category & Tags */}
        {(event.category || (event.eventTags && event.eventTags.length > 0)) && (
          <div className="flex flex-wrap gap-1 my-2">
            {event.category && event.category.id && (
              <span
                className="inline-block px-2 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: event.category.color ? `${event.category.color}20` : '#e5e7eb',
                  color: event.category.color || '#4b5563'
                }}
              >
                {event.category.icon && <span className="mr-1">{event.category.icon}</span>}
                {event.category.name || 'Uncategorized'}
              </span>
            )}

            {event.eventTags && event.eventTags.map(({ tag }) => tag && tag.id ? (
              <span
                key={tag.id}
                className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                #{tag.name || 'unnamed'}
              </span>
            ) : null)}
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          {event.isOnline ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
              </svg>
              <span>Online Event</span>
            </>
          ) : event.location ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>{event.location}</span>
            </>
          ) : null}
        </div>

        {/* Description - collapsible */}
        {event.description && (
          <div className="mt-2">
            <p className={`text-sm text-gray-600 dark:text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {event.description}
            </p>
            {event.description.length > 100 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-accent-blue font-medium mt-1"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Participants count */}
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>
            {event._count?.participants || 0} {(event._count?.participants || 0) === 1 ? 'person' : 'people'} going
          </span>

          {event.maxParticipants && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {event._count?.participants || 0}/{event.maxParticipants} spots
            </span>
          )}
        </div>

        {/* Action buttons */}
        {showActions && session?.user && !isCreator && (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleResponse('GOING')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'GOING'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
              disabled={event.maxParticipants !== null && (event._count?.participants || 0) >= (event.maxParticipants || 0) && event.userParticipationStatus !== 'GOING'}
            >
              Going
            </button>
            <button
              onClick={() => handleResponse('MAYBE')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'MAYBE'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}
            >
              Maybe
            </button>
            <button
              onClick={() => handleResponse('DECLINED')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'DECLINED'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              Can't go
            </button>
          </div>
        )}

        {/* View details link */}
        <div className="mt-4">
          <Link
            href={`/events/${event.id}`}
            className="inline-block w-full px-4 py-2 bg-accent-blue text-white font-medium text-center rounded-md hover:bg-blue-600 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}