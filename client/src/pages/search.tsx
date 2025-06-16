import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Hash, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth.tsx";
import PostCard from "@/components/post-card";
import Header from "@/components/header";
import { Link, useLocation } from "wouter";

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Handle URL parameters for direct hashtag navigation
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const hashtagParam = params.get('hashtag');
    if (hashtagParam) {
      setSearchTerm(`#${hashtagParam}`);
      setSearchQuery(hashtagParam);
    }
  }, [location]);

  // Search posts by hashtag
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/hashtags', searchQuery, 'posts'],
    queryFn: async () => {
      const response = await fetch(`/api/hashtags/${searchQuery}/posts`);
      if (!response.ok) throw new Error('Failed to search posts');
      return response.json();
    },
    enabled: !!searchQuery,
  });

  // Get trending hashtags
  const { data: trendingHashtags } = useQuery({
    queryKey: ['/api/hashtags/trending'],
    queryFn: async () => {
      const response = await fetch('/api/hashtags/trending');
      if (!response.ok) throw new Error('Failed to fetch trending hashtags');
      return response.json();
    },
    select: (data: any) => Array.isArray(data) ? data.slice(0, 10) : [],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const hashtag = searchTerm.replace('#', '').toLowerCase();
      setSearchQuery(hashtag);
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    setSearchTerm(`#${hashtag}`);
    setSearchQuery(hashtag);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please sign in to search posts.
              </p>
              <Button 
                asChild
                className="w-full mt-4 bg-pinterest-red hover:bg-red-700"
              >
                <Link href="/auth">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pinterest-red">
              <SearchIcon className="h-6 w-6" />
              Search Posts by Hashtag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter hashtag (e.g., #travel, #food)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                type="submit" 
                disabled={!searchTerm.trim() || isSearching}
                className="bg-pinterest-red hover:bg-red-700"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Search for posts containing specific hashtags to discover content
            </p>
          </CardContent>
        </Card>

        {/* Trending Hashtags */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(trendingHashtags) && trendingHashtags.length > 0 ? (
                trendingHashtags.map((hashtag: any) => (
                  <Badge
                    key={hashtag.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-pinterest-red hover:text-white transition-colors"
                    onClick={() => handleHashtagClick(hashtag.name)}
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {hashtag.name} ({hashtag.count})
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No trending hashtags yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Results for #{searchQuery}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Searching posts...</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid gap-0">
                  {searchResults.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No posts found for #{searchQuery}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try searching for a different hashtag or browse trending hashtags above
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!searchQuery && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Discover Content with Hashtags</h3>
                  <p className="text-muted-foreground">
                    Search for specific hashtags to find posts about topics you're interested in.
                    Click on trending hashtags above or type your own search term.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}