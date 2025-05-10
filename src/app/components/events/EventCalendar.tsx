"use client";

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Calculate the month boundaries for the query
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  // Fetch events for the visible calendar period
  const { data: calendarData } = trpc.event.getCalendarEvents.useQuery({
    startDate: calendarStart,
    endDate: calendarEnd,
  });
  
  // Group events by date for easy access
  const eventsByDate = new Map();
  calendarData?.forEach(event => {
    const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey).push(event);
  });
  
  // Helper to get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };
  
  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  };
  
  const renderDays = () => {
    const days = [];
    const dateFormat = 'EEEE';
    
    let startDate = startOfWeek(monthStart);
    
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-semibold py-2 text-sm text-gray-600 dark:text-gray-300">
          {format(addDays(startDate, i), dateFormat).substring(0, 3)}
        </div>
      );
    }
    
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };
  
  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const dateFormat = 'd';
    const rows = [];
    
    let days = [];
    let day = startDate;
    let formattedDate = '';
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const eventsForDay = getEventsForDay(day);
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] border border-gray-200 dark:border-gray-700 p-1 relative ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                : isSameDay(day, selectedDate as Date)
                ? 'bg-accent-blue/10 border-accent-blue'
                : 'bg-white dark:bg-gray-800'
            }`}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <span
                className={`text-sm font-medium ${
                  isSameDay(day, new Date())
                    ? 'bg-accent-blue text-white rounded-full w-6 h-6 flex items-center justify-center'
                    : !isSameMonth(day, monthStart)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {formattedDate}
              </span>
              
              {eventsForDay.length > 3 && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  +{eventsForDay.length - 2} more
                </span>
              )}
            </div>
            
            <div className="mt-1 space-y-1 overflow-hidden">
              {eventsForDay.slice(0, 3).map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block text-xs truncate py-1 px-1.5 rounded bg-accent-blue/10 text-accent-blue dark:bg-accent-blue/20 hover:bg-accent-blue/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {format(new Date(event.start), 'HH:mm')} {event.title}
                </Link>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    
    return <div className="grid mb-6">{rows}</div>;
  };
  
  const renderSelectedDateEvents = () => {
    if (!selectedDate) return null;
    
    const eventsForSelectedDate = getEventsForDay(selectedDate);
    
    if (eventsForSelectedDate.length === 0) {
      return (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">No events scheduled for this day.</p>
        </div>
      );
    }
    
    return (
      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        
        <div className="space-y-3">
          {eventsForSelectedDate.map((event) => (
            <Link 
              href={`/events/${event.id}`}
              key={event.id} 
              className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {/* Time column */}
              <div className="min-w-[60px] text-center mr-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(new Date(event.start), 'h:mm')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(event.start), 'a')}
                </div>
              </div>
              
              {/* Event details */}
              <div className="flex-1">
                <div className="flex items-start space-x-3">
                  {/* Event image */}
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {event.coverImage ? (
                      <Image 
                        src={event.coverImage} 
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gradient-to-r from-accent-blue to-accent-purple">
                        <span className="text-white text-xs font-bold">{event.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Event info */}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </h4>
                    
                    <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      {event.isOnline ? (
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                          </svg>
                          Online
                        </span>
                      ) : event.location ? (
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          {event.location}
                        </span>
                      ) : null}
                      
                      <span className="mx-2">•</span>
                      
                      {/* Participants count */}
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                          <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                        </svg>
                        {event.participantCount} {event.participantCount === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderSelectedDateEvents()}
    </div>
  );
}