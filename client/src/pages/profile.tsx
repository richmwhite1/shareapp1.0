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
  const [isEditMode, setIsEditMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();

  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    enabled: true
  });

  // If no ID in URL, use current user's ID
  const profileUserId = paramUserId ? parseInt(paramUserId) : (currentUser as any)?.user?.id;

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId
  }) as { data: any, isLoading: boolean };

  const { data: lists, refetch: refetchLists } = useQuery({
    queryKey: ['/api/lists'],
    enabled: !!profileUserId
  });

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts/user', profileUserId],
    enabled: !!profileUserId
  });

  const currentUserId = (currentUser as any)?.user?.id || (currentUser as any)?.id;
  const isOwnProfile = currentUserId === profileUserId;

  console.log('Profile logic:', { profileUserId, isOwnProfile, paramUserId, currentUserId });

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
  };

  const createListMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      privacy: 'public' | 'connections' | 'private';
    }) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create list');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "List created successfully!",
      });
      setShowCreateListDialog(false);
      setNewListName('');
      setNewListDescription('');
      setNewListPrivacy('public');
      refetchLists();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create list",
        variant: "destructive",
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete list');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "List deleted successfully",
      });
      refetchLists();
      setIsEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete list",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  if (!profileUserId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Invalid profile ID</div>
      </div>
    );
  }

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
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrivacyControls(true)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 py-6">
          {/* Large Profile Picture Tile */}
          <div className="mb-6">
            <div className="relative aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-800">
              {userData?.profilePictureUrl ? (
                <img 
                  src={userData.profilePictureUrl} 
                  alt={userData?.name || userData?.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-6xl font-bold">
                  {(userData?.name || userData?.username)?.[0]?.toUpperCase()}
                </div>
              )}
              {/* Camera Icon for Upload - Only for own profile */}
              {isOwnProfile && (
                <div className="absolute top-2 right-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Handle profile picture upload
                        const formData = new FormData();
                        formData.append('profilePicture', file);
                        
                        apiRequest('POST', '/api/upload-profile-picture', formData)
                          .then(() => {
                            toast({
                              title: "Success",
                              description: "Profile picture updated!",
                            });
                            queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
                          })
                          .catch(() => {
                            toast({
                              title: "Error",
                              description: "Failed to update profile picture",
                              variant: "destructive",
                            });
                          });
                      }
                    }}
                    className="hidden"
                    id="profile-picture-upload"
                  />
                  <label htmlFor="profile-picture-upload" className="cursor-pointer">
                    <div className="bg-black/60 hover:bg-black/80 rounded-full p-2 transition-all">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            <p className="text-gray-300 text-sm leading-relaxed text-center">
              {userData?.bio || "No bio yet"}
            </p>
          </div>



          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-3 px-4 bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(userPosts) ? userPosts.length : 0}</div>
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
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditMode(true)}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
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
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="listName" className="text-white text-sm font-medium">
                            List Name
                          </Label>
                          <Input
                            id="listName"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="mt-2 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            placeholder="Enter list name..."
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <Label htmlFor="listDescription" className="text-white text-sm font-medium">
                            Description (Optional)
                          </Label>
                          <Textarea
                            id="listDescription"
                            value={newListDescription}
                            onChange={(e) => setNewListDescription(e.target.value)}
                            className="mt-2 bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
                            placeholder="What's this list about?"
                            rows={3}
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <Label className="text-white text-sm font-medium">Privacy</Label>
                          <Select value={newListPrivacy} onValueChange={(value: 'public' | 'connections' | 'private') => setNewListPrivacy(value)}>
                            <SelectTrigger className="mt-2 bg-gray-800 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
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
                </div>
              )}
            </div>
          </div>
          
          {/* Edit Mode Instructions */}
          {isEditMode && isOwnProfile && (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm text-center">
                Edit mode active - Click the red X to delete lists, or click "Done" to finish
              </p>
            </div>
          )}

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
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteListMutation.mutate(list.id);
                      }}
                      className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}

                  {/* List content */}
                  <div className="aspect-square bg-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {hasImage ? (
                      <img 
                        src={recentPost.primaryPhotoUrl || recentPost.thumbnailUrl} 
                        alt="List preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Folder className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-white truncate">{list.name}</h4>
                  <p className="text-xs text-gray-400">{list.postCount || 0} posts</p>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center py-8">
                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No lists yet</p>
                {isOwnProfile && (
                  <p className="text-gray-500 text-sm mt-1">Create your first list to get started</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Posts</h3>
          </div>
          
          {postsLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Loading posts...</div>
            </div>
          ) : Array.isArray(userPosts) && userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400">No posts yet</div>
              {isOwnProfile && (
                <p className="text-gray-500 text-sm mt-1">Share your first post to get started</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showPrivacyControls} onOpenChange={setShowPrivacyControls}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Default Privacy Settings */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Default Privacy for New Posts</Label>
              <Select value={defaultPrivacy} onValueChange={(value: 'public' | 'connections' | 'private') => setDefaultPrivacy(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <span>Public - Anyone can see</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="connections">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-400" />
                      <span>Connections Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-red-400" />
                      <span>Private - Only you</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-700 pt-6">
              <h4 className="text-red-400 font-medium mb-4">Danger Zone</h4>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowPrivacyControls(false);
                  setShowDeleteDialog(true);
                }}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Profile
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPrivacyControls(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Save privacy settings
                apiRequest('PUT', `/api/users/${profileUserId}/privacy`, {
                  defaultPrivacy
                })
                  .then(() => {
                    toast({
                      title: "Success",
                      description: "Privacy settings updated!",
                    });
                    setShowPrivacyControls(false);
                  })
                  .catch(() => {
                    toast({
                      title: "Error", 
                      description: "Failed to update privacy settings",
                      variant: "destructive",
                    });
                  });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Profile Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete your profile? This action cannot be undone.
            </p>
            <p className="text-red-400 font-medium">
              All your posts, lists, and data will be permanently deleted.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                apiRequest('DELETE', `/api/users/${profileUserId}`)
                  .then(() => {
                    toast({
                      title: "Profile Deleted",
                      description: "Your profile has been permanently deleted",
                    });
                    // Redirect to login or home
                    setLocation('/');
                  })
                  .catch(() => {
                    toast({
                      title: "Error",
                      description: "Failed to delete profile",
                      variant: "destructive",
                    });
                  });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}