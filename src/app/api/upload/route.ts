import { NextRequest, NextResponse } from "next/server";
import { MediaType } from "@prisma/client";
import { uploadFileToBunny } from "@/lib/bunny";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

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
    
    // Upload the file to Bunny.net
    const { url, thumbnailUrl } = await uploadFileToBunny(file, folderPath);
    
    // Return the URL of the uploaded file
    return NextResponse.json({
      message: "File uploaded successfully",
      url,
      mediaType,
      thumbnailUrl,
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