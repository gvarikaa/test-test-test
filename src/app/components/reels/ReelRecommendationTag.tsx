"use client";

import React from 'react';

interface ReelRecommendationTagProps {
  reason: string;
  source: string;
}

const ReelRecommendationTag: React.FC<ReelRecommendationTagProps> = ({ reason, source }) => {
  // Determine badge color and icon based on source
  let badgeColor = "bg-blue-500";
  let icon = "✨";
  
  switch (source) {
    case 'following':
      badgeColor = "bg-purple-500";
      icon = "👤";
      break;
    case 'topics':
      badgeColor = "bg-green-500";
      icon = "🏷️";
      break;
    case 'trending':
      badgeColor = "bg-pink-500";
      icon = "📈";
      break;
    case 'similar_content':
      badgeColor = "bg-indigo-500";
      icon = "🔄";
      break;
    case 'ai_explore':
    case 'explore_fallback':
      badgeColor = "bg-amber-500";
      icon = "🔍";
      break;
    default:
      badgeColor = "bg-blue-500";
      icon = "✨";
  }

  return (
    <div className={`px-2 py-1 rounded-full ${badgeColor} bg-opacity-80 text-white text-xs flex items-center max-w-full`}>
      <span className="mr-1">{icon}</span>
      <span className="truncate">{reason}</span>
    </div>
  );
};

export default ReelRecommendationTag;