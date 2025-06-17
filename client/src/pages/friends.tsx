import { useState, useEffect } from "react";
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

  // Load all users on component mount
  const { data: allUsersData = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users/all'],
    queryFn: async () => {
      const response = await fetch('/api/users/all');
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
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send request",
        description: error.message || "Could not send friend request.",
        variant: "destructive",
      });
    },
  });

  // Accept friend request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('POST', `/api/friend-requests/${requestId}/respond`, { 
        action: 'accept' 
      });
    },
    onSuccess: () => {
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept request",
        description: error.message || "Could not accept friend request.",
        variant: "destructive",
      });
    },
  });

  // Reject friend request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest('POST', `/api/friend-requests/${requestId}/respond`, { 
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Please sign in to manage your friends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Friends
          </h1>

          <Tabs defaultValue="find" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="find" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find Friends
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                My Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Requests ({friendRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="find" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Find Friends</CardTitle>
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
                        filteredUsers.map((searchUser) => (
                          <div
                            key={searchUser.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage 
                                  src={searchUser.profilePictureUrl || undefined} 
                                  alt={searchUser.name}
                                />
                                <AvatarFallback>
                                  {searchUser.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {searchUser.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  @{searchUser.username}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleSendRequest(searchUser.id)}
                              disabled={sendRequestMutation.isPending}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              Add Friend
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="friends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Friends</CardTitle>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        You haven't added any friends yet. Start by searching for people!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center space-x-3 p-4 border rounded-lg"
                        >
                          <Avatar>
                            <AvatarImage 
                              src={friend.profilePictureUrl || undefined} 
                              alt={friend.name}
                            />
                            <AvatarFallback>
                              {friend.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {friend.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{friend.username}
                            </p>
                          </div>
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
                            <Avatar>
                              <AvatarImage 
                                src={request.fromUser.profilePictureUrl || undefined} 
                                alt={request.fromUser.name}
                              />
                              <AvatarFallback>
                                {request.fromUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
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