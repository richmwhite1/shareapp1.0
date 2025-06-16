import { useAuth } from "@/lib/auth.tsx";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Home, User, Search, Bell, Users, Hash } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const { user, signOut, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch trending hashtags
  const { data: trendingHashtags } = useQuery({
    queryKey: ['/api/hashtags/trending'],
    select: (data: any) => data?.slice(0, 5) || [],
  });

  // Search users
  const { data: searchResults } = useQuery({
    queryKey: ['/api/users/search', searchTerm],
    enabled: searchTerm.length >= 2,
  });

  return (
    <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-yellow-400 cursor-pointer">
                Love
              </h1>
            </Link>
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search friends or #hashtags"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-yellow-400"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults && Array.isArray(searchResults) && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-md mt-1 max-h-64 overflow-y-auto z-50">
                  {(searchResults as any[]).map((user: any) => (
                    <Link key={user.id} href={`/profile/${user.id}`}>
                      <div className="flex items-center p-3 hover:bg-gray-700 cursor-pointer">
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarImage src={user.profilePictureUrl || undefined} />
                          <AvatarFallback className="bg-gray-600 text-white">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-sm text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation and Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Search */}
                <Link href="/search">
                  <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800">
                    <Search className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </Link>

                {/* Trending Hashtags */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800">
                      <Hash className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Trending</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700">
                    {Array.isArray(trendingHashtags) && trendingHashtags.map((hashtag: any) => (
                      <Link key={hashtag.id} href={`/search?hashtag=${hashtag.name}`}>
                        <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                          <Hash className="w-3 h-3 mr-2" />
                          {hashtag.name} ({hashtag.count})
                        </DropdownMenuItem>
                      </Link>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Friends */}
                <Link href="/friends">
                  <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Friends</span>
                  </Button>
                </Link>

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800 relative">
                      <Bell className="w-4 h-4" />
                      {(unreadCount as any)?.count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                          {(unreadCount as any).count}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700 w-80">
                    <DropdownMenuItem disabled className="text-white font-medium">
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <Link href="/notifications">
                      <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                        View All Notifications
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link href="/create">
                  <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-colors">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create</span>
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 rounded-full p-2 transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.profilePictureUrl || undefined} />
                        <AvatarFallback className="bg-gray-600 text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-white hidden sm:block">
                        {user?.name}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem disabled>
                      <span className="font-medium text-white">{user?.name}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <span className="text-sm text-gray-400">@{user?.username}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <Link href="/profile">
                      <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/tagged">
                      <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                        Tagged Posts
                      </DropdownMenuItem>
                    </Link>
                    {user?.username === 'stickles' && (
                      <Link href="/admin">
                        <DropdownMenuItem className="text-yellow-400 hover:bg-gray-700 cursor-pointer">
                          Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem onClick={signOut} className="text-white hover:bg-gray-700 cursor-pointer">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/auth">
                <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-colors">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
