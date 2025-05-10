"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ParticipationStatus } from '@prisma/client';

type EventDetailProps = {
  eventId: string;
};

export default function EventDetail({ eventId }: EventDetailProps) {
  const { data: session } = useSession();
  const [commentText, setCommentText] = useState('');
  const [selectedTab, setSelectedTab] = useState<'details' | 'participants' | 'updates'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: event, isLoading } = trpc.event.getById.useQuery(
    { id: eventId },
    {
      refetchOnWindowFocus: false,
    }
  );
  
  const utils = trpc.useUtils();
  
  const respondToEvent = trpc.event.respondToEvent.useMutation({
    onSuccess: () => {
      utils.event.getById.invalidate({ id: eventId });
    },
  });
  
  const addComment = trpc.event.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      utils.event.getById.invalidate({ id: eventId });
    },
  });
  
  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: () => {
      window.location.href = '/events';
    },
  });
  
  const generateICS = trpc.event.generateEventICS.useQuery(
    { eventId },
    {
      enabled: false,
    }
  );
  
  const handleResponse = (status: ParticipationStatus) => {
    if (!session?.user) return;
    
    respondToEvent.mutate({
      eventId,
      status,
    });
  };
  
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !session?.user) return;
    
    addComment.mutate({
      eventId,
      content: commentText,
    });
  };
  
  const handleDelete = () => {
    deleteEvent.mutate({ id: eventId });
  };
  
  const handleDownloadICS = async () => {
    const result = await generateICS.refetch();
    if (result.data?.icsContent) {
      // Create file and trigger download
      const blob = new Blob([result.data.icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${eventId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-60 bg-gray-300 dark:bg-gray-700 rounded-lg mb-6"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Event not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/events" className="text-accent-blue hover:underline">
          Return to events
        </Link>
      </div>
    );
  }
  
  const isCreator = session?.user?.id === event.creatorId;
  const startDate = format(new Date(event.startsAt), 'EEEE, MMMM d, yyyy');
  const startTime = format(new Date(event.startsAt), 'h:mm a');
  const endTime = event.endsAt ? format(new Date(event.endsAt), 'h:mm a') : null;
  
  // Get participants by status
  const attendingCount = event.participants.filter(p => p.status === 'GOING').length;
  const maybeCount = event.participants.filter(p => p.status === 'MAYBE').length;
  const notGoingCount = event.participants.filter(p => p.status === 'DECLINED').length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Cover image */}
      <div className="relative h-64 w-full">
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-r from-accent-blue to-accent-purple">
            <h1 className="text-white text-4xl font-bold">{event.title.charAt(0)}</h1>
          </div>
        )}
        
        {/* Creator info */}
        <div className="absolute bottom-4 left-4 flex items-center bg-black/40 rounded-full px-3 py-1.5">
          <Image
            src={event.creator.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.creator.name || 'User')}`}
            width={28}
            height={28}
            alt={event.creator.name || 'User'}
            className="rounded-full mr-2"
          />
          <span className="text-white text-sm font-medium">
            {event.creator.name || event.creator.username || 'User'}
          </span>
        </div>
        
        {/* Privacy badge */}
        {event.isPrivate && (
          <div className="absolute top-4 right-4 bg-black/40 rounded-full px-3 py-1.5 text-white text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Private Event
          </div>
        )}
      </div>
      
      {/* Event title and time */}
      <div className="p-6 pb-3">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{event.title}</h1>
        <div className="flex items-center text-gray-600 dark:text-gray-300 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
          </svg>
          <span>
            {startDate} at {startTime}
            {endTime && ` - ${endTime}`}
          </span>
        </div>
        
        {/* Location */}
        <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
          {event.isOnline ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
              </svg>
              <span>Online Event</span>
              {event.onlineUrl && (
                <a 
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-accent-blue hover:underline"
                >
                  Join Link
                </a>
              )}
            </>
          ) : event.location ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>{event.location}</span>
            </>
          ) : null}
        </div>
        
        {/* RSVP buttons */}
        {!isCreator && session?.user && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => handleResponse('GOING')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'GOING'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              Going
            </button>
            <button
              onClick={() => handleResponse('MAYBE')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'MAYBE'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}
            >
              Maybe
            </button>
            <button
              onClick={() => handleResponse('DECLINED')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                event.userParticipationStatus === 'DECLINED'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              Can't go
            </button>
          </div>
        )}
        
        {/* Event creator actions */}
        {isCreator && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href={`/events/${eventId}/edit`}
              className="px-4 py-2 bg-accent-blue text-white rounded-md text-sm font-medium"
            >
              Edit Event
            </Link>
            <Link
              href={`/events/${eventId}/invite`}
              className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium"
            >
              Invite People
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium"
            >
              Delete Event
            </button>
          </div>
        )}
        
        {/* Calendar integration button */}
        <button
          onClick={handleDownloadICS}
          className="flex items-center text-accent-blue dark:text-accent-blue hover:underline mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0117.25 2.25c.41 0 .75.334.75.75V18a.75.75 0 01-1.5 0V4.5h-9V18a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zm-3 12c0-.414.336-.75.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75zm3-6a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zm.75 3a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zm7.5-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zm.75 3a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
          </svg>
          Add to Calendar
        </button>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{attendingCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Going</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{maybeCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Maybe</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{notGoingCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Not Going</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'details'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setSelectedTab('participants')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'participants'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Participants
            </button>
            <button
              onClick={() => setSelectedTab('updates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'updates'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Updates & Comments
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div>
          {/* Details tab */}
          {selectedTab === 'details' && (
            <div>
              {event.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                    About this event
                  </h2>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {event.description}
                  </div>
                </div>
              )}
              
              {/* Event properties */}
              <div className="mb-6 space-y-4">
                {event.maxParticipants && (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Maximum Participants
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.maxParticipants} participants
                      </p>
                    </div>
                  </div>
                )}
                
                {event.isRecurring && (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Recurring Event
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.recurrencePattern}{' '}
                        {event.recurrenceEndDate &&
                          `until ${format(new Date(event.recurrenceEndDate), 'MMMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                )}
                
                {event.category && (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39.92 3.31 0l4.442-4.442a2.25 2.25 0 000-3.181L11.03 3.107a3 3 0 00-2.122-.879H5.25zm-1.5 3a1.5 1.5 0 011.5-1.5H7.5a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75v-.75zm9.75 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Category
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.category.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Event tags */}
              {event.eventTags && event.eventTags.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {event.eventTags.map((tagRelation) => (
                      <span
                        key={tagRelation.tag.id}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-800 dark:text-gray-200"
                      >
                        {tagRelation.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Participants tab */}
          {selectedTab === 'participants' && (
            <div>
              {/* Going section */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                  Going ({attendingCount})
                </h2>
                {attendingCount === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No one has RSVP'd yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {event.participants
                      .filter((p) => p.status === 'GOING')
                      .map((participant) => (
                        <Link
                          href={`/profile/${participant.user.id}`}
                          key={participant.id}
                          className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Image
                            src={
                              participant.user.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                participant.user.name || 'User'
                              )}`
                            }
                            width={40}
                            height={40}
                            alt={participant.user.name || 'User'}
                            className="rounded-full mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {participant.user.name || participant.user.username || 'User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(participant.createdAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
              
              {/* Maybe section */}
              {maybeCount > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                    Maybe ({maybeCount})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {event.participants
                      .filter((p) => p.status === 'MAYBE')
                      .map((participant) => (
                        <Link
                          href={`/profile/${participant.user.id}`}
                          key={participant.id}
                          className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Image
                            src={
                              participant.user.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                participant.user.name || 'User'
                              )}`
                            }
                            width={40}
                            height={40}
                            alt={participant.user.name || 'User'}
                            className="rounded-full mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {participant.user.name || participant.user.username || 'User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(participant.createdAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Not Going section */}
              {notGoingCount > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                    Not Going ({notGoingCount})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {event.participants
                      .filter((p) => p.status === 'DECLINED')
                      .map((participant) => (
                        <Link
                          href={`/profile/${participant.user.id}`}
                          key={participant.id}
                          className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Image
                            src={
                              participant.user.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                participant.user.name || 'User'
                              )}`
                            }
                            width={40}
                            height={40}
                            alt={participant.user.name || 'User'}
                            className="rounded-full mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {participant.user.name || participant.user.username || 'User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(participant.createdAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Updates & Comments tab */}
          {selectedTab === 'updates' && (
            <div>
              {/* Creator updates */}
              {isCreator && (
                <Link 
                  href={`/events/${eventId}/updates/new`}
                  className="inline-block mb-6 px-4 py-2 bg-accent-blue text-white rounded-md text-sm font-medium"
                >
                  Post Update
                </Link>
              )}
              
              {event.updates && event.updates.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                    Updates
                  </h2>
                  <div className="space-y-4">
                    {event.updates.map((update) => (
                      <div 
                        key={update.id} 
                        className={`p-4 rounded-lg border ${
                          update.isImportant 
                            ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700' 
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <Image
                            src={
                              update.user.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                update.user.name || 'User'
                              )}`
                            }
                            width={32}
                            height={32}
                            alt={update.user.name || 'User'}
                            className="rounded-full mr-2"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {update.user.name || update.user.username || 'User'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(update.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                          {update.isImportant && (
                            <span className="ml-auto px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full dark:bg-yellow-900 dark:text-yellow-200">
                              Important
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {update.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Comments */}
              <div>
                <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">
                  Comments
                </h2>
                
                {/* Comment input */}
                {session?.user && (
                  <form onSubmit={handleAddComment} className="mb-6">
                    <div className="flex space-x-3">
                      <Image
                        src={
                          session.user.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            session.user.name || 'User'
                          )}`
                        }
                        width={40}
                        height={40}
                        alt={session.user.name || 'User'}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-accent-blue focus:border-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          rows={3}
                        ></textarea>
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="mt-2 px-4 py-2 bg-accent-blue text-white rounded-md text-sm font-medium disabled:opacity-50"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                
                {/* Comments list */}
                {event.comments && event.comments.length > 0 ? (
                  <div className="space-y-4">
                    {event.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Image
                          src={
                            comment.user.image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              comment.user.name || 'User'
                            )}`
                          }
                          width={40}
                          height={40}
                          alt={comment.user.name || 'User'}
                          className="rounded-full"
                        />
                        <div>
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white mb-1">
                              {comment.user.name || comment.user.username || 'User'}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">
                              {comment.content}
                            </p>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Delete Event
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium dark:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}