"use client";

import { useState, useEffect } from "react";
import { Smartphone, Trash2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

type Device = {
  id: string;
  deviceToken: string;
  platform: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  lastActive: string;
};

export default function MobileDevices() {
  const { data: session } = useSession();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  // Fetch mobile devices
  const fetchDevices = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/mobile");
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices || []);
      } else {
        setError(data.message || "Failed to fetch devices");
      }
    } catch (err) {
      setError("An error occurred while fetching devices");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Remove a device
  const removeDevice = async (deviceToken: string) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/notifications/mobile?deviceToken=${deviceToken}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Update local state
        setDevices((prev) =>
          prev.map((device) =>
            device.deviceToken === deviceToken ? { ...device, isActive: false } : device
          )
        );
      } else {
        setError(data.message || "Failed to remove device");
      }
    } catch (err) {
      setError("An error occurred while removing the device");
      console.error(err);
    }
  };

  // Send a test notification to all devices
  const sendTestNotification = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/notifications/mobile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceToken: "test",
          platform: "android",
          deviceName: "Test Device",
          sendTestNotification: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } else {
        setError(data.message || "Failed to send test notification");
      }
    } catch (err) {
      setError("An error occurred while sending the test notification");
      console.error(err);
    }
  };

  // Load devices on mount
  useEffect(() => {
    if (session?.user) {
      fetchDevices();
    }
  }, [session?.user]);

  // Function to format last active time
  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    return date.toLocaleString();
  };

  // Filter to get only active devices
  const activeDevices = devices.filter((device) => device.isActive);

  return (
    <div className="bg-card-bg rounded-lg border border-border-color p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">მობილური მოწყობილობები</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchDevices}
            className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover-bg"
            title="განახლება"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={sendTestNotification}
            className={`px-3 py-1 rounded-md text-xs ${
              testSent
                ? "bg-accent-green text-white"
                : "bg-hover-bg text-text-primary hover:bg-card-secondary-bg"
            }`}
            disabled={loading}
          >
            {testSent ? "გაიგზავნა!" : "ტესტური შეტყობინების გაგზავნა"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-t-transparent"></div>
        </div>
      ) : activeDevices.length === 0 ? (
        <div className="text-center p-8 text-text-secondary">
          <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="mb-2">მობილური მოწყობილობები არ არის რეგისტრირებული</p>
          <p className="text-sm">
            დააინსტალირეთ დაპდიპის მობილური აპლიკაცია და ჩართეთ შეტყობინებები
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDevices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 border border-border-color rounded-lg hover:bg-hover-bg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-full ${
                    device.platform === "ios" ? "bg-gray-100" : "bg-green-50"
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-medium">
                    {device.deviceName || device.deviceModel || device.platform}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {device.platform === "ios" ? "iOS" : "Android"}
                    {device.osVersion ? ` ${device.osVersion}` : ""}
                    {" • "}
                    ბოლო აქტივობა: {formatLastActive(device.lastActive)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeDevice(device.deviceToken)}
                className="p-1.5 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-50"
                title="მოწყობილობის წაშლა"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}