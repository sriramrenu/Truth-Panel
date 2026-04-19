'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/Frontend/Components/Navbar';
import Downbar from '@/app/Frontend/Components/Downbar';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'participation_milestone' | 'survey_ended' | 'system_alert';
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const { fetchNotifications } = await import('../../../../utils/api');
      const res = await fetchNotifications();
      if (res?.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const { markNotificationAsRead } = await import('../../../../utils/api');
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { markAllNotificationsRead } = await import('../../../../utils/api');
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'participation_milestone': return '📊';
      case 'survey_ended': return '✅';
      case 'system_alert': return '⚙️';
      default: return '🔔';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--OffWhite)] pb-24">
      <Navbar />
      
      <main className="flex-1 px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-[var(--font-poppins)] font-semibold text-gray-800">Admin Alerts</h1>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-[var(--PBlue)] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--PBlue)]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <span className="text-4xl text-gray-400">📊</span>
            </div>
            <p className="text-gray-500 font-medium">No alerts yet</p>
            <p className="text-xs text-gray-400 mt-1">We'll notify you about survey progress and system updates!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                  // For admins, maybe link to the survey analytics page
                  if (notif.related_id) router.push('/Frontend/AdminPanel/Dashboard');
                }}
                className={`relative p-4 rounded-2xl transition-all border cursor-pointer ${
                  notif.is_read 
                    ? 'bg-white/60 border-gray-100' 
                    : 'bg-white border-[var(--PBlue)]/20 shadow-md ring-1 ring-[var(--PBlue)]/5'
                }`}
              >
                {!notif.is_read && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-[var(--PBlue)]" />
                )}
                <div className="flex gap-4">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${
                    notif.type === 'participation_milestone' ? 'bg-blue-50' : 
                    notif.type === 'survey_ended' ? 'bg-green-50' : 'bg-gray-100'
                  }`}>
                    <span className="text-lg">{getIcon(notif.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${notif.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Downbar />
    </div>
  );
}
