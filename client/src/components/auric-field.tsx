import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";

interface AuricFieldProps {
  children: ReactNode;
  postId?: number;
  profileId?: number;
  intensity?: number; // 0-1, how strong the aura should be
}

// Chakra colors for the auric field
const CHAKRA_COLORS = [
  '#FF0000', // Root Chakra (Red)
  '#FF8C00', // Sacral Chakra (Orange)
  '#FFD700', // Solar Plexus (Yellow)
  '#00FF00', // Heart Chakra (Green)
  '#00BFFF', // Throat Chakra (Blue)
  '#4B0082', // Third Eye (Indigo)
  '#8A2BE2'  // Crown Chakra (Violet)
];

export default function AuricField({ children, postId, profileId, intensity = 0.3 }: AuricFieldProps) {
  const isPost = !!postId;
  const targetId = postId || profileId;
  const endpoint = isPost ? `/api/posts/${targetId}/energy` : `/api/profiles/${targetId}/energy`;

  // Get average energy rating for this target
  const { data: ratingStats } = useQuery({
    queryKey: [endpoint, 'stats'],
    enabled: !!targetId,
  });

  const averageRating = ratingStats?.average || 4; // Default to heart chakra
  const ratingCount = ratingStats?.count || 0;
  
  // Calculate the chakra color based on average rating
  const chakraIndex = Math.max(0, Math.min(6, Math.round(averageRating) - 1));
  const chakraColor = CHAKRA_COLORS[chakraIndex];
  
  // Adjust intensity based on number of ratings (more ratings = stronger aura)
  const adjustedIntensity = Math.min(intensity * (1 + ratingCount * 0.1), 0.8);
  
  // Create subtle aura effect with CSS
  const auricStyles: React.CSSProperties = {
    position: 'relative',
    background: `radial-gradient(ellipse at center, ${chakraColor}${Math.round(adjustedIntensity * 15).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
    borderRadius: '12px',
    padding: '2px',
  };

  // Inner glow effect
  const glowStyles: React.CSSProperties = {
    boxShadow: ratingCount > 0 ? `0 0 ${20 + adjustedIntensity * 30}px ${chakraColor}${Math.round(adjustedIntensity * 30).toString(16).padStart(2, '0')}` : 'none',
    borderRadius: '10px',
    transition: 'box-shadow 0.3s ease-in-out',
  };

  // If no ratings yet, render without aura
  if (ratingCount === 0) {
    return <div>{children}</div>;
  }

  return (
    <div style={auricStyles} className="auric-field">
      <div style={glowStyles} className="auric-inner">
        {children}
      </div>
    </div>
  );
}