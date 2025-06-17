import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";

interface EnergyRatingProps {
  postId?: number;
  profileId?: number;
  className?: string;
}

// Chakra colors and emojis for the 7-point scale
const CHAKRA_COLORS = [
  '#FF0000', // 1 - Root Chakra (Red)
  '#FF8C00', // 2 - Sacral Chakra (Orange)
  '#FFD700', // 3 - Solar Plexus (Yellow)
  '#00FF00', // 4 - Heart Chakra (Green)
  '#00BFFF', // 5 - Throat Chakra (Blue)
  '#4B0082', // 6 - Third Eye (Indigo)
  '#8A2BE2'  // 7 - Crown Chakra (Violet)
];

const ENERGY_EMOJIS = [
  '😐', // 1 - Neutral/Flat
  '😊', // 2 - Slightly positive
  '😄', // 3 - Happy
  '😍', // 4 - Love/Heart energy
  '🤩', // 5 - Star-struck
  '✨', // 6 - Sparkles/mystical
  '🔮'  // 7 - Crystal ball/highest energy
];

const AURA_LEVELS = [
  'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7'
];

export default function EnergyRating({ postId, profileId, className = "" }: EnergyRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentRating, setCurrentRating] = useState<number>(4); // Default to heart chakra

  const isPost = !!postId;
  const targetId = postId || profileId;
  const endpoint = isPost ? `/api/posts/${targetId}/energy` : `/api/profiles/${targetId}/energy`;

  // Get current user's rating
  const { data: userRating } = useQuery({
    queryKey: [endpoint, 'user'],
    enabled: !!user && !!targetId,
  });

  // Get average rating stats
  const { data: ratingStats } = useQuery({
    queryKey: [endpoint, 'stats'],
    enabled: !!targetId,
  });

  // Rating mutation
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
      toast({
        title: "Aura rating submitted",
        description: `You rated this ${AURA_LEVELS[currentRating - 1]} aura`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit energy rating. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRatingChange = (value: number[]) => {
    const rating = value[0];
    setCurrentRating(rating);
  };

  const handleRatingSubmit = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to rate energy levels.",
        variant: "destructive",
      });
      return;
    }
    ratingMutation.mutate(currentRating);
  };

  const averageRating = (ratingStats as any)?.average || 4;
  const totalRatings = (ratingStats as any)?.count || 0;
  
  // Generate gradient background for slider
  const sliderGradient = `linear-gradient(to right, ${CHAKRA_COLORS.join(', ')})`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Energy Rating Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Aura</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{ENERGY_EMOJIS[0]}</span>
            <span className="text-lg">{ENERGY_EMOJIS[6]}</span>
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
              backgroundColor: CHAKRA_COLORS[currentRating - 1],
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
              style={{ backgroundColor: CHAKRA_COLORS[currentRating - 1] }}
            />
            <span className="text-gray-300">
              {ENERGY_EMOJIS[currentRating - 1]}
            </span>
          </div>
          <button
            onClick={handleRatingSubmit}
            disabled={ratingMutation.isPending}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors text-white"
          >
            {ratingMutation.isPending ? 'Rating...' : 'Rate'}
          </button>
        </div>
      </div>

      {/* Rating Stats */}
      {totalRatings > 0 && (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CHAKRA_COLORS[Math.round(averageRating) - 1] }}
            />
            <span>Avg Level: {Math.round(averageRating)}</span>
          </div>
          <span>({totalRatings} rating{totalRatings !== 1 ? 's' : ''})</span>
        </div>
      )}

      {/* User's current rating */}
      {userRating && (
        <div className="text-xs text-purple-300">
          Your rating: {ENERGY_EMOJIS[(userRating as any).rating - 1]}
        </div>
      )}
    </div>
  );
}