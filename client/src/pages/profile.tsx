import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Eye, Folder, User, Lock, Users, Globe, Plus, Settings, MoreHorizontal, UserPlus, Trash2, Camera, GripVertical, Edit3, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import PostCard from "@/components/post-card";

export default function Profile() {
  const { id: paramUserId } = useParams();
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'connections' | 'private'>('public');
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListPrivacy, setNewListPrivacy] = useState<'public' | 'connections' | 'private'>('public');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedListId, setDraggedListId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();

  // Get current user first
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/verify'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return null;
      return response.json();
    }
  });

  console.log('Profile page params:', { paramUserId, currentUser: currentUser?.user?.id });

  const profileUserId = paramUserId ? parseInt(paramUserId) : currentUser?.user?.id;
  const isOwnProfile = currentUser?.user?.id === profileUserId;

  console.log('Profile logic:', { profileUserId, isOwnProfile, paramUserId, currentUserId: currentUser?.user?.id });

  // iPhone-style long press handlers
  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, listId: number) => {
    console.log('Long press start triggered', { isOwnProfile, isEditMode, listId });
    if (!isOwnProfile || isEditMode) return;
    
    const timer = setTimeout(() => {
      console.log('Long press timer triggered - entering edit mode');
      setIsEditMode(true);
      setLongPressTimer(null);
      // Add haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 600);
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('Long press end triggered');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleListClick = (listId: number) => (e: React.MouseEvent) => {
    console.log('List click triggered', { isEditMode, listId });
    // If we're in edit mode, don't navigate
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Only navigate if there was no long press timer running
    if (!longPressTimer) {
      setLocation(`/list/${listId}`);
    }
  };

  // Context menu as fallback for right-click
  const handleContextMenu = (e: React.MouseEvent, listId: number) => {
    if (!isOwnProfile) return;
    e.preventDefault();
    console.log('Context menu triggered - entering edit mode');
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setIsDragging(false);
    setDraggedListId(null);
  };

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (listData: { name: string; description?: string; privacy: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(listData)
      });
      if (!response.ok) throw new Error('Failed to create list');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists/user', profileUserId] });
      setShowCreateListDialog(false);
      setNewListName('');
      setNewListDescription('');
      setNewListPrivacy('public');
      toast({ title: "List created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create list", variant: "destructive" });
    }
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to delete list');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists/user', profileUserId] });
      setShowDeleteDialog(false);
      setSelectedList(null);
      toast({ title: "List deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete list", variant: "destructive" });
    }
  });

  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/users/${profileUserId}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      return response.json();
    }
  });

  // Fetch user's lists
  const { data: lists } = useQuery({
    queryKey: ['/api/lists/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/lists/user/${profileUserId}`, {
        headers
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  if (userLoading || !userData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{userData?.name || userData?.username}</h1>
            {userData?.name && (
              <span className="text-gray-400 text-sm">@{userData?.username}</span>
            )}
          </div>
        </div>

        {/* Profile Section */}
        <div className="px-6 py-6">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={userData?.profilePictureUrl || ""} />
              <AvatarFallback className="bg-gray-800 text-white text-4xl">
                {userData?.name?.charAt(0) || userData?.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-3 px-4 bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-white">0</div>
              <div className="text-xs text-gray-400">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(lists) ? lists.length : 0}</div>
              <div className="text-xs text-gray-400">Lists</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">0</div>
              <div className="text-xs text-gray-400">Friends</div>
            </div>
          </div>
        </div>

        {/* Lists Section */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Lists</h3>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={exitEditMode}
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Done
                </Button>
              )}
              {isOwnProfile && !isEditMode && (
                <>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditMode(true)}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white text-xs px-2 py-1">
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New List</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="listName" className="text-gray-300">List Name *</Label>
                        <Input
                          id="listName"
                          placeholder="e.g., Travel Plans, Wishlist"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="listDescription" className="text-gray-300">Description (Optional)</Label>
                        <Textarea
                          id="listDescription"
                          placeholder="Describe this list..."
                          value={newListDescription}
                          onChange={(e) => setNewListDescription(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="listPrivacy" className="text-gray-300">Privacy</Label>
                        <Select value={newListPrivacy} onValueChange={(value: 'public' | 'connections' | 'private') => setNewListPrivacy(value)}>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-green-500" />
                                <span className="text-white">Public</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="connections">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-white">Friends Only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-gray-500" />
                                <span className="text-white">Private</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateListDialog(false)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (newListName.trim()) {
                            createListMutation.mutate({
                              name: newListName.trim(),
                              description: newListDescription.trim() || undefined,
                              privacy: newListPrivacy
                            });
                          }
                        }}
                        disabled={!newListName.trim() || createListMutation.isPending}
                        className="bg-pinterest-red hover:bg-red-700 text-white"
                      >
                        {createListMutation.isPending ? 'Creating...' : 'Create List'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Array.isArray(lists) ? lists.map((list: any) => {
              const recentPost = list.posts?.[0];
              const hasImage = recentPost?.primaryPhotoUrl || recentPost?.thumbnailUrl;
              
              return (
                <div
                  key={list.id}
                  className={`bg-gray-900 rounded-xl p-2 hover:bg-black transition-colors cursor-pointer relative ${
                    isEditMode ? 'animate-wiggle' : ''
                  }`}
                  onMouseDown={(e) => handleLongPressStart(e, list.id)}
                  onMouseUp={(e) => handleLongPressEnd(e)}
                  onMouseLeave={(e) => handleLongPressEnd(e)}
                  onTouchStart={(e) => handleLongPressStart(e, list.id)}
                  onTouchEnd={(e) => handleLongPressEnd(e)}
                  onContextMenu={(e) => handleContextMenu(e, list.id)}
                  onClick={handleListClick(list.id)}
                >
                  {/* iPhone-style delete button */}
                  {isEditMode && isOwnProfile && (
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center z-10 animate-pulse"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedList(list.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                  
                  <div className="w-full aspect-square rounded-lg mb-2 overflow-hidden relative">
                    {hasImage ? (
                      <img 
                        src={recentPost.primaryPhotoUrl || recentPost.thumbnailUrl} 
                        alt={list.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                        <Folder className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                    
                    {/* Privacy Indicator */}
                    {list.privacyLevel !== 'public' && (
                      <div className="absolute top-1 right-1">
                        <div className="bg-black/80 text-white px-1.5 py-0.5 rounded text-xs">
                          {list.privacyLevel === 'private' ? 'Private' : 'Friends'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-medium truncate flex-1">
                      {list.name}
                    </span>
                    {isOwnProfile && !isEditMode && (
                      <div className="ml-2 flex items-center gap-1">
                        {list.privacyLevel === 'public' && (
                          <Globe className="h-3 w-3 text-green-500" />
                        )}
                        {list.privacyLevel === 'connections' && (
                          <Users className="h-3 w-3 text-blue-500" />
                        )}
                        {list.privacyLevel === 'private' && (
                          <Lock className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center text-gray-400 py-8">
                {isOwnProfile ? "Create your first list!" : "No lists yet"}
              </div>
            )}
          </div>
        </div>
        
        <div className="h-20"></div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete List</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete this list? This action cannot be undone.
            </p>
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400 font-medium">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-400 mt-2 space-y-1">
                <li>• The list and all its contents</li>
                <li>• All posts saved to this list</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedList(null);
              }}
              disabled={deleteListMutation.isPending}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedList) {
                  deleteListMutation.mutate(selectedList);
                }
              }}
              disabled={deleteListMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteListMutation.isPending ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}