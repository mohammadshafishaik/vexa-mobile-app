'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable, ErrorBlock, LoadingBlock, PageTitle, StatCard, StatGrid, StatusChip } from '@/components/admin/Blocks';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';
import { useAdminResource } from '@/hooks/useAdminResource';

interface RatingRow {
  id: string;
  score: number;
  review: string;
  createdAt: string;
  job: { orderId: string; title: string };
  rater: { name: string; email: string };
  ratee: { name: string; email: string };
}

interface RatingOverview {
  totalRatings: number;
  averageScore: number;
  scoreDistribution: Array<{ score: number; _count: { score: number } }>;
  lowScoreRecent: RatingRow[];
}

export default function RatingsPage() {
  const [actingId, setActingId] = useState<string | null>(null);

  const ratings = useAdminResource<RatingRow[]>({
    path: '/admin/ratings?limit=100',
  });

  const overview = useAdminResource<RatingOverview>({
    path: '/admin/ratings/overview',
  });

  const rows = useMemo(() => ratings.data || [], [ratings.data]);

  const moderate = async (id: string) => {
    setActingId(id);
    try {
      const review = window.prompt('Updated moderated review text', '[Removed by moderation]');
      if (!review) return;
      await adminApi.patch(`/admin/ratings/${id}`, { review });
      await Promise.all([ratings.refresh(), overview.refresh()]);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to moderate rating'));
    } finally {
      setActingId(null);
    }
  };

  const deleteRating = async (id: string) => {
    if (!window.confirm('Delete this rating permanently?')) return;

    setActingId(id);
    try {
      await adminApi.delete(`/admin/ratings/${id}`);
      await Promise.all([ratings.refresh(), overview.refresh()]);
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Unable to delete rating'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="Ratings Moderation"
        subtitle="Protect trust quality by handling abusive, fake, or policy-violating feedback."
      />

      {overview.loading ? <LoadingBlock label="Loading ratings insights..." /> : null}
      {overview.error ? <ErrorBlock message={overview.error} onRetry={overview.refresh} /> : null}

      {overview.data ? (
        <StatGrid>
          <StatCard label="Total ratings" value={overview.data.totalRatings} />
          <StatCard label="Average score" value={overview.data.averageScore.toFixed(2)} />
          <StatCard
            label="1-star count"
            value={overview.data.scoreDistribution.find((item) => item.score === 1)?._count.score || 0}
          />
          <StatCard
            label="2-star count"
            value={overview.data.scoreDistribution.find((item) => item.score === 2)?._count.score || 0}
          />
        </StatGrid>
      ) : null}

      {ratings.loading ? <LoadingBlock label="Loading ratings list..." /> : null}
      {ratings.error ? <ErrorBlock message={ratings.error} onRetry={ratings.refresh} /> : null}

      <Card title="Ratings feed" subtitle="Moderate review text or remove invalid ratings.">
        <DataTable
          columns={['Job', 'Rater / Ratee', 'Score', 'Review', 'Action']}
          rows={rows.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p className="font-semibold text-[var(--ink-900)]">{item.job.title}</p>
                <p>{item.job.orderId}</p>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">
                <p>Rater: {item.rater.name}</p>
                <p>Ratee: {item.ratee.name}</p>
              </td>
              <td className="px-3 py-2">
                <StatusChip text={`${item.score} / 5`} tone={item.score <= 2 ? 'danger' : item.score >= 4 ? 'success' : 'warn'} />
              </td>
              <td className="px-3 py-2 text-xs text-[var(--ink-700)]">{item.review}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => moderate(item.id)}
                    className="rounded-lg border border-[#9ec5ea] bg-[#ecf6ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1f4e80]"
                  >
                    Moderate
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => deleteRating(item.id)}
                    className="rounded-lg border border-[#efb2a8] bg-[#fff1ee] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8f2f1f]"
                  >
                    Delete
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
