'use client';

import { useRouter } from 'next/navigation';

export default function WNavbar() {
  const router = useRouter();
  return (
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="TATA INSIGHTS AND QUANTS" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 pt-[5.5px] rounded-full bg-transparent" aria-label="Notifications">
              <img src="/BellIcon_rounded.svg" alt="Notifications" className="h-6 w-6" />
            </div>
            <button
              type="button"
              onClick={() => router.push('/Frontend/WorkerPanel/Profile')}
              className="h-9 w-9 rounded-full bg-transparent"
              aria-label="Profile"
            >
              <img src="/ProfileIcon_rounded.svg" alt="Profile" className="h-6 w-6" />
            </button>
          </div>
        </header>
  );
}