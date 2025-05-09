"use client";

import { useState } from "react";
import { MediaType } from "@prisma/client";

interface UploadOptions {
  maxSizeMB?: number;
  allowedTypes?: MediaType[];
  path?: string;
}

interface UploadResult {
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
}

export function useUpload(options: UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult | null> => {
    const {
      maxSizeMB = 10,
      allowedTypes = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"],
      path,
    } = options;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Map of MIME types to MediaType
    const mimeToMediaType: Record<string, MediaType> = {
      "image/jpeg": "IMAGE",
      "image/png": "IMAGE",
      "image/gif": "IMAGE",
      "image/webp": "IMAGE",
      "video/mp4": "VIDEO",
      "video/webm": "VIDEO",
      "video/quicktime": "VIDEO",
      "audio/mpeg": "AUDIO",
      "audio/wav": "AUDIO",
      "audio/ogg": "AUDIO",
      "application/pdf": "DOCUMENT",
      "application/msword": "DOCUMENT",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCUMENT",
    };

    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds the limit of ${maxSizeMB}MB`);
      return null;
    }

    // Check file type
    const mediaType = mimeToMediaType[file.type];
    if (!mediaType || !allowedTypes.includes(mediaType)) {
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
      
      if (path) {
        formData.append("path", path);
      }

      // Upload the file using the Fetch API with progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setProgress(percentage);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url,
              mediaType: response.mediaType,
              thumbnailUrl: response.thumbnailUrl,
            });
          } else {
            let errorMessage = "Upload failed";
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (_e) {
              // Parsing error, use default message
            }
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was aborted"));
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      const result = await uploadPromise;
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    // Implementation to cancel the ongoing upload
    // This would require access to the XHR object which we could store in a ref
    setIsUploading(false);
    setProgress(0);
  };

  return {
    upload,
    cancelUpload,
    isUploading,
    progress,
    error,
    setError,
  };
}