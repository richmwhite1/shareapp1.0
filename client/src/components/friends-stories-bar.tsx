import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Share } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import AuricField from "@/components/auric-field";
import type { User } from "@shared/schema";

interface FriendsStoriesBarProps {
  onSelectFeed: (type: 'public' | 'friend' | 'shared', friendId?: number) => void;
  activeFeed: string;
  currentFriendIndex: number;
  onNextFriend: () => void;
}

interface FriendWithPosts {
  user: User;
  hasRecentPosts: boolean;
}

export default function FriendsStoriesBar({ 
  onSelectFeed, 
  activeFeed, 
  currentFriendIndex, 
  onNextFriend 
}: FriendsStoriesBarProps) {
  const { isAuthenticated } = useAuth();

  // Get friends with recent posts
  const { data: friendsWithPosts = [] } = useQuery<FriendWithPosts[]>({
    queryKey: ['/api/friends/recent-posts'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const friendsWithRecentPosts = friendsWithPosts.filter(f => f.hasRecentPosts);

  const handlePublicClick = () => {
    onSelectFeed('public');
  };

  const handleSharedClick = () => {
    onSelectFeed('shared');
  };

  const handleFriendClick = (friendId: number, index: number) => {
    onSelectFeed('friend', friendId);
  };

  return (
    <div className="flex items-center overflow-x-auto px-4 py-2 bg-black border-b border-gray-800 space-x-3 w-full">
      {/* Public Feed Button */}
      <div className="flex flex-col items-center space-y-1 flex-shrink-0">
        <div
          className={`w-16 h-16 rounded-full bg-pinterest-red flex items-center justify-center cursor-pointer transition-all ${
            activeFeed === 'public' ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
          }`}
          onClick={handlePublicClick}
        >
          <span className="text-white text-xl font-bold">P</span>
        </div>
        <span className="text-xs text-gray-400 text-center">Public</span>
      </div>

      {/* Shared with You Button */}
      {isAuthenticated && (
        <div className="flex flex-col items-center space-y-1 flex-shrink-0">
          <div
            className={`w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer transition-all ${
              activeFeed === 'shared' ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
            }`}
            onClick={handleSharedClick}
          >
            <Share className="text-white w-6 h-6" />
          </div>
          <span className="text-xs text-gray-400 text-center">Shared</span>
        </div>
      )}

      {/* Friends with Recent Posts */}
      {friendsWithRecentPosts.map((friendWithPosts, index) => (
        <div key={friendWithPosts.user.id} className="flex flex-col items-center space-y-1 flex-shrink-0">
          <div
            className={`relative cursor-pointer transition-all ${
              activeFeed === friendWithPosts.user.id.toString() ? 'scale-110' : 'hover:scale-105'
            }`}
            onClick={() => handleFriendClick(friendWithPosts.user.id, index)}
          >
            {/* Story Ring */}
            <div className={`w-16 h-16 rounded-full p-0.5 ${
              activeFeed === friendWithPosts.user.id.toString() 
                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' 
                : 'bg-gradient-to-tr from-pinterest-red to-red-600'
            }`}>
              <div className="w-full h-full rounded-full bg-black p-0.5">
                <AuricField profileId={friendWithPosts.user.id} intensity={0.3}>
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={friendWithPosts.user.profilePictureUrl || undefined} 
                      alt={friendWithPosts.user.name}
                    />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {friendWithPosts.user.name?.charAt(0) || friendWithPosts.user.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </AuricField>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-400 text-center max-w-16 truncate">
            {friendWithPosts.user.name || friendWithPosts.user.username}
          </span>
        </div>
      ))}

      {/* Next Friend Button (only show when viewing a friend's feed) */}
      {activeFeed !== 'public' && friendsWithRecentPosts.length > 1 && (
        <Button
          onClick={onNextFriend}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronRight className="w-4 h-4" />
          Next
        </Button>
      )}

      {/* Connections Management Link */}
      {isAuthenticated && (
        <div className="flex flex-col items-center space-y-1 flex-shrink-0 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            onClick={() => {
              // Navigate to connections management
              window.location.href = '/friends';
            }}
          >
            <Users className="w-6 h-6" />
          </Button>
          <span className="text-xs text-gray-400 text-center">Connections</span>
        </div>
      )}
    </div>
  );
}