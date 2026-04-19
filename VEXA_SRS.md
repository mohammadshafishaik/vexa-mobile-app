# Software Requirements Specification

## VEXA — Real-Time Service Marketplace

| Field               | Detail                                      |
|---------------------|---------------------------------------------|
| **Document Version**| 1.0                                         |
| **Date**            | April 2026                                  |
| **Prepared By**     | VEXA Development Team                       |
| **Status**          | Approved for Development                    |
| **Classification**  | Confidential                                |

---

## Revision History

| Version | Date       | Author             | Description                       |
|---------|------------|--------------------|------------------------------------|
| 0.1     | Mar 2026   | Architecture Team  | Initial draft with core modules   |
| 0.5     | Mar 2026   | Architecture Team  | Added bidding and payment specs   |
| 0.9     | Apr 2026   | Architecture Team  | Integrated admin panel & KYC flow |
| 1.0     | Apr 2026   | Architecture Team  | Final review and sign-off         |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [System Architecture](#5-system-architecture)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Database Design](#8-database-design)
9. [UML Diagrams](#9-uml-diagrams)
10. [End-to-End Workflow](#10-end-to-end-workflow)
11. [Security Considerations](#11-security-considerations)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional, non-functional, and interface requirements for **VEXA**, a real-time service marketplace platform. The document serves as the authoritative technical contract between stakeholders, developers, quality-assurance engineers, and project managers. It adheres to the IEEE 830-1998 standard for software requirements specifications and is intended for use throughout the software development lifecycle — from design and implementation through testing, deployment, and maintenance.

### 1.2 Scope

VEXA is a mobile-first marketplace that connects customers who need on-demand services (plumbing, electrical work, cleaning, carpentry, and similar trades) with verified service providers in their geographic vicinity. The platform differentiates itself through a **real-time competitive bidding mechanism**: instead of fixed pricing, service providers submit live bids on customer-posted jobs, giving customers transparency and choice.

The system encompasses:

- A **React Native mobile application** for customers and service providers.
- A **Node.js/Express REST API backend** with real-time WebSocket support via Socket.io.
- A **Next.js web-based admin panel** for platform governance, KYC verification, dispute management, and analytics.
- Integration with **Razorpay** for secure payment processing, **Firebase Cloud Messaging** for push notifications, and **Cloudinary** for media storage.

The platform handles the complete service lifecycle: user registration → job posting → live bidding → provider selection → on-site inspection → modification negotiation → payment → mutual rating.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
|----------------|------------|
| **API**        | Application Programming Interface |
| **CRUD**       | Create, Read, Update, Delete |
| **FCM**        | Firebase Cloud Messaging |
| **JWT**        | JSON Web Token |
| **KYC**        | Know Your Customer |
| **OAuth**      | Open Authorization |
| **ORM**        | Object-Relational Mapping |
| **REST**       | Representational State Transfer |
| **SRS**        | Software Requirements Specification |
| **UUID**       | Universally Unique Identifier |
| **WebSocket**  | Full-duplex communication protocol over a single TCP connection |
| **Service Request** | A job or task posted by a customer seeking a service provider |
| **Bid**        | A price-and-timeline proposal submitted by a provider for a service request |
| **Modification Request** | A provider-initiated proposal to change the scope or price of an accepted job after on-site inspection |
| **Razorpay**   | Indian payment gateway provider supporting UPI, cards, and net banking |
| **Prisma**     | Type-safe ORM for Node.js and TypeScript |
| **Socket.io**  | Library enabling real-time, bidirectional, event-based communication |

### 1.4 Document Overview

This SRS is organized into twelve sections. Section 1 provides introductory context. Section 2 offers a high-level product description including user classes, operating environment, and constraints. Sections 3 through 6 detail system features, interface requirements, architecture, and functional requirements respectively. Sections 7 and 8 cover non-functional requirements and database design. Sections 9 and 10 present UML diagram descriptions and the end-to-end workflow. Section 11 addresses security, and Section 12 outlines future enhancements.

---

## 2. Overall Description

### 2.1 Product Perspective

VEXA is a self-contained, greenfield system that does not replace or extend an existing product. It operates as a three-tier architecture:

1. **Presentation Tier** — A cross-platform mobile application (React Native) and a web-based admin dashboard (Next.js).
2. **Application Tier** — A Node.js/Express REST API server augmented with Socket.io for real-time event delivery.
3. **Data Tier** — A PostgreSQL relational database accessed through the Prisma ORM.

The system relies on the following external services:

| External Service         | Role                                    |
|--------------------------|-----------------------------------------|
| Razorpay Payment Gateway | Processes digital payments (UPI, cards, net banking) |
| Firebase Cloud Messaging | Delivers push notifications to mobile devices |
| Cloudinary               | Stores and serves user-uploaded images  |
| Google OAuth 2.0         | Provides social sign-in capability      |
| SMTP Mail Server         | Sends transactional emails (password reset, verification) |

### 2.2 Product Functions

At a high level, VEXA provides the following capabilities:

- **User Registration & Authentication** — Email/password registration, Google OAuth sign-in, session management via Better Auth with JWT tokens, and email-based password recovery.
- **Job Posting** — Customers create service requests with title, description, category, location (with GPS coordinates), images, urgency level, and optional scheduling.
- **Real-Time Bidding** — Providers browse available jobs and submit competitive bids; all bids appear in real time on the customer's screen via WebSocket events.
- **Provider Selection** — Customers review bids (amount, estimated duration, provider ratings) and select a provider, triggering acceptance notifications.
- **On-Site Inspection** — The selected provider visits the customer location, assesses the actual scope, and may initiate a modification request if the job differs from the posted description.
- **Modification Negotiation** — Providers submit revision proposals (with justification, revised pricing, and photographic evidence); customers approve or reject.
- **Payment Processing** — Secure payments via Razorpay (online) or cash-on-delivery, with order creation, signature verification, and status tracking.
- **Rating & Review** — Both parties rate each other after job completion (1–5 stars with written review), enforcing a one-rating-per-job-per-rater constraint.
- **Notifications** — Real-time in-app notifications via Socket.io and persistent push notifications via Firebase Cloud Messaging.
- **Admin Governance** — Platform administrators manage users, verify KYC documents, handle disputes, monitor bid anomalies, oversee payments, and send notification campaigns.

### 2.3 User Classes and Characteristics

#### 2.3.1 Customer

| Attribute        | Detail |
|------------------|--------|
| **Role**         | CUSTOMER |
| **Access Channel** | Mobile application (Android/iOS) |
| **Technical Literacy** | Low to moderate; expects a simple, guided interface |
| **Primary Actions** | Post service requests, view live bids, select providers, approve/reject modifications, make payments, rate providers, raise disputes |
| **Frequency of Use** | Occasional to regular (event-driven — when a service is needed) |

#### 2.3.2 Service Provider

| Attribute        | Detail |
|------------------|--------|
| **Role**         | PROVIDER |
| **Access Channel** | Mobile application (Android/iOS) |
| **Technical Literacy** | Low to moderate; typically tradespeople and skilled workers |
| **Primary Actions** | Browse available jobs, submit bids, perform on-site inspections, request modifications, complete jobs, receive payments, rate customers |
| **Frequency of Use** | Daily (active income source) |

#### 2.3.3 Administrator

| Attribute        | Detail |
|------------------|--------|
| **Role**         | ADMIN (sub-roles: SUPER_ADMIN, MODERATOR) |
| **Access Channel** | Web-based admin panel (desktop browser) |
| **Technical Literacy** | Moderate to high; platform operations staff |
| **Primary Actions** | Manage user accounts (suspend, ban, activate), review KYC documents, resolve disputes, monitor bid anomalies, manage payments, view analytics, send notification campaigns |
| **Frequency of Use** | Daily (operational role) |

### 2.4 Operating Environment

| Layer       | Technology                        | Environment                |
|-------------|-----------------------------------|----------------------------|
| Mobile App  | React Native 0.84, TypeScript     | Android 8.0+ / iOS 14+    |
| Admin Panel | Next.js, React, TypeScript        | Modern web browsers        |
| Backend API | Node.js 22+, Express 5, TypeScript| Linux server / Cloud VPS   |
| Database    | PostgreSQL 15+                    | Cloud-hosted (e.g., Neon, AWS RDS) |
| Runtime     | tsx (TypeScript execution)        | Node.js 22.11.0+           |

### 2.5 Design Constraints

1. **Mobile-First Design** — The primary user interface is a mobile application; all workflows must be optimized for touch interaction and smaller viewports.
2. **Indian Market Focus** — The initial release targets the Indian market; currency is INR, payment gateway is Razorpay, and KYC document types include Aadhaar and PAN.
3. **Real-Time Constraint** — Bid updates must propagate to all connected clients within 500 milliseconds of submission to maintain the competitive bidding experience.
4. **PostgreSQL Compatibility** — The data layer must use PostgreSQL; schema migrations are managed exclusively through Prisma Migrate.
5. **RESTful API Convention** — All backend endpoints follow REST conventions with JSON request/response bodies, except for the Better Auth handler which manages its own request parsing.

### 2.6 Assumptions and Dependencies

| # | Assumption / Dependency |
|---|------------------------|
| A1 | Users have smartphones with reliable internet connectivity (3G/4G/Wi-Fi). |
| A2 | Users possess a valid email address or Google account for registration. |
| A3 | Razorpay's API remains available and backward-compatible. |
| A4 | Firebase Cloud Messaging service maintains its current free-tier quotas. |
| A5 | Service providers operate within jurisdictions where digital identity verification (Aadhaar/PAN) is feasible. |
| A6 | Cloudinary provides adequate storage and bandwidth within the selected plan. |
| A7 | The PostgreSQL database host guarantees 99.9% uptime. |
| A8 | GPS/location services are available on user devices for accurate job location tagging. |

---

## 3. System Features

### 3.1 User Authentication (Google OAuth + Better Auth with JWT)

**Description:** The authentication system supports two primary methods — email/password registration with server-side hashing (bcrypt) and Google OAuth 2.0 social sign-in. Session management is handled by Better Auth, which issues and validates JWT-based session tokens. The system also provides email-based password recovery with time-limited, single-use reset tokens.

**Inputs:**
- Registration: name, email, password, role (CUSTOMER/PROVIDER), optional phone number, optional Google ID token.
- Login: email + password, or Google OAuth credential.
- Password Reset: email address (for request), reset token + new password (for completion).

**Outputs:**
- Session token (JWT) and refresh token upon successful authentication.
- User profile object (id, name, email, role, avatar URL, verification status).
- Password reset email containing a unique, time-limited link.
- Error responses with appropriate HTTP status codes for invalid credentials, duplicate accounts, or expired tokens.

**Processing Logic:**
1. On registration, the backend validates input fields, checks for duplicate email, hashes the password using bcrypt, generates a UUID, and inserts the user record.
2. On Google OAuth login, the backend verifies the Google ID token, creates or retrieves the user record linked by `googleId`, and establishes a session.
3. Better Auth manages session lifecycle — issuing tokens at `/api/auth/*` endpoints, validating tokens on protected route access, and handling token refresh.
4. Password reset generates a UUID token stored in the `password_reset_tokens` table with a 1-hour expiry, sends an email via SMTP, and upon submission validates the token, hashes the new password, and invalidates the token.

**Error Conditions:**
- `409 Conflict` — Email already registered.
- `401 Unauthorized` — Invalid credentials or expired session.
- `400 Bad Request` — Missing required fields, password too short, invalid email format.
- `410 Gone` — Password reset token expired or already used.
- `429 Too Many Requests` — Rate limiting on authentication endpoints.

---

### 3.2 Job Posting System

**Description:** Customers create service requests that describe the work needed, specify the location, attach photographs, and set urgency and scheduling parameters. Each job is assigned a unique, human-readable order ID and begins in the `POSTED` status.

**Inputs:**
- Title (string, required, 5–100 characters).
- Description (string, required, 20–2000 characters).
- Category (string, required — e.g., Plumbing, Electrical, Cleaning, Carpentry).
- Location (string address, required).
- Latitude and Longitude (float, optional — captured via device GPS).
- Images (array of image URIs uploaded via the `/api/upload` endpoint, optional).
- Urgency (enum: NORMAL, URGENT, EMERGENCY — default NORMAL).
- Scheduled At (ISO 8601 datetime, optional — for future scheduling).
- Original Price (float, optional — customer's budget estimate).

**Outputs:**
- Newly created `ServiceRequest` object with generated UUID and order ID.
- Job status set to `POSTED`.
- Socket.io event `job:new` broadcast to relevant provider rooms.

**Processing Logic:**
1. Authenticated customer submits job details via `POST /api/jobs`.
2. Backend validates all fields, generates a unique order ID (format: `VX-XXXXXXXX`), and inserts the record into the `service_requests` table.
3. If images are provided, they are validated against the upload service (Cloudinary URLs) and stored as a string array.
4. The job is broadcast to connected providers via Socket.io for immediate visibility.
5. The customer can view, edit, or cancel their job before a bid is accepted.

**Error Conditions:**
- `400 Bad Request` — Missing required fields, invalid category, or malformed location data.
- `401 Unauthorized` — User not authenticated.
- `403 Forbidden` — User role is not CUSTOMER.
- `413 Payload Too Large` — Image upload exceeds size limit.

---

### 3.3 Real-Time Bidding System

**Description:** Service providers submit competitive bids on posted jobs. The bidding system operates in real time — every new bid, bid update, or bid retraction is broadcast instantly to all clients watching that job via Socket.io rooms. Each provider may submit only one bid per job (enforced by a database-level unique constraint on `[jobId, providerId]`).

**Inputs:**
- Job ID (UUID, required).
- Bid Amount (float, required, must be greater than zero).
- Message (string, required — describes the provider's approach or qualifications).
- Estimated Duration (string, required — e.g., "2 hours", "1 day").

**Outputs:**
- Created `Bid` object with UUID, timestamp, and `isSelected: false`.
- Real-time Socket.io event `bid:new` emitted to the `bidding:{jobId}` room.
- Notification sent to the customer (in-app + push via FCM).
- Job status transitions from `POSTED` to `BIDDING` upon receiving the first bid.

**Processing Logic:**
1. Provider joins the `bidding:{jobId}` Socket.io room to receive live updates.
2. Provider submits bid via `POST /api/bids`.
3. Backend validates that the job exists, is in a biddable status (`POSTED` or `BIDDING`), and that the provider has not already bid.
4. Bid is inserted into the `bids` table; if this is the first bid, the job status is updated to `BIDDING`.
5. The bid object is emitted to all clients in the `bidding:{jobId}` room.
6. A `BID_RECEIVED` notification is created for the customer and delivered via Socket.io (`user:{customerId}` room) and Firebase push notification.

**Error Conditions:**
- `409 Conflict` — Provider has already bid on this job.
- `400 Bad Request` — Job is no longer accepting bids (status is past `BIDDING`).
- `404 Not Found` — Job ID does not exist.
- `403 Forbidden` — User role is not PROVIDER, or provider account is suspended.

---

### 3.4 Provider Selection

**Description:** After reviewing incoming bids, the customer selects a preferred provider. Selection locks the job to that provider, rejects all other bids implicitly, and transitions the job into the active phase.

**Inputs:**
- Job ID (UUID) — the service request being acted upon.
- Bid ID (UUID) — the selected bid.

**Outputs:**
- Bid marked as `isSelected: true`.
- Job status transitions to `ACCEPTED`.
- `selectedProviderId` and `selectedBidId` fields populated on the service request.
- `BID_ACCEPTED` notification sent to the selected provider.
- Socket.io event `bid:accepted` broadcast to the bidding room.

**Processing Logic:**
1. Customer invokes `POST /api/bids/{bidId}/select` (or equivalent endpoint).
2. Backend verifies ownership (the job belongs to the requesting customer) and that the job is in `BIDDING` status.
3. A database transaction marks the selected bid's `isSelected` flag to `true`, updates the job's `selectedBidId`, `selectedProviderId`, and `status` to `ACCEPTED`.
4. A notification is dispatched to the selected provider.
5. All clients in the bidding room receive a `bid:accepted` event, signaling the bidding phase is closed.

**Error Conditions:**
- `403 Forbidden` — Requesting user is not the job's customer.
- `400 Bad Request` — Job is not in `BIDDING` status, or bid does not belong to this job.
- `404 Not Found` — Bid or job does not exist.

---

### 3.5 On-Site Inspection Workflow

**Description:** Once a provider is selected, they travel to the customer's location to perform a physical assessment of the work required. This phase allows the provider to verify that the job description matches reality and determines whether modifications are necessary.

**Inputs:**
- Job ID (UUID) — for status transition.
- Provider confirmation of arrival (implicit via status update).

**Outputs:**
- Job status transitions to `ON_SITE_INSPECTION`.
- `JOB_UPDATE` notification sent to the customer confirming provider arrival.

**Processing Logic:**
1. The selected provider updates the job status to `ON_SITE_INSPECTION` via `PATCH /api/jobs/{jobId}/status`.
2. Backend validates that the requesting user is the selected provider and the current status is `ACCEPTED`.
3. The customer receives a notification that the provider has arrived and inspection is underway.
4. Upon completing the inspection, the provider either begins work (transitioning to `IN_PROGRESS`) or submits a modification request if the scope differs.

**Error Conditions:**
- `403 Forbidden` — User is not the selected provider for this job.
- `400 Bad Request` — Invalid status transition (e.g., job is not in `ACCEPTED` status).

---

### 3.6 Modification Request System

**Description:** After on-site inspection, a provider may find that the actual scope, materials, or complexity differs from the customer's original description. The modification system allows the provider to propose a revised price with justification and photographic evidence. The customer can approve (accepting the new price) or reject (reverting to the original terms or cancelling). Each job has a configurable maximum number of modification rounds (default: 2).

**Inputs:**
- Job ID (UUID, required).
- Revision Reason (string, required — detailed explanation of why the price must change).
- Original Price (float, required — the current agreed price).
- Revised Price (float, required — the proposed new price).
- Revision Images (array of image URIs, optional — photographic evidence from the job site).

**Outputs:**
- Created `JobModification` record with a security hash for integrity verification.
- Job status transitions to `MODIFICATION_REQUESTED`.
- `MODIFICATION_REQUEST` notification sent to the customer.
- Upon customer approval: job status returns to `IN_PROGRESS`, `revisedPrice` is updated on the service request, `modificationCount` is incremented.
- Upon customer rejection: job reverts to `IN_PROGRESS` at the original price, or progresses to cancellation at the customer's discretion.

**Processing Logic:**
1. Provider submits modification via `POST /api/modifications`.
2. Backend validates the provider is the selected provider, the job is in an appropriate status (`ON_SITE_INSPECTION` or `IN_PROGRESS`), and the modification count has not exceeded `maxModifications`.
3. A SHA-256 security hash is computed over the modification data to prevent tampering.
4. The modification record is inserted; the job status is set to `MODIFICATION_REQUESTED`.
5. The customer reviews the modification on the `RevisionApprovalScreen` and submits their decision via `PATCH /api/modifications/{id}/respond`.
6. Approval triggers: status update, `revisedPrice` update, `MODIFICATION_APPROVED` notification. Rejection triggers: `MODIFICATION_REJECTED` notification, status revert.

**Error Conditions:**
- `400 Bad Request` — Maximum modification count exceeded, or revised price is not a valid positive number.
- `403 Forbidden` — User is not the selected provider, or modification does not belong to the requesting customer (for approval/rejection).
- `404 Not Found` — Job or modification record does not exist.
- `409 Conflict` — A pending modification already exists for this job.

---

### 3.7 Payment Processing (Razorpay)

**Description:** The payment module handles the financial settlement between customer and provider. It supports two payment methods: online payment via Razorpay (supporting UPI, credit/debit cards, and net banking) and cash payment. For Razorpay transactions, the backend creates an order, the mobile client collects payment, and the backend verifies the cryptographic signature before marking the payment as completed.

**Inputs:**
- Job ID (UUID, required).
- Payment Method (string: `RAZORPAY` or `CASH`).
- For Razorpay verification: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.

**Outputs:**
- `Payment` record with status (PENDING → PROCESSING → COMPLETED or FAILED).
- Razorpay order ID (for client-side checkout initiation).
- Job status transitions to `PAYMENT_PENDING` on order creation, then `PAID` on successful verification.
- `PAYMENT_COMPLETED` notification to the provider.
- `PAYMENT_RECEIVED` notification to the customer as a receipt confirmation.

**Processing Logic:**
1. Customer initiates payment via `POST /api/payments/create-order`.
2. Backend calculates the final amount (using `revisedPrice` if modifications were approved, otherwise `originalPrice` from the selected bid).
3. For Razorpay: the backend calls the Razorpay Orders API to create an order, stores the `razorpayOrderId` in the payment record, and returns the order details to the client.
4. The mobile client opens the Razorpay checkout screen (via `react-native-razorpay`), the user completes payment.
5. On success callback, the client sends verification data to `POST /api/payments/verify`.
6. Backend recomputes the HMAC-SHA256 signature using the Razorpay key secret and compares it with the received signature. If valid, payment status is updated to `COMPLETED`, job status to `PAID`.
7. For cash payments: the backend creates a payment record with method `CASH`, the provider marks it as received, and the job transitions to `PAID`.
8. A security hash is generated and stored on the payment record for audit trail integrity.

**Error Conditions:**
- `400 Bad Request` — Job is not in a payable status, or payment amount does not match expected amount.
- `402 Payment Required` — Razorpay signature verification failed (potential tampering).
- `404 Not Found` — Job or payment record does not exist.
- `500 Internal Server Error` — Razorpay API unavailable or returned an error during order creation.

---

### 3.8 Rating & Review System

**Description:** After job completion and payment, both the customer and the provider can rate each other. Ratings are on a 1–5 integer scale with a mandatory written review. The system enforces a single rating per rater per job (database-level unique constraint on `[jobId, raterId]`).

**Inputs:**
- Job ID (UUID, required).
- Score (integer, 1–5, required).
- Review (string, required, 10–500 characters).

**Outputs:**
- Created `Rating` record linking job, rater, and ratee.
- `RATING_RECEIVED` notification sent to the ratee.
- Updated aggregate rating visible on the ratee's profile.

**Processing Logic:**
1. After the job reaches `PAID` status, the rating option becomes available on both sides.
2. User submits rating via `POST /api/ratings`.
3. Backend validates that the user is a participant in the job (either customer or selected provider), the job is in `PAID` status, and no prior rating exists from this rater for this job.
4. The `rateeId` is inferred: if the rater is the customer, the ratee is the provider, and vice versa.
5. The rating is inserted and a notification is dispatched.

**Error Conditions:**
- `409 Conflict` — User has already rated this job.
- `403 Forbidden` — User is not a participant in this job.
- `400 Bad Request` — Score out of range, review too short, or job not in `PAID` status.

---

### 3.9 Notification System

**Description:** The notification system operates on two channels: (1) real-time in-app notifications delivered via Socket.io to connected clients, and (2) persistent push notifications delivered via Firebase Cloud Messaging to offline or backgrounded clients. All notifications are persisted in the database for historical retrieval.

**Inputs:**
- User ID (recipient).
- Notification Type (enum: BID_RECEIVED, BID_ACCEPTED, JOB_UPDATE, MODIFICATION_REQUEST, MODIFICATION_APPROVED, MODIFICATION_REJECTED, PAYMENT_RECEIVED, PAYMENT_COMPLETED, DISPUTE_OPENED, DISPUTE_RESOLVED, RATING_RECEIVED, SYSTEM).
- Title (string).
- Body (string).
- Data (JSON payload — contextual navigation data, e.g., `{ jobId: "..." }`).

**Outputs:**
- Persisted `Notification` record with `isRead: false`.
- Socket.io event `notification:new` emitted to the `user:{userId}` room.
- Firebase push notification delivered to all registered device tokens.
- Notification list retrievable via `GET /api/notifications`.
- Mark-as-read capability via `PATCH /api/notifications/{id}/read`.

**Processing Logic:**
1. Backend modules (bids, payments, modifications, etc.) call the notification utility after relevant state changes.
2. A notification record is inserted into the `notifications` table.
3. Socket.io emits the notification to the user's room for live delivery.
4. If the user has registered device tokens (stored in `User.deviceTokens`), the Firebase Admin SDK sends a push notification with the title, body, and data payload.
5. The mobile client displays a local notification banner and updates the unread badge count.
6. Users can fetch their notification history (paginated) and mark individual notifications as read.

**Error Conditions:**
- FCM delivery failure (invalid or expired device token) — logged but does not block the operation.
- Socket.io delivery failure (user not connected) — the notification persists in the database for later retrieval.

---

### 3.10 Admin Panel Features

The admin panel is a Next.js web application providing platform governance capabilities. It is accessible only to users with the `ADMIN` role and authenticated via a separate admin authentication flow with refresh-token–based sessions.

#### 3.10.1 User Management

**Description:** Administrators can view, search, filter, and manage all platform users. Actions include suspending accounts (with an optional duration), banning users permanently (with a documented reason), reactivating suspended accounts, and viewing user activity history.

**Inputs:** User ID, action type (suspend/ban/activate), optional: suspension duration, ban reason.

**Outputs:** Updated user record with `accountStatus` (ACTIVE, SUSPENDED, BANNED), `suspendedUntil` timestamp, `banReason`, audit log entry.

**Processing Logic:** All administrative actions are wrapped in a database transaction that both updates the user record and inserts an entry into the `audit_logs` table, recording the admin's identity, the action performed, and the before/after state.

#### 3.10.2 KYC Verification

**Description:** Service providers submit identity documents (Aadhaar, PAN) for verification. Administrators review submitted documents, and either approve or reject them with remarks.

**Inputs:** KYC document ID, decision (APPROVE/REJECT), optional remarks.

**Outputs:** Updated `KycDocument` record with status, reviewer ID, review timestamp. A `KycReviewLog` entry is created for audit purposes. The provider's `kycStatus` on the user record is updated accordingly.

**Processing Logic:**
1. Provider uploads documents via the mobile app; files are stored in Cloudinary and references are saved as `KycDocument` records with status `PENDING`.
2. Admin views pending documents in the KYC dashboard, reviews them, and submits a decision.
3. Approval: document status → APPROVED, user's `kycStatus` → VERIFIED.
4. Rejection: document status → REJECTED with remarks, user's `kycStatus` → REJECTED. Provider is notified and may resubmit.

#### 3.10.3 Dispute Handling

**Description:** When a customer or provider is dissatisfied with a job outcome, they can raise a dispute. Administrators review disputes, examine evidence (text and images), and issue a resolution decision (full refund, partial settlement, or rejection).

**Inputs:** Dispute ID, decision (REFUND, PARTIAL_SETTLEMENT, REJECT), optional refund amount, remarks.

**Outputs:** Updated `Dispute` record (status → RESOLVED), `DisputeResolution` record with decision details, corresponding payment adjustments, notifications to both parties.

**Processing Logic:**
1. User raises a dispute via `POST /api/disputes` with a reason and evidence (images).
2. Dispute is created with status `OPEN`; job status transitions to `UNDER_DISPUTE`.
3. Admin reviews the dispute in the admin panel, can change status to `UNDER_REVIEW`.
4. Admin issues a resolution decision, which is recorded in the `dispute_resolutions` table.
5. If a refund is issued, a corresponding payment record is created or the original payment is marked for refund processing via Razorpay.
6. Both parties receive `DISPUTE_RESOLVED` notifications.

#### 3.10.4 Monitoring and Analytics

**Description:** The admin panel provides dashboards for monitoring platform health, including bid anomaly detection (rapid rebidding, extreme undercuts, collusion patterns), payment oversight (pending, completed, failed, refunded), and aggregate analytics (total users, active jobs, revenue metrics).

**Inputs:** Date range filters, status filters, entity-specific filters.

**Outputs:** Aggregated counts, charts data, anomaly listings, paginated entity lists.

**Processing Logic:** The analytics module executes aggregation queries against the PostgreSQL database, computes metrics, and returns structured JSON responses. Bid anomalies are flagged automatically based on configurable rules (e.g., a bid that undercuts the average by more than 70% triggers an `EXTREME_UNDERCUT` anomaly).

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 Mobile Application (Customer & Provider)

The mobile interface is built with React Native and follows a bottom-tab navigation pattern with role-specific dashboards.

**Customer Screens:**
| Screen | Purpose |
|--------|---------|
| DashboardScreen | Displays active, completed, and cancelled jobs with status badges |
| PostJobScreen | Multi-step form for creating a new service request with image upload and location picker |
| LiveBiddingScreen | Real-time view of incoming bids on a posted job, with provider profiles and bid comparison |
| JobDetailScreen | Comprehensive job view with status timeline, provider details, modification history, and action buttons |
| RevisionApprovalScreen | Displays modification proposals with before/after pricing and evidence images |
| PaymentScreen | Razorpay checkout initiation and payment status confirmation |
| RatingScreen | Star-rating input with review text area |
| DisputeScreen | Dispute submission form with evidence upload |

**Provider Screens:**
| Screen | Purpose |
|--------|---------|
| DashboardScreen | Lists available jobs (for bidding) and assigned jobs (in progress) with earned revenue summary |
| ModificationRequestScreen | Form for submitting scope/price change proposals with photo evidence |

**Shared Screens:**
| Screen | Purpose |
|--------|---------|
| LoginScreen | Email/password and Google OAuth sign-in |
| RegisterScreen | New user registration with role selection |
| ProfileScreen | View and edit profile, change password, manage notifications |
| NotificationScreen | Scrollable list of all notifications with read/unread indicators |
| ForgotPasswordScreen | Email input for password reset request |
| ResetPasswordScreen | New password form accessed via reset link |

#### 4.1.2 Admin Panel (Web)

The admin panel is a Next.js web application with a sidebar navigation layout. Key pages include:

- **Dashboard** — Overview metrics (total users, active jobs, revenue, recent activity).
- **User Management** — Searchable user list with suspend/ban/activate actions.
- **KYC Verification** — Queue of pending document reviews with image viewer.
- **Job Management** — Job listing with status filters and detail views.
- **Bidding Oversight** — Bid anomaly dashboard with severity scoring.
- **Dispute Resolution** — Open disputes queue with evidence viewer and decision form.
- **Payment Management** — Payment listing with status filters, refund actions.
- **Notification Broadcast** — Campaign creation form targeting user segments.
- **Audit Logs** — Searchable, filterable log of all administrative actions.
- **Analytics** — Visual charts for platform KPIs.

### 4.2 Hardware Interfaces

The system does not interface directly with specialized hardware. However, the mobile application utilizes the following device capabilities:

| Capability | Usage |
|-----------|-------|
| GPS / Location Services | Capturing customer location coordinates for job posting |
| Camera / Photo Library | Capturing and selecting images for job postings, modifications, and disputes |
| Network Interface (Wi-Fi/Cellular) | All communication with the backend API and Socket.io server |
| Push Notification Service | Receiving Firebase Cloud Messaging payloads |

### 4.3 Software Interfaces

#### 4.3.1 Backend REST API

| Attribute  | Detail |
|-----------|--------|
| Protocol  | HTTPS (HTTP in development) |
| Format    | JSON request/response bodies |
| Authentication | Bearer token (Better Auth session token) in Authorization header |
| Base URL  | `https://{domain}/api` |
| Versioning | Path-based (v1 implied in current release) |

Key endpoint groups:

| Endpoint Prefix        | Purpose |
|-----------------------|---------|
| `/api/auth/*`          | Better Auth session management (login, register, session, OAuth) |
| `/api/custom-auth/*`   | Custom authentication extensions (role assignment, profile updates) |
| `/api/jobs`            | Service request CRUD and status transitions |
| `/api/bids`            | Bid submission, listing, and selection |
| `/api/modifications`   | Modification request CRUD and customer response |
| `/api/payments`        | Order creation, verification, and payment status |
| `/api/ratings`         | Rating submission and retrieval |
| `/api/notifications`   | Notification listing and read-status updates |
| `/api/disputes`        | Dispute creation and status management |
| `/api/upload`          | Image upload via Cloudinary |
| `/api/users`           | User profile retrieval and device token registration |
| `/api/admin/*`         | Admin panel endpoints (users, KYC, disputes, analytics, etc.) |

#### 4.3.2 Database

| Attribute   | Detail |
|------------|--------|
| DBMS       | PostgreSQL 15+ |
| ORM        | Prisma (with `@prisma/client` and `@prisma/adapter-pg`) |
| Connection | Connection string via `DATABASE_URL` environment variable |
| Migrations | Prisma Migrate (`npx prisma migrate dev` / `npx prisma migrate deploy`) |

#### 4.3.3 Payment Gateway (Razorpay)

| Attribute    | Detail |
|-------------|--------|
| SDK         | `razorpay` Node.js SDK (server-side), `react-native-razorpay` (client-side) |
| API Version | v1 |
| Authentication | Key ID + Key Secret (server-side), Key ID (client-side) |
| Operations  | Order creation, payment verification via HMAC-SHA256 signature |

#### 4.3.4 Firebase Cloud Messaging

| Attribute     | Detail |
|--------------|--------|
| SDK          | `firebase-admin` (server-side) |
| Configuration | Service account JSON credentials |
| Operations   | Send single notification, send multicast (multiple device tokens) |
| Payload      | Notification (title, body) + Data (custom key-value pairs) |

### 4.4 Communication Interfaces

#### 4.4.1 REST API (HTTP/HTTPS)

All client-server communication for CRUD operations uses REST over HTTP/HTTPS. Requests include a Bearer token in the Authorization header. Responses use standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500).

#### 4.4.2 WebSocket (Socket.io)

Real-time bidirectional communication for live features:

| Event                | Direction         | Purpose |
|---------------------|-------------------|---------|
| `user:join`          | Client → Server   | Subscribe to user-specific notification room |
| `bidding:join`       | Client → Server   | Subscribe to a job's bidding room |
| `bidding:leave`      | Client → Server   | Unsubscribe from a job's bidding room |
| `bid:new`            | Server → Client   | New bid received on a watched job |
| `bid:accepted`       | Server → Client   | A bid was selected by the customer |
| `notification:new`   | Server → Client   | New notification for the user |
| `job:update`         | Server → Client   | Job status changed |
| `modification:new`   | Server → Client   | New modification request on a job |
| `chat:join`          | Client → Server   | Subscribe to a job's chat room |
| `chat:leave`         | Client → Server   | Unsubscribe from a job's chat room |
| `chat:message`       | Server → Client   | New chat message in a job's chat room |
| `chat:typing`        | Bidirectional      | Typing indicator in chat |
| `chat:read`          | Server → Client   | Messages marked as read by the other party |
| `chat:newMessage`    | Server → Client   | New message notification (user-specific room) |
| `location:update`    | Client → Server   | Provider sends GPS coordinates |
| `location:provider`  | Server → Client   | Customer receives provider location update |

Socket.io is configured with CORS support matching the REST API's allowed origins. The server uses HTTP polling as a fallback transport when WebSocket connections cannot be established.

---

## 5. System Architecture

### 5.1 Architectural Overview

VEXA follows a **three-tier client-server architecture** with a real-time communication layer:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                            │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────────────┐  │
│  │   Mobile Application │         │      Admin Panel (Web)       │  │
│  │   (React Native)     │         │      (Next.js)               │  │
│  │                      │         │                              │  │
│  │  • Customer Views    │         │  • User Management           │  │
│  │  • Provider Views    │         │  • KYC Verification          │  │
│  │  • Shared Views      │         │  • Dispute Resolution        │  │
│  │  • Socket.io Client  │         │  • Analytics Dashboard       │  │
│  └──────────┬───────────┘         └──────────────┬───────────────┘  │
│             │                                    │                  │
└─────────────┼────────────────────────────────────┼──────────────────┘
              │  HTTPS/REST + WebSocket            │  HTTPS/REST
              │                                    │
┌─────────────┼────────────────────────────────────┼──────────────────┐
│             ▼            APPLICATION TIER         ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 Node.js / Express Server                     │   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐  │   │
│  │  │ REST API   │  │ Socket.io    │  │ Better Auth         │  │   │
│  │  │ Routes     │  │ Server       │  │ Handler             │  │   │
│  │  │            │  │              │  │                     │  │   │
│  │  │ /api/jobs  │  │ Bidding Rooms│  │ /api/auth/*         │  │   │
│  │  │ /api/bids  │  │ User Rooms   │  │ Session Management  │  │   │
│  │  │ /api/pay.. │  │ Broadcasts   │  │ OAuth Handlers      │  │   │
│  │  └────────────┘  └──────────────┘  └─────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                  Middleware Layer                      │   │   │
│  │  │  • CORS  • Helmet  • JSON Parser  • Auth Middleware   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                              ▼          DATA TIER                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              PostgreSQL Database                          │      │
│  │              (via Prisma ORM)                             │      │
│  │                                                           │      │
│  │  Tables: users, service_requests, bids, job_modifications,│      │
│  │  payments, ratings, disputes, notifications, audit_logs,  │      │
│  │  kyc_documents, bid_anomalies, admin_sessions, etc.       │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌────────────────┐  ┌─────────────┐  ┌──────────────────────┐     │
│  │   Razorpay     │  │  Firebase   │  │    Cloudinary        │     │
│  │   Gateway      │  │  FCM        │  │    Media Storage     │     │
│  └────────────────┘  └─────────────┘  └──────────────────────┘     │
│                       EXTERNAL SERVICES                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Frontend Architecture (React Native)

The mobile application is structured into the following layers:

| Layer        | Directory     | Responsibility |
|-------------|---------------|----------------|
| Screens     | `src/screens/` | UI components for each page, organized by role (`customer/`, `provider/`) and shared screens |
| Components  | `src/components/` | Reusable UI components (buttons, cards, modals, headers) |
| Navigation  | `src/navigation/` | React Navigation stack and tab navigators with role-based routing |
| Services    | `src/services/` | API client (Axios), authentication service, Socket.io client, upload service, payment service |
| Store       | `src/store/` | Zustand state management for global app state (auth, notifications, jobs) |
| Theme       | `src/theme/` | Design tokens, color palettes, typography |
| Types       | `src/types/` | TypeScript interfaces and type definitions |
| Utils       | `src/utils/` | Helper functions and utilities |
| Config      | `src/config/` | Environment configuration and constants |

### 5.3 Backend Architecture (Node.js + Express)

| Layer        | Directory        | Responsibility |
|-------------|------------------|----------------|
| Entry Point | `src/index.ts`   | Express app setup, middleware chain, Socket.io initialization, route mounting |
| Routes      | `src/routes/`    | Express routers for each domain (auth, jobs, bids, payments, etc.) |
| Admin Routes| `src/routes/admin/` | Admin-specific routers (users, KYC, disputes, analytics, etc.) |
| Middleware  | `src/middleware/` | Authentication verification, role-based authorization, input validation |
| Libraries   | `src/lib/`       | Configuration modules (Prisma client, Razorpay client, Firebase admin, Socket.io instance, email transport, Better Auth config) |
| Utilities   | `src/utils/`     | Helper functions, admin bootstrapping |
| Config      | `src/config/`    | Environment variable parsing and validation |

### 5.4 Real-Time System (Socket.io)

The Socket.io server is attached to the same HTTP server instance as Express. It manages two categories of rooms:

1. **User Rooms** (`user:{userId}`) — Each authenticated user joins their personal room upon connection. Used for delivering notifications and personal updates.
2. **Bidding Rooms** (`bidding:{jobId}`) — Clients subscribe to specific jobs to receive live bid updates. Subscriptions are ephemeral and scoped to the bidding screen lifecycle.

The `io` instance is stored via a singleton module (`src/lib/socket.ts`) and accessed by route handlers to emit events after database mutations.

**Additional Room Types:**
3. **Chat Rooms** (`chat:{jobId}`) — Customer and provider join a shared chat room for the duration of an active job. Used for delivering messages, typing indicators, and read receipts.
4. **Location Rooms** — Provider location updates are broadcast to the customer's user room for live tracking.

### 5.5 Database Layer (PostgreSQL + Prisma)

The Prisma ORM provides:
- **Type-safe queries** — All database operations are fully typed, eliminating runtime SQL errors.
- **Migration management** — Schema changes are version-controlled via `prisma/migrations/`.
- **Relationship handling** — Prisma handles JOINs, eager loading, and cascading deletes based on schema-defined relations.
- **Connection pooling** — The Prisma client manages connection pooling internally via the `@prisma/adapter-pg` PostgreSQL adapter.

---

## 6. Functional Requirements

The following requirements are uniquely numbered and grouped by feature area. Priority levels: **P0** (Critical), **P1** (High), **P2** (Medium), **P3** (Low).

### 6.1 Authentication & User Management

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR1  | The system shall allow users to register with email, name, password, and role (CUSTOMER or PROVIDER). | P0 |
| FR2  | The system shall hash user passwords using bcrypt before database storage. | P0 |
| FR3  | The system shall allow users to sign in via Google OAuth 2.0. | P1 |
| FR4  | The system shall issue JWT-based session tokens upon successful authentication. | P0 |
| FR5  | The system shall reject authentication attempts when the account status is SUSPENDED or BANNED. | P0 |
| FR6  | The system shall allow users to request a password reset via email. | P1 |
| FR7  | The system shall generate single-use, time-limited (1 hour) password reset tokens. | P1 |
| FR8  | The system shall allow users to update their profile (name, phone, avatar). | P2 |
| FR9  | The system shall allow users to change their password (requiring current password verification). | P1 |
| FR10 | The system shall store and manage multiple device tokens per user for push notification delivery. | P1 |

### 6.2 Job Management

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR11 | The system shall allow customers to create service requests with title, description, category, location, images, urgency, and optional scheduling. | P0 |
| FR12 | The system shall assign a unique, human-readable order ID to each service request. | P0 |
| FR13 | The system shall capture and store GPS coordinates (latitude, longitude) with each job posting. | P1 |
| FR14 | The system shall support image uploads (via Cloudinary) for job descriptions. | P1 |
| FR15 | The system shall allow customers to view their jobs filtered by status (active, completed, cancelled). | P0 |
| FR16 | The system shall allow providers to browse available jobs in `POSTED` or `BIDDING` status. | P0 |
| FR17 | The system shall enforce valid status transitions (e.g., `POSTED` → `BIDDING` → `ACCEPTED` → `ON_SITE_INSPECTION` → `IN_PROGRESS` → `COMPLETED` → `PAYMENT_PENDING` → `PAID`). | P0 |
| FR18 | The system shall allow customers to cancel jobs that have not yet been accepted. | P1 |

### 6.3 Bidding

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR19 | The system shall allow providers to submit bids with amount, message, and estimated duration. | P0 |
| FR20 | The system shall enforce a unique constraint — one bid per provider per job. | P0 |
| FR21 | The system shall broadcast new bids in real time to all clients in the corresponding bidding room via Socket.io. | P0 |
| FR22 | The system shall allow customers to select a bid, marking it as accepted and assigning the provider to the job. | P0 |
| FR23 | The system shall transition the job status from `BIDDING` to `ACCEPTED` upon bid selection. | P0 |
| FR24 | The system shall send a push notification to the selected provider when their bid is accepted. | P1 |
| FR25 | The system shall allow providers to update their bid amount before selection. | P2 |

### 6.4 Modifications

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR26 | The system shall allow the selected provider to submit modification requests with a reason, revised price, and optional evidence images. | P0 |
| FR27 | The system shall enforce a maximum modification count per job (configurable, default: 2). | P1 |
| FR28 | The system shall generate a security hash for each modification record to ensure data integrity. | P1 |
| FR29 | The system shall allow the customer to approve or reject a modification request. | P0 |
| FR30 | The system shall update the job's revised price upon customer approval of a modification. | P0 |
| FR31 | The system shall send notifications to the relevant party upon modification submission, approval, or rejection. | P1 |

### 6.5 Payments

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR32 | The system shall create Razorpay payment orders with the correct amount based on the final (original or revised) job price. | P0 |
| FR33 | The system shall verify Razorpay payment signatures using HMAC-SHA256 before marking payments as completed. | P0 |
| FR34 | The system shall support cash payment as an alternative payment method. | P1 |
| FR35 | The system shall track payment status transitions: PENDING → PROCESSING → COMPLETED/FAILED/REFUNDED. | P0 |
| FR36 | The system shall transition the job status to `PAID` upon successful payment verification. | P0 |
| FR37 | The system shall store Razorpay order ID, payment ID, and signature for audit and reconciliation. | P0 |

### 6.6 Ratings

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR38 | The system shall allow both customer and provider to rate each other after job completion. | P1 |
| FR39 | The system shall enforce ratings on a 1–5 integer scale with a mandatory written review. | P1 |
| FR40 | The system shall prevent duplicate ratings (one per rater per job). | P1 |
| FR41 | The system shall send a notification to the ratee upon receiving a new rating. | P2 |

### 6.7 Notifications

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR42 | The system shall persist all notifications in the database with type, title, body, and read status. | P0 |
| FR43 | The system shall deliver notifications in real time via Socket.io to connected clients. | P0 |
| FR44 | The system shall deliver push notifications via Firebase Cloud Messaging to offline clients. | P1 |
| FR45 | The system shall allow users to mark notifications as read. | P2 |
| FR46 | The system shall support paginated notification retrieval. | P2 |

### 6.8 Disputes

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR47 | The system shall allow customers and providers to raise disputes on jobs with a reason and evidence images. | P1 |
| FR48 | The system shall transition the job status to `UNDER_DISPUTE` when a dispute is opened. | P1 |
| FR49 | The system shall allow administrators to review and resolve disputes with decisions (refund, partial settlement, reject). | P1 |
| FR50 | The system shall notify both parties of dispute resolution outcomes. | P1 |

### 6.9 Admin Operations

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR51 | The system shall provide a separate admin authentication flow with refresh-token–based sessions. | P0 |
| FR52 | The system shall allow admins to search, filter, and paginate user listings. | P1 |
| FR53 | The system shall allow admins to suspend or ban user accounts with documented reasons. | P1 |
| FR54 | The system shall provide a KYC document review workflow (approve/reject with remarks). | P1 |
| FR55 | The system shall automatically detect and flag bid anomalies (rapid rebid, extreme undercut, collusion patterns). | P2 |
| FR56 | The system shall record all administrative actions in an audit log with before/after state snapshots. | P0 |
| FR57 | The system shall allow admins to send targeted notification campaigns. | P2 |
| FR58 | The system shall provide analytics dashboards with aggregate platform metrics. | P2 |

### 6.10 In-App Chat & Messaging

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR59 | The system shall allow the customer and selected provider to exchange text and image messages within a job context. | P1 |
| FR60 | The system shall deliver chat messages in real time via Socket.io to connected clients. | P1 |
| FR61 | The system shall track message read status and broadcast read receipts. | P2 |
| FR62 | The system shall provide typing indicators between chat participants. | P3 |
| FR63 | The system shall restrict chat access to the customer and the selected provider for a given job. | P0 |
| FR64 | The system shall list all active conversations for a user with the most recent message and unread count. | P2 |
| FR65 | The system shall send push notifications for new messages when the recipient is offline. | P1 |

### 6.11 Platform Commission & Tax

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR66 | The system shall calculate platform commission as a configurable percentage of the payment amount (default: 10%). | P0 |
| FR67 | The system shall calculate GST on the commission amount at a configurable rate (default: 18%). | P0 |
| FR68 | The system shall compute the provider payout as: amount − commission − GST. | P0 |
| FR69 | The system shall store commission, GST, and payout breakdown on each payment record. | P0 |
| FR70 | The system shall apply the same commission logic to both online (Razorpay) and cash payments. | P1 |

### 6.12 Provider Skills & Category Matrix

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR71 | The system shall allow providers to register skills for one or more service categories. | P1 |
| FR72 | The system shall enforce a unique constraint — one skill record per provider per category. | P1 |
| FR73 | The system shall filter job broadcasts and listings to show only jobs matching the provider's registered skills. | P1 |
| FR74 | The system shall validate that a provider has the matching skill before allowing a bid submission. | P1 |
| FR75 | The system shall allow administrators to verify provider skills. | P2 |
| FR76 | The system shall support bulk skill registration for convenience. | P3 |

### 6.13 Cancellation Policy & Penalties

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR77 | The system shall allow customers and providers to cancel jobs with a mandatory reason. | P1 |
| FR78 | The system shall apply tiered cancellation fees: 0% pre-bid, 10% post-acceptance, 25% post-arrival. | P1 |
| FR79 | The system shall apply a rating penalty to providers who cancel after accepting. | P1 |
| FR80 | The system shall record all cancellations with fee and penalty details. | P1 |
| FR81 | The system shall prevent cancellation of completed, paid, or already cancelled jobs. | P0 |
| FR82 | The system shall notify both parties upon cancellation with fee details. | P1 |

### 6.14 Advanced Provider Profiles & Portfolios

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR83 | The system shall allow providers to add a bio, skill details, and portfolio of past work samples. | P1 |
| FR84 | The system shall display enhanced profiles with completed jobs count, average rating, total earnings, and verified badges. | P1 |
| FR85 | The system shall support portfolio CRUD operations (create, read, delete) with image uploads. | P2 |
| FR86 | The system shall show an availability status indicator on provider profiles. | P2 |

### 6.15 Live Location Tracking

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR87 | The system shall allow providers to send periodic GPS location updates during active jobs. | P1 |
| FR88 | The system shall store the latest provider location on the service request record. | P1 |
| FR89 | The system shall deliver real-time location updates to the customer via Socket.io. | P1 |
| FR90 | The system shall calculate estimated distance and ETA using the Haversine formula. | P2 |
| FR91 | The system shall restrict location tracking to jobs in ACCEPTED, ON_SITE_INSPECTION, or IN_PROGRESS status. | P0 |

### 6.16 Provider Availability & Scheduling

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR92 | The system shall allow providers to set a weekly availability schedule (start/end time per day). | P1 |
| FR93 | The system shall support an online/offline/busy toggle for providers. | P1 |
| FR94 | The system shall filter job visibility based on provider availability status. | P1 |
| FR95 | The system shall allow providers to block specific days. | P2 |

### 6.17 Job Search & Radius Filtering

| ID   | Requirement | Priority |
|------|-------------|----------|
| FR96 | The system shall support filtering jobs by GPS-based radius (default: 10 km). | P1 |
| FR97 | The system shall calculate distance between provider location and job location using the Haversine formula. | P1 |
| FR98 | The system shall support filtering by minimum and maximum price. | P2 |
| FR99 | The system shall support sorting jobs by distance, price (ascending/descending), and recency. | P2 |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID    | Requirement | Metric |
|-------|-------------|--------|
| NFR1  | Real-time bid updates shall be delivered to connected clients within 500ms of server-side processing. | Latency ≤ 500ms (p95) |
| NFR2  | API response time for standard CRUD operations shall not exceed 300ms under normal load. | Latency ≤ 300ms (p95) |
| NFR3  | The system shall support at least 500 concurrent WebSocket connections per server instance. | 500 connections |
| NFR4  | Image uploads shall complete within 5 seconds for files up to 10MB. | Upload time ≤ 5s |
| NFR5  | Database queries shall be optimized with indexes on frequently queried columns (foreign keys, status fields, timestamps). | Query time ≤ 100ms |

### 7.2 Security

| ID    | Requirement |
|-------|-------------|
| NFR6  | All passwords shall be hashed using bcrypt with a minimum cost factor of 10. |
| NFR7  | All API endpoints (except health checks and public auth endpoints) shall require a valid session token. |
| NFR8  | Payment verification shall use HMAC-SHA256 signature comparison to prevent tampering. |
| NFR9  | Admin endpoints shall enforce role-based access control, restricting access to ADMIN-role users only. |
| NFR10 | The API shall implement CORS restrictions, accepting requests only from explicitly allowed origins. |
| NFR11 | HTTP security headers shall be set via Helmet.js (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.). |
| NFR12 | Sensitive data (API keys, database credentials, payment secrets) shall be stored in environment variables, never in source code. |

### 7.3 Scalability

| ID    | Requirement |
|-------|-------------|
| NFR13 | The backend shall be stateless (no in-memory session storage outside Socket.io rooms) to support horizontal scaling behind a load balancer. |
| NFR14 | The database schema shall support partitioning of high-volume tables (notifications, audit_logs) for future performance optimization. |
| NFR15 | The Socket.io server shall support Redis adapter integration for multi-instance deployments. |

### 7.4 Reliability

| ID    | Requirement |
|-------|-------------|
| NFR16 | The system shall gracefully handle external service failures (Razorpay, FCM, Cloudinary) without crashing — errors shall be caught, logged, and returned as appropriate HTTP error responses. |
| NFR17 | Database mutations involving multiple tables (e.g., bid selection, payment verification) shall be wrapped in transactions to maintain data consistency. |
| NFR18 | The system shall provide health check endpoints (`/api/health` and `/api/health/db`) for monitoring and automated recovery. |

### 7.5 Availability

| ID    | Requirement |
|-------|-------------|
| NFR19 | The system shall target 99.5% uptime measured on a monthly basis. |
| NFR20 | Deployment shall support zero-downtime updates via rolling deployments. |

### 7.6 Usability

| ID    | Requirement |
|-------|-------------|
| NFR21 | The mobile application shall follow platform-specific design guidelines (Material Design for Android, Human Interface Guidelines for iOS). |
| NFR22 | The application shall provide clear error messages — no raw error codes or stack traces shall be shown to end users. |
| NFR23 | The application shall support offline detection and display a dedicated "No Network" screen when connectivity is lost. |
| NFR24 | Form inputs shall provide inline validation feedback before submission. |

### 7.7 Maintainability

| ID    | Requirement |
|-------|-------------|
| NFR25 | The codebase shall use TypeScript throughout (frontend and backend) for compile-time type safety. |
| NFR26 | Database schema changes shall be managed exclusively through Prisma migrations, ensuring reproducible environments. |
| NFR27 | The project shall maintain a clear separation of concerns: routes, middleware, libraries, and utilities reside in dedicated directories. |
| NFR28 | API endpoints shall follow consistent naming conventions and response formats. |

---

## 8. Database Design

### 8.1 Entity Descriptions

| Entity | Table Name | Description |
|--------|-----------|-------------|
| **User** | `users` | All platform users — customers, providers, and administrators. Stores credentials, profile data, role, account status, KYC metadata, and device tokens. |
| **ServiceRequest** | `service_requests` | Jobs posted by customers. Contains title, description, category, location coordinates, images, pricing, urgency, scheduling, status, and foreign keys to the customer and selected provider. |
| **Bid** | `bids` | Price proposals submitted by providers on service requests. Stores amount, message, estimated duration, and selection flag. Unique on `[jobId, providerId]`. |
| **JobModification** | `job_modifications` | Revision proposals submitted by the selected provider. Contains before/after pricing, reason, evidence images, approval status, and an integrity hash. |
| **Payment** | `payments` | Financial transactions between customer (payer) and provider (payee). Tracks amount, currency, method, Razorpay identifiers, status, and security hash. |
| **Rating** | `ratings` | Mutual reviews between job participants. Stores score (1–5), review text, and references to the rater and ratee. Unique on `[jobId, raterId]`. |
| **Dispute** | `disputes` | Conflict records raised by either party. Contains reason, evidence array, status lifecycle, and reference to the resolving administrator. |
| **Notification** | `notifications` | In-app and push notification records. Stores type (enum), title, body, structured data payload, and read status. Indexed on `[userId, isRead]`. |
| **AuditLog** | `audit_logs` | Immutable records of administrative actions. Captures entity type/ID, action, performing admin, and before/after state snapshots. |
| **KycDocument** | `kyc_documents` | Identity documents submitted by providers for verification. Stores file references, document type (Aadhaar, PAN), review status, and reviewer information. |
| **BidAnomaly** | `bid_anomalies` | Automatically detected suspicious bidding patterns. Records anomaly type, severity score, status, and reviewer assignment. |
| **DisputeResolution** | `dispute_resolutions` | Formal decisions on disputes. Records the decision type (refund, partial, reject), refund amount, and resolving administrator. |
| **Session** | `session` | Better Auth session records with token, expiration, IP address, and user agent. |
| **Account** | `account` | OAuth provider account linkages managed by Better Auth. |
| **Verification** | `verification` | Email verification tokens managed by Better Auth. |
| **PasswordResetToken** | `password_reset_tokens` | Custom password reset tokens with expiry and used status. |
| **AdminSession** | `admin_sessions` | Dedicated admin authentication sessions with refresh token hashes and revocation support. |
| **PaymentActionLog** | `payment_action_logs` | Audit trail for admin actions on payments (refunds, status changes). |
| **KycReviewLog** | `kyc_review_logs` | Audit trail for KYC document review actions. |
| **NotificationCampaign** | `notification_campaigns` | Records of admin-initiated notification broadcasts with delivery statistics. |
| **ChatMessage** | `chat_messages` | In-app messages between customer and provider within a job context. Indexed on `[jobId, createdAt]`. |
| **ProviderSkill** | `provider_skills` | Provider skill registrations per service category. Unique on `[providerId, category]`. |
| **Cancellation** | `cancellations` | Records of job cancellations with fee details, penalty flags, and reason. Indexed on `[jobId]`. |
| **PortfolioItem** | `portfolio_items` | Provider work samples with title, description, image, and category. Indexed on `[providerId]`. |
| **ProviderAvailability** | `provider_availability` | Weekly availability schedule per provider. Unique on `[providerId, dayOfWeek]`. |

### 8.2 Entity Relationships

```
User (1) ──────< (M) ServiceRequest          [Customer posts jobs]
User (1) ──────< (M) ServiceRequest          [Provider selected for jobs]
User (1) ──────< (M) Bid                     [Provider places bids]
ServiceRequest (1) ──────< (M) Bid           [Job receives bids]
ServiceRequest (1) ──────< (M) JobModification [Job has modifications]
User (1) ──────< (M) JobModification         [Provider submits modifications]
ServiceRequest (1) ──────< (M) Payment       [Job has payments]
User (1) ──────< (M) Payment                 [Payer makes payments]
User (1) ──────< (M) Payment                 [Payee receives payments]
ServiceRequest (1) ──────< (M) Rating        [Job has ratings]
User (1) ──────< (M) Rating                  [Rater gives ratings]
User (1) ──────< (M) Rating                  [Ratee receives ratings]
ServiceRequest (1) ──────< (M) Dispute       [Job has disputes]
User (1) ──────< (M) Dispute                 [User raises disputes]
Dispute (1) ──────< (M) DisputeResolution    [Dispute has resolutions]
User (1) ──────< (M) Notification            [User receives notifications]
User (1) ──────< (M) AuditLog               [Admin performs actions]
User (1) ──────< (M) KycDocument             [Provider submits documents]
Bid (1) ──────< (M) BidAnomaly              [Bid flagged with anomalies]
Payment (1) ──────< (M) PaymentActionLog     [Payment has admin action logs]
KycDocument (1) ──────< (M) KycReviewLog     [Document has review history]
ServiceRequest (1) ──────< (M) ChatMessage    [Job has chat messages]
User (1) ──────< (M) ChatMessage               [Sender sends messages]
User (1) ──────< (M) ChatMessage               [Receiver receives messages]
User (1) ──────< (M) ProviderSkill             [Provider registers skills]
User (1) ──────< (M) Cancellation               [User cancels jobs]
ServiceRequest (1) ──────< (M) Cancellation    [Job has cancellations]
User (1) ──────< (M) PortfolioItem             [Provider showcases portfolio]
User (1) ──────< (M) ProviderAvailability      [Provider sets availability]
```

### 8.3 Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `notifications` | `[userId, isRead]` | Fast retrieval of unread notifications per user |
| `audit_logs` | `[entityType, entityId]` | Quick lookup of all actions on a specific entity |
| `kyc_documents` | `[userId, status]`, `[status, createdAt]` | Filter documents by owner or review queue |
| `bid_anomalies` | `[jobId, status]`, `[providerId, status]` | Anomaly dashboard queries |
| `session` | `[userId]` | Session lookup by user |
| `admin_sessions` | `[adminId, expiresAt]`, `[refreshTokenHash]` | Admin session validation |
| `bids` | `[jobId, providerId]` (unique) | Enforce one bid per provider per job |
| `ratings` | `[jobId, raterId]` (unique) | Enforce one rating per rater per job |
| `chat_messages` | `[jobId, createdAt]`, `[senderId, receiverId]` | Fast retrieval of messages per job |
| `provider_skills` | `[providerId, category]` (unique), `[category]` | Skill lookup and enforcement |
| `cancellations` | `[jobId]` | Cancellation lookup per job |
| `portfolio_items` | `[providerId]` | Portfolio items per provider |
| `provider_availability` | `[providerId, dayOfWeek]` (unique) | Availability schedule per provider |

---

## 9. UML Diagrams (Descriptive)

### 9.1 Use Case Diagram

The Use Case Diagram identifies three primary actors and their interactions with the system:

**Actors:** Customer, Service Provider, Administrator.

**Customer Use Cases:**
- Register / Login (includes Google OAuth)
- Post Service Request
- View Live Bids
- Select Provider
- Approve / Reject Modification
- Make Payment
- Rate Provider
- Raise Dispute
- View Notifications

**Service Provider Use Cases:**
- Register / Login
- Browse Available Jobs
- Submit Bid
- Perform On-Site Inspection
- Request Modification
- Complete Job
- Receive Payment
- Rate Customer
- View Notifications

**Administrator Use Cases:**
- Admin Login
- Manage Users (Suspend, Ban, Activate)
- Review KYC Documents
- Resolve Disputes
- Monitor Bid Anomalies
- Manage Payments (Refunds)
- View Analytics
- Send Notification Campaigns
- View Audit Logs

**Relationships:**
- "Register / Login" is an include relationship for all user actions (precondition).
- "Raise Dispute" extends from "Rate Provider" (alternative flow when dissatisfied).
- "Request Modification" extends from "Perform On-Site Inspection" (conditional flow).

---

### 9.2 Class Diagram

The Class Diagram maps the domain model to the Prisma schema entities:

**Core Classes:**

- **User** — Properties: id, email, name, password, googleId, avatarUrl, phone, role (CUSTOMER|PROVIDER|ADMIN), adminRole, accountStatus, kycStatus, deviceTokens. Methods: register(), login(), updateProfile(), changePassword().

- **ServiceRequest** — Properties: id, orderId, customerId, title, description, category, location, latitude, longitude, images, originalPrice, urgency, revisedPrice, status, scheduledAt, maxModifications, modificationCount. Methods: create(), updateStatus(), cancel(). Associations: belongs to User (customer), has many Bids, has many JobModifications, has many Payments, has many Ratings, has many Disputes.

- **Bid** — Properties: id, jobId, providerId, amount, message, estimatedDuration, isSelected. Methods: submit(), select(), update(). Associations: belongs to ServiceRequest, belongs to User (provider).

- **JobModification** — Properties: id, jobId, providerId, revisionReason, originalPrice, revisedPrice, revisionImages, approvalStatus, securityHash. Methods: submit(), approve(), reject(). Associations: belongs to ServiceRequest, belongs to User (provider).

- **Payment** — Properties: id, jobId, payerId, payeeId, amount, currency, status, paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature, securityHash. Methods: createOrder(), verify(), processRefund(). Associations: belongs to ServiceRequest, belongs to User (payer), belongs to User (payee).

- **Rating** — Properties: id, jobId, raterId, rateeId, score, review. Methods: submit(). Associations: belongs to ServiceRequest, belongs to User (rater), belongs to User (ratee).

- **Dispute** — Properties: id, jobId, raisedById, reason, evidence, status, resolution, resolvedById. Methods: raise(), resolve(). Associations: belongs to ServiceRequest, belongs to User (raiser), has many DisputeResolutions.

- **Notification** — Properties: id, userId, type, title, body, data, isRead. Methods: create(), markAsRead(). Associations: belongs to User.

**Enumerations:** UserRole, AdminRole, AccountStatus, JobStatus, ApprovalStatus, PaymentStatus, DisputeStatus, NotificationType, KycDocumentType, KycDocumentStatus, BidAnomalyType, BidAnomalyStatus, DisputeDecision.

---

### 9.3 Sequence Diagram

#### Real-Time Bidding Sequence

```
Customer                Mobile App              Backend API             Socket.io Server        Database             Provider App            Provider
   │                       │                       │                       │                     │                      │                      │
   │  Post Job             │                       │                       │                     │                      │                      │
   │──────────────────────>│  POST /api/jobs        │                       │                     │                      │                      │
   │                       │──────────────────────>│  Validate & Insert     │                     │                      │                      │
   │                       │                       │──────────────────────────────────────────────>│                      │                      │
   │                       │                       │  Emit job:new          │                     │                      │                      │
   │                       │                       │──────────────────────>│  Broadcast to rooms   │                      │                      │
   │                       │                       │                       │─────────────────────────────────────────────>│  New Job Available    │
   │                       │                       │                       │                     │                      │──────────────────────>│
   │                       │  201 Created           │                       │                     │                      │                      │
   │<──────────────────────│<──────────────────────│                       │                     │                      │                      │
   │                       │                       │                       │                     │                      │                      │
   │  Open Bidding Screen  │                       │                       │                     │                      │                      │
   │──────────────────────>│  bidding:join(jobId)   │                       │                     │                      │                      │
   │                       │─────────────────────────────────────────────>│  Join Room            │                      │                      │
   │                       │                       │                       │                     │                      │                      │
   │                       │                       │                       │                     │                      │  Submit Bid           │
   │                       │                       │                       │                     │                      │<──────────────────────│
   │                       │                       │  POST /api/bids        │                     │                      │                      │
   │                       │                       │<──────────────────────────────────────────────────────────────────────│                      │
   │                       │                       │  Validate & Insert     │                     │                      │                      │
   │                       │                       │──────────────────────────────────────────────>│                      │                      │
   │                       │                       │  Emit bid:new          │                     │                      │                      │
   │                       │                       │──────────────────────>│  To bidding:{jobId}   │                      │                      │
   │                       │  bid:new event         │                       │                     │                      │                      │
   │<──────────────────────│<─────────────────────────────────────────────│                     │                      │                      │
   │  See new bid live     │                       │                       │                     │                      │                      │
```

#### Payment Verification Sequence

1. Customer initiates payment → App sends `POST /api/payments/create-order` → Backend creates Razorpay order → Returns order ID to app.
2. App opens Razorpay checkout with order ID → User completes payment on Razorpay.
3. Razorpay returns payment ID and signature to app callback → App sends `POST /api/payments/verify` with order ID, payment ID, and signature.
4. Backend computes expected signature using HMAC-SHA256(order_id + "|" + payment_id, key_secret) → Compares with received signature → If match: payment COMPLETED, job PAID → Notifications to both parties.

---

### 9.4 Component Diagram

The system is composed of the following deployable components:

```
┌──────────────────────────────────────────────────────────┐
│                    VEXA Platform                          │
│                                                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  Mobile App      │  │  Admin Panel                 │  │
│  │  (React Native)  │  │  (Next.js)                   │  │
│  │                  │  │                              │  │
│  │  ◦ Auth Module   │  │  ◦ Auth Module               │  │
│  │  ◦ Job Module    │  │  ◦ User Mgmt Module          │  │
│  │  ◦ Bid Module    │  │  ◦ KYC Module                │  │
│  │  ◦ Payment Module│  │  ◦ Dispute Module            │  │
│  │  ◦ Socket Client │  │  ◦ Analytics Module          │  │
│  │  ◦ Notification  │  │  ◦ Notification Module       │  │
│  └────────┬─────────┘  └──────────────┬───────────────┘  │
│           │                           │                  │
│           ▼                           ▼                  │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Backend Server                         │    │
│  │            (Node.js + Express + Socket.io)        │    │
│  │                                                   │    │
│  │  ◦ Auth Routes      ◦ Admin Routes               │    │
│  │  ◦ Job Routes        ◦ Upload Routes              │    │
│  │  ◦ Bid Routes        ◦ User Routes                │    │
│  │  ◦ Payment Routes    ◦ Notification Routes        │    │
│  │  ◦ Rating Routes     ◦ Dispute Routes             │    │
│  │  ◦ Modification Routes                            │    │
│  │  ◦ Socket.io Server                               │    │
│  │  ◦ Better Auth Handler                            │    │
│  │  ◦ Middleware Pipeline                            │    │
│  └────────┬──────────────────────────────────────────┘    │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  PostgreSQL       │  │ Razorpay   │  │ Firebase    │  │
│  │  (via Prisma)     │  │ Gateway    │  │ FCM         │  │
│  └──────────────────┘  └────────────┘  └─────────────┘  │
│                                                          │
│                        ┌─────────────┐                   │
│                        │ Cloudinary   │                   │
│                        │ Storage      │                   │
│                        └─────────────┘                   │
└──────────────────────────────────────────────────────────┘
```

---

### 9.5 Deployment Diagram

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│     End User Devices          │     │     Admin Workstation         │
│                               │     │                               │
│  ┌─────────────────────────┐ │     │  ┌─────────────────────────┐ │
│  │  Android / iOS Device   │ │     │  │  Desktop Browser         │ │
│  │  VEXA Mobile App        │ │     │  │  Admin Panel (Next.js)   │ │
│  └──────────┬──────────────┘ │     │  └──────────┬──────────────┘ │
└─────────────┼────────────────┘     └─────────────┼────────────────┘
              │  HTTPS + WSS                       │  HTTPS
              ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Cloud Infrastructure                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Application Server (VPS / Cloud Instance)                 │  │
│  │                                                            │  │
│  │  ┌──────────────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Node.js Process     │  │  Next.js Process (Admin)   │  │  │
│  │  │  (Express + Socket)  │  │  Port 3001                 │  │  │
│  │  │  Port 3000           │  │                            │  │  │
│  │  └──────────┬───────────┘  └──────────┬─────────────────┘  │  │
│  │             │                         │                    │  │
│  └─────────────┼─────────────────────────┼────────────────────┘  │
│                │                         │                       │
│  ┌─────────────▼─────────────────────────▼────────────────────┐  │
│  │  PostgreSQL Database (Cloud-hosted)                         │  │
│  │  e.g., Neon, Supabase, AWS RDS                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │                    │                    │
              ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Razorpay        │ │  Firebase        │ │  Cloudinary      │
│  Payment Gateway │ │  Cloud Messaging │ │  Media CDN       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 10. End-to-End Workflow

The following describes the complete lifecycle of a service engagement on the VEXA platform, from initial signup through final rating.

### Step 1: User Registration & Login

A new user downloads the VEXA mobile app and registers with their email, name, and password, selecting either the CUSTOMER or PROVIDER role. Alternatively, they authenticate via Google OAuth. The backend validates the input, creates the user record, and issues a session token. For providers, the system prompts KYC document submission (Aadhaar/PAN) which enters a `PENDING` review queue for administrators.

### Step 2: Job Posting (Customer)

The customer navigates to the "Post Job" screen, fills in the service details (e.g., "Fix leaking kitchen faucet"), selects a category (Plumbing), enters or auto-detects their location via GPS, attaches photographs of the issue, sets urgency to NORMAL, and optionally schedules a preferred date. Upon submission, the job is created with status `POSTED` and a unique order ID (e.g., `VX-A3F29B71`) is generated.

### Step 3: Real-Time Bidding (Providers)

Available providers see the new job appear on their dashboard in real time (via Socket.io broadcast). Interested providers open the job details, review the description and images, and submit a bid specifying their price, approach, and estimated time. Each new bid is broadcast instantly to all clients watching that job. The customer sees bids appearing live on their LiveBiddingScreen, can compare amounts, review provider profiles and ratings, and make an informed selection.

### Step 4: Provider Selection (Customer)

The customer evaluates the received bids and selects a preferred provider. The system marks the bid as accepted, assigns the provider to the job, and transitions the status to `ACCEPTED`. The selected provider receives an immediate push notification. Other providers see a `bid:accepted` event indicating the bidding is closed.

### Step 5: On-Site Inspection (Provider)

The selected provider travels to the customer's location. Upon arrival, the provider updates the job status to `ON_SITE_INSPECTION`, triggering a notification to the customer. The provider physically assesses the work required.

### Step 6: Modification Request (If Needed)

If the provider discovers that the actual scope differs from the description — for example, the faucet leak is caused by corroded pipes requiring additional materials — the provider submits a modification request with a detailed explanation, revised price, and photographic evidence of the condition. The job transitions to `MODIFICATION_REQUESTED`, and the customer receives a notification.

The customer opens the RevisionApprovalScreen, reviews the proposal, and either approves (accepting the revised price, allowing the job to continue at the new cost) or rejects (the provider must proceed at the original price or the job may be cancelled).

### Step 7: Job Execution and Completion

The provider performs the service work. Upon completion, the provider uploads completion photographs and marks the job as `COMPLETED`. The system transitions the job to `PAYMENT_PENDING`.

### Step 8: Payment (Customer)

The customer is prompted to pay the final amount (which may be the original bid amount or the approved revised amount). The customer can choose:
- **Razorpay (Online):** The app opens the Razorpay checkout screen; the customer pays via UPI, card, or net banking. The backend verifies the payment signature and marks the transaction as completed.
- **Cash:** The provider confirms receipt of cash payment, and the backend records the cash transaction.

Upon successful payment, the job status transitions to `PAID`.

### Step 9: Mutual Rating

Both parties are prompted to rate each other. The customer rates the provider (quality, punctuality, professionalism) with a 1–5 star score and a written review. The provider rates the customer (communication, accuracy of description, respect). Ratings are visible on each user's profile and influence future selection decisions.

### Step 10: Dispute Resolution (If Necessary)

If either party is dissatisfied, they can raise a dispute from the job detail screen, providing a written reason and photographic evidence. The job transitions to `UNDER_DISPUTE`. An administrator reviews the dispute in the admin panel, examines the evidence, and issues a decision (full refund, partial settlement, or rejection). Both parties are notified of the resolution.

---

## 11. Security Considerations

### 11.1 Authentication Security

- Passwords are hashed using **bcrypt** with a minimum cost factor of 10, making brute-force attacks computationally infeasible.
- Session tokens are issued by **Better Auth** using industry-standard JWT encoding with expiration-based validity.
- Google OAuth integration uses the official `@react-native-google-signin/google-signin` library with server-side token verification.
- Password reset tokens are UUID-based, single-use, and expire after 1 hour. Tokens are stored hashed in the database.
- Admin sessions use a separate authentication flow with refresh token rotation and explicit revocation capability.

### 11.2 Authorization

- **Role-Based Access Control (RBAC):** Every protected endpoint checks the user's role before processing.
  - CUSTOMER endpoints: job posting, bid selection, modification response, payment, rating, dispute creation.
  - PROVIDER endpoints: bid submission, modification request, job status updates.
  - ADMIN endpoints: user management, KYC review, dispute resolution, analytics. Further restricted by `adminRole` (SUPER_ADMIN vs. MODERATOR).
- **Resource-Level Authorization:** Beyond role checks, the system verifies resource ownership — a customer can only manage their own jobs, a provider can only bid on jobs they are eligible for, etc.

### 11.3 Data Protection

- All client-server communication uses **HTTPS** (TLS 1.2+) in production, encrypting data in transit.
- **Helmet.js** sets security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and others.
- Sensitive configuration (database URLs, API keys, payment secrets) is stored in **environment variables** and excluded from version control via `.gitignore`.
- Database access is mediated through Prisma ORM with **parameterized queries**, eliminating SQL injection vulnerabilities.

### 11.4 Payment Security

- Razorpay integration uses **HMAC-SHA256 signature verification** on the server side. The signature is computed using the Razorpay key secret (never exposed to the client) and compared with the signature returned by the payment gateway.
- Payment records include a **security hash** for detecting post-processing data tampering.
- The Razorpay key secret is stored exclusively as a server-side environment variable; only the Razorpay key ID is used on the client side.
- Payment status transitions are validated server-side — the client cannot directly mark a payment as completed.

### 11.5 Fraud Detection and Platform Integrity

- The **Bid Anomaly Detection** system automatically flags suspicious bidding behavior:
  - `RAPID_REBID` — A provider updates their bid unusually quickly after another provider's bid (potential sniping).
  - `EXTREME_UNDERCUT` — A bid is significantly below the average for the job (potential bait-and-switch).
  - `COLLUSION_PATTERN` — Statistical patterns suggesting coordinated bidding between providers.
- Anomalies are assigned severity scores and surfaced to administrators for review.
- All administrative actions are recorded in tamper-evident **audit logs** with before/after state snapshots, administrator identity, and timestamps.
- KYC verification provides identity assurance for service providers before they can operate on the platform.
- Account suspension and banning features allow rapid response to identified bad actors.

---

## 12. Future Enhancements

### 12.1 AI-Based Provider Matching

Implement a machine learning recommendation engine that analyzes job descriptions, provider skills, historical performance, location proximity, and pricing patterns to suggest optimal provider-job matches. This could reduce the time-to-hire by pre-ranking providers and optionally auto-inviting top-matched providers to bid.

### 12.2 Advanced Analytics Dashboard

Expand the admin analytics module with:
- Predictive demand forecasting (which service categories will see increased demand).
- Provider performance scoring using weighted metrics (completion rate, average rating, response time).
- Revenue trend analysis with cohort breakdowns.
- Geospatial heat maps showing service demand distribution.

### 12.3 Multi-Region and Localization Support

Extend the platform beyond the Indian market:
- Multi-currency support with live exchange rate integration.
- Alternative payment gateways for different regions (Stripe, PayPal).
- Localized KYC document types per country.
- Multi-language interface support (Hindi, Telugu, Tamil, and other regional languages as a first step).

### 12.4 Recommendation and Personalization Engine

- Personalized job feed for providers based on their category expertise, location, and past bidding behavior.
- Smart pricing suggestions for providers based on historical job data in the same category and area.
- Customer-facing provider recommendations based on past interactions and ratings.

### 12.5 Subscription and Membership Tiers

Introduce a provider subscription model:
- **Free Tier** — Limited bids per month, standard visibility.
- **Premium Tier** — Unlimited bids, priority placement, verified badge, analytics access.
- **Enterprise Tier** — Multi-provider teams, dedicated account manager, API access.

### 12.6 Service Quality Assurance

- Post-job automated quality surveys sent to customers.
- Photo-based work verification using image comparison (before/after).
- Warranty tracking for completed jobs.
- Provider certification and training program integration.

### 12.7 Razorpay Route Integration for Automated Payouts

Integrate Razorpay Route for automated fund splitting — when a customer pays, the platform commission is automatically retained and the provider payout is transferred to their linked bank account without manual intervention.

---

## Appendix A: Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_URL` | Public URL of the backend for Better Auth |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth session encryption |
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK service account JSON |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins |
| `ADMIN_BOOTSTRAP_ENABLED` | Enable automatic super admin creation |
| `ADMIN_BOOTSTRAP_EMAIL` | Bootstrap admin email |
| `ADMIN_BOOTSTRAP_PASSWORD` | Bootstrap admin password |
| `PLATFORM_COMMISSION_RATE` | Platform commission rate (default: 0.10 = 10%) |
| `GST_RATE` | GST rate applied on commission (default: 0.18 = 18%) |
| `CANCELLATION_FEE_PRE_INSPECTION` | Cancellation fee rate before provider inspection (default: 0.10) |
| `CANCELLATION_FEE_POST_ARRIVAL` | Cancellation fee rate after provider arrival (default: 0.25) |
| `CANCELLATION_FLAT_FEE_PROVIDER` | Flat cancellation fee for provider cancellations (default: 200) |
| `LOCATION_UPDATE_INTERVAL` | Location tracking update interval in ms (default: 10000) |

---

## Appendix B: Status Transition Matrix

### Job Status Transitions

| From Status              | To Status                | Trigger |
|--------------------------|--------------------------|---------|
| `POSTED`                 | `BIDDING`                | First bid received |
| `POSTED`                 | `CANCELLED`              | Customer cancels |
| `BIDDING`                | `ACCEPTED`               | Customer selects a bid |
| `BIDDING`                | `CANCELLED`              | Customer cancels |
| `ACCEPTED`               | `ON_SITE_INSPECTION`     | Provider arrives on site |
| `ON_SITE_INSPECTION`     | `IN_PROGRESS`            | Provider begins work |
| `ON_SITE_INSPECTION`     | `MODIFICATION_REQUESTED` | Provider submits modification |
| `MODIFICATION_REQUESTED` | `IN_PROGRESS`            | Customer approves/rejects modification |
| `IN_PROGRESS`            | `MODIFICATION_REQUESTED` | Provider submits another modification |
| `IN_PROGRESS`            | `COMPLETED`              | Provider marks work done |
| `COMPLETED`              | `PAYMENT_PENDING`        | System transitions to payment phase |
| `PAYMENT_PENDING`        | `PAID`                   | Payment verified |
| Any active status        | `UNDER_DISPUTE`          | Dispute raised |
| `UNDER_DISPUTE`          | `PAID` / `CANCELLED`     | Dispute resolved |
| `ACCEPTED`               | `CANCELLED`              | Customer or provider cancels (with potential fee) |
| `ON_SITE_INSPECTION`     | `CANCELLED`              | Customer or provider cancels (post-arrival fee) |
| `IN_PROGRESS`            | `CANCELLED`              | Customer or provider cancels (post-arrival fee) |

### Payment Status Transitions

| From Status   | To Status    | Trigger |
|---------------|-------------|---------|
| `PENDING`     | `PROCESSING` | Razorpay order created |
| `PROCESSING`  | `COMPLETED`  | Signature verified |
| `PROCESSING`  | `FAILED`     | Verification failed or timeout |
| `COMPLETED`   | `REFUNDED`   | Admin processes refund |

---

*End of Document*

*This document is the intellectual property of the VEXA Development Team and is intended for authorized personnel only. Reproduction or distribution without written consent is prohibited.*
