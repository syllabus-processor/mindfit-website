# MindFit Website ↔ EMRM Integration Specification

**Version:** 1.0  
**Date:** October 2025  
**Contact:** MindFit Technical Team

---

## Executive Summary

This document defines the integration requirements between the MindFit public website and the EMRM (Electronic Medical Records Module) system. The integration enables seamless client onboarding from website contact forms and secure portal access for staff and clients.

---

## 1. Architecture Overview

### Current State
- **Website**: React/TypeScript frontend, Express.js backend
- **Database**: PostgreSQL (Neon) storing contact submissions and newsletter subscribers
- **Authentication**: Portal login page ready for EMRM integration
- **Deployment**: Replit hosting on port 5000

### Integration Points
1. **Contact Form → EMRM Client Intake**
2. **Portal Login → EMRM Authentication**
3. **Newsletter Sync** (optional)

---

## 2. Contact Form Integration

### 2.1 Current Implementation
The website captures contact form submissions with validation and stores them in PostgreSQL.

**Endpoint:** `POST /api/contact/submit`

**Request Schema:**
```typescript
{
  name: string,              // Required, minimum 2 characters
  email: string,             // Required, valid email format
  phone?: string,            // Optional, any format
  preferredContact: "email" | "phone",  // Required enum
  message: string            // Required, minimum 10 characters
}
```

**Current Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "id": "uuid-v4-string"
}
```

**Database Table:** `contact_submissions`
```sql
CREATE TABLE contact_submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 2.2 EMRM Requirements

**What EMRM Should Provide:**

#### Endpoint: Client Intake API
```
POST https://emrm.mindfithealth.com/api/intake/contact
```

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <EMRM_API_KEY>
X-Source: mindfit-website
```

**Request Body:**
```json
{
  "source": "website_contact_form",
  "contactData": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "(555) 123-4567",
    "preferredContact": "email",
    "message": "I need help with my teen's anxiety.",
    "submittedAt": "2025-10-08T18:42:00Z"
  },
  "websiteSubmissionId": "uuid-from-website"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "clientId": "EMRM-12345",
  "status": "intake_pending",
  "message": "Contact received and client record created",
  "nextSteps": {
    "notifyStaff": true,
    "sendConfirmation": true,
    "scheduleFollowUp": "within_24_hours"
  }
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CLIENT",
    "message": "Client with this email already exists",
    "field": "email",
    "existingClientId": "EMRM-10234"
  }
}
```

**Error Codes:**
- `DUPLICATE_CLIENT` - Email already exists in EMRM
- `INVALID_DATA` - Data validation failed
- `INTEGRATION_ERROR` - EMRM system error
- `AUTHENTICATION_FAILED` - Invalid API key

#### Webhook: Intake Status Updates (Optional)
```
POST https://mindfit-website.replit.app/api/emrm/webhook/status
```

For notifying website when client moves from intake to active client.

---

## 3. Portal Authentication Integration

### 3.1 Current Implementation
- **Login Page:** `/portal/login`
- **Current Redirect:** Configurable via `VITE_EMRM_URL` environment variable
- **Form Fields:** Email and password
- **UI:** Dark mode themed, HIPAA compliance indicators

### 3.2 EMRM Requirements

**What EMRM Should Provide:**

#### Option A: Direct EMRM Login (Recommended)
Website redirects to EMRM login page:
```
https://emrm.mindfithealth.com/login?source=website&redirect_uri=<encoded>
```

**Flow:**
1. User clicks "Staff & Client Access" in website footer
2. Website redirects to EMRM login with return URL
3. User authenticates in EMRM
4. EMRM redirects back to website with session token (if needed)

#### Option B: Federated Authentication
Website sends credentials to EMRM for validation:

**Endpoint:** `POST https://emrm.mindfithealth.com/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "hashed_or_encrypted",
  "source": "mindfit_website",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "123.456.789.0"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "sessionToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "expiresIn": 3600,
  "user": {
    "id": "user-123",
    "role": "therapist|client|admin|supervisor",
    "name": "Dr. Sarah Johnson",
    "permissions": ["view_clients", "edit_notes"]
  },
  "redirectUrl": "https://emrm.mindfithealth.com/dashboard"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "remainingAttempts": 2
  }
}
```

**Session Management:**
- **Token Type:** JWT preferred
- **Storage:** HttpOnly secure cookies or localStorage
- **Expiry:** Configurable (recommend 1 hour with refresh)
- **Refresh Endpoint:** `POST /api/auth/refresh`
- **Logout Endpoint:** `POST /api/auth/logout`

---

## 4. Newsletter Subscriber Sync (Optional)

### 4.1 Current Implementation
Newsletter subscribers stored in PostgreSQL with lowercase normalized emails.

**Database Table:** `newsletter_subscribers`
```sql
CREATE TABLE newsletter_subscribers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 4.2 EMRM Integration Options

#### Option 1: Real-time Webhook
```
POST https://emrm.mindfithealth.com/api/marketing/subscriber
```

**Payload:**
```json
{
  "email": "subscriber@example.com",
  "subscribedAt": "2025-10-08T18:42:00Z",
  "source": "website_footer",
  "tags": ["website_visitor", "interested_in_services"]
}
```

#### Option 2: Batch Export API
```
GET https://mindfit-website.replit.app/api/admin/subscribers
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "subscriber@example.com",
      "subscribedAt": "2025-10-08T18:42:00Z"
    }
  ],
  "total": 142,
  "lastSyncedAt": "2025-10-08T12:00:00Z"
}
```

