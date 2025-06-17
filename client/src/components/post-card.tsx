import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2, Heart, MessageCircle, Trash2, Copy, Flag, Star, Hash, Calendar, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { useState } from "react";
import type { PostWithUser } from "@shared/schema";
import ImageGallery from "@/components/image-gallery";
import EventDateOverlay from "@/components/event-date-overlay";
import EventRsvp from "@/components/event-rsvp-simple";
import EnergyRating from "@/components/energy-rating";
import { ViewTracker } from "@/components/view-tracker";
import { PostActionsMenu } from "@/components/post-actions-menu";
import ProfileIconWithAura from "@/components/profile-icon-with-aura";
import FeedLikeButton from "@/components/feed-like-button";
import FeedShareButton from "@/components/feed-share-button";

interface PostCardProps {
  post: PostWithUser;
  isDetailView?: boolean;
}

export default function PostCard({ post, isDetailView = false }: PostCardProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(post.primaryPhotoUrl);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      // Navigate back to home if on detail page
      if (isDetailView) {
        window.location.href = '/';
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get post stats
  const { data: stats } = useQuery<{ likeCount: number; commentCount: number; shareCount: number }>({
    queryKey: [`/api/posts/${post.id}/stats`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get view count
  const { data: viewData } = useQuery<{ viewCount: number }>({
    queryKey: [`/api/posts/${post.id}/views`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // For feed view, use magazine-style layout with overlaid stats
  if (!isDetailView) {
    return (
      <ViewTracker postId={post.id} viewType="feed" className="relative bg-black">
        <Link href={`/post/${post.id}`}>
          <img
            src={post.primaryPhotoUrl}
            alt={post.primaryDescription}
            className="w-full h-96 object-cover cursor-pointer"
          />
        </Link>
        
        {/* Profile icon with aura circle - top left corner */}
        <div className="absolute top-3 left-3">
          <ProfileIconWithAura userId={post.userId} userName={post.user.name} profilePicture={post.user.profilePictureUrl} />
        </div>
        
        {/* Event date overlay - top right corner */}
        {post.isEvent && post.eventDate && (
          <div className="absolute top-3 right-3 bg-purple-600/90 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <Calendar className="w-3 h-3" />
            <span>{new Date(post.eventDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Interactive stats at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4 text-sm">
              <FeedLikeButton postId={post.id} />
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{stats?.commentCount || 0}</span>
              </div>
              <FeedShareButton postId={post.id} shareCount={stats?.shareCount || 0} />
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{viewData?.viewCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {post.discountCode && (
                <div className="bg-pinterest-red text-white px-2 py-1 rounded text-xs font-bold">
                  ${post.discountCode}
                </div>
              )}
              <PostActionsMenu postId={post.id} postTitle={post.primaryDescription} />
            </div>
          </div>
        </div>
      </ViewTracker>
    );
  }

  // Detail view with comprehensive interactions
  return (
    <div className="bg-black overflow-hidden transition-all duration-300 relative">
      {/* Post Header */}
      <div className="p-6 bg-black">
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user.id}`}>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <ProfileIconWithAura 
                userId={post.user.id} 
                userName={post.user.name} 
                profilePicture={post.user.profilePictureUrl}
                size="md"
              />
              <div>
                <h3 className="font-semibold text-white hover:text-yellow-400 transition-colors text-base">
                  {post.user.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  Posted {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative">
        <img
          src={post.primaryPhotoUrl}
          alt={post.primaryDescription}
          className="w-full h-96 object-cover"
        />
        
        {/* Event Date Overlay */}
        {post.isEvent && post.eventDate && (
          <div className="absolute top-4 right-4 bg-purple-600/90 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            <span>{new Date(post.eventDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="p-6">
        {/* Primary Link and Description */}
        <div className="mb-6">
          <a
            href={post.primaryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors inline-flex items-center space-x-2 text-lg"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="truncate">{post.primaryLink}</span>
          </a>
          <p className="text-gray-300 leading-relaxed mt-3">
            {post.primaryDescription}
          </p>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.hashtags.map((hashtag) => (
                <Link key={hashtag.id} href={`/search?hashtag=${hashtag.name}`}>
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-pinterest-red/10 hover:bg-pinterest-red/20 border border-pinterest-red/30 rounded-full text-sm text-pinterest-red hover:text-pinterest-red/80 transition-colors cursor-pointer">
                    <Hash className="h-3 w-3" />
                    <span>{hashtag.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Post Actions - Like, Comment, Share buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-center space-x-6">
            <FeedLikeButton postId={post.id} />
            <Link href={`/post/${post.id}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MessageCircle className="h-5 w-5 mr-2" />
                <span>{stats?.commentCount || 0}</span>
              </Button>
            </Link>
            <FeedShareButton postId={post.id} shareCount={stats?.shareCount || 0} />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Post Actions Menu */}
            <PostActionsMenu 
              postId={post.id} 
              postTitle={post.primaryDescription || ""} 
              postUserId={post.userId}
            />
            
            {/* Delete button for post owner */}
            {user?.id === post.userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this post?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Energy Rating Component */}
        <div className="mt-6">
          <EnergyRating profileId={post.user.id} />
        </div>
      </div>

      {/* RSVP Component - Only show for events */}
      {post.isEvent && <EventRsvp post={post} />}
    </div>
  );
}