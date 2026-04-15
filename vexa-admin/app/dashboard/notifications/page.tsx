'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatCard, StatGrid, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface Campaign {
  id: string;
  title: string;
  body: string;
  targetType: string;
  totalSent: number;
  totalFailed: number;
  sentAt: string;
  sentBy: { name: string; email: string; adminRole: string };
}

interface NotificationStats {
  total: number;
  unread: number;
  last24h: number;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'CUSTOMERS' | 'PROVIDERS' | 'ADMINS'>('ALL');
  const [sending, setSending] = useState(false);

  const campaigns = useAdminResource<Campaign[]>({
    path: '/admin/notifications/campaigns?limit=100',
  });

  const stats = useAdminResource<NotificationStats>({
    path: '/admin/notifications/stats',
  });

  const campaignRows = useMemo(() => campaigns.data || [], [campaigns.data]);

  const sendCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);

    try {
      await adminApi.post('/admin/notifications/campaigns', {
        title,
        body,
        targetType,
      });

      setTitle('');
      setBody('');
      await Promise.all([campaigns.refresh(), stats.refresh()]);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Failed to send notification campaign'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Notification Campaigns"
        subtitle="Broadcast product updates, risk alerts, and service advisories to targeted segments."
      />

      {stats.loading ? <LoadingBlock label="Loading notification stats..." /> : null}
      {stats.error ? <ErrorBlock message={stats.error} onRetry={stats.refresh} /> : null}

      {stats.data ? (
        <StatGrid>
          <StatCard label="Total notifications" value={stats.data.total} />
          <StatCard label="Unread notifications" value={stats.data.unread} />
          <StatCard label="Sent in last 24h" value={stats.data.last24h} />
          <StatCard label="Campaigns" value={campaignRows.length} />
        </StatGrid>
      ) : null}

      <Card title="Create campaign" subtitle="Sends in-app notifications and optional push blast.">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={sendCampaign}>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-dim)]">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2"
              placeholder="Service advisory"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-dim)]">Target segment</span>
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as typeof targetType)}
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2"
            >
              <option value="ALL">All users</option>
              <option value="CUSTOMERS">Customers</option>
              <option value="PROVIDERS">Providers</option>
              <option value="ADMINS">Admins</option>
            </select>
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-dim)]">Body</span>
            <textarea
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2"
              placeholder="We are performing scheduled maintenance at 2 AM IST."
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl border border-[rgba(25,48,8,0.15)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--ink-900)]"
            >
              {sending ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>
        </form>
      </Card>

      {campaigns.loading ? <LoadingBlock label="Loading campaign history..." /> : null}
      {campaigns.error ? <ErrorBlock message={campaigns.error} onRetry={campaigns.refresh} /> : null}

      <Card title="Campaign history">
        <DataTable
          columns={['Title', 'Target', 'Delivery', 'Sent by', 'Time']}
          rows={campaignRows.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.title}</p>
                <p>{item.body}</p>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={item.targetType} tone="info" />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Sent: {item.totalSent}</p>
                <p>Failed: {item.totalFailed}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>{item.sentBy.name}</p>
                <p>{item.sentBy.adminRole}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{new Date(item.sentAt).toLocaleString()}</td>
            </tr>
          ))}
        />
      </Card>
    </div>
  );
}
