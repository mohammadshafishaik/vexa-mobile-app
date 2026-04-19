export const AVAILABLE_SERVICE_CATEGORIES = [
  'plumbing',
  'electrical',
  'cleaning',
  'painting',
  'carpentry',
  'appliance repair',
  'ac service',
  'pest control',
  'other',
] as const;

export const normalizeServiceCategory = (value: string): string =>
  String(value || '').trim().toLowerCase();
