"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FacebookHeader from "./components/layouts/FacebookHeader";
import LeftSidebar from "./components/layouts/LeftSidebar";
import RightSidebar from "./components/layouts/RightSidebar";
import MobileNavigation from "./components/layouts/MobileNavigation";
import StoryStrip from "./components/feed/StoryStrip";
import CreatePostBox from "./components/feed/CreatePostBox";
import Post from "./components/feed/Post";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // ავტომატურად დავაყენოთ მუქი თემა
    document.documentElement.classList.add('dark');
  }, []);

  // სადემონსტრაციო პოსტები
  const posts = [
    {
      id: '1',
      user: {
        id: '1',
        name: 'John Doe',
        image: 'https://ui-avatars.com/api/?name=John+Doe&background=FF5722&color=fff',
      },
      content: 'Just started using the new DapDip platform! Excited to connect with everyone here. #technology',
      images: [
        'https://picsum.photos/800/600?random=1',
      ],
      createdAt: '2025-05-08T12:00:00Z',
      likes: 15,
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
      content: 'Just finished my latest digital art piece. What do you think? #art',
      images: [
        'https://picsum.photos/800/600?random=2',
      ],
      createdAt: '2025-05-08T10:30:00Z',
      likes: 42,
      comments: 7,
      shares: 5,
    },
    {
      id: '3',
      user: {
        id: '3',
        name: 'David Johnson',
        image: 'https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff',
      },
      content: 'Morning workout complete! 💪 Feeling energized for the day. #fitness',
      createdAt: '2025-05-08T08:15:00Z',
      likes: 24,
      comments: 4,
      shares: 1,
    },
    {
      id: '4',
      user: {
        id: '4',
        name: 'Emily Brown',
        image: 'https://ui-avatars.com/api/?name=Emily+Brown&background=9C27B0&color=fff',
      },
      content: 'Check out these amazing photos from my trip to Japan last month! The cherry blossoms were stunning. 🌸 #travel #japan',
      images: [
        'https://picsum.photos/800/600?random=3',
        'https://picsum.photos/800/600?random=4',
      ],
      createdAt: '2025-05-07T22:45:00Z',
      likes: 67,
      comments: 12,
      shares: 8,
    },
  ];

  if (!mounted) {
    return null; // კლიენტის მხარეს გარენდერების დროს თავიდან აირიდოს ჰიდრაციის შეცდომები
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ჰედერი */}
      <FacebookHeader />

      {/* მთავარი კონტენტი */}
      <div className="flex justify-center px-0 lg:px-4">
        {/* მარცხენა სვეტი - ნავიგაცია */}
        <LeftSidebar />

        {/* შუა სვეტი - პოსტების ფიდი */}
        <main className="w-full max-w-[680px] px-0 py-4 sm:px-4">
          {/* სთორების სტრიპი */}
          <StoryStrip />

          {/* პოსტის შექმნის ბოქსი */}
          <CreatePostBox />

          {/* პოსტების ფიდი */}
          <div className="posts-feed space-y-4">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        </main>

        {/* მარჯვენა სვეტი - ჩატი და კონტაქტები */}
        <RightSidebar />
      </div>

      {/* მობილური ნავიგაცია */}
      <MobileNavigation />
    </div>
  );
}