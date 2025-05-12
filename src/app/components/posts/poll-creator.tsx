'use client';

import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  position: number;
}

interface PollCreatorProps {
  onPollCreated: (poll: {
    question: string;
    options: { text: string; position: number }[];
    allowMultipleChoices: boolean;
    isAnonymous: boolean;
    expiresAt?: string;
  }) => void;
  onCancel: () => void;
}

export default function PollCreator({ onPollCreated, onCancel }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: 'option-1', text: '', position: 0 },
    { id: 'option-2', text: '', position: 1 },
  ]);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [includeExpiry, setIncludeExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Add a new option
  const addOption = () => {
    if (options.length >= 10) {
      setError('You can add a maximum of 10 options');
      return;
    }
    
    const newOption: PollOption = {
      id: `option-${Date.now()}`,
      text: '',
      position: options.length,
    };
    
    setOptions([...options, newOption]);
  };

  // Remove an option
  const removeOption = (id: string) => {
    if (options.length <= 2) {
      setError('A poll must have at least 2 options');
      return;
    }
    
    const updatedOptions = options
      .filter(option => option.id !== id)
      .map((option, index) => ({
        ...option,
        position: index,
      }));
      
    setOptions(updatedOptions);
  };

  // Handle option text change
  const handleOptionChange = (id: string, text: string) => {
    const updatedOptions = options.map(option => 
      option.id === id ? { ...option, text } : option
    );
    
    setOptions(updatedOptions);
  };

  // Handle reordering options via drag and drop
  const handleDragStart = (id: string) => {
    setIsDragging(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (isDragging === null || isDragging === id) return;
    
    const dragIndex = options.findIndex(option => option.id === isDragging);
    const hoverIndex = options.findIndex(option => option.id === id);
    
    if (dragIndex === hoverIndex) return;
    
    // Reorder the options array
    const newOptions = [...options];
    const dragOption = newOptions[dragIndex];
    
    // Remove the dragged item
    newOptions.splice(dragIndex, 1);
    
    // Insert it at the new position
    newOptions.splice(hoverIndex, 0, dragOption);
    
    // Update positions
    const updatedOptions = newOptions.map((option, index) => ({
      ...option,
      position: index,
    }));
    
    setOptions(updatedOptions);
  };

  // Create the poll
  const createPoll = () => {
    // Validate the poll data
    setError(null);
    
    if (!question.trim()) {
      setError('Please enter a poll question');
      return;
    }
    
    const filledOptions = options.filter(option => option.text.trim() !== '');
    if (filledOptions.length < 2) {
      setError('Please provide at least 2 valid options');
      return;
    }
    
    // Prepare expiry date if enabled
    let expiresAt: string | undefined = undefined;
    
    if (includeExpiry) {
      if (!expiryDate) {
        setError('Please select an expiry date');
        return;
      }
      
      const dateObj = new Date(`${expiryDate}T${expiryTime || '23:59'}`);
      
      if (dateObj <= new Date()) {
        setError('Expiry date must be in the future');
        return;
      }
      
      expiresAt = dateObj.toISOString();
    }
    
    // Create the poll object
    const pollData = {
      question,
      options: filledOptions.map(({ text, position }) => ({ text, position })),
      allowMultipleChoices,
      isAnonymous,
      expiresAt,
    };
    
    onPollCreated(pollData);
  };

  // Get today's date in YYYY-MM-DD format for the date input min
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-white text-lg font-medium mb-4">Create a Poll</h3>
      
      {/* Poll question */}
      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Your question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Poll options */}
      <div className="mb-4">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Options
        </label>
        <ul className="space-y-2">
          {options.map((option) => (
            <li
              key={option.id}
              draggable
              onDragStart={() => handleDragStart(option.id)}
              onDragOver={(e) => handleDragOver(e, option.id)}
              onDragEnd={() => setIsDragging(null)}
              className={`flex items-center gap-2 ${isDragging === option.id ? 'opacity-50' : ''}`}
            >
              <div className="cursor-move text-gray-500">
                <GripVertical size={20} />
              </div>
              <input
                type="text"
                value={option.text}
                onChange={(e) => handleOptionChange(option.id, e.target.value)}
                placeholder={`Option ${option.position + 1}`}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeOption(option.id)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
        
        {/* Add option button */}
        <button
          onClick={addOption}
          className="mt-3 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <Plus size={16} />
          <span>Add Option</span>
        </button>
      </div>
      
      {/* Poll settings */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="multipleChoices"
            checked={allowMultipleChoices}
            onChange={(e) => setAllowMultipleChoices(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
          />
          <label htmlFor="multipleChoices" className="text-gray-300 text-sm">
            Allow people to select multiple options
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
          />
          <label htmlFor="anonymous" className="text-gray-300 text-sm">
            Keep votes anonymous
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="expiry"
            checked={includeExpiry}
            onChange={(e) => setIncludeExpiry(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
          />
          <label htmlFor="expiry" className="text-gray-300 text-sm">
            Set poll expiry date
          </label>
        </div>
        
        {/* Expiry date and time */}
        {includeExpiry && (
          <div className="pl-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Calendar size={16} />
                </div>
                <input
                  type="date"
                  min={today}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="pl-10 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Clock size={16} />
                </div>
                <input
                  type="time"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  className="pl-10 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Poll will close at the specified date and time. If no time is selected, poll will close at the end of the day.
            </p>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-md text-red-200 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={createPoll}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Poll
        </button>
      </div>
    </div>
  );
}