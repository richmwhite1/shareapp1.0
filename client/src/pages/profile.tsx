import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Folder, Image, Plus, Users, Lock, Trash2, Share2, Camera } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import PostCard from "@/components/post-card";
import type { User, PostWithUser, CategoryWithPosts } from "@shared/schema";

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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithPosts[]>({
    queryKey: [`/api/categories/user/${profileUserId}`],
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

  // Share profile mutation
  const shareProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/user/${user?.id}/share`);
    },
    onSuccess: () => {
      toast({
        title: "Profile shared successfully",
        description: "Your profile has been shared!",
      });
      // Invalidate the total shares query to update the count
      queryClient.invalidateQueries({ queryKey: [`/api/user/total-shares/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Share failed",
        description: error.message || "Failed to share profile",
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

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest('DELETE', `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      toast({
        title: "Category deleted",
        description: "Category has been deleted and posts moved to General.",
      });
    },
  });

  const handleDeleteCategory = (categoryId: number, categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    if (confirm(`Are you sure you want to delete the "${categoryName}" category? All posts will be moved to General.`)) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleShareProfile = () => {
    shareProfileMutation.mutate();
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

  if (categoriesLoading || postsLoading) {
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
        {/* Large Profile Picture */}
        <div className="relative">
          <div className="w-full h-96 bg-gray-900 rounded-b-3xl overflow-hidden">
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

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-900 mx-4 rounded-lg -mt-6 relative z-10 mb-6">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-xl font-bold text-white">{totalPosts}</div>
              <div className="text-sm text-gray-400">Posts</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{categories?.length || 0}</div>
              <div className="text-sm text-gray-400">Lists</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{userFriends?.length || 0}</div>
              <div className="text-sm text-gray-400">Friends</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{totalShares}</div>
              <div className="text-sm text-gray-400">Shares</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Lists Section */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Lists</h2>
              <span className="text-sm text-gray-400">{categories?.length || 0} lists</span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {(categories || []).slice(0, 8).filter((cat: any) => cat && cat.id && cat.name && cat.name.trim()).map((category: CategoryWithPosts) => {
                // Get the most recent post image from this category
                const recentPost = userPosts?.find(post => post.categoryId === category.id);
                const hasImage = recentPost?.primaryPhotoUrl;
                
                return (
                  <Link key={category.id} href={`/category/${category.id}`}>
                    <div className="bg-gray-900 rounded-xl p-3 text-center hover:bg-gray-800 transition-colors">
                      <div className="w-12 h-12 rounded-xl mx-auto mb-2 overflow-hidden">
                        {hasImage ? (
                          <img 
                            src={recentPost.primaryPhotoUrl} 
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-pinterest-red/20 rounded-xl flex items-center justify-center">
                            <Folder className="h-6 w-6 text-pinterest-red" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-white font-medium truncate">{category.name}</div>
                      <div className="text-xs text-gray-400">{category.posts?.length || 0} items</div>
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
                    <Avatar className="w-12 h-12 mx-auto mb-1">
                      <AvatarImage src={friend.profilePictureUrl || ""} />
                      <AvatarFallback className="bg-gray-800 text-white text-sm">
                        {friend.name?.charAt(0) || friend.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
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