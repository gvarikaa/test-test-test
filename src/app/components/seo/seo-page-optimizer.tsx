"use client";

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { MetadataGenerationResult } from '@/lib/seo-optimization';
// UI components not available
// import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui';
import { Loader2 } from 'lucide-react';
import { SEOAnalyzer } from './seo-analyzer';
import { MetadataGenerator } from './metadata-generator';
import { ContentOptimizer } from './content-optimizer';
import { FAQGenerator } from './faq-generator';
import { KeywordAnalyzer } from './keyword-analyzer';

interface SEOPageOptimizerProps {
  initialUrl?: string;
  initialTitle?: string;
  initialContent?: string;
  initialKeywords?: string[];
  className?: string;
}

export default function SEOPageOptimizer({
  initialUrl = '',
  initialTitle = '',
  initialContent = '',
  initialKeywords = [],
  className = '',
}: SEOPageOptimizerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [activeTab, setActiveTab] = useState('keywords');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataGenerationResult | null>(null);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'keywords') {
      setActiveTab('analyze');
    }
  };
  
  // Handle keywords change from the KeywordAnalyzer component
  const handleKeywordsSelected = (selectedKeywords: string[]) => {
    setKeywords(selectedKeywords);
  };
  
  // Handle metadata generated from the MetadataGenerator component
  const handleMetadataGenerated = (generatedMetadata: MetadataGenerationResult) => {
    setMetadata(generatedMetadata);
    
    // Update title if not set by user
    if (!title && generatedMetadata.title) {
      setTitle(generatedMetadata.title);
    }
    
    // Update keywords if none selected by user
    if (keywords.length === 0 && generatedMetadata.keywords.length > 0) {
      setKeywords(generatedMetadata.keywords);
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Page URL
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the URL for the page you want to optimize (optional)
            </p>
          </div>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Page Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter page title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Page Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter or paste your page content here..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit"
            variant="primary"
            disabled={!content}
          >
            {activeTab === 'keywords' ? 'Start Optimization' : 'Update Content'}
          </Button>
        </div>
      </form>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b mb-6">
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>
        
        <TabsContent value="keywords" className="pt-2">
          <KeywordAnalyzer
            content={content}
            url={url}
            initialKeywords={keywords}
            onKeywordsSelected={handleKeywordsSelected}
          />
        </TabsContent>
        
        <TabsContent value="analyze" className="pt-2">
          <SEOAnalyzer
            content={content}
            url={url}
            targetKeywords={keywords}
          />
        </TabsContent>
        
        <TabsContent value="metadata" className="pt-2">
          <MetadataGenerator
            content={content}
            url={url}
            title={title}
            keywords={keywords}
            onMetadataGenerated={handleMetadataGenerated}
          />
        </TabsContent>
        
        <TabsContent value="optimize" className="pt-2">
          <ContentOptimizer
            content={content}
            targetKeywords={keywords}
            onOptimizedContent={(result) => setContent(result.optimizedContent)}
          />
        </TabsContent>
        
        <TabsContent value="faq" className="pt-2">
          <FAQGenerator
            content={content}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}