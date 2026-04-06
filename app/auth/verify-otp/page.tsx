'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function VerifyOTP() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || sessionStorage.getItem('reset_email') || '';
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'otp' | 'password' | 'success'>('otp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    Object.values(requirements).forEach((req) => {
      if (req) strength++;
    });

    return { strength, requirements };
  };

  const passwordStrengthData = getPasswordStrength(newPassword);
  const passwordStrengthPercentage = (passwordStrengthData.strength / 5) * 100;
  const getStrengthColor = () => {
    if (passwordStrengthData.strength <= 1) return 'bg-red-500';
    if (passwordStrengthData.strength <= 2) return 'bg-orange-500';
    if (passwordStrengthData.strength <= 3) return 'bg-yellow-500';
    if (passwordStrengthData.strength <= 4) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrengthData.strength <= 1) return 'Weak';
    if (passwordStrengthData.strength <= 2) return 'Fair';
    if (passwordStrengthData.strength <= 3) return 'Good';
    if (passwordStrengthData.strength <= 4) return 'Strong';
    return 'Very Strong';
  };

  useEffect(() => {
    if (!email) {
      router.push('/auth/reset');
    }
  }, [email, router]);

  const handleVerifyOTP = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!otp.trim()) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP. Please try again.');
      }

      setStep('password');
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'An error occurred verifying the OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (passwordStrengthData.strength < 4) {
      setError('Password is not strong enough. Please include uppercase, lowercase, number, and special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setStep('success');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        sessionStorage.removeItem('reset_email');
        router.push('/Frontend/Login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting the password.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--OffWhite)] to-blue-50 px-4 py-8 text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-sm items-center justify-center">
        {/* OTP Step */}
        {step === 'otp' && (
          <section className="w-full rounded-2xl border border-[color:var(--OffBlack)]/10 bg-white p-6 shadow-lg">
            <button
              type="button"
              onClick={() => router.push('/auth/reset')}
              className="mb-6 inline-flex items-center gap-2 font-[var(--font-inter)] text-sm font-medium text-[var(--PBlue)] transition hover:text-[color:var(--PBlue)]/80"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-[var(--PBlue)]" />
              </div>
              <p className="font-[var(--font-poppins)] text-xs font-medium uppercase tracking-[0.24em] text-[var(--PBlue)]">
                Step 1 of 2
              </p>
              <h1 className="mt-3 font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">
                Verify OTP
              </h1>
              <p className="mt-2 font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/70">
                Enter the 6-digit code sent to
              </p>
              <p className="font-[var(--font-inter)] text-sm font-semibold text-[var(--OffBlack)]">
                {email}
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
                >
                  One-Time Password
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(event) => {
                    const val = event.target.value.replace(/\D/g, '');
                    setOtp(val);
                    setError('');
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-xl border-2 border-[color:var(--OffBlack)]/15 bg-white px-4 py-4 font-[var(--font-inter)] text-lg font-semibold text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20 tracking-[0.5em] text-center"
                />
                <p className="mt-2 font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">
                  Check your email and spam folder
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 border border-red-200">
                  <p className="font-[var(--font-inter)] text-sm font-medium text-red-700">
                    ✗ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <p className="text-center font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">
                Didn't receive code? Try a 6-digit number for demo
              </p>
            </form>
          </section>
        )}

        {/* Password Reset Step */}
        {step === 'password' && (
          <section className="w-full rounded-2xl border border-[color:var(--OffBlack)]/10 bg-white p-6 shadow-lg">
            <button
              type="button"
              onClick={() => setStep('otp')}
              className="mb-6 inline-flex items-center gap-2 font-[var(--font-inter)] text-sm font-medium text-[var(--PBlue)] transition hover:text-[color:var(--PBlue)]/80"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-[var(--PBlue)]" />
              </div>
              <p className="font-[var(--font-poppins)] text-xs font-medium uppercase tracking-[0.24em] text-[var(--PBlue)]">
                Step 2 of 2
              </p>
              <h1 className="mt-3 font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">
                New Password
              </h1>
              <p className="mt-2 font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/70">
                Create a strong new password for your account
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="Enter strong password"
                  className="w-full rounded-xl border-2 border-[color:var(--OffBlack)]/15 bg-white px-4 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
                />

                {newPassword && (
                  <div className="mt-3 space-y-3">
                    {/* Strength Bar */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-[var(--font-inter)] text-xs font-medium text-[var(--OffBlack)]">
                          Password Strength
                        </span>
                        <span className={`font-[var(--font-inter)] text-xs font-semibold ${
                          passwordStrengthData.strength <= 1 ? 'text-red-600' :
                          passwordStrengthData.strength <= 2 ? 'text-orange-600' :
                          passwordStrengthData.strength <= 3 ? 'text-yellow-600' :
                          passwordStrengthData.strength <= 4 ? 'text-lime-600' :
                          'text-green-600'
                        }`}>
                          {getStrengthLabel()}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                          style={{ width: `${passwordStrengthPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3 border border-gray-200">
                      <p className="font-[var(--font-inter)] text-xs font-semibold text-gray-700 mb-3">
                        Password Requirements:
                      </p>
                      <div className="space-y-1.5">
                        <div className={`flex items-center gap-2 text-xs font-[var(--font-inter)] ${
                          passwordStrengthData.requirements.length ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            passwordStrengthData.requirements.length ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {passwordStrengthData.requirements.length ? '✓' : '○'}
                          </span>
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-[var(--font-inter)] ${
                          passwordStrengthData.requirements.uppercase ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            passwordStrengthData.requirements.uppercase ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {passwordStrengthData.requirements.uppercase ? '✓' : '○'}
                          </span>
                          <span>Uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-[var(--font-inter)] ${
                          passwordStrengthData.requirements.lowercase ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            passwordStrengthData.requirements.lowercase ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {passwordStrengthData.requirements.lowercase ? '✓' : '○'}
                          </span>
                          <span>Lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-[var(--font-inter)] ${
                          passwordStrengthData.requirements.number ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            passwordStrengthData.requirements.number ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {passwordStrengthData.requirements.number ? '✓' : '○'}
                          </span>
                          <span>Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-[var(--font-inter)] ${
                          passwordStrengthData.requirements.special ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            passwordStrengthData.requirements.special ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {passwordStrengthData.requirements.special ? '✓' : '○'}
                          </span>
                          <span>Special character (!@#$%^&*)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border-2 border-[color:var(--OffBlack)]/15 bg-white px-4 py-3 font-[var(--font-inter)] text-sm font-normal text-[var(--OffBlack)] outline-none transition focus:border-[var(--PBlue)] focus:ring-2 focus:ring-[color:var(--PBlue)]/20"
                />
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <p className="mt-2 font-[var(--font-inter)] text-xs text-green-600 flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                    Passwords match
                  </p>
                )}
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-2 font-[var(--font-inter)] text-xs text-red-600 flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">✗</span>
                    Passwords do not match
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 border border-red-200">
                  <p className="font-[var(--font-inter)] text-sm font-medium text-red-700">
                    ✗ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || passwordStrengthData.strength < 4 || newPassword !== confirmPassword}
                className="w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </section>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <section className="w-full rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-lg text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center animate-pulse" />
                <CheckCircle2 size={64} className="absolute inset-0 text-green-600 animate-bounce" />
              </div>
            </div>

            <h1 className="font-[var(--font-poppins)] text-2xl font-medium text-green-700 mb-2">
              Password Changed!
            </h1>

            <p className="font-[var(--font-inter)] text-sm text-green-600 mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>

            <div className="space-y-3">
              <p className="font-[var(--font-inter)] text-xs text-green-700">
                Redirecting to login in a few seconds...
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem('reset_email');
                  router.push('/Frontend/Login');
                }}
                className="w-full rounded-xl bg-green-600 px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white transition hover:brightness-110"
              >
                Go to Login
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
