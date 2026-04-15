'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { DashboardShell } from '@/components/admin/DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
        <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] px-5 py-4 text-sm text-[var(--ink-700)]">
          Loading admin session...
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
