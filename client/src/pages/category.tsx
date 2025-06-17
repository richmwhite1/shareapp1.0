import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { getQueryFn } from "@/lib/queryClient";

import PostCard from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Folder, Lock, Users, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { CategoryWithPosts, PostWithUser } from "@shared/schema";

export default function CategoryPage() {
  const [match, params] = useRoute('/category/:id');
  const categoryId = params?.id;
  const { toast } = useToast();

  const { data: category, isLoading: categoryLoading } = useQuery<CategoryWithPosts>({
    queryKey: [`/api/categories/${categoryId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!categoryId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: [`/api/posts/category/${categoryId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!categoryId,
  });

  const handleShareCategory = async () => {
    const url = `${window.location.origin}/category/${categoryId}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Category link copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (!match) {
    return <div>Category not found</div>;
  }

  if (categoryLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading category...</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Category not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                {category?.firstPostImage ? (
                  <img 
                    src={category.firstPostImage} 
                    alt={category.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Folder className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{category?.name}</h1>
                  {category?.isPublic ? (
                    <Users className="h-4 w-4 text-green-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-muted-foreground">
                  {category?.description || `${posts?.length || 0} posts in this category`}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleShareCategory}
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share List
          </Button>
        </div>

        {/* Posts Grid */}
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post: PostWithUser) => (
              <div key={post.id} className="cursor-pointer">
                <Link href={`/post/${post.id}`}>
                  <PostCard post={post} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 bg-card border-border">
            <CardContent>
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">
                This list is empty. Create your first post and assign it to this list.
              </p>
              <Link href="/create">
                <Button className="bg-pinterest-red hover:bg-red-700 text-white">
                  Create Post
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}