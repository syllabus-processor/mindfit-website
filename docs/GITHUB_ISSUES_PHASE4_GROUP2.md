# GitHub Issues - MindFit Phase 4 Group 2

Copy these issue templates to create GitHub issues for tracking Phase 4 Group 2 work items.

---

## Issue #1: Complete UAT Testing for Phase 4 Group 2 Scheduling APIs

**Title**: Complete UAT Testing for Phase 4 Group 2 Scheduling APIs

**Labels**: `testing`, `phase-4`, `uat`, `priority:medium`

**Description**:

Phase 4 Group 2 (Scheduling APIs) has been deployed to production but full automated UAT testing requires admin user creation.

### Background
- 16 API endpoints deployed successfully
- APIs verified manually (authentication working)
- Automated UAT script created (`scripts/uat-phase4-group2.ts`)
- Full test suite blocked by missing admin user

### Tasks
- [ ] Create admin user in production database
  - Option A: Via ops droplet SSH
  - Option B: Via DigitalOcean database console
- [ ] Run full UAT test suite: `BASE_URL="https://mindfit.ruha.io" npx tsx scripts/uat-phase4-group2.ts`
- [ ] Verify all 25+ test cases pass
- [ ] Document any failures or issues
- [ ] Update VAL/VER/CERT report with UAT results

### Test Coverage
- Authentication flow
- Therapists CRUD (8 tests)
- Rooms CRUD (7 tests)
- Appointments CRUD (8 tests)
- Conflict detection (4 tests)
- Cleanup verification (4 tests)

### Acceptance Criteria
- [ ] Admin user created: username `admin`, password securely set
- [ ] UAT script executes without fatal errors
- [ ] 90%+ test pass rate (23/25 tests)
- [ ] All critical paths validated (CRUD + conflict detection)
- [ ] Results documented in `/docs/UAT_RESULTS_PHASE4_GROUP2.md`

### Related Documentation
- `/scripts/uat-phase4-group2.ts` - Test suite
- `/mnt/d/agents/mindfit/docs/VAL_VER_CERT_PHASE4_GROUP2.md` - Certification report

### Estimated Effort
30 minutes

---

## Issue #2: Admin User Management - Create Production Admin Account

**Title**: Create Production Admin Account for MindFit

**Labels**: `admin`, `database`, `security`, `priority:high`

**Description**:

Production MindFit instance requires an admin user for accessing protected endpoints and running UAT tests.

### Background
- Admin users table exists (`admin_users`)
- Schema: `id`, `username`, `password_hash`, `is_active`, `created_at`, `updated_at`
- No admin users currently exist in production
- Database firewall blocks direct WSL2 access

### Implementation Options

**Option A: Via Ops Droplet (Recommended)**
```bash
# SSH to ops droplet
ssh root@104.248.57.116

# Create Node.js script
cat > /tmp/create-admin.mjs << 'EOF'
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  const passwordHash = await bcrypt.hash('YOUR_SECURE_PASSWORD', 10);
  await pool.query(
    'INSERT INTO admin_users (id, username, password_hash, is_active) VALUES ($1, $2, $3, $4)',
    ['admin-001', 'admin', passwordHash, true]
  );
  console.log('✅ Admin user created');
  await pool.end();
}

createAdmin();
EOF

# Run script
DATABASE_URL="postgresql://doadmin:PASSWORD@host:25060/mindfit?sslmode=require" node /tmp/create-admin.mjs
```

**Option B: Via DigitalOcean Console**
1. Navigate to DigitalOcean database console
2. Open SQL query editor
3. Execute:
```sql
INSERT INTO admin_users (id, username, password_hash, is_active, created_at, updated_at)
VALUES (
  'admin-001',
  'admin',
  '$2a$10$hashed_password_here',  -- Generate with bcrypt
  true,
  NOW(),
  NOW()
);
```

### Security Considerations
- [ ] Use strong password (min 16 characters)
- [ ] Store password in secure password manager
- [ ] Use bcrypt with cost factor 10
- [ ] Enable 2FA if available
- [ ] Rotate password every 90 days

### Acceptance Criteria
- [ ] Admin user created with username `admin`
- [ ] Password securely generated and stored
- [ ] User can login via `/api/admin/login`
- [ ] Session authentication working
- [ ] Documented in password manager

