import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Folder, Image, Plus, Users, Lock, Trash2, Share2, Camera, Globe, X } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import PostCard from "@/components/post-card";
import EnergyRating from "@/components/energy-rating";
import AuricField from "@/components/auric-field";
import ListCollaboratorAvatars from "@/components/list-collaborator-avatars";
import type { User, PostWithUser, ListWithPosts } from "@shared/schema";

interface UserResponse {
  id: number;
  username: string;
  name: string;
  profilePictureUrl?: string;
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'connections'>('public');
  const [auraRating, setAuraRating] = useState<number>(3);
  const [isManagingLists, setIsManagingLists] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [draggedList, setDraggedList] = useState<number | null>(null);
  const [draggedOverList, setDraggedOverList] = useState<number | null>(null);
  const [autoExitTimer, setAutoExitTimer] = useState<NodeJS.Timeout | null>(null);
  const [sortedLists, setSortedLists] = useState<ListWithPosts[]>([]);
  
  // If there's an ID param, we're viewing another user's profile
  const profileUserId = params.id ? parseInt(params.id) : user?.id;
  const isOwnProfile = !params.id || (user && parseInt(params.id) === user.id);

  // Fetch profile user data if viewing another user's profile
  const { data: profileUser } = useQuery<UserResponse>({
    queryKey: ['/api/users', profileUserId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !isOwnProfile && !!profileUserId,
  });

  const displayUser = isOwnProfile ? user : profileUser;

  const { data: lists = [], isLoading: listsLoading } = useQuery<ListWithPosts[]>({
    queryKey: [`/api/lists/user/${profileUserId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileUserId,
  });

  const { data: userPosts = [], isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: [`/api/posts/user/${profileUserId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileUserId,
  });

  // Fetch total shares for all user posts
  const { data: totalShares = 0 } = useQuery<number>({
    queryKey: [`/api/user/total-shares/${profileUserId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileUserId,
  });

  // Fetch user's friends
  const { data: userFriends = [] } = useQuery<User[]>({
    queryKey: [`/api/friends`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileUserId,
  });

  // Fetch user's current privacy settings
  const { data: userPrivacy } = useQuery<{ defaultPrivacy: string }>({
    queryKey: [`/api/user/${user?.id}/privacy`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(isOwnProfile && user?.id),
  });

  // Update privacy state when data loads
  if (userPrivacy?.defaultPrivacy && defaultPrivacy !== userPrivacy.defaultPrivacy) {
    setDefaultPrivacy(userPrivacy.defaultPrivacy as 'public' | 'connections');
  }

  // Fetch user's average aura rating
  const { data: auraData } = useQuery<{ average: number; count: number }>({
    queryKey: [`/api/users/${profileUserId}/aura/stats`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!profileUserId,
  });

  // Share profile mutation
  const shareProfileMutation = useMutation({
    mutationFn: async () => {
      // Generate shareable link and copy to clipboard
      const profileUrl = `${window.location.origin}/profile/${displayUser?.id}`;
      await navigator.clipboard.writeText(profileUrl);
      return { url: profileUrl };
    },
    onSuccess: (data) => {
      toast({
        title: "Profile link copied",
        description: "Profile link has been copied to your clipboard!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Share failed",
        description: "Failed to copy profile link to clipboard",
        variant: "destructive",
      });
    },
  });

  // Privacy setting mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (privacy: 'public' | 'connections') => {
      return apiRequest('PUT', `/api/user/privacy`, { defaultPrivacy: privacy });
    },
    onSuccess: () => {
      toast({
        title: "Privacy setting updated",
        description: "Your default privacy preference has been saved.",
      });
      // Invalidate privacy query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/privacy`] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update privacy setting",
        variant: "destructive",
      });
      // Reset the UI state on error
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/privacy`] });
    },
  });

  // Aura rating mutation
  const rateUserMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest('POST', `/api/users/${profileUserId}/aura`, { rating });
    },
    onSuccess: () => {
      toast({
        title: "Rating submitted",
        description: "Your aura rating has been recorded!",
      });
      // Invalidate aura stats to refresh the average
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/aura/stats`] });
    },
    onError: () => {
      toast({
        title: "Rating failed",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  // Profile picture upload mutation
  const uploadProfilePicMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      return apiRequest('POST', `/api/user/profile-picture`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully!",
      });
      // Invalidate auth query to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/verify'] });
      setIsUploadingProfilePic(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
      setIsUploadingProfilePic(false);
    },
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest('DELETE', `/api/lists/${listId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      toast({
        title: "List deleted",
        description: "List has been deleted and posts moved to General.",
      });
    },
  });

  const handleDeleteList = (listId: number, listName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    if (confirm(`Are you sure you want to delete the "${listName}" list? All posts will be moved to General.`)) {
      deleteListMutation.mutate(listId);
    }
  };

  const handleShareProfile = () => {
    shareProfileMutation.mutate();
  };

  const handlePrivacyChange = (privacy: 'public' | 'connections') => {
    setDefaultPrivacy(privacy);
    updatePrivacyMutation.mutate(privacy);
  };

  const handleAuraRating = (rating: number) => {
    setAuraRating(rating);
    rateUserMutation.mutate(rating);
  };

  // Initialize sorted lists when lists data changes
  useEffect(() => {
    if (lists && lists.length > 0) {
      setSortedLists([...lists]);
    }
  }, [lists]);

  // Long press handlers for list management
  const handleMouseDown = (listId: number) => {
    if (!isOwnProfile) return;
    
    const timer = setTimeout(() => {
      enterManagingMode();
    }, 500); // 500ms for long press
    
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const enterManagingMode = () => {
    setIsManagingLists(true);
    startAutoExitTimer();
  };

  const startAutoExitTimer = () => {
    if (autoExitTimer) {
      clearTimeout(autoExitTimer);
    }
    const timer = setTimeout(() => {
      exitManagingMode();
    }, 10000); // 10 seconds auto-exit
    setAutoExitTimer(timer);
  };

  const exitManagingMode = () => {
    setIsManagingLists(false);
    setDraggedList(null);
    setDraggedOverList(null);
    if (autoExitTimer) {
      clearTimeout(autoExitTimer);
      setAutoExitTimer(null);
    }
  };

  // Drag and drop handlers with proper reordering
  const handleDragStart = (e: React.DragEvent, listId: number) => {
    setDraggedList(listId);
    e.dataTransfer.effectAllowed = 'move';
    startAutoExitTimer(); // Reset timer on interaction
  };

  const handleDragOver = (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedList || draggedList === targetListId || draggedOverList === targetListId) {
      return;
    }

    // Real-time reordering while dragging
    const newSortedLists = [...sortedLists];
    const draggedIndex = newSortedLists.findIndex(list => list.id === draggedList);
    const targetIndex = newSortedLists.findIndex(list => list.id === targetListId);

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      const [draggedItem] = newSortedLists.splice(draggedIndex, 1);
      newSortedLists.splice(targetIndex, 0, draggedItem);
      setSortedLists(newSortedLists);
      setDraggedOverList(targetListId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverList(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    setDraggedList(null);
    setDraggedOverList(null);
    startAutoExitTimer(); // Reset timer after reorder
  };

  const handleDragEnd = () => {
    setDraggedList(null);
    setDraggedOverList(null);
  };

  // Get aura color based on rating
  const getAuraColor = (rating: number) => {
    if (rating >= 4.5) return 'border-yellow-400'; // Gold
    if (rating >= 4.0) return 'border-green-400'; // Green
    if (rating >= 3.5) return 'border-blue-400'; // Blue
    if (rating >= 3.0) return 'border-purple-400'; // Purple
    if (rating >= 2.5) return 'border-orange-400'; // Orange
    return 'border-red-400'; // Red
  };

  // Handle file selection for profile picture
  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingProfilePic(true);
      uploadProfilePicMutation.mutate(file);
    }
  };

  // Only require authentication when viewing your own profile (no ID parameter)
  if (isOwnProfile && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 bg-card border-border">
            <p className="text-foreground text-center">Please sign in to view your profile</p>
          </Card>
        </div>
      </div>
    );
  }

  if (listsLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-foreground">Loading your profile...</div>
        </div>
      </div>
    );
  }

  const totalPosts = userPosts?.length || 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full">
        {/* Large Profile Picture with Aura Border */}
        <div className="relative">
          <div className={`w-full h-96 bg-gray-900 rounded-b-3xl overflow-hidden border-4 ${getAuraColor(auraData?.average || 4)}`}>
            {displayUser?.profilePictureUrl ? (
              <img 
                src={displayUser.profilePictureUrl} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-6xl font-bold text-white">
                  {displayUser?.name?.charAt(0) || displayUser?.username?.charAt(0) || "U"}
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            {/* Share profile button */}
            <button
              onClick={handleShareProfile}
              disabled={shareProfileMutation.isPending}
              className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center border-2 border-white/20 hover:bg-black/70 transition-colors disabled:opacity-50 backdrop-blur-sm"
            >
              {shareProfileMutation.isPending ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 className="h-6 w-6 text-white" />
              )}
            </button>

            {/* Upload button - only show for own profile */}
            {isOwnProfile && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingProfilePic}
                  className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center border-2 border-white/20 hover:bg-black/70 transition-colors disabled:opacity-50 backdrop-blur-sm"
                >
                  {isUploadingProfilePic ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
          
          {/* Profile Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              {displayUser?.name || displayUser?.username}
            </h1>
            <p className="text-gray-300">@{displayUser?.username}</p>
          </div>
        </div>

        {/* Profile Settings Toggle - Only for own profile */}
        {isOwnProfile && (
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Connection Privacy</h3>
                <p className="text-gray-400 text-sm">Default privacy for new posts</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input 
                    type="radio" 
                    name="defaultPrivacy" 
                    value="public" 
                    className="text-blue-600"
                    checked={defaultPrivacy === 'public'}
                    onChange={() => handlePrivacyChange('public')}
                  />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input 
                    type="radio" 
                    name="defaultPrivacy" 
                    value="connections" 
                    className="text-blue-600"
                    checked={defaultPrivacy === 'connections'}
                    onChange={() => handlePrivacyChange('connections')}
                  />
                  Connections Only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Stats - More discreet */}
        <div className="px-4 py-2 bg-gray-900/50 mx-4 rounded mt-4 relative z-10 mb-4">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-sm font-medium text-white">{totalPosts}</div>
              <div className="text-xs text-gray-500">Posts</div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{lists?.length || 0}</div>
              <div className="text-xs text-gray-500">Lists</div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{userFriends?.length || 0}</div>
              <div className="text-xs text-gray-500">Friends</div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{totalShares}</div>
              <div className="text-xs text-gray-500">Shares</div>
            </div>
          </div>
        </div>

        {/* Aura Rating Section - Only show when viewing other users */}
        {!isOwnProfile && (
          <div className="px-6 py-4 bg-gray-800 mx-4 rounded-lg mb-6">
            <EnergyRating profileId={profileUserId} className="w-full" />
          </div>
        )}

        <div className="space-y-6">
          {/* Lists Section */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Lists</h2>
              <span className="text-sm text-gray-400">{lists?.length || 0} lists</span>
            </div>
            
            {/* Exit Management Mode Button */}
            {isManagingLists && (
              <div className="mb-4 flex justify-end">
                <Button 
                  onClick={exitManagingMode}
                  variant="outline" 
                  size="sm"
                >
                  Done
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4" style={{ minHeight: '200px' }}>
              {(sortedLists || []).slice(0, 48).filter((list: any) => list && list.id && list.name && list.name.trim()).map((list: ListWithPosts) => {
                // Get the most recent post image from this list
                const recentPost = userPosts?.find(post => post.listId === list.id);
                const hasImage = recentPost?.primaryPhotoUrl;
                
                return isManagingLists ? (
                  // Management mode - floating with delete button and drag/drop
                  <div 
                    key={list.id}
                    className={`relative animate-wiggle ${draggedOverList === list.id ? 'scale-105 ring-2 ring-blue-400' : ''} ${
                      draggedList === list.id ? 'opacity-50 scale-95' : ''
                    } transition-all duration-200`}
                    draggable={isManagingLists}
                    onDragStart={(e) => handleDragStart(e, list.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(e, list.id);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDraggedOverList(list.id);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, list.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={`bg-gray-900 rounded-xl p-3 text-center hover:bg-black transition-all relative transform hover:scale-105 shadow-lg ${
                      draggedList === list.id ? 'opacity-50 scale-95' : ''
                    }`}>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteList(list.id, list.name, e)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 z-10 shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      <div className="w-full aspect-square rounded-xl mx-auto mb-2 overflow-hidden relative">
                        {hasImage ? (
                          <img 
                            src={recentPost.primaryPhotoUrl} 
                            alt={list.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-pinterest-red/20 rounded-xl flex items-center justify-center">
                            <Folder className="h-6 w-6 text-pinterest-red" />
                          </div>
                        )}
                        {/* Privacy Indicator */}
                        <div className="absolute top-1 right-1">
                          {list.privacyLevel === 'private' && (
                            <div className="bg-red-500/90 text-white p-1 rounded-full">
                              <Lock className="h-3 w-3" />
                            </div>
                          )}
                          {list.privacyLevel === 'connections' && (
                            <div className="bg-blue-500/90 text-white p-1 rounded-full">
                              <Users className="h-3 w-3" />
                            </div>
                          )}
                          {list.privacyLevel === 'public' && (
                            <div className="bg-green-500/90 text-white p-1 rounded-full">
                              <Globe className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-white font-medium truncate">{list.name}</div>
                      <div className="text-xs text-gray-400">{list.posts?.length || 0} items</div>
                      {list.privacyLevel !== 'public' && (
                        <div className="mt-1">
                          <ListCollaboratorAvatars listId={list.id} maxVisible={3} />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Normal mode - clickable link
                  <Link key={list.id} href={`/list/${list.id}`}>
                    <div 
                      className="bg-gray-900 rounded-xl p-3 text-center hover:bg-black transition-colors relative"
                      onMouseDown={() => handleMouseDown(list.id)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={() => handleMouseDown(list.id)}
                      onTouchEnd={handleMouseUp}
                    >
                      <div className="w-full aspect-square rounded-xl mx-auto mb-2 overflow-hidden relative">
                        {hasImage ? (
                          <img 
                            src={recentPost.primaryPhotoUrl} 
                            alt={list.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-pinterest-red/20 rounded-xl flex items-center justify-center">
                            <Folder className="h-6 w-6 text-pinterest-red" />
                          </div>
                        )}
                        {/* Privacy Indicator */}
                        <div className="absolute top-1 right-1">
                          {list.privacyLevel === 'private' && (
                            <div className="bg-red-500/90 text-white p-1 rounded-full">
                              <Lock className="h-3 w-3" />
                            </div>
                          )}
                          {list.privacyLevel === 'connections' && (
                            <div className="bg-blue-500/90 text-white p-1 rounded-full">
                              <Users className="h-3 w-3" />
                            </div>
                          )}
                          {list.privacyLevel === 'public' && (
                            <div className="bg-green-500/90 text-white p-1 rounded-full">
                              <Globe className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-white font-medium truncate">{list.name}</div>
                      <div className="text-xs text-gray-400">{list.posts?.length || 0} items</div>
                      {list.privacyLevel !== 'public' && (
                        <div className="mt-1">
                          <ListCollaboratorAvatars listId={list.id} maxVisible={3} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Friends Section */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Friends</h2>
              <span className="text-sm text-gray-400">{userFriends?.length || 0} friends</span>
            </div>
            
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {(userFriends || []).slice(0, 10).map((friend: any) => (
                <Link key={friend.id} href={`/profile/${friend.id}`}>
                  <div className="flex-shrink-0 text-center">
                    <AuricField profileId={friend.id} intensity={0.2}>
                      <Avatar className="w-12 h-12 mx-auto mb-1">
                        <AvatarImage src={friend.profilePictureUrl || ""} />
                        <AvatarFallback className="bg-gray-800 text-white text-sm">
                          {friend.name?.charAt(0) || friend.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </AuricField>
                    <div className="text-xs text-white font-medium truncate w-14">
                      {friend.name || friend.username}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Followers Section */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Followers</h2>
              <span className="text-sm text-gray-400">0 followers</span>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-6 text-center">
              <Users className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No followers yet</p>
            </div>
          </div>

          {/* Recent Posts */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 px-4">Recent Posts</h2>
            <div className="space-y-1">
              {userPosts && userPosts.length > 0 ? (
                userPosts.slice(0, 10).map((post: PostWithUser) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="bg-gray-900 rounded-xl p-8 text-center mx-4">
                  <Image className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400 mb-4">
                    {isOwnProfile ? "You haven't created any posts yet" : `${displayUser?.name || displayUser?.username} hasn't shared any posts yet`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="h-20"></div> {/* Bottom padding for nav */}
      </div>
    </div>
  );
}