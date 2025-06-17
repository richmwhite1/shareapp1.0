import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import { getAuraColor } from "@/utils/aura";

interface AuricFieldProps {
  children: ReactNode;
  postId?: number;
  profileId?: number;
  intensity?: number; // 0-1, how strong the aura should be
}

export default function AuricField({ children, postId, profileId, intensity = 0.3 }: AuricFieldProps) {
  const isPost = !!postId;
  const targetId = postId || profileId;
  const endpoint = isPost ? `/api/posts/${targetId}/energy/stats` : `/api/profiles/${targetId}/energy/stats`;

  // Get average energy rating for this target
  const { data: ratingStats } = useQuery({
    queryKey: [endpoint],
    enabled: !!targetId,
  });

  const averageRating = (ratingStats as any)?.average || 4; // Default to level 4 (heart chakra)
  const ratingCount = (ratingStats as any)?.count || 0;
  
  // Get chakra color using utility function
  const chakraColor = getAuraColor(averageRating);
  
  // Adjust intensity based on number of ratings (more ratings = stronger aura)
  const adjustedIntensity = Math.min(intensity * (1 + ratingCount * 0.1), 0.8);
  
  // Show default middle chakra aura for all users, stronger for rated users
  const finalIntensity = ratingCount === 0 ? intensity * 0.6 : adjustedIntensity;

  // Create visible aura border effect
  const auricStyles: React.CSSProperties = {
    position: 'relative',
    border: `2px solid ${chakraColor}`,
    borderRadius: '50%',
    padding: '2px',
    background: `radial-gradient(circle at center, ${chakraColor}15 0%, transparent 60%)`,
  };

  // Inner glow effect
  const glowStyles: React.CSSProperties = {
    boxShadow: `0 0 ${8 + finalIntensity * 12}px ${chakraColor}60, inset 0 0 ${4 + finalIntensity * 6}px ${chakraColor}20`,
    borderRadius: '50%',
    transition: 'box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',
    overflow: 'hidden',
  };

  return (
    <div style={auricStyles} className="auric-field">
      <div style={glowStyles} className="auric-inner">
        {children}
      </div>
    </div>
  );
}