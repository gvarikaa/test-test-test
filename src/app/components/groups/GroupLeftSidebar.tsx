"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

type GroupLeftSidebarProps = {
  group?: {
    id: string;
    name: string;
    handle: string;
    logoImage?: string;
    privacy: string;
    isVerified?: boolean;
    _count?: {
      members?: number;
      posts?: number;
      discussions?: number;
      events?: number;
    };
    settings?: {
      enableDiscussions?: boolean;
      enableEvents?: boolean;
      enablePolls?: boolean;
      enableFiles?: boolean;
    };
  };
  isMember?: boolean;
};

export default function GroupLeftSidebar({
  group = {
    id: '1',
    name: 'Group Name',
    handle: 'group-name',
    privacy: 'PUBLIC',
    _count: {
      members: 0,
      posts: 0,
      discussions: 0,
      events: 0
    },
    settings: {
      enableDiscussions: true,
      enableEvents: true,
      enablePolls: true,
      enableFiles: true
    }
  },
  isMember = false
}: GroupLeftSidebarProps) {
  const params = useParams<{ handle: string }>();
  const [expanded, setExpanded] = useState(true);

  // Define theme colors for consistent styling - matches the main page theme
  const THEME = {
    // Primary gradients
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",

    // Background levels
    darkBg: "bg-gray-950",
    cardBg: "bg-gray-900",
    cardBgHover: "hover:bg-gray-800/80",
    cardBorder: "border-gray-800/40",

    // Text colors
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    textMuted: "text-gray-500",

    // Effects
    glow: "shadow-lg shadow-indigo-950/40"
  };

  // Main navigation items
  const groupNavItems = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198c.031-.028.061-.056.091-.086L12 5.43z" />
        </svg>
      ),
      label: 'Group Home',
      href: `/groups/${group.handle}`
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Members',
      href: `/groups/${group.handle}/members`,
      count: group._count?.members
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M5.337 21.718a6.707 6.707 0 01-.533-.074.75.75 0 01-.44-1.223 3.73 3.73 0 00.814-1.686c.023-.115-.022-.317-.254-.543C3.274 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 01-4.246.997z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Discussions',
      href: `/groups/${group.handle}/discussions`,
      count: group._count?.discussions,
      hidden: !group.settings?.enableDiscussions
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Events',
      href: `/groups/${group.handle}/events`,
      count: group._count?.events,
      hidden: !group.settings?.enableEvents
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15zm-6.75-10.5a.75.75 0 00-1.5 0v4.19l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V10.5z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Files',
      href: `/groups/${group.handle}/files`,
      hidden: !group.settings?.enableFiles
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      ),
      label: 'About',
      href: `/groups/${group.handle}/about`
    }
  ];

  // Admin items (visible only for members or admins)
  const adminItems = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Manage Group',
      href: `/groups/${group.handle}/manage`
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Insights',
      href: `/groups/${group.handle}/insights`
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path d="M18.75 12.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5zM12 6a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 6zM12 18a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 18zM3.75 6.75h1.5a.75.75 0 100-1.5h-1.5a.75.75 0 000 1.5zM5.25 18.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 010 1.5zM3 12a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 013 12zM9 3.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM12.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM9 15.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
        </svg>
      ),
      label: 'Group Settings',
      href: `/groups/${group.handle}/settings`
    }
  ];

  // Find the current path active state
  const isActive = (href: string) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === href;
    }
    return false;
  };

  return (
    <aside className="sidebar sticky top-14 h-[calc(100vh-3.5rem)] w-[280px] overflow-y-auto px-2 py-3 no-scrollbar bg-gray-950 backdrop-blur-sm">
      {/* Background subtle glow effects */}
      <div className="fixed top-0 left-0 w-40 h-40 bg-indigo-600/5 blur-3xl rounded-full"></div>
      <div className="fixed top-40 left-20 w-60 h-60 bg-purple-600/5 blur-3xl rounded-full"></div>

      <nav className="flex flex-col relative z-10">
        {/* Group header */}
        <div className="mb-4 px-3 py-2 rounded-xl bg-gray-900/30 border border-gray-800/20">
          <Link href={`/groups/${group.handle}`} className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-gray-800/30 shadow-md shadow-indigo-900/10">
              {group.logoImage ? (
                <Image
                  src={group.logoImage}
                  alt={group.name}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-700 to-purple-700">
                  <span className="text-lg font-bold text-white">{group.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h2 className="truncate text-base font-semibold text-white">{group.name}</h2>
              <div className="flex items-center text-xs text-gray-400">
                <span className="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-3.5">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                  </svg>
                  {group._count?.members || 0}
                </span>
                <span className="mx-1">•</span>
                <span className={`capitalize ${group.privacy === 'PUBLIC' ? 'text-green-400' : 'text-amber-400'}`}>
                  {group.privacy.toLowerCase()}
                </span>
                {group.isVerified && (
                  <>
                    <span className="mx-1">•</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-indigo-400">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Back to all groups */}
        <Link
          href="/groups"
          className="mb-4 flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-900/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Back to all groups
        </Link>

        {/* Group navigation */}
        <div className="mb-2 px-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Navigation</h3>
        </div>
        
        <ul className="space-y-1 px-2">
          {groupNavItems
            .filter(item => !item.hidden)
            .map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${THEME.textPrimary} transition-all duration-200 relative overflow-hidden ${
                    isActive(item.href)
                      ? 'bg-gray-800/30 font-medium'
                      : `${THEME.cardBgHover}`
                  }`}
                >
                  {/* Low opacity gradient background that shows on hover */}
                  <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-indigo-600/10 to-purple-700/10 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Low opacity pulsing border on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/20 rounded-xl"></div>

                  <div className="flex items-center gap-3 z-10">
                    <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white'
                        : 'bg-gray-800/70 text-gray-300 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-700 group-hover:text-white transition-all duration-300'
                    }`}>
                      {item.icon}
                    </div>
                    <span className="text-base relative">{item.label}</span>
                  </div>
                  
                  {item.count !== undefined && (
                    <span className={`text-xs px-2 py-1 rounded-full z-10 ${
                      isActive(item.href)
                        ? 'bg-indigo-800/50 text-indigo-200'
                        : 'bg-gray-800/70 text-gray-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
        </ul>

        {/* Member actions */}
        {!isMember ? (
          <div className="mt-4 px-4">
            <button
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-900/20"
            >
              Join Group
            </button>
          </div>
        ) : (
          <>
            {/* Admin section */}
            <div className="mt-6 mb-2 px-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Admin</h3>
            </div>
            
            <ul className="space-y-1 px-2">
              {adminItems.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 ${THEME.textPrimary} transition-all duration-200 relative overflow-hidden ${
                      isActive(item.href) 
                        ? 'bg-indigo-900/30 font-medium' 
                        : `${THEME.cardBgHover}`
                    }`}
                  >
                    {/* Gradient background on hover */}
                    <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-indigo-600/10 to-purple-700/10 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white'
                        : 'bg-gray-800/70 text-gray-400 group-hover:text-indigo-300'
                    }`}>
                      {item.icon}
                    </div>
                    <span className="text-sm relative z-10">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Leave group action */}
        {isMember && (
          <div className="mt-auto pt-6 px-4">
            <button
              className="w-full rounded-lg border border-red-800/30 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors"
            >
              Leave Group
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 px-3 text-xs text-gray-500">
          <p className="mb-1 hover:text-gray-400 transition-colors duration-200">
            <span className="hover:text-indigo-400 transition-colors">Privacy</span> ·
            <span className="hover:text-indigo-400 transition-colors ml-1">Rules</span> ·
            <span className="hover:text-indigo-400 transition-colors ml-1">Help</span>
          </p>
        </div>
      </nav>
    </aside>
  );
}