"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { MediaType } from "@prisma/client";
import Image from "next/image";

interface UploadFormProps {
  onUploadComplete: (url: string, type: MediaType, thumbnailUrl?: string) => void;
  allowedTypes?: MediaType[];
  maxSizeMB?: number;
}

export function UploadForm({
  onUploadComplete,
  allowedTypes = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"],
  maxSizeMB = 10, // Default max size is 10MB
}: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const allowedMimeTypes = Object.entries(mimeToMediaType)
    .filter(([, type]) => allowedTypes.includes(type))
    .map(([mime]) => mime);

  const resetForm = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      return;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds the limit of ${maxSizeMB}MB`);
      return;
    }

    // Check file type
    const mediaType = mimeToMediaType[file.type];
    if (!mediaType || !allowedTypes.includes(mediaType)) {
      setError("File type not allowed");
      return;
    }

    setFileName(file.name);

    // Create preview for images
    if (mediaType === "IMAGE") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (mediaType === "VIDEO") {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL("image/jpeg"));
      };
      videoEl.src = URL.createObjectURL(file);
    } else {
      // Display a generic icon for other file types
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const mediaType = mimeToMediaType[file.type];
    if (!mediaType) {
      setError("File type not supported");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", mediaType);

      // Send the file to our upload API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();

      // Call the callback with the upload result
      onUploadComplete(data.url, mediaType as MediaType, data.thumbnailUrl);

      // Reset the form
      resetForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center justify-center w-full">
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
            error ? "border-destructive" : "border-border hover:border-primary/50"
          } bg-muted/50`}
        >
          {preview ? (
            <div className="relative w-full h-full">
              <Image
                src={preview}
                alt="Preview"
                width={300}
                height={200}
                className="object-contain w-full h-full p-2"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  resetForm();
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                {allowedTypes.map((type) => type.toLowerCase()).join(", ")} (Max size: {maxSizeMB}MB)
              </p>
            </div>
          )}
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept={allowedMimeTypes.join(",")}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>

      {fileName && (
        <div className="flex items-center justify-between p-2 text-sm border rounded-md">
          <span className="truncate max-w-[200px]">{fileName}</span>
          <button
            type="button"
            onClick={resetForm}
            className="p-1 ml-2 rounded-full hover:bg-muted"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleUpload}
        disabled={isUploading || !fileName}
        className="w-full flex items-center justify-center py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          "Upload"
        )}
      </button>
    </div>
  );
}