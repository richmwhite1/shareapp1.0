import { Share2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";

interface FeedShareButtonProps {
  postId: number;
  shareCount: number;
}

export default function FeedShareButton({ postId, shareCount }: FeedShareButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/posts/${postId}/share`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/stats`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive",
      });
    },
  });

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Generate post link and copy to clipboard
    const postUrl = `${window.location.origin}/post/${postId}`;
    
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Post link has been copied to clipboard",
      });
      
      // Track the share if user is authenticated
      if (isAuthenticated) {
        shareMutation.mutate();
      }
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center space-x-1 text-white hover:text-blue-400 transition-colors"
      disabled={shareMutation.isPending}
    >
      <Share2 className="w-4 h-4" />
      <span>{shareCount}</span>
    </button>
  );
}