'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, CircleSlash, User, Users, AlertCircle } from 'lucide-react';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';

type PollOption = {
  id: string;
  text: string;
  position: number;
  _count?: {
    votes: number;
  };
  votes?: {
    id: string;
  }[];
};

interface PollViewProps {
  pollId: string;
  postId: string;
  question: string;
  options: PollOption[];
  allowMultipleChoices: boolean;
  isAnonymous: boolean;
  expiresAt?: string | Date;
  totalVotes?: number;
}

export default function PollView({
  pollId,
  postId,
  question,
  options,
  allowMultipleChoices,
  isAnonymous,
  expiresAt,
  totalVotes: initialTotalVotes,
}: PollViewProps) {
  const { data: session } = useSession();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState<PollOption[]>(options);
  const [totalVotes, setTotalVotes] = useState(
    initialTotalVotes || 
    options.reduce((sum, option) => sum + (option._count?.votes || 0), 0)
  );
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the vote mutation from tRPC
  const { mutate: voteOnPoll, isLoading: isVoting } = api.post.voteOnPoll.useMutation({
    onSuccess: (data) => {
      // Update the poll options with the new vote counts
      const updatedOptions = pollOptions.map(option => {
        const updatedOption = data.results.find(result => result.id === option.id);
        if (updatedOption) {
          return {
            ...option,
            _count: {
              votes: updatedOption.votes
            }
          };
        }
        return option;
      });
      
      setPollOptions(updatedOptions);
      setTotalVotes(updatedOptions.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0));
      setSelectedOptions(new Set());
      setHasVoted(true);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to submit your vote. Please try again.');
    }
  });
  
  // Check if the user has already voted
  useEffect(() => {
    const userVoted = options.some(option => 
      option.votes && option.votes.length > 0
    );
    
    setHasVoted(userVoted);
  }, [options]);
  
  // Check if the poll has expired and calculate time left
  useEffect(() => {
    if (!expiresAt) return;
    
    const checkExpiry = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (now >= expiry) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }
      
      setIsExpired(false);
      
      // Calculate time left
      const diff = expiry.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m remaining`);
      } else {
        setTimeLeft('less than a minute remaining');
      }
    };
    
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    if (hasVoted || isExpired || !session) return;
    
    const newSelected = new Set(selectedOptions);
    
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      if (!allowMultipleChoices) {
        newSelected.clear();
      }
      newSelected.add(optionId);
    }
    
    setSelectedOptions(newSelected);
  };
  
  // Submit vote
  const submitVote = () => {
    if (!session) {
      setError('You must be logged in to vote');
      return;
    }
    
    if (selectedOptions.size === 0) {
      setError('Please select at least one option');
      return;
    }
    
    if (isExpired) {
      setError('This poll has expired');
      return;
    }
    
    // For single-choice polls, just use the first (and only) selected option
    const optionId = Array.from(selectedOptions)[0];
    
    voteOnPoll({ optionId });
  };
  
  // Calculate percentage for an option
  const getPercentage = (optionVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };
  
  // Sort options by position
  const sortedOptions = [...pollOptions].sort((a, b) => a.position - b.position);
  
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      {/* Question */}
      <h3 className="text-lg font-medium text-white mb-3">{question}</h3>
      
      {/* Poll status */}
      <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          {isAnonymous ? (
            <User size={14} />
          ) : (
            <Users size={14} />
          )}
          <span>{isAnonymous ? 'Anonymous voting' : 'Public voting'}</span>
        </div>
        
        {timeLeft && !isExpired ? (
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{timeLeft}</span>
          </div>
        ) : expiresAt && isExpired ? (
          <div className="flex items-center gap-1 text-yellow-400">
            <CircleSlash size={14} />
            <span>Poll closed</span>
          </div>
        ) : null}
      </div>
      
      {/* Options */}
      <div className="space-y-3 mb-4">
        {sortedOptions.map((option) => {
          const isSelected = selectedOptions.has(option.id);
          const voteCount = option._count?.votes || 0;
          const percentage = getPercentage(voteCount);
          const hasUserVoted = hasVoted || isExpired;
          
          return (
            <div key={option.id} className="relative">
              <button
                onClick={() => handleOptionSelect(option.id)}
                disabled={hasUserVoted || !session}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  hasUserVoted
                    ? 'bg-gray-700 cursor-default'
                    : isSelected
                    ? 'bg-blue-900/40 border border-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-white">{option.text}</span>
                  {hasUserVoted && (
                    <span className="text-gray-300 font-medium">{percentage}%</span>
                  )}
                </div>
                
                {hasUserVoted && (
                  <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        option.votes && option.votes.length > 0
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                )}
              </button>
              
              {hasUserVoted && option.votes && option.votes.length > 0 && (
                <div className="absolute right-2 top-3 text-green-400">
                  <CheckCircle size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Total votes */}
      <div className="text-center text-sm text-gray-400 mb-4">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-2 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-sm flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Vote button */}
      {!hasVoted && !isExpired && session && (
        <button
          onClick={submitVote}
          disabled={selectedOptions.size === 0 || isVoting}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
        >
          {isVoting ? 'Submitting...' : 'Vote'}
        </button>
      )}
      
      {/* Sign in prompt */}
      {!session && !hasVoted && !isExpired && (
        <div className="text-center text-sm text-gray-400">
          <a href="/auth/signin" className="text-blue-400 hover:underline">
            Sign in
          </a>{' '}
          to vote on this poll
        </div>
      )}
    </div>
  );
}