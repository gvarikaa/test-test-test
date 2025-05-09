"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { api } from "@/lib/trpc/api";
import { clientPusher, getUserChannel, PusherEvents } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  url: string | null;
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();
  
  // trpc query to get notifications
  const { data, isLoading, refetch } = api.notification.getAll.useQuery(
    { limit: 10 },
    { enabled: !!session?.user?.id }
  );
  
  // trpc mutation to mark notifications as read
  const { mutate: markAsRead } = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      setUnreadCount(0);
      refetch();
    },
  });

  // Update notifications when data changes
  useEffect(() => {
    if (data?.notifications) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount || 0);
    }
  }, [data]);

  // Set up Pusher subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = clientPusher.subscribe(getUserChannel(session.user.id));
    
    channel.bind(PusherEvents.NEW_NOTIFICATION, (newNotification: Notification) => {
      // Update the notifications list
      setNotifications((prev) => [newNotification, ...prev]);
      
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
      
      // Show a browser notification if allowed
      if (Notification.permission === "granted") {
        const content = newNotification.content || "You have a new notification";
        new Notification("DapDip", {
          body: content,
          icon: "/favicon.ico", // Default DapDip icon
        });
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getUserChannel(session.user.id));
    };
  }, [session?.user?.id]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
    
    // Mark all as read when opening
    if (!isOpen && unreadCount > 0) {
      markAsRead();
    }
  };

  const formatNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case "FOLLOW":
        return `${notification.sender?.name || "Someone"} started following you`;
      case "LIKE":
        return `${notification.sender?.name || "Someone"} liked your post`;
      case "COMMENT":
        return `${notification.sender?.name || "Someone"} commented on your post`;
      case "MENTION":
        return `${notification.sender?.name || "Someone"} mentioned you in a post`;
      case "FRIEND_REQUEST":
        return `${notification.sender?.name || "Someone"} sent you a friend request`;
      case "MESSAGE":
        return `${notification.sender?.name || "Someone"} sent you a message`;
      case "SYSTEM":
        return notification.content || "System notification";
      default:
        return notification.content || "New notification";
    }
  };

  const getNotificationIcon = () => {
    // This could be expanded with more specific icons for each notification type
    return <Bell className="h-5 w-5" />;
  };

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="p-3 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={notification.url || "#"}
                  className={`block px-4 py-3 hover:bg-muted transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {notification.sender?.image ? (
                        <Image
                          src={notification.sender.image}
                          alt={notification.sender.name || "User"}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {getNotificationIcon()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatNotificationContent(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {notifications.length > 0 && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-4 text-sm text-center text-primary hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}