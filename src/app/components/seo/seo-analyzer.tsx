import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { SEOAnalysisResult } from '@/lib/seo-optimization';
import { Button } from '@/app/components/ui';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SEOAnalyzerProps {
  content: string;
  url: string;
  targetKeywords?: string[];
  onAnalysisComplete?: (analysis: SEOAnalysisResult) => void;
  className?: string;
}

export default function SEOAnalyzer({
  content,
  url,
  targetKeywords = [],
  onAnalysisComplete,
  className = '',
}: SEOAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const analyzeSEOMutation = trpc.seo.analyzeSEO.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
      setIsAnalyzing(false);
    },
    onError: (err) => {
      setError(`Failed to analyze SEO: ${err.message}`);
      setIsAnalyzing(false);
    }
  });

  const handleAnalyzeSEO = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    analyzeSEOMutation.mutate({
      content,
      url,
      targetKeywords,
    });
  };
  
  // Helper to render status icon
  const getStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (score >= 50) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">SEO Analysis</h3>
        <Button 
          onClick={handleAnalyzeSEO}
          disabled={isAnalyzing || !content}
          variant="primary"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze SEO'
          )}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 text-sm bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {analysis && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
            <div>
              <h4 className="font-medium">Overall SEO Score</h4>
              <p className="text-sm text-gray-500">Based on content quality, keywords, and structure</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${
                analysis.overallScore >= 80 ? 'text-green-600' :
                analysis.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {analysis.overallScore}/100
              </div>
              {getStatusIcon(analysis.overallScore)}
            </div>
          </div>
          
          {/* Keyword Analysis */}
          <div>
            <h4 className="font-medium mb-2">Keyword Analysis</h4>
            <div className="bg-white rounded-md border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prominence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysis.keywordAnalysis.map((keyword, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{keyword.keyword}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{keyword.frequency}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{keyword.prominence}/10</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          {getStatusIcon(keyword.score * 10)}
                          <span className="ml-1">{keyword.score >= 8 ? 'Good' : keyword.score >= 5 ? 'Moderate' : 'Poor'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Issues */}
          <div>
            <h4 className="font-medium mb-2">Issues and Recommendations</h4>
            <div className="space-y-2">
              {analysis.issues.map((issue, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <div className="flex items-center gap-2">
                    {issue.severity === 'high' ? (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : issue.severity === 'medium' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    )}
                    <span className="font-medium">{issue.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-7">{issue.description}</p>
                  {issue.recommendation && (
                    <div className="ml-7 mt-2 text-sm">
                      <span className="font-medium text-green-600">Recommendation: </span>
                      {issue.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Content Quality */}
          <div>
            <h4 className="font-medium mb-2">Content Quality</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-sm">Readability</div>
                <div className="font-medium text-lg">{analysis.contentQuality.readabilityScore}/10</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-sm">Originality</div>
                <div className="font-medium text-lg">{analysis.contentQuality.originalityScore}/10</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-sm">Relevance</div>
                <div className="font-medium text-lg">{analysis.contentQuality.relevanceScore}/10</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-500 text-sm">Completeness</div>
                <div className="font-medium text-lg">{analysis.contentQuality.completenessScore}/10</div>
              </div>
            </div>
          </div>
          
          {/* Missing Elements */}
          {analysis.missingElements && analysis.missingElements.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Missing Elements</h4>
              <ul className="space-y-1 bg-white p-3 rounded border">
                {analysis.missingElements.map((element, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    {element}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Additional Suggestions */}
          {analysis.suggestions && (
            <div>
              <h4 className="font-medium mb-2">Additional Suggestions</h4>
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                {analysis.suggestions}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}