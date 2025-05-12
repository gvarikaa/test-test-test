"use client";

import { useState, useEffect } from 'react';
import { RealityCheckLevel, RealityCheckResult } from '@/lib/reality-check';
import Image from 'next/image';

interface InlineRealityCheckProps {
  result: RealityCheckResult;
  postContent: string;
  mediaUrls?: string[];
  onClose: () => void;
}

export default function InlineRealityCheck({
  result,
  postContent,
  mediaUrls,
  onClose
}: InlineRealityCheckProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'media'>('summary');
  const [showFullContent, setShowFullContent] = useState(false);

  // Color mapping for different reality levels
  const colorMap: Record<RealityCheckLevel, {bg: string, text: string, border: string, gradient: string}> = {
    [RealityCheckLevel.VERIFIED]: {
      bg: 'bg-green-500/70',
      text: 'text-green-50',
      border: 'border-green-400',
      gradient: 'from-green-600 to-green-400'
    },
    [RealityCheckLevel.LIKELY_TRUE]: {
      bg: 'bg-emerald-500/70',
      text: 'text-emerald-50',
      border: 'border-emerald-400',
      gradient: 'from-emerald-600 to-emerald-400'
    },
    [RealityCheckLevel.MIXED]: {
      bg: 'bg-yellow-500/70',
      text: 'text-yellow-50',
      border: 'border-yellow-400',
      gradient: 'from-yellow-600 to-yellow-400'
    },
    [RealityCheckLevel.MISLEADING]: {
      bg: 'bg-orange-500/70',
      text: 'text-orange-50',
      border: 'border-orange-400',
      gradient: 'from-orange-600 to-orange-400'
    },
    [RealityCheckLevel.UNVERIFIED]: {
      bg: 'bg-blue-500/70',
      text: 'text-blue-50',
      border: 'border-blue-400',
      gradient: 'from-blue-600 to-blue-400'
    },
    [RealityCheckLevel.FALSE]: {
      bg: 'bg-red-500/70',
      text: 'text-red-50',
      border: 'border-red-400',
      gradient: 'from-red-600 to-red-400'
    },
    [RealityCheckLevel.SATIRE]: {
      bg: 'bg-purple-500/70',
      text: 'text-purple-50',
      border: 'border-purple-400',
      gradient: 'from-purple-600 to-purple-400'
    },
    [RealityCheckLevel.MANIPULATED]: {
      bg: 'bg-rose-500/70',
      text: 'text-rose-50',
      border: 'border-rose-400',
      gradient: 'from-rose-600 to-rose-400'
    },
    [RealityCheckLevel.OPINION_ONLY]: {
      bg: 'bg-indigo-500/70',
      text: 'text-indigo-50',
      border: 'border-indigo-400',
      gradient: 'from-indigo-600 to-indigo-400'
    },
    [RealityCheckLevel.NONSENSICAL]: {
      bg: 'bg-gray-500/70',
      text: 'text-gray-50',
      border: 'border-gray-400',
      gradient: 'from-gray-600 to-gray-400'
    },
    [RealityCheckLevel.SOCIAL_ONLY]: {
      bg: 'bg-sky-500/70',
      text: 'text-sky-50',
      border: 'border-sky-400',
      gradient: 'from-sky-600 to-sky-400'
    },
    [RealityCheckLevel.ENTERTAINMENT_ONLY]: {
      bg: 'bg-fuchsia-500/70',
      text: 'text-fuchsia-50',
      border: 'border-fuchsia-400',
      gradient: 'from-fuchsia-600 to-fuchsia-400'
    }
  };
  
  // Get colors for current rating
  const colors = colorMap[result.overallRating] || colorMap[RealityCheckLevel.UNVERIFIED];
  
  // Get a human-readable label for the reality level
  const getRealityLevelLabel = (level: RealityCheckLevel): string => {
    switch(level) {
      case RealityCheckLevel.VERIFIED: return "Verified";
      case RealityCheckLevel.LIKELY_TRUE: return "Likely True";
      case RealityCheckLevel.MIXED: return "Mixed Content";
      case RealityCheckLevel.MISLEADING: return "Misleading";
      case RealityCheckLevel.UNVERIFIED: return "Unverified";
      case RealityCheckLevel.FALSE: return "False";
      case RealityCheckLevel.SATIRE: return "Satire";
      case RealityCheckLevel.MANIPULATED: return "Manipulated";
      case RealityCheckLevel.OPINION_ONLY: return "Opinion Only";
      case RealityCheckLevel.NONSENSICAL: return "Nonsensical";
      case RealityCheckLevel.SOCIAL_ONLY: return "Social Only";
      case RealityCheckLevel.ENTERTAINMENT_ONLY: return "Entertainment";
      default: return "Unknown";
    }
  };
  
  // TruthScore badge component
  const TruthBadge = () => {
    return (
      <div className="relative">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${colors.bg} bg-opacity-30 border-4 ${colors.border}`}>
          {result.truthScore !== null ? (
            <span className="text-2xl font-bold text-white">{result.truthScore}%</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs whitespace-nowrap">
          {getRealityLevelLabel(result.overallRating)}
        </div>
      </div>
    );
  };
  
  // Tab navigation
  const TabNavigation = () => {
    return (
      <div className="flex space-x-1 border-b border-gray-700/50 mb-3">
        <button
          className={`px-3 py-1 text-sm font-medium rounded-t-md ${activeTab === 'summary' ? colors.bg + ' ' + colors.text : 'bg-gray-800/50 text-gray-300'}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-t-md ${activeTab === 'details' ? colors.bg + ' ' + colors.text : 'bg-gray-800/50 text-gray-300'}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        {result.mediaAnalysis && (
          <button
            className={`px-3 py-1 text-sm font-medium rounded-t-md ${activeTab === 'media' ? colors.bg + ' ' + colors.text : 'bg-gray-800/50 text-gray-300'}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
        )}
      </div>
    );
  };
  
  // Summary tab content
  const SummaryTab = () => {
    // Check if content needs fact checking at all
    if (!result.needsFactCheck) {
      return (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${colors.bg} bg-opacity-30 border-4 ${colors.border}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs whitespace-nowrap">
              {getRealityLevelLabel(result.overallRating)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-black/30 mt-4">
            <h3 className="font-bold text-lg text-center mb-2">Not Fact-Checkable Content</h3>
            <p className="text-center">{result.analysisMessage}</p>
          </div>

          <div className="p-3 rounded-lg bg-black/30">
            <p className="italic text-center">{result.summary}</p>
          </div>
        </div>
      );
    }

    // Regular fact-checkable content
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center">
          <TruthBadge />
          <h3 className="mt-2 text-lg font-medium text-center">Truth Score</h3>
        </div>

        <div className="p-3 rounded-lg bg-black/30">
          <p className="italic text-center">{result.summary}</p>
        </div>

        {result.factualClaims.length > 0 && result.factualClaims.length <= 2 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Key Claims:</h4>
            <div className="space-y-2">
              {result.factualClaims.map((claim, i) => {
                const claimColors = colorMap[claim.assessment];
                return (
                  <div key={i} className={`p-2 rounded bg-black/30 border-l-4 ${claimColors.border}`}>
                    <div className="text-sm">{claim.claim}</div>
                    <div className="mt-1 text-xs flex items-center gap-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full ${claimColors.bg} ${claimColors.text} text-[10px]`}>
                        {getRealityLevelLabel(claim.assessment)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Details tab content with segment analysis
  const DetailsTab = () => {
    // If content doesn't need fact checking, show simplified view
    if (!result.needsFactCheck) {
      return (
        <div className="space-y-3">
          <div className="bg-black/30 rounded-lg p-3">
            <h4 className="font-medium mb-2">Content Type</h4>
            <p className="text-sm">This content has been classified as: <span className="font-semibold">{getRealityLevelLabel(result.overallRating)}</span></p>
            <p className="text-sm mt-2">{result.analysisMessage}</p>
          </div>

          <div className="bg-black/30 rounded-lg p-3">
            <h4 className="font-medium mb-2">Original Content</h4>
            <p className="text-sm whitespace-pre-line">{postContent}</p>
          </div>

          <div className="bg-black/30 rounded-lg p-3">
            <h4 className="font-medium mb-2">Tone Assessment</h4>
            <p className="text-sm">{result.toneAssessment}</p>
          </div>
        </div>
      );
    }

    // Split text into segments if we have that data for fact-checkable content
    const renderSegmentedText = () => {
      if (!result.segments || result.segments.length === 0) {
        return <p className="whitespace-pre-line">{postContent}</p>;
      }

      return (
        <div className="text-analysis">
          {result.segments.map((segment, i) => {
            const segColors = colorMap[segment.truthLevel];
            return (
              <span
                key={i}
                className="relative group"
              >
                <span className={`px-1 py-0.5 rounded ${segColors.bg} bg-opacity-30`}>
                  {segment.text}
                </span>
                <span className="absolute bottom-full left-0 mb-1 w-48 bg-black/90 p-2 rounded text-xs invisible group-hover:visible z-10">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full ${segColors.bg} ${segColors.text} text-[10px] mb-1`}>
                    {getRealityLevelLabel(segment.truthLevel)}
                  </span>
                  <p>{segment.explanation}</p>
                </span>
              </span>
            );
          })}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <div className="bg-black/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Content Analysis</h4>
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-xs underline"
            >
              {showFullContent ? "Show Less" : "Show Full Analysis"}
            </button>
          </div>

          <div className={`${showFullContent ? '' : 'max-h-36 overflow-hidden relative'}`}>
            {renderSegmentedText()}
            {!showFullContent && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent"></div>
            )}
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <h4 className="font-medium mb-2">Tone Assessment</h4>
          <p className="text-sm">{result.toneAssessment}</p>
        </div>
      </div>
    );
  };
  
  // Media tab content
  const MediaTab = () => {
    if (!result.mediaAnalysis) return <div>No media analysis available</div>;
    
    const media = result.mediaAnalysis;
    
    return (
      <div className="space-y-3">
        {mediaUrls && mediaUrls.length > 0 && (
          <div className="relative">
            <div className="aspect-video rounded-lg overflow-hidden relative">
              <Image
                src={mediaUrls[0]}
                alt="Post media"
                width={500}
                height={300}
                className="w-full h-full object-cover filter blur-sm"
              />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                <p className="text-lg font-bold">Media Analysis</p>
                <div className={`mt-2 px-3 py-1 rounded-full ${media.isTampered ? 'bg-red-500' : 'bg-green-500'}`}>
                  {media.isTampered ? 'Manipulated Content Detected' : 'No Manipulation Detected'}
                </div>
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-black/30 p-2 rounded">
                <div className="text-xs text-gray-400">AI Generated</div>
                <div className="text-sm font-medium">{media.generatedByAI ? 'Likely' : 'Unlikely'}</div>
              </div>
              <div className="bg-black/30 p-2 rounded">
                <div className="text-xs text-gray-400">Deepfake Probability</div>
                <div className="text-sm font-medium">{Math.round(media.deepfakeProbability * 100)}%</div>
              </div>
            </div>
          </div>
        )}
        
        {media.manipulationDetails && (
          <div className="bg-black/30 p-3 rounded">
            <div className="text-xs text-gray-400 mb-1">Manipulation Details</div>
            <div className="text-sm">{media.manipulationDetails}</div>
          </div>
        )}
      </div>
    );
  };
  
  // Render appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <DetailsTab />;
      case 'media':
        return <MediaTab />;
      case 'summary':
      default:
        return <SummaryTab />;
    }
  };
  
  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Background - blurred version of post content */}
      <div className="absolute inset-0 z-0">
        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="relative w-full h-full">
            <Image
              src={mediaUrls[0]}
              alt="Background"
              fill
              className="object-cover filter blur-md"
            />
            <div className="absolute inset-0 bg-black/70"></div>
          </div>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} opacity-20`}></div>
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-4 backdrop-blur-md bg-black/50">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${colors.text}`}>
              <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.75 6.75 0 1113.5 0v4.661c0 .326.277.585.6.544.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
              <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 01.877-.597 11.319 11.319 0 004.22 0 .75.75 0 11.28 1.473 12.819 12.819 0 01-4.78 0 .75.75 0 01-.597-.876zM9.754 22.344a.75.75 0 01.824-.668 13.682 13.682 0 002.844 0 .75.75 0 11.156 1.492 15.156 15.156 0 01-3.156 0 .75.75 0 01-.668-.824z" clipRule="evenodd" />
            </svg>
            <h3 className={`font-bold text-lg ${colors.text}`}>AI ANALYSIS</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tab navigation */}
        <TabNavigation />
        
        {/* Content */}
        <div className="min-h-[220px]">
          {renderTabContent()}
        </div>
        
        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-700/50 flex justify-between items-center text-xs text-gray-400">
          <div>Analysis completed in {(result.processingTime / 1000).toFixed(1)}s</div>
          <div>Powered by AI • Content analyzer v{result.dataVersion}</div>
        </div>
      </div>
    </div>
  );
}