'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('truth_panel_user');
      if (!raw) {
        router.replace('/Frontend/Login');
        return;
      }
      setUser(JSON.parse(raw));
    } catch {
      router.replace('/Frontend/Login');
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('truth_panel_user');
    router.replace('/Frontend/Login');
  };

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Worker';

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
        <Navbar />

        <section className="flex-1 px-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/Frontend/WorkerPanel/Dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 bg-white font-[var(--font-poppins)] text-lg"
            aria-label="Back to dashboard"
          >
            {'<'}
          </button>

          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--PBlue)] font-[var(--font-poppins)] text-2xl font-medium text-white">
              {initial}
            </div>

            <h1 className="mt-3 text-center font-[var(--font-poppins)] text-xl font-medium text-[var(--OffBlack)]">
              {user?.name ?? 'Profile'}
            </h1>

            <div className="mt-3 flex justify-center">
              <span className="rounded-full bg-[var(--SYellow)] px-3 py-1 font-[var(--font-poppins)] text-xs font-medium text-[var(--OffBlack)]">
                {roleLabel}
              </span>
            </div>

            <div className="mt-4 border-t border-[color:var(--OffBlack)]/10">
              <div className="flex items-center justify-between py-3">
                <span className="font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/60">Email</span>
                <span className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]">{user?.email ?? ''}</span>
              </div>
            </div>
          </div>

          {resetMessage && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 border border-green-200">
              <p className="font-[var(--font-inter)] text-sm font-medium text-green-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  ✓
                </span>
                {resetMessage}
              </p>
            </div>
          )}

          {resetError && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 border border-red-200">
              <p className="font-[var(--font-inter)] text-sm font-medium text-red-700">
                {resetError}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push('/auth/reset')}
            className="mt-6 w-full rounded-xl border border-[var(--PBlue)] bg-white px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)] transition hover:bg-[color:var(--PBlue)]/5 flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            Reset Password
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-red-400 bg-white px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-red-500"
          >
            Log Out
          </button>
        </section>
      </div>

      <Downbar />
    </main>
  );
}