'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  adminRole?: 'SUPER_ADMIN' | 'MODERATOR' | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  availabilityStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY';
  presenceStatus?: 'ONLINE' | 'OFFLINE';
  kycStatus: string;
  isVerified: boolean;
  createdAt: string;
  _count?: {
    serviceRequests?: number;
    selectedForJobs?: number;
    disputesRaised?: number;
  };
}

interface UsersPayload {
  data: UserRow[];
}

function toneFromStatus(status: UserRow['accountStatus']): 'success' | 'warn' | 'danger' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warn';
  if (status === 'BANNED' || status === 'DELETED') return 'danger';
  return 'default';
}

function toneFromPresence(status?: UserRow['presenceStatus']): 'success' | 'default' {
  return status === 'ONLINE' ? 'success' : 'default';
}

function toneFromAvailability(status?: UserRow['availabilityStatus']): 'success' | 'warn' | 'default' {
  if (status === 'ONLINE') return 'success';
  if (status === 'BUSY') return 'warn';
  return 'default';
}

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const usersResource = useAdminResource<UsersPayload>({
    path: `/admin/users?limit=100${query ? `&search=${encodeURIComponent(query)}` : ''}`,
    transform: (payload) => ({ data: payload as UserRow[] }),
  });

  const users = useMemo(() => usersResource.data?.data || [], [usersResource.data]);

  const changeStatus = async (
    userId: string,
    accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  ) => {
    setActingUserId(userId);

    try {
      const reason = accountStatus === 'ACTIVE'
        ? undefined
        : window.prompt('Reason for this moderation action?', '') || undefined;

      await adminApi.patch(`/admin/users/${userId}/status`, {
        accountStatus,
        reason,
      });
      await usersResource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Failed to update user status'));
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="User Operations"
        subtitle="Search users, inspect trust signals, and enforce moderation actions in real time."
        actions={(
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, phone"
              className="w-64 rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => usersResource.refresh()}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        )}
      />

      {usersResource.loading ? <LoadingBlock label="Loading users..." /> : null}
      {usersResource.error ? <ErrorBlock message={usersResource.error} onRetry={usersResource.refresh} /> : null}

      <Card title="User ledger" subtitle="Moderation status and activity summary.">
        <DataTable
          columns={['User', 'Role', 'Status', 'Presence', 'KYC', 'Activity', 'Actions']}
          rows={users.map((user) => (
            <tr key={user.id} className="align-top">
              <td className="px-3 py-2">
                <p className="font-semibold text-[var(--ink-900)]">{user.name}</p>
                <p className="text-xs text-[var(--ink-dim)]">{user.email}</p>
                {user.phone ? <p className="text-xs text-[var(--ink-dim)]">{user.phone}</p> : null}
              </td>
              <td className="px-3 py-2 text-xs">
                <StatusChip text={user.role} tone={user.role === 'ADMIN' ? 'info' : 'default'} />
                {user.adminRole ? <p className="mt-1 text-[var(--ink-dim)]">{user.adminRole}</p> : null}
              </td>
              <td className="px-3 py-2">
                <StatusChip text={user.accountStatus} tone={toneFromStatus(user.accountStatus)} />
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">Session</p>
                    <StatusChip text={user.presenceStatus || 'OFFLINE'} tone={toneFromPresence(user.presenceStatus)} />
                  </div>
                  {user.role === 'PROVIDER' ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">Availability</p>
                      <StatusChip
                        text={user.availabilityStatus || 'OFFLINE'}
                        tone={toneFromAvailability(user.availabilityStatus)}
                      />
                    </div>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={user.kycStatus || 'PENDING'} tone={user.kycStatus === 'VERIFIED' ? 'success' : 'warn'} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Jobs: {(user._count?.serviceRequests || 0) + (user._count?.selectedForJobs || 0)}</p>
                <p>Disputes: {user._count?.disputesRaised || 0}</p>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={actingUserId === user.id}
                    onClick={() => changeStatus(user.id, 'ACTIVE')}
                    className="rounded-lg border border-[#abdba8] bg-[#eefbec] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#216222]"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    disabled={actingUserId === user.id}
                    onClick={() => changeStatus(user.id, 'SUSPENDED')}
                    className="rounded-lg border border-[#f2c86a] bg-[#fff7df] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a5b12]"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    disabled={actingUserId === user.id}
                    onClick={() => changeStatus(user.id, 'BANNED')}
                    className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f]"
                  >
                    Ban
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
