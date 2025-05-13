"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TokenHeaderDisplay from '../common/token-header-display';


export default function FacebookHeader() {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    'მეგობრები',
    'ფოტოები',
    'პოსტები',
    'გრუპები'
  ]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Define theme colors for consistent styling
  const THEME = {
    // Primary gradients
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",

    // Background levels
    headerBg: "bg-gray-900/80",
    cardBg: "bg-gray-900/70",
    searchBg: "bg-gray-800/60",
    iconBg: "bg-gray-800/70",

    // Text and border colors
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    accentBlue: "text-indigo-400",
    borderColor: "border-gray-800/40",

    // Effects
    glow: "shadow-lg shadow-indigo-950/30",
    activeNavGlow: "shadow-md shadow-indigo-500/40"
  };

  // ძიების ისტორიაში დამატება
  const addToSearchHistory = (query: string) => {
    if (query && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  // ძიების შესრულება
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery.trim());
      // აქ მოგვიანებით დაემატება საძიებო API-ზე გადამისამართება
      setSearchQuery('');
      setShowSearchHistory(false);
    }
  };

  return (
    <>
      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>

      <header className={`sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b ${THEME.borderColor} ${THEME.headerBg} px-4 ${THEME.glow} backdrop-blur-md`}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-indigo-900/5"></div>
      {/* Left section: Logo and Search */}
      <div className="flex items-center relative z-10">
        <Link href="/" className="mr-3 flex items-center group">
          <div className="relative">
            {/* Animated glow effect */}
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>

            {/* Logo background */}
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${THEME.primaryGradient} text-white shadow-lg transition-all duration-300 group-hover:scale-105`}>
              <span className="text-xl font-bold">D</span>
            </div>
          </div>
        </Link>

        <div className="relative">
          <form onSubmit={handleSearch}>
            <div
              className={`flex items-center rounded-full ${THEME.searchBg} border border-gray-700/30 transition-all duration-300 ease-in-out backdrop-blur-sm ${
                searchActive ? 'w-72 shadow-md ring-1 ring-indigo-500/50 border-indigo-600/30' : 'w-48'
              }`}>
              <div className="flex h-9 w-9 items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-all duration-300 ${searchActive ? 'text-indigo-400' : ''}`}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search DapDip"
                className={`h-9 w-full bg-transparent pr-4 ${THEME.textPrimary} text-sm placeholder:text-gray-500 outline-none`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchActive(true);
                  setShowSearchHistory(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setSearchActive(false);
                    setShowSearchHistory(false);
                  }, 200);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="mr-2 rounded-full p-1 text-gray-400 hover:text-indigo-400 transition-colors duration-200"
                  onClick={() => setSearchQuery('')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* ძიების ისტორია */}
          {showSearchHistory && (
            <div className={`absolute left-0 top-12 w-72 rounded-xl border ${THEME.borderColor} ${THEME.cardBg} p-3 shadow-lg shadow-black/20 backdrop-blur-md animate-fadeIn z-50`}>
              <div className="mb-3 flex items-center justify-between border-b border-gray-800/30 pb-2">
                <h4 className={`text-sm font-medium ${THEME.textPrimary}`}>Recent Searches</h4>
                <button className={`text-xs ${THEME.accentBlue} hover:text-indigo-300 transition-colors duration-200`}>
                  Clear All
                </button>
              </div>
              <ul className="space-y-1.5">
                {recentSearches.map((search, index) => (
                  <li key={index}>
                    <button
                      className={`group flex w-full items-center rounded-lg px-2 py-1.5 text-left ${THEME.textPrimary} hover:bg-gray-800/50 transition-colors duration-150`}
                      onClick={() => {
                        setSearchQuery(search);
                        setShowSearchHistory(false);
                      }}
                    >
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800/70 text-gray-400 group-hover:text-indigo-400 transition-colors duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm">{search}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Main navigation */}
      <nav className="flex flex-1 items-center justify-center relative z-10">
        <div className="flex gap-1 md:gap-2">
          {/* Home - Active */}
          <Link
            href="/"
            className={`group relative flex h-11 w-12 md:w-14 items-center justify-center rounded-xl text-indigo-400 transition-all duration-300 hover:bg-gray-800/60 overflow-hidden`}
          >
            {/* Active indicator - glowing bar at bottom */}
            <div className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-t-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/50"></div>

            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 transition-opacity duration-300"></div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
            </svg>
          </Link>

          {/* Friends */}
          <Link
            href="/friends"
            className="group relative flex h-11 w-12 md:w-14 items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 transition-all duration-300 hover:bg-gray-800/60 overflow-hidden"
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 transition-opacity duration-300"></div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
            </svg>
          </Link>

          {/* Marketplace */}
          <Link
            href="/marketplace"
            className="group relative flex h-11 w-12 md:w-14 items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 transition-all duration-300 hover:bg-gray-800/60 overflow-hidden"
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 transition-opacity duration-300"></div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
              <path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3-6a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3zm8.25-.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-3z" clipRule="evenodd" />
            </svg>
          </Link>

          {/* Groups */}
          <Link
            href="/groups"
            className="group relative flex h-11 w-12 md:w-14 items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 transition-all duration-300 hover:bg-gray-800/60 overflow-hidden"
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 transition-opacity duration-300"></div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
              <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
            </svg>
          </Link>

          {/* Reels */}
          <Link
            href="/reels"
            className="group relative flex h-11 w-12 md:w-14 items-center justify-center rounded-xl text-gray-400 hover:text-gray-200 transition-all duration-300 hover:bg-gray-800/60 overflow-hidden"
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 transition-opacity duration-300"></div>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm4 9v-2h4v-2H8V7h8v2h-4v2h4v2H8z" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Right section: Actions */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Token Display */}
        <TokenHeaderDisplay />

        {/* Menu */}
        <button className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${THEME.iconBg} hover:bg-gray-700/60 transition-all duration-200 group`}>
          {/* Subtle border glow on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/30 rounded-xl transition-opacity duration-300"></div>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-gray-300">
            <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Messenger */}
        <Link
          href="/messages"
          className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${THEME.iconBg} hover:bg-gray-700/60 transition-all duration-200 text-gray-300 hover:text-indigo-300 active:scale-95 group`}
        >
          {/* Subtle border glow on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/30 rounded-xl transition-opacity duration-300"></div>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
          </svg>

          {/* Notification badge with gradient */}
          <div className="absolute -right-1 -top-1">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur-[1px] opacity-70"></div>
            <span className="relative flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-[2px] text-xs font-bold text-white shadow-sm">3</span>
          </div>

          {/* Animated ping effect */}
          <span className="absolute inset-0 rounded-xl bg-indigo-500/10 animate-ping opacity-75"></span>
        </Link>

        {/* Notifications */}
        <button className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${THEME.iconBg} hover:bg-gray-700/60 transition-all duration-200 text-gray-300 hover:text-indigo-300 active:scale-95 group`}>
          {/* Subtle border glow on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/30 rounded-xl transition-opacity duration-300"></div>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
          </svg>

          {/* Notification badge with gradient */}
          <div className="absolute -right-1 -top-1">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 blur-[1px] opacity-70"></div>
            <span className="relative flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-[2px] text-xs font-bold text-white shadow-sm">5</span>
          </div>

          {/* Animated ping effect */}
          <span className="absolute inset-0 rounded-xl bg-purple-500/10 animate-ping opacity-75"></span>
        </button>

        {/* Profile */}
        <div className="relative group">
          {/* Glowing ring effect */}
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>

          <button className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-gray-800 group-hover:border-transparent transition-all duration-300">
            <Image
              src="https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff"
              alt="Profile"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </button>

          {/* Profile Dropdown - placeholder for future implementation */}
          {/* Will add full implementation for profile dropdown in a future update */}
        </div>
      </div>
      </header>
    </>
  );
}