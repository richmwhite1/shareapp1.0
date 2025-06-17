export const getAuraColor = (rating: number): string => {
  if (!rating || rating < 1) return "#00FF00"; // Default to green (heart chakra)
  
  const chakraColors = [
    "#FF0000", // 1: Root (Red)
    "#FF8C00", // 2: Sacral (Orange)
    "#FFD700", // 3: Solar Plexus (Yellow)
    "#00FF00", // 4: Heart (Green)
    "#00BFFF", // 5: Throat (Blue)
    "#4B0082", // 6: Third Eye (Indigo)
    "#8A2BE2", // 7: Crown (Violet)
  ];
  
  const index = Math.min(Math.floor(rating) - 1, 6);
  return chakraColors[Math.max(0, index)];
};

export const getAuraStyle = (rating: number) => ({
  border: `2px solid ${getAuraColor(rating)}`,
  boxShadow: `0 0 8px ${getAuraColor(rating)}40`, // 40 for transparency
});

export const getChakraLevel = (rating: number): number => {
  return Math.max(1, Math.min(7, Math.round(rating)));
};