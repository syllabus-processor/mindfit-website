// MindFit v2 - Workflow Automation Scheduler
// Campaign 1 - Sprint 6.5: Phase 2 - Scheduled Job Runner
// Classification: TIER-1 | Cron-based automation orchestration

import cron from "node-cron";
import {
  runAutoTransitionJob,
  runSLAMonitoringJob,
  checkDocumentReminders,
} from "./workflow-automation";
import {
  createDocumentReminderEmail,
  createSLAViolationEmail,
  sendBatchEmails,
} from "./workflow-notifications";

// ============================================================================
// JOB STATUS TRACKING
// ============================================================================

interface JobStatus {
  name: string;
  schedule: string;
  lastRun: Date | null;
  lastResult: any | null;
  isRunning: boolean;
  errorCount: number;
}

const jobStatuses = new Map<string, JobStatus>();

function initJobStatus(name: string, schedule: string): void {
  jobStatuses.set(name, {
    name,
    schedule,
    lastRun: null,
    lastResult: null,
    isRunning: false,
    errorCount: 0,
  });
}

function updateJobStatus(
  name: string,
  updates: Partial<JobStatus>
): void {
  const current = jobStatuses.get(name);
  if (current) {
    jobStatuses.set(name, { ...current, ...updates });
  }
}

export function getJobStatuses(): JobStatus[] {
  return Array.from(jobStatuses.values());
}

// ============================================================================
// AUTOMATED JOB DEFINITIONS
// ============================================================================

/**
 * Job 1: Auto-Transition Job
 * Runs every 15 minutes
 * Automatically transitions referrals based on business rules
 */
async function autoTransitionJobHandler() {
  const jobName = "autoTransitions";
  const status = jobStatuses.get(jobName);

  if (status?.isRunning) {
    console.log("[SCHEDULER] Auto-transition job already running, skipping...");
    return;
  }

  try {
    updateJobStatus(jobName, { isRunning: true });
    console.log("[SCHEDULER] Starting auto-transition job...");

    const result = await runAutoTransitionJob();

    updateJobStatus(jobName, {
      lastRun: new Date(),
      lastResult: result,
      isRunning: false,
      errorCount: 0,
    });

    console.log(
      `[SCHEDULER] Auto-transition job complete: ${result.transitioned}/${result.checked} transitioned`
    );
  } catch (error: any) {
    console.error("[SCHEDULER] Auto-transition job failed:", error);
    const status = jobStatuses.get(jobName);
    updateJobStatus(jobName, {
      isRunning: false,
      errorCount: (status?.errorCount || 0) + 1,
    });
  }
}

/**
 * Job 2: SLA Monitoring Job
 * Runs every hour
 * Checks for SLA violations and sends alerts
 */
async function slaMonitoringJobHandler() {
  const jobName = "slaMonitoring";
  const status = jobStatuses.get(jobName);

  if (status?.isRunning) {
    console.log("[SCHEDULER] SLA monitoring job already running, skipping...");
    return;
  }

  try {
    updateJobStatus(jobName, { isRunning: true });
    console.log("[SCHEDULER] Starting SLA monitoring job...");

    const result = await runSLAMonitoringJob();

    // Send email alerts for all violations
    if (result.violations.length > 0) {
      console.log(
        `[SCHEDULER] Found ${result.violations.length} SLA violations, sending alerts...`
      );
      const emails = result.violations.map(createSLAViolationEmail);
      const emailResult = await sendBatchEmails(emails);
      console.log(
        `[SCHEDULER] SLA alerts sent: ${emailResult.sent} succeeded, ${emailResult.failed} failed`
      );
    }

    updateJobStatus(jobName, {
      lastRun: new Date(),
      lastResult: result,
      isRunning: false,
      errorCount: 0,
    });

    console.log(
      `[SCHEDULER] SLA monitoring job complete: ${result.violations.length} violations found`
    );
  } catch (error: any) {
    console.error("[SCHEDULER] SLA monitoring job failed:", error);
    const status = jobStatuses.get(jobName);
    updateJobStatus(jobName, {
      isRunning: false,
      errorCount: (status?.errorCount || 0) + 1,
    });
  }
}

/**
 * Job 3: Document Reminder Job
 * Runs daily at 9:00 AM
 * Sends reminder emails for missing documents
 */
async function documentReminderJobHandler() {
  const jobName = "documentReminders";
  const status = jobStatuses.get(jobName);

  if (status?.isRunning) {
    console.log(
      "[SCHEDULER] Document reminder job already running, skipping..."
    );
    return;
  }

  try {
    updateJobStatus(jobName, { isRunning: true });
    console.log("[SCHEDULER] Starting document reminder job...");

    const reminders = await checkDocumentReminders();

    if (reminders.length > 0) {
      console.log(
        `[SCHEDULER] Sending ${reminders.length} document reminders...`
      );
      const emails = reminders.map(createDocumentReminderEmail);
      const emailResult = await sendBatchEmails(emails);
      console.log(
        `[SCHEDULER] Document reminders sent: ${emailResult.sent} succeeded, ${emailResult.failed} failed`
      );
    }

    updateJobStatus(jobName, {
      lastRun: new Date(),
      lastResult: { reminders: reminders.length },
      isRunning: false,
      errorCount: 0,
    });

    console.log(
      `[SCHEDULER] Document reminder job complete: ${reminders.length} reminders sent`
    );
  } catch (error: any) {
    console.error("[SCHEDULER] Document reminder job failed:", error);
    const status = jobStatuses.get(jobName);
    updateJobStatus(jobName, {
      isRunning: false,
      errorCount: (status?.errorCount || 0) + 1,
    });
  }
}

// ============================================================================
// SCHEDULER INITIALIZATION
// ============================================================================

/**
 * Initialize and start all scheduled jobs
 */
export function startScheduler(): void {
  console.log("[SCHEDULER] Initializing workflow automation scheduler...");

  // Initialize job statuses
  initJobStatus("autoTransitions", "*/15 * * * *");
  initJobStatus("slaMonitoring", "0 * * * *");
  initJobStatus("documentReminders", "0 9 * * *");

  // Schedule Job 1: Auto-Transitions (every 15 minutes)
  cron.schedule("*/15 * * * *", autoTransitionJobHandler);
  console.log(
    "  ✓ Auto-transition job scheduled (every 15 minutes)"
  );

  // Schedule Job 2: SLA Monitoring (every hour)
  cron.schedule("0 * * * *", slaMonitoringJobHandler);
  console.log("  ✓ SLA monitoring job scheduled (hourly)");

  // Schedule Job 3: Document Reminders (daily at 9 AM)
  cron.schedule("0 9 * * *", documentReminderJobHandler);
  console.log(
    "  ✓ Document reminder job scheduled (daily at 9:00 AM)"
  );

  console.log("[SCHEDULER] All automation jobs scheduled successfully");

  // Run initial check after 1 minute startup grace period
  setTimeout(() => {
    console.log("[SCHEDULER] Running initial auto-transition check...");
    autoTransitionJobHandler();
  }, 60000); // 60 seconds
}

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
export function stopScheduler(): void {
  console.log("[SCHEDULER] Stopping all scheduled jobs...");
  cron.getTasks().forEach((task) => task.stop());
  console.log("[SCHEDULER] All jobs stopped");
}
