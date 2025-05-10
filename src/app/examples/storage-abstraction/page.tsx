import StorageUploadForm from '@/app/components/forms/storage-upload-form';

export const metadata = {
  title: 'DIP & DAP Example - Storage Abstraction',
  description: 'Example of Dependency Inversion Principle and Dependency Abstraction Principle',
};

export default function StorageAbstractionExample() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Dependency Inversion & Abstraction Principles</h1>
          <p className="text-gray-600">
            Example implementation with Storage Providers
          </p>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">What are DIP and DAP?</h2>
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-lg">Dependency Inversion Principle (DIP)</h3>
                <p>The Dependency Inversion Principle states that:</p>
                <ul className="list-disc pl-6 my-2 space-y-1">
                  <li>High-level modules should not depend on low-level modules. Both should depend on abstractions.</li>
                  <li>Abstractions should not depend on details. Details should depend on abstractions.</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Dependency Abstraction Principle (DAP)</h3>
                <p>A principle that emphasizes:</p>
                <ul className="list-disc pl-6 my-2 space-y-1">
                  <li>Code should depend on abstractions rather than concrete implementations</li>
                  <li>It promotes loose coupling and allows for easier testing and maintenance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Implementation Architecture</h2>
            
            <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
{`┌─────────────────────┐
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
└─────────────────────┘`}
            </pre>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-bold">Live Demo</h2>
          </div>
          <div className="p-6">
            <StorageUploadForm />
          </div>
        </div>
      </div>
    </div>
  );
}