import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Search, UserPlus } from 'lucide-react';

interface FriendSelectorProps {
  onSelectionChange: (selectedIds: number[]) => void;
  initialSelection?: number[];
}

export default function FriendSelector({ onSelectionChange, initialSelection = [] }: FriendSelectorProps) {
  const [selectedFriends, setSelectedFriends] = useState<number[]>(initialSelection);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch friends
  const { data: friends, isLoading } = useQuery({
    queryKey: ['/api/friends'],
    select: (data: any) => {
      if (!Array.isArray(data)) return [];
      return data; // Friends API returns simple User[] array
    },
  });

  // Filter friends based on search query
  const filteredFriends = friends?.filter((friend: any) => {
    return friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           friend.name?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Update parent when selection changes
  useEffect(() => {
    onSelectionChange(selectedFriends);
  }, [selectedFriends, onSelectionChange]);

  const toggleFriend = (friendId: number) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Loading connections...</p>
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="p-4 text-center">
        <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">You don't have any connections yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search connections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Friends list */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredFriends.map((friend: any) => {
          const isSelected = selectedFriends.includes(friend.id);
          
          return (
            <div
              key={friend.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => toggleFriend(friend.id)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.profilePictureUrl || undefined} />
                  <AvatarFallback>
                    {friend.name?.charAt(0) || friend.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{friend.name || friend.username}</div>
                  <div className="text-sm text-muted-foreground">@{friend.username}</div>
                </div>
              </div>
              {isSelected && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          );
        })}
      </div>

      {filteredFriends.length === 0 && searchQuery && (
        <div className="text-center text-muted-foreground py-4">
          No connections found matching "{searchQuery}"
        </div>
      )}

      {/* Selection summary */}
      {selectedFriends.length > 0 && (
        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedFriends.length} connection{selectedFriends.length === 1 ? '' : 's'} selected
          </div>
        </div>
      )}
    </div>
  );
}