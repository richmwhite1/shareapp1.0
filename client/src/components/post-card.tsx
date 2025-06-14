import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2, Heart, MessageCircle, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { useState } from "react";
import type { PostWithUser } from "@shared/schema";

interface PostCardProps {
  post: PostWithUser;
  isDetailView?: boolean;
}

export default function PostCard({ post, isDetailView = false }: PostCardProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(post.primaryPhotoUrl);

  // Get post stats
  const { data: stats } = useQuery<{ likeCount: number; commentCount: number; shareCount: number }>({
    queryKey: [`/api/posts/${post.id}/stats`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Check if user has liked this post
  const { data: userLike } = useQuery<boolean>({
    queryKey: [`/api/posts/${post.id}/like`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (userLike) {
        return apiRequest('DELETE', `/api/posts/${post.id}/like`);
      } else {
        return apiRequest('POST', `/api/posts/${post.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/like`] });
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/posts/${post.id}/share`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/stats`] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Post deleted",
        description: "Your post has been successfully deleted.",
      });
    },
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      shareMutation.mutate();
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts.",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleDelete = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to delete posts.",
      });
      return;
    }
    
    if (post.user.id !== user?.id) {
      toast({
        title: "Not authorized",
        description: "You can only delete your own posts.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return `Posted ${formatDistanceToNow(dateObj, { addSuffix: true })}`;
  };

  return (
    <Card className={`bg-white overflow-hidden pinterest-shadow hover:pinterest-shadow-hover transition-all duration-300 ${
      isDetailView ? 'rounded-2xl' : 'rounded-lg'
    }`}>
      {/* Post Header */}
      <CardContent className={`${isDetailView ? 'p-6' : 'p-4'} border-b border-gray-100`}>
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user.id}`}>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar className={isDetailView ? 'w-12 h-12' : 'w-10 h-10'}>
                <AvatarImage src={post.user.profilePictureUrl || undefined} />
                <AvatarFallback>
                  {post.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className={`font-semibold text-gray-900 hover:text-pinterest-red transition-colors ${isDetailView ? 'text-base' : 'text-sm'}`}>
                  {post.user.name}
                </h3>
                <p className={`text-pinterest-gray ${isDetailView ? 'text-sm' : 'text-xs'}`}>
                  {formatDate(post.createdAt)}
                </p>
              </div>
            </div>
          </Link>
          
          <Button
            onClick={handleShare}
            variant="ghost"
            size="sm"
            className="text-pinterest-gray hover:text-pinterest-red hover:bg-gray-100"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </CardContent>

      {/* Primary Photo */}
      <div className="relative">
        {isDetailView ? (
          <img
            src={selectedImage}
            alt="Post image"
            className="w-full h-96 object-cover"
          />
        ) : (
          <Link href={`/post/${post.id}`}>
            <img
              src={selectedImage}
              alt="Post image"
              className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            />
          </Link>
        )}
      </div>

      {/* Social Actions Bar */}
      <CardContent className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Love/Heart Button */}
            <Button
              onClick={handleLike}
              variant="ghost"
              size="sm"
              disabled={likeMutation.isPending}
              className={`transition-colors ${
                userLike 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart 
                className={`w-5 h-5 mr-1 ${userLike ? 'fill-current' : ''}`} 
              />
              <span className="text-sm font-medium">
                {stats?.likeCount || 0}
              </span>
            </Button>

            {/* Comments Button */}
            <Link href={`/post/${post.id}`}>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <MessageCircle className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">
                  {stats?.commentCount || 0}
                </span>
              </Button>
            </Link>

            {/* Share Count Button */}
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 cursor-default">
              <Share2 className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">
                {stats?.shareCount || 0}
              </span>
            </Button>
          </div>

          {/* Empty div for spacing */}
          <div></div>
        </div>
      </CardContent>

      {/* Post Content - Only show in detail view */}
      {isDetailView && (
        <CardContent className="p-6">
          {/* Primary Link and Description */}
          <div className="mb-6">
            <a
              href={post.primaryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pinterest-red hover:text-red-700 font-medium transition-colors inline-flex items-center space-x-2 text-lg"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="truncate">{post.primaryLink}</span>
            </a>
            <p className="text-gray-700 leading-relaxed mt-3">
              {post.primaryDescription}
            </p>
            
            {/* Discount Code */}
            {post.discountCode && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-green-800">Discount Code:</span>
                    <span className="ml-2 font-mono text-green-700 font-bold">{post.discountCode}</span>
                  </div>
                  <Button
                    onClick={() => {
                      if (post.discountCode) {
                        navigator.clipboard.writeText(post.discountCode);
                        toast({ title: "Copied!", description: "Discount code copied to clipboard" });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Additional Photos Gallery */}
          {post.additionalPhotos && post.additionalPhotos.length > 0 && (
            <div className="mb-8">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">
                More from this collection
              </h4>
              <div className="space-y-4">
                {/* Primary image thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={post.primaryPhotoUrl}
                    alt="Primary image"
                    onClick={() => setSelectedImage(post.primaryPhotoUrl)}
                    className={`object-cover rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 w-48 h-32 ${
                      selectedImage === post.primaryPhotoUrl ? 'border-pinterest-red' : 'border-transparent'
                    }`}
                  />
                </div>
                {/* Additional images with metadata */}
                {post.additionalPhotos.map((photo, index) => {
                  const photoData = Array.isArray(post.additionalPhotoData) ? post.additionalPhotoData[index] : undefined;
                  return (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <img
                            src={photo}
                            alt={`Additional image ${index + 1}`}
                            onClick={() => setSelectedImage(photo)}
                            className={`object-cover rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 w-24 h-24 ${
                              selectedImage === photo ? 'border-pinterest-red' : 'border-transparent'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {photoData?.link && (
                            <a
                              href={photoData.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pinterest-red hover:text-red-700 font-medium transition-colors inline-flex items-center space-x-1 text-sm"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate">{photoData.link}</span>
                            </a>
                          )}
                          {photoData?.description && (
                            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                              {photoData.description}
                            </p>
                          )}
                          {photoData?.discountCode && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-green-800 font-medium">Code:</span>
                                  <span className="ml-1 font-mono text-green-700 font-bold">{photoData.discountCode}</span>
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(photoData.discountCode);
                                    toast({ title: "Copied!", description: "Discount code copied to clipboard" });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-green-700 border-green-300 hover:bg-green-100"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Delete Button - only show for post owner in detail view */}
      {isDetailView && user && post.user.id === user.id && (
        <CardContent className="px-6 pb-6">
          <div className="flex justify-end">
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              disabled={deleteMutation.isPending}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
