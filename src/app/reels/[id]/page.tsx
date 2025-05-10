'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReelFeed } from '../../components/reels';
import { trpc } from '@/lib/trpc/client';

export default function ReelIdPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [initialReel, setInitialReel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: reel } = trpc.reel.getReelById.useQuery(
    { reelId: id },
    { 
      enabled: !!id,
      onSuccess: (data) => {
        setInitialReel(data);
        setIsLoading(false);
      },
      onError: (err) => {
        setError("Couldn't load reel");
        setIsLoading(false);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !initialReel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <p className="text-xl mb-4">Reel not found</p>
        <p className="text-sm text-gray-400">The requested reel could not be found.</p>
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden">
      <ReelFeed initialReels={[initialReel]} />
    </main>
  );
}