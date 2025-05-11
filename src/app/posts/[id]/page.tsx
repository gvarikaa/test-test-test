import { notFound } from 'next/navigation';
import PostView from '@/app/components/posts/post-view';

interface PostPageProps {
  params: {
    id: string;
  };
}

export default function PostPage({ params }: PostPageProps) {
  // Validate ID to prevent malformed requests
  if (!params.id || typeof params.id !== 'string') {
    return notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <PostView postId={params.id} />
    </main>
  );
}