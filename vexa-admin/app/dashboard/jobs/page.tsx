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
  customer?: { name: string; email: string } | null;
  selectedProvider?: { name: string; email: string } | null;
  _count?: {
    bids?: number;
    modifications?: number;
    payments?: number;
    disputes?: number;
  };
  createdAt: string;
}

interface JobsPayload {
  data: JobRow[];
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
          columns={['Order', 'Participants', 'Status', 'Price', 'Activity', 'Action']}
          rows={jobs.map((job) => (
            <tr key={job.id} className="align-top">
              <td className="px-3 py-2">
                <p className="font-semibold text-[var(--ink-900)]">{job.title}</p>
                <p className="text-xs text-[var(--ink-dim)]">{job.orderId}</p>
                <p className="text-xs text-[var(--ink-dim)]">{job.category}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Customer: {job.customer?.name || 'Unknown'}</p>
                <p>Provider: {job.selectedProvider?.name || 'Unassigned'}</p>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={job.status} tone={job.status === 'UNDER_DISPUTE' ? 'danger' : 'default'} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Base: ₹{Math.round(job.originalPrice).toLocaleString()}</p>
                <p>Revised: ₹{Math.round(job.revisedPrice || job.originalPrice).toLocaleString()}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Bids: {job._count?.bids || 0}</p>
                <p>Mods: {job._count?.modifications || 0}</p>
                <p>Disputes: {job._count?.disputes || 0}</p>
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
