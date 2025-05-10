'use client';

import React, { useEffect } from 'react';
import { ReelCreator } from '../../components/reels';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CreateReelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/reels/create');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden">
      <ReelCreator />
    </main>
  );
}