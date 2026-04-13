// ──────────────────────────────────────────────
// VEXA Core TypeScript Interfaces
// Mirrors the database models defined in the spec
// ──────────────────────────────────────────────

// ─── Enums ───────────────────────────────────

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum JobStatus {
  POSTED = 'POSTED',
  BIDDING = 'BIDDING',
  ACCEPTED = 'ACCEPTED',
  ON_SITE_INSPECTION = 'ON_SITE_INSPECTION',
  MODIFICATION_REQUESTED = 'MODIFICATION_REQUESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  UNDER_DISPUTE = 'UNDER_DISPUTE',
  CANCELLED = 'CANCELLED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum NotificationType {
  BID_RECEIVED = 'BID_RECEIVED',
  BID_ACCEPTED = 'BID_ACCEPTED',
  JOB_UPDATE = 'JOB_UPDATE',
  MODIFICATION_REQUEST = 'MODIFICATION_REQUEST',
  MODIFICATION_APPROVED = 'MODIFICATION_APPROVED',
  MODIFICATION_REJECTED = 'MODIFICATION_REJECTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  RATING_RECEIVED = 'RATING_RECEIVED',
  SYSTEM = 'SYSTEM',
}

// ─── Models ──────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  customer?: User;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  completedImages: string[];
  originalPrice: number;
  revisedPrice: number | null;
  urgency: string;
  status: JobStatus;
  selectedBidId: string | null;
  selectedProviderId: string | null;
  selectedProvider?: User;
  bids?: Bid[];
  modifications?: JobModification[];
  maxModifications: number;
  modificationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  jobId: string;
  providerId: string;
  provider?: User;
  amount: number;
  message: string;
  estimatedDuration: string;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobModification {
  id: string;
  jobId: string;
  providerId: string;
  provider?: User;
  revisionReason: string;
  originalPrice: number;
  revisedPrice: number;
  revisionImages: string[];
  approvalStatus: ApprovalStatus;
  customerResponse: string | null;
  securityHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  securityHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  id: string;
  jobId: string;
  raterId: string;
  rater?: User;
  rateeId: string;
  ratee?: User;
  score: number; // 1-5
  review: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  jobId: string;
  raisedById: string;
  raisedBy?: User;
  reason: string;
  evidence: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolvedById: string | null;
  resolvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  performedBy?: User;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

// ─── API Types ───────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  statusCode: number;
}

// ─── Navigation Types ────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  AuthLoading: undefined;
  CustomerMain: undefined;
  ProviderMain: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string; email: string };
};

export type CustomerTabParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  DashboardHome: undefined;
  PostJob: undefined;
  LiveBidding: { jobId: string };
  JobDetail: { jobId: string };
  RevisionApproval: { jobId: string; modificationId: string };
  Payment: { jobId: string };
  Rating: { jobId: string };
  Dispute: { jobId: string };
};

export type ProviderTabParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ProviderStackParamList = {
  DashboardHome: undefined;
  JobDetail: { jobId: string };
  LiveBidding: { jobId: string };
  ModificationRequest: { jobId: string };
  Payment: { jobId: string };
  Rating: { jobId: string };
  Dispute: { jobId: string };
};

