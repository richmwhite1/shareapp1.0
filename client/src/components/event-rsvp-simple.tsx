import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import type { PostWithUser } from "@shared/schema";

interface EventRsvpProps {
  post: PostWithUser;
}

export default function EventRsvp({ post }: EventRsvpProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's current RSVP status
  const { data: userRsvp } = useQuery({
    queryKey: [`/api/posts/${post.id}/rsvp`],
    enabled: !!user,
  });

  // Get RSVP statistics
  const { data: rsvpStats } = useQuery({
    queryKey: [`/api/posts/${post.id}/rsvp/stats`],
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
        title: "RSVP updated",
        description: "Your response has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRsvp = (status: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to RSVP to events.",
        variant: "destructive",
      });
      return;
    }
    rsvpMutation.mutate(status);
  };

  const currentStatus = userRsvp?.status;
  const stats = rsvpStats || { going: 0, maybe: 0, not_going: 0 };

  return (
    <div className="mt-4 px-4 py-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">RSVP</span>
      </div>

      {/* RSVP Buttons */}
      <div className="flex gap-2 mb-3">
        <Button
          onClick={() => handleRsvp('going')}
          variant="ghost"
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-1 text-xs px-3 py-1 ${
            currentStatus === 'going'
              ? 'bg-green-700/30 text-green-300 hover:bg-green-700/40'
              : 'text-gray-400 hover:text-green-300 hover:bg-green-700/20'
          }`}
        >
          <Check className="h-3 w-3" />
          Going {stats.going > 0 && `(${stats.going})`}
        </Button>

        <Button
          onClick={() => handleRsvp('maybe')}
          variant="ghost"
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-1 text-xs px-3 py-1 ${
            currentStatus === 'maybe'
              ? 'bg-yellow-700/30 text-yellow-300 hover:bg-yellow-700/40'
              : 'text-gray-400 hover:text-yellow-300 hover:bg-yellow-700/20'
          }`}
        >
          <Clock className="h-3 w-3" />
          Maybe {stats.maybe > 0 && `(${stats.maybe})`}
        </Button>

        <Button
          onClick={() => handleRsvp('not_going')}
          variant="ghost"
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-1 text-xs px-3 py-1 ${
            currentStatus === 'not_going'
              ? 'bg-red-700/30 text-red-300 hover:bg-red-700/40'
              : 'text-gray-400 hover:text-red-300 hover:bg-red-700/20'
          }`}
        >
          <X className="h-3 w-3" />
          Can't Go {stats.not_going > 0 && `(${stats.not_going})`}
        </Button>
      </div>

      {/* Current Status Display */}
      {currentStatus && (
        <div className="text-sm text-gray-300">
          You responded: <span className="font-medium text-white capitalize">{currentStatus.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}