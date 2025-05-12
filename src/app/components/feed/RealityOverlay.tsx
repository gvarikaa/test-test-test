"use client";

import { useState, useEffect } from 'react';
import { RealityCheckLevel, RealityCheckResult } from '@/lib/reality-check';

interface RealityOverlayProps {
  result: RealityCheckResult;
  postContent: string;
  onClose: () => void;
}

export default function RealityOverlay({ result, postContent, onClose }: RealityOverlayProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'media'>('overview');
  const [expanded, setExpanded] = useState(false);
  
  // Color mapping for different reality levels
  const colorMap: Record<RealityCheckLevel, {bg: string, text: string, border: string}> = {
    [RealityCheckLevel.VERIFIED]: {
      bg: 'bg-green-500/80',
      text: 'text-green-50',
      border: 'border-green-400'
    },
    [RealityCheckLevel.LIKELY_TRUE]: {
      bg: 'bg-emerald-500/80',
      text: 'text-emerald-50',
      border: 'border-emerald-400'
    },
    [RealityCheckLevel.MIXED]: {
      bg: 'bg-yellow-500/80',
      text: 'text-yellow-50',
      border: 'border-yellow-400'
    },
    [RealityCheckLevel.MISLEADING]: {
      bg: 'bg-orange-500/80',
      text: 'text-orange-50',
      border: 'border-orange-400'
    },
    [RealityCheckLevel.UNVERIFIED]: {
      bg: 'bg-blue-500/80',
      text: 'text-blue-50',
      border: 'border-blue-400'
    },
    [RealityCheckLevel.FALSE]: {
      bg: 'bg-red-500/80',
      text: 'text-red-50',
      border: 'border-red-400'
    },
    [RealityCheckLevel.SATIRE]: {
      bg: 'bg-purple-500/80',
      text: 'text-purple-50',
      border: 'border-purple-400'
    },
    [RealityCheckLevel.MANIPULATED]: {
      bg: 'bg-rose-500/80',
      text: 'text-rose-50',
      border: 'border-rose-400'
    }
  };
  
  // Get colors for current rating
  const colors = colorMap[result.overallRating] || colorMap[RealityCheckLevel.UNVERIFIED];
  
  // Add animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpanded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
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
      default: return "Unknown";
    }
  };
  
  // Truth meter visual component
  const TruthMeter = () => {
    return (
      <div className="w-full h-6 bg-gray-800 rounded-full overflow-hidden relative">
        <div 
          className={`h-full ${colors.bg} transition-all duration-1000 ease-out`}
          style={{ width: `${result.truthScore}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
          {result.truthScore}% Reality Score
        </div>
      </div>
    );
  };
  
  // Tab navigation
  const TabNavigation = () => {
    return (
      <div className="flex border-b border-gray-700 mb-2">
        <button
          className={`px-3 py-1 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 ' + colors.border : 'text-gray-400'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium ${activeTab === 'detailed' ? 'border-b-2 ' + colors.border : 'text-gray-400'}`}
          onClick={() => setActiveTab('detailed')}
        >
          Detailed Analysis
        </button>
        {result.mediaAnalysis && (
          <button
            className={`px-3 py-1 text-sm font-medium ${activeTab === 'media' ? 'border-b-2 ' + colors.border : 'text-gray-400'}`}
            onClick={() => setActiveTab('media')}
          >
            Media Check
          </button>
        )}
      </div>
    );
  };
  
  // Overview tab content
  const OverviewTab = () => {
    return (
      <div className="space-y-3">
        <div>
          <div className="text-center mb-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
              {getRealityLevelLabel(result.overallRating)}
            </span>
          </div>
          
          <TruthMeter />
        </div>
        
        <div className="border-t border-gray-700 pt-2">
          <p className="text-sm">{result.summary}</p>
        </div>
        
        {/* Claim quick view */}
        {result.factualClaims.length > 0 && (
          <div className="border-t border-gray-700 pt-2">
            <h4 className="text-sm font-medium mb-1">Top Claims Identified:</h4>
            <ul className="space-y-1">
              {result.factualClaims.map((claim, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className={`inline-block w-2 h-2 mt-1 rounded-full ${colorMap[claim.assessment].bg}`}></span>
                  <span>{claim.claim}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="text-xs text-gray-400 text-center">
          Analysis completed in {(result.processingTime / 1000).toFixed(1)}s
        </div>
      </div>
    );
  };
  
  // Detailed tab content
  const DetailedTab = () => {
    return (
      <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {/* Tone assessment */}
        <div className="bg-gray-800/30 p-2 rounded">
          <div className="text-xs text-gray-400">Tone Analysis</div>
          <div className="text-sm">{result.toneAssessment}</div>
        </div>
        
        {/* Segment-by-segment analysis */}
        {result.segments && result.segments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Sentence-by-Sentence Analysis:</h4>
            <div className="space-y-2">
              {result.segments.map((segment, i) => {
                const segmentColors = colorMap[segment.truthLevel];
                return (
                  <div key={i} className="p-2 rounded bg-gray-800/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${segmentColors.bg} ${segmentColors.text}`}>
                        {getRealityLevelLabel(segment.truthLevel)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(segment.confidenceScore * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm mb-1">{segment.text}</p>
                    <p className="text-xs text-gray-400">{segment.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Factual claims */}
        <div>
          <h4 className="text-sm font-medium mb-1">Factual Claims:</h4>
          <div className="space-y-2">
            {result.factualClaims.map((claim, i) => {
              const claimColors = colorMap[claim.assessment];
              return (
                <div key={i} className="p-2 rounded bg-gray-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${claimColors.bg} ${claimColors.text}`}>
                      {getRealityLevelLabel(claim.assessment)}
                    </span>
                  </div>
                  <p className="text-sm mb-1">{claim.claim}</p>
                  <p className="text-xs text-gray-400">{claim.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // Media tab content
  const MediaTab = () => {
    if (!result.mediaAnalysis) return <div>No media analysis available</div>;
    
    const media = result.mediaAnalysis;
    const manipulationColors = media.isTampered ? colorMap[RealityCheckLevel.MANIPULATED] : colorMap[RealityCheckLevel.VERIFIED];
    
    return (
      <div className="space-y-3">
        <div className={`p-2 rounded ${media.isTampered ? 'bg-rose-900/30' : 'bg-green-900/30'}`}>
          <h4 className="font-medium">Media Assessment</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className={`h-2 w-2 rounded-full ${media.isTampered ? 'bg-rose-500' : 'bg-green-500'}`}></div>
            <span>
              {media.isTampered ? 'Manipulation detected' : 'No manipulation detected'}
            </span>
          </div>
        </div>
        
        {/* Deepfake probability */}
        <div className="bg-gray-800/30 p-2 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm">Deepfake Probability:</span>
            <span className="text-sm font-medium">
              {Math.round(media.deepfakeProbability * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full ${media.deepfakeProbability > 0.5 ? 'bg-rose-500' : 'bg-green-500'}`}
              style={{ width: `${media.deepfakeProbability * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* AI generation */}
        <div className="bg-gray-800/30 p-2 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm">AI Generated:</span>
            <span className={`text-sm font-medium ${media.generatedByAI ? 'text-yellow-400' : 'text-green-400'}`}>
              {media.generatedByAI ? 'Likely' : 'Unlikely'}
            </span>
          </div>
        </div>
        
        {/* Manipulation details */}
        {media.manipulationDetails && (
          <div className="bg-gray-800/30 p-2 rounded">
            <div className="text-xs text-gray-400">Manipulation Details</div>
            <div className="text-sm">{media.manipulationDetails}</div>
          </div>
        )}
        
        {/* Original source */}
        {media.originalSource && (
          <div className="bg-gray-800/30 p-2 rounded">
            <div className="text-xs text-gray-400">Original Source</div>
            <div className="text-sm">{media.originalSource}</div>
          </div>
        )}
        
        <div className="text-xs text-gray-400 text-center">
          Analysis confidence: {Math.round(media.confidenceScore * 100)}%
        </div>
      </div>
    );
  };
  
  // Render appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'detailed':
        return <DetailedTab />;
      case 'media':
        return <MediaTab />;
      case 'overview':
      default:
        return <OverviewTab />;
    }
  };
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`relative w-11/12 max-w-xl bg-gray-900 border ${colors.border} rounded-lg shadow-xl transition-all duration-500 ease-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between ${colors.bg} rounded-t-lg p-3`}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <h3 className="font-bold">Reality Check</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <TabNavigation />
          {renderTabContent()}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-3 text-center text-xs text-gray-400">
          <p>This analysis uses advanced AI to assess content truthfulness and may not be 100% accurate.</p>
        </div>
      </div>
    </div>
  );
}