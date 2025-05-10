import { PusherEvents, triggerEvent, getUserChannel } from '@/lib/pusher';
import { trpc } from '@/lib/trpc/api';

// Check if service workers are supported in the browser
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get the current notification permission
export const getNotificationPermission = () => {
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isPushNotificationSupported()) {
    return { permission: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { permission };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { permission: 'denied', error };
  }
};

// Register the service worker
export const registerServiceWorker = async () => {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Service workers not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return { success: true, registration };
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return { success: false, error };
  }
};

// Convert a base64 string to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (publicKey: string, userId: string) => {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    // Register service worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration.success) {
      throw new Error('Failed to register service worker');
    }

    // Get push subscription
    const registration = swRegistration.registration;
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    const subscriptionJson = subscription.toJSON();

    // Register device with the backend
    const deviceInfo = {
      deviceToken: JSON.stringify(subscriptionJson),
      platform: 'web',
      deviceName: navigator.userAgent,
      deviceModel: navigator.platform,
      appVersion: '1.0',
    };

    // Call API to register the device
    return { success: true, subscription: subscriptionJson, deviceInfo };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, error };
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (userId: string) => {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get push subscription
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: true, message: 'No subscription found' };
    }

    // Unsubscribe on the client
    await subscription.unsubscribe();

    // Unregister with the backend
    const deviceToken = JSON.stringify(subscription.toJSON());
    
    return { success: true, deviceToken };
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return { success: false, error };
  }
};

// Check if push notifications are already subscribed
export const checkPushSubscription = async () => {
  if (!isPushNotificationSupported()) {
    return { isSubscribed: false };
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
    // Get existing subscription
    const subscription = await registration.pushManager.getSubscription();
    
    return { isSubscribed: !!subscription, subscription };
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return { isSubscribed: false, error };
  }
};

// Show a test notification
export const showTestNotification = async (title = 'ტესტური შეტყობინება', body = 'ეს არის ტესტური შეტყობინება', icon = '/favicon.ico') => {
  if (!('Notification' in window)) {
    console.error('This browser does not support desktop notification');
    return { success: false, error: 'Notifications not supported' };
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: icon,
    });
    
    notification.onclick = () => {
      console.log('Notification clicked');
      notification.close();
    };
    
    return { success: true, notification };
  } else {
    console.warn('Notification permission not granted');
    return { success: false, error: 'Permission not granted' };
  }
};