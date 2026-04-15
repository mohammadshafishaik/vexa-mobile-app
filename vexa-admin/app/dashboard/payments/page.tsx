'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  job: { orderId: string; title: string; status: string };
  payer: { name: string; email: string };
  payee: { name: string; email: string };
  createdAt: string;
}

interface IntegrityResult {
  totalCompletedPayments: number;
  totalPaidJobs: number;
  completedButJobNotPaid: Array<{ id: string; job: { orderId: string; title: string; status: string } }>;
  paidButNoCompletedPayment: Array<{ id: string; orderId: string; title: string; status: string }>;
}

function paymentTone(status: PaymentRow['status']): 'default' | 'warn' | 'danger' | 'success' | 'info' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'REFUNDED') return 'info';
  if (status === 'FAILED') return 'danger';
  if (status === 'PROCESSING') return 'warn';
  return 'default';
}

export default function PaymentsPage() {
  const [actingId, setActingId] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);
  const [runningScan, setRunningScan] = useState(false);

  const resource = useAdminResource<PaymentRow[]>({
    path: '/admin/payments?limit=100',
  });

  const rows = useMemo(() => resource.data || [], [resource.data]);

  const applyAction = async (paymentId: string, action: 'MARK_COMPLETED' | 'MARK_FAILED' | 'REFUND') => {
    setActingId(paymentId);
    try {
      const reason = window.prompt(`Reason for ${action}`, '') || undefined;
      await adminApi.post(`/admin/payments/${paymentId}/action`, {
        action,
        reason,
      });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Payment action failed'));
    } finally {
      setActingId(null);
    }
  };

  const runIntegrityScan = async () => {
    setRunningScan(true);
    try {
      const response = await adminApi.get<IntegrityResult>('/admin/payments/integrity/scan');
      setIntegrity(response.data);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Integrity scan failed'));
    } finally {
      setRunningScan(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Payment Control Desk"
        subtitle="Monitor settlement integrity, process refund decisions, and fix ledger drift."
        actions={(
          <button
            type="button"
            onClick={runIntegrityScan}
            disabled={runningScan}
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium"
          >
            {runningScan ? 'Scanning...' : 'Run Integrity Scan'}
          </button>
        )}
      />

      {resource.loading ? <LoadingBlock label="Loading payments..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      {integrity ? (
        <Card title="Integrity scan results">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--ink-dim)]">Completed payment mismatch</p>
              <p className="mt-1 text-2xl font-bold">{integrity.completedButJobNotPaid.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--line-soft)] bg-white p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--ink-dim)]">Paid job without completed payment</p>
              <p className="mt-1 text-2xl font-bold">{integrity.paidButNoCompletedPayment.length}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Payments ledger" subtitle="Operational actions are written to payment action logs.">
        <DataTable
          columns={['Job', 'Payer/Payee', 'Amount', 'Method', 'Status', 'Action']}
          rows={rows.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.job.title}</p>
                <p>{item.job.orderId}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Payer: {item.payer.name}</p>
                <p>Payee: {item.payee.name}</p>
              </td>
              <td className="px-3 py-2 text-sm font-semibold">₹{Math.round(item.amount).toLocaleString()}</td>
              <td className="px-3 py-2 text-sm">{item.paymentMethod}</td>
              <td className="px-3 py-2">
                <StatusChip text={item.status} tone={paymentTone(item.status)} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'COMPLETED'}
                    onClick={() => applyAction(item.id, 'MARK_COMPLETED')}
                    className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222]"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'FAILED'}
                    onClick={() => applyAction(item.id, 'MARK_FAILED')}
                    className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f]"
                  >
                    Fail
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.status === 'REFUNDED'}
                    onClick={() => applyAction(item.id, 'REFUND')}
                    className="rounded-lg border border-[#9ec5ea] bg-[#ecf6ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1f4e80]"
                  >
                    Refund
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
