// Service Worker for DapDip Push Notifications
// This service worker handles push notifications when the app is not in focus

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);

  if (!event.data) {
    console.log('No payload in push message');
    return;
  }

  try {
    // Parse the notification data
    const notificationData = event.data.json();
    
    // Default notification icon and badge
    const icon = notificationData.icon || '/favicon.ico';
    const badge = notificationData.badge || '/favicon.ico';
    
    // Display the notification
    const title = notificationData.title || 'DapDip';
    const options = {
      body: notificationData.body || 'ახალი შეტყობინება',
      icon: icon,
      badge: badge,
      tag: notificationData.tag || 'default',
      data: {
        url: notificationData.url || '/',
        notificationId: notificationData.notificationId
      },
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: notificationData.priority === 'HIGH' || notificationData.priority === 'URGENT'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get the notification data
  const url = event.notification.data.url || '/';
  const notificationId = event.notification.data.notificationId;

  // Track the notification click if we have an ID
  if (notificationId) {
    // We'll implement this tracking in the main app
    console.log('Notification clicked with ID:', notificationId);
  }

  // Open the relevant URL
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsList) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of clientsList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab open, then open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Get the notification ID
  const notificationId = event.notification.data.notificationId;
  
  // Track the notification dismissal if we have an ID
  if (notificationId) {
    // We'll implement this tracking in the main app
    console.log('Notification dismissed with ID:', notificationId);
  }
});