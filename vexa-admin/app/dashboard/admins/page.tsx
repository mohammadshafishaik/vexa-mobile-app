'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  adminRole: 'SUPER_ADMIN' | 'MODERATOR';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  createdAt: string;
}

export default function AdminsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState<'SUPER_ADMIN' | 'MODERATOR'>('MODERATOR');
  const [creating, setCreating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const resource = useAdminResource<AdminUser[]>({
    path: '/admin/admins',
  });

  const admins = useMemo(() => resource.data || [], [resource.data]);

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      await adminApi.post('/admin/admins', {
        name,
        email,
        password,
        adminRole,
      });

      setName('');
      setEmail('');
      setPassword('');
      setAdminRole('MODERATOR');
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to create admin'));
    } finally {
      setCreating(false);
    }
  };

  const switchRole = async (id: string, nextRole: 'SUPER_ADMIN' | 'MODERATOR') => {
    setActingId(id);
    try {
      await adminApi.patch(`/admin/admins/${id}/role`, { adminRole: nextRole });
      await resource.refresh();
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to update admin role'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Admin Management"
        subtitle="Create admin accounts and assign role levels with controlled authority."
      />

      <Card title="Create admin" subtitle="Only super admins can perform this action.">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={createAdmin}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Temporary password"
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
          />
          <select
            value={adminRole}
            onChange={(event) => setAdminRole(event.target.value as typeof adminRole)}
            className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm"
          >
            <option value="MODERATOR">Moderator</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl border border-[rgba(25,48,8,0.15)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--ink-900)]"
            >
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Card>

      {resource.loading ? <LoadingBlock label="Loading admins..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      <Card title="Admin roster">
        <DataTable
          columns={['Admin', 'Role', 'Status', 'Created', 'Action']}
          rows={admins.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.name}</p>
                <p>{item.email}</p>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={item.adminRole} tone={item.adminRole === 'SUPER_ADMIN' ? 'info' : 'default'} />
              </td>
              <td className="px-3 py-2">
                <StatusChip text={item.accountStatus} tone={item.accountStatus === 'ACTIVE' ? 'success' : 'warn'} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{new Date(item.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={actingId === item.id || item.adminRole === 'MODERATOR'}
                    onClick={() => switchRole(item.id, 'MODERATOR')}
                    className="rounded-lg border border-[var(--line-soft)] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  >
                    Set moderator
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id || item.adminRole === 'SUPER_ADMIN'}
                    onClick={() => switchRole(item.id, 'SUPER_ADMIN')}
                    className="rounded-lg border border-[#9ec5ea] bg-[#ecf6ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1f4e80]"
                  >
                    Set super
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
