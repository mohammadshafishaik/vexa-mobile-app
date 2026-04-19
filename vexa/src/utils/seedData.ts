/**
 * Seed data for Phase 1 — allows exploring all screens without a backend.
 * This file will be removed once real API integration is in place (Phase 3+).
 */

import { useJobStore } from '../store/useJobStore';
import { useNotificationStore } from '../store/useNotificationStore';
import {
  UserRole,
  JobStatus,
  NotificationType,
  ApprovalStatus,
  ServiceRequest,
  Bid,
  Notification,
} from '../types';

const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();

// ─── Mock Jobs ───────────────────────────────

const MOCK_JOBS: ServiceRequest[] = [
  {
    id: 'job_001',
    orderId: 'VXA-MOCK-001',
    customerId: 'user_001',
    title: 'Fix kitchen sink leak',
    description:
      'Water is dripping from under the kitchen sink. Need a plumber to inspect and repair the pipe connection.',
    category: 'Plumbing',
    location: 'Banjara Hills, Hyderabad',
    latitude: 17.4138,
    longitude: 78.4402,
    images: [],
    completedImages: [],
    originalPrice: 2500,
    revisedPrice: null,
    urgency: 'NORMAL',
    status: JobStatus.BIDDING,
    selectedBidId: null,
    selectedProviderId: null,
    bids: [],
    modifications: [],
    maxModifications: 2,
    modificationCount: 0,
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
  },
  {
    id: 'job_002',
    orderId: 'VXA-MOCK-002',
    customerId: 'user_001',
    title: 'AC service & gas top-up',
    description:
      'Split AC not cooling properly. Needs deep cleaning, gas refilling, and general servicing.',
    category: 'AC Repair',
    location: 'Madhapur, Hyderabad',
    latitude: 17.4485,
    longitude: 78.3908,
    images: [],
    completedImages: [],
    originalPrice: 1800,
    revisedPrice: 2200,
    urgency: 'NORMAL',
    status: JobStatus.MODIFICATION_REQUESTED,
    selectedBidId: 'bid_003',
    selectedProviderId: 'provider_002',
    selectedProvider: {
      id: 'provider_002',
      email: 'sanjay.k@vexa.app',
      name: 'Sanjay Kumar',
      avatarUrl: null,
      phone: '+91 9876543210',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    modifications: [
      {
        id: 'mod_001',
        jobId: 'job_002',
        providerId: 'provider_002',
        revisionReason:
          'After inspection, the compressor needs minor repair along with gas refill. Extra parts required.',
        originalPrice: 1800,
        revisedPrice: 2200,
        revisionImages: [],
        approvalStatus: ApprovalStatus.PENDING,
        customerResponse: null,
        securityHash: 'mock_hash_001',
        createdAt: now,
        updatedAt: now,
      },
    ],
    maxModifications: 2,
    modificationCount: 1,
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  {
    id: 'job_003',
    orderId: 'VXA-MOCK-003',
    customerId: 'user_001',
    title: 'Electrical wiring inspection',
    description:
      'Recent power outages in certain rooms. Need an electrician to check wiring and fuse box.',
    category: 'Electrical',
    location: 'Jubilee Hills, Hyderabad',
    latitude: 17.432,
    longitude: 78.4072,
    images: [],
    completedImages: [],
    originalPrice: 1500,
    revisedPrice: null,
    urgency: 'NORMAL',
    status: JobStatus.PAYMENT_PENDING,
    selectedBidId: 'bid_005',
    selectedProviderId: 'provider_003',
    selectedProvider: {
      id: 'provider_003',
      email: 'anand.r@vexa.app',
      name: 'Anand Reddy',
      avatarUrl: null,
      phone: '+91 9988776655',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    bids: [],
    modifications: [],
    maxModifications: 2,
    modificationCount: 0,
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  {
    id: 'job_004',
    orderId: 'VXA-MOCK-004',
    customerId: 'user_001',
    title: 'Deep clean 2BHK apartment',
    description:
      'Full house deep cleaning including kitchen, bathrooms, and balcony. ~1200 sq ft apartment.',
    category: 'Cleaning',
    location: 'Gachibowli, Hyderabad',
    latitude: 17.4401,
    longitude: 78.3489,
    images: [],
    completedImages: [],
    originalPrice: 3000,
    revisedPrice: null,
    urgency: 'NORMAL',
    status: JobStatus.PAID,
    selectedBidId: 'bid_007',
    selectedProviderId: 'provider_004',
    selectedProvider: {
      id: 'provider_004',
      email: 'priya.s@vexa.app',
      name: 'Priya Singh',
      avatarUrl: null,
      phone: '+91 9112233445',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    bids: [],
    modifications: [],
    maxModifications: 2,
    modificationCount: 0,
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
];

// ─── Mock Bids ───────────────────────────────

const MOCK_BIDS: Bid[] = [
  {
    id: 'bid_001',
    jobId: 'job_001',
    providerId: 'provider_001',
    provider: {
      id: 'provider_001',
      email: 'rajesh.m@vexa.app',
      name: 'Rajesh Mehta',
      avatarUrl: null,
      phone: '+91 9998887776',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    amount: 2200,
    message:
      'I have 8 years of experience in plumbing. Can fix the leak within 2 hours.',
    estimatedDuration: '2 hours',
    isSelected: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'bid_002',
    jobId: 'job_001',
    providerId: 'provider_002',
    provider: {
      id: 'provider_002',
      email: 'sanjay.k@vexa.app',
      name: 'Sanjay Kumar',
      avatarUrl: null,
      phone: '+91 9876543210',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    amount: 1900,
    message:
      'Certified plumber with 5+ years experience. I can come within an hour.',
    estimatedDuration: '1.5 hours',
    isSelected: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'bid_003',
    jobId: 'job_001',
    providerId: 'provider_005',
    provider: {
      id: 'provider_005',
      email: 'vikram.p@vexa.app',
      name: 'Vikram Patel',
      avatarUrl: null,
      phone: '+91 9556677889',
      role: UserRole.PROVIDER,
      bio: null,
      isVerified: true,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    amount: 2400,
    message:
      'Professional plumber. Will bring all tools and spare parts. Guaranteed fix.',
    estimatedDuration: '3 hours',
    isSelected: false,
    createdAt: now,
    updatedAt: now,
  },
];

// ─── Mock Notifications ──────────────────────

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_001',
    userId: 'user_001',
    type: NotificationType.BID_RECEIVED,
    title: 'New Bid Received',
    body: 'Rajesh Mehta bid ₹2,200 on "Fix kitchen sink leak"',
    data: { jobId: 'job_001', bidId: 'bid_001' },
    isRead: false,
    createdAt: now,
  },
  {
    id: 'notif_002',
    userId: 'user_001',
    type: NotificationType.BID_RECEIVED,
    title: 'New Bid Received',
    body: 'Sanjay Kumar bid ₹1,900 on "Fix kitchen sink leak"',
    data: { jobId: 'job_001', bidId: 'bid_002' },
    isRead: false,
    createdAt: now,
  },
  {
    id: 'notif_003',
    userId: 'user_001',
    type: NotificationType.MODIFICATION_REQUEST,
    title: 'Modification Request',
    body: 'Sanjay Kumar has requested a price modification on "AC service & gas top-up"',
    data: { jobId: 'job_002', modificationId: 'mod_001' },
    isRead: true,
    createdAt: oneHourAgo,
  },
  {
    id: 'notif_004',
    userId: 'user_001',
    type: NotificationType.PAYMENT_COMPLETED,
    title: 'Payment Successful',
    body: 'Your payment of ₹3,000 for "Deep clean 2BHK apartment" was processed successfully',
    data: { jobId: 'job_004' },
    isRead: true,
    createdAt: twoDaysAgo,
  },
];

// ─── Seed Function ───────────────────────────

export function seedMockData(role: UserRole) {
  const jobStore = useJobStore.getState();
  const notifStore = useNotificationStore.getState();

  // Seed jobs
  MOCK_JOBS.forEach((job) => jobStore.addJob(job));

  // Seed bids (for the BIDDING job)
  MOCK_BIDS.forEach((bid) => jobStore.addBid(bid));

  // Seed notifications
  MOCK_NOTIFICATIONS.forEach((notif) => notifStore.addNotification(notif));
}
