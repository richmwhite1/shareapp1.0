export const getAuraColor = (rating: number): string => {
  if (!rating || rating < 1) return "#6B8E6A"; // Default to level 4
  
  const auraColors = [
    "#8B2E2E", // 1: Dark Red
    "#D97438", // 2: Orange
    "#CC9F4C", // 3: Gold
    "#6B8E6A", // 4: Green
    "#5A8298", // 5: Blue
    "#4A4066", // 6: Purple
    "#A89EC4", // 7: Light Purple
  ];
  
  const index = Math.min(Math.round(rating) - 1, 6);
  return auraColors[Math.max(0, index)];
};

export const getAuraStyle = (rating: number) => ({
  border: `2px solid ${getAuraColor(rating)}`,
  boxShadow: `0 0 8px ${getAuraColor(rating)}40`, // 40 for transparency
});

export const getChakraLevel = (rating: number): number => {
  return Math.max(1, Math.min(7, Math.round(rating)));
};