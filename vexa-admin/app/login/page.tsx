'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { getErrorMessage } from '@/lib/error-message';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      router.replace('/dashboard');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Unable to sign in. Please check credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--page-bg)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-11rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(213,255,145,0.5),_rgba(213,255,145,0))]" />
        <div className="absolute -right-24 bottom-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(74,145,226,0.24),_rgba(74,145,226,0))]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-[var(--line-soft)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(21,40,62,0.15)]">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-dim)]">VEXA ADMIN</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--ink-900)]">Control Room Login</h1>
          <p className="mt-2 text-sm text-[var(--ink-700)]">
            Sign in with your admin account to manage operations, moderation, and financial controls.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-dim)]">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Enter your admin email"
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-400)] focus:ring-2 focus:ring-[rgba(74,145,226,0.18)]"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-dim)]">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-400)] focus:ring-2 focus:ring-[rgba(74,145,226,0.18)]"
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-[#efb2a8] bg-[#fff1ee] px-3 py-2 text-sm text-[#8f2f1f]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-[rgba(25,48,8,0.15)] bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink-900)] shadow-[0_12px_26px_rgba(153,205,64,0.35)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
