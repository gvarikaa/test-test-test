'use client';

import { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { MediaType } from '@prisma/client';
import { StorageProviderType } from '@/lib/storage/storage-factory';

interface UploadResult {
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
}

/**
 * StorageUploadForm
 * 
 * This component demonstrates how the client-side code interacts with our
 * storage abstraction without knowing about the underlying implementation.
 * The component uses the API endpoint which internally uses the StorageProvider
 * abstraction.
 */
export default function StorageUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<StorageProviderType>('bunny');

  // Handle file selection
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  }, []);

  // Handle storage provider selection
  const handleStorageTypeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setStorageType(e.target.value as StorageProviderType);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    try {
      setIsUploading(true);
      setProgress(0);
      setError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('storageType', storageType);
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      // Set up progress listener
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress(percentage);
        }
      });
      
      // Create a promise to handle the upload
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url,
              mediaType: response.mediaType,
              thumbnailUrl: response.thumbnailUrl,
            });
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (_e) {
              // Parsing error, use default message
            }
            reject(new Error(errorMessage));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });
        
        // Send the request
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
      
      // Wait for upload to complete
      const uploadResult = await uploadPromise;
      setResult(uploadResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [file, storageType]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">File Upload</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Storage Provider Selection */}
        <div>
          <label htmlFor="storageType" className="block text-sm font-medium text-gray-700 mb-1">
            Storage Provider
          </label>
          <select
            id="storageType"
            value={storageType}
            onChange={handleStorageTypeChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          >
            <option value="bunny">Bunny CDN</option>
            {/* Add other providers as they are implemented */}
            <option value="s3" disabled>Amazon S3 (Coming Soon)</option>
            <option value="local" disabled>Local Storage (Coming Soon)</option>
          </select>
        </div>
        
        {/* File Input */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            Select File
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || isUploading}
          className={`w-full py-2 px-4 rounded-md ${
            !file || isUploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } transition-colors`}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        
        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 text-sm text-gray-600">{progress}%</p>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Upload Result */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-semibold text-green-800 mb-2">Upload Successful!</h3>
            
            {/* Display the uploaded file */}
            <div className="mt-2">
              {result.mediaType === 'IMAGE' && (
                <img 
                  src={result.url} 
                  alt="Uploaded" 
                  className="max-w-full h-auto rounded-md border border-gray-200"
                />
              )}
              
              {result.mediaType === 'VIDEO' && (
                <video 
                  src={result.url} 
                  controls 
                  className="max-w-full h-auto rounded-md border border-gray-200"
                  poster={result.thumbnailUrl}
                />
              )}
              
              {(result.mediaType === 'AUDIO' || result.mediaType === 'DOCUMENT') && (
                <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View File
                  </a>
                </div>
              )}
            </div>
            
            {/* File URL */}
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">File URL:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={result.url}
                  className="flex-1 p-1 text-sm border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.url)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-r-md border border-gray-300 border-l-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      
      <div className="mt-8 border-t pt-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">About This Component</h3>
        <p className="text-sm text-gray-600">
          This component demonstrates the Dependency Inversion Principle by using an abstracted storage interface. 
          The component does not know which storage provider is actually handling the file - it just sends the file
          to the API endpoint which internally uses the StorageProvider abstraction.
        </p>
      </div>
    </div>
  );
}