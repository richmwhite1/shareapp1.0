import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuraColor, getChakraLevel } from "@/utils/aura";

interface EnergyRatingProps {
  postId?: number;
  profileId?: number;
  className?: string;
}

const ENERGY_EMOJIS = [
  '😐', // 1 - Neutral/Flat
  '😊', // 2 - Slightly positive
  '😄', // 3 - Happy
  '😍', // 4 - Love/Heart energy
  '🤩', // 5 - Star-struck
  '✨', // 6 - Sparkles/mystical
  '🔮'  // 7 - Crystal ball/highest energy
];

const CHAKRA_NAMES = [
  'Root', 'Sacral', 'Solar Plexus', 'Heart', 'Throat', 'Third Eye', 'Crown'
];

export default function EnergyRating({ postId, profileId, className = "" }: EnergyRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentRating, setCurrentRating] = useState<number>(4); // Default to heart chakra

  const isPost = !!postId;
  const targetId = postId || profileId;
  const endpoint = isPost ? `/api/posts/${targetId}/energy` : `/api/profiles/${targetId}/energy`;
  const statsEndpoint = isPost ? `/api/posts/${targetId}/energy/stats` : `/api/profiles/${targetId}/energy/stats`;

  // Get current user's rating
  const { data: userRating } = useQuery({
    queryKey: [endpoint, 'user'],
    enabled: !!user && !!targetId,
  });

  // Get rating statistics
  const { data: ratingStats } = useQuery({
    queryKey: [statsEndpoint],
    enabled: !!targetId,
  });

  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      queryClient.invalidateQueries({ queryKey: [statsEndpoint] });
      toast({
        title: "Aura rating submitted",
        description: `You rated this ${CHAKRA_NAMES[currentRating - 1]} chakra`,
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
  
  // Generate gradient background for slider using aura colors
  const chakraColors = Array.from({length: 7}, (_, i) => getAuraColor(i + 1));
  const sliderGradient = `linear-gradient(to right, ${chakraColors.join(', ')})`;

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
          {/* Custom slider track with chakra gradient */}
          <div 
            className="h-2 rounded-full mb-3"
            style={{ background: sliderGradient }}
          />
          
          <Slider
            value={[currentRating]}
            onValueChange={handleRatingChange}
            max={7}
            min={1}
            step={1}
            className="relative -mt-5"
            style={{
              '--slider-thumb-color': getAuraColor(currentRating)
            } as React.CSSProperties}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>Low</span>
          <span 
            className="font-medium"
            style={{ color: getAuraColor(currentRating) }}
          >
            {CHAKRA_NAMES[currentRating - 1]} {ENERGY_EMOJIS[currentRating - 1]}
          </span>
          <span>High</span>
        </div>
      </div>

      {/* Rating Display & Submit */}
      <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getAuraColor(currentRating) }}
          />
          <span className="text-sm">
            Level {currentRating} - {CHAKRA_NAMES[currentRating - 1]}
          </span>
        </div>
        
        <button
          onClick={handleRatingSubmit}
          disabled={ratingMutation.isPending}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          style={{ 
            backgroundColor: getAuraColor(currentRating),
            borderColor: getAuraColor(currentRating)
          }}
        >
          {ratingMutation.isPending ? 'Submitting...' : 'Rate'}
        </button>
      </div>

      {/* Average Rating Display */}
      {totalRatings > 0 && (
        <div className="text-center text-sm text-gray-400">
          Average: {averageRating.toFixed(1)} ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  );
}