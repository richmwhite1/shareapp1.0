import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Hash, TrendingUp, X, SortAsc } from "lucide-react";
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hashtag Input */}
        <Card className="mb-8">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Type hashtags and press Enter or Space (up to 10)"
                  className="pl-10 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  disabled={selectedHashtags.length >= 10}
                />
              </div>
              
              {/* Selected Hashtags */}
              {selectedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {selectedHashtags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 bg-pinterest-red text-white hover:bg-red-700"
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
            </div>


          </CardContent>
        </Card>

        {/* My Hashtags */}
        {followedHashtags && followedHashtags.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Following
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {followedHashtags.map((hashtag: any) => (
                  <div key={hashtag.id} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHashtagClick(hashtag.name)}
                      className="flex items-center gap-1 hover:bg-pinterest-red hover:text-white"
                      disabled={selectedHashtags.includes(hashtag.name)}
                    >
                      <Hash className="h-3 w-3" />
                      {hashtag.name}
                      <Badge variant="secondary" className="ml-1">
                        {hashtag.count}
                      </Badge>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unfollowHashtag(hashtag.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                        className="flex items-center gap-1 hover:bg-pinterest-red hover:text-white"
                        disabled={selectedHashtags.includes(hashtag.name)}
                      >
                        <Hash className="h-3 w-3" />
                        {hashtag.name}
                        <Badge variant="secondary" className="ml-1">
                          {hashtag.count}
                        </Badge>
                      </Button>
                      <Button
                        variant={isFollowing ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleFollow}
                        className={`h-8 w-8 p-0 ${isFollowing ? 'bg-pinterest-red hover:bg-red-700 text-white' : 'hover:bg-pinterest-red hover:text-white'}`}
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
        </Card>

        {/* Search Results */}
        {selectedHashtags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SearchIcon className="h-5 w-5" />
                  Search Results
                  {searchResults && (
                    <Badge variant="secondary">
                      {searchResults.length} posts found
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={(value: "popular" | "recent") => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="recent">Most Recent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Searching posts...</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No posts found containing ALL selected hashtags.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Posts must contain every hashtag you've selected to appear in results.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}


      </div>
    </div>
  );
}