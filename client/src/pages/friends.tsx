import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Users, Check, X, Bell, Clock, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import AuricField from "@/components/auric-field";
import type { User } from "@shared/schema";

interface FriendRequest {
  id: number;
  fromUser: User;
  createdAt: Date;
}

export default function ConnectionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
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

  // Get outgoing friend requests
  const { data: outgoingRequests = [] } = useQuery<Array<{ id: number; toUser: User; createdAt: Date }>>({
    queryKey: ['/api/outgoing-friend-requests'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Load all users using the working search endpoint
  const { data: allUsersData = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/search/users', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/search/users?q=');
      if (!response.ok) throw new Error('Failed to load users');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Update filtered users when data changes
  useEffect(() => {
    if (allUsersData.length > 0) {
      setAllUsers(allUsersData);
      const filtered = allUsersData.filter((u: User) => u.id !== user?.id);
      setFilteredUsers(filtered);
    }
  }, [allUsersData, user?.id]);

  // Handle search filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers.filter((u: User) => u.id !== user?.id));
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = allUsers.filter((u: User) => 
        u.id !== user?.id && (
          u.username.toLowerCase().includes(searchLower) ||
          u.name.toLowerCase().includes(searchLower)
        )
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers, user?.id]);

  // Send follow request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: number) => {
      return apiRequest('POST', '/api/friend-request', { friendId: toUserId });
    },
    onSuccess: () => {
      toast({
        title: "Follow request sent",
        description: "Your follow request has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send request",
        description: error.message || "Could not send follow request.",
        variant: "destructive",
      });
    },
  });

  // Accept follow request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('POST', `/api/friend-request/${requestId}/respond`, { 
        action: 'accept' 
      });
    },
    onSuccess: () => {
      toast({
        title: "Follow request accepted",
        description: "You are now connected!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept request",
        description: error.message || "Could not accept follow request.",
        variant: "destructive",
      });
    },
  });

  // Reject friend request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('POST', `/api/friend-request/${requestId}/respond`, { 
        action: 'reject' 
      });
    },
    onSuccess: () => {
      toast({
        title: "Friend request rejected",
        description: "The request has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reject request",
        description: error.message || "Could not reject friend request.",
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (friendId: number) => {
      return apiRequest('DELETE', `/api/friends/${friendId}`);
    },
    onSuccess: () => {
      toast({
        title: "Connection removed",
        description: "You are no longer connected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search/users', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/outgoing-friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to unfollow",
        description: error.message || "Could not remove connection.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSendRequest = (toUserId: number) => {
    sendRequestMutation.mutate(toUserId);
  };

  const handleAcceptRequest = (requestId: number) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleRejectRequest = (requestId: number) => {
    rejectRequestMutation.mutate(requestId);
  };

  const handleUnfollow = (friendId: number) => {
    unfollowMutation.mutate(friendId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Please sign in to manage your friends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="find" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="find" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find People
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Connections ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Requests ({friendRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="find" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Find People</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search users by name or username..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {usersLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600 dark:text-gray-400">
                            {searchTerm ? 'No users found matching your search.' : 'No users available.'}
                          </p>
                        </div>
                      ) : (
                        filteredUsers.map((searchUser) => {
                          const isConnected = friends.some((f: any) => f.id === searchUser.id);
                          const hasPendingRequest = friendRequests.some(req => req.fromUser.id === searchUser.id);
                          const hasOutgoingRequest = outgoingRequests.some(req => req.toUser.id === searchUser.id);
                          
                          return (
                            <div
                              key={searchUser.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <div className="flex items-center space-x-3">
                                <AuricField profileId={searchUser.id} intensity={0.2}>
                                  <Avatar>
                                    <AvatarImage 
                                      src={searchUser.profilePictureUrl || undefined} 
                                      alt={searchUser.name}
                                    />
                                    <AvatarFallback>
                                      {searchUser.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </AuricField>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {searchUser.name}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    @{searchUser.username}
                                  </p>
                                  {isConnected && (
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                      Connected
                                    </p>
                                  )}
                                  {hasPendingRequest && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                      Request received
                                    </p>
                                  )}
                                  {hasOutgoingRequest && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                      Request sent
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isConnected ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="flex items-center gap-2"
                                >
                                  <Check className="h-4 w-4" />
                                  Connected
                                </Button>
                              ) : hasPendingRequest ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  Request Received
                                </Button>
                              ) : hasOutgoingRequest ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  Request Sent
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleSendRequest(searchUser.id)}
                                  disabled={sendRequestMutation.isPending}
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Follow
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="friends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        You haven't connected with anyone yet. Start by searching for people!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <AuricField profileId={friend.id} intensity={0.2}>
                              <Avatar>
                                <AvatarImage 
                                  src={friend.profilePictureUrl || undefined} 
                                  alt={friend.name}
                                />
                                <AvatarFallback>
                                  {friend.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </AuricField>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {friend.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                @{friend.username}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {(friend as any).relationshipStatus === 'connected' ? 'Connected' : 'Following'}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleUnfollow(friend.id)}
                            disabled={unfollowMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                          >
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Friend Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        No pending friend requests.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {friendRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <AuricField profileId={request.fromUser.id} intensity={0.2}>
                              <Avatar>
                                <AvatarImage 
                                  src={request.fromUser.profilePictureUrl || undefined} 
                                  alt={request.fromUser.name}
                                />
                                <AvatarFallback>
                                  {request.fromUser.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </AuricField>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {request.fromUser.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                @{request.fromUser.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleAcceptRequest(request.id)}
                              disabled={acceptRequestMutation.isPending}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={rejectRequestMutation.isPending}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Decline
                            </Button>
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
    </div>
  );
}