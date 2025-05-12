"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LeftSidebar() {
  const [expanded, setExpanded] = useState(false);

  // Define theme colors for consistent styling
  const THEME = {
    // Primary gradients
    primaryGradient: "bg-gradient-to-r from-indigo-600 to-purple-700",
    secondaryGradient: "bg-gradient-to-r from-violet-700 to-fuchsia-700",
    accentGradient: "bg-gradient-to-r from-amber-600 to-orange-600",

    // Background levels
    cardBg: "bg-gray-900",
    cardBgHover: "hover:bg-gray-800/60",
    cardBorder: "border-gray-800/40",

    // Text colors
    textPrimary: "text-gray-100",
    textSecondary: "text-gray-400",
    textMuted: "text-gray-500",

    // Effects
    glow: "shadow-lg shadow-indigo-950/40"
  };

  // მოკლე მენიუ
  const mainMenuItems = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
        </svg>
      ),
      label: 'Friends',
      href: '/friends'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm4 9v-2h4v-2H8V7h8v2h-4v2h4v2H8z" />
        </svg>
      ),
      label: 'Reels',
      href: '/reels'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
          <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
        </svg>
      ),
      label: 'Groups',
      href: '/groups' // Correct, this works now. The `/groups` page is properly configured
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
          <path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3-6a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3zm8.25-.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-3z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Marketplace',
      href: '/marketplace'
    }
  ];

  // გაფართოებული მენიუ
  const expandedMenuItems = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Saved',
      href: '/saved'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Memories',
      href: '/memories'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Events',
      href: '/events'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
        </svg>
      ),
      label: 'Gaming',
      href: '/gaming'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
        </svg>
      ),
      label: 'Better Me',
      href: '/better-me'
    }
  ];

  return (
    <aside className="sidebar sticky top-14 h-[calc(100vh-3.5rem)] w-[280px] overflow-y-auto px-2 py-3 no-scrollbar bg-gray-950/50 backdrop-blur-sm">
      {/* Background subtle glow effects */}
      <div className="fixed top-0 left-0 w-40 h-40 bg-indigo-600/5 blur-3xl rounded-full"></div>
      <div className="fixed top-40 left-20 w-60 h-60 bg-purple-600/5 blur-3xl rounded-full"></div>

      <nav className="flex flex-col relative z-10">
        {/* მენიუს პუნქტები */}
        <ul className="space-y-1 pb-2">
          {mainMenuItems.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 ${THEME.textPrimary} ${THEME.cardBgHover} transition-all duration-200 relative overflow-hidden`}
              >
                {/* Low opacity gradient background that shows on hover */}
                <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-indigo-600/10 to-purple-700/10 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Low opacity pulsing border on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/20 rounded-xl"></div>

                {/* Icon with gradient background on hover */}
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/70 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-700 transition-all duration-300">
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300">{item.icon}</span>
                </div>

                {/* Label with hover effect */}
                <span className="text-base relative">{item.label}</span>
              </Link>
            </li>
          ))}

          {/* See More / See Less ტოგლი */}
          <li>
            <button
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${THEME.textPrimary} ${THEME.cardBgHover} transition-all duration-200 relative overflow-hidden`}
              onClick={() => setExpanded(!expanded)}
            >
              {/* Low opacity gradient background that shows on hover */}
              <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-indigo-600/10 to-purple-700/10 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Button icon with gradient */}
              <div className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/70 group-hover:${THEME.primaryGradient} transition-all duration-300`}>
                {expanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-gray-300 group-hover:text-white transition-colors duration-300">
                    <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-gray-300 group-hover:text-white transition-colors duration-300">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span className="text-base relative">{expanded ? 'See Less' : 'See More'}</span>
            </button>
          </li>
        </ul>
        
        {/* გაფართოებული მენიუ */}
        {expanded && (
          <ul className="space-y-1 border-t border-gray-800/20 pt-3 mt-1">
            {expandedMenuItems.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 ${THEME.textPrimary} ${THEME.cardBgHover} transition-all duration-200 relative overflow-hidden ${
                    (item.href === "/groups" && typeof window !== "undefined" && window.location.pathname.startsWith("/groups")) ||
                    (item.href === "/events" && typeof window !== "undefined" && window.location.pathname.startsWith("/events"))
                      ? "bg-gray-800/30 font-medium"
                      : ""
                  }`}
                >
                  {/* Low opacity gradient background that shows on hover */}
                  <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-indigo-600/10 to-purple-700/10 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Icon with subtle glow */}
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/50 group-hover:bg-gradient-to-r group-hover:from-indigo-600/90 group-hover:to-purple-700/90 transition-all duration-300">
                    <span className="text-gray-300 group-hover:text-white transition-colors duration-300">{item.icon}</span>
                  </div>

                  <span className="text-base relative">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="my-4 border-t border-gray-800/20"></div>
        
        {/* წვდომების ნაწილი */}
        <div className="px-3 mb-2">
          <h3 className={`mb-3 font-semibold text-sm text-gray-400 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider`}>AI Features</h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/ai-analytics"
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 hover:text-white transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                {/* Glowing border that appears on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/30 rounded-xl"></div>

                {/* Icon with colored gradient background */}
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-md shadow-indigo-950/40">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                  </svg>
                </span>
                <span className="text-sm font-medium">AI Analysis Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/ai-settings/tokens"
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 hover:text-white transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                {/* Glowing border that appears on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-indigo-500/30 rounded-xl"></div>

                {/* Icon with shimmering gradient background */}
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-950/40">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                    <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.75 6.75 0 111.5 0v4.661c0 .326.277.585.6.544.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
                    <path fillRule="evenodd" d="M9.75 15.75a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm4.5 0a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">AI Packages</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">NEW</span>
                </div>
              </Link>
            </li>
          </ul>
        </div>

        <div className="px-3">
          <h3 className={`mb-3 font-semibold text-sm text-gray-400 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider`}>Developer Tools</h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/test-trpc"
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400 hover:text-gray-300 transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 group-hover:text-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M16.5 7.5h-9v9h9v-9z" />
                    <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-sm">Test tRPC</span>
              </Link>
            </li>
            <li>
              <Link
                href="/test-styles"
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400 hover:text-gray-300 transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 group-hover:text-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-sm">Test Styles</span>
              </Link>
            </li>
            <li>
              <Link
                href="/inline-styles"
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400 hover:text-gray-300 transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 group-hover:text-indigo-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                  </svg>
                </span>
                <span className="text-sm">Inline Styles</span>
              </Link>
            </li>
            <li>
              <Link
                href="/test-tokens"
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-gray-400 hover:text-gray-300 transition-all duration-200 relative overflow-hidden hover:bg-gray-800/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800/80 text-purple-400 group-hover:text-purple-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                    <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-sm">Token UI Test</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* ფუტერი */}
        <div className="mt-8 px-3 text-xs text-gray-500">
          <p className="mb-1 hover:text-gray-400 transition-colors duration-200 cursor-pointer">
            <span className="hover:text-indigo-400 transition-colors">Privacy</span> ·
            <span className="hover:text-indigo-400 transition-colors ml-1">Terms</span> ·
            <span className="hover:text-indigo-400 transition-colors ml-1">Advertising</span>
          </p>
          <p className="hover:text-gray-400 transition-colors duration-200">
            <span className="hover:text-indigo-400 transition-colors">Cookies</span> ·
            <span className="hover:text-indigo-400 transition-colors ml-1">More</span> ·
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent ml-1">DapDip © {new Date().getFullYear()}</span>
          </p>
        </div>
      </nav>
    </aside>
  );
}