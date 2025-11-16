// MindFit v2 - Workflow Automation API
// Campaign 1 - Sprint 6.5: Phase 2 - Automation API
// Classification: TIER-1 | Manual triggers and automation status

import type { Request, Response } from "express";
import {
  runAutoTransitionJob,
  runSLAMonitoringJob,
  checkDocumentReminders,
} from "../lib/workflow-automation";
import {
  createDocumentReminderEmail,
  createSLAViolationEmail,
  sendBatchEmails,
} from "../lib/workflow-notifications";
import { getJobStatuses } from "../lib/scheduler";

// ============================================================================
// MANUAL JOB TRIGGERS (Admin-only endpoints)
// ============================================================================

/**
 * POST /api/automation/run-transitions
 * Manually trigger automatic transition job
 */
export async function runTransitionsManually(req: Request, res: Response) {
  try {
    console.log("[API] Manual auto-transition job triggered");
    const result = await runAutoTransitionJob();

    res.json({
      success: true,
      message: "Auto-transition job completed",
      ...result,
    });
  } catch (error: any) {
    console.error("[API] Auto-transition job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run auto-transition job",
      error: error.message,
    });
  }
}

/**
 * POST /api/automation/check-sla
 * Manually trigger SLA monitoring job
 */
export async function checkSLAManually(req: Request, res: Response) {
  try {
    console.log("[API] Manual SLA monitoring job triggered");
    const result = await runSLAMonitoringJob();

    // Send email alerts for violations if requested
    if (req.body.sendAlerts && result.violations.length > 0) {
      const emails = result.violations.map(createSLAViolationEmail);
      const emailResult = await sendBatchEmails(emails);

      res.json({
        success: true,
        message: "SLA monitoring job completed",
        ...result,
        emails: emailResult,
      });
    } else {
      res.json({
        success: true,
        message: "SLA monitoring job completed",
        ...result,
      });
    }
  } catch (error: any) {
    console.error("[API] SLA monitoring job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run SLA monitoring job",
      error: error.message,
    });
  }
}

/**
 * POST /api/automation/send-document-reminders
 * Manually trigger document reminder emails
 */
export async function sendDocumentRemindersManually(req: Request, res: Response) {
  try {
    console.log("[API] Manual document reminder job triggered");
    const reminders = await checkDocumentReminders();

    if (reminders.length === 0) {
      res.json({
        success: true,
        message: "No document reminders needed",
        reminders: [],
      });
      return;
    }

    const emails = reminders.map(createDocumentReminderEmail);
    const emailResult = await sendBatchEmails(emails);

    res.json({
      success: true,
      message: "Document reminders sent",
      reminders: reminders.length,
      emails: emailResult,
    });
  } catch (error: any) {
    console.error("[API] Document reminder job failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send document reminders",
      error: error.message,
    });
  }
}

/**
 * GET /api/automation/status
 * Get automation system status and last run times
 */
export async function getAutomationStatus(req: Request, res: Response) {
  try {
    const jobStatuses = getJobStatuses();

    res.json({
      success: true,
      status: "active",
      jobs: jobStatuses,
    });
  } catch (error: any) {
    console.error("[API] Failed to get automation status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get automation status",
      error: error.message,
    });
  }
}
