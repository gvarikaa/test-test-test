import { 
  NotificationProvider, 
  NotificationPayload,
  NotificationResult,
  BulkNotificationResult
} from '../interfaces/notification-provider';
import { WebPushNotificationProvider } from './web-push-provider';
import { MobilePushNotificationProvider } from './mobile-push-provider';

/**
 * NotificationService
 * 
 * This service orchestrates between different notification providers.
 * It follows the Dependency Inversion Principle by depending on the 
 * NotificationProvider interface rather than concrete implementations.
 */
export class NotificationService {
  private providers: Map<string, NotificationProvider>;
  private defaultProviders: string[];

  constructor(options?: {
    providers?: NotificationProvider[];
    defaultProviders?: string[];
  }) {
    this.providers = new Map<string, NotificationProvider>();
    
    // Register providers (use provided or defaults)
    const providerList = options?.providers || [
      new WebPushNotificationProvider(),
      new MobilePushNotificationProvider()
    ];
    
    providerList.forEach(provider => {
      this.registerProvider(provider);
    });
    
    // Set default providers to use
    this.defaultProviders = options?.defaultProviders || 
      ['web-push', 'mobile-push'];
  }

  /**
   * Register a notification provider
   */
  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.getName(), provider);
  }

  /**
   * Get a registered provider by name
   */
  getProvider(name: string): NotificationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Set the default providers to use
   */
  setDefaultProviders(providerNames: string[]): void {
    // Filter out any invalid provider names
    this.defaultProviders = providerNames.filter(name => 
      this.providers.has(name)
    );
  }

  /**
   * Send a notification to a user using specific providers
   */
  async sendNotification(
    userId: string,
    notification: NotificationPayload,
    providerNames?: string[]
  ): Promise<Record<string, NotificationResult>> {
    // Use specified providers or defaults
    const providersToUse = providerNames || this.defaultProviders;
    
    // Results to return
    const results: Record<string, NotificationResult> = {};
    
    // Send through each provider
    await Promise.all(
      providersToUse.map(async (name) => {
        const provider = this.providers.get(name);
        
        if (provider) {
          try {
            results[name] = await provider.send(userId, notification);
          } catch (error) {
            results[name] = {
              success: false,
              error: error.message || 'Unknown error',
            };
          }
        } else {
          results[name] = {
            success: false,
            error: `Provider '${name}' not found`,
          };
        }
      })
    );
    
    return results;
  }

  /**
   * Send a notification to multiple users using specific providers
   */
  async sendBulkNotification(
    userIds: string[],
    notification: NotificationPayload,
    providerNames?: string[]
  ): Promise<Record<string, BulkNotificationResult>> {
    // Use specified providers or defaults
    const providersToUse = providerNames || this.defaultProviders;
    
    // Results to return
    const results: Record<string, BulkNotificationResult> = {};
    
    // Send through each provider
    await Promise.all(
      providersToUse.map(async (name) => {
        const provider = this.providers.get(name);
        
        if (provider) {
          try {
            results[name] = await provider.sendBulk(userIds, notification);
          } catch (error) {
            results[name] = {
              success: false,
              totalCount: userIds.length,
              successCount: 0,
              failedCount: userIds.length,
              error: error.message || 'Unknown error',
            };
          }
        } else {
          results[name] = {
            success: false,
            totalCount: userIds.length,
            successCount: 0,
            failedCount: userIds.length,
            error: `Provider '${name}' not found`,
          };
        }
      })
    );
    
    return results;
  }

  /**
   * Send a test notification to a user
   */
  async sendTestNotification(
    userId: string,
    options?: {
      title?: string;
      body?: string;
      providerNames?: string[];
    }
  ): Promise<Record<string, NotificationResult>> {
    // Create test notification payload
    const notification: NotificationPayload = {
      title: options?.title || 'Test Notification',
      body: options?.body || 'This is a test notification from DapDip.',
      isActionable: true,
      actionLabel: 'View',
      actionUrl: '/',
      priority: 'NORMAL',
      id: `test-${Date.now()}`,
      type: 'TEST',
    };
    
    // Send the notification
    return await this.sendNotification(
      userId,
      notification,
      options?.providerNames
    );
  }

  /**
   * Check which providers are enabled for a user
   */
  async getEnabledProvidersForUser(userId: string): Promise<string[]> {
    const enabledProviders: string[] = [];
    
    await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        const isEnabled = await provider.isEnabledForUser(userId);
        if (isEnabled) {
          enabledProviders.push(name);
        }
      })
    );
    
    return enabledProviders;
  }

  /**
   * Get all devices for a user across all providers
   */
  async getUserDevices(userId: string): Promise<Record<string, Array<{
    id: string;
    type: string;
    name?: string;
    lastActive?: Date;
  }>>> {
    const devices: Record<string, Array<{
      id: string;
      type: string;
      name?: string;
      lastActive?: Date;
    }>> = {};
    
    await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        devices[name] = await provider.getUserDevices(userId);
      })
    );
    
    return devices;
  }
}