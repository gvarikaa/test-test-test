"use client";

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { MetadataGenerationResult } from '@/lib/seo-optimization';
// UI components not available
// import { Button } from '@/app/components/ui';
import { Loader2 } from 'lucide-react';

interface MetadataGeneratorProps {
  content: string;
  url: string;
  title?: string;
  keywords?: string[];
  onMetadataGenerated?: (metadata: MetadataGenerationResult) => void;
  className?: string;
}

export default function MetadataGenerator({
  content,
  url,
  title = '',
  keywords = [],
  onMetadataGenerated,
  className = '',
}: MetadataGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadata, setMetadata] = useState<MetadataGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const generateMetadataMutation = trpc.seo.generateMetadata.useMutation({
    onSuccess: (data) => {
      setMetadata(data);
      if (onMetadataGenerated) {
        onMetadataGenerated(data);
      }
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(`Failed to generate metadata: ${err.message}`);
      setIsGenerating(false);
    }
  });

  const handleGenerateMetadata = async () => {
    setIsGenerating(true);
    setError(null);
    
    generateMetadataMutation.mutate({
      content,
      url,
      title,
      targetKeywords: keywords,
    });
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">AI-Generated Metadata</h3>
        <Button 
          onClick={handleGenerateMetadata}
          disabled={isGenerating || !content}
          variant="primary"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Metadata'
          )}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {metadata && (
        <div className="space-y-4 bg-gray-50 p-4 rounded-md">
          <div>
            <h4 className="font-medium text-sm text-gray-500">Title</h4>
            <p className="font-medium">{metadata.title}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-gray-500">Description</h4>
            <p className="text-sm">{metadata.description}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-gray-500">Keywords</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {metadata.keywords.map((keyword, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          {metadata.openGraph && (
            <div>
              <h4 className="font-medium text-sm text-gray-500">Open Graph</h4>
              <div className="bg-white p-3 rounded border mt-1 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">og:title</span>
                  <span className="col-span-2">{metadata.openGraph.title}</span>
                  
                  <span className="text-gray-500">og:description</span>
                  <span className="col-span-2">{metadata.openGraph.description}</span>
                  
                  <span className="text-gray-500">og:type</span>
                  <span className="col-span-2">{metadata.openGraph.type}</span>
                </div>
              </div>
            </div>
          )}
          
          {metadata.twitter && (
            <div>
              <h4 className="font-medium text-sm text-gray-500">Twitter</h4>
              <div className="bg-white p-3 rounded border mt-1 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">twitter:card</span>
                  <span className="col-span-2">{metadata.twitter.card}</span>
                  
                  <span className="text-gray-500">twitter:title</span>
                  <span className="col-span-2">{metadata.twitter.title}</span>
                  
                  <span className="text-gray-500">twitter:description</span>
                  <span className="col-span-2">{metadata.twitter.description}</span>
                </div>
              </div>
            </div>
          )}
          
          {metadata.structuredData && (
            <div>
              <h4 className="font-medium text-sm text-gray-500">Structured Data Preview</h4>
              <pre className="bg-gray-800 text-gray-200 p-3 rounded text-xs mt-1 overflow-x-auto">
                {JSON.stringify(metadata.structuredData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}