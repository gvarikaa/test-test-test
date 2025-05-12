"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import FacebookHeader from '../components/layouts/FacebookHeader';
import LeftSidebar from '../components/layouts/LeftSidebar';
import RightSidebar from '../components/layouts/RightSidebar';
import MobileNavigation from '../components/layouts/MobileNavigation';

export default function GroupsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle group creation
  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  // Mock data - completely static with no API calls
  const mockGroups = [
    {
      id: '1',
      name: 'Tech Enthusiasts',
      handle: 'tech-enthusiasts',
      description: 'A group for technology lovers',
      privacy: 'PUBLIC',
      coverImage: 'https://picsum.photos/seed/tech/800/400',
      logoImage: 'https://picsum.photos/seed/tech-logo/200/200',
      _count: { members: 245 }
    },
    {
      id: '2',
      name: 'Travel Adventures',
      handle: 'travel-adventures',
      description: 'Share your travel experiences',
      privacy: 'PUBLIC',
      coverImage: 'https://picsum.photos/seed/travel/800/400',
      logoImage: 'https://picsum.photos/seed/travel-logo/200/200',
      _count: { members: 182 }
    },
    {
      id: '3',
      name: 'Cooking Club',
      handle: 'cooking-club',
      description: 'For all cooking enthusiasts',
      privacy: 'PRIVATE',
      coverImage: 'https://picsum.photos/seed/cooking/800/400',
      logoImage: 'https://picsum.photos/seed/cooking-logo/200/200',
      _count: { members: 156 }
    },
    {
      id: '4',
      name: 'Book Lovers',
      handle: 'book-lovers',
      description: 'Discuss your favorite books',
      privacy: 'PUBLIC',
      coverImage: 'https://picsum.photos/seed/books/800/400',
      logoImage: 'https://picsum.photos/seed/books-logo/200/200',
      _count: { members: 320 }
    }
  ];

  // Filter groups based on search query
  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <FacebookHeader />

      {/* Page-specific header to distinguish from main page */}
      <div className="w-full bg-gradient-to-r from-indigo-800 to-purple-800 py-4 mb-4 shadow-lg">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <div className="p-2 bg-indigo-700 rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8 text-white">
                  <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                  <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Groups</h1>
                <p className="text-indigo-200">Connect with communities that share your interests</p>
              </div>
            </div>
            <button
              onClick={handleCreateGroup}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50 transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Create New Group
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* Left sidebar - navigation */}
        <LeftSidebar />

        {/* Main column - group content */}
        <main className="w-full max-w-[680px] px-0 py-0 sm:px-4">
          <div className="rounded-lg bg-gray-900 p-4 shadow-md border border-gray-800/40">
            {/* Search and tabs section */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search groups"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full rounded-full bg-gray-800/70 px-4 py-2.5 pl-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-gray-700/50"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex border-b border-gray-800/40">
              <button className="border-b-2 border-indigo-500 px-4 py-2 font-medium text-indigo-400">
                All Groups
              </button>
              <button className="px-4 py-2 font-medium text-gray-400 hover:text-gray-300">
                Your Groups
              </button>
              <button className="px-4 py-2 font-medium text-gray-400 hover:text-gray-300">
                Discover
              </button>
            </div>

            {/* Sign In Message */}
            <div className="mb-6 rounded-lg bg-indigo-900/30 p-4 text-center border border-indigo-800/30">
              <p className="text-indigo-200">
                Sign in to see your groups and create new ones.
              </p>
              <div className="mt-2">
                <Link
                  href="/auth/signin"
                  className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-md shadow-indigo-900/40 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Suggested Groups / All Public Groups */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
                <span className="inline-block p-1 rounded-md bg-indigo-600/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-indigo-400">
                    <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
                  </svg>
                </span>
                Suggested Groups
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div key={group.id} className="overflow-hidden rounded-lg bg-gray-800/60 shadow-md border border-gray-700/30 hover:border-indigo-700/30 hover:shadow-lg transition-all">
                      <div className="relative h-32 w-full">
                        {group.coverImage ? (
                          <Image
                            src={group.coverImage}
                            alt={group.name}
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-indigo-900/40">
                            <span className="text-2xl font-bold text-indigo-200">{group.name}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <div className="flex items-center gap-2">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-md">
                              {group.logoImage ? (
                                <Image
                                  src={group.logoImage}
                                  alt={group.name}
                                  fill
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-indigo-700 text-sm font-bold text-white">
                                  {group.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <h3 className="text-sm font-medium text-white">{group.name}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-indigo-400">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                            </svg>
                            {group._count?.members || 0} members
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            group.privacy === 'PUBLIC'
                              ? 'bg-green-900/30 text-green-400 border border-green-800/30'
                              : 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                          }`}>
                            {group.privacy === 'PUBLIC' ? 'Public' : group.privacy === 'PRIVATE' ? 'Private' : 'Secret'}
                          </span>
                        </div>
                        <Link
                          href={`/groups/${group.handle}`}
                          className="block w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2 text-center text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-900/30 transition-all"
                        >
                          View Group
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-lg bg-gray-800/40 p-6 text-center text-gray-300 border border-gray-700/30">
                    <div className="flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-12 text-gray-600 mb-3">
                        <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                        <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No groups found</p>
                      <p className="text-sm text-gray-400">Try adjusting your search criteria or create a new group.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right sidebar - chat and contacts */}
        <RightSidebar />
      </div>

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}