'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, ErrorBlock, LoadingBlock, PageTitle } from '@/components/admin/Blocks';
import { useAdminResource } from '@/hooks/useAdminResource';
import { adminApi } from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/error-message';

type NumericField =
  | 'bidUndercutPercent'
  | 'bidMinimumUndercut'
  | 'minProposalLength'
  | 'minJobDescriptionLength'
  | 'chatSuggestionCount';

interface AiRecommendationConfig {
  bidUndercutPercent: number;
  bidMinimumUndercut: number;
  minProposalLength: number;
  minJobDescriptionLength: number;
  chatSuggestionCount: number;
  requireSafetyNote: boolean;
  includeExperienceLineInBid: boolean;
}

interface RecommendationConfigPayload {
  config: AiRecommendationConfig;
  updatedAt: string | null;
}

const numericFieldConfig: Array<{
  key: NumericField;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: 'bidUndercutPercent',
    label: 'Bid undercut %',
    help: 'Lower than current lowest bid by this percentage when generating suggestion.',
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: 'bidMinimumUndercut',
    label: 'Minimum undercut (₹)',
    help: 'Absolute minimum reduction for AI bid suggestion.',
    min: 10,
    max: 500,
    step: 5,
  },
  {
    key: 'minProposalLength',
    label: 'Minimum proposal length',
    help: 'Below this, AI marks bid message quality as weak.',
    min: 10,
    max: 300,
    step: 1,
  },
  {
    key: 'minJobDescriptionLength',
    label: 'Minimum job description length',
    help: 'Below this, AI warns customer that description is too short.',
    min: 20,
    max: 500,
    step: 1,
  },
  {
    key: 'chatSuggestionCount',
    label: 'Chat quick replies count',
    help: 'How many quick replies AI returns to users.',
    min: 1,
    max: 5,
    step: 1,
  },
];

export default function RecommendationsPage() {
  const [draft, setDraft] = useState<AiRecommendationConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const resource = useAdminResource<RecommendationConfigPayload>({
    path: '/admin/recommendations/config',
  });

  useEffect(() => {
    if (resource.data?.config) {
      setDraft(resource.data.config);
    }
  }, [resource.data]);

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !resource.data?.config) return false;
    return JSON.stringify(draft) !== JSON.stringify(resource.data.config);
  }, [draft, resource.data]);

  const setNumericField = (field: NumericField, rawValue: string) => {
    const parsed = Number(rawValue);
    setDraft((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [field]: Number.isFinite(parsed) ? parsed : 0,
      };
    });
  };

  const setBooleanField = (
    field: 'requireSafetyNote' | 'includeExperienceLineInBid',
    value: boolean,
  ) => {
    setDraft((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const resetDraft = () => {
    if (resource.data?.config) {
      setDraft(resource.data.config);
    }
  };

  const saveConfig = async () => {
    if (!draft) return;

    setSaving(true);
    try {
      const response = await adminApi.patch<RecommendationConfigPayload>('/admin/recommendations/config', {
        config: draft,
      });

      setDraft(response.data.config);
      await resource.refresh();
      window.alert('AI recommendation configuration updated.');
    } catch (error: unknown) {
      window.alert(getErrorMessage(error, 'Failed to update AI recommendation configuration'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageTitle
        title="AI Recommendation Control"
        subtitle="Configure bid, chat, and job-text recommendation policy from admin without redeploying backend code."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDraft}
              disabled={!hasUnsavedChanges || saving}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={saveConfig}
              disabled={!hasUnsavedChanges || saving || !draft}
              className="rounded-xl border border-[#9ec5ea] bg-[#ecf6ff] px-3 py-2 text-sm font-semibold text-[#1f4e80] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        )}
      />

      {resource.loading ? <LoadingBlock label="Loading AI recommendation configuration..." /> : null}
      {resource.error ? <ErrorBlock message={resource.error} onRetry={resource.refresh} /> : null}

      {draft ? (
        <Card
          title="Recommendation policy"
          subtitle={
            resource.data?.updatedAt
              ? `Last updated at ${new Date(resource.data.updatedAt).toLocaleString()}`
              : 'Using default configuration (no admin override saved yet).'
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {numericFieldConfig.map((field) => (
              <label key={field.key} className="space-y-1 rounded-xl border border-[var(--line-soft)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--ink-900)]">{field.label}</p>
                <p className="text-xs text-[var(--ink-dim)]">{field.help}</p>
                <input
                  type="number"
                  value={draft[field.key]}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(event) => setNumericField(field.key, event.target.value)}
                  className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[var(--ink-900)]">Show safety note in chat AI</p>
                <p className="text-xs text-[var(--ink-dim)]">Adds anti-fraud reminder for OTP and UPI secrets.</p>
              </div>
              <input
                type="checkbox"
                checked={draft.requireSafetyNote}
                onChange={(event) => setBooleanField('requireSafetyNote', event.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[var(--ink-900)]">Include experience line in bid AI</p>
                <p className="text-xs text-[var(--ink-dim)]">Adds provider experience sentence to generated proposal draft.</p>
              </div>
              <input
                type="checkbox"
                checked={draft.includeExperienceLineInBid}
                onChange={(event) => setBooleanField('includeExperienceLineInBid', event.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
