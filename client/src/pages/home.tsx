import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import PostCard from "@/components/post-card";
import FriendsScrollFeed from "@/components/friends-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import type { PostWithUser } from "@shared/schema";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [feedType, setFeedType] = useState<'public' | 'friends' | 'tagged'>('public');
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);

  // Dynamic query based on feed type
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['/api/posts', feedType, selectedFriend],
    queryFn: async () => {
      let url = '/api/posts';
      
      if (feedType === 'friends' && selectedFriend) {
        url = `/api/posts/user/${selectedFriend}`;
      } else if (feedType === 'friends' && !selectedFriend) {
        url = '/api/friends/posts';
      } else if (feedType === 'tagged') {
        url = '/api/tagged-posts';
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json() as Promise<PostWithUser[]>;
    },
    enabled: feedType !== 'friends' || isAuthenticated,
  });

  const handleFriendSelect = (friendId: number) => {
    setSelectedFriend(friendId === 0 ? null : friendId);
    setFeedType(friendId === 0 ? 'public' : 'friends');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-400">
                Failed to load posts. Please try again later.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      {/* Friends Feed Scroll */}
      {isAuthenticated && (
        <FriendsScrollFeed onFriendSelect={handleFriendSelect} />
      )}
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Feed Type Selector */}
        {isAuthenticated && (
          <div className="flex space-x-2 mb-6">
            <Button
              variant={feedType === 'public' ? 'default' : 'outline'}
              onClick={() => {
                setFeedType('public');
                setSelectedFriend(null);
              }}
              className={feedType === 'public' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white border-gray-600'}
            >
              Public Feed
            </Button>
            <Button
              variant={feedType === 'friends' ? 'default' : 'outline'}
              onClick={() => {
                setFeedType('friends');
                setSelectedFriend(null);
              }}
              className={feedType === 'friends' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white border-gray-600'}
            >
              Friends
            </Button>
            <Button
              variant={feedType === 'tagged' ? 'default' : 'outline'}
              onClick={() => setFeedType('tagged')}
              className={feedType === 'tagged' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white border-gray-600'}
            >
              Tagged Posts
            </Button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-gray-800 border-gray-700 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Skeleton className="w-10 h-10 rounded-full bg-gray-700" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                      <Skeleton className="h-3 w-24 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-64 rounded-lg mb-4 bg-gray-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                  <Skeleton className="h-4 w-3/4 bg-gray-700" />
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
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                {feedType === 'friends' ? 'No friend posts yet' : 
                 feedType === 'tagged' ? 'No tagged posts yet' : 'No posts yet'}
              </h2>
              <p className="text-gray-400 mb-4">
                {feedType === 'friends' ? 'Connect with friends to see their amazing content!' :
                 feedType === 'tagged' ? 'No one has tagged you in posts yet.' :
                 'Be the first to share something amazing!'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
