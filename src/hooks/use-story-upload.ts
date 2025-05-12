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
 * Enum for upload states
 */
enum UploadState {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * Custom hook for handling media uploads for stories
 * with enhanced support for concurrent uploads and better state tracking
 */
export function useStoryUpload() {
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [activeUploads, setActiveUploads] = useState<Map<string, AbortController>>(new Map());

  // Track overall progress for multiple files
  const [totalProgress, setTotalProgress] = useState(0);
  
  /**
   * Upload multiple files concurrently
   * @param files Array of files to upload
   * @param onTotalProgress Callback for overall upload progress
   * @param onFileProgress Callback for individual file progress
   * @returns Array of upload results or null
   */
  const uploadMultipleFiles = async (
    files: File[],
    onTotalProgress?: (progress: number) => void,
    onFileProgress?: (fileId: string, progress: number) => void
  ): Promise<(UploadResult | null)[]> => {
    if (!files.length) {
      setError("No files provided");
      return [];
    }

    // Reset state for new batch upload
    setTotalProgress(0);
    setUploadState(UploadState.UPLOADING);
    setIsUploading(true);
    setError(null);

    // Clear any existing active uploads
    activeUploads.forEach(controller => controller.abort());
    setActiveUploads(new Map());

    // Create a unique ID for each file based on name and size
    const fileIds = files.map(file => `${file.name}-${file.size}-${Date.now()}`);

    // Initialize progress tracking for all files
    const progressMap = new Map<string, number>();
    fileIds.forEach(id => progressMap.set(id, 0));

    // Create new abort controllers for each file
    const controllers = new Map<string, AbortController>();
    fileIds.forEach(id => {
      controllers.set(id, new AbortController());
    });
    setActiveUploads(controllers);

    // Function to update individual and total progress
    const updateProgress = (fileId: string, fileProgress: number) => {
      progressMap.set(fileId, fileProgress);

      // Calculate total progress across all files
      const totalProgress = Array.from(progressMap.values()).reduce(
        (sum, progress) => sum + progress, 0
      ) / files.length;

      setTotalProgress(totalProgress);
      if (onTotalProgress) {
        onTotalProgress(totalProgress);
      }

      if (onFileProgress) {
        onFileProgress(fileId, fileProgress);
      }
    };

    // Upload all files concurrently
    const uploadPromises = files.map(async (file, index) => {
      const fileId = fileIds[index];
      const controller = controllers.get(fileId)!;

      // Create a progress update function for this specific file
      const onProgress = (progress: number) => updateProgress(fileId, progress);

      try {
        return await uploadMedia(file, onProgress, controller);
      } catch (err) {
        console.error(`Error uploading file ${fileId}:`, err);
        return null;
      }
    });

    try {
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      setUploadState(UploadState.SUCCESS);
      return results;
    } catch (err) {
      setUploadState(UploadState.ERROR);
      const errorMessage = err instanceof Error ? err.message : "Failed to upload files";
      setError(errorMessage);
      return files.map(() => null);
    } finally {
      setIsUploading(false);
      setActiveUploads(new Map());
    }
  };

  /**
   * Upload a media file for stories using modern fetch API
   * @param file File to upload
   * @param onProgress Progress callback
   * @param customController Optional custom AbortController
   */
  const uploadMedia = async (
    file: File,
    onProgress?: (progress: number) => void,
    customController?: AbortController
  ): Promise<UploadResult | null> => {
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
      setUploadState(UploadState.UPLOADING);

      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", mediaType);

      // Use provided controller or create a new one
      const abortController = customController || new AbortController();
      // Only set the controller state if we're not using a custom one
      if (!customController) {
        setController(abortController);
      }

      // Since fetch doesn't have native progress support, we use ReadableStream
      // to track progress if browser supports it
      const supportsStreams = typeof ReadableStream !== 'undefined';
      let response;

      if (supportsStreams && onProgress) {
        // For browsers with ReadableStream support, we can monitor progress
        const fetchWithProgress = async () => {
          response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            signal: abortController.signal,
            headers: {
              // Add request ID for tracking in logs
              'X-Request-ID': `upload-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            }
          });

          const reader = response.body?.getReader();
          const contentLength = +response.headers.get('Content-Length' || '0');

          if (!reader) {
            throw new Error('ReadableStream not supported or response body is null');
          }

          let receivedLength = 0;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            receivedLength += value.length;

            // Calculate progress if content length is available
            if (contentLength > 0) {
              const progress = Math.round((receivedLength * 100) / contentLength);
              setProgress(progress);
              if (onProgress) {
                onProgress(progress);
              }
            }
          }

          // Get the response
          const responseText = await response.text();
          return JSON.parse(responseText);
        };

        const responseData = await fetchWithProgress();

        return {
          url: responseData.url,
          mediaType: mediaType,
          thumbnailUrl: responseData.thumbnailUrl,
          width: responseData.width,
          height: responseData.height,
          duration: responseData.duration
        };
      } else {
        // Fallback for browsers without ReadableStream support or when no progress callback
        response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
          headers: {
            // Add request ID for tracking in logs
            'X-Request-ID': `upload-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
          throw new Error(errorData.message || "Upload failed");
        }

        const responseData = await response.json();

        // Set progress to 100% when complete
        setProgress(100);
        if (onProgress) {
          onProgress(100);
        }

        return {
          url: responseData.url,
          mediaType: mediaType,
          thumbnailUrl: responseData.thumbnailUrl,
          width: responseData.width,
          height: responseData.height,
          duration: responseData.duration
        };
      }
    } catch (err) {
      // Enhanced error handling with more context
      let errorMessage;
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error("Upload error details:", err);
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        errorMessage = "Upload was cancelled";
        setUploadState(UploadState.CANCELLED);
      } else {
        errorMessage = "Upload failed due to an unexpected error";
        console.error("Unknown upload error:", err);
      }

      setError(errorMessage);
      setUploadState(UploadState.ERROR);
      return null;
    } finally {
      setIsUploading(false);
      // Only clear the controller reference if we're not using a custom one
      if (!customController) {
        setController(null);
      }
    }
  };

  /**
   * Cancel any ongoing upload
   * @param fileId Optional fileId to cancel specific upload in batch mode
   */
  const cancelUpload = (fileId?: string) => {
    if (fileId && activeUploads.has(fileId)) {
      // Cancel specific upload
      const controller = activeUploads.get(fileId)!;
      controller.abort();

      // Remove this upload from active uploads
      const newUploads = new Map(activeUploads);
      newUploads.delete(fileId);
      setActiveUploads(newUploads);

      // If no more active uploads, reset state
      if (newUploads.size === 0) {
        setIsUploading(false);
        setUploadState(UploadState.CANCELLED);
      }
    } else {
      // Cancel all uploads including the single upload mode
      if (controller) {
        controller.abort();
        setController(null);
      }

      // Cancel all active uploads in batch mode
      activeUploads.forEach(controller => controller.abort());
      setActiveUploads(new Map());

      // Reset state
      setIsUploading(false);
      setProgress(0);
      setTotalProgress(0);
      setUploadState(UploadState.CANCELLED);
      setError(null);
    }
  };

  return {
    uploadMedia,
    uploadMultipleFiles,
    cancelUpload,
    isUploading,
    progress,
    totalProgress,
    error,
    setError,
    uploadState,
    // Expose additional helper methods
    hasActiveUploads: () => activeUploads.size > 0 || isUploading,
    getActiveUploadsCount: () => activeUploads.size,
  };
}