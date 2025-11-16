# MindFit Workflow Automation Engine - Implementation Summary

## Overview
Phase 2 Automation Engine implementation per CLIENT_WORKFLOW_DESIGN.md Section 7.

**Files Created:**
- `server/lib/workflow-automation.ts` (368 lines) - Core automation logic
- `server/lib/workflow-notifications.ts` (267 lines) - Email notification templates
- `server/routes/automation.ts` (128 lines) - Admin API endpoints

## Features Implemented

### 1. Automatic Transitions ✅

**Rules Configured:**
- ✅ First Session Completed → Active (`waiting_first_session` → `in_treatment`)
- ✅ 30 Days Idle → Auto Decline (any active state → `declined` after 30 days)
- ✅ Intake Completed → Waiting First Session (`intake_scheduled` → `waiting_first_session`)

**How It Works:**
- `checkAutoTransitions(referral)` - Evaluates transition rules for a single referral
- `runAutoTransitionJob()` - Batch process all active referrals
- Transitions are logged and tracked with `lastModifiedBy: "system-automation"`

### 2. SLA Monitoring ✅

**SLA Targets (from design doc):**
- Referral Review: 3 days
- Pre-Staging: 7 days
- Staging/Assignment: 5 days
- Acceptance: 10 days

**Violation Detection:**
- `checkSLAViolations(referral)` - Identifies overdue referrals
- Severity levels: `warning` (1x target) and `critical` (1.5x target)
- Returns detailed violation reports with days overdue

**SLA Monitoring Job:**
- `runSLAMonitoringJob()` - Scans all active referrals
- Returns counts and full violation list
- Triggers email alerts to admin@mindfit.com

### 3. Document Reminders ✅

**Auto-Reminder Logic:**
- Triggers after 3 days in `documents_requested` status
- `checkDocumentReminders()` - Finds referrals needing reminders
- Returns reminder list with client contact info

### 4. Email Notifications ✅

**Email Templates Created:**
- State Change Notifications (client-facing)
- Assignment Proposed (client-facing)
- Intake Scheduled (client-facing)
- First Session Scheduled (client-facing)
- Document Reminders (client-facing)
- SLA Violation Alerts (admin-facing)

**Email Service:**
- `sendEmail(notification)` - Send single email
- `sendBatchEmails(notifications)` - Bulk send with error handling
- Currently stubbed out (logs to console) - TODO: integrate SendGrid/AWS SES

### 5. Admin API Endpoints ✅

**Manual Triggers:**
- `POST /api/automation/run-transitions` - Manually run auto-transition job
- `POST /api/automation/check-sla?sendAlerts=true` - Run SLA check with optional alerts
- `POST /api/automation/send-document-reminders` - Trigger document reminders
- `GET /api/automation/status` - View automation system status

## Integration Points

### To Complete Full Integration:

1. **Register Routes** (add to `server/index.ts`):
```typescript
import * as automationRoutes from "./routes/automation";

// Admin automation endpoints
app.post("/api/automation/run-transitions", authenticateAdmin, automationRoutes.runTransitionsManually);
app.post("/api/automation/check-sla", authenticateAdmin, automationRoutes.checkSLAManually);
app.post("/api/automation/send-document-reminders", authenticateAdmin, automationRoutes.sendDocumentRemindersManually);
app.get("/api/automation/status", authenticateAdmin, automationRoutes.getAutomationStatus);
```

2. **Add Scheduled Jobs** (using `node-cron` or similar):
```typescript
import { runAutoTransitionJob, runSLAMonitoringJob, checkDocumentReminders } from "./lib/workflow-automation";

// Run auto-transitions every 15 minutes
schedule.scheduleJob("*/15 * * * *", runAutoTransitionJob);

// Run SLA monitoring every hour
schedule.scheduleJob("0 * * * *", async () => {
  const result = await runSLAMonitoringJob();
  // Send alerts for critical violations
});

// Run document reminders daily at 9 AM
schedule.scheduleJob("0 9 * * *", async () => {
  const reminders = await checkDocumentReminders();
  // Send reminder emails
});
```

3. **Configure Email Service** (in `server/lib/workflow-notifications.ts`):
   - Replace stub with SendGrid, AWS SES, or Nodemailer
   - Add API keys to environment variables
   - Test email delivery

4. **Hook Notifications into Workflow Transitions**:
```typescript
// In server/routes/referrals.ts - transitionReferralWorkflow()
// After successful transition:
if (metadata.newState !== currentReferral.clientState) {
  const email = createStateChangeEmail(currentReferral, currentReferral.clientState, metadata.newState);
  await sendEmail(email);
}
```

## Testing

### Manual Testing Commands:

```bash
# Test auto-transition job
curl -X POST http://localhost:5000/api/automation/run-transitions

# Test SLA monitoring
curl -X POST http://localhost:5000/api/automation/check-sla?sendAlerts=true

# Test document reminders
curl -X POST http://localhost:5000/api/automation/send-document-reminders

# Check automation status
curl http://localhost:5000/api/automation/status
```

### Unit Tests Needed:
- [ ] Test automatic transition rules
- [ ] Test SLA violation detection
- [ ] Test document reminder logic
- [ ] Test email template generation
- [ ] Test batch processing

## Deployment Checklist

- [x] Create automation logic module
- [x] Create notification templates
- [x] Create admin API endpoints
- [ ] Register routes in index.ts
- [ ] Add scheduled job runner
- [ ] Configure email service
- [ ] Hook notifications into workflow transitions
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor logs for automation runs

## Performance Considerations

- Auto-transition job scans all non-inactive referrals (currently ~5)
- SLA monitoring scans all active referrals
- Jobs are designed to be idempotent (safe to run multiple times)
- Consider adding job status tracking table for monitoring
- Add rate limiting if email volume becomes high

## Future Enhancements

- [ ] Add admin dashboard for viewing automation history
- [ ] Add configurable SLA targets per admin settings
- [ ] Add automation disable/enable controls
- [ ] Add detailed logging/audit trail for automation actions
- [ ] Add Slack/Teams notifications for critical SLA violations
- [ ] Add automatic therapist assignment logic
- [ ] Add predictive alerts (e.g., "will violate SLA in 2 days")

## Files Modified Summary

**New Files:**
1. `/server/lib/workflow-automation.ts` - 368 lines
2. `/server/lib/workflow-notifications.ts` - 267 lines
3. `/server/routes/automation.ts` - 128 lines

**Total:** 763 lines of new code

**Dependencies Added:** None (uses existing PostgreSQL/Express stack)

---

**Status:** ✅ CORE IMPLEMENTATION COMPLETE
**Next:** Register routes, add scheduler, deploy
