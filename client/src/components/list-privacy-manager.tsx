import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, UserPlus, Trash2, Check, X, Eye, Edit } from "lucide-react";

interface ListPrivacyManagerProps {
  listId: number;
  currentPrivacy: string;
  isOwner: boolean;
}

export function ListPrivacyManager({ listId, currentPrivacy, isOwner }: ListPrivacyManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"collaborator" | "viewer">("collaborator");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get list access information
  const { data: listAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['/api/lists', listId, 'access'],
    enabled: isOwner
  });

  // Get access requests
  const { data: accessRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/lists', listId, 'access-requests'],
    enabled: isOwner
  });

  // Search users for invitations
  const { data: searchResults } = useQuery({
    queryKey: ['/api/search/users', searchQuery],
    enabled: searchQuery.length > 2
  });

  // Update privacy mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: (privacyLevel: string) =>
      apiRequest('PUT', `/api/lists/${listId}/privacy`, { privacyLevel }),
    onSuccess: () => {
      toast({ title: "Privacy updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
    },
    onError: () => {
      toast({ title: "Failed to update privacy", variant: "destructive" });
    }
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiRequest(`/api/lists/${listId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userId, role })
      }),
    onSuccess: () => {
      toast({ title: "Invitation sent successfully" });
      setSelectedUserId("");
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access'] });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    }
  });

  // Remove access mutation
  const removeAccessMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/lists/${listId}/access/${userId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({ title: "Access removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access'] });
    },
    onError: () => {
      toast({ title: "Failed to remove access", variant: "destructive" });
    }
  });

  // Respond to access request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: number; action: string }) =>
      apiRequest(`/api/access-requests/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action })
      }),
    onSuccess: () => {
      toast({ title: "Request responded to successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access'] });
    },
    onError: () => {
      toast({ title: "Failed to respond to request", variant: "destructive" });
    }
  });

  // Request access mutation (for non-owners)
  const requestAccessMutation = useMutation({
    mutationFn: ({ requestedRole, message }: { requestedRole: string; message?: string }) =>
      apiRequest(`/api/lists/${listId}/request-access`, {
        method: 'POST',
        body: JSON.stringify({ requestedRole, message })
      }),
    onSuccess: () => {
      toast({ title: "Access request sent successfully" });
      setRequestMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send access request", variant: "destructive" });
    }
  });

  const handlePrivacyChange = (privacyLevel: string) => {
    updatePrivacyMutation.mutate(privacyLevel);
  };

  const handleInviteUser = () => {
    if (!selectedUserId) return;
    inviteUserMutation.mutate({
      userId: parseInt(selectedUserId),
      role: selectedRole
    });
  };

  const handleRemoveAccess = (userId: number) => {
    removeAccessMutation.mutate(userId);
  };

  const handleRespondToRequest = (requestId: number, action: string) => {
    respondToRequestMutation.mutate({ requestId, action });
  };

  const handleRequestAccess = () => {
    requestAccessMutation.mutate({
      requestedRole: selectedRole,
      message: requestMessage
    });
  };

  const getPrivacyBadgeColor = (privacy: string) => {
    switch (privacy) {
      case 'public': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'connections': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'private': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'collaborator': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'viewer': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'owner': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!isOwner && currentPrivacy !== 'private') {
    return null; // Only show for owners or when requesting access to private lists
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          {isOwner ? 'Manage Access' : 'Request Access'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isOwner ? 'List Privacy & Collaboration' : 'Request List Access'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isOwner && (
            <>
              {/* Privacy Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Level</CardTitle>
                  <CardDescription>
                    Control who can see and access this list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge className={getPrivacyBadgeColor(currentPrivacy)}>
                        {currentPrivacy.charAt(0).toUpperCase() + currentPrivacy.slice(1)}
                      </Badge>
                      <Select
                        value={currentPrivacy}
                        onValueChange={handlePrivacyChange}
                        disabled={updatePrivacyMutation.isPending}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public - Anyone can see</SelectItem>
                          <SelectItem value="connections">Connections - Only friends can see</SelectItem>
                          <SelectItem value="private">Private - Invite only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {currentPrivacy === 'public' && "Anyone can view this list and its posts"}
                      {currentPrivacy === 'connections' && "Only your connections (friends) can view this list"}
                      {currentPrivacy === 'private' && "Only invited users can view this list"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collaboration (Private Lists Only) */}
              {currentPrivacy === 'private' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Invite Collaborators</CardTitle>
                      <CardDescription>
                        Add people to collaborate on this private list
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="search">Search Users</Label>
                          <Input
                            id="search"
                            placeholder="Type username to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>

                        {searchResults && searchResults.length > 0 && (
                          <div className="space-y-2">
                            <Label>Select User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a user" />
                              </SelectTrigger>
                              <SelectContent>
                                {searchResults.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    @{user.username} ({user.name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label>Role</Label>
                          <Select value={selectedRole} onValueChange={(value: "collaborator" | "viewer") => setSelectedRole(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="collaborator">
                                <div className="flex items-center gap-2">
                                  <Edit className="w-4 h-4" />
                                  Collaborator - Can add/edit posts
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Viewer - Can only view posts
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          onClick={handleInviteUser}
                          disabled={!selectedUserId || inviteUserMutation.isPending}
                          className="w-full"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Send Invitation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current Access */}
                  {listAccess && listAccess.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Access</CardTitle>
                        <CardDescription>
                          People who have access to this list
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {listAccess.map((access: any) => (
                            <div key={access.userId} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium">@{access.user.username}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">{access.user.name}</div>
                                </div>
                                <Badge className={getRoleBadgeColor(access.role)}>
                                  {access.role}
                                </Badge>
                                <Badge variant="outline">
                                  {access.status}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAccess(access.userId)}
                                disabled={removeAccessMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Access Requests */}
                  {accessRequests && accessRequests.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Access Requests</CardTitle>
                        <CardDescription>
                          People requesting access to this list
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {accessRequests.map((request: any) => (
                            <div key={request.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-medium">@{request.user.username}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">{request.user.name}</div>
                                  </div>
                                  <Badge className={getRoleBadgeColor(request.requestedRole)}>
                                    {request.requestedRole}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRespondToRequest(request.id, 'approve')}
                                    disabled={respondToRequestMutation.isPending}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRespondToRequest(request.id, 'reject')}
                                    disabled={respondToRequestMutation.isPending}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              {request.message && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                  "{request.message}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Request Access (Non-owners for private lists) */}
          {!isOwner && currentPrivacy === 'private' && (
            <Card>
              <CardHeader>
                <CardTitle>Request Access</CardTitle>
                <CardDescription>
                  This is a private list. Request access from the owner.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Requested Role</Label>
                    <Select value={selectedRole} onValueChange={(value: "collaborator" | "viewer") => setSelectedRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborator">
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Collaborator - Can add/edit posts
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Viewer - Can only view posts
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell the owner why you'd like access..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleRequestAccess}
                    disabled={requestAccessMutation.isPending}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Request Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}