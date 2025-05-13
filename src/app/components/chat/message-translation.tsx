'use client';

import { useState, useEffect } from 'react';
import { Globe, ArrowDown, Check, X, Loader2 } from 'lucide-react';
import { SupportedLanguage, LANGUAGE_NAMES } from '@/lib/multilingual';
import { api } from '@/lib/trpc/api';
import { useSession } from 'next-auth/react';

interface MessageTranslationProps {
  messageId: string;
  content: string | null;
  translatedText?: string | null;
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
}

export default function MessageTranslation({
  messageId,
  content,
  translatedText,
  sourceLanguage,
  targetLanguage,
  showTranslation = false,
  onToggleTranslation,
}: MessageTranslationProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(showTranslation);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // TRPC mutation for translating messages
  const { mutate: translateMessage } = api.chat.translateMessage.useMutation({
    onSuccess: () => {
      setIsTranslating(false);
    },
    onError: (err) => {
      setError(`Translation failed: ${err.message}`);
      setIsTranslating(false);
    },
  });
  
  // Get user preferences to set default target language
  const { data: userPreferences } = api.chat.getUserChatPreferences.useQuery();
  
  useEffect(() => {
    // If user has translation preferences, set as default
    if (userPreferences?.preferredLanguage) {
      setSelectedLanguage(userPreferences.preferredLanguage);
    } else {
      // Default to English if no preference
      setSelectedLanguage('en');
    }
  }, [userPreferences]);
  
  // Determine if the text is already translated to the selected language
  const isAlreadyTranslated = targetLanguage === selectedLanguage && translatedText;
  
  // Get source language name
  const getSourceLanguageName = () => {
    if (sourceLanguage && LANGUAGE_NAMES[sourceLanguage]) {
      return LANGUAGE_NAMES[sourceLanguage];
    }
    return 'Auto-detected';
  };
  
  // Handle language selection
  const handleSelectLanguage = (langCode: string) => {
    setSelectedLanguage(langCode);
    setDropdownOpen(false);
    
    // If not already translated to this language, begin translation
    if (langCode !== targetLanguage && !isTranslating) {
      handleTranslate(langCode);
    }
  };
  
  // Translate the message
  const handleTranslate = (lang: string = selectedLanguage || 'en') => {
    if (!messageId || !content || isTranslating) return;
    
    setIsTranslating(true);
    setError(null);
    
    translateMessage({
      messageId,
      targetLanguage: lang,
    });
    
    setIsExpanded(true);
    if (onToggleTranslation) {
      onToggleTranslation();
    }
  };
  
  // Toggle translation display
  const toggleTranslation = () => {
    setIsExpanded(!isExpanded);
    if (onToggleTranslation) {
      onToggleTranslation();
    }
  };
  
  // If no content to translate, don't show anything
  if (!content) return null;
  
  return (
    <div className="mt-1 text-xs">
      {/* Translation controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTranslation}
          className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs rounded px-1"
          title={isExpanded ? "Hide translation" : "Show translation"}
        >
          <Globe className="h-3 w-3" />
          <span>{getSourceLanguageName()}</span>
          {isExpanded ? <ArrowDown className="h-3 w-3" /> : null}
        </button>
        
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs px-1 rounded"
          >
            {selectedLanguage && LANGUAGE_NAMES[selectedLanguage] ? LANGUAGE_NAMES[selectedLanguage] : 'Select language'}
            <ArrowDown className="h-3 w-3" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute z-10 mt-1 bg-card-bg border border-border-color rounded-md shadow-lg max-h-60 overflow-y-auto w-40">
              <div className="py-1">
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => handleSelectLanguage(code)}
                    className={`block px-4 py-2 text-xs w-full text-left hover:bg-hover-bg 
                      ${selectedLanguage === code ? 'bg-hover-bg/60 text-text-primary' : 'text-text-secondary'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{name}</span>
                      {selectedLanguage === code && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Translate button - only show if not already translated to selected language */}
        {!isAlreadyTranslated && !isTranslating && (
          <button
            onClick={() => handleTranslate()}
            className="ml-1 text-accent-blue hover:text-accent-blue-hover text-xs flex items-center gap-1"
            disabled={isTranslating}
          >
            Translate
          </button>
        )}
        
        {/* Loading indicator */}
        {isTranslating && (
          <div className="ml-1 text-text-secondary flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Translating...</span>
          </div>
        )}
      </div>
      
      {/* Translation display */}
      {isExpanded && (
        <div className="mt-1">
          {error ? (
            <div className="text-red-400 text-xs">{error}</div>
          ) : translatedText ? (
            <div className="bg-card-bg/60 p-2 rounded border border-border-color">
              {translatedText}
            </div>
          ) : isTranslating ? (
            <div className="bg-card-bg/60 p-2 rounded border border-border-color animate-pulse">
              Translating...
            </div>
          ) : (
            <div className="bg-card-bg/60 p-2 rounded border border-border-color text-text-secondary">
              Select a language and click Translate to see the translation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}