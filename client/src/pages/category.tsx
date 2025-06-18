import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { getQueryFn } from "@/lib/queryClient";

import PostCard from "@/components/post-card";
import { ListPrivacyManager } from "@/components/list-privacy-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Folder, Lock, Users, Share2, Globe, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import type { ListWithPosts, PostWithUser } from "@shared/schema";

export default function CategoryPage() {
  const [match, params] = useRoute('/category/:id');
  const listId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: list, isLoading: listLoading } = useQuery<ListWithPosts>({
    queryKey: [`/api/lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: [`/api/posts/list/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const handleShareList = async () => {
    const url = `${window.location.origin}/list/${listId}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "List link copied to clipboard.",
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
    return <div>List not found</div>;
  }

  if (listLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading list...</div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">List not found</div>
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
                  {category?.privacyLevel === 'public' && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                  {category?.privacyLevel === 'connections' && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Connections
                    </Badge>
                  )}
                  {category?.privacyLevel === 'private' && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {category?.description || `${posts?.length || 0} posts in this category`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {user?.id === category?.userId && (
              <ListPrivacyManager
                listId={parseInt(categoryId!)}
                currentPrivacy={category?.privacyLevel || 'public'}
                isOwner={true}
              />
            )}
            {user?.id !== category?.userId && category?.privacyLevel === 'private' && (
              <ListPrivacyManager
                listId={parseInt(categoryId!)}
                currentPrivacy={category?.privacyLevel || 'public'}
                isOwner={false}
              />
            )}
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