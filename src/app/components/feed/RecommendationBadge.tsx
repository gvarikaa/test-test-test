'use client';

import React from 'react';
import { RecommendationReason } from '@/lib/personalization';
import { 
  ThumbsUp, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Zap, 
  MapPin,
  UserCheck,
  Lightbulb,
  Clock
} from 'lucide-react';

interface RecommendationBadgeProps {
  reason: string;
  className?: string;
  minimal?: boolean;
}

export default function RecommendationBadge({ 
  reason, 
  className = '',
  minimal = false 
}: RecommendationBadgeProps) {
  const reasonIcons: Record<string, React.ReactNode> = {
    similar_content: <ThumbsUp size={minimal ? 14 : 16} className="text-blue-500" />,
    friends_engaged: <Users size={minimal ? 14 : 16} className="text-green-500" />,
    trending_now: <TrendingUp size={minimal ? 14 : 16} className="text-red-500" />,
    based_on_interests: <Sparkles size={minimal ? 14 : 16} className="text-purple-500" />,
    based_on_history: <Zap size={minimal ? 14 : 16} className="text-amber-500" />,
    based_on_location: <MapPin size={minimal ? 14 : 16} className="text-sky-500" />,
    similar_users: <UserCheck size={minimal ? 14 : 16} className="text-indigo-500" />,
    complementary_content: <Lightbulb size={minimal ? 14 : 16} className="text-teal-500" />,
    new_but_relevant: <Clock size={minimal ? 14 : 16} className="text-orange-500" />,
  };

  const reasonLabels: Record<string, string> = {
    similar_content: 'Because you liked similar content',
    friends_engaged: 'Popular with people you follow',
    trending_now: 'Trending right now',
    based_on_interests: 'Matches your interests',
    based_on_history: 'Based on your activity',
    based_on_location: 'Popular near you',
    similar_users: 'People with similar interests',
    complementary_content: 'You might also like',
    new_but_relevant: 'New for you',
  };

  // Fallback icon and label
  const icon = reasonIcons[reason] || <Sparkles size={minimal ? 14 : 16} className="text-gray-500" />;
  const label = reasonLabels[reason] || 'Recommended for you';

  if (minimal) {
    return (
      <div className={`inline-flex items-center text-xs ${className}`}>
        {icon}
        <span className="ml-1 text-gray-600 dark:text-gray-400">{label}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {icon}
      <span className="ml-1 text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );
}