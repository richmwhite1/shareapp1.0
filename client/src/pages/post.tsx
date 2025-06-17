import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/header-simple";
import PostCard from "@/components/post-card";
import CommentSection from "@/components/comment-section";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { PostWithUser } from "@shared/schema";

export default function PostPage() {
  const [, params] = useRoute("/post/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['/api/posts', postId],
    enabled: !!postId,
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch post');
      }
      return response.json() as Promise<PostWithUser>;
    },
  });

  if (!postId || isNaN(postId)) {
    return (
      <div className="min-h-screen bg-surface-gray">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Invalid Post
              </h1>
              <p className="text-pinterest-gray">
                The post ID is invalid.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (error) {
    const is404 = error.message === 'Post not found';
    
    return (
      <div className="min-h-screen bg-surface-gray">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {is404 ? 'Post Not Found' : 'Something went wrong'}
              </h1>
              <p className="text-pinterest-gray mb-4">
                {is404 
                  ? 'The post you\'re looking for doesn\'t exist or has been removed.'
                  : 'Failed to load the post. Please try again later.'
                }
              </p>
              <a
                href="/"
                className="inline-block bg-pinterest-red text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition-colors"
              >
                Go Home
              </a>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-gray">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-white rounded-2xl pinterest-shadow overflow-hidden mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="w-full h-96 rounded-lg mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-2xl pinterest-shadow overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-6" />
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Skeleton className="h-4 w-1/4 mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-gray">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={handleGoBack}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {post && (
          <>
            <PostCard post={post} isDetailView={true} />
            <div className="mt-6">
              <CommentSection postId={post.id} />
            </div>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-pinterest-gray">
            <p>&copy; 2025 PinShare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
