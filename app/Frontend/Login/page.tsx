'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../../../utils/api';
import { Eye, EyeOff } from 'lucide-react';


export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const data = await loginUser(email.trim().toLowerCase(), password.trim());

      if (!data.success) {
        setError(data.error || 'Invalid email or password.');
        setIsSubmitting(false);
        return;
      }
      
      const user = data.user;
      sessionStorage.setItem('truth_panel_user', JSON.stringify(user));
      localStorage.setItem('supabase_token', data.session.access_token);
      localStorage.setItem('truth_panel_refresh_token', data.session.refresh_token);

      if (user.role === 'admin') {
        router.push('/Frontend/AdminPanel/Dashboard');
      } else {
        router.push('/Frontend/WorkerPanel/Dashboard');
      }
    } catch (err) {
      setError('Failed to connect to the authentication service.');
      setIsSubmitting(false);
    }
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
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/auth/reset')}
                  className="font-[var(--font-inter)] text-xs font-medium text-[var(--PBlue)] transition hover:text-[color:var(--PBlue)]/80 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-[color:var(--OffBlack)]/15 bg-white px-3 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
              />
                              <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--OffBlack)]/50 transition hover:text-[var(--PBlue)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

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