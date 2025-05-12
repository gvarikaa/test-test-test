// სპეციალური გამართვისათვის ფუნქცია

export async function fetchPosts() {
  try {
    // პირდაპირ API-ს გამოძახება
    const response = await fetch('/api/test/debug-posts');
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown error fetching posts');
    }
    
    return {
      success: true,
      posts: data.posts.map(post => ({
        id: post.id, 
        content: post.content,
        createdAt: post.createdAt,
        user: post.user,
        _count: {
          reactions: post._count?.reactions || 0,
          comments: post._count?.comments || 0
        },
        media: post.media || []
      }))
    };
  } catch (error) {
    console.error("Error in special fetch:", error);
    return {
      success: false,
      error: error.message || 'Error fetching posts',
      posts: []
    };
  }
}