import { useQuery } from "@tanstack/react-query";
import PostCard from "@/components/post-card";
import { Stories } from "@/components/Stories";
import ListInvitationNotifications from "@/components/list-invitation-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";
import type { PostWithUser } from "@shared/schema";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [feedType, setFeedType] = useState<'public' | 'friend' | 'shared'>('public');
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [currentFriendIndex, setCurrentFriendIndex] = useState(0);
  const [friendsWithPosts, setFriendsWithPosts] = useState<any[]>([]);
  const [viewedStoryUsers, setViewedStoryUsers] = useState<Set<number>>(new Set());

  // Reset to public feed when home page loads
  useEffect(() => {
    if (location === '/') {
      setFeedType('public');
      setSelectedFriend(null);
      setCurrentFriendIndex(0);
    }
  }, [location]);

  // Get friends with recent posts for navigation
  const { data: friendsData = [] } = useQuery<Array<{ user: any; hasRecentPosts: boolean }>>({
    queryKey: ['/api/friends/recent-posts'],
    enabled: isAuthenticated,
  });

  // Dynamic query based on feed type
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['/api/posts', feedType, selectedFriend],
    queryFn: async () => {
      let url = '/api/posts';
      
      if (feedType === 'friend' && selectedFriend) {
        // Get posts from specific friend within last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        url = `/api/posts/user/${selectedFriend}?since=${threeDaysAgo.toISOString()}`;
      } else if (feedType === 'shared') {
        url = '/api/shared-with-me';
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json() as Promise<PostWithUser[]>;
    },
    enabled: feedType !== 'shared' || isAuthenticated,
  });

  const handleSelectFeed = (type: 'public' | 'friend' | 'shared', friendId?: number) => {
    setFeedType(type);
    setSelectedFriend(friendId || null);
    
    if (type === 'friend' && friendId && friendsData.length > 0) {
      const friendIndex = friendsData.findIndex((f: any) => f.user.id === friendId);
      setCurrentFriendIndex(friendIndex);
    } else {
      setCurrentFriendIndex(0);
    }
  };

  const handleNextFriend = () => {
    const friendsWithRecentPosts = friendsData.filter((f: any) => f.hasRecentPosts);
    
    if (currentFriendIndex < friendsWithRecentPosts.length - 1) {
      const nextIndex = currentFriendIndex + 1;
      const nextFriend = friendsWithRecentPosts[nextIndex];
      setCurrentFriendIndex(nextIndex);
      setSelectedFriend(nextFriend.user.id);
    } else {
      // Return to public feed when we've seen all friends
      setFeedType('public');
      setSelectedFriend(null);
      setCurrentFriendIndex(0);
    }
  };

  const handleStoryClick = (userId: number) => {
    handleSelectFeed('friend', userId);
  };

  const handleMarkStoryViewed = (userId: number) => {
    setViewedStoryUsers(prev => new Set([...Array.from(prev), userId]));
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
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
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* Stories */}
      {isAuthenticated && (
        <Stories 
          onSelectUser={handleStoryClick}
          viewedUsers={viewedStoryUsers}
          onMarkAsViewed={handleMarkStoryViewed}
        />
      )}
      
      <main className="w-full">
        {/* List Invitation Notifications */}
        {isAuthenticated && <ListInvitationNotifications />}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 border-0 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Skeleton className="w-10 h-10 rounded-full bg-gray-700" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                      <Skeleton className="h-3 w-24 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-80 mb-0 bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-0">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                {feedType === 'friend' ? 'No recent posts from this friend' : 'No posts yet'}
              </h2>
              <p className="text-gray-400 mb-4">
                {feedType === 'friend' ? 'Your friend hasn\'t posted anything in the last 3 days.' :
                 'Be the first to share something amazing!'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
