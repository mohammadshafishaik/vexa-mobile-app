'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface ActiveBiddingJob {
  id: string;
  orderId: string;
  title: string;
  status: string;
  customer: { name: string; email: string };
  stats: {
    bidCount: number;
    minBid: number | null;
    maxBid: number | null;
    spread: number | null;
  };
}

interface BidAnomaly {
  id: string;
  anomalyType: 'RAPID_REBID' | 'EXTREME_UNDERCUT' | 'COLLUSION_PATTERN' | 'OTHER';
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  severityScore: number;
  reason: string;
  job: { orderId: string; title: string };
  provider?: { name?: string | null; email?: string | null } | null;
  createdAt: string;
}

export default function BiddingPage() {
  const [scanning, setScanning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeJobs = useAdminResource<ActiveBiddingJob[]>({
    path: '/admin/bidding/active-jobs',
  });

  const anomalies = useAdminResource<BidAnomaly[]>({
    path: '/admin/bidding/anomalies',
  });

  const runScan = async () => {
    setScanning(true);
    try {
      await adminApi.post('/admin/bidding/anomalies/scan');
      await Promise.all([activeJobs.refresh(), anomalies.refresh()]);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Failed to run anomaly scan'));
    } finally {
      setScanning(false);
    }
  };

  const updateAnomalyStatus = async (id: string, status: 'REVIEWED' | 'RESOLVED') => {
    setUpdatingId(id);
    try {
      await adminApi.patch(`/admin/bidding/anomalies/${id}/status`, { status });
      await anomalies.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Failed to update anomaly status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const activeRows = useMemo(() => activeJobs.data || [], [activeJobs.data]);
  const anomalyRows = useMemo(() => anomalies.data || [], [anomalies.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Bidding Monitor"
        subtitle="Detect undercut spikes, collusion signatures, and suspicious bidding behavior."
        actions={(
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="rounded-xl border border-[rgba(25,48,8,0.15)] bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-[var(--ink-900)]"
          >
            {scanning ? 'Scanning...' : 'Run Anomaly Scan'}
          </button>
        )}
      />

      {activeJobs.loading ? <LoadingBlock label="Loading active bidding jobs..." /> : null}
      {activeJobs.error ? <ErrorBlock message={activeJobs.error} onRetry={activeJobs.refresh} /> : null}

      <Card title="Active bidding jobs">
        <DataTable
          columns={['Order', 'Customer', 'Bid count', 'Min bid', 'Max bid', 'Spread']}
          rows={activeRows.map((job) => (
            <tr key={job.id}>
              <td className="px-3 py-2">
                <p className="font-semibold text-[var(--ink-900)]">{job.title}</p>
                <p className="text-xs text-[var(--ink-dim)]">{job.orderId}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>{job.customer.name}</p>
                <p>{job.customer.email}</p>
              </td>
              <td className="px-3 py-2 text-sm">{job.stats.bidCount}</td>
              <td className="px-3 py-2 text-sm">₹{Math.round(job.stats.minBid || 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-sm">₹{Math.round(job.stats.maxBid || 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-sm">₹{Math.round(job.stats.spread || 0).toLocaleString()}</td>
            </tr>
          ))}
        />
      </Card>

      {anomalies.loading ? <LoadingBlock label="Loading anomalies..." /> : null}
      {anomalies.error ? <ErrorBlock message={anomalies.error} onRetry={anomalies.refresh} /> : null}

      <Card title="Anomaly queue">
        <DataTable
          columns={['Type', 'Job', 'Severity', 'Reason', 'Status', 'Action']}
          rows={anomalyRows.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2">
                <StatusChip text={item.anomalyType} tone="warn" />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.job.title}</p>
                <p>{item.job.orderId}</p>
              </td>
              <td className="px-3 py-2 text-sm font-semibold">{item.severityScore}</td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{item.reason}</td>
              <td className="px-3 py-2">
                <StatusChip
                  text={item.status}
                  tone={item.status === 'OPEN' ? 'danger' : item.status === 'REVIEWED' ? 'warn' : 'success'}
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={updatingId === item.id || item.status !== 'OPEN'}
                    onClick={() => updateAnomalyStatus(item.id, 'REVIEWED')}
                    className="rounded-lg border border-[#f2c86a] bg-[#fff7df] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a5b12]"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === item.id || item.status === 'RESOLVED'}
                    onClick={() => updateAnomalyStatus(item.id, 'RESOLVED')}
                    className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222]"
                  >
                    Resolve
                  </button>
                </div>
              </td>
            </tr>
          ))}
        />
      </Card>
    </div>
  );
}
