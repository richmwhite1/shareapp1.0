import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, X, Search } from "lucide-react";

interface MultiSelectCollaboratorsProps {
  initialCollaborators?: Array<{
    userId: number;
    username: string;
    name: string;
    role: "collaborator" | "viewer";
  }>;
  onCollaboratorsChange: (collaborators: Array<{
    userId: number;
    username: string;
    name: string;
    role: "collaborator" | "viewer";
  }>) => void;
}

export function MultiSelectCollaborators({ 
  initialCollaborators = [], 
  onCollaboratorsChange 
}: MultiSelectCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [defaultRole, setDefaultRole] = useState<"collaborator" | "viewer">("viewer");

  // Sync collaborators with props
  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  // Notify parent of changes
  useEffect(() => {
    onCollaboratorsChange(collaborators);
  }, [collaborators, onCollaboratorsChange]);

  // Get user's connections
  const { data: userConnections = [] } = useQuery({
    queryKey: ['/api/friends'],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Search users when query is long enough
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/search/users', searchQuery],
    enabled: searchQuery.length > 2,
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Filter available users (connections + search results, excluding existing collaborators)
  const collaboratorIds = new Set(collaborators.map(c => c.userId));
  const availableUsers = [
    ...userConnections,
    ...searchResults
  ]
    .filter((user: any, index: number, array: any[]) => {
      // Remove duplicates and existing collaborators
      return user && user.id && 
             !collaboratorIds.has(user.id) &&
             array.findIndex((u: any) => u.id === user.id) === index &&
             (searchQuery.length <= 2 || 
              user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    });

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const addSelectedCollaborators = () => {
    if (selectedUsers.length === 0) return;

    const newCollaborators = selectedUsers.map(userId => {
      const user = availableUsers.find((u: any) => u.id === userId);
      return {
        userId,
        username: user?.username || 'unknown',
        name: user?.name || 'Unknown User',
        role: defaultRole
      };
    }).filter(Boolean);

    setCollaborators(prev => [...prev, ...newCollaborators]);
    setSelectedUsers([]);
    setSearchQuery("");
  };

  const removeCollaborator = (userId: number) => {
    setCollaborators(prev => prev.filter(c => c.userId !== userId));
  };

  const updateCollaboratorRole = (userId: number, newRole: "collaborator" | "viewer") => {
    setCollaborators(prev => 
      prev.map(c => c.userId === userId ? { ...c, role: newRole } : c)
    );
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Collaborators & Viewers</Label>

      {/* Current Collaborators */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Current Collaborators</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.userId}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {collaborator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{collaborator.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {collaborator.role}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Select
                    value={collaborator.role}
                    onValueChange={(value: "collaborator" | "viewer") => 
                      updateCollaboratorRole(collaborator.userId, value)
                    }
                  >
                    <SelectTrigger className="w-24 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">View</SelectItem>
                      <SelectItem value="collaborator">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(collaborator.userId)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Collaborators */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Add People</Label>
        
        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Default Role Selection */}
        <div className="flex items-center space-x-2">
          <Label className="text-xs">Default role:</Label>
          <Select value={defaultRole} onValueChange={(value: string) => setDefaultRole(value as "collaborator" | "viewer")}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="collaborator">Editor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Available Users */}
        {availableUsers.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
            {availableUsers.map((user: any) => (
              <div
                key={user.id}
                className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id) 
                    ? 'bg-accent' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => toggleUserSelection(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => {}} // Handled by parent click
                />
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.profilePictureUrl} />
                  <AvatarFallback className="text-xs">
                    {user.name?.charAt(0) || user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">{user.name || user.username}</div>
                  <div className="text-xs text-muted-foreground">@{user.username}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Selected Button */}
        {selectedUsers.length > 0 && (
          <Button
            type="button"
            onClick={addSelectedCollaborators}
            size="sm"
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add {selectedUsers.length} Selected
          </Button>
        )}

        {searchQuery.length > 2 && availableUsers.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No users found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}