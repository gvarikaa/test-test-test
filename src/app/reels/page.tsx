'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CreateReelButton } from '../components/reels';

// Dynamic import of RecommendedReelFeed with a loading fallback
const RecommendedReelFeed = dynamic(() => import('../components/reels/RecommendedReelFeed'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  ),
  ssr: false,
});

// Error fallback component
const ReelErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-red-400 mb-6">
        {error.message || "Failed to load reels content"}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            resetErrorBoundary();
            router.refresh();
          }}
          className="px-4 py-2 bg-accent-blue rounded-md text-white hover:bg-accent-blue/90"
        >
          Try again
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-card-secondary-bg rounded-md text-white hover:bg-hover-bg"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

// Error Boundary wrapper for React
class ReelFeedErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ReelErrorFallback error={this.state.error!} resetErrorBoundary={this.resetErrorBoundary} />;
    }
    return this.props.children;
  }
}

export default function ReelsPage() {
  return (
    <main className="h-screen overflow-hidden">
      <ReelFeedErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        }>
          <RecommendedReelFeed />
        </Suspense>
      </ReelFeedErrorBoundary>
      <CreateReelButton variant="fixed" />
    </main>
  );
}