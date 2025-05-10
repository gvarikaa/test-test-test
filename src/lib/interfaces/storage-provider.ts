/**
 * StorageProvider Interface
 * 
 * This interface defines the contract that all storage providers must implement.
 * It follows the Dependency Inversion Principle by allowing high-level modules
 * to depend on this abstraction rather than concrete implementations.
 */

export interface FileMetadata {
  contentType?: string;
  [key: string]: string | undefined;
}

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
}

export interface StorageProvider {
  /**
   * Upload a file to the storage provider
   * @param file - The file to upload (can be File, Blob, or Buffer)
   * @param path - The path where the file should be stored
   * @param metadata - Optional metadata for the file
   * @returns A promise that resolves to the URL of the uploaded file
   */
  uploadFile(
    file: File | Blob | Buffer | Uint8Array,
    path?: string,
    metadata?: FileMetadata
  ): Promise<UploadResult>;

  /**
   * Delete a file from the storage provider
   * @param fileUrl - The URL of the file to delete
   * @returns A promise that resolves to a boolean indicating whether the deletion was successful
   */
  deleteFile(fileUrl: string): Promise<boolean>;

  /**
   * Generate a signed URL for temporary access to a file
   * @param fileUrl - The URL of the file
   * @param expirationInSeconds - The number of seconds until the signed URL expires
   * @returns A promise that resolves to the signed URL
   */
  generateSignedUrl(fileUrl: string, expirationInSeconds?: number): Promise<string>;
}