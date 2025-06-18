import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ListInvitation {
  id: number;
  listId: number;
  role: string;
  status: string;
  list: {
    id: number;
    name: string;
    description?: string;
  };
  invitedBy: {
    id: number;
    username: string;
    name: string;
    profilePictureUrl?: string;
  };
}

export default function ListInvitationNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending list invitations
  const { data: invitations = [], isLoading } = useQuery<ListInvitation[]>({
    queryKey: ['/api/user/list-invitations'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000, // Check for new invitations every 30 seconds
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest('POST', `/api/lists/${listId}/accept`);
    },
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/list-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/lists/user`] });
      toast({
        title: "Invitation accepted",
        description: "You now have access to this private list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept invitation.",
        variant: "destructive",
      });
    },
  });

  // Reject invitation mutation
  const rejectMutation = useMutation({
    mutationFn: async (listId: number) => {
      return apiRequest('POST', `/api/lists/${listId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/list-invitations'] });
      toast({
        title: "Invitation rejected",
        description: "The invitation has been declined.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject invitation.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (listId: number) => {
    acceptMutation.mutate(listId);
  };

  const handleReject = (listId: number) => {
    rejectMutation.mutate(listId);
  };

  if (isLoading) return null;

  if (invitations.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          List Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={invitation.invitedBy.profilePictureUrl} />
                  <AvatarFallback>
                    {invitation.invitedBy.name?.charAt(0) || invitation.invitedBy.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    <span className="text-blue-600 dark:text-blue-400">
                      @{invitation.invitedBy.username}
                    </span>
                    {" "}invited you to collaborate on{" "}
                    <span className="font-semibold">"{invitation.list.name}"</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Role: <Badge variant="outline" className="text-xs">{invitation.role}</Badge>
                    {invitation.list.description && (
                      <span className="ml-2">• {invitation.list.description}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.listId)}
                  disabled={acceptMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invitation.listId)}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}