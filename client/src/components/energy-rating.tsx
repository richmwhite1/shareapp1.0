import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuraColor } from "@/utils/aura";

interface EnergyRatingProps {
  postId?: number;
  profileId?: number;
  className?: string;
}

const RATING_COLORS = [
  '#8B2E2E', // 1: Dark Red
  '#D97438', // 2: Orange
  '#CC9F4C', // 3: Gold
  '#6B8E6A', // 4: Green
  '#5A8298', // 5: Blue
  '#4A4066', // 6: Purple
  '#A89EC4', // 7: Light Purple
];

export default function EnergyRating({ postId, profileId, className = "" }: EnergyRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentRating, setCurrentRating] = useState<number>(4);

  const isPost = !!postId;
  const targetId = postId || profileId;
  const endpoint = isPost ? `/api/posts/${targetId}/energy` : `/api/profiles/${targetId}/energy`;

  // Get current user's rating
  const { data: userRating } = useQuery({
    queryKey: [endpoint, 'user'],
    queryFn: async () => {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user && !!targetId,
  });

  // Get rating stats
  const { data: ratingStats } = useQuery({
    queryKey: [endpoint, 'stats'],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/stats`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!targetId,
  });

  // Rating submission mutation
  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ rating }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint, 'user'] });
      queryClient.invalidateQueries({ queryKey: [endpoint, 'stats'] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/energy/stats`] });
      toast({
        title: "Rating submitted",
        description: "Your rating has been recorded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRatingChange = (value: number[]) => {
    setCurrentRating(value[0]);
  };

  const handleRatingSubmit = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to submit ratings.",
        variant: "destructive",
      });
      return;
    }
    ratingMutation.mutate(currentRating);
  };

  const averageRating = (ratingStats as any)?.average || 4;
  const totalRatings = (ratingStats as any)?.count || 0;
  
  // Generate gradient background for slider
  const sliderGradient = `linear-gradient(to right, ${RATING_COLORS.join(', ')})`;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Rating Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">😊</span>
            <span className="text-sm font-medium text-gray-300">Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💖</span>
          </div>
        </div>
        
        <div className="relative">
          {/* Custom gradient background */}
          <div 
            className="h-2 rounded-full absolute w-full"
            style={{ background: sliderGradient }}
          />
          {/* Overlay showing current position */}
          <div 
            className="h-2 rounded-full absolute transition-all duration-200"
            style={{ 
              backgroundColor: RATING_COLORS[currentRating - 1],
              width: `${((currentRating - 1) / 6) * 100}%`
            }}
          />
          <Slider
            value={[currentRating]}
            onValueChange={handleRatingChange}
            min={1}
            max={7}
            step={1}
            className="absolute top-0 w-full h-2 z-10"
            style={{ background: 'transparent' }}
          />
        </div>

        {/* Current selection display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: RATING_COLORS[currentRating - 1] }}
            />
            <span className="text-gray-300">Level {currentRating}</span>
          </div>
        </div>

        {/* Rate button positioned lower */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleRatingSubmit}
            disabled={ratingMutation.isPending}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded transition-colors text-white"
          >
            {ratingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>

      {/* Rating Stats */}
      {totalRatings > 0 && (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getAuraColor(averageRating) }}
            />
            <span>Average: {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</span>
          </div>
        </div>
      )}
    </div>
  );
}