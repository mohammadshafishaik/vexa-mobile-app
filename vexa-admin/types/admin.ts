export interface DashboardOverview {
  users: {
    total: number;
    customers: number;
    providers: number;
    admins: number;
    suspended: number;
    banned: number;
  };
  jobs: {
    total: number;
    active: number;
    paid: number;
  };
  disputes: {
    total: number;
    open: number;
  };
  payments: {
    total: number;
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
  };
  kyc: {
    totalDocuments: number;
    pendingDocuments: number;
  };
  bidding: {
    openAnomalies: number;
  };
  advanced: {
    totalChatMessages: number;
    totalProviderSkills: number;
    totalPortfolioItems: number;
    totalCancellations: number;
    onlineProviders: number;
  };
}

export interface Paginated<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}
