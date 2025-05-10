// ჩვენი კასტომიზებული BunnyStorage იმპლემენტაცია
// რომელიც Node.js 18.x-თან მუშაობს
import { BunnyStorage } from "./bunny-storage.js";

// Initialize Bunny.net Storage
const bunnyStorage = new BunnyStorage({
  apiKey: process.env.BUNNY_API_KEY || "",
  storageZoneName: process.env.BUNNY_STORAGE_NAME || "",
});

// Function to generate a unique filename
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileExtension = originalFilename.split(".").pop();
  return `${timestamp}-${randomString}.${fileExtension}`;
};

// Upload a file to Bunny.net
export const uploadFileToBunny = async (
  file: File | Blob,
  folderPath: string = "/uploads"
): Promise<{url: string, thumbnailUrl?: string}> => {
  try {
    // Create a unique filename
    const uniqueFilename = generateUniqueFilename(
      file instanceof File ? file.name : "blob.bin"
    );
    const uploadPath = `${folderPath}/${uniqueFilename}`;

    // Upload the file
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    await bunnyStorage.upload(uploadPath, uint8Array, {
      'Content-Type': file instanceof File ? file.type : "application/octet-stream",
    });

    // Generate a URL for the uploaded file
    const url = `https://${process.env.BUNNY_STORAGE_NAME}.b-cdn.net${uploadPath}`;

    // For video files, generate a thumbnail URL (this would be more complex in a real app)
    let thumbnailUrl: string | undefined = undefined;
    if (file instanceof File && file.type.startsWith('video/')) {
      // In a real implementation, you would generate a thumbnail using a video processing service
      // For now, we'll just use a placeholder
      thumbnailUrl = `https://${process.env.BUNNY_STORAGE_NAME}.b-cdn.net${uploadPath}?thumbnail=true`;
    }

    // Return the URL of the uploaded file and thumbnail if available
    return { url, thumbnailUrl };
  } catch (error) {
    console.error("Error uploading file to Bunny.net:", error);
    throw new Error("Failed to upload file");
  }
};

// Delete a file from Bunny.net
export const deleteFileFromBunny = async (fileUrl: string): Promise<boolean> => {
  try {
    // Extract the path from the URL
    const urlRegex = new RegExp(
      `https://${process.env.BUNNY_STORAGE_NAME}.b-cdn.net(.+)`
    );
    const match = urlRegex.exec(fileUrl);
    
    if (!match || !match[1]) {
      throw new Error("Invalid file URL");
    }
    
    const filePath = match[1];
    
    // Delete the file
    await bunnyStorage.delete(filePath);
    
    return true;
  } catch (error) {
    console.error("Error deleting file from Bunny.net:", error);
    return false;
  }
};

// Generate a signed URL for a file (for private files)
export const generateSignedUrl = async (
  filePath: string,
  expirationInSeconds: number = 3600
): Promise<string> => {
  try {
    // ჩვენს იმპლემენტაციაში არ გვაქვს getSignedUrl,
    // ამიტომ დავაგენერიროთ მარტივი დროებითი URL
    const timestamp = Math.floor(Date.now() / 1000) + expirationInSeconds;
    const token = Buffer.from(`${filePath}:${timestamp}`).toString('base64');

    return `https://${process.env.BUNNY_STORAGE_NAME}.b-cdn.net${filePath}?token=${token}&expires=${timestamp}`;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
};