import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, X, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import type { PostWithUser, User } from "@shared/schema";

interface EventRsvpProps {
  post: PostWithUser;
}

export default function EventRsvp({ post }: EventRsvpProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showParticipants, setShowParticipants] = useState<string | null>(null);

  // Get user's current RSVP status
  const { data: userRsvp } = useQuery({
    queryKey: [`/api/posts/${post.id}/rsvp`],
    enabled: !!user,
  });

  // Get RSVP statistics
  const { data: rsvpStats } = useQuery({
    queryKey: [`/api/posts/${post.id}/rsvp/stats`],
  });

  // Get participant list for a specific status
  const { data: participants } = useQuery({
    queryKey: [`/api/posts/${post.id}/rsvp/${showParticipants}`],
    enabled: !!showParticipants,
  });

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/posts/${post.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update RSVP');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/rsvp`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/rsvp/stats`] });
      toast({
        title: "RSVP Updated",
        description: "Your response has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update RSVP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!post.isEvent || !post.allowRsvp) {
    return null;
  }

  const getRsvpButton = (status: string, icon: React.ReactNode, label: string) => {
    const isSelected = userRsvp?.status === status;
    const count = rsvpStats?.[status === 'not_going' ? 'not_going' : status] || 0;

    return (
      <Button
        onClick={() => rsvpMutation.mutate(status)}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        className={`flex items-center gap-2 ${
          isSelected 
            ? status === 'going' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : status === 'maybe'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
        }`}
        disabled={rsvpMutation.isPending}
      >
        {icon}
        {label}
        {count > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-black/20">
            {count}
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Event RSVP
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        {getRsvpButton('going', <Check className="h-4 w-4" />, 'Going')}
        {getRsvpButton('maybe', <Clock className="h-4 w-4" />, 'Maybe')}
        {getRsvpButton('not_going', <X className="h-4 w-4" />, 'Not Going')}
      </div>

      {rsvpStats && (rsvpStats.going > 0 || rsvpStats.maybe > 0 || rsvpStats.not_going > 0) && (
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          {rsvpStats.going > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={() => setShowParticipants('going')}
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {rsvpStats.going} going
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Going ({rsvpStats.going})</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants?.map((participant: { user: User; createdAt: string }) => (
                    <div key={participant.user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        {participant.user.profilePictureUrl ? (
                          <img
                            src={participant.user.profilePictureUrl}
                            alt={participant.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {participant.user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{participant.user.name}</p>
                        <p className="text-xs text-gray-500">@{participant.user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {rsvpStats.maybe > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={() => setShowParticipants('maybe')}
                  className="flex items-center gap-1 hover:text-yellow-600 transition-colors"
                >
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  {rsvpStats.maybe} maybe
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Maybe ({rsvpStats.maybe})</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants?.map((participant: { user: User; createdAt: string }) => (
                    <div key={participant.user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        {participant.user.profilePictureUrl ? (
                          <img
                            src={participant.user.profilePictureUrl}
                            alt={participant.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {participant.user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{participant.user.name}</p>
                        <p className="text-xs text-gray-500">@{participant.user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {rsvpStats.not_going > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={() => setShowParticipants('not_going')}
                  className="flex items-center gap-1 hover:text-red-600 transition-colors"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {rsvpStats.not_going} not going
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Not Going ({rsvpStats.not_going})</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {participants?.map((participant: { user: User; createdAt: string }) => (
                    <div key={participant.user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        {participant.user.profilePictureUrl ? (
                          <img
                            src={participant.user.profilePictureUrl}
                            alt={participant.user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {participant.user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{participant.user.name}</p>
                        <p className="text-xs text-gray-500">@{participant.user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}