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
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <FacebookHeader />

      {/* Main content */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* Left sidebar - navigation */}
        <LeftSidebar />

        {/* Main column - group content */}
        <main className="w-full max-w-[680px] px-0 py-4 sm:px-4">
          <div className="rounded-lg bg-card-bg p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-text-primary">Groups</h1>
              <button
                onClick={handleCreateGroup}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Create New Group
              </button>
            </div>

            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search groups"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full rounded-full bg-input-bg px-4 py-2 pl-10 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-tertiary"
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
            <div className="mb-4 flex border-b border-border-color">
              <button className="border-b-2 border-primary px-4 py-2 font-medium text-primary">
                All Groups
              </button>
              <button className="px-4 py-2 font-medium text-text-secondary hover:text-text-primary">
                Your Groups
              </button>
              <button className="px-4 py-2 font-medium text-text-secondary hover:text-text-primary">
                Discover
              </button>
            </div>

            {/* Sign In Message */}
            <div className="mb-6 rounded-lg bg-card-secondary-bg p-4 text-center">
              <p className="text-text-secondary">
                Sign in to see your groups and create new ones.
              </p>
              <div className="mt-2">
                <Link
                  href="/auth/signin"
                  className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Suggested Groups / All Public Groups */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-text-primary">Suggested Groups</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div key={group.id} className="overflow-hidden rounded-lg bg-card-secondary-bg shadow-sm">
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
                          <div className="flex h-full w-full items-center justify-center bg-gray-700">
                            <span className="text-2xl font-bold text-gray-300">{group.name}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <div className="flex items-center gap-2">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white">
                              {group.logoImage ? (
                                <Image
                                  src={group.logoImage}
                                  alt={group.name}
                                  fill
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gray-600 text-sm font-bold text-white">
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
                          <span className="flex items-center gap-1 text-sm text-text-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                            </svg>
                            {group._count?.members || 0} members
                          </span>
                          <span className="text-xs font-medium text-text-tertiary">
                            {group.privacy === 'PUBLIC' ? 'Public' : group.privacy === 'PRIVATE' ? 'Private' : 'Secret'}
                          </span>
                        </div>
                        <Link
                          href={`/groups/${group.handle}`}
                          className="block w-full rounded-lg bg-primary py-1.5 text-center text-sm font-medium text-white hover:bg-primary/90"
                        >
                          View Group
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-lg bg-card-secondary-bg p-4 text-center text-text-secondary">
                    No groups found.
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