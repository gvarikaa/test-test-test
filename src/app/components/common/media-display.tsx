"use client";

import { useState } from "react";
import { Play, Volume2, FileText, Image as ImageIcon, Maximize, X } from "lucide-react";
import { MediaType } from "@prisma/client";
import Image from "next/image";

interface MediaDisplayProps {
  url: string;
  type: MediaType;
  thumbnailUrl?: string;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
  maxHeight?: number;
}

export function MediaDisplay({
  url,
  type,
  thumbnailUrl,
  alt = "Media content",
  className = "",
  aspectRatio = "auto",
  maxHeight = 500,
}: MediaDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // State for modal
  const [, setIsInFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  }[aspectRatio];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const enterFullscreen = (element: HTMLElement | null) => {
    if (!element) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
      setIsInFullscreen(true);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "auto";
  };

  const renderMedia = () => {
    switch (type) {
      case "IMAGE":
        return (
          <Image
            src={url}
            alt={alt}
            width={500}
            height={500}
            className={`w-full h-full object-cover ${aspectRatioClass} ${className}`}
            style={{ maxHeight }}
            onClick={openModal}
          />
        );

      case "VIDEO":
        if (!isPlaying && thumbnailUrl) {
          return (
            <div
              className={`relative w-full ${aspectRatioClass} bg-black ${className}`}
              style={{ maxHeight }}
            >
              <Image
                src={thumbnailUrl}
                alt={`${alt} thumbnail`}
                width={500}
                height={300}
                className="w-full h-full object-cover"
              />
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-colors"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play className="w-8 h-8" />
                </div>
              </button>
            </div>
          );
        } else {
          return (
            <div
              className={`relative w-full ${aspectRatioClass} ${className}`}
              style={{ maxHeight }}
            >
              <video
                src={url}
                controls
                autoPlay={isPlaying}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterFullscreen(e.currentTarget.previousElementSibling as HTMLVideoElement);
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          );
        }

      case "AUDIO":
        return (
          <div
            className={`flex items-center p-4 bg-muted/20 rounded-lg ${className}`}
            style={{ maxHeight: 100 }}
          >
            <div className="w-10 h-10 mr-4 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <audio src={url} controls className="w-full" />
            </div>
          </div>
        );

      case "DOCUMENT":
        return (
          <div
            className={`flex items-center p-4 bg-muted/20 rounded-lg ${className}`}
            style={{ maxHeight: 100 }}
          >
            <div className="w-10 h-10 mr-4 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium truncate">{url.split("/").pop()}</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Document
              </a>
            </div>
          </div>
        );

      default:
        return (
          <div
            className={`flex items-center justify-center p-4 bg-muted/20 rounded-lg ${aspectRatioClass} ${className}`}
            style={{ maxHeight }}
          >
            <ImageIcon className="w-10 h-10 text-muted" />
          </div>
        );
    }
  };

  return (
    <>
      {renderMedia()}

      {isModalOpen && type === "IMAGE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={closeModal}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 z-10"
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={url}
              alt={alt}
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}