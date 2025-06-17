import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";

interface AuricPhotoBorderProps {
  children: ReactNode;
  postId: number;
  className?: string;
}

// Chakra colors for the auric border
const CHAKRA_COLORS = [
  '#FF0000', // Root Chakra (Red)
  '#FF8C00', // Sacral Chakra (Orange)
  '#FFD700', // Solar Plexus (Yellow)
  '#00FF00', // Heart Chakra (Green)
  '#00BFFF', // Throat Chakra (Blue)
  '#4B0082', // Third Eye (Indigo)
  '#8A2BE2'  // Crown Chakra (Violet)
];

export default function AuricPhotoBorder({ children, postId, className = "" }: AuricPhotoBorderProps) {
  // Get average aura rating for this post
  const { data: ratingStats } = useQuery({
    queryKey: [`/api/posts/${postId}/energy/stats`],
    enabled: !!postId,
  });

  const averageRating = ratingStats?.average || 4; // Default to level 4
  const ratingCount = ratingStats?.count || 0;
  
  // Calculate the chakra color based on average rating
  const chakraIndex = Math.max(0, Math.min(6, Math.round(averageRating) - 1));
  const chakraColor = CHAKRA_COLORS[chakraIndex];
  
  // Adjust border intensity based on number of ratings
  const borderOpacity = Math.min(0.3 + (ratingCount * 0.1), 0.8);
  const glowIntensity = Math.min(10 + (ratingCount * 5), 25);
  
  // Create auric border styles
  const borderStyles: React.CSSProperties = {
    border: ratingCount > 0 ? `3px solid ${chakraColor}${Math.round(borderOpacity * 255).toString(16).padStart(2, '0')}` : 'none',
    boxShadow: ratingCount > 0 ? `0 0 ${glowIntensity}px ${chakraColor}${Math.round(borderOpacity * 128).toString(16).padStart(2, '0')}` : 'none',
    borderRadius: '8px',
    transition: 'all 0.3s ease-in-out',
  };

  return (
    <div style={borderStyles} className={`auric-photo-border ${className}`}>
      {children}
    </div>
  );
}