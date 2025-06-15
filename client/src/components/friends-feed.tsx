import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState } from "react";

interface FriendsScrollFeedProps {
  onFriendSelect?: (friendId: number) => void;
}

export default function FriendsScrollFeed({ onFriendSelect }: FriendsScrollFeedProps) {
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);

  // Fetch friends list
  const { data: friends } = useQuery({
    queryKey: ['/api/friends'],
    select: (data: any) => data || [],
  });

  const handleFriendClick = (friendId: number) => {
    setSelectedFriend(friendId);
    if (onFriendSelect) {
      onFriendSelect(friendId);
    }
  };

  return (
    <div className="bg-gray-900 p-4">
      <div className="flex overflow-x-auto space-x-4 pb-2">
        {/* Public feed option */}
        <div 
          className={`flex flex-col items-center cursor-pointer min-w-[80px] ${
            selectedFriend === null ? 'opacity-100' : 'opacity-60'
          }`}
          onClick={() => {
            setSelectedFriend(null);
            if (onFriendSelect) onFriendSelect(0);
          }}
        >
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-yellow-400">
              <AvatarFallback className="bg-gray-700 text-yellow-400 font-bold">
                P
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs text-yellow-400 mt-1 text-center">Public</span>
        </div>

        {/* Friends list */}
        {Array.isArray(friends) && friends.map((friend: any) => (
          <div 
            key={friend.id}
            className={`flex flex-col items-center cursor-pointer min-w-[80px] ${
              selectedFriend === friend.id ? 'opacity-100' : 'opacity-60'
            }`}
            onClick={() => handleFriendClick(friend.id)}
          >
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-gray-600 hover:border-yellow-400 transition-colors">
                <AvatarImage src={friend.profilePictureUrl || undefined} />
                <AvatarFallback className="bg-gray-700 text-white">
                  {friend.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* New posts indicator */}
              {friend.hasNewPosts && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-red-500 text-white rounded-full p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </div>
            <span className="text-xs text-yellow-400 mt-1 text-center truncate max-w-[60px]">
              {friend.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}