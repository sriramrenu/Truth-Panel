'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';
import { fetchUserProfile } from '../../../../utils/api';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('supabase_token');
        if (!token) {
           router.replace('/Frontend/Login');
           return;
        }
        const data = await fetchUserProfile();
        if (data.success && data.user) {
            setUser(data.user);
        } else {
            router.replace('/Frontend/Login');
        }
      } catch (err) {
        router.replace('/Frontend/Login');
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('truth_panel_user');
    router.replace('/Frontend/Login');
  };

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';
  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Worker';

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[100%] flex-col pb-28">
        <Navbar />

        <section className="flex-1 px-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/Frontend/WorkerPanel/Dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 bg-white font-[var(--font-poppins)] text-lg"
            aria-label="Back to dashboard"
          >
			<img src="/BackArrow.svg" alt="Back" className="h-4 w-4 mr-[2px]" />
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