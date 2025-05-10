import { StorageProvider } from '../interfaces/storage-provider';
import { BunnyStorageProvider } from './bunny-storage-provider';

/**
 * Available storage provider types
 */
export type StorageProviderType = 'bunny' | 's3' | 'local' | 'azure' | 'gcs';

/**
 * StorageFactory
 * 
 * A factory class that creates and returns StorageProvider instances based on the provided type.
 * This follows the Factory pattern and helps implement the Dependency Inversion Principle
 * by allowing the client code to depend on abstractions instead of concrete implementations.
 */
export class StorageFactory {
  private static instances: Map<StorageProviderType, StorageProvider> = new Map();

  /**
   * Get a StorageProvider instance by type (with singleton pattern)
   * @param type - The type of storage provider to create
   * @returns A StorageProvider instance
   */
  static getProvider(type: StorageProviderType = 'bunny'): StorageProvider {
    // Check if we already have an instance for this type
    if (!this.instances.has(type)) {
      // Create a new instance
      let provider: StorageProvider;
      
      switch (type) {
        case 'bunny':
          provider = new BunnyStorageProvider();
          break;
        
        // TODO: Implement other storage providers as needed
        // case 's3':
        //   provider = new S3StorageProvider();
        //   break;
        
        // case 'local':
        //   provider = new LocalStorageProvider();
        //   break;
        
        // case 'azure':
        //   provider = new AzureStorageProvider();
        //   break;
        
        // case 'gcs':
        //   provider = new GCSStorageProvider();
        //   break;
        
        default:
          provider = new BunnyStorageProvider();
      }
      
      // Store the instance
      this.instances.set(type, provider);
    }
    
    // Return the instance
    return this.instances.get(type)!;
  }

  /**
   * Clear all stored instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}