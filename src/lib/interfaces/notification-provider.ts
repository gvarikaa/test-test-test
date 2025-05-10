/**
 * Notification Provider Interface
 * 
 * This interface defines the contract that all notification providers must implement.
 * It follows the Dependency Inversion Principle by allowing high-level modules
 * to depend on this abstraction rather than concrete implementations.
 */

export type NotificationPriority = 'NORMAL' | 'HIGH' | 'URGENT' | 'LOW';

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  isActionable?: boolean;
  actionLabel?: string;
  priority?: NotificationPriority;
  id?: string;
  type?: string;
}

export interface NotificationResult {
  success: boolean;
  deviceCount?: number;
  failedCount?: number;
  error?: string;
  results?: Array<{
    deviceId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BulkNotificationResult extends NotificationResult {
  totalCount: number;
  successCount: number;
}

/**
 * NotificationProvider interface
 * 
 * Defines the contract for all notification providers.
 */
export interface NotificationProvider {
  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Send a notification to a user
   * @param userId User ID to send the notification to
   * @param notification Notification payload
   * @returns Result of the notification attempt
   */
  send(userId: string, notification: NotificationPayload): Promise<NotificationResult>;

  /**
   * Send a notification to multiple users
   * @param userIds Array of user IDs to send the notification to
   * @param notification Notification payload
   * @returns Result of the bulk notification attempt
   */
  sendBulk(userIds: string[], notification: NotificationPayload): Promise<BulkNotificationResult>;

  /**
   * Check if a user has this notification channel enabled
   * @param userId User ID to check
   * @returns Whether the user has this notification channel enabled
   */
  isEnabledForUser(userId: string): Promise<boolean>;

  /**
   * Get the registered devices for a user
   * @param userId User ID to get devices for
   * @returns Array of device information
   */
  getUserDevices(userId: string): Promise<Array<{
    id: string;
    type: string;
    name?: string;
    lastActive?: Date;
  }>>;
}