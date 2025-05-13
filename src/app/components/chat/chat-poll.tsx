'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, BarChart, CheckCircle, Clock, AlertCircle, Image as ImageIcon, Trash2, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/trpc/api';
import { clientPusher, getChatChannel, PusherEvents } from '@/lib/pusher';
import { PollStatus } from '@prisma/client';

// Poll option interface
interface PollOption {
  id?: string;
  text: string;
  imageUrl?: string | null;
  position?: number;
}

// Poll result interface
interface PollResult {
  optionId: string;
  text: string;
  voteCount: number;
  percentage: number;
  userVoted: boolean;
  voters: string[];
}

// Poll details interface
interface Poll {
  pollId: string;
  question: string;
  totalVotes: number;
  results: PollResult[];
  status: PollStatus;
  isAnonymous: boolean;
  allowMultiple: boolean;
  expiresAt?: Date | null;
}

// Component to show or create a poll
interface ChatPollProps {
  chatId: string;
  pollId?: string;
  mode: 'create' | 'view';
  onCancel?: () => void;
  onComplete?: () => void;
  messageId?: string;
}

export default function ChatPoll({
  chatId,
  pollId,
  mode,
  onCancel,
  onComplete,
  messageId,
}: ChatPollProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { text: '' },
    { text: '' },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'view');
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');
  
  const { data: session } = useSession();
  
  // TRPC mutations and queries
  const { mutate: createPoll, isLoading: isCreating } = api.chat.createPoll.useMutation({
    onSuccess: () => {
      if (onComplete) onComplete();
    },
    onError: (err) => {
      setError(`Failed to create poll: ${err.message}`);
    },
  });
  
  const { mutate: votePoll } = api.chat.votePoll.useMutation({
    onSuccess: () => {
      // After voting, we'll refresh the poll data
      refetchPollResults();
    },
    onError: (err) => {
      setError(`Failed to vote: ${err.message}`);
    },
  });
  
  const { data: pollResults, refetch: refetchPollResults } = api.chat.getPollResults.useQuery(
    { pollId: pollId! },
    { 
      enabled: mode === 'view' && !!pollId,
      onSuccess: (data) => {
        setPollData(data);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(`Failed to load poll: ${err.message}`);
        setIsLoading(false);
      }
    }
  );
  
  // Set up Pusher subscription for poll updates
  useEffect(() => {
    if (!session?.user?.id || !chatId || !pollId || mode !== 'view') return;

    const channel = clientPusher.subscribe(getChatChannel(chatId));
    
    channel.bind(PusherEvents.POLL_VOTE_UPDATED, (data: { pollId: string }) => {
      if (data.pollId === pollId) {
        refetchPollResults();
      }
    });
    
    channel.bind(PusherEvents.POLL_ENDED, (data: { pollId: string }) => {
      if (data.pollId === pollId) {
        refetchPollResults();
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getChatChannel(chatId));
    };
  }, [session?.user?.id, chatId, pollId, mode, refetchPollResults]);
  
  // Update poll data when results change
  useEffect(() => {
    if (pollResults) {
      setPollData(pollResults);
    }
  }, [pollResults]);
  
  // Add a new option
  const addOption = () => {
    setOptions([...options, { text: '' }]);
  };
  
  // Remove an option
  const removeOption = (index: number) => {
    if (options.length <= 2) {
      setError('A poll must have at least two options');
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };
  
  // Update an option
  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };
  
  // Create the poll
  const handleCreatePoll = () => {
    setError(null);
    
    // Validate inputs
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }
    
    const validOptions = options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      setError('Please enter at least two options');
      return;
    }
    
    // Create poll
    createPoll({
      chatId,
      question: question.trim(),
      options: validOptions,
      allowMultiple,
      isAnonymous,
      expiresAt: expiresAt || undefined,
    });
  };
  
  // Vote for an option
  const handleVote = (optionId: string) => {
    if (!pollId || !session?.user?.id) return;
    
    votePoll({
      pollId,
      optionId,
    });
  };
  
  // Cancel poll creation
  const handleCancel = () => {
    if (onCancel) onCancel();
  };
  
  // Render poll creation form
  const renderPollCreationForm = () => (
    <div className="p-4 bg-card-bg rounded-lg border border-border-color">
      <h3 className="text-lg font-medium text-text-primary mb-3">Create a Poll</h3>
      
      {/* Poll question */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full p-2 bg-input-bg border border-border-color rounded-md text-text-primary"
        />
      </div>
      
      {/* Poll options */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Options
        </label>
        {options.map((option, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              value={option.text}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 p-2 bg-input-bg border border-border-color rounded-md text-text-primary"
            />
            <button
              onClick={() => removeOption(index)}
              className="ml-2 p-1 text-text-secondary hover:text-red-500 rounded-full"
              title="Remove option"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        
        {/* Add option button */}
        <button
          onClick={addOption}
          className="mt-1 flex items-center text-accent-blue hover:text-accent-blue-hover text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Option
        </button>
      </div>
      
      {/* Poll settings */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowMultiple"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="allowMultiple" className="text-sm text-text-primary">
            Allow multiple selections
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isAnonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isAnonymous" className="text-sm text-text-primary">
            Anonymous voting
          </label>
        </div>
        
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Poll Duration (optional)
          </label>
          <select
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'none') {
                setExpiresAt(null);
              } else {
                const hours = parseInt(value, 10);
                const date = new Date();
                date.setHours(date.getHours() + hours);
                setExpiresAt(date);
              }
            }}
            className="p-2 bg-input-bg border border-border-color rounded-md text-text-primary w-full"
          >
            <option value="none">No expiration</option>
            <option value="1">1 hour</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">2 days</option>
            <option value="168">1 week</option>
          </select>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-700 text-text-primary rounded-md hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={handleCreatePoll}
          disabled={isCreating}
          className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue-hover disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
  
  // Render poll results view
  const renderPollResults = () => {
    if (!pollData) return null;
    
    const { pollId, question, totalVotes, results, status, isAnonymous, allowMultiple, expiresAt } = pollData;
    const sortedResults = [...results].sort((a, b) => b.voteCount - a.voteCount);
    
    // Calculate time remaining for active polls with expiration
    const getTimeRemaining = () => {
      if (status !== 'ACTIVE' || !expiresAt) return null;
      
      const now = new Date();
      const expiry = new Date(expiresAt);
      if (now >= expiry) return 'Ending soon';
      
      const diffMs = expiry.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHrs > 24) {
        return `${Math.floor(diffHrs / 24)} days remaining`;
      } else if (diffHrs > 0) {
        return `${diffHrs}h ${diffMins}m remaining`;
      } else {
        return `${diffMins}m remaining`;
      }
    };
    
    return (
      <div className="p-4 bg-card-bg rounded-lg border border-border-color">
        {/* Poll header */}
        <div className="mb-3 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-text-primary">{question}</h3>
            <div className="flex items-center text-xs text-text-secondary mt-1">
              <span className="mr-3">{totalVotes} votes</span>
              
              {status === 'ACTIVE' && (
                <span className="flex items-center text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                </span>
              )}
              
              {status === 'ENDED' && (
                <span className="flex items-center text-text-secondary">
                  <Clock className="h-3 w-3 mr-1" /> Ended
                </span>
              )}
              
              {status === 'SCHEDULED' && (
                <span className="flex items-center text-yellow-400">
                  <Clock className="h-3 w-3 mr-1" /> Scheduled
                </span>
              )}
              
              {getTimeRemaining() && (
                <span className="ml-3 text-text-secondary">
                  {getTimeRemaining()}
                </span>
              )}
            </div>
          </div>
          
          {/* View toggle */}
          <div className="flex border border-border-color rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('bar')}
              className={`p-1 ${viewMode === 'bar' ? 'bg-accent-blue text-white' : 'bg-gray-700 text-text-secondary'}`}
              title="Bar chart view"
            >
              <BarChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`p-1 ${viewMode === 'pie' ? 'bg-accent-blue text-white' : 'bg-gray-700 text-text-secondary'}`}
              title="Pie chart view"
            >
              <PieChart className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Poll options */}
        <div className="space-y-2 mb-4">
          {sortedResults.map((result) => {
            const { optionId, text, voteCount, percentage, userVoted } = result;
            
            // Calculate color based on position (first option gets accent color, others get progressive lighter grays)
            const getColor = (index: number) => {
              if (userVoted) return 'bg-accent-blue';
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
              return colors[index % colors.length];
            };
            
            const colorClass = userVoted ? 'bg-accent-blue' : 'bg-gray-600';
            
            return (
              <div key={optionId} className="relative">
                {/* Option bar */}
                <div 
                  className={`h-10 flex items-center p-2 border border-border-color rounded-md relative overflow-hidden ${
                    userVoted ? 'bg-card-bg border-accent-blue' : 'bg-card-bg'
                  }`}
                  onClick={() => status === 'ACTIVE' && handleVote(optionId)}
                  style={{ cursor: status === 'ACTIVE' ? 'pointer' : 'default' }}
                >
                  {/* Progress bar background */}
                  {viewMode === 'bar' && (
                    <div 
                      className={`absolute left-0 top-0 bottom-0 h-full ${colorClass} opacity-20`}
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  {/* Option text and vote count */}
                  <div className="flex justify-between items-center w-full z-10">
                    <div className="flex items-center">
                      {userVoted && (
                        <CheckCircle className="h-4 w-4 text-accent-blue mr-2" />
                      )}
                      <span className="text-text-primary">{text}</span>
                    </div>
                    <div className="text-text-secondary text-sm">
                      {percentage.toFixed(0)}% ({voteCount})
                    </div>
                  </div>
                </div>
                
                {/* Voters list (if not anonymous) */}
                {!isAnonymous && voteCount > 0 && !userVoted && (
                  <div className="mt-1 flex flex-wrap gap-1 pl-2">
                    <span className="text-xs text-text-secondary">Voters:</span>
                    {result.voters.map(voterId => (
                      <span key={voterId} className="text-xs text-text-secondary">User</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Poll info */}
        <div className="text-xs text-text-secondary flex flex-wrap gap-2">
          {allowMultiple && <span>Multiple choices allowed</span>}
          {isAnonymous && <span>Anonymous voting</span>}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="p-4 bg-card-bg rounded-lg border border-border-color">
        <div className="animate-pulse flex flex-col space-y-3">
          <div className="h-6 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2 mt-4">
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return mode === 'create' ? renderPollCreationForm() : renderPollResults();
}