# Notification Provider Abstraction

This module implements the Dependency Inversion Principle (DIP) and Dependency Abstraction Principle (DAP) by providing an abstract notification provider interface and concrete implementations.

## Principles Demonstrated

### Dependency Inversion Principle (DIP)

DIP states that:

1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
2. Abstractions should not depend on details. Details should depend on abstractions.

In our implementation:
- High-level modules (API endpoints) depend on the `NotificationService` and `NotificationProvider` interfaces, not concrete implementations.
- We've inverted the dependency hierarchy: instead of the API endpoint directly depending on the `push-service.ts` implementation, both depend on abstractions.

### Dependency Abstraction Principle (DAP)

DAP emphasizes:
- Code should depend on abstractions rather than concrete implementations
- It promotes loose coupling and allows for easier testing and maintenance

In our implementation:
- We've defined a clear interface in `notification-provider.ts` that all notification providers must implement
- This abstraction allows us to easily swap one notification provider for another without changing client code

## Architecture

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

## Key Components

1. **NotificationProvider Interface** (`src/lib/interfaces/notification-provider.ts`):
   - Defines the contract that all notification providers must follow
   - Contains methods for sending notifications to users
   - Provides methods for checking if notifications are enabled for users
   - Allows retrieval of user devices

2. **WebPushNotificationProvider** (`src/lib/notifications/web-push-provider.ts`):
   - Concrete implementation of the NotificationProvider interface for web push notifications
   - Handles sending push notifications to web browsers
   - Uses the Web Push API

3. **MobilePushNotificationProvider** (`src/lib/notifications/mobile-push-provider.ts`):
   - Concrete implementation of the NotificationProvider interface for mobile push notifications
   - Handles sending push notifications to mobile devices (iOS and Android)
   - Adapts to both Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNS)

4. **NotificationService** (`src/lib/notifications/notification-service.ts`):
   - Orchestrates between different notification providers
   - Provides a unified interface for sending notifications
   - Allows dynamic registration of new providers
   - Manages default providers to use

5. **Notification API Endpoint** (`src/app/api/notifications/push/route.ts`):
   - Uses the NotificationService to send notifications
   - Depends on abstractions rather than concrete implementations

## Usage Examples

### Basic Usage

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

// Create a notification service instance
const notificationService = new NotificationService();

// Send a notification
const results = await notificationService.sendNotification(
  'user-123',
  {
    title: 'New Message',
    body: 'You have a new message from John',
    actionUrl: '/messages/123',
    isActionable: true,
    actionLabel: 'View',
  }
);

console.log('Notification results:', results);
```

### Using Specific Providers

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

// Create service instance
const notificationService = new NotificationService();

// Send a notification using only web-push
const results = await notificationService.sendNotification(
  'user-123',
  {
    title: 'New Message',
    body: 'You have a new message from John',
  },
  ['web-push'] // Only use web-push provider
);

console.log('Web push results:', results);
```

### Sending to Multiple Users

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

// Create service instance
const notificationService = new NotificationService();

// Send to multiple users
const results = await notificationService.sendBulkNotification(
  ['user-123', 'user-456', 'user-789'],
  {
    title: 'System Maintenance',
    body: 'The system will be down for maintenance tonight at 10 PM.',
  }
);

console.log('Bulk notification results:', results);
```

### Creating a Custom Provider

To add a new notification provider:

1. Create a new class that implements the NotificationProvider interface
2. Register it with the NotificationService

```typescript
import { 
  NotificationProvider, 
  NotificationPayload, 
  NotificationResult, 
  BulkNotificationResult 
} from '@/lib/interfaces/notification-provider';

// Example custom provider
class EmailNotificationProvider implements NotificationProvider {
  getName(): string {
    return 'email';
  }

  async send(userId: string, notification: NotificationPayload): Promise<NotificationResult> {
    // Custom implementation for sending email notifications
    // ...
  }

  async sendBulk(userIds: string[], notification: NotificationPayload): Promise<BulkNotificationResult> {
    // Custom implementation for sending bulk email notifications
    // ...
  }

  async isEnabledForUser(userId: string): Promise<boolean> {
    // Check if user has email notifications enabled
    // ...
  }

  async getUserDevices(userId: string): Promise<Array<{
    id: string;
    type: string;
    name?: string;
    lastActive?: Date;
  }>> {
    // Get user's email addresses
    // ...
  }
}

// Register with the service
const notificationService = new NotificationService();
notificationService.registerProvider(new EmailNotificationProvider());

// Add it to default providers
notificationService.setDefaultProviders(['web-push', 'mobile-push', 'email']);
```

## Benefits of This Approach

1. **Loose Coupling**: The code depends on abstractions rather than concrete implementations, making it more modular and flexible.

2. **Extensibility**: New notification providers can be added without modifying existing code.

3. **Testability**: Mock implementations can be provided for testing.

4. **Maintainability**: Changes to one provider don't affect other parts of the code.

5. **Adaptability**: The system can easily adapt to changes in notification requirements.

6. **Single Responsibility**: Each class has a single responsibility, following the SOLID principles.

## Implementation Notes

1. **Provider Registration**: The NotificationService allows dynamic registration of providers, making it easy to add new providers at runtime.

2. **Default Providers**: The service maintains a list of default providers to use when sending notifications, which can be customized.

3. **Error Handling**: Each provider handles its own errors, and the service aggregates the results.

4. **Singleton Pattern**: The notification service is implemented as a singleton in the API route, which is a common pattern with DIP.

5. **Interface Segregation**: The NotificationProvider interface focuses only on the methods needed for sending notifications, following the Interface Segregation Principle.

## Conclusion

By applying DIP and DAP, we've created a flexible, maintainable notification system that can adapt to changing requirements. The abstraction layer allows us to swap out notification providers without changing the client code, making our system more robust and easier to maintain.