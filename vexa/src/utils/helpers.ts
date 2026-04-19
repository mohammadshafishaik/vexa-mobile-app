import { JobStatus, ApprovalStatus, PaymentStatus, DisputeStatus } from '../types';
import { colors } from '../theme/colors';

/**
 * Format currency in INR
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format relative time (e.g., "2 min ago", "1 hour ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * Get display label for job status
 */
export const getJobStatusLabel = (status: JobStatus): string => {
  const labels: Record<JobStatus, string> = {
    [JobStatus.POSTED]: 'Posted',
    [JobStatus.BIDDING]: 'Bidding',
    [JobStatus.ACCEPTED]: 'Accepted',
    [JobStatus.ON_SITE_INSPECTION]: 'Inspection',
    [JobStatus.MODIFICATION_REQUESTED]: 'Modification',
    [JobStatus.IN_PROGRESS]: 'In Progress',
    [JobStatus.COMPLETED]: 'Completed',
    [JobStatus.PAYMENT_PENDING]: 'Payment Due',
    [JobStatus.PAID]: 'Paid',
    [JobStatus.UNDER_DISPUTE]: 'Disputed',
    [JobStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status];
};

/**
 * Get color for job status badge
 */
export const getJobStatusColor = (status: JobStatus): string => {
  switch (status) {
    case JobStatus.POSTED:
    case JobStatus.BIDDING:
      return colors.info;
    case JobStatus.ACCEPTED:
    case JobStatus.ON_SITE_INSPECTION:
    case JobStatus.IN_PROGRESS:
      return colors.warning;
    case JobStatus.COMPLETED:
    case JobStatus.PAID:
      return colors.success;
    case JobStatus.MODIFICATION_REQUESTED:
    case JobStatus.PAYMENT_PENDING:
      return colors.warning;
    case JobStatus.UNDER_DISPUTE:
    case JobStatus.CANCELLED:
      return colors.error;
    default:
      return colors.gray500;
  }
};

/**
 * Get color for approval status badge
 */
export const getApprovalStatusColor = (status: ApprovalStatus): string => {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return colors.success;
    case ApprovalStatus.REJECTED:
      return colors.error;
    case ApprovalStatus.PENDING:
      return colors.warning;
    default:
      return colors.gray500;
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
};

/**
 * Remove legacy AI summary artifacts from stored descriptions.
 */
export const sanitizeJobDescription = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const markerMatch = raw.match(/ai\s*summary\s*:/i);
  const withoutSummary = markerMatch?.index != null
    ? raw.slice(0, markerMatch.index)
    : raw;

  return withoutSummary.replace(/\s+/g, ' ').trim();
};

/**
 * Validate price increase is within allowed limit
 */
export const isPriceIncreaseValid = (
  originalPrice: number,
  revisedPrice: number,
  maxIncreasePercent: number,
): boolean => {
  const maxAllowed = originalPrice * (1 + maxIncreasePercent / 100);
  return revisedPrice <= maxAllowed;
};

/**
 * Generate initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