---

## 5. Security & Compliance

### 5.1 HIPAA Requirements
- **Encryption:** All data in transit must use TLS 1.2+
- **Authentication:** API keys rotated every 90 days
- **Audit Logging:** All integration calls logged with timestamps, user context
- **Data Minimization:** Only transmit necessary PHI
- **Access Control:** Role-based permissions enforced

### 5.2 Authentication Methods

**API Key Authentication (Backend-to-Backend):**
```
Authorization: Bearer emrm_live_sk_abc123xyz...
```

**Session Tokens (User Sessions):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "JWT",
  "expiresAt": "2025-10-08T19:42:00Z"
}
```

### 5.3 Rate Limiting
- **Contact Form API:** 10 requests/minute per IP
- **Auth API:** 5 attempts/minute per email
- **Webhook:** 100 requests/minute

### 5.4 Error Handling & Retry Logic
- **Network Errors:** Retry 3 times with exponential backoff
- **Timeout:** 30 seconds per request
- **Circuit Breaker:** Fail-open after 5 consecutive failures

---

## 6. Environment Configuration

### 6.1 Website Environment Variables
```bash
# EMRM Integration
VITE_EMRM_URL=https://emrm.mindfithealth.com
EMRM_API_KEY=emrm_live_sk_abc123...
EMRM_API_BASE_URL=https://emrm.mindfithealth.com/api
EMRM_WEBHOOK_SECRET=whsec_abc123...

# Session Management
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=3600

# Email Service (for confirmations)
EMAIL_API_KEY=resend_or_sendgrid_key
```

### 6.2 EMRM Environment Variables
```bash
# Website Integration
WEBSITE_API_KEY=website_sk_xyz789...
WEBSITE_BASE_URL=https://mindfit-website.replit.app
ALLOWED_ORIGINS=https://mindfit-website.replit.app,https://mindfithealth.com
```

---

## 7. Testing & Validation

### 7.1 Test Scenarios

**Contact Form Integration:**
1. Submit valid contact form → Verify EMRM client created
2. Submit duplicate email → Verify error handling
3. Submit invalid data → Verify validation errors
4. Network timeout → Verify retry logic
5. EMRM down → Verify graceful degradation

**Portal Authentication:**
1. Valid credentials → Verify successful login and redirect
2. Invalid credentials → Verify error message
3. Expired session → Verify refresh flow
4. Logout → Verify session termination

### 7.2 Test Data
```json
{
  "testContacts": [
    {
      "name": "Test User",
      "email": "test@mindfithealth.com",
      "phone": "555-TEST-001",
      "preferredContact": "email",
      "message": "This is a test submission for integration testing."
    }
  ],
  "testCredentials": {
    "therapist": {
      "email": "therapist.test@mindfithealth.com",
      "password": "TestPass123!"
    },
    "client": {
      "email": "client.test@mindfithealth.com",
      "password": "TestPass123!"
    }
  }
}
```

### 7.3 Monitoring & Alerts
- **Success Rate:** Alert if < 95%
- **Response Time:** Alert if > 5 seconds (p95)
- **Error Rate:** Alert if > 5%
- **Data Sync:** Alert if lag > 5 minutes

---

## 8. Implementation Phases

### Phase 1: Contact Form Integration (Week 1-2)
- [ ] EMRM provides intake API endpoint
- [ ] Website implements EMRM API client
- [ ] End-to-end testing
- [ ] Production deployment

### Phase 2: Portal Authentication (Week 3-4)
- [ ] EMRM provides auth endpoints
- [ ] Website implements login flow
- [ ] Session management setup
- [ ] Security audit

### Phase 3: Newsletter Sync (Week 5)
- [ ] Define sync strategy (webhook vs batch)
- [ ] Implement chosen method
- [ ] Testing & validation

### Phase 4: Monitoring & Optimization (Ongoing)
- [ ] Setup monitoring dashboards
- [ ] Performance optimization
- [ ] Error tracking & resolution

---

## 9. Support & Contacts

### Website Team
- **Technical Lead:** [Your Name]
- **Email:** dev@mindfithealth.com
- **Slack:** #mindfit-website

### EMRM Team
- **Technical Lead:** [EMRM Lead Name]
- **Email:** emrm-dev@mindfithealth.com
- **Slack:** #emrm-integration

### Escalation
- **Urgent Issues:** Page on-call engineer
- **Security Concerns:** security@mindfithealth.com
- **HIPAA Compliance:** compliance@mindfithealth.com

---

## 10. Appendix

### A. Current Website API Endpoints
```
POST /api/contact/submit          # Contact form submission
POST /api/newsletter/subscribe    # Newsletter signup
GET  /api/admin/contacts          # View all contacts (admin)
GET  /api/admin/subscribers       # View all subscribers (admin)
```

### B. Sample cURL Requests

**Submit Contact Form:**
```bash
curl -X POST https://mindfit-website.replit.app/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "preferredContact": "email",
    "message": "I need help with anxiety treatment."
  }'
```

**Subscribe to Newsletter:**
```bash
curl -X POST https://mindfit-website.replit.app/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "subscriber@example.com"}'
```

### C. Database Schema Export
See attached `database_schema.sql` for complete schema including indexes and constraints.

### D. OpenAPI Specification
See attached `openapi.yaml` for machine-readable API specification.

---

**Document Version History:**
- v1.0 (2025-10-08): Initial specification
