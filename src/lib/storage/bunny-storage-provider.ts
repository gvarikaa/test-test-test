import { StorageProvider, FileMetadata, UploadResult } from '../interfaces/storage-provider';
import { BunnyStorage } from '../bunny-storage.js';

/**
 * BunnyStorageProvider
 * 
 * A concrete implementation of the StorageProvider interface for Bunny CDN.
 * This class encapsulates all Bunny CDN specific logic.
 */
export class BunnyStorageProvider implements StorageProvider {
  private bunnyStorage: BunnyStorage;
  private cdnDomain: string;

  constructor() {
    this.bunnyStorage = new BunnyStorage({
      apiKey: process.env.BUNNY_API_KEY || "",
      storageZoneName: process.env.BUNNY_STORAGE_NAME || "",
    });
    this.cdnDomain = `${process.env.BUNNY_STORAGE_NAME}.b-cdn.net`;
  }

  /**
   * Generate a unique filename to prevent collisions
   */
  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = originalFilename.split(".").pop() || 'bin';
    return `${timestamp}-${randomString}.${fileExtension}`;
  }

  /**
   * Upload a file to Bunny CDN
   */
  async uploadFile(
    file: any, // Changed from specific types to any to handle server-side
    path: string = "/uploads",
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    try {
      // Check if we are in browser environment
      const isBrowser = typeof window !== 'undefined';

      // Create a unique filename - safely check for File object
      let filename = "blob.bin";

      // Only check instanceof File if browser environment with File available
      if (isBrowser && typeof File !== 'undefined' && file instanceof File) {
        filename = file.name;
      } else if (file.name) {
        // Fallback if file has a name property but is not a File instance
        filename = file.name;
      }

      const uniqueFilename = this.generateUniqueFilename(filename);
      const uploadPath = `${path}/${uniqueFilename}`;

      // Prepare the file data
      let uint8Array: Uint8Array;
      if (file instanceof Uint8Array) {
        uint8Array = file;
      } else if (Buffer.isBuffer(file)) {
        uint8Array = new Uint8Array(file);
      } else if (file.arrayBuffer) {
        // File or Blob - make sure arrayBuffer exists before calling
        const buffer = await file.arrayBuffer();
        uint8Array = new Uint8Array(buffer);
      } else {
        // Last resort fallback - try to convert to buffer somehow
        console.log('File type not recognized, attempting fallback conversion');
        if (Buffer.isBuffer(file.buffer)) {
          uint8Array = new Uint8Array(file.buffer);
        } else {
          throw new Error("Unsupported file type - cannot convert to Uint8Array");
        }
      }

      // Prepare metadata
      let contentType = metadata?.contentType;
      if (!contentType) {
        if (isBrowser && typeof File !== 'undefined' && file instanceof File) {
          contentType = file.type;
        } else if (file.type) {
          contentType = file.type;
        } else {
          contentType = "application/octet-stream";
        }
      }

      const uploadMetadata = {
        'Content-Type': contentType,
        ...metadata,
      };

      console.log('Bunny upload attempt:', {
        path: uploadPath,
        contentType,
        cdnDomain: this.cdnDomain,
        fileSize: uint8Array.length
      });

      // Upload to Bunny CDN
      const uploadResult = await this.bunnyStorage.upload(uploadPath, uint8Array, uploadMetadata);
      console.log('Bunny upload result:', uploadResult);

      // Generate the URL
      const url = `https://${this.cdnDomain}${uploadPath}`;

      // Generate thumbnail URL for videos
      let thumbnailUrl: string | undefined = undefined;
      if (contentType.startsWith('video/')) {
        thumbnailUrl = `${url}?thumbnail=true`;
      }

      return { url, thumbnailUrl };
    } catch (error) {
      console.error("Error uploading file to Bunny CDN:", error);
      throw new Error("Failed to upload file");
    }
  }

  /**
   * Delete a file from Bunny CDN
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract the path from the URL
      const urlRegex = new RegExp(`https://${this.cdnDomain}(.+)`);
      const match = urlRegex.exec(fileUrl);
      
      if (!match || !match[1]) {
        throw new Error("Invalid file URL");
      }
      
      const filePath = match[1];
      
      // Delete the file
      await this.bunnyStorage.delete(filePath);
      
      return true;
    } catch (error) {
      console.error("Error deleting file from Bunny CDN:", error);
      return false;
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   */
  async generateSignedUrl(
    fileUrl: string,
    expirationInSeconds: number = 3600
  ): Promise<string> {
    try {
      // Extract the path from the URL
      const urlRegex = new RegExp(`https://${this.cdnDomain}(.+)`);
      const match = urlRegex.exec(fileUrl);
      
      if (!match || !match[1]) {
        throw new Error("Invalid file URL");
      }
      
      const filePath = match[1];
      
      // Generate a token for the URL
      const timestamp = Math.floor(Date.now() / 1000) + expirationInSeconds;
      const token = Buffer.from(`${filePath}:${timestamp}`).toString('base64');

      return `https://${this.cdnDomain}${filePath}?token=${token}&expires=${timestamp}`;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate signed URL");
    }
  }
}