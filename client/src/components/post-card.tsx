import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { PostWithUser } from "@shared/schema";

interface PostCardProps {
  post: PostWithUser;
  isDetailView?: boolean;
}

export default function PostCard({ post, isDetailView = false }: PostCardProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
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
          src={post.primaryPhotoUrl}
          alt="Post image"
          className={`w-full object-cover ${isDetailView ? 'h-96' : 'h-64'}`}
        />
      </div>

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
              {post.additionalPhotos.map((photo, index) => (
                <div key={index} className="flex-shrink-0">
                  <img
                    src={photo}
                    alt={`Additional image ${index + 1}`}
                    className={`object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                      isDetailView ? 'w-48 h-32' : 'w-32 h-24'
                    }`}
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
      </CardContent>
    </Card>
  );
}
