"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  isPushNotificationSupported, 
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscription,
  showTestNotification
} from "@/lib/push-notifications";
import { api } from "@/lib/trpc/api";

// Public VAPID key - in a real app, this would be in your environment variables
// This is just a placeholder key for the implementation
const PUBLIC_VAPID_KEY = "BJthRQ5myDgc7OSXzPCMftGw-n16F7zQBEN7EUD6XxcfTTvrLGWSIG7y_JxiWtVlCFua0S8MTB5rPziBqNx1qIo";

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // tRPC mutations
  const { mutate: registerDevice } = api.notification.registerDevice.useMutation({
    onSuccess: () => {
      console.log("Device registered successfully");
    },
    onError: (error) => {
      console.error("Error registering device:", error);
    },
  });

  const { mutate: unregisterDevice } = api.notification.unregisterDevice.useMutation({
    onSuccess: () => {
      console.log("Device unregistered successfully");
    },
    onError: (error) => {
      console.error("Error unregistering device:", error);
    },
  });

  // Check if push notifications are supported and get current permission
  useEffect(() => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(getNotificationPermission());
      
      // Check if already subscribed
      checkPushSubscription().then(({ isSubscribed }) => {
        setIsSubscribed(isSubscribed);
      });
    } else {
      setPermission("unsupported");
    }
  }, []);

  // Function to request notification permission
  const requestPermission = async () => {
    const { permission } = await requestNotificationPermission();
    setPermission(permission);
    
    // If permission granted, subscribe to push notifications
    if (permission === "granted" && session?.user?.id) {
      handleSubscribe();
    }
  };

  // Function to subscribe to push notifications
  const handleSubscribe = async () => {
    if (!session?.user?.id) return;
    
    const result = await subscribeToPushNotifications(PUBLIC_VAPID_KEY, session.user.id);
    
    if (result.success && result.deviceInfo) {
      // Register the device with the backend
      registerDevice(result.deviceInfo);
      setIsSubscribed(true);
    }
  };

  // Function to unsubscribe from push notifications
  const handleUnsubscribe = async () => {
    if (!session?.user?.id) return;
    
    const result = await unsubscribeFromPushNotifications(session.user.id);
    
    if (result.success && result.deviceToken) {
      // Unregister the device with the backend
      unregisterDevice({ deviceToken: result.deviceToken });
      setIsSubscribed(false);
    }
  };

  // Function to send a test notification
  const handleTestNotification = () => {
    showTestNotification();
  };

  // This component doesn't render anything directly but could be used to expose
  // UI controls for notification permissions in the user settings
  return null;
}