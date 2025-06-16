import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Users, Check, X, Bell } from "lucide-react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import type { User } from "@shared/schema";

interface FriendRequest {
  id: number;
  fromUser: User;
  createdAt: Date;
}

export default function FriendsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Get current friends
  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Get friend requests
  const { data: friendRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ['/api/friend-requests'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Search users mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json() as Promise<User[]>;
    },
    onSuccess: (results) => {
      setSearchResults(results);
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Could not search for users. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: number) => {
      return apiRequest('POST', '/api/friend-request', { friendId: toUserId });
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== sendRequestMutation.variables));
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send request",
        description: error.message || "Could not send friend request.",
        variant: "destructive",
      });
    },
  });

  // Respond to friend request mutation
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'reject' }) => {
      return apiRequest('POST', `/api/friend-request/${requestId}/respond`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Request updated",
        description: "Friend request has been processed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to respond",
        description: "Could not process friend request.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchMutation.mutate(searchTerm.trim());
    }
  };

  const handleSendRequest = (userId: number) => {
    sendRequestMutation.mutate(userId);
  };

  const handleRespondToRequest = (requestId: number, action: 'accept' | 'reject') => {
    respondMutation.mutate({ requestId, action });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Sign in required</h2>
              <p className="text-gray-400">Please sign in to manage your friends.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
          <p className="text-gray-400">Connect with friends and discover new content together</p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="search" className="text-gray-300 data-[state=active]:text-white">
              <Search className="w-4 h-4 mr-2" />
              Find Friends
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-gray-300 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Requests
              {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {friendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-gray-300 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              My Friends ({friends.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Search for Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search by name or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={searchMutation.isPending || !searchTerm.trim()}
                    className="bg-pinterest-red hover:bg-red-700"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {searchResults.map((searchUser) => (
                      <div key={searchUser.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={searchUser.profilePictureUrl || undefined} />
                            <AvatarFallback className="bg-gray-600 text-white">
                              {searchUser.name?.charAt(0) || searchUser.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{searchUser.name || searchUser.username}</p>
                            <p className="text-sm text-gray-400">@{searchUser.username}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSendRequest(searchUser.id)}
                          disabled={sendRequestMutation.isPending}
                          size="sm"
                          className="bg-pinterest-red hover:bg-red-700"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Friend
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Friend Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {friendRequests.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No pending friend requests</p>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={request.fromUser.profilePictureUrl || undefined} />
                            <AvatarFallback className="bg-gray-600 text-white">
                              {request.fromUser.name?.charAt(0) || request.fromUser.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{request.fromUser.name || request.fromUser.username}</p>
                            <p className="text-sm text-gray-400">@{request.fromUser.username}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleRespondToRequest(request.id, 'accept')}
                            disabled={respondMutation.isPending}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleRespondToRequest(request.id, 'reject')}
                            disabled={respondMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">My Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No friends yet. Start by searching for people to connect with!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                        <Avatar>
                          <AvatarImage src={friend.profilePictureUrl || undefined} />
                          <AvatarFallback className="bg-gray-600 text-white">
                            {friend.name?.charAt(0) || friend.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-white">{friend.name || friend.username}</p>
                          <p className="text-sm text-gray-400">@{friend.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}