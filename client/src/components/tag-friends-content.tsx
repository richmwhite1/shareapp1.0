import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Search, UserPlus } from "lucide-react";

interface Friend {
  id: number;
  username: string;
  name: string;
  profilePictureUrl?: string;
}

interface TagFriendsContentProps {
  postId: number;
  onClose: () => void;
}

export default function TagFriendsContent({ postId, onClose }: TagFriendsContentProps) {
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's friends
  const { data: friends = [], isLoading } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Filter friends based on search
  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tag friends mutation
  const tagMutation = useMutation({
    mutationFn: async (friendIds: number[]) => {
      const promises = friendIds.map(friendId =>
        fetch(`/api/posts/${postId}/tag-friend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ friendId }),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Friends tagged",
        description: `Tagged ${selectedFriends.length} friend(s) in this post`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to tag friends. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFriendToggle = (friendId: number) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleTagFriends = () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "No friends selected",
        description: "Please select at least one friend to tag",
        variant: "destructive",
      });
      return;
    }
    tagMutation.mutate(selectedFriends);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-300">Loading connections...</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-4 text-center">
        <UserPlus className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-300 mb-4">You don't have any connections yet.</p>
        <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search connections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-600 text-white"
        />
      </div>

      {/* Connections list */}
      <div className="max-h-64 overflow-y-auto mb-4">
        {filteredFriends.map((friend) => (
          <div key={friend.id} className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded">
            <Checkbox
              id={`friend-${friend.id}`}
              checked={selectedFriends.includes(friend.id)}
              onCheckedChange={() => handleFriendToggle(friend.id)}
            />
            <div className="flex items-center space-x-3 flex-1">
              {friend.profilePictureUrl ? (
                <img
                  src={friend.profilePictureUrl}
                  alt={friend.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {friend.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-white font-medium">{friend.name}</p>
                <p className="text-gray-400 text-sm">@{friend.username}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFriends.length === 0 && searchQuery && (
        <div className="text-center py-4">
          <p className="text-gray-400">No friends found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleTagFriends}
          disabled={selectedFriends.length === 0 || tagMutation.isPending}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          {tagMutation.isPending ? "Tagging..." : `Tag ${selectedFriends.length} Friend(s)`}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}