'use client';

import { useState } from 'react';
import { 
  AlignLeft, 
  Image, 
  Video, 
  Link as LinkIcon, 
  BarChart2, 
  Mic, 
  File, 
  X 
} from 'lucide-react';

export type PostType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'LINK' | 'POLL' | 'AUDIO' | 'DOCUMENT';

interface PostTypeSelectorProps {
  onSelect: (type: PostType) => void;
  currentType: PostType;
}

export default function PostTypeSelector({ onSelect, currentType }: PostTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const postTypes: Array<{ type: PostType; icon: React.ReactNode; label: string; color: string }> = [
    { 
      type: 'TEXT', 
      icon: <AlignLeft size={20} />, 
      label: 'Text', 
      color: 'text-gray-200 bg-gray-700'
    },
    { 
      type: 'PHOTO', 
      icon: <Image size={20} />, 
      label: 'Photo', 
      color: 'text-green-400 bg-green-900/30'
    },
    { 
      type: 'VIDEO', 
      icon: <Video size={20} />, 
      label: 'Video', 
      color: 'text-red-400 bg-red-900/30'
    },
    { 
      type: 'LINK', 
      icon: <LinkIcon size={20} />, 
      label: 'Link', 
      color: 'text-blue-400 bg-blue-900/30'
    },
    { 
      type: 'POLL', 
      icon: <BarChart2 size={20} />, 
      label: 'Poll', 
      color: 'text-purple-400 bg-purple-900/30'
    },
    { 
      type: 'AUDIO', 
      icon: <Mic size={20} />, 
      label: 'Audio', 
      color: 'text-orange-400 bg-orange-900/30'
    },
    { 
      type: 'DOCUMENT', 
      icon: <File size={20} />, 
      label: 'Document',
      color: 'text-yellow-400 bg-yellow-900/30'
    },
  ];
  
  const currentTypeInfo = postTypes.find(t => t.type === currentType) || postTypes[0];
  
  const handleSelect = (type: PostType) => {
    onSelect(type);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      {/* Current type button - always visible */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400 mb-1">Post type:</div>
        {isOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-300 mb-1"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full p-2 rounded-md ${currentTypeInfo.color} hover:opacity-90 transition-colors`}
      >
        <div className="flex items-center gap-2">
          {currentTypeInfo.icon}
          <span>{currentTypeInfo.label}</span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {/* Dropdown menu for type selection */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 rounded-md shadow-lg border border-gray-700 overflow-hidden">
          <ul>
            {postTypes.map((type) => (
              <li key={type.type}>
                <button
                  onClick={() => handleSelect(type.type)}
                  className={`flex items-center gap-2 w-full p-2 text-left hover:bg-gray-700 transition-colors ${
                    type.type === currentType ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className={`p-1 rounded ${type.color.split(' ')[1]}`}>
                    {type.icon}
                  </div>
                  <span className="text-white">{type.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}