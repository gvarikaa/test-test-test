# Storage Provider Abstraction

This module implements the Dependency Inversion Principle (DIP) and Dependency Abstraction Principle (DAP) by providing an abstract storage provider interface and concrete implementations.

## Principles Demonstrated

### Dependency Inversion Principle (DIP)

DIP states that:

1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
2. Abstractions should not depend on details. Details should depend on abstractions.

In our implementation:
- High-level modules (API endpoints) depend on the `StorageProvider` interface, not concrete implementations like `BunnyStorageProvider`.
- We've inverted the dependency hierarchy: instead of the API endpoint directly depending on the `bunny.ts` implementation, both depend on the `StorageProvider` interface.

### Dependency Abstraction Principle (DAP)

DAP is a principle that emphasizes:
- Code should depend on abstractions rather than concrete implementations
- It promotes loose coupling and allows for easier testing and maintenance

In our implementation:
- We've defined a clear interface in `storage-provider.ts` that all storage providers must implement
- This abstraction allows us to easily swap one storage provider for another without changing client code

## Architecture

```
┌─────────────────────┐
│                     │
│ Upload API Endpoint │
│                     │
└─────────┬───────────┘
          │
          │ depends on
          ▼
┌─────────────────────┐      creates    ┌─────────────────────┐
│                     │◄───────────────┐│                     │
│  StorageProvider    │                ││   StorageFactory    │
│     Interface       │                │└─────────────────────┘
│                     │                │
└─────────┬───────────┘                │
          │                            │
          │ implements                 │
          ▼                            │
┌─────────────────────┐                │
│                     │                │
│ BunnyStorageProvider│◄───────────────┘
│                     │
└─────────────────────┘
```

## Key Components

1. **StorageProvider Interface** (`src/lib/interfaces/storage-provider.ts`):
   - Defines the contract that all storage providers must follow
   - Contains methods for file upload, deletion, and signed URL generation

2. **BunnyStorageProvider** (`src/lib/storage/bunny-storage-provider.ts`):
   - Concrete implementation of the StorageProvider interface for Bunny CDN
   - Encapsulates all Bunny-specific logic

3. **StorageFactory** (`src/lib/storage/storage-factory.ts`):
   - Factory pattern implementation that creates and returns appropriate StorageProvider instances
   - Allows for easy extension to support additional providers in the future

4. **Upload API Endpoint** (`src/app/api/upload/route.ts`):
   - Uses the StorageFactory to get a storage provider
   - Depends on the StorageProvider interface rather than concrete implementation

## Usage Examples

### Basic Upload Example

```typescript
import { StorageFactory } from '@/lib/storage/storage-factory';

// Get the default storage provider (Bunny)
const storageProvider = StorageFactory.getProvider();

// Upload a file
const result = await storageProvider.uploadFile(
  file, 
  '/uploads/user123',
  { contentType: 'image/jpeg' }
);

console.log('Uploaded file URL:', result.url);
```

### Using Different Storage Providers

```typescript
import { StorageFactory } from '@/lib/storage/storage-factory';

// Get different storage providers based on needs
const bunnyProvider = StorageFactory.getProvider('bunny');
const s3Provider = StorageFactory.getProvider('s3');

// The method signatures are the same regardless of provider
await bunnyProvider.uploadFile(file, '/path/to/store');
await s3Provider.uploadFile(file, '/path/to/store');
```

### Creating a New Storage Provider Implementation

To add a new storage provider:

1. Create a new class that implements the StorageProvider interface
2. Update the StorageFactory to support the new provider type

```typescript
// Example new provider
export class S3StorageProvider implements StorageProvider {
  async uploadFile(file, path, metadata) {
    // S3-specific implementation
  }

  async deleteFile(fileUrl) {
    // S3-specific implementation
  }

  async generateSignedUrl(fileUrl, expirationInSeconds) {
    // S3-specific implementation
  }
}

// Update StorageFactory
case 's3':
  provider = new S3StorageProvider();
  break;
```

## Benefits of This Approach

1. **Loose Coupling**: Our code depends on abstractions rather than concrete implementations, making it more modular and flexible.

2. **Extensibility**: We can easily add new storage providers without modifying existing code.

3. **Testability**: We can swap in mock implementations of the StorageProvider interface for testing.

4. **Maintainability**: Changes to one storage provider don't affect other parts of the code.

5. **Adaptability**: We can easily adapt to changes in storage requirements without major code changes.

## Conclusion

By applying DIP and DAP, we've created a flexible, maintainable storage system that can adapt to changing requirements. The abstraction layer allows us to swap out storage providers without changing the client code, making our system more robust and easier to maintain.