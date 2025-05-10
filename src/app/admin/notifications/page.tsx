"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronLeft, Calendar, Bell, Users, BarChart, Clock } from "lucide-react";
import { api } from "@/lib/trpc/api";

// Admin dashboard for notifications
export default function NotificationsAdminPage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin check (simple implementation)
  useEffect(() => {
    if (status === 'loading') return;
    
    // Check if user is admin (in a real app, this would be more sophisticated)
    const adminEmails = ['admin@dapdip.com', 'moderator@dapdip.com'];
    setIsAdmin(session?.user?.email ? adminEmails.includes(session.user.email) : false);
    
    if (session?.user?.email && adminEmails.includes(session.user.email)) {
      fetchNotificationStats();
    }
  }, [status, session]);
  
  // Fetch notification stats
  const fetchNotificationStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, we'll manually generate some stats
      // In a real app, this would be an API call
      const stats = {
        totalNotificationsSent: 12845,
        totalUnread: 342,
        activeUsers: 156,
        deliveryRate: 98.7,
        openRate: 72.3,
        topTypes: [
          { type: 'LIKE', count: 4125 },
          { type: 'COMMENT', count: 3218 },
          { type: 'FOLLOW', count: 2456 },
          { type: 'GROUP_POST', count: 1873 },
          { type: 'MESSAGE', count: 1124 },
        ],
        activeScheduledNotifications: 7,
        pusherEvents: 14582,
        pushNotifications: 8721,
        mobileNotifications: 5861,
        failedDeliveries: 168,
      };
      
      setStats(stats);
    } catch (err) {
      setError("An error occurred while fetching notification stats");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Run scheduled notifications (demo function)
  const runScheduledNotifications = async () => {
    try {
      // In a real app, this would call the processScheduledNotifications endpoint
      // Mock response for demo purposes
      // const result = await api.notification.processScheduledNotifications.mutate();
      const result = { success: true, processedCount: 3 }; // Mock result
      alert(`Processed scheduled notifications. ${result.processedCount || 0} notifications processed.`);
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      alert('Error processing scheduled notifications');
    }
  };
  
  // If not admin, show access denied
  if (!isAdmin && status !== 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <h1 className="text-xl text-red-800 font-bold mb-2">წვდომა აკრძალულია</h1>
          <p className="text-red-600 mb-4">
            თქვენ არ გაქვთ უფლება ამ გვერდის სანახავად. მხოლოდ ადმინისტრატორებს შეუძლიათ ამ გვერდზე შესვლა.
          </p>
          <Link href="/" className="inline-flex items-center text-blue-600 hover:underline">
            <ChevronLeft className="h-4 w-4 mr-1" />
            დაბრუნება მთავარ გვერდზე
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="flex items-center text-sm text-accent-blue hover:underline">
          <ChevronLeft className="h-4 w-4 mr-1" />
          დაბრუნება ადმინ პანელზე
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">შეტყობინებების მართვა</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Link
          href="/admin/notifications/scheduled"
          className="bg-card-bg border border-border-color rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-3">
            <div className="p-3 rounded-full bg-blue-50 mr-3">
              <Calendar className="h-6 w-6 text-accent-blue" />
            </div>
            <h2 className="text-lg font-semibold">დაგეგმილი შეტყობინებები</h2>
          </div>
          <p className="text-text-secondary mb-3">
            შექმენით, დაგეგმეთ და მართეთ ავტომატური შეტყობინებები მომხმარებლებისთვის.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-blue-100 text-accent-blue rounded-full px-2 py-0.5">
              {stats?.activeScheduledNotifications || 0} აქტიური დაგეგმვა
            </span>
            <span className="text-accent-blue text-sm">ნახვა →</span>
          </div>
        </Link>
        
        <Link
          href="/admin/notifications/templates"
          className="bg-card-bg border border-border-color rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-3">
            <div className="p-3 rounded-full bg-purple-50 mr-3">
              <Bell className="h-6 w-6 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold">შეტყობინების შაბლონები</h2>
          </div>
          <p className="text-text-secondary mb-3">
            შექმენით და მართეთ შეტყობინების შაბლონები სხვადასხვა ტიპის გამოყენებისთვის.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-purple-100 text-purple-800 rounded-full px-2 py-0.5">
              5 შაბლონი
            </span>
            <span className="text-accent-blue text-sm">ნახვა →</span>
          </div>
        </Link>
        
        <Link
          href="/admin/notifications/segments"
          className="bg-card-bg border border-border-color rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-3">
            <div className="p-3 rounded-full bg-green-50 mr-3">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold">მომხმარებელთა სეგმენტები</h2>
          </div>
          <p className="text-text-secondary mb-3">
            შექმენით მომხმარებელთა სეგმენტები მიზნობრივი შეტყობინებებისთვის.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
              3 სეგმენტი
            </span>
            <span className="text-accent-blue text-sm">ნახვა →</span>
          </div>
        </Link>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">სწრაფი მოქმედებები</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={runScheduledNotifications}
            className="flex items-center justify-between bg-card-bg border border-border-color rounded-lg p-4 hover:bg-hover-bg transition-colors"
          >
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-accent-blue mr-2" />
              <span>დაგეგმილი შეტყობინებების გაშვება</span>
            </div>
            <span className="text-xs bg-blue-100 text-accent-blue rounded-full px-2 py-0.5">
              ახლავე გაშვება
            </span>
          </button>
          
          <button
            onClick={() => alert("ეს ფუნქცია ჯერ არ არის ხელმისაწვდომი")}
            className="flex items-center justify-between bg-card-bg border border-border-color rounded-lg p-4 hover:bg-hover-bg transition-colors"
          >
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-accent-blue mr-2" />
              <span>ტესტური შეტყობინების გაგზავნა</span>
            </div>
            <span className="text-xs bg-blue-100 text-accent-blue rounded-full px-2 py-0.5">
              ყველა პლატფორმაზე
            </span>
          </button>
        </div>
      </div>
      
      {/* Stats */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-t-transparent"></div>
        </div>
      ) : stats ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">შეტყობინებების სტატისტიკა</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card-bg border border-border-color rounded-lg p-4">
              <div className="text-text-secondary text-sm mb-1">სულ გაგზავნილი</div>
              <div className="text-xl font-bold">{stats.totalNotificationsSent.toLocaleString()}</div>
            </div>
            
            <div className="bg-card-bg border border-border-color rounded-lg p-4">
              <div className="text-text-secondary text-sm mb-1">წაუკითხავი</div>
              <div className="text-xl font-bold">{stats.totalUnread.toLocaleString()}</div>
            </div>
            
            <div className="bg-card-bg border border-border-color rounded-lg p-4">
              <div className="text-text-secondary text-sm mb-1">მიწოდების მაჩვენებელი</div>
              <div className="text-xl font-bold">{stats.deliveryRate}%</div>
            </div>
            
            <div className="bg-card-bg border border-border-color rounded-lg p-4">
              <div className="text-text-secondary text-sm mb-1">გახსნის მაჩვენებელი</div>
              <div className="text-xl font-bold">{stats.openRate}%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-card-bg border border-border-color rounded-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                შეტყობინებების ტიპები
              </h3>
              <div className="space-y-3">
                {stats.topTypes.map((type: { type: string; count: number }) => (
                  <div key={type.type} className="flex items-center">
                    <div className="w-1/2 pr-4">
                      <span className="text-sm">{type.type}</span>
                    </div>
                    <div className="w-1/2">
                      <div className="relative h-2 bg-gray-200 rounded-full">
                        <div 
                          className="absolute top-0 left-0 h-2 bg-accent-blue rounded-full"
                          style={{ width: `${(type.count / stats.totalNotificationsSent) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-text-secondary mt-1">
                        <span>{type.count.toLocaleString()}</span>
                        <span>{((type.count / stats.totalNotificationsSent) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-card-bg border border-border-color rounded-lg p-6">
              <h3 className="font-semibold mb-4">შეტყობინებების არხები</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pusher (რეალური დრო)</span>
                  <span className="text-sm font-medium">{stats.pusherEvents.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ბრაუზერის შეტყობინებები</span>
                  <span className="text-sm font-medium">{stats.pushNotifications.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">მობილური შეტყობინებები</span>
                  <span className="text-sm font-medium">{stats.mobileNotifications.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-red-500">
                  <span className="text-sm">წარუმატებელი მიწოდება</span>
                  <span className="text-sm font-medium">{stats.failedDeliveries.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-card-bg rounded-lg border border-border-color">
          <p>მონაცემები ვერ მოიძებნა.</p>
        </div>
      )}
    </div>
  );
}