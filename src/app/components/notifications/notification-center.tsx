"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/trpc/api";
import { clientPusher, getUserChannel, PusherEvents, triggerEvent } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isActionable: boolean;
  actionLabel: string | null;
  actionUrl: string | null;
  imageUrl: string | null;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  url: string | null;
  // Group-related fields
  groupId?: string | null;
  // Page-related fields
  pageId?: string | null;
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<string>("all"); // all, unread, social, groups, pages, system
  const [activeTab, setActiveTab] = useState<string>("notifications"); // notifications, settings
  const { data: session } = useSession();

  // trpc query to get notifications
  const { data, isLoading, refetch } = api.notification.getAll.useQuery(
    { limit: 20 },
    { enabled: !!session?.user?.id }
  );

  // trpc query to get notification preferences
  const { data: preferencesData, isLoading: preferencesLoading } = api.notification.getPreferences.useQuery(
    undefined,
    { enabled: !!session?.user?.id && activeTab === "settings" }
  );

  // trpc mutation to update notification preferences
  const { mutate: updatePreferences } = api.notification.updatePreferences.useMutation({
    onSuccess: () => {
      // Optionally show success toast or feedback
    },
  });

  // trpc mutation to mark all notifications as read
  const { mutate: markAllAsRead } = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    },
  });

  // trpc mutation to mark one notification as read
  const { mutate: markOneAsRead } = api.notification.markAsRead.useMutation({
    onSuccess: (_, variables) => {
      if (variables.notificationId) {
        setNotifications(prev => prev.map(n =>
          n.id === variables.notificationId ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
  });

  // trpc mutation to track notification interaction
  const { mutate: trackInteraction } = api.notification.trackNotificationInteraction.useMutation();

  // Update notifications when data changes
  useEffect(() => {
    if (data?.notifications) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount || 0);
    }
  }, [data]);

  // Set up Pusher subscription for real-time notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = clientPusher.subscribe(getUserChannel(session.user.id));

    // Handle new notification
    channel.bind(PusherEvents.NEW_NOTIFICATION, (newNotification: Notification) => {
      // Add to the local notifications list
      setNotifications((prev) => [newNotification, ...prev]);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permission is granted
      if (Notification.permission === "granted") {
        const content = newNotification.content || "გაქვთ ახალი შეტყობინება";
        new Notification("DapDip", {
          body: content,
          icon: "/favicon.ico",
        });
      }
    });

    // Handle read notification event
    channel.bind(PusherEvents.READ_NOTIFICATION, (data: { notificationId?: string }) => {
      if (data.notificationId) {
        // Mark specific notification as read
        setNotifications((prev) =>
          prev.map((n) => n.id === data.notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        // Mark all notifications as read
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    });

    // Clean up subscription
    return () => {
      channel.unbind_all();
      clientPusher.unsubscribe(getUserChannel(session.user.id));
    };
  }, [session?.user?.id]);

  // Request browser notification permission
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Toggle notification panel and mark as read when opening
  const toggleNotifications = () => {
    setIsOpen(!isOpen);

    // Mark all as read when opening
    if (!isOpen && unreadCount > 0) {
      markAllAsRead({});

      // Also trigger real-time event to update other clients
      if (session?.user?.id) {
        triggerEvent(
          getUserChannel(session.user.id),
          PusherEvents.READ_NOTIFICATION,
          {}
        );
      }
    }
  };

  // Filter notifications based on the current filter
  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter(n => !n.isRead);
    if (filter === "social") return notifications.filter(n => ["FOLLOW", "LIKE", "COMMENT", "MENTION", "FRIEND_REQUEST"].includes(n.type));
    if (filter === "groups") return notifications.filter(n => n.type.startsWith("GROUP_") || !!n.groupId);
    if (filter === "pages") return notifications.filter(n => n.type.startsWith("PAGE_") || !!n.pageId);
    if (filter === "system") return notifications.filter(n => ["SYSTEM", "SECURITY_ALERT", "ACCOUNT_UPDATE"].includes(n.type));
    return notifications;
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey = "older";

      if (date.toDateString() === today.toDateString()) {
        groupKey = "today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "yesterday";
      } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        groupKey = "thisWeek";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  // Get notification content based on type
  const getNotificationText = (notification: Notification) => {
    const senderName = notification.sender?.name || "ვიღაც";

    // Use the content from notification if available
    if (notification.content) {
      return notification.content;
    }

    switch (notification.type) {
      // User-related notifications
      case "FOLLOW":
        return `${senderName} დაგიწყოთ გამოწერა.`;
      case "LIKE":
        return `${senderName}-ს მოეწონა თქვენი პოსტი.`;
      case "COMMENT":
        return `${senderName}-მა დააკომენტარა თქვენს პოსტზე.`;
      case "MENTION":
        return `${senderName}-მა მოგიხსენიათ პოსტში.`;
      case "FRIEND_REQUEST":
        return `${senderName}-მა გამოგიგზავნათ მეგობრობის მოთხოვნა.`;
      case "MESSAGE":
        return `${senderName}-მა გამოგიგზავნათ შეტყობინება.`;

      // Group-related notifications
      case "GROUP_INVITE":
        return `${senderName}-მა მოგიწვიათ ჯგუფში შესასვლელად.`;
      case "GROUP_JOIN_REQUEST":
        return `${senderName}-მა მოითხოვა თქვენს ჯგუფში გაწევრიანება.`;
      case "GROUP_JOIN_APPROVED":
        return `თქვენი მოთხოვნა ჯგუფში გაწევრიანებაზე დადასტურებულია.`;
      case "GROUP_ROLE_CHANGE":
        return `თქვენი როლი ჯგუფში შეიცვალა.`;
      case "GROUP_POST":
        return `ახალი პოსტი ჯგუფში, რომლის წევრიც ხართ.`;
      case "GROUP_COMMENT":
        return `${senderName}-მა დააკომენტარა ჯგუფის პოსტზე.`;
      case "GROUP_REACTION":
        return `${senderName}-მა მოიწონა თქვენი პოსტი ჯგუფში.`;
      case "GROUP_EVENT":
        return `ახალი ღონისძიება ჯგუფში, რომლის წევრიც ხართ.`;
      case "GROUP_POLL":
        return `ახალი გამოკითხვა ჯგუფში, რომლის წევრიც ხართ.`;
      case "GROUP_ANNOUNCEMENT":
        return `მნიშვნელოვანი განცხადება ჯგუფიდან.`;
      case "GROUP_MENTION":
        return `${senderName}-მა მოგიხსენიათ ჯგუფის პოსტში.`;
      case "GROUP_FILE_UPLOAD":
        return `ახალი ფაილი აიტვირთა ჯგუფში, რომლის წევრიც ხართ.`;
      case "GROUP_BADGE_AWARDED":
        return `თქვენ მიიღეთ ახალი ბეჯი ჯგუფში.`;

      // Page-related notifications
      case "PAGE_INVITE":
        return `თქვენ მოგიწვიეს გვერდის ადმინისტრატორად.`;
      case "PAGE_POST":
        return `ახალი პოსტი გვერდზე, რომელსაც ადევნებთ თვალს.`;
      case "PAGE_EVENT":
        return `ახალი ღონისძიება გვერდზე, რომელსაც ადევნებთ თვალს.`;

      // System notifications
      case "SYSTEM":
        return "სისტემური შეტყობინება";
      case "SECURITY_ALERT":
        return "უსაფრთხოების შეტყობინება - გთხოვთ, შეამოწმოთ";
      case "ACCOUNT_UPDATE":
        return "თქვენი ანგარიში განახლდა";

      default:
        return "ახალი შეტყობინება";
    }
  };

  // Get priority class based on notification priority
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "border-l-4 border-amber-500";
      case "URGENT":
        return "border-l-4 border-red-500";
      case "LOW":
        return "opacity-80";
      default:
        return "";
    }
  };

  // Render appropriate icon for each notification type
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case "FOLLOW":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent-blue">
            <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
          </svg>
        );
      case "LIKE":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent-red">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        );
      case "COMMENT":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent-green">
            <path fillRule="evenodd" d="M5.337 21.718a6.707 6.707 0 01-.533-.074.75.75 0 01-.44-1.223 3.73 3.73 0 00.814-1.686c.023-.115-.022-.317-.254-.543C3.274 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 01-4.246.997z" clipRule="evenodd" />
          </svg>
        );
      case "MESSAGE":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent-blue">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
          </svg>
        );
      default:
        return <Bell className="h-5 w-5 text-text-secondary" />;
    }
  };

  return (
    <div className="relative">
      {/* Notification Button */}
      <button
        onClick={toggleNotifications}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card-secondary-bg hover:bg-hover-bg transition-transform active:scale-95"
        aria-label="შეტყობინებები"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-accent-red px-[2px] text-xs font-bold text-white animate-[pulse_1.5s_ease-in-out_infinite] shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
            <span className="absolute inset-0 rounded-full bg-accent-red/20 animate-ping opacity-75"></span>
          </>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-[600px] rounded-lg border border-border-color bg-card-bg shadow-lg overflow-hidden z-50">
          {/* Header with tabs */}
          <div className="flex items-center justify-between border-b border-border-color p-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`font-semibold text-sm ${activeTab === "notifications" ? "text-accent-blue" : "text-text-secondary"}`}
              >
                შეტყობინებები
                {unreadCount > 0 && activeTab !== "notifications" && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-accent-red text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`font-semibold text-sm ${activeTab === "settings" ? "text-accent-blue" : "text-text-secondary"}`}
              >
                პარამეტრები
              </button>
            </div>
            <div className="flex space-x-2">
              {activeTab === "notifications" && unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead({})}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-primary hover:bg-hover-bg"
                >
                  <Check className="h-3 w-3" />
                  <span>ყველას წაკითხვა</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-text-secondary hover:bg-hover-bg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {activeTab === "notifications" && (
            <>
              {/* Filter tabs */}
              <div className="flex items-center border-b border-border-color overflow-x-auto p-1 bg-card-secondary-bg">
                {["all", "unread", "social", "groups", "pages", "system"].map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                      filter === filterType
                        ? "bg-accent-blue text-white"
                        : "text-text-secondary hover:bg-hover-bg"
                    }`}
                  >
                    {filterType === "all" && "ყველა"}
                    {filterType === "unread" && "წაუკითხავი"}
                    {filterType === "social" && "სოციალური"}
                    {filterType === "groups" && "ჯგუფები"}
                    {filterType === "pages" && "გვერდები"}
                    {filterType === "system" && "სისტემური"}
                  </button>
                ))}
              </div>

              {/* Notifications list */}
              <div className="overflow-y-auto max-h-[450px]">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8 text-text-secondary">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-t-transparent"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-text-secondary">
                    <Bell className="h-12 w-12 mb-2 opacity-50" />
                    <p>არ გაქვთ {filter !== "all" ? filter + " " : ""}შეტყობინებები</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-color">
                    {/* Render grouped notifications */}
                    {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                      <div key={group}>
                        {/* Group header */}
                        <div className="px-3 py-2 bg-card-secondary-bg/50 sticky top-0 z-10">
                          <p className="text-xs font-medium text-text-secondary">
                            {group === "today" && "დღეს"}
                            {group === "yesterday" && "გუშინ"}
                            {group === "thisWeek" && "ამ კვირაში"}
                            {group === "older" && "უფრო ძველი"}
                          </p>
                        </div>

                        {/* Group notifications */}
                        <ul className="divide-y divide-border-color/50">
                          {groupNotifications.map((notification) => (
                            <li
                              key={notification.id}
                              className={`hover:bg-hover-bg transition-colors ${
                                !notification.isRead ? 'bg-hover-bg/50' : ''
                              } ${getPriorityClass(notification.priority || 'NORMAL')}`}
                            >
                              <div
                                className="p-3"
                                onClick={() => {
                                  if (!notification.isRead) {
                                    markOneAsRead({ notificationId: notification.id });
                                    // Trigger real-time event
                                    if (session?.user?.id) {
                                      triggerEvent(
                                        getUserChannel(session.user.id),
                                        PusherEvents.READ_NOTIFICATION,
                                        { notificationId: notification.id }
                                      );
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Image/icon */}
                                  {notification.imageUrl ? (
                                    <Image
                                      src={notification.imageUrl}
                                      alt="Notification image"
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 rounded-md object-cover"
                                    />
                                  ) : notification.sender?.image ? (
                                    <Image
                                      src={notification.sender.image}
                                      alt={notification.sender.name || "User"}
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card-secondary-bg">
                                      {renderNotificationIcon(notification.type)}
                                    </div>
                                  )}

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary">
                                      {getNotificationText(notification)}
                                    </p>
                                    <p className="text-xs text-text-secondary mt-1">
                                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>

                                    {/* Action button if notification is actionable */}
                                    {notification.isActionable && notification.actionLabel && (
                                      <div className="mt-2">
                                        <Link
                                          href={notification.actionUrl || notification.url || '#'}
                                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/90 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Track interaction
                                            api.notification.trackNotificationInteraction.mutate({
                                              notificationId: notification.id,
                                              event: 'clicked',
                                            });
                                          }}
                                        >
                                          {notification.actionLabel}
                                        </Link>
                                      </div>
                                    )}
                                  </div>

                                  {/* Read indicator */}
                                  {!notification.isRead && (
                                    <div className="h-2 w-2 rounded-full bg-accent-blue mt-1 flex-shrink-0"></div>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {filteredNotifications.length > 0 && (
                <div className="border-t border-border-color p-2">
                  <Link
                    href="/notifications"
                    className="block rounded-md px-3 py-2 text-center text-sm text-accent-blue hover:bg-hover-bg"
                    onClick={() => setIsOpen(false)}
                  >
                    ყველა შეტყობინების ნახვა
                  </Link>
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && (
            <div className="p-4 max-h-[450px] overflow-y-auto">
              <h4 className="font-medium mb-3 text-text-primary">შეტყობინებების პარამეტრები</h4>

              {preferencesLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-accent-blue border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">აპლიკაციის შეტყობინებები</span>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input
                        type="checkbox"
                        id="inAppToggle"
                        className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                        checked={preferencesData?.preferences?.inAppEnabled ?? true}
                        onChange={(e) => {
                          updatePreferences({
                            inAppEnabled: e.target.checked
                          });
                        }}
                      />
                      <label
                        htmlFor="inAppToggle"
                        className={`block h-6 rounded-full w-10 ${
                          preferencesData?.preferences?.inAppEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                        } transition-colors cursor-pointer`}
                      ></label>
                      <div
                        className={`absolute top-0 mt-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          preferencesData?.preferences?.inAppEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">ელფოსტის შეტყობინებები</span>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input
                        type="checkbox"
                        id="emailToggle"
                        className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                        checked={preferencesData?.preferences?.emailEnabled ?? false}
                        onChange={(e) => {
                          updatePreferences({
                            emailEnabled: e.target.checked
                          });
                        }}
                      />
                      <label
                        htmlFor="emailToggle"
                        className={`block h-6 rounded-full w-10 ${
                          preferencesData?.preferences?.emailEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                        } transition-colors cursor-pointer`}
                      ></label>
                      <div
                        className={`absolute top-0 mt-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          preferencesData?.preferences?.emailEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">Push შეტყობინებები</span>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input
                        type="checkbox"
                        id="pushToggle"
                        className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                        checked={preferencesData?.preferences?.pushEnabled ?? true}
                        onChange={(e) => {
                          updatePreferences({
                            pushEnabled: e.target.checked
                          });

                          // If enabling push, request browser notification permission
                          if (e.target.checked && Notification.permission !== "granted") {
                            Notification.requestPermission();
                          }
                        }}
                      />
                      <label
                        htmlFor="pushToggle"
                        className={`block h-6 rounded-full w-10 ${
                          preferencesData?.preferences?.pushEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                        } transition-colors cursor-pointer`}
                      ></label>
                      <div
                        className={`absolute top-0 mt-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          preferencesData?.preferences?.pushEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">წყნარი საათები</span>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input
                        type="checkbox"
                        id="quietHoursToggle"
                        className="opacity-0 absolute block w-6 h-6 cursor-pointer"
                        checked={preferencesData?.preferences?.quietHoursEnabled ?? false}
                        onChange={(e) => {
                          updatePreferences({
                            quietHoursEnabled: e.target.checked,
                            // Set default quiet hours if enabling for the first time
                            ...(e.target.checked && !preferencesData?.preferences?.quietHoursStart ? {
                              quietHoursStart: "22:00",
                              quietHoursEnd: "08:00"
                            } : {})
                          });
                        }}
                      />
                      <label
                        htmlFor="quietHoursToggle"
                        className={`block h-6 rounded-full w-10 ${
                          preferencesData?.preferences?.quietHoursEnabled ? 'bg-accent-blue' : 'bg-gray-300'
                        } transition-colors cursor-pointer`}
                      ></label>
                      <div
                        className={`absolute top-0 mt-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          preferencesData?.preferences?.quietHoursEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      ></div>
                    </div>
                  </div>

                  {preferencesData?.preferences?.quietHoursEnabled && (
                    <div className="pl-4 pt-1 space-y-2 text-xs text-text-secondary">
                      <div>
                        {preferencesData?.preferences?.quietHoursStart && preferencesData?.preferences?.quietHoursEnd
                          ? `${preferencesData.preferences.quietHoursStart} - ${preferencesData.preferences.quietHoursEnd}`
                          : ""}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-border-color space-y-2">
                    <h5 className="text-sm font-medium text-text-primary">შეტყობინებების ტიპები</h5>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked id="type-social" />
                        <label htmlFor="type-social">სოციალური</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked id="type-groups" />
                        <label htmlFor="type-groups">ჯგუფები</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked id="type-pages" />
                        <label htmlFor="type-pages">გვერდები</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked id="type-system" />
                        <label htmlFor="type-system">სისტემური</label>
                      </div>
                    </div>

                    <div className="pt-2 mt-1">
                      <Link
                        href="/settings/notifications"
                        className="text-sm text-accent-blue hover:underline"
                        onClick={() => setIsOpen(false)}
                      >
                        პარამეტრების სრულად მართვა
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}