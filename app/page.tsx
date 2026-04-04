'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserRole = 'admin' | 'worker';

const MOCK_USERS: Array<{ email: string; password: string; role: UserRole; name: string }> = [
  {
    email: 'admin@truthpanel.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin',
  },
  {
    email: 'worker1@truthpanel.com',
    password: 'worker123',
    role: 'worker',
    name: 'Arun Kumar',
  },
  {
    email: 'worker2@truthpanel.com',
    password: 'worker123',
    role: 'worker',
    name: 'Priya Sharma',
  },
  {
    email: 'worker3@truthpanel.com',
    password: 'worker123',
    role: 'worker',
    name: 'Ravi Menon',
  },
];

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    const user = MOCK_USERS.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password.trim(),
    );

    if (!user) {
      setError('Invalid email or password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    sessionStorage.setItem(
      'truth_panel_user',
      JSON.stringify({
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    );

    if (user.role === 'admin') {
      router.push('/Frontend/AdminPanel/Dashboard');
      return;
    }

    router.push('/Frontend/WorkerPanel/Dashboard');
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center justify-center">
        <section className="w-full rounded-2xl border border-[color:var(--OffBlack)]/10 bg-[var(--OffWhite)] p-6 shadow-[0_12px_32px_rgba(13,22,11,0.08)]">
          <header className="mb-6 text-center">
            <p className="font-[var(--font-poppins)] text-xs font-medium uppercase tracking-[0.24em] text-[var(--PBlue)]">
              TruthPanel
            </p>
            <h1 className="mt-2 font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">
              Sign in
            </h1>
            <p className="mt-2 font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/70">
              Access your dashboard securely.
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[color:var(--OffBlack)]/15 bg-white px-3 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-[color:var(--OffBlack)]/15 bg-white px-3 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
              />

              {error ? (
                <p className="font-[var(--font-inter)] text-xs text-red-500 mt-1">
                  {error}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-[var(--OffWhite)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}