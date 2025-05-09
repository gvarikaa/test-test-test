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
): Promise<string> => {
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

    // Return the URL of the uploaded file
    return `https://${process.env.BUNNY_STORAGE_NAME}.b-cdn.net${uploadPath}`;
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