'use client';

import Link from 'next/link';
import { Card, ErrorBlock, LoadingBlock, PageTitle, StatCard, StatGrid } from '@/components/admin/Blocks';
import { useAdminResource } from '@/hooks/useAdminResource';
import { DashboardOverview } from '@/types/admin';

interface TrendPoint {
  date: string;
  newUsers: number;
  newJobs: number;
  newDisputes: number;
  paymentsCompleted: number;
  paymentsRefunded: number;
  revenue: number;
  refunded: number;
}

const quickActions = [
  { href: '/dashboard/kyc', label: 'Review pending KYC' },
  { href: '/dashboard/disputes', label: 'Resolve disputes queue' },
  { href: '/dashboard/bidding', label: 'Check bidding anomalies' },
  { href: '/dashboard/payments', label: 'Run payment integrity checks' },
  { href: '/dashboard/recommendations', label: 'Tune AI recommendation engine' },
];

export default function DashboardPage() {
  const overview = useAdminResource<DashboardOverview>({
    path: '/admin/analytics/overview',
  });

  const trends = useAdminResource<TrendPoint[]>({
    path: '/admin/analytics/trends?days=14',
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Operations Overview"
        subtitle="Live pulse of users, jobs, compliance, disputes, payments, and advanced marketplace features."
      />

      {overview.loading ? <LoadingBlock label="Loading overview metrics..." /> : null}
      {overview.error ? <ErrorBlock message={overview.error} onRetry={overview.refresh} /> : null}

      {overview.data ? (
        <>
          <StatGrid>
            <StatCard label="Total users" value={overview.data.users.total} hint={`${overview.data.users.providers} providers`} />
            <StatCard label="Providers online" value={overview.data.advanced.onlineProviders} hint="Real-time availability signal" />
            <StatCard label="Active jobs" value={overview.data.jobs.active} hint={`${overview.data.jobs.total} total jobs`} />
            <StatCard label="Open disputes" value={overview.data.disputes.open} hint={`${overview.data.disputes.total} total disputes`} />
            <StatCard
              label="Net revenue"
              value={`₹${Math.round(overview.data.payments.netRevenue).toLocaleString()}`}
              hint={`Gross ₹${Math.round(overview.data.payments.grossRevenue).toLocaleString()}`}
            />
          </StatGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Compliance & Risk">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Pending KYC</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.kyc.pendingDocuments}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Open anomalies</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.bidding.openAnomalies}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Suspended users</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.users.suspended}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Banned users</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.users.banned}</p>
                </div>
              </div>
            </Card>

            <Card title="Advanced Features" subtitle="Coverage of chat, skills, portfolio, and cancellation flows.">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Chat messages</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.advanced.totalChatMessages}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Provider skills</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.advanced.totalProviderSkills}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Portfolio items</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.advanced.totalPortfolioItems}</p>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">Cancellations</p>
                  <p className="mt-1 text-2xl font-bold">{overview.data.advanced.totalCancellations}</p>
                </div>
              </div>
            </Card>

            <Card title="Quick Actions">
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm transition hover:border-[var(--ink-300)]"
                  >
                    <span>{action.label}</span>
                    <span aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <Card title="14-day trendline" subtitle="New users, jobs, disputes, and payment movement.">
        {trends.loading ? <LoadingBlock label="Loading trend data..." /> : null}
        {trends.error ? <ErrorBlock message={trends.error} onRetry={trends.refresh} /> : null}

        {trends.data ? (
          <div className="space-y-2">
            {trends.data.slice(-10).map((point) => (
              <div
                key={point.date}
                className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-xs md:grid-cols-6"
              >
                <span className="font-semibold text-[var(--ink-900)]">{point.date}</span>
                <span>Users: {point.newUsers}</span>
                <span>Jobs: {point.newJobs}</span>
                <span>Disputes: {point.newDisputes}</span>
                <span>Paid: {point.paymentsCompleted}</span>
                <span>Revenue: ₹{Math.round(point.revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
