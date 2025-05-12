"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import FacebookHeader from '../../components/layouts/FacebookHeader';
import GroupLeftSidebar from '../../components/groups/GroupLeftSidebar';
import GroupRightSidebar from '../../components/groups/GroupRightSidebar';
import MobileNavigation from '../../components/layouts/MobileNavigation';
import CreatePostBox from '../../components/feed/CreatePostBox';

export default function GroupDetailsPage() {
  const params = useParams<{ handle: string }>();
  const [activeTab, setActiveTab] = useState('feed');
  const [isMember, setIsMember] = useState(false);
  
  // Mock data for demonstration
  const mockGroup = {
    id: '1',
    name: 'Tech Enthusiasts',
    handle: params.handle || 'tech-enthusiasts',
    description: 'A community for all technology lovers. Share news, discuss trends, and connect with other tech enthusiasts. Everyone is welcome, from beginners to experts!',
    privacy: 'PUBLIC',
    isVerified: true,
    coverImage: 'https://picsum.photos/seed/tech-cover/1200/400',
    logoImage: 'https://picsum.photos/seed/tech-logo/200/200',
    createdAt: '2024-01-15T12:00:00Z',
    rules: 'Be respectful to others. No spamming. Post content related to technology only. No offensive content.',
    autoApproveMembers: true,
    allowMemberPosts: true,
    requirePostApproval: false,
    creator: {
      id: '101',
      name: 'John Smith',
      username: 'johnsmith',
      image: 'https://ui-avatars.com/api/?name=John+Smith&background=0D8ABC&color=fff',
    },
    settings: {
      allowMemberInvites: true,
      enableDiscussions: true,
      enableEvents: true,
      enablePolls: true,
      enableFiles: true,
    },
    _count: {
      members: 1245,
      posts: 352,
      discussions: 89,
      events: 12,
    }
  };

  // Dummy posts data for demonstration
  const posts = [
    {
      id: '1',
      user: {
        id: mockGroup.creator.id,
        name: mockGroup.creator.name,
        image: mockGroup.creator.image,
      },
      content: `Welcome to our group! Feel free to introduce yourself and share your thoughts. This is a community for ${mockGroup.name} enthusiasts.`,
      createdAt: '2024-05-01T10:00:00Z',
      likes: 12,
      comments: 3,
      shares: 2,
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'Sarah Williams',
        image: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff',
      },
      content: `Just joined the group! Excited to connect with everyone who shares the same interests.`,
      images: [
        'https://picsum.photos/seed/post2/800/600',
      ],
      createdAt: '2024-05-03T15:30:00Z',
      likes: 8,
      comments: 5,
      shares: 0,
    },
  ];

  // Handle join/leave group
  const handleJoinGroup = () => {
    setIsMember(true);
  };

  const handleLeaveGroup = () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      setIsMember(false);
    }
  };

  // Helper for rendering post content
  const Post = ({ post }) => {
    return (
      <div key={post.id} className="mb-4 rounded-lg bg-card-bg p-4 shadow-sm">
        <div className="mb-3 flex items-center">
          <div className="relative h-10 w-10 overflow-hidden rounded-full">
            <Image
              src={post.user.image}
              alt={post.user.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-text-primary">{post.user.name}</h3>
            <p className="text-xs text-text-secondary">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <p className="mb-3 text-text-primary">{post.content}</p>
        {post.images && post.images.length > 0 && (
          <div className="mb-3 overflow-hidden rounded-lg">
            <Image
              src={post.images[0]}
              alt="Post image"
              width={600}
              height={400}
              className="w-full object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border-color pt-3 text-sm text-text-secondary">
          <span>{post.likes} Likes</span>
          <span>{post.comments} Comments</span>
          <span>{post.shares} Shares</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <FacebookHeader />

      {/* Group-specific styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .group-shine {
          position: relative;
          overflow: hidden;
        }

        .group-shine::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.05),
            transparent
          );
          animation: shimmer 3s infinite;
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>

      {/* Main content */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* Left sidebar - group navigation */}
        <GroupLeftSidebar
          group={mockGroup}
          isMember={isMember}
        />

        {/* Main column - group content */}
        <main className="w-full max-w-[680px] px-0 pb-4 sm:px-4">
          {/* Group header/cover */}
          <div className="mb-4 overflow-hidden rounded-lg bg-gray-900 border border-gray-800/40 shadow-md animate-fade-in">
            {/* Cover image */}
            <div className="relative h-48 w-full bg-gray-700 sm:h-64">
              {mockGroup.coverImage ? (
                <Image
                  src={mockGroup.coverImage}
                  alt={`${mockGroup.name} cover`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <h1 className="text-2xl font-bold text-gray-300">{mockGroup.name}</h1>
                </div>
              )}
            </div>
            
            {/* Group info */}
            <div className="relative px-4 pb-4 pt-16 sm:px-6">
              {/* Group logo */}
              <div className="absolute -top-12 left-4 h-24 w-24 overflow-hidden rounded-xl border-4 border-card-bg bg-gray-700 sm:left-6">
                {mockGroup.logoImage ? (
                  <Image
                    src={mockGroup.logoImage}
                    alt={`${mockGroup.name} logo`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-3xl font-bold text-white">{mockGroup.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <h1 className="text-2xl font-bold text-text-primary">{mockGroup.name}</h1>
                  <div className="mt-1 flex items-center text-sm text-text-secondary">
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-4">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 011.33-3.686c.032-.027.064-.053.098-.078a5.99 5.99 0 012.31-1.03.75.75 0 01.372 1.455c-.64.164-1.189.45-1.6.766a1.5 1.5 0 00-.666 1.11 1.5 1.5 0 01-1.486 1.905zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                      </svg>
                      {mockGroup._count.members} members
                    </span>
                    <span className="mx-2">•</span>
                    <span className="capitalize">{mockGroup.privacy.toLowerCase()} group</span>
                    {mockGroup.isVerified && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 size-4 text-primary">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div>
                  {isMember ? (
                    <button
                      onClick={handleLeaveGroup}
                      className="rounded-lg bg-card-secondary-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-hover-bg"
                    >
                      Leave Group
                    </button>
                  ) : (
                    <button
                      onClick={handleJoinGroup}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      Join Group
                    </button>
                  )}
                  
                  {isMember && (
                    <Link
                      href={`/groups/${mockGroup.handle}/manage`}
                      className="ml-2 rounded-lg bg-card-secondary-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-hover-bg"
                    >
                      Manage Group
                    </Link>
                  )}
                </div>
              </div>
            </div>
            
            {/* Group tabs */}
            <div className="border-t border-gray-800/40 px-4 sm:px-6">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                    activeTab === 'feed'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                    activeTab === 'about'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                    activeTab === 'members'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Members
                </button>
                {isMember && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'requests'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Requests
                  </button>
                )}
                {mockGroup.settings.enableEvents && (
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'events'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Events
                  </button>
                )}
                {mockGroup.settings.enableDiscussions && (
                  <button
                    onClick={() => setActiveTab('discussions')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'discussions'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Discussions
                  </button>
                )}
                {mockGroup.settings.enableFiles && (
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${
                      activeTab === 'files'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Files
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="space-y-4">
            {/* Feed tab */}
            {activeTab === 'feed' && (
              <>
                {/* Create post box - only show if member */}
                {isMember && (
                  <>
                    {/* Use same create post box as main page */}
                    <CreatePostBox />
                  </>
                )}

                {/* Join group message for non-members */}
                {!isMember && (
                  <div className="mb-4 rounded-lg bg-gray-900 p-6 text-center shadow-md border border-gray-800/40">
                    <h2 className="text-lg font-semibold text-gray-100">Join this group to participate</h2>
                    <p className="mt-2 text-gray-400">
                      Join to see posts, comment, and interact with other members.
                    </p>
                    <button
                      onClick={handleJoinGroup}
                      className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-2 font-medium text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-900/30"
                    >
                      Join Group
                    </button>
                  </div>
                )}
                
                {/* Group posts */}
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Post key={post.id} post={post} />
                  ))}
                </div>
              </>
            )}

            {/* About tab */}
            {activeTab === 'about' && (
              <div className="overflow-hidden rounded-lg bg-card-bg shadow-sm">
                <div className="p-4 sm:p-6">
                  <h2 className="mb-4 text-xl font-semibold text-text-primary">About</h2>
                  
                  {mockGroup.description && (
                    <div className="mb-6">
                      <h3 className="mb-2 text-sm font-medium uppercase text-text-secondary">Description</h3>
                      <p className="whitespace-pre-line text-text-primary">{mockGroup.description}</p>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium uppercase text-text-secondary">Group Type</h3>
                    <p className="flex items-center text-text-primary">
                      {mockGroup.privacy === 'PUBLIC' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                          </svg>
                          Public · Anyone can see the group and its content
                        </>
                      )}
                      {mockGroup.privacy === 'PRIVATE' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V8.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L6.2 9.74a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
                          </svg>
                          Private · Anyone can find the group, only members can see the content
                        </>
                      )}
                      {mockGroup.privacy === 'SECRET' && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                          </svg>
                          Secret · Only members can find the group and see content
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium uppercase text-text-secondary">History</h3>
                    <div className="flex items-center text-text-secondary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-2 size-5">
                        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                      </svg>
                      Created on {new Date(mockGroup.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {mockGroup.rules && (
                    <div className="mb-6">
                      <h3 className="mb-2 text-sm font-medium uppercase text-text-secondary">Group Rules</h3>
                      <div className="rounded-lg bg-card-secondary-bg p-4">
                        <p className="whitespace-pre-line text-text-primary">{mockGroup.rules}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium uppercase text-text-secondary">Activity</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-card-secondary-bg p-3 text-center">
                        <div className="text-lg font-semibold text-text-primary">{mockGroup._count.members}</div>
                        <div className="text-xs text-text-secondary">Members</div>
                      </div>
                      <div className="rounded-lg bg-card-secondary-bg p-3 text-center">
                        <div className="text-lg font-semibold text-text-primary">{mockGroup._count.posts}</div>
                        <div className="text-xs text-text-secondary">Posts</div>
                      </div>
                      <div className="rounded-lg bg-card-secondary-bg p-3 text-center">
                        <div className="text-lg font-semibold text-text-primary">{mockGroup._count.discussions}</div>
                        <div className="text-xs text-text-secondary">Discussions</div>
                      </div>
                      <div className="rounded-lg bg-card-secondary-bg p-3 text-center">
                        <div className="text-lg font-semibold text-text-primary">{mockGroup._count.events}</div>
                        <div className="text-xs text-text-secondary">Events</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-border-color pt-4">
                    <h3 className="mb-3 text-sm font-medium uppercase text-text-secondary">Admin</h3>
                    <div className="flex items-center">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        {mockGroup.creator.image ? (
                          <Image
                            src={mockGroup.creator.image}
                            alt={mockGroup.creator.name || ''}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-600 text-sm font-bold text-white">
                            {(mockGroup.creator.name || 'A').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-text-primary">{mockGroup.creator.name}</h4>
                        <p className="text-sm text-text-secondary">Group Creator</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Other tabs would be rendered here */}
            {(activeTab === 'members' || activeTab === 'requests' || activeTab === 'events' || activeTab === 'discussions' || activeTab === 'files') && (
              <div className="rounded-lg bg-card-bg p-6 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                <p className="mt-2 text-text-secondary">
                  This feature is coming soon.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Right sidebar - group members and activity */}
        <GroupRightSidebar
          group={mockGroup}
          isMember={isMember}
        />
      </div>

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}