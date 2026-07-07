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
export declare const shouldAutoReactivateSuspendedAccount: (account: AccountStatusSnapshot) => boolean;
export declare const getAccountAccessBlock: (account: AccountStatusSnapshot) => AccountAccessBlock | null;
//# sourceMappingURL=accountStatus.d.ts.map