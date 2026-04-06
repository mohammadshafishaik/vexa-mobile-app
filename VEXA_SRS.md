# Software Requirements Specification (SRS)
## Project VEXA: Real-Time Service Marketplace

### 1. Introduction
VEXA is a real-time mobile marketplace application that connects **Customers** needing household or professional services with **Service Providers** who bid on these requests. The platform facilitates end-to-end service management, from job posting and live bidding to on-site modifications, payments, and ratings.

### 2. Technology Stack
**Frontend (Mobile App)**
- **Framework:** React Native CLI (TypeScript)
- **UI/Styling:** NativeWind (Tailwind CSS), Tamagui, React Native Reanimated, Lottie (Animations)
- **State Management:** Zustand
- **Networking:** Axios, Socket.io-client
- **Navigation:** React Navigation

**Backend (API & WebSockets)**
- **Framework:** Node.js with Express (TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma v7 (with `@prisma/adapter-pg` for direct connections)
- **Real-time:** Socket.io
- **Security & Auth:** JSON Web Tokens (JWT), bcryptjs, Helmet, CORS

### 3. User Roles
1. **Customer:** Can post service requests, view live bids, accept bids, approve modifications, make payments, and rate providers.
2. **Provider:** Can browse available service requests, submit bids, request scope/price modifications upon inspection, track earnings, and receive ratings.

---

### 4. Functional Requirements

#### 4.1 Authentication & Profile
- **Registration:** Users register as either a Customer or a Provider, providing email, password, full name, and phone number. 
- **Login:** Users authenticate using email and password.
- **Tokens:** The system uses short-lived Access Tokens and long-lived Refresh Tokens for secure, persistent login sessions.

#### 4.2 Job / Service Management
- **Posting Jobs (Customer):** Customers can create a job with a title, description, category, location, and budget.
- **Browsing Jobs (Provider):** Providers see a real-time feed of available jobs (Status: `POSTED` or `BIDDING`).
- **Provider Dashboard:** Displays provider-specific statistics including Active jobs, Completed jobs, and Total Revenue Earned.
- **Customer Dashboard:** Displays a list of all jobs posted by the customer and their current statuses.

#### 4.3 Real-Time Bidding System
- **Placing Bids (Provider):** Providers submit a proposed price, estimated duration, and a message for a specific job.
- **Live Updates:** Bids are broadcasted in real-time to the specific job's "bidding room" via Socket.io.
- **Accepting Bids (Customer):** Customers review bids and select a winning provider. The job status transitions to `ACCEPTED`.

#### 4.4 Flow & Status Management
Jobs follow a strict state machine:
`POSTED` → `BIDDING` → `ACCEPTED` → `ON_SITE_INSPECTION` → (Optional: `MODIFICATION_REQUESTED`) → `IN_PROGRESS` → `PAYMENT_PENDING` → `PAID`.

#### 4.5 Scope Modifications (Revisions)
- **Request (Provider):** During the `ON_SITE_INSPECTION` phase, if the scope of work differs from the description, providers can request a revision (new price and reason). This creates a cryptographic hash of the request to ensure data integrity.
- **Approval (Customer):** The customer is notified and can review the modification. If approved, the job's `revisedPrice` is updated.

#### 4.6 Payments & Ratings
- **Payment Processing:** Once the job is completed (`PAYMENT_PENDING`), the customer triggers the payment flow, marking the job as `PAID`.
- **Ratings:** Customers can leave a 1-5 star rating and review for the provider once the job is paid.

#### 4.7 Notifications
- **In-App Notifications:** Real-time push events alert users to new bids, accepted bids, modification requests, and payments.
- **Unread Tracking:** The system tracks unread notifications, updating the total unread badge count, and allows marking all as read.

---

### 5. Database Schema (Prisma Models)
The system leverages a relational PostgreSQL database with the following core entities:
1. **User:** ID, Email, PasswordHash, Role (CUSTOMER/PROVIDER), Setup profile.
2. **ServiceRequest (Job):** Title, Description, Status, OriginalPrice, RevisedPrice, CustomerID, ProviderID.
3. **Bid:** JobID, ProviderID, Amount, Message, IsSelected.
4. **JobModification:** JobID, RequestedPrice, Reason, SecurityHash, Status (PENDING, APPROVED, REJECTED).
5. **Payment:** JobID, Amount, Status, TransactionID.
6. **Rating:** JobID, RaterID, RateeID, Score, Comment.
7. **Notification:** UserID, Title, Body, Type, IsRead.

---

### 6. REST API Endpoints

**Auth Routes (`/api/auth`)**
- `POST /register`: Register a new user
- `POST /login`: Authenticate and issue JWT tokens
- `POST /refresh`: Issue new access token using refresh token
- `GET /me`: Get current user profile

**Job Routes (`/api/jobs`)**
- `GET /`: List jobs (Role-aware filtering)
- `POST /`: Create a new job request
- `GET /:id`: View detailed job info including bids and modifications
- `PATCH /:id/status`: Update job status

**Bid Routes (`/api/bids`)**
- `POST /`: Submit a new bid
- `GET /job/:jobId`: Get all bids for a specific job
- `POST /:id/accept`: Accept a bid and assign the job

**Modification Routes (`/api/modifications`)**
- `POST /`: Submit a modification request (requires cryptographic hashing)
- `POST /:id/respond`: Customer approves or rejects the modification

**Payment & Rating Routes**
- `POST /api/payments`: Initiate and complete payment
- `POST /api/ratings`: Submit a post-job rating

**Notifications (`/api/notifications`)**
- `GET /`: Fetch user notifications
- `PATCH /read`: Mark specific or all notifications as read

---

### 7. WebSocket Events (Socket.io)
Real-time architecture relies on explicit Socket.io rooms and events to deliver instant UI updates:
- **Connection Rooms:** `user:{userId}`, `bidding:{jobId}`
- **Events Emitted by Backend:**
  - `job:new`: Broadcast when a new job is posted.
  - `job:statusChange`: Broadcast when a job moves to a new phase.
  - `bid:new` / `job:bidUpdate`: Broadcast into the job's bidding room when a provider bids.
  - `notification:new`: Triggered globally on targeted user rooms for any alerts.
