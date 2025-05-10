# DIP and DAP Implementation Examples

This repository contains practical examples of the Dependency Inversion Principle (DIP) and Dependency Abstraction Principle (DAP) in a Next.js application.

## SOLID Principles

SOLID is an acronym for five design principles intended to make software designs more understandable, flexible, and maintainable:

- **S**ingle Responsibility Principle
- **O**pen/Closed Principle
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

In this project, we focus specifically on the Dependency Inversion Principle and a related concept, the Dependency Abstraction Principle.

## Dependency Inversion Principle (DIP)

DIP is the "D" in SOLID. It states that:

1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
2. Abstractions should not depend on details. Details should depend on abstractions.

This principle inverts the traditional dependency flow. Instead of high-level modules depending on low-level modules, both depend on abstractions.

## Dependency Abstraction Principle (DAP)

DAP is a principle that emphasizes:

- Code should depend on abstractions rather than concrete implementations
- It promotes loose coupling and allows for easier testing and maintenance
- It is closely related to DIP but focuses on the abstraction aspect

## Implementations

This project contains two implementations that demonstrate these principles:

### 1. Storage Provider Abstraction

The first implementation is a storage abstraction layer that allows the application to work with different file storage providers (Bunny CDN, S3, etc.) through a common interface.

**Files:**
- `src/lib/interfaces/storage-provider.ts` - The interface that defines the contract for storage providers
- `src/lib/storage/bunny-storage-provider.ts` - A concrete implementation for Bunny CDN
- `src/lib/storage/storage-factory.ts` - A factory that creates storage provider instances
- `src/app/api/upload/route.ts` - API route that uses the abstraction
- `src/app/components/forms/storage-upload-form.tsx` - React component that demonstrates the usage
- `src/app/examples/storage-abstraction/page.tsx` - Example page

**Documentation:**
- [Storage Provider README](./src/lib/storage/README.md)

### 2. Notification Service Abstraction

The second implementation is a notification service abstraction that allows the application to send notifications through different channels (web push, mobile push, etc.) using a common interface.

**Files:**
- `src/lib/interfaces/notification-provider.ts` - The interface that defines the contract for notification providers
- `src/lib/notifications/web-push-provider.ts` - A concrete implementation for web push notifications
- `src/lib/notifications/mobile-push-provider.ts` - A concrete implementation for mobile push notifications
- `src/lib/notifications/notification-service.ts` - A service that orchestrates between different providers
- `src/app/api/notifications/push/route.ts` - API route that uses the abstraction

**Documentation:**
- [Notification Service README](./src/lib/notifications/README.md)

## Key Benefits of DIP and DAP

1. **Loose Coupling**: The code depends on abstractions rather than concrete implementations, making it more modular and flexible.

2. **Extensibility**: New implementations (storage providers, notification providers) can be added without modifying existing code.

3. **Testability**: Mock implementations can be provided for testing.

4. **Maintainability**: Changes to one implementation don't affect other parts of the code.

5. **Adaptability**: The system can easily adapt to changing requirements.

## Example Usage

To see the examples in action:

1. **Storage Provider Example**:
   - Navigate to `/examples/storage-abstraction`
   - Try uploading files with different storage providers

2. **Notification System**:
   - Send a test notification to yourself:
   ```typescript
   // Client-side
   const response = await fetch('/api/notifications/push', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       recipientId: 'your-user-id',
       isTest: true,
       providers: ['web-push', 'mobile-push'] // Optional - specify which providers to use
     })
   });
   ```

## Architecture Diagrams

### Storage Provider Architecture

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

### Notification Service Architecture

```
┌─────────────────────┐
│                     │
│    API Endpoint     │
│                     │
└─────────┬───────────┘
          │
          │ depends on
          ▼
┌─────────────────────┐
│                     │
│ NotificationService │
│                     │
└─────────┬───────────┘
          │ 
          │ depends on
          ▼
┌─────────────────────┐
│                     │
│ NotificationProvider│
│     Interface       │
│                     │
└─────────┬───────────┘
          │
          │ implements
          ▼
┌───────────────────────────────────────┐
│                                       │
│ ┌─────────────────┐ ┌───────────────┐ │
│ │WebPushProvider  │ │MobilePushProv.│ │
│ └─────────────────┘ └───────────────┘ │
│                                       │
└───────────────────────────────────────┘
```

## Learning Resources

To learn more about the Dependency Inversion Principle and related concepts:

1. [SOLID Principles Explained](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
2. [Dependency Inversion Principle](https://martinfowler.com/articles/dipInTheWild.html)
3. [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
4. [TypeScript Dependency Injection](https://www.typescriptlang.org/docs/handbook/decorators.html)

## Practical Tips for Implementing DIP and DAP

1. **Start with interfaces**: Define the contract before implementing concrete classes
2. **Use factory patterns**: Create factories to instantiate concrete implementations
3. **Composition root**: Create and wire up dependencies at the application's entry point
4. **Dependency injection**: Pass dependencies to classes rather than creating them inside
5. **Keep interfaces focused**: Follow the Interface Segregation Principle for clean abstractions

## Conclusion

The Dependency Inversion Principle and Dependency Abstraction Principle are powerful tools in your software design toolkit. By depending on abstractions rather than concrete implementations, you can create systems that are more modular, testable, and maintainable.

These examples demonstrate practical applications of these principles in a real-world Next.js application, showing how they can be applied to common scenarios like file storage and notifications.