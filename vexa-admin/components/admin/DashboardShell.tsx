'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAdminAuth } from './AdminAuthProvider';

interface NavItem {
  href: string;
  label: string;
  short?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', short: 'OVR' },
  { href: '/dashboard/users', label: 'Users', short: 'USR' },
  { href: '/dashboard/kyc', label: 'KYC Queue', short: 'KYC' },
  { href: '/dashboard/jobs', label: 'Jobs', short: 'JOB' },
  { href: '/dashboard/bidding', label: 'Bidding Monitor', short: 'BID' },
  { href: '/dashboard/modifications', label: 'Modifications', short: 'MOD' },
  { href: '/dashboard/payments', label: 'Payments', short: 'PAY' },
  { href: '/dashboard/disputes', label: 'Disputes', short: 'DSP' },
  { href: '/dashboard/ratings', label: 'Ratings', short: 'RTG' },
  { href: '/dashboard/notifications', label: 'Notifications', short: 'NTF' },
  { href: '/dashboard/recommendations', label: 'AI Recommendations', short: 'AI' },
  { href: '/dashboard/audit', label: 'Audit Logs', short: 'LOG' },
  { href: '/dashboard/admins', label: 'Admins', short: 'ADM' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeLabel = useMemo(() => {
    const active = navItems.find((item) => isActive(pathname, item.href));
    return active?.label || 'Dashboard';
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink-900)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 -top-44 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(213,255,145,0.45),_rgba(213,255,145,0))]" />
        <div className="absolute -right-28 top-28 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(255,170,118,0.28),_rgba(255,170,118,0))]" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(74,145,226,0.22),_rgba(74,145,226,0))]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-[var(--line-soft)] bg-[var(--panel)]/95 p-4 backdrop-blur transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="mb-4 rounded-2xl border border-[var(--line-soft)] bg-[var(--panel-strong)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-dim)]">VEXA</div>
            <div className="mt-1 text-lg font-bold leading-tight text-[var(--ink-900)]">Admin Control Room</div>
            <div className="mt-3 inline-flex items-center rounded-full border border-[var(--line-soft)] bg-white px-2 py-1 text-xs font-medium text-[var(--ink-700)]">
              {admin?.adminRole || 'ADMIN'}
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${active ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--ink-900)] shadow-[0_10px_20px_rgba(153,205,64,0.25)]' : 'border-transparent text-[var(--ink-700)] hover:border-[var(--line-soft)] hover:bg-white'}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-semibold tracking-wide ${active ? 'border-[rgba(17,31,7,0.2)] bg-[rgba(17,31,7,0.08)]' : 'border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-dim)] group-hover:border-[var(--line-soft)]'}`}>
                    {item.short || item.label.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-[var(--line-soft)] bg-[var(--panel-strong)] p-3 text-xs text-[var(--ink-dim)]">
            <p>Signed in as</p>
            <p className="mt-1 truncate font-semibold text-[var(--ink-900)]">{admin?.email || 'No active session'}</p>
          </div>
        </aside>

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/25 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
        )}

        <main className="relative z-10 flex flex-1 flex-col md:pl-0">
          <header className="sticky top-0 z-10 border-b border-[var(--line-soft)] bg-[var(--panel)]/90 px-4 py-3 backdrop-blur md:px-8">
            <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-white text-[var(--ink-800)] md:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <span className="text-lg">≡</span>
                </button>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--ink-dim)]">Operations</p>
                  <h1 className="text-lg font-semibold text-[var(--ink-900)]">{activeLabel}</h1>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink-800)] transition hover:border-[var(--ink-300)] hover:bg-[var(--panel-strong)] disabled:opacity-60"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