### Testing
```bash
# Test login
curl -X POST https://mindfit.ruha.io/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' \
  -c cookies.txt

# Test protected endpoint
curl https://mindfit.ruha.io/api/therapists \
  -b cookies.txt
```

### Estimated Effort
15 minutes

---

## Issue #3: Phase 4 Group 3 - Advanced Scheduling Features

**Title**: Implement Phase 4 Group 3 - Availability Templates & Notifications

**Labels**: `enhancement`, `phase-4`, `scheduling`, `priority:medium`

**Description**:

Phase 4 Group 3 builds upon the foundation of Group 2 by adding advanced scheduling capabilities.

### Proposed Features

**1. Availability Templates API** (Recurring Schedules)
- Therapist weekly availability patterns
- Day of week + time ranges
- Endpoints:
  - `POST /api/availability-templates`
  - `GET /api/availability-templates?therapistId=X`
  - `PATCH /api/availability-templates/:id`
  - `DELETE /api/availability-templates/:id`

**2. Availability Exceptions API** (Time Off)
- One-time schedule overrides
- Holidays, vacations, sick days
- Endpoints:
  - `POST /api/availability-exceptions`
  - `GET /api/availability-exceptions?therapistId=X&date=YYYY-MM-DD`
  - `PATCH /api/availability-exceptions/:id`
  - `DELETE /api/availability-exceptions/:id`

**3. Calendar Events API** (Group Sessions)
- Multi-participant events
- Workshops, group therapy, staff meetings
- Endpoints:
  - `POST /api/calendar-events`
  - `GET /api/calendar-events?startDate=X&endDate=Y`
  - `PATCH /api/calendar-events/:id`
  - `DELETE /api/calendar-events/:id`

**4. Notifications System**
- Appointment reminders (email/SMS)
- Schedule change notifications
- Conflict alerts
- Endpoints:
  - `GET /api/notifications?appointmentId=X`
  - `POST /api/notifications/send`

**5. Enhanced Conflict Detection**
- Check against availability templates
- Respect availability exceptions
- Consider existing calendar events
- Endpoint:
  - `GET /api/appointments/available-slots?therapistId=X&date=YYYY-MM-DD`

### Technical Requirements
- [ ] Extend storage layer with 5 new resources
- [ ] Create 4 new route files
- [ ] Implement notification service (Resend/Twilio)
- [ ] Add cron job for reminder sending
- [ ] Create comprehensive UAT suite
- [ ] Update VAL/VER/CERT documentation

### Database Tables (Already Created)
- `availability_templates` ✅
- `availability_exceptions` ✅
- `calendar_events` ✅
- `notifications` ✅

### Acceptance Criteria
- [ ] 20+ new API endpoints implemented
- [ ] All endpoints tested and documented
- [ ] UAT pass rate > 90%
- [ ] Performance < 300ms per endpoint
- [ ] Notification delivery working
- [ ] VAL/VER/CERT Grade A or higher

### Dependencies
- Phase 4 Group 2 (Complete ✅)
- Email service (Resend) configured
- SMS service (Twilio) configured (optional)

### Estimated Effort
10-14 hours

### Phase Breakdown
- **Group 3A**: Availability Templates + Exceptions (4 hours)
- **Group 3B**: Calendar Events (3 hours)
- **Group 3C**: Notifications System (4 hours)
- **Group 3D**: Enhanced Conflict Detection (3 hours)

---

## Issue #4: CI/CD Integration - Automated Testing Pipeline

**Title**: Add CI/CD Pipeline for Automated UAT Testing

**Labels**: `ci-cd`, `testing`, `automation`, `devops`

**Description**:

Implement GitHub Actions workflow to automate build, test, and deployment validation.

### Objectives
- Automate build verification on every push
- Run UAT tests on staging/production deployment
- Catch regressions early
- Improve code quality confidence

### Proposed Workflow

**Trigger Events**:
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch

**Jobs**:
1. **Build Verification**
   - Install dependencies
   - Run TypeScript compilation
   - Run Vite build
   - Report build time

2. **API Testing**
   - Create test admin user
   - Run UAT suite
   - Generate test report
   - Upload coverage artifact

