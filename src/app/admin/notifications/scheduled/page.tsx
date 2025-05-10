"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronLeft, Calendar, Clock, Users, Bell, Trash2, Repeat, RefreshCw } from "lucide-react";
import { api } from "@/lib/trpc/api";

type ScheduledNotification = {
  id: string;
  type: string;
  content: string | null;
  scheduledFor: Date;
  recurring: boolean;
  recurrencePattern: string | null;
  recurrenceEnd: Date | null;
  status: string;
  priority: string;
  recipientId: string | null;
  groupId: string | null;
  createdAt: Date;
  sentCount: number;
};

export default function ScheduledNotificationsPage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  
  // Form state
  const [formType, setFormType] = useState("SYSTEM");
  const [formContent, setFormContent] = useState("");
  const [formScheduleDate, setFormScheduleDate] = useState("");
  const [formScheduleTime, setFormScheduleTime] = useState("");
  const [formRecipientId, setFormRecipientId] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formPriority, setFormPriority] = useState("NORMAL");
  const [formRecurring, setFormRecurring] = useState(false);
  const [formPattern, setFormPattern] = useState("0 9 * * 1"); // Every Monday at 9 AM
  const [formEndDate, setFormEndDate] = useState("");
  
  // Admin check (simple implementation)
  useEffect(() => {
    if (status === 'loading') return;
    
    // Check if user is admin (in a real app, this would be more sophisticated)
    const adminEmails = ['admin@dapdip.com', 'moderator@dapdip.com'];
    setIsAdmin(session?.user?.email ? adminEmails.includes(session.user.email) : false);
    
    if (session?.user?.email && adminEmails.includes(session.user.email)) {
      fetchScheduledNotifications();
    }
  }, [status, session]);
  
  // trpc mutation for creating scheduled notifications
  const { mutate: createScheduled } = api.notification.createScheduledNotification.useMutation({
    onSuccess: () => {
      // Reset form
      setFormContent("");
      setFormScheduleDate("");
      setFormScheduleTime("");
      setFormRecipientId("");
      setFormGroupId("");
      setFormRecurring(false);
      setFormPattern("0 9 * * 1");
      setFormEndDate("");
      setShowNewForm(false);
      
      // Refresh the list
      fetchScheduledNotifications();
    },
  });
  
  // trpc mutation for cancelling a scheduled notification
  const { mutate: cancelScheduled } = api.notification.cancelScheduledNotification.useMutation({
    onSuccess: () => {
      fetchScheduledNotifications();
    },
  });
  
  // Fetch scheduled notifications
  const fetchScheduledNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/scheduled-notifications");
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setError(data.message || "Failed to fetch scheduled notifications");
      }
    } catch (err) {
      setError("An error occurred while fetching scheduled notifications");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Format a cron pattern to human readable text
  const formatCronPattern = (pattern: string) => {
    const parts = pattern.split(' ');
    
    if (parts.length !== 5) return pattern;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Some common patterns
    if (pattern === '0 9 * * 1') return 'ყოველ ორშაბათს, 9:00-ზე';
    if (pattern === '0 9 * * 1-5') return 'ყოველ სამუშაო დღეს, 9:00-ზე';
    if (pattern === '0 12 * * *') return 'ყოველდღე, 12:00-ზე';
    if (pattern === '0 0 1 * *') return 'ყოველი თვის პირველ დღეს, 00:00-ზე';
    
    return pattern;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formContent) {
      setError("Content is required");
      return;
    }
    
    if (!formScheduleDate || !formScheduleTime) {
      setError("Schedule date and time are required");
      return;
    }
    
    if (!formRecipientId && !formGroupId) {
      setError("Either recipient or group is required");
      return;
    }
    
    // Create scheduled date
    const scheduledFor = new Date(`${formScheduleDate}T${formScheduleTime}`);
    
    // Create end date if applicable
    const recurrenceEnd = formRecurring && formEndDate 
      ? new Date(`${formEndDate}T23:59:59`)
      : undefined;
    
    // Create the notification
    createScheduled({
      type: formType as any,
      content: formContent,
      scheduledFor,
      recipientId: formRecipientId || undefined,
      groupId: formGroupId || undefined,
      priority: formPriority as any,
      recurring: formRecurring,
      recurrencePattern: formRecurring ? formPattern : undefined,
      recurrenceEnd,
    });
  };
  
  // Handle notification cancellation
  const handleCancel = (id: string) => {
    if (confirm('ნამდვილად გსურთ ამ დაგეგმილი შეტყობინების გაუქმება?')) {
      cancelScheduled({ id });
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
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">დაგეგმილი შეტყობინებები</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchScheduledNotifications}
            className="p-2 text-text-secondary rounded-full hover:bg-hover-bg"
            title="განახლება"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-accent-blue text-white py-2 px-4 rounded hover:bg-accent-blue/90 transition-colors"
          >
            {showNewForm ? 'გაუქმება' : 'ახალი დაგეგმილი შეტყობინება'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {showNewForm && (
        <div className="bg-card-bg border border-border-color rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ახალი დაგეგმილი შეტყობინება</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-1">
                  შეტყობინების ტიპი
                </label>
                <select
                  id="type"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  <option value="SYSTEM">სისტემური</option>
                  <option value="GROUP_ANNOUNCEMENT">ჯგუფის განცხადება</option>
                  <option value="PAGE_POST">გვერდის პოსტი</option>
                  <option value="SECURITY_ALERT">უსაფრთხოების შეტყობინება</option>
                  <option value="HEALTH_REMINDER">ჯანმრთელობის შეხსენება</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-1">
                  პრიორიტეტი
                </label>
                <select
                  id="priority"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                >
                  <option value="LOW">დაბალი</option>
                  <option value="NORMAL">ნორმალური</option>
                  <option value="HIGH">მაღალი</option>
                  <option value="URGENT">სასწრაფო</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="content" className="block text-sm font-medium mb-1">
                  შინაარსი
                </label>
                <textarea
                  id="content"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="scheduleDate" className="block text-sm font-medium mb-1">
                  დაგეგმვის თარიღი
                </label>
                <input
                  type="date"
                  id="scheduleDate"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formScheduleDate}
                  onChange={(e) => setFormScheduleDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="scheduleTime" className="block text-sm font-medium mb-1">
                  დაგეგმვის დრო
                </label>
                <input
                  type="time"
                  id="scheduleTime"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formScheduleTime}
                  onChange={(e) => setFormScheduleTime(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="recipientId" className="block text-sm font-medium mb-1">
                  მიმღები (მომხმარებლის ID)
                </label>
                <input
                  type="text"
                  id="recipientId"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formRecipientId}
                  onChange={(e) => setFormRecipientId(e.target.value)}
                  placeholder="მომხმარებლის ID (არჩევითი)"
                />
                <p className="text-xs text-text-secondary mt-1">
                  {formRecipientId && formGroupId && 
                    "გაფრთხილება: მითითებული გაქვთ როგორც მიმღები, ასევე ჯგუფი. გამოყენებული იქნება მხოლოდ მიმღები."}
                </p>
              </div>
              
              <div>
                <label htmlFor="groupId" className="block text-sm font-medium mb-1">
                  ჯგუფი (ჯგუფის ID)
                </label>
                <input
                  type="text"
                  id="groupId"
                  className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  placeholder="ჯგუფის ID (არჩევითი)"
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="recurring"
                    className="mr-2"
                    checked={formRecurring}
                    onChange={(e) => setFormRecurring(e.target.checked)}
                  />
                  <label htmlFor="recurring" className="text-sm font-medium">
                    განმეორებადი შეტყობინება
                  </label>
                </div>
                
                {formRecurring && (
                  <div className="space-y-4 pl-4 border-l-2 border-border-color">
                    <div>
                      <label htmlFor="pattern" className="block text-sm font-medium mb-1">
                        განმეორების განრიგი (Cron-ის ფორმატში)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="pattern"
                          className="flex-1 p-2 rounded border border-border-color bg-card-secondary-bg"
                          value={formPattern}
                          onChange={(e) => setFormPattern(e.target.value)}
                          placeholder="0 9 * * 1"
                        />
                        <select
                          className="p-2 rounded border border-border-color bg-card-secondary-bg"
                          value={formPattern}
                          onChange={(e) => setFormPattern(e.target.value)}
                        >
                          <option value="0 9 * * 1">ყოველ ორშაბათს, 9:00-ზე</option>
                          <option value="0 9 * * 1-5">ყოველ სამუშაო დღეს, 9:00-ზე</option>
                          <option value="0 12 * * *">ყოველდღე, 12:00-ზე</option>
                          <option value="0 0 1 * *">ყოველი თვის პირველ დღეს</option>
                        </select>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {formatCronPattern(formPattern)}
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                        დასრულების თარიღი (არჩევითი)
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        className="w-full p-2 rounded border border-border-color bg-card-secondary-bg"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-border-color rounded hover:bg-hover-bg"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent-blue text-white rounded hover:bg-accent-blue/90"
              >
                შექმნა
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Scheduled notifications list */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-t-transparent"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-8 bg-card-bg rounded-lg border border-border-color">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-text-secondary opacity-50" />
          <p className="text-lg font-medium mb-2">დაგეგმილი შეტყობინებები არ არის</p>
          <p className="text-text-secondary">
            შექმენით ახალი დაგეგმილი შეტყობინება ზემოთ მოცემული ფორმის გამოყენებით.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card-bg border border-border-color rounded-lg p-4 ${
                notification.status === 'PENDING' 
                  ? 'border-l-4 border-l-accent-blue' 
                  : notification.status === 'SENT' 
                  ? 'border-l-4 border-l-green-500' 
                  : notification.status === 'CANCELLED' 
                  ? 'border-l-4 border-l-red-500 opacity-75' 
                  : notification.status === 'FAILED' 
                  ? 'border-l-4 border-l-amber-500' 
                  : ''
              }`}
            >
              <div className="flex justify-between">
                <div className="flex items-center mb-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full mr-2 ${
                    notification.status === 'PENDING' 
                      ? 'bg-blue-100 text-blue-800' 
                      : notification.status === 'SENT' 
                      ? 'bg-green-100 text-green-800' 
                      : notification.status === 'CANCELLED' 
                      ? 'bg-red-100 text-red-800' 
                      : notification.status === 'FAILED' 
                      ? 'bg-amber-100 text-amber-800' 
                      : ''
                  }`}>
                    {notification.status === 'PENDING' 
                      ? 'დაგეგმილი' 
                      : notification.status === 'SENT' 
                      ? 'გაგზავნილი' 
                      : notification.status === 'CANCELLED' 
                      ? 'გაუქმებული' 
                      : notification.status === 'FAILED' 
                      ? 'შეცდომა' 
                      : notification.status}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full mr-2 ${
                    notification.priority === 'LOW' 
                      ? 'bg-gray-100 text-gray-800' 
                      : notification.priority === 'NORMAL' 
                      ? 'bg-blue-100 text-blue-800' 
                      : notification.priority === 'HIGH' 
                      ? 'bg-amber-100 text-amber-800' 
                      : notification.priority === 'URGENT' 
                      ? 'bg-red-100 text-red-800' 
                      : ''
                  }`}>
                    {notification.priority === 'LOW' 
                      ? 'დაბალი' 
                      : notification.priority === 'NORMAL' 
                      ? 'ნორმალური' 
                      : notification.priority === 'HIGH' 
                      ? 'მაღალი' 
                      : notification.priority === 'URGENT' 
                      ? 'სასწრაფო' 
                      : notification.priority}
                  </span>
                  {notification.recurring && (
                    <span className="flex items-center px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                      <Repeat className="h-3 w-3 mr-1" />
                      განმეორებადი
                    </span>
                  )}
                </div>
                
                {notification.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancel(notification.id)}
                    className="p-1.5 text-text-secondary hover:text-red-500 rounded-full hover:bg-red-50"
                    title="გაუქმება"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium mb-1">
                  {notification.type.startsWith('GROUP_') 
                    ? 'ჯგუფის შეტყობინება' 
                    : notification.type.startsWith('PAGE_') 
                    ? 'გვერდის შეტყობინება' 
                    : notification.type.startsWith('HEALTH_') 
                    ? 'ჯანმრთელობის შეხსენება' 
                    : notification.type === 'SECURITY_ALERT' 
                    ? 'უსაფრთხოების შეტყობინება' 
                    : notification.type === 'SYSTEM' 
                    ? 'სისტემური შეტყობინება' 
                    : notification.type}
                </h3>
                <p className="text-sm mb-2">{notification.content}</p>
                
                <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(notification.scheduledFor).toLocaleString()}
                  </div>
                  
                  {notification.recipientId && (
                    <div className="flex items-center">
                      <Bell className="h-3 w-3 mr-1" />
                      მიმღები: {notification.recipientId.substring(0, 8)}...
                    </div>
                  )}
                  
                  {notification.groupId && (
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      ჯგუფი: {notification.groupId.substring(0, 8)}...
                    </div>
                  )}
                  
                  {notification.sentCount > 0 && (
                    <div className="flex items-center">
                      <Bell className="h-3 w-3 mr-1" />
                      გაგზავნილია: {notification.sentCount}
                    </div>
                  )}
                </div>
                
                {notification.recurring && notification.recurrencePattern && (
                  <div className="mt-2 text-xs bg-purple-50 rounded p-2">
                    <div className="flex items-center text-purple-800">
                      <Repeat className="h-3 w-3 mr-1" />
                      <strong>განმეორება:</strong> {formatCronPattern(notification.recurrencePattern)}
                    </div>
                    {notification.recurrenceEnd && (
                      <div className="text-purple-700 mt-1">
                        დასრულება: {new Date(notification.recurrenceEnd).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}