import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2, Heart, MessageCircle, Trash2, Copy, Flag, Star } from "lucide-react";
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
      toast({
        title: "Shared!",
        description: "Post has been shared successfully.",
      });
    },
  });

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: async (data: { reason: string; description: string }) => {
      return apiRequest('POST', '/api/reports', {
        type: 'post',
        targetId: post.id,
        reason: data.reason,
        description: data.description,
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
    <div className="bg-black overflow-hidden transition-all duration-300">
      {/* Post Header */}
      <div className={`${isDetailView ? 'p-6' : 'p-4'} bg-black`}>
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user.id}`}>
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar className={isDetailView ? 'w-12 h-12' : 'w-10 h-10'}>
                <AvatarImage src={post.user.profilePictureUrl || undefined} />
                <AvatarFallback className="bg-gray-600 text-white">
                  {post.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
            <Button
              onClick={handleShare}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            {/* Report Button */}
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
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          Cancel
                        </Button>
                      </DialogTrigger>
                      <Button
                        onClick={handleReport}
                        disabled={reportMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {reportMutation.isPending ? "Submitting..." : "Submit Report"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            {user && post.user.id === user.id && !isDetailView && (
              <Button
                onClick={handleDelete}
                variant="ghost"
                size="sm"
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-600 hover:bg-gray-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Photo */}
      <div className="relative">
        {isDetailView ? (
          <img
            src={selectedImage}
            alt={post.primaryDescription}
            className="w-full max-h-96 object-cover"
          />
        ) : (
          <Link href={`/post/${post.id}`}>
            <img
              src={post.primaryPhotoUrl}
              alt={post.primaryDescription}
              className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            />
          </Link>
        )}
      </div>

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

          {/* Share Count */}
          <div className="flex items-center text-gray-400 text-sm">
            <Share2 className="w-4 h-4 mr-1" />
            <span>{stats?.shareCount || 0}</span>
          </div>
        </div>
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

          {/* Additional Photos Gallery */}
          {post.additionalPhotos && post.additionalPhotos.length > 0 && (
            <div className="mb-8">
              <h4 className="font-semibold text-white mb-3 text-lg">
                More from this collection
              </h4>
              <div className="space-y-4">
                {/* Primary image thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={post.primaryPhotoUrl}
                    alt="Primary image"
                    onClick={() => setSelectedImage(post.primaryPhotoUrl)}
                    className={`w-20 h-20 object-cover rounded cursor-pointer transition-all ${
                      selectedImage === post.primaryPhotoUrl ? 'ring-2 ring-yellow-400 opacity-100' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                </div>
                
                {/* Additional photos */}
                {post.additionalPhotos.map((photo, index) => {
                  const photoData = post.additionalPhotoData?.[index];
                  return (
                    <div key={index} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex space-x-4">
                        <div className="flex-shrink-0">
                          <img
                            src={photo}
                            alt={photoData?.description || `Additional photo ${index + 1}`}
                            onClick={() => setSelectedImage(photo)}
                            className={`w-20 h-20 object-cover rounded cursor-pointer transition-all ${
                              selectedImage === photo ? 'ring-2 ring-yellow-400 opacity-100' : 'opacity-70 hover:opacity-100'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {photoData?.link && (
                            <a
                              href={photoData.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors inline-flex items-center space-x-1 text-sm"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate">{photoData.link}</span>
                            </a>
                          )}
                          {photoData?.description && (
                            <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                              {photoData.description}
                            </p>
                          )}
                          {photoData?.discountCode && (
                            <div className="mt-2 p-2 bg-green-900/20 border border-green-700 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-green-400 font-medium">Code:</span>
                                  <span className="ml-1 font-mono text-green-300 font-bold">{photoData.discountCode}</span>
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(photoData.discountCode || '');
                                    toast({ title: "Copied!", description: "Discount code copied to clipboard" });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-green-400 border-green-600 hover:bg-green-800/20"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
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
        </div>
      )}

      {/* Delete Button - only show for post owner in detail view */}
      {isDetailView && user && post.user.id === user.id && (
        <div className="px-6 pb-6">
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
        </div>
      )}
    </div>
  );
}