3. **Deployment Verification**
   - Wait for DO deployment
   - Health check production URL
   - Verify critical endpoints
   - Slack/email notification

### Configuration File
Create `.github/workflows/mindfit-ci.yml`

### Environment Variables Needed
- `DATABASE_URL` (GitHub secret)
- `TEST_ADMIN_USERNAME`
- `TEST_ADMIN_PASSWORD`
- `PRODUCTION_URL`

### Acceptance Criteria
- [ ] Workflow file created
- [ ] Successfully runs on push
- [ ] UAT tests execute automatically
- [ ] Results visible in GitHub Actions
- [ ] Failing tests block deployment
- [ ] Notifications on failure

### Estimated Effort
2-3 hours

---

## Issue #5: Performance Testing - Load & Stress Testing

**Title**: Conduct Performance Testing for Phase 4 Scheduling APIs

**Labels**: `performance`, `testing`, `phase-4`, `priority:low`

**Description**:

Validate Phase 4 Group 2 APIs can handle production load and identify bottlenecks.

### Objectives
- Measure response times under load
- Identify performance bottlenecks
- Establish performance baselines
- Optimize slow endpoints

### Test Scenarios

**1. Load Testing**
- Concurrent users: 10, 50, 100
- Duration: 5 minutes per scenario
- Endpoints: All 16 Phase 4 Group 2 APIs
- Success criteria: 95% < 500ms

**2. Stress Testing**
- Ramp up to 200 concurrent users
- Identify breaking point
- Measure degradation curve
- Success criteria: No 500 errors

**3. Spike Testing**
- Sudden traffic spike (0 → 100 users in 10s)
- Measure recovery time
- Success criteria: <30s recovery

**4. Endurance Testing**
- Sustained load (25 users for 30 min)
- Check for memory leaks
- Monitor database connections
- Success criteria: Stable performance

### Tools
- **Artillery** (HTTP load testing)
- **k6** (Grafana k6 for complex scenarios)
- **DigitalOcean Metrics** (server monitoring)

### Acceptance Criteria
- [ ] Test suite created
- [ ] Baseline metrics documented
- [ ] Performance report generated
- [ ] Optimization recommendations provided
- [ ] Critical bottlenecks identified

### Estimated Effort
4-6 hours

---

## Issue #6: Documentation - API Integration Guide for Frontend

**Title**: Create Frontend Integration Guide for Phase 4 Scheduling APIs

**Labels**: `documentation`, `frontend`, `api`, `priority:medium`

**Description**:

Provide comprehensive guide for frontend developers integrating Phase 4 scheduling features.

### Contents

**1. Getting Started**
- Authentication flow
- API base URL
- Error handling patterns

**2. API Reference**
- All 16 endpoints documented
- Request/response examples
- Common error codes

**3. Code Examples**
- React/TypeScript snippets
- Fetch API usage
- Error handling
- Loading states

**4. Use Case Guides**
- Create appointment flow
- Check for conflicts
- List available therapists
- Filter appointments by date

**5. TypeScript Types**
- Import from shared schema
- Type-safe API calls
- Response type definitions

### Acceptance Criteria
- [ ] Markdown guide created
- [ ] All endpoints documented
- [ ] 10+ code examples
- [ ] Type definitions included
- [ ] Published to `/docs/`

### Estimated Effort
3-4 hours

---

## Summary

**Total Issues**: 6
**Estimated Total Effort**: 24-32 hours
**Priority Distribution**:
- High: 1 issue (Admin user creation)
- Medium: 4 issues (UAT, Group 3, CI/CD, Docs)
- Low: 1 issue (Performance testing)

**Recommended Execution Order**:
1. Issue #2: Admin User Creation (15 min) - **DO FIRST**
2. Issue #1: UAT Testing (30 min)
3. Issue #4: CI/CD Pipeline (2-3 hours)
4. Issue #6: Frontend Docs (3-4 hours)
5. Issue #3: Phase 4 Group 3 (10-14 hours)
6. Issue #5: Performance Testing (4-6 hours) - **DO LAST**

---

**Created**: 2025-11-17
**Related Sprint**: Phase 4 Group 2
**Status**: Ready for GitHub Import
