"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, ChevronLeft, Check, X } from "lucide-react";
import { api } from "@/lib/trpc/api";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscription,
  showTestNotification
} from "@/lib/push-notifications";
import MobileDevices from "@/app/components/notifications/mobile-devices";

// Public VAPID key - in a real app, this would be in your environment variables
const PUBLIC_VAPID_KEY = "BJthRQ5myDgc7OSXzPCMftGw-n16F7zQBEN7EUD6XxcfTTvrLGWSIG7y_JxiWtVlCFua0S8MTB5rPziBqNx1qIo";

export default function NotificationSettingsPage() {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [testType, setTestType] = useState("SYSTEM");
  const [testPriority, setTestPriority] = useState("NORMAL");
  const [testContent, setTestContent] = useState("ეს არის ტესტური შეტყობინება");

  // tRPC queries and mutations
  const { data: preferences, isLoading } = api.notification.getPreferences.useQuery();
  const { mutate: updatePreferences } = api.notification.updatePreferences.useMutation();
  const { mutate: registerDevice } = api.notification.registerDevice.useMutation();
  const { mutate: unregisterDevice } = api.notification.unregisterDevice.useMutation();
  const { mutate: createTestNotification } = api.notification.createTestNotification.useMutation();

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
      
      // Update user preferences to enable push
      if (!preferences?.preferences?.pushEnabled) {
        updatePreferences({ pushEnabled: true });
      }
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
    createTestNotification({
      type: testType as any,
      content: testContent,
      priority: testPriority as any,
      isActionable: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-sm text-accent-blue hover:underline">
          <ChevronLeft className="h-4 w-4 mr-1" />
          დაბრუნება მთავარ გვერდზე
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">შეტყობინებების პარამეტრები</h1>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Mobile devices */}
          <MobileDevices />

          {/* General preferences */}
          <div className="bg-card-bg rounded-lg border border-border-color p-6">
            <h2 className="text-lg font-semibold mb-4">ზოგადი პარამეტრები</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">აპლიკაციის შეტყობინებები</p>
                  <p className="text-sm text-text-secondary">შეტყობინებები ვებსაიტზე</p>
                </div>
                <div className="relative inline-block w-14 align-middle select-none">
                  <input 
                    type="checkbox"
                    id="inAppToggle"
                    className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                    checked={preferences?.preferences?.inAppEnabled ?? true}
                    onChange={(e) => {
                      updatePreferences({
                        inAppEnabled: e.target.checked
                      });
                    }}
                  />
                  <label 
                    htmlFor="inAppToggle" 
                    className={`block h-7 rounded-full w-14 ${
                      preferences?.preferences?.inAppEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                    } transition-colors cursor-pointer`}
                  ></label>
                  <div 
                    className={`absolute top-0 mt-1 bg-white w-5 h-5 rounded-full transition-transform ${
                      preferences?.preferences?.inAppEnabled ? 'ml-7' : 'ml-1'
                    }`}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ელფოსტის შეტყობინებები</p>
                  <p className="text-sm text-text-secondary">შეტყობინებები ელფოსტაზე</p>
                </div>
                <div className="relative inline-block w-14 align-middle select-none">
                  <input 
                    type="checkbox"
                    id="emailToggle"
                    className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                    checked={preferences?.preferences?.emailEnabled ?? false}
                    onChange={(e) => {
                      updatePreferences({
                        emailEnabled: e.target.checked
                      });
                    }}
                  />
                  <label 
                    htmlFor="emailToggle" 
                    className={`block h-7 rounded-full w-14 ${
                      preferences?.preferences?.emailEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                    } transition-colors cursor-pointer`}
                  ></label>
                  <div 
                    className={`absolute top-0 mt-1 bg-white w-5 h-5 rounded-full transition-transform ${
                      preferences?.preferences?.emailEnabled ? 'ml-7' : 'ml-1'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Push notification settings */}
          <div className="bg-card-bg rounded-lg border border-border-color p-6">
            <h2 className="text-lg font-semibold mb-4">Push შეტყობინებები</h2>
            
            {!isSupported ? (
              <div className="bg-amber-50 border border-amber-300 rounded-md p-4 mb-4">
                <p className="text-amber-700">
                  <strong>არ არის მხარდაჭერილი:</strong> თქვენი ბრაუზერი არ უჭერს მხარს Push შეტყობინებებს.
                </p>
              </div>
            ) : permission === "denied" ? (
              <div className="bg-red-50 border border-red-300 rounded-md p-4 mb-4">
                <p className="text-red-700">
                  <strong>უარყოფილია:</strong> უფლება Push შეტყობინებებზე უარყოფილია. გთხოვთ, შეცვალოთ ნებართვები ბრაუზერის პარამეტრებში.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push შეტყობინებები</p>
                    <p className="text-sm text-text-secondary">შეტყობინებები ბრაუზერში</p>
                  </div>
                  <div className="relative inline-block w-14 align-middle select-none">
                    <input 
                      type="checkbox"
                      id="pushToggle"
                      className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                      checked={isSubscribed || (preferences?.preferences?.pushEnabled ?? false)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (permission === "granted") {
                            handleSubscribe();
                          } else {
                            requestPermission();
                          }
                        } else {
                          handleUnsubscribe();
                          updatePreferences({
                            pushEnabled: false
                          });
                        }
                      }}
                    />
                    <label 
                      htmlFor="pushToggle" 
                      className={`block h-7 rounded-full w-14 ${
                        isSubscribed || preferences?.preferences?.pushEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                      } transition-colors cursor-pointer`}
                    ></label>
                    <div 
                      className={`absolute top-0 mt-1 bg-white w-5 h-5 rounded-full transition-transform ${
                        isSubscribed || preferences?.preferences?.pushEnabled ? 'ml-7' : 'ml-1'
                      }`}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">წყნარი საათები</p>
                    <p className="text-sm text-text-secondary">ჩუმად რეჟიმი განსაზღვრულ დროს</p>
                  </div>
                  <div className="relative inline-block w-14 align-middle select-none">
                    <input 
                      type="checkbox"
                      id="quietHoursToggle"
                      className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                      checked={preferences?.preferences?.quietHoursEnabled ?? false}
                      onChange={(e) => {
                        updatePreferences({
                          quietHoursEnabled: e.target.checked,
                          // Set default quiet hours if enabling for the first time
                          ...(e.target.checked && !preferences?.preferences?.quietHoursStart ? {
                            quietHoursStart: "22:00",
                            quietHoursEnd: "08:00"
                          } : {})
                        });
                      }}
                    />
                    <label 
                      htmlFor="quietHoursToggle" 
                      className={`block h-7 rounded-full w-14 ${
                        preferences?.preferences?.quietHoursEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                      } transition-colors cursor-pointer`}
                    ></label>
                    <div 
                      className={`absolute top-0 mt-1 bg-white w-5 h-5 rounded-full transition-transform ${
                        preferences?.preferences?.quietHoursEnabled ? 'ml-7' : 'ml-1'
                      }`}
                    ></div>
                  </div>
                </div>
                
                {preferences?.preferences?.quietHoursEnabled && (
                  <div className="pl-6 border-l-2 border-border-color">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="quietStart" className="block text-sm mb-1">
                          დაწყების დრო
                        </label>
                        <input
                          type="time"
                          id="quietStart"
                          className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                          value={preferences?.preferences?.quietHoursStart || "22:00"}
                          onChange={(e) => {
                            updatePreferences({
                              quietHoursStart: e.target.value
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="quietEnd" className="block text-sm mb-1">
                          დასრულების დრო
                        </label>
                        <input
                          type="time"
                          id="quietEnd"
                          className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                          value={preferences?.preferences?.quietHoursEnd || "08:00"}
                          onChange={(e) => {
                            updatePreferences({
                              quietHoursEnd: e.target.value
                            });
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      წყნარი საათების დროს მხოლოდ მაღალი პრიორიტეტის შეტყობინებები გამოჩნდება
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Test notification section */}
            <div className="mt-6 pt-4 border-t border-border-color">
              <h3 className="font-semibold mb-3">ტესტური შეტყობინება</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="testType" className="block text-sm mb-1">
                    ტიპი
                  </label>
                  <select
                    id="testType"
                    className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  >
                    <option value="SYSTEM">სისტემური</option>
                    <option value="FOLLOW">მიმდევრობა</option>
                    <option value="LIKE">მოწონება</option>
                    <option value="COMMENT">კომენტარი</option>
                    <option value="GROUP_POST">ჯგუფის პოსტი</option>
                    <option value="MESSAGE">შეტყობინება</option>
                    <option value="SECURITY_ALERT">უსაფრთხოების შეტყობინება</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="testPriority" className="block text-sm mb-1">
                    პრიორიტეტი
                  </label>
                  <select
                    id="testPriority"
                    className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                    value={testPriority}
                    onChange={(e) => setTestPriority(e.target.value)}
                  >
                    <option value="LOW">დაბალი</option>
                    <option value="NORMAL">ნორმალური</option>
                    <option value="HIGH">მაღალი</option>
                    <option value="URGENT">სასწრაფო</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="testContent" className="block text-sm mb-1">
                  შინაარსი
                </label>
                <input
                  type="text"
                  id="testContent"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                />
              </div>
              
              <button
                onClick={handleTestNotification}
                className="flex items-center justify-center gap-2 bg-accent-blue text-white py-2 px-4 rounded hover:bg-accent-blue/90 transition-colors"
                disabled={isLoading}
              >
                <Bell className="h-4 w-4" />
                ტესტური შეტყობინების გაგზავნა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}