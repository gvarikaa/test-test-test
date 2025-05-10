"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import EventCard from './EventCard';
import { format } from 'date-fns';

type FilterOptions = {
  upcoming?: boolean;
  categoryId?: string;
  isOnline?: boolean;
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
};

export default function EventList() {
  const [filters, setFilters] = useState<FilterOptions>({
    upcoming: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, fetchNextPage, hasNextPage } = 
    trpc.event.getAll.useInfiniteQuery(
      {
        limit: 10,
        filters: {
          ...filters,
          searchQuery: searchQuery.length > 0 ? searchQuery : undefined,
        },
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
    
  const { data: categories } = trpc.event.getCategories.useQuery();
  
  const events = data?.pages.flatMap((page) => page.events) || [];
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      searchQuery: searchQuery.length > 0 ? searchQuery : undefined,
    }));
  };
  
  const handleCategoryFilter = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === categoryId ? undefined : categoryId,
    }));
  };
  
  const handleOnlineFilter = () => {
    setFilters((prev) => ({
      ...prev,
      isOnline: prev.isOnline === undefined ? true : undefined,
    }));
  };
  
  const clearFilters = () => {
    setFilters({ upcoming: true });
    setSearchQuery('');
  };
  
  const toggleUpcoming = () => {
    setFilters((prev) => ({
      ...prev,
      upcoming: !prev.upcoming,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search and filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-accent-blue dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="submit"
              className="bg-accent-blue text-white px-4 py-2 rounded-r-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </form>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleUpcoming}
            className={`px-3 py-1 rounded-full text-sm ${
              filters.upcoming
                ? 'bg-accent-blue text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Upcoming
          </button>
          
          <button
            onClick={handleOnlineFilter}
            className={`px-3 py-1 rounded-full text-sm ${
              filters.isOnline
                ? 'bg-accent-blue text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Online Only
          </button>
          
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.categoryId === category.id
                  ? 'bg-accent-blue text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
          
          {(filters.categoryId || filters.isOnline || searchQuery || !filters.upcoming) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-80 animate-pulse">
              <div className="h-40 w-full bg-gray-300 dark:bg-gray-700 rounded-t-lg"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0117.25 2.25c.41 0 .75.334.75.75V18a.75.75 0 01-1.5 0V4.5h-9V18a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No events found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {Object.keys(filters).length > 1 || searchQuery 
              ? 'Try changing your filters or search query' 
              : 'Be the first to create an event!'}
          </p>
          <button
            onClick={clearFilters}
            className={`mt-4 px-4 py-2 rounded-md text-sm font-medium bg-accent-blue text-white ${
              Object.keys(filters).length <= 1 && !searchQuery ? 'hidden' : ''
            }`}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          
          {hasNextPage && (
            <div className="text-center mt-6">
              <button
                onClick={() => fetchNextPage()}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}