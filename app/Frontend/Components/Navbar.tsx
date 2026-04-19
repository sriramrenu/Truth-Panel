'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const { fetchNotifications } = await import('../../../utils/api');
        const res = await fetchNotifications();
        if (res?.success) {
          const unread = res.data?.filter((n: any) => !n.is_read).length || 0;
          setUnreadCount(unread);
        }
      } catch (err) {
        // Silently fail for navbar
      }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
        <header className="relative z-1 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="TATA INSIGHTS AND QUANTS" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/Notifications')}
              className="relative h-9 w-9 pt-[5.5px] rounded-full bg-transparent" 
              aria-label="Notifications"
            >
              <img src="/BellIcon_rounded.svg" alt="Notifications" className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[var(--OffWhite)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/Profile')}
              className="h-9 w-9 rounded-full bg-transparent"
              aria-label="Profile"
            >
              <img src="/ProfileIcon_rounded.svg" alt="Profile" className="h-6 w-6" />
            </button>
          </div>
        </header>
  );
}