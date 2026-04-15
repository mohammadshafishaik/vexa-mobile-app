'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface KycRow {
  id: string;
  documentType: 'AADHAAR' | 'PAN' | 'OTHER';
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    kycStatus: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    adminRole: string;
  } | null;
  createdAt: string;
}

interface KycPayload {
  data: KycRow[];
}

function chipTone(status: KycRow['status']): 'warn' | 'success' | 'danger' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warn';
}

export default function KycPage() {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const resource = useAdminResource<KycPayload>({
    path: `/admin/kyc?limit=100${filter === 'ALL' ? '' : `&status=${filter}`}`,
    transform: (payload) => ({ data: payload as KycRow[] }),
  });

  const docs = useMemo(() => resource.data?.data || [], [resource.data]);

  const decide = async (docId: string, action: 'approve' | 'reject') => {
    setProcessingId(docId);
    try {
      const remarks = window.prompt('Add remarks for this KYC decision (optional)', '') || undefined;
      await adminApi.patch(`/admin/kyc/${docId}/${action}`, { remarks });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'KYC action failed'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="KYC Verification Queue"
        subtitle="Review uploaded identity documents and maintain trusted provider/customer onboarding."
        actions={(
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
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

      {resource.loading ? <LoadingBlock label="Loading KYC queue..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Document queue" subtitle="Approve or reject after visual verification.">
        <DataTable
          columns={['Applicant', 'Document', 'Submitted', 'Status', 'Review', 'Action']}
          rows={docs.map((doc) => (
            <tr key={doc.id} className="align-top">
              <td className="px-3 py-2">
                <p className="font-semibold text-[var(--ink-900)]">{doc.user.name}</p>
                <p className="text-xs text-[var(--ink-dim)]">{doc.user.email}</p>
                <p className="text-xs text-[var(--ink-dim)]">{doc.user.role}</p>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={doc.documentType} tone="info" />
                <div className="mt-1">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--ink-700)] underline"
                  >
                    View document
                  </a>
                </div>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{new Date(doc.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2">
                <StatusChip text={doc.status} tone={chipTone(doc.status)} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                {doc.reviewedBy ? `${doc.reviewedBy.name} (${doc.reviewedBy.adminRole})` : 'Not reviewed'}
                {doc.remarks ? <p className="mt-1">{doc.remarks}</p> : null}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={processingId === doc.id || doc.status === 'APPROVED'}
                    onClick={() => decide(doc.id, 'approve')}
                    className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={processingId === doc.id || doc.status === 'REJECTED'}
                    onClick={() => decide(doc.id, 'reject')}
                    className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f] disabled:opacity-60"
                  >
                    Reject
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
