# VEXA API Testing Guide

Complete guide for testing all API endpoints using curl or Postman.

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

## 📝 Test Flow

### 1. Register Users

**Register Customer:**
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test123!",
    "name": "Test Customer"
  }'
```

**Register Provider:**
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@test.com",
    "password": "Test123!",
    "name": "Test Provider"
  }'
```

### 2. Login

**Login as Customer:**
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test123!"
  }'
```

Response:
```json
{
  "user": {
    "id": "user_id",
    "email": "customer@test.com",
    "name": "Test Customer",
    "role": "CUSTOMER"
  },
  "session": {
    "token": "session_token",
    "expiresAt": "..."
  }
}
```

**Save the session token for subsequent requests.**

### 3. Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/get-session \
  -H "Authorization: Bearer <session_token>"
```

### 4. Upload Images

**Single Image:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <session_token>" \
  -F "image=@/path/to/image.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3000/uploads/image-123456.jpg"
  }
}
```

**Multiple Images:**
```bash
curl -X POST http://localhost:3000/api/upload/multiple \
  -H "Authorization: Bearer <session_token>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "urls": [
      "http://localhost:3000/uploads/image-123456.jpg",
      "http://localhost:3000/uploads/image-789012.jpg"
    ]
  }
}
```

### 5. Create Job (Customer)

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Plumbing Repair",
    "description": "Fix leaking kitchen sink",
    "category": "Plumbing",
    "location": "Mumbai, Maharashtra",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "images": ["http://localhost:3000/uploads/image-123456.jpg"],
    "originalPrice": 500,
    "urgency": "HIGH",
    "scheduledAt": "2026-04-15T10:00:00Z"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "job_id",
    "title": "Plumbing Repair",
    "status": "BIDDING",
    ...
  }
}
```

### 6. List Jobs

**As Provider (see available jobs):**
```bash
curl -X GET http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <provider_token>"
```

**As Customer (see own jobs):**
```bash
curl -X GET http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <customer_token>"
```

**With filters:**
```bash
curl -X GET "http://localhost:3000/api/jobs?status=BIDDING&category=Plumbing&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### 7. Get Job Details

```bash
curl -X GET http://localhost:3000/api/jobs/<job_id> \
  -H "Authorization: Bearer <token>"
```

### 8. Submit Bid (Provider)

```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>",
    "amount": 450,
    "message": "I can fix this quickly",
    "estimatedDuration": "2 hours"
  }'
```

### 9. Get Job Bids

```bash
curl -X GET http://localhost:3000/api/bids/job/<job_id> \
  -H "Authorization: Bearer <token>"
```

### 10. Accept Bid (Customer)

```bash
curl -X POST http://localhost:3000/api/bids/<bid_id>/accept \
  -H "Authorization: Bearer <customer_token>"
```

### 11. Update Job Status

```bash
curl -X PATCH http://localhost:3000/api/jobs/<job_id>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### 12. Request Modification (Provider)

```bash
curl -X POST http://localhost:3000/api/modifications \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>",
    "revisionReason": "Additional work required",
    "revisedPrice": 700,
    "revisionImages": ["http://localhost:3000/uploads/image-789012.jpg"]
  }'
```

### 13. Respond to Modification (Customer)

**Approve:**
```bash
curl -X PATCH http://localhost:3000/api/modifications/<modification_id> \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalStatus": "APPROVED",
    "customerResponse": "Approved. Please proceed."
  }'
```

**Reject:**
```bash
curl -X PATCH http://localhost:3000/api/modifications/<modification_id> \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalStatus": "REJECTED",
    "customerResponse": "Price too high."
  }'
```

### 14. Complete Job (Provider)

```bash
curl -X PATCH http://localhost:3000/api/jobs/<job_id>/complete \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "completedImages": [
      "http://localhost:3000/uploads/completed-1.jpg",
      "http://localhost:3000/uploads/completed-2.jpg"
    ]
  }'
```

### 15. Accept Completed Work (Customer)

```bash
curl -X PATCH http://localhost:3000/api/jobs/<job_id>/accept-work \
  -H "Authorization: Bearer <customer_token>"
```

### 16. Create Payment Order (Customer)

```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "orderId": "order_xyz123",
    "amount": 50000,
    "currency": "INR",
    "keyId": "rzp_test_...",
    "jobTitle": "Plumbing Repair"
  }
}
```

### 17. Verify Payment (Customer)

```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>",
    "razorpayOrderId": "order_xyz123",
    "razorpayPaymentId": "pay_abc456",
    "razorpaySignature": "signature_hash"
  }'
```

