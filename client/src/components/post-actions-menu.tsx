import { useState } from 'react';
import { MoreHorizontal, Share2, Users, Repeat2, Bookmark, Flag, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PostActionsMenuProps {
  postId: number;
  postTitle: string;
  className?: string;
  actionType?: 'all' | 'tag' | 'repost' | 'save' | 'flag';
}

interface User {
  id: number;
  username: string;
  name: string;
  profilePictureUrl: string | null;
}

interface Category {
  id: number;
  name: string;
}

export function PostActionsMenu({ postId, postTitle, className, actionType = 'all' }: PostActionsMenuProps) {
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch friends for tagging (with recent tagging history)
  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends/recent-tags'],
    enabled: tagDialogOpen,
  });

  // Fetch categories for saving
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: saveDialogOpen,
  });

  // Tag friends mutation
  const tagFriendsMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await fetch(`/api/posts/${postId}/tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) throw new Error('Failed to tag friends');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Friends tagged successfully!' });
      setTagDialogOpen(false);
      setSelectedFriends([]);
    },
    onError: () => {
      toast({ title: 'Failed to tag friends', variant: 'destructive' });
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to repost');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Post reposted!' });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: () => {
      toast({ title: 'Failed to repost', variant: 'destructive' });
    },
  });

  // Save post mutation
  const savePostMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ categoryId }),
      });
      if (!response.ok) throw new Error('Failed to save post');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Post saved to list!' });
      setSaveDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: () => {
      toast({ title: 'Failed to save post', variant: 'destructive' });
    },
  });

  // Flag post mutation
  const flagPostMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/posts/${postId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to flag post');
      return response.json();
    },
    onSuccess: (data: { wasDeleted?: boolean }) => {
      if (data.wasDeleted) {
        toast({ title: 'Post has been removed due to multiple flags' });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        toast({ title: 'Post flagged for review' });
      }
      setFlagDialogOpen(false);
      setFlagReason('');
    },
    onError: () => {
      toast({ title: 'Failed to flag post', variant: 'destructive' });
    },
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: postTitle,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  const handleTagFriends = () => {
    setTagDialogOpen(true);
  };

  const handleRepost = () => {
    repostMutation.mutate();
  };

  const handleSave = () => {
    setSaveDialogOpen(true);
  };

  const handleFlag = () => {
    setFlagDialogOpen(true);
  };

  const toggleFriendSelection = (friendId: number) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const submitTags = () => {
    if (selectedFriends.length > 0) {
      tagFriendsMutation.mutate(selectedFriends);
    }
  };

  const submitSave = () => {
    if (selectedCategory) {
      savePostMutation.mutate(selectedCategory);
    }
  };

  const submitFlag = () => {
    if (flagReason.trim()) {
      flagPostMutation.mutate(flagReason.trim());
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Individual action buttons for specific actionTypes
  if (actionType === 'tag') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTagFriends}
          className={`text-gray-400 hover:text-blue-400 hover:bg-gray-700 ${className}`}
        >
          <Users className="h-4 w-4" />
        </Button>
        
        {/* Tag Friends Dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tag Friends</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => toggleFriendSelection(friend.id)}
                  >
                    <img
                      src={friend.profilePictureUrl || '/placeholder-avatar.png'}
                      alt={friend.name}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium">{friend.name}</div>
                      <div className="text-sm text-gray-500">@{friend.username}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitTags}
                  disabled={selectedFriends.length === 0 || tagFriendsMutation.isPending}
                >
                  Tag Selected ({selectedFriends.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (actionType === 'repost') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRepost}
        disabled={repostMutation.isPending}
        className={`text-gray-400 hover:text-green-400 hover:bg-gray-700 ${className}`}
      >
        <Repeat2 className="h-4 w-4" />
      </Button>
    );
  }

  if (actionType === 'save') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className={`text-gray-400 hover:text-yellow-400 hover:bg-gray-700 ${className}`}
        >
          <Bookmark className="h-4 w-4" />
        </Button>

        {/* Save Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save to Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 rounded cursor-pointer ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="font-medium">{category.name}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitSave}
                  disabled={!selectedCategory || savePostMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (actionType === 'flag') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFlag}
          className={`text-gray-400 hover:text-red-400 hover:bg-gray-700 ${className}`}
        >
          <Flag className="h-4 w-4" />
        </Button>

        {/* Flag Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Flag Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Reason for flagging..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitFlag}
                  disabled={!flagReason.trim() || flagPostMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Flag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default dropdown menu for 'all' or unspecified actionType
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTagFriends}>
            <Users className="h-4 w-4 mr-2" />
            Tag Connections
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRepost}>
            <Repeat2 className="h-4 w-4 mr-2" />
            Repost
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSave}>
            <Bookmark className="h-4 w-4 mr-2" />
            Save to List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFlag} className="text-red-600">
            <Flag className="h-4 w-4 mr-2" />
            Flag
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            if (confirm('Are you sure you want to delete this post?')) {
              console.log('Delete post:', postId);
            }
          }} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag Friends Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Friends</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={`flex items-center p-2 rounded cursor-pointer ${
                    selectedFriends.includes(friend.id)
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <img
                    src={friend.profilePictureUrl || '/placeholder-avatar.png'}
                    alt={friend.name}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <div>
                    <div className="font-medium">{friend.name}</div>
                    <div className="text-sm text-gray-500">@{friend.username}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitTags}
                disabled={selectedFriends.length === 0 || tagFriendsMutation.isPending}
              >
                Tag Selected ({selectedFriends.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save to List Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center p-3 rounded cursor-pointer border ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="font-medium">{category.name}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitSave}
                disabled={!selectedCategory || savePostMutation.isPending}
              >
                Save to List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Post Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flag Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Why are you flagging this post?
            </div>
            <Input
              placeholder="Optional: Reason for flagging..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              Posts with 2+ flags are automatically removed.
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitFlag}
                disabled={flagPostMutation.isPending}
              >
                Flag Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}