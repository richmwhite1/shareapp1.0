import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Eye, Folder, User, Lock, Users, Globe, Plus, Settings, MoreHorizontal, UserPlus, Trash2, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";


export default function Profile() {
  const { id: paramUserId } = useParams();
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [pressedList, setPressedList] = useState<number | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'connections' | 'private'>('public');
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [, setLocation] = useLocation();

  // Get current user first
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/verify'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Auth failed');
      const data = await response.json();
      return data.user;
    }
  });

  // Debug logging
  console.log('Profile page params:', { paramUserId, currentUser: currentUser?.id });

  // Determine which user profile to show - FIXED: Only use paramUserId if it exists
  const profileUserId = paramUserId ? parseInt(paramUserId) : (currentUser?.id || null);
  const isOwnProfile = !paramUserId || (profileUserId === currentUser?.id);

  console.log('Profile logic:', { profileUserId, isOwnProfile, paramUserId, currentUserId: currentUser?.id });

  // Fetch user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId
  });



  // Fetch user's posts
  const { data: posts } = useQuery({
    queryKey: ['/api/posts/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/posts/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch user's lists
  const { data: lists } = useQuery({
    queryKey: ['/api/lists/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/lists/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch total shares count
  const { data: totalShares = 0 } = useQuery({
    queryKey: ['/api/user/total-shares', profileUserId],
    enabled: !!profileUserId
  });

  // Fetch user's friends
  const { data: userFriends } = useQuery({
    queryKey: ['/api/friends/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/friends/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch current user's default privacy (only for own profile)
  const { data: privacyData } = useQuery({
    queryKey: ['/api/user', profileUserId, 'privacy'],
    enabled: isOwnProfile
  });

  useEffect(() => {
    if (privacyData && typeof privacyData === 'object' && privacyData !== null && 'defaultPrivacy' in privacyData) {
      setDefaultPrivacy((privacyData as any).defaultPrivacy);
    }
  }, [privacyData]);

  const totalPosts = Array.isArray(posts) ? posts.length : 0;

  const updatePrivacyMutation = useMutation({
    mutationFn: async (privacy: 'public' | 'connections' | 'private') => {
      const response = await fetch(`/api/user/${profileUserId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPrivacy: privacy })
      });
      if (!response.ok) throw new Error('Failed to update privacy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user', profileUserId, 'privacy'] });
      toast({ title: "Privacy updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update privacy", variant: "destructive" });
    }
  });

  const handlePrivacyToggle = () => {
    const newPrivacy = defaultPrivacy === 'public' ? 'private' : 'public';
    setDefaultPrivacy(newPrivacy);
    updatePrivacyMutation.mutate(newPrivacy);
  };

  const handleMouseDown = (listId: number) => {
    setPressedList(listId);
    const timer = setTimeout(() => {
      setSelectedList(listId);
      setPressedList(null);
    }, 500);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setPressedList(null);
  };

  const handleMouseLeave = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setPressedList(null);
  };

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${profileUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Deleted",
        description: "Your profile and all associated data have been permanently deleted."
      });
      // Clear local storage and redirect to auth
      localStorage.removeItem('token');
      setLocation('/auth');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile",
        variant: "destructive"
      });
    }
  });

  const handleDeleteProfile = () => {
    deleteProfileMutation.mutate();
    setShowDeleteDialog(false);
  };

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
            <h1 className="text-xl font-bold">{(userData as any)?.name || (userData as any)?.username}</h1>
            {(userData as any)?.name && (
              <span className="text-gray-400 text-sm">@{(userData as any)?.username}</span>
            )}
          </div>
          {isOwnProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border">
                <DropdownMenuItem 
                  onClick={() => setShowPrivacyControls(!showPrivacyControls)}
                  className="text-foreground hover:bg-accent"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Privacy Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Profile Picture - Large Square Tile */}
        <div className="px-6 py-6">
          <div className="mb-6">
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-800">
              <img 
                src={(userData as any)?.profilePictureUrl || ""} 
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center bg-gray-800 text-white text-6xl font-bold">
                {(userData as any)?.name?.charAt(0) || (userData as any)?.username?.charAt(0)}
              </div>
              
              {/* Upload Photo Button - Only for own profile */}
              {isOwnProfile && (
                <div className="absolute top-2 right-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 border-0 text-white"
                    onClick={() => {
                      // Create file input and trigger click
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(`/api/users/${profileUserId}/upload-profile-picture`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` },
                              body: formData
                            });
                            if (response.ok) {
                              // Invalidate multiple query keys to ensure profile picture updates everywhere
                              queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
                              queryClient.invalidateQueries({ queryKey: ['/api/auth/verify'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                              
                              // Force a page refresh to ensure the image loads with new URL
                              setTimeout(() => {
                                window.location.reload();
                              }, 500);
                              
                              toast({ title: "Profile picture updated successfully" });
                            } else {
                              toast({ title: "Failed to upload image", variant: "destructive" });
                            }
                          } catch (error) {
                            toast({ title: "Failed to upload image", variant: "destructive" });
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mt-4">
              {/* Share Profile Button - Always visible but discreet */}
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white text-xs px-3 py-1 h-7"
                onClick={() => {
                  const profileUrl = `${window.location.origin}/profile/${profileUserId}`;
                  navigator.clipboard.writeText(profileUrl);
                  toast({ title: "Profile link copied to clipboard" });
                }}
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
              
              {/* Friends Button - Bigger icon */}
              <Link href="/friends">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white text-xs px-3 py-1 h-7"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Friends
                </Button>
              </Link>
            </div>
            
            {(userData as any)?.bio && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-300">{(userData as any)?.bio}</p>
              </div>
            )}
          </div>

          {/* Discreet Privacy Toggle - Only for own profile */}
          {isOwnProfile && (
            <div className="flex items-center justify-center gap-2 mb-4 opacity-60">
              {defaultPrivacy === 'public' ? (
                <Globe className="h-3 w-3 text-gray-400" />
              ) : (
                <Lock className="h-3 w-3 text-gray-400" />
              )}
              <Switch
                checked={defaultPrivacy === 'public'}
                onCheckedChange={handlePrivacyToggle}
                className="scale-75"
              />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 py-3 px-4 bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{totalPosts}</div>
              <div className="text-xs text-gray-400">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(lists) ? lists.length : 0}</div>
              <div className="text-xs text-gray-400">Lists</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(userFriends) ? userFriends.length : 0}</div>
              <div className="text-xs text-gray-400">Friends</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{totalShares || 0}</div>
              <div className="text-xs text-gray-400">Shares</div>
            </div>
          </div>
        </div>



        {/* Lists Section */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Lists</h3>
            {isOwnProfile && (
              <Link href="/create-list">
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white text-xs px-2 py-1">
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Array.isArray(lists) ? lists.map((list: any) => {
              const recentPost = list.posts?.[0];
              const hasImage = recentPost?.primaryPhotoUrl || recentPost?.thumbnailUrl;
              
              return (
                <Link key={list.id} href={`/list/${list.id}`}>
                  <div className="bg-gray-900 rounded-xl p-2 hover:bg-black transition-colors">
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
                      {isOwnProfile && (
                        <div className="ml-2">
                          {list.privacyLevel === 'public' && (
                            <Globe className="h-3 w-3 text-green-500" />
                          )}
                          {list.privacyLevel === 'connections' && (
                            <Users className="h-3 w-3 text-blue-500" />
                          )}
                          {list.privacyLevel === 'private' && !list.collaborators?.length && (
                            <Eye className="h-3 w-3 text-gray-500" />
                          )}
                          {list.privacyLevel === 'private' && list.collaborators?.length > 0 && (
                            <User className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            }) : null}
          </div>
        </div>

        {/* Friends Section */}
        {Array.isArray(userFriends) && userFriends.length > 0 && (
          <div className="px-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Friends</h3>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {userFriends.slice(0, 10).map((friend: any) => (
                <Link key={friend.id} href={`/profile/${friend.id}`}>
                  <div className="flex-shrink-0 text-center">
                    <Avatar className="w-20 h-20 mx-auto mb-2">
                      <AvatarImage src={friend.profilePictureUrl || ""} />
                      <AvatarFallback className="bg-gray-800 text-white text-xl">
                        {friend.name?.charAt(0) || friend.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-white truncate w-20">
                      {friend.name || friend.username}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <div className="h-20"></div>
      </div>

      {/* Delete Profile Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground mb-4">
              Are you sure you want to delete your profile? This action cannot be undone.
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                This will permanently delete:
              </p>
              <ul className="text-sm text-destructive mt-2 space-y-1">
                <li>• Your profile and account</li>
                <li>• All your posts and content</li>
                <li>• All your lists and collections</li>
                <li>• All connections and friendships</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleteProfileMutation.isPending}
            >
              {deleteProfileMutation.isPending ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}