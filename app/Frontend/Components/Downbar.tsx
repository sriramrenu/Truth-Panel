'use client';

import { useRouter } from 'next/navigation';

export default function Downbar() {
  const router = useRouter();
  return (
    <nav className="fixed inset-x-0 bottom-[-1] z-20 flex justify-center">
        <div className="relative w-full max-w-[500px]">
          <div className="flex h-20 items-center justify-between rounded-t-[24px] bg-[var(--PBlue)] px-8 pb-3 pt-4 shadow-[0_-4px_18px_rgba(13,22,11,0.15)]">
            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/Dashboard')}
              className="flex flex-col items-center gap-1"
              aria-label="Dashboard"
            >
              <img src="/DashboardIcon_rounded.svg" alt="Dashboard" className="h-6 w-6" />
              <span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">Dashboard</span>
            </button>

            
            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/FormCreation')}
              className="flex flex-col items-center gap-1 pr-[30px]"
              aria-label="Create form"  
            >
              <img src="/FormCreation.svg" alt="Forms" className="h-6 w-6" />
              <span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">Create Form</span>
            </button>

    

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
        </div>
      </nav>
  )
}