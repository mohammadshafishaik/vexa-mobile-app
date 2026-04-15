'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface DisputeRow {
  id: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
  job: {
    orderId: string;
    title: string;
    customerId: string;
    selectedProviderId?: string | null;
  };
  raisedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

function tone(status: DisputeRow['status']): 'danger' | 'warn' | 'success' | 'info' {
  if (status === 'OPEN') return 'danger';
  if (status === 'UNDER_REVIEW') return 'warn';
  if (status === 'RESOLVED') return 'success';
  return 'info';
}

export default function DisputesPage() {
  const [actingId, setActingId] = useState<string | null>(null);

  const resource = useAdminResource<DisputeRow[]>({
    path: '/admin/disputes?limit=100',
  });

  const disputes = useMemo(() => resource.data || [], [resource.data]);

  const updateStatus = async (id: string, status: 'UNDER_REVIEW' | 'ESCALATED') => {
    setActingId(id);
    try {
      const remarks = window.prompt('Status update remarks (optional)', '') || undefined;
      await adminApi.patch(`/admin/disputes/${id}/status`, { status, remarks });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to update dispute status'));
    } finally {
      setActingId(null);
    }
  };

  const resolveDispute = async (id: string, decision: 'REFUND' | 'PARTIAL_SETTLEMENT' | 'REJECT') => {
    setActingId(id);
    try {
      const remarks = window.prompt('Decision remarks', '') || undefined;
      const refundAmount = decision === 'PARTIAL_SETTLEMENT'
        ? Number(window.prompt('Partial refund amount', '0') || 0)
        : undefined;

      await adminApi.post(`/admin/disputes/${id}/decision`, {
        decision,
        remarks,
        refundAmount,
      });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to resolve dispute'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Dispute Resolution"
        subtitle="Escalate, review, and resolve disputes with accountable decision trails."
      />

      {resource.loading ? <LoadingBlock label="Loading disputes..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Dispute queue" subtitle="Use decision actions to finalize financial outcomes.">
        <DataTable
          columns={['Job', 'Raised by', 'Reason', 'Status', 'Actions']}
          rows={disputes.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.job.title}</p>
                <p>{item.job.orderId}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>{item.raisedBy.name}</p>
                <p>{item.raisedBy.email}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{item.reason}</td>
              <td className="px-3 py-2">
                <StatusChip text={item.status} tone={tone(item.status)} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'UNDER_REVIEW'}
                    onClick={() => updateStatus(item.id, 'UNDER_REVIEW')}
                    className="rounded-lg border border-[#f2c86a] bg-[#fff7df] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a5b12]"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'ESCALATED'}
                    onClick={() => updateStatus(item.id, 'ESCALATED')}
                    className="rounded-lg border border-[#9ec5ea] bg-[#ecf6ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1f4e80]"
                  >
                    Escalate
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'RESOLVED'}
                    onClick={() => resolveDispute(item.id, 'REJECT')}
                    className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222]"
                  >
                    Reject claim
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'RESOLVED'}
                    onClick={() => resolveDispute(item.id, 'REFUND')}
                    className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f]"
                  >
                    Full refund
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
