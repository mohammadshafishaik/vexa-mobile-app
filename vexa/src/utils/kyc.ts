export type KycDisplayStatus = 'NOT_SUBMITTED' | 'PENDING' | 'REJECTED' | 'VERIFIED';

export const normalizeKycStatus = (status?: string | null): string =>
  String(status || '').trim().toUpperCase();

export const isKycVerifiedStatus = (status?: string | null): boolean => {
  const norm = normalizeKycStatus(status);
  return norm === 'VERIFIED' || norm === 'APPROVED';
};

export const deriveKycDisplayStatus = (params: {
  kycStatus?: string | null;
  kycDocuments?: string[] | null;
}): KycDisplayStatus => {
  const normalizedStatus = normalizeKycStatus(params.kycStatus);

  if (normalizedStatus === 'VERIFIED' || normalizedStatus === 'APPROVED') {
    return 'VERIFIED';
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'FAILED') {
    return 'REJECTED';
  }

  const hasDocuments = Array.isArray(params.kycDocuments) && params.kycDocuments.length > 0;
  if (hasDocuments) {
    return 'PENDING';
  }

  return 'NOT_SUBMITTED';
};
