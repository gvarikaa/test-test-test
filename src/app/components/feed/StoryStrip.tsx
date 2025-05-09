"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function StoryStrip() {
  const [stories, setStories] = useState([
    {
      id: '1',
      user: {
        id: '1',
        name: 'Your Story',
        image: 'https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?nature'
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'John Doe',
        image: 'https://ui-avatars.com/api/?name=John+Doe&background=FF5722&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?city'
    },
    {
      id: '3',
      user: {
        id: '3',
        name: 'Sarah Williams',
        image: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?beach'
    },
    {
      id: '4',
      user: {
        id: '4',
        name: 'David Johnson',
        image: 'https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?mountain'
    },
    {
      id: '5',
      user: {
        id: '5',
        name: 'Emily Brown',
        image: 'https://ui-avatars.com/api/?name=Emily+Brown&background=9C27B0&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?sunset'
    },
    {
      id: '6',
      user: {
        id: '6',
        name: 'Michael Wilson',
        image: 'https://ui-avatars.com/api/?name=Michael+Wilson&background=3F51B5&color=fff'
      },
      image: 'https://source.unsplash.com/random/200x350/?forest'
    }
  ]);

  return (
    <div className="story-container my-4 flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
      {/* Create story card */}
      <div className="story-item flex min-w-28 flex-col rounded-xl bg-card-bg shadow-sm">
        <div className="relative h-36 overflow-hidden rounded-t-xl">
          <Image 
            src="https://source.unsplash.com/random/200x350/?hiking"
            alt="Create Story" 
            width={112}
            height={144}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        <div className="relative flex flex-1 flex-col items-center justify-end p-3 text-center">
          <div className="absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="mt-4 text-sm font-medium">Create Story</span>
        </div>
      </div>

      {/* Story cards */}
      {stories.map((story) => (
        <div 
          key={story.id} 
          className="story-item min-w-28 cursor-pointer"
        >
          <Image 
            src={story.image}
            alt={story.user.name}
            width={112}
            height={200}
            className="h-full w-full object-cover"
          />
          <Image 
            src={story.user.image}
            alt={story.user.name}
            width={40}
            height={40}
            className="story-avatar"
          />
          <p className="story-username">{story.user.name}</p>
        </div>
      ))}
    </div>
  );
}