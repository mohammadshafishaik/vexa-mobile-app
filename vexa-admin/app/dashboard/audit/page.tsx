'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { useAdminResource } from '@/hooks/useAdminResource';

interface AuditRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  ipAddress?: string | null;
  createdAt: string;
  performedBy: {
    name: string;
    email: string;
    adminRole?: string | null;
  };
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const query = new URLSearchParams();
  query.set('limit', '100');
  if (entityType.trim()) query.set('entityType', entityType.trim());
  if (action.trim()) query.set('action', action.trim());

  const resource = useAdminResource<AuditRow[]>({
    path: `/admin/audit-logs?${query.toString()}`,
  });

  const logs = useMemo(() => resource.data || [], [resource.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Audit Trail"
        subtitle="Immutable history of every admin action across moderation, finance, and compliance."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              placeholder="Filter entity type"
              className="w-40 rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
            />
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Filter action"
              className="w-40 rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
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

      {resource.loading ? <LoadingBlock label="Loading audit logs..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Action ledger" subtitle="Use this timeline for incident reviews and policy accountability.">
        <DataTable
          columns={['Action', 'Entity', 'Actor', 'IP', 'Time']}
          rows={logs.map((log) => (
            <tr key={log.id} className="align-top">
              <td className="px-3 py-2">
                <StatusChip text={log.action} tone="info" />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{log.entityType}</p>
                <p>{log.entityId}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>{log.performedBy.name}</p>
                <p>{log.performedBy.adminRole || 'N/A'}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{log.ipAddress || '-'}</td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        />
      </Card>
    </div>
  );
}
