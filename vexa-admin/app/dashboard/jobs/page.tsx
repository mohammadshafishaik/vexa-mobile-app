'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface JobRow {
  id: string;
  orderId: string;
  title: string;
  category: string;
  status: string;
  originalPrice: number;
  revisedPrice?: number | null;
  cancellationReason?: string | null;
  cancellationFee?: number | null;
  customerPresenceStatus?: 'ONLINE' | 'OFFLINE';
  providerPresenceStatus?: 'ONLINE' | 'OFFLINE';
  customer?: {
    name: string;
    email: string;
    accountStatus?: string;
    availabilityStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY';
    presenceStatus?: 'ONLINE' | 'OFFLINE';
  } | null;
  selectedProvider?: {
    name: string;
    email: string;
    accountStatus?: string;
    availabilityStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY';
    presenceStatus?: 'ONLINE' | 'OFFLINE';
  } | null;
  latestCancellation?: {
    id: string;
    initiator: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
    reason: string;
    cancellationFee: number;
    feePaid: boolean;
    createdAt: string;
    cancelledBy?: {
      name: string;
      email: string;
    } | null;
  } | null;
  _count?: {
    bids?: number;
    modifications?: number;
    payments?: number;
    disputes?: number;
    cancellations?: number;
  };
  createdAt: string;
}

interface JobsPayload {
  data: JobRow[];
}

function toneFromPresence(status?: 'ONLINE' | 'OFFLINE'): 'success' | 'default' {
  return status === 'ONLINE' ? 'success' : 'default';
}

function toneFromAvailability(status?: 'ONLINE' | 'OFFLINE' | 'BUSY'): 'success' | 'warn' | 'default' {
  if (status === 'ONLINE') return 'success';
  if (status === 'BUSY') return 'warn';
  return 'default';
}

function toneFromJobStatus(status: string): 'danger' | 'warn' | 'default' {
  if (status === 'CANCELLED' || status === 'UNDER_DISPUTE') return 'danger';
  if (status === 'PAYMENT_PENDING') return 'warn';
  return 'default';
}

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const resource = useAdminResource<JobsPayload>({
    path: `/admin/jobs?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    transform: (payload) => ({ data: payload as JobRow[] }),
  });

  const jobs = useMemo(() => resource.data?.data || [], [resource.data]);

  const flagJob = async (jobId: string) => {
    setActingId(jobId);
    try {
      const reason = window.prompt('Reason for flagging this job', '') || 'Flagged by admin review';
      await adminApi.patch(`/admin/jobs/${jobId}/flag`, { reason });
      window.alert('Job flagged and logged to audit trail.');
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to flag job'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Job Operations"
        subtitle="Inspect lifecycle health of service requests and intervene on risky job flows."
        actions={(
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order ID, title"
              className="w-64 rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => resource.refresh()}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        )}
      />

      {resource.loading ? <LoadingBlock label="Loading jobs..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Job ledger" subtitle="Operational signals per request.">
        <DataTable
          columns={['Order', 'Participants', 'Live Status', 'Status', 'Price', 'Activity', 'Action']}
          rows={jobs.map((job) => (
            <tr key={job.id} className="align-top">
              <td className="px-3 py-2">
                <p className="font-semibold text-[var(--ink-900)]">{job.title}</p>
                <p className="text-xs text-[var(--ink-dim)]">{job.orderId}</p>
                <p className="text-xs text-[var(--ink-dim)]">{job.category}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Customer: {job.customer?.name || 'Unknown'}</p>
                <p className="text-[var(--ink-dim)]">{job.customer?.accountStatus || 'UNKNOWN'}</p>
                <p>Provider: {job.selectedProvider?.name || 'Unassigned'}</p>
                {job.selectedProvider ? (
                  <p className="text-[var(--ink-dim)]">{job.selectedProvider.accountStatus || 'UNKNOWN'}</p>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">Customer</p>
                    <StatusChip
                      text={job.customerPresenceStatus || job.customer?.presenceStatus || 'OFFLINE'}
                      tone={toneFromPresence(job.customerPresenceStatus || job.customer?.presenceStatus)}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">Provider</p>
                    <StatusChip
                      text={job.selectedProvider?.availabilityStatus || 'OFFLINE'}
                      tone={toneFromAvailability(job.selectedProvider?.availabilityStatus)}
                    />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={job.status} tone={toneFromJobStatus(job.status)} />
                {job.latestCancellation || job.cancellationReason ? (
                  <div className="mt-1 text-[11px] text-[var(--ink-dim)]">
                    <p>
                      Cancelled by {job.latestCancellation?.initiator || 'UNKNOWN'}
                    </p>
                    <p>{job.latestCancellation?.reason || job.cancellationReason}</p>
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Base: ₹{Math.round(job.originalPrice).toLocaleString()}</p>
                <p>Revised: ₹{Math.round(job.revisedPrice || job.originalPrice).toLocaleString()}</p>
                {job.latestCancellation ? (
                  <p>Cancel fee: ₹{Math.round(job.latestCancellation.cancellationFee || 0).toLocaleString()}</p>
                ) : null}
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Bids: {job._count?.bids || 0}</p>
                <p>Mods: {job._count?.modifications || 0}</p>
                <p>Disputes: {job._count?.disputes || 0}</p>
                <p>Cancellations: {job._count?.cancellations || 0}</p>
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  disabled={actingId === job.id}
                  onClick={() => flagJob(job.id)}
                  className="rounded-lg border border-[#9ec5ea] bg-[#ecf6ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1f4e80]"
                >
                  Flag
                </button>
              </td>
            </tr>
          ))}
        />
      </Card>
    </div>
  );
}
