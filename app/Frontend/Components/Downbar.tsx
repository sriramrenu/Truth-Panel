'use client';

import { useRouter } from 'next/navigation';

export default function Downbar() {
  const router = useRouter();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center">
        <div className="relative w-full max-w-[500  px]">
          <div className="flex h-20 items-end justify-between rounded-t-[24px] bg-[var(--PBlue)] px-8 pb-3 pt-4 shadow-[0_-4px_18px_rgba(13,22,11,0.15)]">
            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/Dashboard')}
              className="flex flex-col items-center gap-1"
              aria-label="Dashboard"
            >
              <img src="/DashboardIcon_rounded.svg" alt="Dashboard" className="h-6 w-6" />
              <span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">Dashboard</span>
            </button>

            <div className="w-20" />

            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/Forms')}
              className="flex flex-col items-center gap-1"
              aria-label="Forms"
            >
              <img src="/FormsIcon.svg" alt="Forms" className="h-6 w-6" />
              <span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">
                Forms
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/Frontend/AdminPanel/FormCreation')}
            className="absolute left-1/2 top-[5px] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--SYellow)] shadow-[0_10px_22px_rgba(13,22,11,0.18)]"
            aria-label="Create form"  
          >
            <span className="text-[34px] pb-[8px] leading-none text-white">+</span>
          </button>
        </div>
      </nav>
  )
}