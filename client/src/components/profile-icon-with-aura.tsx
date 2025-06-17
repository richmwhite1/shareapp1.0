import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuraColor } from "@/utils/aura";

interface ProfileIconWithAuraProps {
  userId: number;
  userName: string;
  profilePicture: string | null;
  size?: "sm" | "md" | "lg";
}

export default function ProfileIconWithAura({ 
  userId, 
  userName, 
  profilePicture, 
  size = "sm" 
}: ProfileIconWithAuraProps) {
  // Get user's aura rating
  const { data: auraStats } = useQuery({
    queryKey: [`/api/profiles/${userId}/energy/stats`],
  });

  const auraRating = (auraStats as any)?.average || 4;
  const auraColor = getAuraColor(auraRating);
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const borderWidth = {
    sm: "2px",
    md: "3px",
    lg: "4px"
  };

  const glowSize = {
    sm: "4px",
    md: "6px", 
    lg: "8px"
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full`}
      style={{
        border: `${borderWidth[size]} solid ${auraColor}`,
        boxShadow: `0 0 ${glowSize[size]} ${auraColor}60`,
        background: `radial-gradient(circle, ${auraColor}20 0%, transparent 70%)`
      }}
    >
      <Avatar className="w-full h-full">
        <AvatarImage src={profilePicture || undefined} />
        <AvatarFallback className="text-xs">
          {userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}