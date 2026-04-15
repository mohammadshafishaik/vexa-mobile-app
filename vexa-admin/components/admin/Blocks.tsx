import React from 'react';

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:mb-7 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">VEXA Admin</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ink-900)] md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-[var(--ink-700)]">{subtitle}</p>}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4 shadow-[0_8px_20px_rgba(18,34,52,0.05)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-dim)]">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none text-[var(--ink-900)]">{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--ink-700)]">{hint}</p> : null}
    </article>
  );
}

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-4 shadow-[0_8px_20px_rgba(18,34,52,0.05)] md:p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--ink-900)]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[var(--ink-700)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--line-soft)] text-sm">
          <thead className="bg-[var(--panel-strong)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-dim)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusChip({
  text,
  tone,
}: {
  text: string;
  tone?: 'default' | 'warn' | 'danger' | 'success' | 'info';
}) {
  const toneMap: Record<NonNullable<typeof tone>, string> = {
    default: 'border-[var(--line-soft)] bg-[var(--panel-strong)] text-[var(--ink-700)]',
    warn: 'border-[#f2c86a] bg-[#fff7df] text-[#7a5b12]',
    danger: 'border-[#efb2a8] bg-[#fff1ee] text-[#8f2f1f]',
    success: 'border-[#abdba8] bg-[#eefbec] text-[#216222]',
    info: 'border-[#9ec5ea] bg-[#ecf6ff] text-[#1f4e80]',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${toneMap[tone || 'default']}`}>
      {text}
    </span>
  );
}

export function LoadingBlock({ label = 'Loading data...' }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--panel)] p-6 text-sm text-[var(--ink-dim)]">
      {label}
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#efb2a8] bg-[#fff2ee] p-4 text-sm text-[#8f2f1f]">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-[#e99683] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
