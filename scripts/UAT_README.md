# MindFit v2 - Automated UAT Script

## Overview
Automated User Acceptance Testing script for the MindFit workflow system. Tests all 17 workflow transitions, timeline display, client state filtering, and validation rules.

## Features

### Test Suites
1. **Workflow Transitions** - Tests 10 complete workflow paths covering all 17 statuses
2. **Timeline Display** - Validates timeline generation and chronological ordering
3. **Client State Filtering** - Tests filtering by prospective, pending, active, inactive
4. **Validation Rules** - Tests invalid transitions, required fields, and terminal states

### Test Coverage
- ✅ All 17 workflow statuses
- ✅ Valid transition paths
- ✅ Invalid transition blocking
- ✅ Reason requirements for decline statuses
- ✅ Terminal state validation
- ✅ Timeline event generation
- ✅ Chronological ordering
- ✅ Phase representation
- ✅ Client state filtering
- ✅ Query parameter handling

## Prerequisites

```bash
npm install
```

## Usage

### Run Against Local Server
```bash
# Start local server first
npm run dev

# In another terminal, run UAT
npm run uat:local
```

### Run Against Production
```bash
npm run uat:prod
```

### Run Against Custom Environment
```bash
API_BASE=https://staging.example.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=password123 \
npm run uat
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE` | API server URL | `http://localhost:5000` |
| `ADMIN_EMAIL` | Admin account email | `admin@rsl.local` |
| `ADMIN_PASSWORD` | Admin account password | `admin123` |

## Test Scenarios

### 1. Workflow Transition Tests

#### Referral Phase - Full Path
- `referral_submitted` → `referral_under_review` → `documents_requested` → `referral_under_review` → `referral_accepted`

#### Referral Phase - Accept Path
- `referral_submitted` → `referral_under_review` → `referral_accepted`

#### Referral Phase - Decline Path
- `referral_submitted` → `referral_under_review` → `referral_declined` (with reason)

#### Pre-Staging to Staging
- `referral_accepted` → `pre_staging` → `pre_staging_complete` → `staging`

#### Staging to Assignment - Accept Path
- `staging` → `assignment_proposed` → `assignment_accepted` → `intake_scheduled`

#### Staging to Assignment - Decline and Retry
- `staging` → `assignment_proposed` → `assignment_declined` → `staging`

#### Full Happy Path to Treatment
- Complete path from `referral_submitted` to `in_treatment` (11 transitions)

#### Treatment On Hold and Resume
- `in_treatment` → `treatment_on_hold` → `in_treatment`

#### Treatment Complete
- Complete path to `treatment_complete` (terminal state)

#### Decline from Treatment
- `in_treatment` → `declined` (with reason)

### 2. Timeline Display Tests
- Creates referral with 5+ transitions
- Validates timeline structure (timestamp, event, phase)
- Verifies chronological ordering
- Checks phase representation

### 3. Client State Filtering Tests
- Creates referrals in each client state
- Tests filtering by `prospective`, `pending`, `active`, `inactive`
- Validates returned data matches filter criteria
- Tests "all states" retrieval

### 4. Validation Rules Tests
- Tests invalid transition rejection
- Validates decline reason requirement
- Confirms terminal states have no next statuses

## Output

### Success Output
```
╔════════════════════════════════════════════════════════════╗
║   MindFit v2 - Automated UAT Script for Workflow System   ║
║   Sprint 6.5 Phase 3 - Automated Workflow Validation      ║
╚════════════════════════════════════════════════════════════╝

API Base: http://localhost:5000
Admin Email: admin@rsl.local

✅ Admin Login: Successfully authenticated (245ms)

=== Testing Workflow Transitions ===

--- Referral Phase - Full Path ---
✅ Create Referral: UAT Referral Phase - Full Path: Referral ID: ref_xxx (156ms)
✅ Transition to referral_under_review: Successfully transitioned (89ms)
✅ Transition to documents_requested: Successfully transitioned (92ms)
...

=== UAT Test Report ===

Total Tests: 45
✅ Passed: 45
❌ Failed: 0
⏭️  Skipped: 0

Pass Rate: 100.00%

Average Test Duration: 125.45ms

=== UAT Complete ===
```

### Failure Output
```
❌ Transition to invalid_status: Failed: Invalid transition (125ms)

=== Failed Tests ===
❌ Invalid Transition: System allowed invalid transition
❌ Timeline Display: Timeline events not in chronological order
```

## Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed or authentication error

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: UAT Tests

on: [push, pull_request]

jobs:
  uat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run dev & sleep 5
      - run: npm run uat:local
```

## Troubleshooting

### Authentication Fails
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are correct
- Check that admin user exists in database
- Ensure API server is running

### Connection Refused
- Verify `API_BASE` URL is correct
- Check that server is running on specified port
- Test with `curl $API_BASE/api/health`

### Tests Timeout
- Increase timeout values in script if needed
- Check server performance
- Verify database connection

### Referral Creation Fails
- Check database schema is up to date
- Verify required fields in referral submission endpoint
- Check server logs for errors

## Manual Testing Checklist

Use this checklist for manual UAT alongside automated tests:

- [ ] Login as admin user
- [ ] Create new referral
- [ ] Verify referral appears in list
- [ ] Filter by each client state
- [ ] Click "View Timeline" button
- [ ] Verify timeline displays correctly
- [ ] Click "Update Status" button
- [ ] Verify only valid next statuses shown
- [ ] Select next status and submit
- [ ] Verify status updated in list
- [ ] Verify badge colors updated
- [ ] Test decline path (requires reason)
- [ ] Verify timeline updated with new event
- [ ] Progress referral through complete workflow
- [ ] Verify terminal states have no next statuses

## Test Data Cleanup

The UAT script creates test referrals starting with "UAT ". To clean up test data:

```sql
-- PostgreSQL
DELETE FROM referrals WHERE client_name LIKE 'UAT %';
```

## Next Steps

1. Run automated UAT script
2. Review test results
3. Fix any failing tests
4. Perform manual UAT using checklist
5. Document any issues found
6. Sign off on UAT completion

## Support

For issues or questions:
- Check server logs: `npm run logs`
- Review API documentation
- Contact development team
