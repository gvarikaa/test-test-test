import { Suspense } from 'react';
// Temporarily commenting out SEO components due to missing UI dependencies
// import {
//   SEOPageOptimizer
// } from '@/app/components/seo';

export const metadata = {
  title: 'SEO Management | DapDip Admin',
  description: 'Manage and optimize SEO for your content with AI-powered tools',
};

export default function SEOPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">SEO Management</h1>

      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">AI-Powered SEO Tools</h2>
        <p className="text-gray-600 mb-6">
          Use these AI-powered tools to analyze, optimize, and enhance the SEO of your content.
          Generate metadata, analyze keywords, optimize content for better search rankings, and create SEO-friendly FAQ sections.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 border rounded-md flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">SEO Analysis</h3>
              <p className="text-sm text-gray-500">Get a comprehensive analysis of your content's SEO performance</p>
            </div>
          </div>

          <div className="p-4 border rounded-md flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Keyword Analysis</h3>
              <p className="text-sm text-gray-500">Analyze and discover high-impact keywords for your content</p>
            </div>
          </div>

          <div className="p-4 border rounded-md flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Content Optimization</h3>
              <p className="text-sm text-gray-500">Optimize your content for better search engine rankings</p>
            </div>
          </div>

          <div className="p-4 border rounded-md flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">FAQ Generation</h3>
              <p className="text-sm text-gray-500">Create SEO-friendly FAQ sections with structured data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
        <div className="border-b">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold">Content Editor with SEO Tools</h2>
            <p className="text-sm text-gray-500">
              Enter your content below to analyze and optimize it for SEO
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="p-6">Loading content editor...</div>}>
          <div className="p-6">
            {/* SEO component temporarily disabled due to missing UI dependencies */}
            <div className="p-4 border rounded-lg bg-gray-50 text-center">
              <p className="text-gray-500">SEO tools are currently unavailable</p>
            </div>
            {/* <SEOPageOptimizer
              initialContent="Welcome to DapDip, the social platform that connects people through shared interests and experiences. Our intuitive interface makes it easy to share content, discover new connections, and engage with communities that matter to you."
              initialTitle="DapDip - Connect, Share, and Discover"
              initialKeywords={['social platform', 'content sharing', 'community']}
            /> */}
          </div>
        </Suspense>
      </div>
    </div>
  );
}