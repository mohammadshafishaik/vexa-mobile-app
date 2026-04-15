'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface Modification {
  id: string;
  revisionReason: string;
  originalPrice: number;
  revisedPrice: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  analytics: {
    priceJumpRatio: number;
    riskFlags: string[];
  };
  job: {
    orderId: string;
    title: string;
    status: string;
    customer?: { name: string };
  };
  provider: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function ModificationsPage() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const resource = useAdminResource<Modification[]>({
    path: '/admin/modifications?limit=100',
  });

  const rows = useMemo(() => resource.data || [], [resource.data]);

  const decide = async (id: string, approvalStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      const customerResponse = window.prompt('Decision note (optional)', '') || undefined;
      await adminApi.patch(`/admin/modifications/${id}/decision`, {
        approvalStatus,
        customerResponse,
      });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to update modification status'));
    } finally {
      setProcessingId(null);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const response = await adminApi.post<{ scannedJobs: number; flags: Array<{ jobId: string; reason: string; severity: string }> }>('/admin/modifications/scan');
      const highFlags = (response.data.flags || []).filter((item) => item.severity === 'HIGH').length;
      window.alert(`Scanned ${response.data.scannedJobs} jobs. ${response.data.flags.length} flags found (${highFlags} high severity).`);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Scan failed'));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Modification Risk Desk"
        subtitle="Review revision requests for pricing abuse, evidence gaps, and abnormal frequency."
        actions={(
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium"
          >
            {scanning ? 'Scanning...' : 'Run Risk Scan'}
          </button>
        )}
      />

      {resource.loading ? <LoadingBlock label="Loading modification queue..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Modification queue" subtitle="Approve or reject high-risk modification requests.">
        <DataTable
          columns={['Job', 'Provider', 'Price delta', 'Risk', 'Status', 'Action']}
          rows={rows.map((item) => {
            const priceDelta = item.revisedPrice - item.originalPrice;
            const ratio = Math.round(item.analytics.priceJumpRatio * 100);
            return (
              <tr key={item.id} className="align-top">
                <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                  <p className="font-semibold text-[var(--ink-900)]">{item.job.title}</p>
                  <p>{item.job.orderId}</p>
                  <p>{item.revisionReason}</p>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                  <p>{item.provider.name}</p>
                  <p>{item.provider.email}</p>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                  <p>+₹{Math.round(priceDelta).toLocaleString()}</p>
                  <p>{ratio}% increase</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {item.analytics.riskFlags.length === 0 ? (
                    <StatusChip text="NO_FLAGS" tone="success" />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {item.analytics.riskFlags.slice(0, 2).map((flag) => (
                        <StatusChip key={flag} text={flag} tone="warn" />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusChip
                    text={item.approvalStatus}
                    tone={item.approvalStatus === 'APPROVED' ? 'success' : item.approvalStatus === 'REJECTED' ? 'danger' : 'warn'}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={processingId === item.id || item.approvalStatus === 'APPROVED'}
                      onClick={() => decide(item.id, 'APPROVED')}
                      className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={processingId === item.id || item.approvalStatus === 'REJECTED'}
                      onClick={() => decide(item.id, 'REJECTED')}
                      className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f]"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        />
      </Card>
    </div>
  );
}