### 18. Cash Payment (Customer)

```bash
curl -X POST http://localhost:3000/api/payments/cash \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>"
  }'
```

### 19. Submit Rating (Customer)

```bash
curl -X POST http://localhost:3000/api/ratings \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>",
    "rateeId": "<provider_id>",
    "score": 5,
    "review": "Excellent service!"
  }'
```

### 20. Get User Profile

```bash
curl -X GET http://localhost:3000/api/users/profile/<user_id> \
  -H "Authorization: Bearer <token>"
```

### 21. Update Profile

```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+91 9876543210",
    "avatarUrl": "http://localhost:3000/uploads/avatar.jpg"
  }'
```

### 22. Submit KYC (Provider)

```bash
curl -X POST http://localhost:3000/api/users/kyc \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "kycDocuments": [
      "http://localhost:3000/uploads/id-front.jpg",
      "http://localhost:3000/uploads/id-back.jpg"
    ]
  }'
```

### 23. Register Device Token

```bash
curl -X POST http://localhost:3000/api/users/device-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "fcm_device_token_here"
  }'
```

### 24. Get Notifications

```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <token>"
```

### 25. Mark Notifications as Read

**Mark specific notification:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/read \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "<notification_id>"
  }'
```

**Mark all as read:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/read \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "markAll": true
  }'
```

### 26. Raise Dispute

```bash
curl -X POST http://localhost:3000/api/disputes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "<job_id>",
    "reason": "Work not completed as agreed",
    "evidence": [
      "http://localhost:3000/uploads/evidence-1.jpg",
      "http://localhost:3000/uploads/evidence-2.jpg"
    ]
  }'
```

### 27. Get Payment History

```bash
curl -X GET "http://localhost:3000/api/payments/history?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

## 🧪 Testing with Seed Data

Run the seed script to populate test data:

```bash
cd vexa-backend
npm run prisma:seed
```

This creates:
- Test customer: `customer@test.com` / `Test123!`
- Test provider: `provider@test.com` / `Test123!`
- Verified provider: `verified.provider@test.com` / `Test123!`
- Sample jobs with bids
- Sample ratings and notifications

---

## 🔄 Socket.io Testing

### Connect to Socket.io

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join user room
  socket.emit('user:join', 'user_id_here');
  
  // Join bidding room
  socket.emit('bidding:join', 'job_id_here');
});

// Listen for events
socket.on('job:new', (data) => {
  console.log('New job:', data);
});

socket.on('bid:new', (data) => {
  console.log('New bid:', data);
});

socket.on('modification:requested', (data) => {
  console.log('Modification requested:', data);
});

socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});
```

---

## 📊 Postman Collection

### Import into Postman

1. Create new collection: "VEXA API"
2. Add environment variables:
   - `base_url`: `http://localhost:3000/api`
   - `customer_token`: (set after login)
   - `provider_token`: (set after login)
   - `job_id`: (set after creating job)
   - `bid_id`: (set after creating bid)

3. Create folders:
   - Authentication
   - Jobs
   - Bids
   - Modifications
   - Payments
   - Users
   - Upload
   - Notifications
   - Ratings
   - Disputes

4. Add requests to each folder using the curl examples above

---

## 🐛 Common Issues

### 401 Unauthorized
- Token expired or invalid
- Token not included in Authorization header
- User not authenticated

### 403 Forbidden
- User doesn't have permission for this action
- Wrong user role (e.g., provider trying to accept bid)

### 404 Not Found
- Resource doesn't exist
- Wrong ID in URL

### 400 Bad Request
- Missing required fields
- Invalid data format
- Validation error

### 500 Internal Server Error
- Check backend logs
- Database connection issue
- Unhandled exception

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Amounts are in INR (Indian Rupees)
- Razorpay amounts are in paise (multiply by 100)
- Image URLs must be accessible
- Device tokens are FCM tokens from Firebase

---

## 🔒 Security Testing

### Test Invalid Tokens
```bash
curl -X GET http://localhost:3000/api/jobs \
  -H "Authorization: Bearer invalid_token"
```

### Test Missing Authorization
```bash
curl -X GET http://localhost:3000/api/jobs
```

### Test SQL Injection (should be prevented)
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test'; DROP TABLE users; --",
    "description": "Test",
    "category": "Test",
    "location": "Test"
  }'
```

### Test XSS (should be sanitized)
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<script>alert(\"XSS\")</script>",
    "description": "Test",
    "category": "Test",
    "location": "Test"
  }'
```

---

Happy Testing! 🧪
