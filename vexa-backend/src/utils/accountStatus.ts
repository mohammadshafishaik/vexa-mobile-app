export type AccountStatusSnapshot = {
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED' | 'DELETED';
  suspendedUntil?: Date | null;
  banReason?: string | null;
};

export type AccountAccessBlock = {
  statusCode: 403;
  code: 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_DEACTIVATED' | 'ACCOUNT_DELETED';
  message: string;
};

export const shouldAutoReactivateSuspendedAccount = (
  account: AccountStatusSnapshot,
): boolean => {
  return account.accountStatus === 'SUSPENDED'
    && !!account.suspendedUntil
    && account.suspendedUntil.getTime() <= Date.now();
};

const formatSuspensionDate = (value: Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
};

export const getAccountAccessBlock = (
  account: AccountStatusSnapshot,
): AccountAccessBlock | null => {
  if (account.accountStatus === 'DELETED') {
    return {
      statusCode: 403,
      code: 'ACCOUNT_DELETED',
      message: 'Your account is no longer available. Please contact support for assistance.',
    };
  }

  if (account.accountStatus === 'BANNED') {
    const reasonText = account.banReason?.trim()
      ? ` Reason: ${account.banReason.trim()}`
      : '';

    return {
      statusCode: 403,
      code: 'ACCOUNT_BANNED',
      message: `Your account has been banned.${reasonText}`,
    };
  }

  if (account.accountStatus === 'DEACTIVATED') {
    return {
      statusCode: 403,
      code: 'ACCOUNT_DEACTIVATED',
      message: 'Your account has been deactivated. Please contact support to reactivate.',
    };
  }

  if (account.accountStatus === 'SUSPENDED') {
    if (shouldAutoReactivateSuspendedAccount(account)) {
      return null;
    }

    const untilText = account.suspendedUntil
      ? ` until ${formatSuspensionDate(account.suspendedUntil)}`
      : '';

    return {
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
      message: `Your account is suspended${untilText}.`,
    };
  }

  return null;
};
