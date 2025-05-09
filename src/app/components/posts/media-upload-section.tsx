"use client";

import { useState } from "react";
import { MediaType } from "@prisma/client";
import { UploadForm } from "@/app/components/forms/upload-form";
import { MediaDisplay } from "@/app/components/common/media-display";
import { Trash2, Pencil } from "lucide-react";

interface MediaItem {
  url: string;
  type: MediaType;
  thumbnailUrl?: string;
}

interface MediaUploadSectionProps {
  onMediaChange: (media: MediaItem[]) => void;
  initialMedia?: MediaItem[];
  maxItems?: number;
  allowedTypes?: MediaType[];
}

export function MediaUploadSection({
  onMediaChange,
  initialMedia = [],
  maxItems = 5,
  allowedTypes = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"],
}: MediaUploadSectionProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [isUploadFormVisible, setIsUploadFormVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleUploadComplete = (url: string, type: MediaType, thumbnailUrl?: string) => {
    let newMedia: MediaItem[];

    if (editingIndex !== null) {
      // Replace media at editingIndex
      newMedia = [...media];
      newMedia[editingIndex] = { url, type, thumbnailUrl };
      setEditingIndex(null);
    } else {
      // Add new media
      newMedia = [...media, { url, type, thumbnailUrl }];
    }

    setMedia(newMedia);
    onMediaChange(newMedia);
    setIsUploadFormVisible(false);
  };

  const handleRemoveMedia = (index: number) => {
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia);
    onMediaChange(newMedia);
  };

  const handleEditMedia = (index: number) => {
    setEditingIndex(index);
    setIsUploadFormVisible(true);
  };

  return (
    <div className="space-y-4">
      {/* Media list */}
      {media.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {media.map((item, index) => (
            <div key={index} className="relative group">
              <MediaDisplay
                url={item.url}
                type={item.type}
                thumbnailUrl={item.thumbnailUrl}
                aspectRatio={item.type === "IMAGE" ? "square" : "video"}
                className="rounded-md overflow-hidden"
              />
              <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleEditMedia(index)}
                  className="p-1 rounded-full bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(index)}
                  className="p-1 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add media button or form */}
      {isUploadFormVisible ? (
        <div className="p-4 border rounded-md">
          <UploadForm
            onUploadComplete={handleUploadComplete}
            allowedTypes={allowedTypes}
          />
          <button
            type="button"
            className="mt-2 w-full py-2 px-4 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
            onClick={() => {
              setIsUploadFormVisible(false);
              setEditingIndex(null);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        media.length < maxItems && (
          <button
            type="button"
            onClick={() => setIsUploadFormVisible(true)}
            className="w-full py-2 px-4 border-2 border-dashed border-muted rounded-md text-muted-foreground hover:border-primary/50 hover:text-primary/80"
          >
            Add Media
          </button>
        )
      )}
    </div>
  );
}