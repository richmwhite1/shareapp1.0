import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Folder, Image, Plus, Users, Lock, Trash2, Share2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CategoryWithPosts {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  postCount: number;
  firstPostImage?: string;
  posts: any[];
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts/user', user?.id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch total shares for all user posts
  const { data: totalShares = 0 } = useQuery({
    queryKey: [`/api/user/total-shares/${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated && !!user?.id,
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest('DELETE', `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      toast({
        title: "Category deleted",
        description: "Category has been deleted and posts moved to General.",
      });
    },
  });

  const handleDeleteCategory = (categoryId: number, categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    if (confirm(`Are you sure you want to delete the "${categoryName}" category? All posts will be moved to General.`)) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 bg-card border-border">
            <p className="text-foreground text-center">Please sign in to view your profile</p>
          </Card>
        </div>
      </div>
    );
  }

  if (categoriesLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-foreground">Loading your profile...</div>
        </div>
      </div>
    );
  }

  const totalPosts = userPosts.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.profilePictureUrl || ""} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xl">
                    {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    {user?.name || user?.username}
                  </h1>
                  <p className="text-muted-foreground mb-3">@{user?.username}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      <span>{totalPosts} posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Folder className="h-4 w-4" />
                      <span>{categories.length} categories</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-4 w-4" />
                      <span>{totalShares} shares</span>
                    </div>
                  </div>
                </div>
                
                <Link href="/create">
                  <Button className="bg-pinterest-red hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Your Categories</h2>
            <span className="text-sm text-muted-foreground">
              Organize your posts into collections
            </span>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {/* User Categories */}
              {categories.filter((cat: any) => cat && cat.id && cat.name && cat.name.trim()).map((category: CategoryWithPosts) => (
                <Card 
                  key={category.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 bg-card border-border hover:border-pinterest-red/50"
                  onClick={() => setLocation(`/category/${category.id}`)}
                >
                  <CardContent className="p-2">
                    <div className="aspect-square rounded bg-secondary flex items-center justify-center mb-1 relative overflow-hidden">
                      {category.firstPostImage ? (
                        <img 
                          src={category.firstPostImage} 
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Folder className="h-2 w-2 text-muted-foreground group-hover:text-pinterest-red transition-colors" />
                      )}
                      
                      {/* Post count badge */}
                      <div className="absolute top-1 right-1">
                        <div className="w-3 h-3 bg-pinterest-red rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-white font-medium">
                            {category.postCount}
                          </span>
                        </div>
                      </div>
                      
                      {/* Privacy indicator */}
                      {!category.isPublic && (
                        <div className="absolute bottom-1 left-1">
                          <Lock className="h-2 w-2 text-muted-foreground" />
                        </div>
                      )}

                      {/* Delete button */}
                      <div className="absolute bottom-1 right-1">
                        <Button
                          onClick={(e) => handleDeleteCategory(category.id, category.name, e)}
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                    
                    <h3 className="text-xs font-medium text-foreground truncate group-hover:text-pinterest-red transition-colors">
                      {category.name}
                    </h3>
                  </CardContent>
                </Card>
              ))}
              
              {/* Create New Category Card */}
              <Link href="/create">
                <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 bg-card border-border border-dashed hover:border-pinterest-red/50">
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center mb-3 border-2 border-dashed border-muted">
                      <Plus className="h-8 w-8 text-muted-foreground group-hover:text-pinterest-red transition-colors" />
                    </div>
                    <h3 className="font-medium text-muted-foreground group-hover:text-pinterest-red transition-colors text-center">
                      New Category
                    </h3>
                    <p className="text-xs text-muted-foreground text-center">
                      Create when posting
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ) : (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-8 text-center">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Categories Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first category when you post content to organize your collection
                </p>
                <Link href="/create">
                  <Button className="bg-pinterest-red hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Post
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Posts Preview */}
        {userPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Recent Posts</h2>
              <span className="text-sm text-muted-foreground">
                Latest content from all categories
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {userPosts.slice(0, 10).map((post: any) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 bg-card border-border">
                    <CardContent className="p-0">
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        <img 
                          src={post.primaryPhotoUrl} 
                          alt={post.primaryDescription}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {post.category && (
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-black/50 text-white text-xs rounded">
                              {post.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-foreground line-clamp-2 group-hover:text-pinterest-red transition-colors">
                          {post.primaryDescription}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}