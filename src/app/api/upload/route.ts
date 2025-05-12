import { NextRequest, NextResponse } from "next/server";
import { MediaType } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { StorageFactory, StorageProviderType } from "@/lib/storage/storage-factory";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types and their corresponding MediaType
const ALLOWED_TYPES: Record<string, MediaType> = {
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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mediaTypeParam = formData.get("mediaType") as MediaType | null;
    const storageTypeParam = formData.get("storageType") as StorageProviderType | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File size exceeds the limit of 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const mediaType = mediaTypeParam || ALLOWED_TYPES[file.type];
    if (!mediaType) {
      return NextResponse.json(
        { message: "File type not allowed" },
        { status: 400 }
      );
    }

    // Determine the folder path based on media type
    const folderPath = `/${mediaType.toLowerCase()}s/${session.user.id}`;
    console.log('Upload attempt to folder path:', folderPath);
    console.log('Using Bunny config:', {
      storageName: process.env.BUNNY_STORAGE_NAME,
      // Don't log full API key, just first few chars for verification
      apiKeyPrefix: process.env.BUNNY_API_KEY?.substring(0, 8) + '...'
    });

    // Get the appropriate storage provider using the factory
    // This is the key part that implements Dependency Inversion:
    // We're depending on the StorageProvider interface, not the concrete implementation
    const storageProvider = StorageFactory.getProvider(storageTypeParam || 'bunny');
    
    // Upload the file using the storage provider
    const result = await storageProvider.uploadFile(
      file, 
      folderPath,
      { contentType: file.type }
    );
    
    // Return the URL of the uploaded file
    return NextResponse.json({
      message: "File uploaded successfully",
      url: result.url,
      mediaType,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error: unknown) {
    console.error("Error uploading file:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}