import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import PostCard from "@/components/post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithUser } from "@shared/schema";

export default function Home() {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json() as Promise<PostWithUser[]>;
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-surface-gray">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-pinterest-gray">
                Failed to load posts. Please try again later.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-gray">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Amazing Posts
          </h1>
          <p className="text-pinterest-gray">
            Share and explore beautiful content from our community
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-white rounded-lg pinterest-shadow overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-64 rounded-lg mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No posts yet
              </h2>
              <p className="text-pinterest-gray mb-4">
                Be the first to share something amazing!
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-pinterest-gray">
            <p>&copy; 2025 PinShare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
