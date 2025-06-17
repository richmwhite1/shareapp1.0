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
    <div className="mt-6 p-6 bg-purple-900/20 border border-purple-700 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-purple-300" />
        <h3 className="text-lg font-semibold text-purple-300">Event RSVP</h3>
      </div>

      {/* RSVP Buttons */}
      <div className="flex gap-3 mb-4">
        <Button
          onClick={() => handleRsvp('going')}
          variant={currentStatus === 'going' ? 'default' : 'outline'}
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-2 ${
            currentStatus === 'going'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
          }`}
        >
          <Check className="h-4 w-4" />
          Going ({stats.going})
        </Button>

        <Button
          onClick={() => handleRsvp('maybe')}
          variant={currentStatus === 'maybe' ? 'default' : 'outline'}
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-2 ${
            currentStatus === 'maybe'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          Maybe ({stats.maybe})
        </Button>

        <Button
          onClick={() => handleRsvp('not_going')}
          variant={currentStatus === 'not_going' ? 'default' : 'outline'}
          size="sm"
          disabled={rsvpMutation.isPending}
          className={`flex items-center gap-2 ${
            currentStatus === 'not_going'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
          }`}
        >
          <X className="h-4 w-4" />
          Not Going ({stats.not_going})
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