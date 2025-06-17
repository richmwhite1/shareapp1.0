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
import AuricField from "@/components/auric-field";
import AuricPhotoBorder from "@/components/auric-photo-border";
import { ViewTracker } from "@/components/view-tracker";
import { PostActionsMenu } from "@/components/post-actions-menu";

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
        <AuricPhotoBorder postId={post.id}>
          <Link href={`/post/${post.id}`}>
            <img
              src={post.primaryPhotoUrl}
              alt={post.primaryDescription}
              className="w-full h-96 object-cover cursor-pointer"
            />
          </Link>
        </AuricPhotoBorder>
        
        {/* Event date overlay - top left corner */}
        {post.isEvent && post.eventDate && (
          <div className="absolute top-3 left-3 bg-purple-600/90 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <Calendar className="w-3 h-3" />
            <span>{new Date(post.eventDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Play buttons for YouTube and Spotify - subtle top right corner */}
        {(post.youtubeUrl || post.spotifyUrl) && (
          <div className="absolute top-2 right-2 flex gap-1">
            {post.youtubeUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Extract YouTube video ID and create embedded iframe
                  const videoId = post.youtubeUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
                  if (videoId) {
                    // Create modal with embedded YouTube player
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
                    modal.innerHTML = `
                      <div class="relative w-full max-w-4xl mx-4">
                        <button class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">&times;</button>
                        <div class="relative pb-[56.25%] h-0">
                          <iframe 
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            class="absolute top-0 left-0 w-full h-full rounded-lg"
                            frameborder="0" 
                            allowfullscreen
                            allow="autoplay; encrypted-media">
                          </iframe>
                        </div>
                      </div>
                    `;
                    
                    const closeBtn = modal.querySelector('button');
                    closeBtn?.addEventListener('click', () => modal.remove());
                    modal.addEventListener('click', (e) => {
                      if (e.target === modal) modal.remove();
                    });
                    
                    document.body.appendChild(modal);
                  }
                }}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
            {post.spotifyUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Extract Spotify track/album ID and create embedded player
                  const spotifyMatch = post.spotifyUrl?.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
                  if (spotifyMatch) {
                    const [, type, id] = spotifyMatch;
                    // Create modal with embedded Spotify player
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
                    modal.innerHTML = `
                      <div class="relative w-full max-w-md mx-4">
                        <button class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">&times;</button>
                        <iframe 
                          src="https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0" 
                          width="100%" 
                          height="352" 
                          frameborder="0" 
                          allowfullscreen="" 
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                          loading="lazy"
                          class="rounded-lg">
                        </iframe>
                      </div>
                    `;
                    
                    const closeBtn = modal.querySelector('button');
                    closeBtn?.addEventListener('click', () => modal.remove());
                    modal.addEventListener('click', (e) => {
                      if (e.target === modal) modal.remove();
                    });
                    
                    document.body.appendChild(modal);
                  }
                }}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Overlaid stats at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Heart className="w-4 h-4" />
                <span>{stats?.likeCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{stats?.commentCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Share2 className="w-4 h-4" />
                <span>{stats?.shareCount || 0}</span>
              </div>
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
      // Copy share link to clipboard
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "Link copied!",
          description: "Post link has been copied to your clipboard.",
        });
      }).catch(() => {
        toast({
          title: "Shared!",
          description: "Post has been shared successfully.",
        });
      });
    },
  });

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: async (data: { reason: string; description: string }) => {
      return apiRequest('POST', '/api/reports', {
        postId: post.id,
        reason: data.reason,
        comment: data.description,
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      });
      setReportReason("");
      setReportDescription("");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to like posts.",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleReport = () => {
    if (!reportReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please select a reason for reporting.",
        variant: "destructive",
      });
      return;
    }
    reportMutation.mutate({ reason: reportReason, description: reportDescription });
  };

  const handleDelete = () => {
    if (!user || post.user.id !== user.id) {
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
    <AuricField postId={post.id}>
      <div className="bg-black overflow-hidden transition-all duration-300 relative">
      {/* Post Header */}
      <div className={`${isDetailView ? 'p-6' : 'p-4'} bg-black`}>
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user.id}`}>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <AuricField profileId={post.user.id} intensity={0.3}>
                <Avatar className={isDetailView ? 'w-12 h-12' : 'w-10 h-10'}>
                  <AvatarImage src={post.user.profilePictureUrl || undefined} />
                  <AvatarFallback className="bg-gray-600 text-white">
                    {post.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AuricField>
              <div>
                <h3 className={`font-semibold text-white hover:text-yellow-400 transition-colors ${isDetailView ? 'text-base' : 'text-sm'}`}>
                  {post.user.name}
                </h3>
                <p className={`text-gray-400 ${isDetailView ? 'text-sm' : 'text-xs'}`}>
                  {formatDate(post.createdAt)}
                </p>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Individual Action Buttons for Detail View */}
            {isDetailView ? (
              <>
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                
                <PostActionsMenu postId={post.id} postTitle={post.primaryDescription} postUserId={post.userId} actionType="tag" />
                <PostActionsMenu postId={post.id} postTitle={post.primaryDescription} postUserId={post.userId} actionType="repost" />
                <PostActionsMenu postId={post.id} postTitle={post.primaryDescription} postUserId={post.userId} actionType="save" />
              </>
            ) : (
              /* Feed View - Use Hamburger Menu */
              <PostActionsMenu postId={post.id} postTitle={post.primaryDescription} postUserId={post.userId} />
            )}
          </div>
        </div>
      </div>

      {/* Primary Photo */}
      <div className="relative">
        {isDetailView ? (
          <AuricPhotoBorder postId={post.id}>
            <ImageGallery 
              post={post} 
              selectedImage={selectedImage} 
              onImageChange={setSelectedImage} 
            />
          </AuricPhotoBorder>
        ) : (
          <AuricPhotoBorder postId={post.id}>
            <Link href={`/post/${post.id}`}>
              <img
                src={post.primaryPhotoUrl}
                alt={post.primaryDescription}
                className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
              />
            </Link>
          </AuricPhotoBorder>
        )}
      </div>

      {/* Event Date Display in Feed */}
      {!isDetailView && post.isEvent && post.eventDate && (
        <div className="px-3 py-2 bg-purple-900/30 border-t border-purple-700">
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(post.eventDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
            {post.isRecurring && (
              <span className="text-xs bg-purple-600 px-1 py-0.5 rounded">
                {post.recurringType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Social Actions Bar */}
      <div className="p-3 bg-black">
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
                  ? 'text-red-500 hover:text-red-600 bg-red-900/20 hover:bg-red-900/30' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-gray-700'
              }`}
            >
              <Heart className={`w-5 h-5 mr-1 ${userLike ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">
                {stats?.likeCount || 0}
              </span>
            </Button>

            {/* Comments Button */}
            <Link href={`/post/${post.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
              >
                <MessageCircle className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">
                  {stats?.commentCount || 0}
                </span>
              </Button>
            </Link>
          </div>

          {/* Share Count - Only show in feed view */}
          {!isDetailView && (
            <div className="flex items-center text-gray-400 text-sm">
              <Share2 className="w-4 h-4 mr-1" />
              <span>{stats?.shareCount || 0}</span>
            </div>
          )}

          {/* Flag and Delete Buttons - Only show in detail view, bottom right */}
          {isDetailView && (
            <div className="flex items-center space-x-2">
              {/* Delete Button - Only for post owner */}
              {isAuthenticated && user && post.user.id === user.id && (
                <Button
                  onClick={handleDelete}
                  variant="ghost"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  className="text-gray-400 hover:text-red-400 hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {/* Flag Button - Only for posts by other users */}
              {isAuthenticated && post.user.id !== user?.id && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-400 hover:bg-gray-700"
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Report Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Reason for reporting
                        </label>
                        <Select value={reportReason} onValueChange={setReportReason}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="spam">Spam</SelectItem>
                            <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                            <SelectItem value="harassment">Harassment</SelectItem>
                            <SelectItem value="fake">Fake or misleading</SelectItem>
                            <SelectItem value="copyright">Copyright violation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Additional details (optional)
                        </label>
                        <Textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder="Provide more details about the issue..."
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <DialogTrigger asChild>
                          <Button variant="outline" className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500">
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <Button
                          onClick={() => {
                            if (!reportReason) {
                              toast({
                                title: "Missing reason",
                                description: "Please select a reason for reporting.",
                                variant: "destructive",
                              });
                              return;
                            }
                            reportMutation.mutate({
                              reason: reportReason,
                              description: reportDescription,
                            });
                          }}
                          disabled={reportMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Submit Report
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {/* Energy Rating - Detail view only */}
        {isDetailView && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <EnergyRating postId={post.id} />
          </div>
        )}

        {/* Hashtags in feed view */}
        {!isDetailView && post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
            {post.hashtags.slice(0, 5).map((hashtag) => (
              <Link key={hashtag.id} href={`/search?hashtag=${hashtag.name}`}>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-pinterest-red/10 hover:bg-pinterest-red/20 border border-pinterest-red/30 rounded-full text-xs text-pinterest-red hover:text-pinterest-red/80 transition-colors cursor-pointer">
                  <Hash className="h-2.5 w-2.5" />
                  <span>{hashtag.name}</span>
                </div>
              </Link>
            ))}
            {post.hashtags.length > 5 && (
              <Link href={`/post/${post.id}`}>
                <div className="inline-flex items-center px-2 py-1 text-xs text-gray-400 hover:text-gray-300 cursor-pointer">
                  +{post.hashtags.length - 5} more
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Post Content - Only show in detail view */}
      {isDetailView && (
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

            {/* Event Date and Details - Detail View */}
            {post.isEvent && post.eventDate && (
              <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                <div className="flex items-center gap-2 text-purple-300 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Event Details</span>
                </div>
                <p className="text-white mb-2">
                  {new Date(post.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
                {post.isRecurring && (
                  <span className="inline-block text-xs bg-purple-600 px-2 py-1 rounded mb-2">
                    Recurring {post.recurringType}
                  </span>
                )}
                
                {/* Task List */}
                {post.taskList && Array.isArray(post.taskList) && post.taskList.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-purple-300 mb-2">Event Tasks:</h4>
                    <div className="space-y-2">
                      {(post.taskList as any[]).map((task: any, index: number) => (
                        <div key={task.id || index} className="flex items-center gap-3 p-2 bg-purple-900/10 border border-purple-700/30 rounded cursor-pointer hover:bg-purple-900/20 transition-colors">
                          <button 
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : 'border-purple-400 hover:border-purple-300'
                            }`}
                            onClick={async () => {
                              if (!user) {
                                toast({
                                  title: "Login required",
                                  description: "Please log in to assign tasks.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              try {
                                const response = await fetch(`/api/posts/${post.id}/tasks/${task.id}/toggle`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                  },
                                });
                                
                                if (response.ok) {
                                  // Refresh the post data
                                  queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
                                  toast({
                                    title: task.completed ? "Task unclaimed" : "Task claimed",
                                    description: task.completed ? "You have unclaimed this task." : "You have claimed this task!",
                                  });
                                } else {
                                  throw new Error('Failed to toggle task');
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to update task. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            {task.completed && <span className="text-xs">✓</span>}
                          </button>
                          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-300'}`}>
                            {task.text || task.task || 'Task item'}
                          </span>
                          {task.completedBy && (
                            <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded">
                              Claimed by {user?.id === task.completedBy ? 'You' : `User ${task.completedBy}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            
            {/* Discount Code */}
            {post.discountCode && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-green-400">Discount Code:</span>
                    <span className="ml-2 font-mono text-green-300 font-bold">{post.discountCode}</span>
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
                    className="text-green-400 border-green-600 hover:bg-green-800/20"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {/* Media Players */}
            {(post.spotifyUrl || post.youtubeUrl) && (
              <div className="mt-6 space-y-4">
                {/* Spotify Player */}
                {post.spotifyUrl && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.599 0-.36.24-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.32 11.28-1.08 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      <span className="text-green-400 font-medium">Spotify</span>
                    </div>
                    {(() => {
                      // Extract Spotify track ID from URL
                      const trackMatch = post.spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
                      const albumMatch = post.spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
                      const playlistMatch = post.spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/);
                      
                      if (trackMatch) {
                        return (
                          <iframe
                            src={`https://open.spotify.com/embed/track/${trackMatch[1]}?utm_source=generator&theme=0`}
                            width="100%"
                            height="152"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded"
                          />
                        );
                      } else if (albumMatch) {
                        return (
                          <iframe
                            src={`https://open.spotify.com/embed/album/${albumMatch[1]}?utm_source=generator&theme=0`}
                            width="100%"
                            height="352"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded"
                          />
                        );
                      } else if (playlistMatch) {
                        return (
                          <iframe
                            src={`https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator&theme=0`}
                            width="100%"
                            height="352"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded"
                          />
                        );
                      } else {
                        return (
                          <a
                            href={post.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 inline-flex items-center space-x-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Open in Spotify</span>
                          </a>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* YouTube Player */}
                {post.youtubeUrl && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span className="text-red-500 font-medium">YouTube</span>
                    </div>
                    {(() => {
                      // Extract YouTube video ID from URL
                      const videoMatch = post.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                      
                      if (videoMatch) {
                        return (
                          <iframe
                            src={`https://www.youtube.com/embed/${videoMatch[1]}`}
                            width="100%"
                            height="315"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded"
                          />
                        );
                      } else {
                        return (
                          <a
                            href={post.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 inline-flex items-center space-x-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Watch on YouTube</span>
                          </a>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      )}



      {/* RSVP Component - Only show in detail view for events */}
      {isDetailView && post.isEvent && <EventRsvp post={post} />}

      {/* Flag and Delete Buttons - Positioned at bottom right of expanded posts */}
      {isDetailView && (
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          {/* Delete Button - Only for post owner */}
          {isAuthenticated && user && post.user.id === user.id && (
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              disabled={deleteMutation.isPending}
              className="text-gray-400 hover:text-red-400 hover:bg-gray-700 bg-black/50 backdrop-blur-sm"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* Flag Button - Only for posts by other users */}
          {isAuthenticated && post.user.id !== user?.id && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-400 hover:bg-gray-700 bg-black/50 backdrop-blur-sm"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Report Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason for reporting
                    </label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="fake">Fake or misleading</SelectItem>
                        <SelectItem value="copyright">Copyright violation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional details (optional)
                    </label>
                    <Textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Provide more details about the issue..."
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500">
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <Button
                      onClick={handleReport}
                      disabled={reportMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Submit Report
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      </div>
    </AuricField>
  );
}