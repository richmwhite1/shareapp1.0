import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Hash, TrendingUp, X, SortAsc, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import PostCard from "@/components/post-card";

import { Link, useLocation } from "wouter";

export default function SearchPage() {
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"popular" | "recent">("popular");
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(false);
  const [isFollowingExpanded, setIsFollowingExpanded] = useState(false);
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Handle URL parameters for direct hashtag navigation
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const hashtagParam = params.get('hashtag');
    if (hashtagParam && !selectedHashtags.includes(hashtagParam)) {
      setSelectedHashtags(prev => [...prev, hashtagParam]);
      setHashtagInput('#' + hashtagParam); // Also populate the input field
      // Clear the URL parameter after processing
      if (window.history.replaceState) {
        window.history.replaceState({}, '', '/search');
      }
    }
  }, [location]);

  // Hashtag input handling
  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').toLowerCase().trim();
    if (cleanTag && !selectedHashtags.includes(cleanTag) && selectedHashtags.length < 10) {
      setSelectedHashtags(prev => [...prev, cleanTag]);
    }
  };

  const removeHashtag = (tag: string) => {
    setSelectedHashtags(prev => prev.filter(t => t !== tag));
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hashtagInput.trim()) {
        addHashtag(hashtagInput.trim());
        setHashtagInput('');
      }
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    addHashtag(hashtag);
  };

  // Search posts by multiple hashtags
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search/hashtags', selectedHashtags, sortBy],
    queryFn: async () => {
      if (selectedHashtags.length === 0) return [];
      
      const hashtagsParam = selectedHashtags.join(',');
      const response = await fetch(`/api/search/hashtags?tags=${hashtagsParam}&sort=${sortBy}`);
      if (!response.ok) throw new Error('Failed to search posts');
      return response.json();
    },
    enabled: selectedHashtags.length > 0,
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

  // Get followed hashtags
  const { data: followedHashtags, refetch: refetchFollowed } = useQuery({
    queryKey: ['/api/hashtags/followed'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/hashtags/followed', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch followed hashtags');
      return response.json();
    },
    select: (data: any) => Array.isArray(data) ? data.slice(0, 30) : [],
    enabled: isAuthenticated,
  });

  // Follow/unfollow hashtag
  const followHashtag = async (hashtagId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hashtags/${hashtagId}/follow`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (response.ok) {
        refetchFollowed();
      }
    } catch (error) {
      console.error('Failed to follow hashtag:', error);
    }
  };

  const unfollowHashtag = async (hashtagId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hashtags/${hashtagId}/follow`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (response.ok) {
        refetchFollowed();
      }
    } catch (error) {
      console.error('Failed to unfollow hashtag:', error);
    }
  };

  // Check if following hashtag
  const useIsFollowingHashtag = (hashtagId: number) => {
    return useQuery({
      queryKey: ['/api/hashtags', hashtagId, 'following'],
      queryFn: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/hashtags/${hashtagId}/following`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include'
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data.isFollowing;
      },
      enabled: isAuthenticated && !!hashtagId,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="container mx-auto px-4 py-2 max-w-4xl">
        {/* Compact Search Input */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative mb-3">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Type hashtags and press Enter or Space"
                className="pl-10 h-10 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                disabled={selectedHashtags.length >= 10}
              />
            </div>
            
            {/* Selected Tags */}
            {selectedHashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                {selectedHashtags.map((tag, index) => (
                  <Badge
                    key={index}
                    className="flex items-center gap-1 h-6 px-2 text-sm bg-pinterest-red text-white hover:bg-red-700"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHashtag(tag)}
                      className="h-4 w-4 p-0 ml-1 hover:bg-red-700 text-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Following & Trending Hashtags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Following Hashtags */}
          {followedHashtags && followedHashtags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Following
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFollowingExpanded(!isFollowingExpanded)}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                  >
                    {isFollowingExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {isFollowingExpanded && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {followedHashtags.map((hashtag: any) => (
                      <div key={hashtag.id} className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHashtagClick(hashtag.name)}
                          className="h-7 px-2 text-sm flex items-center gap-1 hover:bg-pinterest-red hover:text-white"
                          disabled={selectedHashtags.includes(hashtag.name)}
                        >
                          <Hash className="h-3 w-3" />
                          {hashtag.name}
                          <span className="ml-1 text-xs opacity-70">{hashtag.count}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unfollowHashtag(hashtag.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Trending Hashtags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTrendingExpanded(!isTrendingExpanded)}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                >
                  {isTrendingExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {isTrendingExpanded && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(trendingHashtags) && trendingHashtags.map((hashtag: any) => {
                  const FollowButton = () => {
                    const { data: isFollowing, refetch } = useIsFollowingHashtag(hashtag.id);
                    
                    const handleToggleFollow = async () => {
                      if (isFollowing) {
                        await unfollowHashtag(hashtag.id);
                      } else {
                        await followHashtag(hashtag.id);
                      }
                      refetch();
                    };

                    return (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHashtagClick(hashtag.name)}
                          className="h-7 px-2 text-sm flex items-center gap-1 hover:bg-pinterest-red hover:text-white"
                          disabled={selectedHashtags.includes(hashtag.name)}
                        >
                          <Hash className="h-3 w-3" />
                          {hashtag.name}
                          <span className="ml-1 text-xs opacity-70">{hashtag.count}</span>
                        </Button>
                        <Button
                          variant={isFollowing ? "default" : "outline"}
                          size="sm"
                          onClick={handleToggleFollow}
                          className={`h-7 w-7 p-0 text-sm ${isFollowing ? 'bg-pinterest-red hover:bg-red-700 text-white' : 'hover:bg-pinterest-red hover:text-white'}`}
                        >
                          {isFollowing ? '✓' : '+'}
                        </Button>
                      </div>
                    );
                  };

                  return <FollowButton key={hashtag.id} />;
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Compact Search Results */}
        {selectedHashtags.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Results</span>
                {searchResults && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {searchResults.length}
                  </Badge>
                )}
              </div>
              <Select value={sortBy} onValueChange={(value: "popular" | "recent") => setSortBy(value)}>
                <SelectTrigger className="w-24 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isSearching ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No posts found with selected hashtags
                </p>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}