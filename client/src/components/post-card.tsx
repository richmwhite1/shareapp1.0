import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2, Heart, MessageCircle, Trash2 } from "lucide-react";
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
          <div className="flex items-center space-x-3">
            <Avatar className={isDetailView ? 'w-12 h-12' : 'w-10 h-10'}>
              <AvatarImage src={post.user.profilePictureUrl || undefined} />
              <AvatarFallback>
                {post.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className={`font-semibold text-gray-900 ${isDetailView ? 'text-base' : 'text-sm'}`}>
                {post.user.name}
              </h3>
              <p className={`text-pinterest-gray ${isDetailView ? 'text-sm' : 'text-xs'}`}>
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>
          
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
        <img
          src={selectedImage}
          alt="Post image"
          className={`w-full object-cover ${isDetailView ? 'h-96' : 'h-64'}`}
        />
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
          </div>

          {/* Share Count */}
          <div className="text-xs text-gray-500">
            {(stats?.shareCount || 0) > 0 && `${stats?.shareCount || 0} shares`}
          </div>
        </div>
      </CardContent>

      {/* Post Content */}
      <CardContent className={isDetailView ? 'p-6' : 'p-4'}>
        {/* Primary Link and Description */}
        <div className={isDetailView ? 'mb-6' : 'mb-4'}>
          <a
            href={post.primaryLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-pinterest-red hover:text-red-700 font-medium transition-colors inline-flex items-center space-x-2 ${
              isDetailView ? 'text-lg' : 'text-base'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span className="truncate">{post.primaryLink}</span>
          </a>
          <p className={`text-gray-700 leading-relaxed ${isDetailView ? 'mt-3' : 'mt-2'}`}>
            {post.primaryDescription}
          </p>
        </div>

        {/* Additional Photos Gallery */}
        {post.additionalPhotos && post.additionalPhotos.length > 0 && (
          <div className={isDetailView ? 'mb-8' : 'mb-4'}>
            <h4 className={`font-semibold text-gray-900 mb-3 ${isDetailView ? 'text-lg' : 'text-base'}`}>
              More from this collection
            </h4>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {/* Primary image thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={post.primaryPhotoUrl}
                  alt="Primary image"
                  onClick={() => setSelectedImage(post.primaryPhotoUrl)}
                  className={`object-cover rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
                    selectedImage === post.primaryPhotoUrl ? 'border-pinterest-red' : 'border-transparent'
                  } ${isDetailView ? 'w-48 h-32' : 'w-32 h-24'}`}
                />
              </div>
              {/* Additional images */}
              {post.additionalPhotos.map((photo, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={photo}
                    alt={`Additional image ${index + 1}`}
                    onClick={() => setSelectedImage(photo)}
                    className={`object-cover rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
                      selectedImage === photo ? 'border-pinterest-red' : 'border-transparent'
                    } ${isDetailView ? 'w-48 h-32' : 'w-32 h-24'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Post Link for non-detail view */}
        {!isDetailView && (
          <Link href={`/post/${post.id}`}>
            <Button variant="outline" className="w-full mt-4">
              View Post & Comments
            </Button>
          </Link>
        )}

        {/* Delete Button - only show for post owner */}
        {user && post.user.id === user.id && (
          <div className="flex justify-end mt-4">
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
        )}
      </CardContent>
    </Card>
  );
}
