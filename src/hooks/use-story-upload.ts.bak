"use client";

import { useState } from "react";
import { MediaType } from "@prisma/client";

interface UploadOptions {
  file: File;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Custom hook for handling media uploads for stories
 */
export function useStoryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Upload a media file for stories
   */
  const uploadMedia = async (file: File, onProgress?: (progress: number) => void): Promise<UploadResult | null> => {
    if (!file) {
      setError("No file provided");
      return null;
    }

    // Map of MIME types to MediaType
    const mimeToMediaType: Record<string, MediaType> = {
      "image/jpeg": "IMAGE",
      "image/png": "IMAGE",
      "image/gif": "IMAGE", 
      "image/webp": "IMAGE",
      "video/mp4": "VIDEO",
      "video/webm": "VIDEO",
      "video/quicktime": "VIDEO"
    };

    // Check file type
    const mediaType = mimeToMediaType[file.type];
    if (!mediaType) {
      setError("File type not allowed");
      return null;
    }

    try {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", mediaType);
      
      // Create a progress tracking function
      const updateProgress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          setProgress(percentCompleted);
          if (onProgress) {
            onProgress(percentCompleted);
          }
        }
      };

      // Use the fetch API with progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.addEventListener("progress", updateProgress);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                url: response.url,
                mediaType: mediaType,
                thumbnailUrl: response.thumbnailUrl,
                // We might not have these values from the server, but we can estimate some from file
                width: undefined,
                height: undefined,
                duration: undefined
              });
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          } else {
            let errorMsg = "Upload failed";
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMsg = errorData.message || errorMsg;
            } catch (_) {
              // Use default error message if parsing fails
            }
            reject(new Error(errorMsg));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Network error occurred"));
        };
        
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      const result = await uploadPromise;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Cancel any ongoing upload
   */
  const cancelUpload = () => {
    // Implement cancellation logic if needed
    setIsUploading(false);
    setProgress(0);
  };

  return {
    uploadMedia,
    cancelUpload,
    isUploading,
    progress,
    error,
    setError,
  };
}