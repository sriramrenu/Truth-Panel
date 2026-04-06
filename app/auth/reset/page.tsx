'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      
      setMessage('✓ ' + data.message);
      sessionStorage.setItem('reset_email', email.trim().toLowerCase());
      setTimeout(() => {
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-sm items-center justify-center">
        <section className="w-full rounded-2xl border border-[color:var(--OffBlack)]/10 bg-[var(--OffWhite)] p-6 shadow-[0_12px_32px_rgba(13,22,11,0.08)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 font-[var(--font-inter)] text-sm font-medium text-[var(--PBlue)] transition hover:text-[color:var(--PBlue)]/80"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <header className="mb-6 text-center">
            <p className="font-[var(--font-poppins)] text-xs font-medium uppercase tracking-[0.24em] text-[var(--PBlue)]">
              TruthPanel
            </p>
            <h1 className="mt-2 font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">
              Reset Password
            </h1>
            <p className="mt-2 font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/70">
              Enter your email to receive an OTP.
            </p>
          </header>

          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--OffBlack)]/40" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[color:var(--OffBlack)]/15 bg-white pl-10 pr-3 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
                />
              </div>

              {error && (
                <p className="font-[var(--font-inter)] text-xs text-red-500 mt-1">
                  {error}
                </p>
              )}
            </div>

            {message && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-200">
                <p className="font-[var(--font-inter)] text-sm font-medium text-green-700 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                    ✓
                  </span>
                  {message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-[var(--OffWhite)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
