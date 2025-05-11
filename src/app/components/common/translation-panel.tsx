"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/trpc/api';
import { 
  Globe, 
  ArrowRightLeft, 
  Check, 
  X, 
  Loader, 
  Languages, 
  Copy, 
  FileText, 
  Check as CheckIcon,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface TranslationPanelProps {
  initialText?: string;
  initialSourceLanguage?: string;
  initialTargetLanguage?: string;
  onTranslationComplete?: (translatedText: string) => void;
  compact?: boolean;
  className?: string;
}

export default function TranslationPanel({
  initialText = '',
  initialSourceLanguage,
  initialTargetLanguage = 'en',
  onTranslationComplete,
  compact = false,
  className = ''
}: TranslationPanelProps) {
  const [text, setText] = useState(initialText);
  const [targetLanguage, setTargetLanguage] = useState(initialTargetLanguage);
  const [sourceLanguage, setSourceLanguage] = useState<string | undefined>(initialSourceLanguage);
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [languageDetectionRequested, setLanguageDetectionRequested] = useState(false);

  // Get supported languages
  const { data: supportedLanguages, isLoading: isLoadingLanguages } = api.ai.getSupportedLanguages.useQuery();

  // Detect language mutation
  const { 
    mutate: detectLanguage, 
    isLoading: isDetecting, 
    error: detectionError 
  } = api.ai.detectLanguage.useMutation({
    onSuccess: (data) => {
      setDetectedLanguage(data.detectedLanguage);
      if (!sourceLanguage) {
        setSourceLanguage(data.detectedLanguage);
      }
      setLanguageDetectionRequested(false);
    },
    onError: () => {
      setLanguageDetectionRequested(false);
    }
  });

  // Translate text mutation
  const { 
    mutate: translate, 
    isLoading: isTranslating, 
    error: translationError 
  } = api.ai.translateText.useMutation({
    onSuccess: (data) => {
      setTranslatedText(data.translatedText);
      if (onTranslationComplete) {
        onTranslationComplete(data.translatedText);
      }
    }
  });

  // Auto-detect language when text changes significantly
  useEffect(() => {
    if (text.length > 10 && !languageDetectionRequested && !isDetecting && !detectedLanguage) {
      setLanguageDetectionRequested(true);
      detectLanguage({ text });
    }
  }, [text, detectLanguage, isDetecting, detectedLanguage, languageDetectionRequested]);

  // Handle language swap
  const handleSwapLanguages = () => {
    if (sourceLanguage && translatedText) {
      const tempLang = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(tempLang);
      setText(translatedText);
      setTranslatedText('');
    }
  };

  // Handle translation
  const handleTranslate = () => {
    if (text && targetLanguage) {
      translate({
        text,
        targetLanguage,
        sourceLanguage,
        preserveFormatting
      });
    }
  };

  // Handle copy translated text
  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compact view for inline/widget use
  if (compact) {
    return (
      <div className={`p-2 border rounded-md bg-background ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-primary" />
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="text-xs bg-muted px-1 py-0.5 rounded-sm"
            disabled={isTranslating}
          >
            {isLoadingLanguages ? (
              <option value="">Loading...</option>
            ) : (
              supportedLanguages?.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !text}
            className="text-xs bg-primary text-white px-2 py-0.5 rounded-sm disabled:opacity-50 flex items-center gap-1"
          >
            {isTranslating ? (
              <Loader className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Languages className="h-3 w-3" />
                Translate
              </>
            )}
          </button>
        </div>
        {translatedText && (
          <div className="text-sm p-2 bg-muted/30 rounded-sm relative">
            <p>{translatedText}</p>
            <button
              onClick={handleCopy}
              className="absolute top-1 right-1 p-1 hover:bg-muted rounded-full"
              title="Copy translation"
            >
              {copied ? (
                <CheckIcon className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={`border rounded-lg bg-card ${className}`}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Translation</h3>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Source language and input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Source Language:</label>
              <select
                value={sourceLanguage || ''}
                onChange={(e) => setSourceLanguage(e.target.value || undefined)}
                className="text-sm bg-muted px-2 py-1 rounded"
              >
                <option value="">Auto-detect</option>
                {isLoadingLanguages ? (
                  <option disabled>Loading languages...</option>
                ) : (
                  supportedLanguages?.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))
                )}
              </select>
              {detectedLanguage && !sourceLanguage && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Detected: {supportedLanguages?.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={preserveFormatting}
                  onChange={(e) => setPreserveFormatting(e.target.checked)}
                  className="h-3 w-3"
                />
                Preserve formatting
              </label>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to translate..."
            className="w-full h-24 p-3 rounded-md border bg-muted/30 text-sm"
            disabled={isTranslating}
          />
          {detectionError && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Error detecting language
            </p>
          )}
        </div>

        {/* Language swap button */}
        <div className="flex justify-center my-2">
          <button
            onClick={handleSwapLanguages}
            disabled={!sourceLanguage || !translatedText || isTranslating}
            className="p-2 rounded-full hover:bg-muted disabled:opacity-50"
            title="Swap languages"
          >
            <ArrowRightLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Target language and output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Target Language:</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="text-sm bg-muted px-2 py-1 rounded"
                disabled={isTranslating}
              >
                {isLoadingLanguages ? (
                  <option disabled>Loading languages...</option>
                ) : (
                  supportedLanguages?.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={translatedText}
              readOnly
              placeholder="Translation will appear here..."
              className="w-full h-24 p-3 rounded-md border bg-muted/30 text-sm"
            />
            {translatedText && (
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full"
                title="Copy translation"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          {translationError && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Error translating text
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              setText('');
              setTranslatedText('');
              setDetectedLanguage(null);
            }}
            disabled={!text && !translatedText}
            className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !text}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {isTranslating ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                Translate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}