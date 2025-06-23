import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2, Heart, MessageCircle, Trash2, Copy, Flag, Star, Hash, Calendar, Play, Eye, Users, Repeat2, Bookmark, Plus, Check } from "lucide-react";
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
import EventTaskList from "@/components/event-task-list";
import TagFriendsContent from "@/components/tag-friends-content";
import SavePostContent from "@/components/save-post-content";
import MediaPlayer from "@/components/media-player";
import InlineMediaPlayer from "@/components/inline-media-player";
import { AttachedLists } from "@/components/attached-lists";

// Hashtag follow button component
function HashtagFollowButton({ hashtag }: { hashtag: { id: number; name: string } }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is following this hashtag
  const { data: isFollowing = false } = useQuery({
    queryKey: ['/api/hashtags', hashtag.id, 'following'],
    enabled: !!user,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      return apiRequest('POST', `/api/hashtags/${hashtag.id}/${action}`);
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hashtags', hashtag.id, 'following'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hashtags/followed'] });
      toast({
        title: "Success",
        description: `${action === 'follow' ? 'Following' : 'Unfollowed'} #${hashtag.name}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow hashtags",
        variant: "destructive"
      });
      return;
    }
    followMutation.mutate(isFollowing ? 'unfollow' : 'follow');
  };

  return (
    <button
      onClick={handleFollowClick}
      disabled={followMutation.isPending}
      className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
        isFollowing 
          ? 'bg-pinterest-red text-white hover:bg-red-700' 
          : 'bg-gray-200 text-gray-600 hover:bg-pinterest-red hover:text-white'
      } ${followMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {followMutation.isPending ? (
        <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
      ) : isFollowing ? (
        <Check className="h-3 w-3" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
    </button>
  );
}

interface PostCardProps {
  post: PostWithUser;
  isDetailView?: boolean;
}

export default function PostCard({ post, isDetailView = false }: PostCardProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedImage, setSelectedImage] = useState(post.primaryPhotoUrl);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
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

  // Handler functions
  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Post link has been copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    });
  };

  const handleTagFriends = () => {
    setShowTagDialog(true);
  };

  const handleRepost = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to repost",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Reposted",
          description: "Post has been reposted to your profile",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        throw new Error('Failed to repost');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to repost. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const handleFlag = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to flag posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post.id}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason: 'inappropriate_content' }),
      });

      if (response.ok) {
        toast({
          title: "Post flagged",
          description: "Thank you for reporting. We'll review this content.",
        });
      } else {
        throw new Error('Failed to flag post');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to flag post. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        {(post.youtubeUrl || post.spotifyUrl) ? (
          // Media posts: Inline streaming
          <div className="relative w-full h-96">
            <InlineMediaPlayer
              youtubeUrl={post.youtubeUrl || undefined}
              spotifyUrl={post.spotifyUrl || undefined}
              postId={post.id}
              thumbnailUrl={post.primaryPhotoUrl}
              onPostClick={() => setLocation(`/post/${post.id}`)}
            />
          </div>
        ) : (
          // Regular posts: Navigate to post detail
          <Link href={`/post/${post.id}`}>
            <img
              src={post.primaryPhotoUrl}
              alt={post.primaryDescription}
              className="w-full h-96 object-cover cursor-pointer"
              onError={(e) => {
                console.error('Feed image failed to load:', post.primaryPhotoUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('Feed image loaded successfully:', post.primaryPhotoUrl);
              }}
            />
          </Link>
        )}
        
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
              <Link href={`/post/${post.id}`} className="flex items-center space-x-1 hover:text-yellow-400 transition-colors cursor-pointer">
                <MessageCircle className="w-4 h-4" />
                <span>{stats?.commentCount || 0}</span>
              </Link>
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
              {(post.youtubeUrl || post.spotifyUrl) && (
                <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {post.youtubeUrl ? 'Video' : 'Music'}
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
      <div className="p-3 sm:p-6 bg-black">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/profile/${post.user.id}`} className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <ProfileIconWithAura 
                userId={post.user.id} 
                userName={post.user.name} 
                profilePicture={post.user.profilePictureUrl}
                size="md"
              />
              <div className="min-w-0 flex-1 max-w-[calc(100vw-200px)]">
                <h3 className="font-semibold text-white hover:text-yellow-400 transition-colors text-sm sm:text-base truncate">
                  {post.user.name}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm truncate">
                  Posted {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Link>
          
          {/* Action Icons - Always stay on right */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => handleShare()}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => handleTagFriends()}
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => handleRepost()}
            >
              <Repeat2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => handleSave()}
            >
              <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative">
        <img
          src={post.primaryPhotoUrl}
          alt={post.primaryDescription}
          className="w-full h-96 object-cover"
          onError={(e) => {
            console.error('Image failed to load:', post.primaryPhotoUrl);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', post.primaryPhotoUrl);
          }}
        />
        

        
        {/* Event Date Overlay */}
        {post.isEvent && post.eventDate && (
          <div className="absolute top-4 left-4 bg-purple-600/90 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            <span>{new Date(post.eventDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Post Actions - Right under the picture */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <FeedLikeButton postId={post.id} />
            <Link href={`/post/${post.id}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MessageCircle className="h-5 w-5 mr-2" />
                <span>{stats?.commentCount || 0}</span>
              </Button>
            </Link>
            <FeedShareButton postId={post.id} shareCount={stats?.shareCount || 0} />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Eye className="h-4 w-4" />
              <span>{viewData?.viewCount || 0} views</span>
            </div>
            
            {/* Flag or Delete button */}
            {user?.id === post.userId ? (
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
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFlag}
                className="text-gray-400 hover:text-white"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Aura rating moved below icons */}
        <div className="w-full">
          <EnergyRating postId={post.id} className="w-full" />
        </div>
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
            <ExternalLink className="w-5 h-5" />
            <span>{post.linkLabel || "Link"}</span>
          </a>
          <p className="text-gray-300 leading-relaxed mt-3">
            {post.primaryDescription}
          </p>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.hashtags.map((hashtag: any) => (
                <div key={hashtag.id} className="inline-flex items-center gap-1 bg-pinterest-red/10 hover:bg-pinterest-red/20 border border-pinterest-red/30 rounded-full text-sm transition-colors">
                  <button
                    onClick={() => {
                      console.log('Hashtag clicked:', hashtag.name);
                      const url = `/search?hashtag=${encodeURIComponent(hashtag.name)}`;
                      console.log('Navigating to:', url);
                      window.history.pushState({}, '', url);
                      setLocation(url);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-pinterest-red hover:text-pinterest-red/80 transition-colors"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{hashtag.name}</span>
                  </button>
                  <HashtagFollowButton hashtag={hashtag} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Player Section */}
        {(post.youtubeUrl || post.spotifyUrl) && (
          <div className="mt-6">
            <MediaPlayer 
              youtubeUrl={post.youtubeUrl || undefined} 
              spotifyUrl={post.spotifyUrl || undefined}
              youtubeLabel={post.youtubeLabel || undefined}
              spotifyLabel={post.spotifyLabel || undefined}
            />
          </div>
        )}
      </div>

      {/* RSVP Component - Only show for events */}
      {post.isEvent && <EventRsvp post={post} />}
      
      {/* Event Task List */}
      {post.isEvent && <EventTaskList post={post} />}
      
      {/* Attached Lists - Only show for events with attached lists */}
      {post.isEvent && (
        <AttachedLists postId={post.id} />
      )}

      {/* Tag Friends Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Tag Friends in Post</DialogTitle>
          </DialogHeader>
          <TagFriendsContent
            postId={post.id}
            onClose={() => setShowTagDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Save to Category Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Save Post</DialogTitle>
          </DialogHeader>
          <SavePostContent
            postId={post.id}
            onClose={() => setShowSaveDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}