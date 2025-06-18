import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Simple fetch wrapper for collaborator operations
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
};

interface ListCollaboratorsProps {
  listId?: number;
  initialCollaborators?: Array<{
    userId: number;
    username: string;
    name: string;
    role: "collaborator" | "viewer";
  }>;
  onCollaboratorsChange?: (collaborators: Array<{
    userId: number;
    username: string;
    name: string;
    role: "collaborator" | "viewer";
  }>) => void;
  showTitle?: boolean;
}

export function ListCollaborators({ 
  listId, 
  initialCollaborators = [], 
  onCollaboratorsChange,
  showTitle = true 
}: ListCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"collaborator" | "viewer">("viewer");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's connections
  const { data: userConnections } = useQuery({
    queryKey: ['/api/friends'],
  });

  // Search users
  const { data: searchResults } = useQuery({
    queryKey: ['/api/search/users', searchQuery],
    enabled: searchQuery.length > 2
  });

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async (data: { userId: number; role: "collaborator" | "viewer" }) => {
      if (listId) {
        const response = await fetchWithAuth(`/api/lists/${listId}/collaborators`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error('Failed to add collaborator');
        }
        return response.json();
      }
      return data;
    },
    onSuccess: (data) => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access'] });
      }
      setSelectedUserId("");
      setSelectedRole("viewer");
      toast({
        title: "Success",
        description: "Collaborator added successfully"
      });
    },
    onError: (error) => {
      console.error('Add collaborator error:', error);
      toast({
        title: "Error",
        description: "Failed to add collaborator",
        variant: "destructive"
      });
    }
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (listId) {
        const response = await fetchWithAuth(`/api/lists/${listId}/collaborators/${userId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to remove collaborator');
        }
        return response.json();
      }
      return userId;
    },
    onSuccess: () => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: ['/api/lists', listId, 'access'] });
      }
      toast({
        title: "Success",
        description: "Collaborator removed successfully"
      });
    },
    onError: (error) => {
      console.error('Remove collaborator error:', error);
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive"
      });
    }
  });

  const handleAddCollaborator = () => {
    if (!selectedUserId || addCollaboratorMutation.isPending) return;

    const userId = parseInt(selectedUserId);
    if (isNaN(userId)) {
      toast({
        title: "Error",
        description: "Invalid user selection",
        variant: "destructive"
      });
      return;
    }

    // Check if user is already a collaborator
    const existingCollaborator = collaborators.find(c => c.userId === userId);
    if (existingCollaborator) {
      toast({
        title: "Error",
        description: "User is already a collaborator",
        variant: "destructive"
      });
      return;
    }

    let selectedUser: any = null;

    // Find user in connections or search results
    if (userConnections && Array.isArray(userConnections)) {
      selectedUser = userConnections.find((c: any) => c.id === userId);
    }
    
    if (!selectedUser && searchResults && Array.isArray(searchResults)) {
      selectedUser = searchResults.find((u: any) => u.id === userId);
    }

    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Selected user not found",
        variant: "destructive"
      });
      return;
    }

    const newCollaborator = {
      userId,
      username: selectedUser.username || 'unknown',
      name: selectedUser.name || 'Unknown User',
      role: selectedRole
    };

    if (listId) {
      // For existing lists, use API
      addCollaboratorMutation.mutate({ userId, role: selectedRole });
    } else {
      // For new lists, update local state
      const updatedCollaborators = [...collaborators, newCollaborator];
      setCollaborators(updatedCollaborators);
      onCollaboratorsChange?.(updatedCollaborators);
      setSelectedUserId("");
      setSelectedRole("viewer");
      toast({
        title: "Success",
        description: "Collaborator added successfully"
      });
    }
  };

  const handleRemoveCollaborator = (userId: number) => {
    if (listId) {
      // For existing lists, use API
      removeCollaboratorMutation.mutate(userId);
    } else {
      // For new lists, update local state
      const updatedCollaborators = collaborators.filter(c => c.userId !== userId);
      setCollaborators(updatedCollaborators);
      onCollaboratorsChange?.(updatedCollaborators);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'collaborator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'viewer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>List Collaborators</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {/* Add Collaborator Section */}
          <div className="space-y-4">
            {/* Show Connections First */}
            {userConnections && Array.isArray(userConnections) && userConnections.length > 0 ? (
              <div className="space-y-2">
                <Label>Your Connections</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connection to invite" />
                  </SelectTrigger>
                  <SelectContent>
                    {userConnections
                      .filter((c: any) => c && c.id && !collaborators.some(collab => collab.userId === c.id))
                      .map((connection: any) => (
                        <SelectItem key={connection.id} value={connection.id.toString()}>
                          @{connection.username || 'unknown'} ({connection.name || 'Unknown User'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div>
              <Label htmlFor="search">Or Search Other Users</Label>
              <Input
                id="search"
                placeholder="Type username to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchResults && Array.isArray(searchResults) && searchResults.length > 0 ? (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from search results" />
                  </SelectTrigger>
                  <SelectContent>
                    {searchResults
                      .filter((u: any) => u && u.id && !collaborators.some(collab => collab.userId === u.id))
                      .map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          @{user.username || 'unknown'} ({user.name || 'Unknown User'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(value: "collaborator" | "viewer") => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (can view)</SelectItem>
                  <SelectItem value="collaborator">Collaborator (can edit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="button"
              onClick={handleAddCollaborator}
              disabled={!selectedUserId || addCollaboratorMutation.isPending}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {addCollaboratorMutation.isPending ? "Adding..." : "Add Collaborator"}
            </Button>
          </div>

          {/* Current Collaborators */}
          {collaborators.length > 0 && (
            <div className="space-y-3">
              <Label>Current Collaborators</Label>
              {collaborators.map((collaborator) => (
                <div key={collaborator.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">@{collaborator.username}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{collaborator.name}</div>
                    </div>
                    <Badge className={getRoleBadgeColor(collaborator.role)}>
                      {collaborator.role}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCollaborator(collaborator.userId)}
                    disabled={removeCollaboratorMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}