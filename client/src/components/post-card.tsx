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