// MindFit v2 - Automated UAT Script for Workflow System
// Campaign 1 - Sprint 6.5: Phase 3 - UAT Testing
// Classification: TIER-1 | Automated validation of workflow transitions

// Node.js 18+ has built-in fetch support, no import needed

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rsl.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];
let sessionCookie = '';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration?: number) {
  results.push({ test, status, message, duration });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${emoji} ${test}: ${message}${duration ? ` (${duration}ms)` : ''}`, color);
}

// Helper: Login as admin
async function loginAsAdmin(): Promise<boolean> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }

    if (response.ok) {
      addResult('Admin Login', 'PASS', 'Successfully authenticated', Date.now() - start);
      return true;
    } else {
      const error = await response.text();
      addResult('Admin Login', 'FAIL', `Login failed: ${error}`, Date.now() - start);
      return false;
    }
  } catch (error: any) {
    addResult('Admin Login', 'FAIL', `Login error: ${error.message}`, Date.now() - start);
    return false;
  }
}

// Helper: Create test referral
async function createTestReferral(clientName: string): Promise<string | null> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/referrals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        clientName,
        clientEmail: `${clientName.toLowerCase().replace(/\s+/g, '.')}@test.com`,
        clientPhone: '555-0100',
        clientAge: 30,
        presentingConcerns: 'Test concerns for UAT validation',
        urgency: 'routine',
        insuranceProvider: 'Test Insurance',
        insuranceMemberId: 'TEST-001',
        referralSource: 'UAT Script',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      addResult(
        `Create Referral: ${clientName}`,
        'PASS',
        `Referral ID: ${data.referral.id}`,
        Date.now() - start
      );
      return data.referral.id;
    } else {
      const error = await response.text();
      addResult(`Create Referral: ${clientName}`, 'FAIL', `Failed: ${error}`, Date.now() - start);
      return null;
    }
  } catch (error: any) {
    addResult(`Create Referral: ${clientName}`, 'FAIL', `Error: ${error.message}`, Date.now() - start);
    return null;
  }
}

// Helper: Get referral details
async function getReferral(referralId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/referrals/${referralId}`, {
    headers: { Cookie: sessionCookie },
  });
  if (response.ok) {
    const data = await response.json();
    return data.referral; // Extract referral from API response
  }
  return null;
}

// Helper: Get next allowed statuses
async function getNextStatuses(referralId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/referrals/${referralId}/next-statuses`, {
    headers: { Cookie: sessionCookie },
  });
  if (response.ok) {
    const data = await response.json();
    return data.nextStatuses?.map((s: any) => s.value) || [];
  }
  return [];
}

// Helper: Transition workflow status
async function transitionStatus(
  referralId: string,
  targetStatus: string,
  reason?: string
): Promise<boolean> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/referrals/${referralId}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ targetStatus, reason }),
    });

    if (response.ok) {
      addResult(
        `Transition to ${targetStatus}`,
        'PASS',
        `Successfully transitioned`,
        Date.now() - start
      );
      return true;
    } else {
      const error = await response.json();
      addResult(`Transition to ${targetStatus}`, 'FAIL', `Failed: ${error.message}`, Date.now() - start);
      return false;
    }
  } catch (error: any) {
    addResult(`Transition to ${targetStatus}`, 'FAIL', `Error: ${error.message}`, Date.now() - start);
    return false;
  }
}

// Helper: Get timeline
async function getTimeline(referralId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/referrals/${referralId}/timeline`, {
    headers: { Cookie: sessionCookie },
  });
  if (response.ok) {
    const data = await response.json();
    return data.timeline || [];
  }
  return [];
}

// Helper: Get all referrals with filters
async function getReferralsWithFilter(clientState?: string): Promise<any[]> {
  const url = clientState
    ? `${API_BASE}/api/referrals?clientState=${clientState}`
    : `${API_BASE}/api/referrals`;
  const response = await fetch(url, {
    headers: { Cookie: sessionCookie },
  });
  if (response.ok) {
    const data = await response.json();
    return data.data || [];
  }
  return [];
}

// Test Suite: Workflow Transitions
async function testWorkflowTransitions() {
  log('\n=== Testing Workflow Transitions ===', 'cyan');

  const testCases = [
    {
      name: 'Happy Path - Complete Journey to Discharge',
      transitions: [
        'documents_requested',
        'documents_received',
        'insurance_verification_pending',
        'insurance_verified',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'discharge_pending',
        'discharged',
      ],
      requiresReason: { discharged: 'UAT test - treatment goals achieved' },
    },
    {
      name: 'Pre-Staging - Direct to Review (Skip Insurance)',
      transitions: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
      ],
    },
    {
      name: 'Pre-Staging - Decline Early',
      transitions: [
        'documents_requested',
        'declined',
      ],
      requiresReason: { declined: 'UAT test - client not suitable' },
    },
    {
      name: 'Pre-Staging - Cancel During Documents',
      transitions: [
        'documents_requested',
        'cancelled',
      ],
    },
    {
      name: 'Insurance Verification Failure Path',
      transitions: [
        'documents_requested',
        'documents_received',
        'insurance_verification_pending',
        'insurance_verification_failed',
        'referred_out',
      ],
    },
    {
      name: 'Pre-Staging - Repeated Document Requests',
      transitions: [
        'documents_requested',
        'documents_requested', // Can repeat this status
        'documents_received',
        'pre_stage_review',
      ],
    },
    {
      name: 'Staging - Assignment Declined with Retry',
      transitions: [
        'documents_requested',
        'documents_received',
        'insurance_verification_pending',
        'insurance_verified',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_declined',
        'matching_in_progress', // Back to matching
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
      ],
    },
    {
      name: 'Staging - Multiple Matching Attempts',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'matching_in_progress', // Can repeat
        'therapist_identified',
        'matching_in_progress', // Can go back
        'therapist_identified',
        'assignment_pending',
      ],
    },
    {
      name: 'Acceptance - Repeated Client Contact Attempts',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'client_contacted', // Can repeat
        'intake_scheduled',
      ],
    },
    {
      name: 'Acceptance - Reschedule Intake',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_scheduled', // Can repeat
        'intake_completed',
        'waiting_first_session',
      ],
    },
    {
      name: 'Active Treatment - On Hold and Resume',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'treatment_on_hold',
        'treatment_resumed',
        'in_treatment',
      ],
    },
    {
      name: 'Active Treatment - Direct Discharge from Treatment',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'discharged', // Direct discharge
      ],
      requiresReason: { discharged: 'UAT test - emergency discharge' },
    },
    {
      name: 'Active Treatment - Discharge from Hold',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'treatment_on_hold',
        'discharge_pending',
        'discharged',
      ],
      requiresReason: { discharged: 'UAT test - discharge while on hold' },
    },
    {
      name: 'Decline from Assignment Phase',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'declined',
      ],
      requiresReason: { declined: 'UAT test - declined during assignment' },
    },
    {
      name: 'Decline from Acceptance Phase',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'declined',
      ],
      requiresReason: { declined: 'UAT test - client declined services' },
    },
    {
      name: 'Cancel from Staging Phase',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'cancelled',
      ],
    },
    {
      name: 'Refer Out from Pre-Stage Review',
      transitions: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'referred_out',
      ],
    },
    {
      name: 'Refer Out from Matching',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'referred_out',
      ],
    },
    {
      name: 'Refer Out after Assignment Declined',
      transitions: [
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_declined',
        'referred_out',
      ],
    },
  ];

  for (const testCase of testCases) {
    log(`\n--- ${testCase.name} ---`, 'blue');
    const referralId = await createTestReferral(`UAT ${testCase.name}`);

    if (!referralId) {
      addResult(testCase.name, 'FAIL', 'Failed to create test referral');
      continue;
    }

    let success = true;
    for (let i = 0; i < testCase.transitions.length; i++) {
      const targetStatus = testCase.transitions[i];
      const reason = testCase.requiresReason?.[targetStatus as keyof typeof testCase.requiresReason];

      // Validate next statuses
      const nextStatuses = await getNextStatuses(referralId);
      if (!nextStatuses.includes(targetStatus)) {
        addResult(
          `Validate Next Statuses`,
          'FAIL',
          `Expected ${targetStatus} in allowed transitions, got: ${nextStatuses.join(', ')}`
        );
        success = false;
        break;
      }

      // Perform transition
      const transitioned = await transitionStatus(referralId, targetStatus, reason);
      if (!transitioned) {
        success = false;
        break;
      }

      // Verify state change
      await new Promise((resolve) => setTimeout(resolve, 100)); // Brief pause
      const referral = await getReferral(referralId);
      if (referral.workflowStatus !== targetStatus) {
        addResult(
          `Verify State Change`,
          'FAIL',
          `Expected ${targetStatus}, got ${referral.workflowStatus}`
        );
        success = false;
        break;
      }
    }

    if (success) {
      addResult(testCase.name, 'PASS', `All ${testCase.transitions.length} transitions successful`);
    }
  }
}

// Test Suite: Timeline Display
async function testTimelineDisplay() {
  log('\n=== Testing Timeline Display ===', 'cyan');

  const referralId = await createTestReferral('UAT Timeline Test');
  if (!referralId) {
    addResult('Timeline Display', 'FAIL', 'Failed to create test referral');
    return;
  }

  // Perform multiple transitions to generate timeline events
  const transitions = [
    'documents_requested',
    'documents_received',
    'insurance_verification_pending',
    'insurance_verified',
    'pre_stage_review',
    'ready_for_assignment',
  ];

  for (const status of transitions) {
    await transitionStatus(referralId, status);
    await new Promise((resolve) => setTimeout(resolve, 200)); // Pause between transitions
  }

  // Fetch timeline
  const start = Date.now();
  const timeline = await getTimeline(referralId);
  const duration = Date.now() - start;

  if (timeline.length === 0) {
    addResult('Timeline Display', 'FAIL', 'Timeline is empty', duration);
    return;
  }

  // Validate timeline structure
  const hasRequiredFields = timeline.every(
    (event: any) => event.timestamp && event.event && event.phase
  );
  if (!hasRequiredFields) {
    addResult('Timeline Display', 'FAIL', 'Timeline events missing required fields', duration);
    return;
  }

  // Validate chronological order
  const isChronological = timeline.every((event: any, i: number) => {
    if (i === 0) return true;
    return new Date(event.timestamp) >= new Date(timeline[i - 1].timestamp);
  });
  if (!isChronological) {
    addResult('Timeline Display', 'FAIL', 'Timeline events not in chronological order', duration);
    return;
  }

  addResult(
    'Timeline Display',
    'PASS',
    `${timeline.length} events displayed correctly in chronological order`,
    duration
  );

  // Test timeline phases
  const phases = [...new Set(timeline.map((e: any) => e.phase))];
  addResult('Timeline Phases', 'PASS', `Phases represented: ${phases.join(', ')}`);
}

// Test Suite: Client State Filtering
async function testClientStateFiltering() {
  log('\n=== Testing Client State Filtering ===', 'cyan');

  // Create referrals in different states
  const testReferrals = [
    { name: 'Prospective Client 1', finalStatus: 'referral_submitted' },
    { name: 'Prospective Client 2', finalStatus: 'documents_requested' },
    { name: 'Prospective Client 3', finalStatus: 'insurance_verified' },
    { name: 'Pending Client 1', finalStatus: 'ready_for_assignment' },
    { name: 'Pending Client 2', finalStatus: 'matching_in_progress' },
    { name: 'Pending Client 3', finalStatus: 'assignment_offered' },
    { name: 'Pending Client 4', finalStatus: 'client_contacted' },
    { name: 'Active Client 1', finalStatus: 'in_treatment' },
    { name: 'Active Client 2', finalStatus: 'treatment_on_hold' },
    { name: 'Inactive Client 1', finalStatus: 'discharged' },
    { name: 'Inactive Client 2', finalStatus: 'cancelled' },
  ];

  const createdReferrals = [];
  for (const test of testReferrals) {
    const referralId = await createTestReferral(test.name);
    if (referralId) {
      createdReferrals.push({ referralId, ...test });
    }
  }

  // Transition to final statuses
  for (const ref of createdReferrals) {
    // Navigate through required transitions
    const pathMap: { [key: string]: string[] } = {
      referral_submitted: [],
      documents_requested: ['documents_requested'],
      insurance_verified: [
        'documents_requested',
        'documents_received',
        'insurance_verification_pending',
        'insurance_verified',
      ],
      ready_for_assignment: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
      ],
      matching_in_progress: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
      ],
      assignment_offered: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
      ],
      client_contacted: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
      ],
      in_treatment: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
      ],
      treatment_on_hold: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'treatment_on_hold',
      ],
      discharged: [
        'documents_requested',
        'documents_received',
        'pre_stage_review',
        'ready_for_assignment',
        'matching_in_progress',
        'therapist_identified',
        'assignment_pending',
        'assignment_offered',
        'assignment_accepted',
        'client_contacted',
        'intake_scheduled',
        'intake_completed',
        'waiting_first_session',
        'in_treatment',
        'discharge_pending',
        'discharged',
      ],
      cancelled: [
        'documents_requested',
        'cancelled',
      ],
    };

    const path = pathMap[ref.finalStatus] || [];
    for (const status of path) {
      const reason = status === 'discharged' ? 'UAT test - filtering test discharge' : undefined;
      await transitionStatus(ref.referralId, status, reason);
    }
  }

  // Wait for state updates
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test filters
  const states = ['prospective', 'pending', 'active', 'inactive'];
  for (const state of states) {
    const start = Date.now();
    const filtered = await getReferralsWithFilter(state);
    const duration = Date.now() - start;

    // Verify all returned referrals match the filter
    const allMatch = filtered.every((r: any) => r.clientState === state);
    if (allMatch) {
      addResult(
        `Filter: ${state}`,
        'PASS',
        `Found ${filtered.length} referral(s) in ${state} state`,
        duration
      );
    } else {
      addResult(
        `Filter: ${state}`,
        'FAIL',
        `Some referrals don't match ${state} state`,
        duration
      );
    }
  }

  // Test "all" filter
  const start = Date.now();
  const allReferrals = await getReferralsWithFilter();
  const duration = Date.now() - start;
  addResult('Filter: All States', 'PASS', `Retrieved ${allReferrals.length} total referrals`, duration);
}

// Test Suite: Validation Rules
async function testValidationRules() {
  log('\n=== Testing Validation Rules ===', 'cyan');

  const referralId = await createTestReferral('UAT Validation Test');
  if (!referralId) {
    addResult('Validation Rules', 'FAIL', 'Failed to create test referral');
    return;
  }

  // Test 1: Invalid transition should fail
  const start1 = Date.now();
  const response1 = await fetch(`${API_BASE}/api/referrals/${referralId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ targetStatus: 'in_treatment' }), // Invalid from referral_submitted
  });

  if (!response1.ok) {
    addResult(
      'Invalid Transition Blocked',
      'PASS',
      'System correctly rejected invalid transition',
      Date.now() - start1
    );
  } else {
    addResult(
      'Invalid Transition Blocked',
      'FAIL',
      'System allowed invalid transition',
      Date.now() - start1
    );
  }

  // Test 2: Decline without reason should fail
  await transitionStatus(referralId, 'documents_requested');
  const start2 = Date.now();
  const response2 = await fetch(`${API_BASE}/api/referrals/${referralId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ targetStatus: 'declined' }), // No reason provided
  });

  if (!response2.ok) {
    addResult(
      'Decline Requires Reason',
      'PASS',
      'System correctly requires reason for decline',
      Date.now() - start2
    );
  } else {
    addResult(
      'Decline Requires Reason',
      'FAIL',
      'System allowed decline without reason',
      Date.now() - start2
    );
  }

  // Test 3: Discharge without reason should fail
  const referralId2 = await createTestReferral('UAT Discharge Validation Test');
  if (referralId2) {
    // Get to in_treatment
    const path = [
      'documents_requested',
      'documents_received',
      'pre_stage_review',
      'ready_for_assignment',
      'matching_in_progress',
      'therapist_identified',
      'assignment_pending',
      'assignment_offered',
      'assignment_accepted',
      'client_contacted',
      'intake_scheduled',
      'intake_completed',
      'waiting_first_session',
      'in_treatment',
    ];
    for (const status of path) {
      await transitionStatus(referralId2, status);
    }

    const start3 = Date.now();
    const response3 = await fetch(`${API_BASE}/api/referrals/${referralId2}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ targetStatus: 'discharged' }), // No reason provided
    });

    if (!response3.ok) {
      addResult(
        'Discharge Requires Reason',
        'PASS',
        'System correctly requires reason for discharge',
        Date.now() - start3
      );
    } else {
      addResult(
        'Discharge Requires Reason',
        'FAIL',
        'System allowed discharge without reason',
        Date.now() - start3
      );
    }
  }

  // Test 4: Terminal states should have no next statuses
  const referralId3 = await createTestReferral('UAT Terminal State Test');
  if (referralId3) {
    // Transition to discharged terminal state
    const path = [
      'documents_requested',
      'documents_received',
      'pre_stage_review',
      'ready_for_assignment',
      'matching_in_progress',
      'therapist_identified',
      'assignment_pending',
      'assignment_offered',
      'assignment_accepted',
      'client_contacted',
      'intake_scheduled',
      'intake_completed',
      'waiting_first_session',
      'in_treatment',
      'discharge_pending',
      'discharged',
    ];
    for (const status of path) {
      const reason = status === 'discharged' ? 'UAT test - terminal state validation' : undefined;
      await transitionStatus(referralId3, status, reason);
    }

    const nextStatuses = await getNextStatuses(referralId3);
    if (nextStatuses.length === 0) {
      addResult('Terminal State: discharged', 'PASS', 'discharged has no next statuses');
    } else {
      addResult('Terminal State: discharged', 'FAIL', `Terminal state has ${nextStatuses.length} next statuses`);
    }
  }

  // Test 5: Test other terminal states
  const terminalTests = [
    { status: 'declined', path: ['documents_requested', 'declined'], reason: 'UAT test - terminal state test' },
    { status: 'cancelled', path: ['documents_requested', 'cancelled'], reason: undefined },
    { status: 'referred_out', path: ['documents_requested', 'documents_received', 'pre_stage_review', 'referred_out'], reason: undefined },
  ];

  for (const terminalTest of terminalTests) {
    const testReferralId = await createTestReferral(`UAT Terminal ${terminalTest.status}`);
    if (testReferralId) {
      for (const status of terminalTest.path) {
        const reason = status === terminalTest.status ? terminalTest.reason : undefined;
        await transitionStatus(testReferralId, status, reason);
      }

      const nextStatuses = await getNextStatuses(testReferralId);
      if (nextStatuses.length === 0) {
        addResult(`Terminal State: ${terminalTest.status}`, 'PASS', `${terminalTest.status} has no next statuses`);
      } else {
        addResult(`Terminal State: ${terminalTest.status}`, 'FAIL', `Terminal state has ${nextStatuses.length} next statuses`);
      }
    }
  }
}

// Generate Report
function generateReport() {
  log('\n=== UAT Test Report ===', 'cyan');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  log(`\nTotal Tests: ${total}`);
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`Skipped: ${skipped}`, 'yellow');

  const passRate = ((passed / total) * 100).toFixed(2);
  log(`\nPass Rate: ${passRate}%`, passed === total ? 'green' : 'yellow');

  if (failed > 0) {
    log('\n=== Failed Tests ===', 'red');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        log(`${r.test}: ${r.message}`, 'red');
      });
  }

  // Calculate average duration
  const durations = results.filter((r) => r.duration).map((r) => r.duration!);
  if (durations.length > 0) {
    const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
    log(`\nAverage Test Duration: ${avgDuration}ms`);
  }

  return failed === 0;
}

// Main execution
async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   MindFit v2 - Automated UAT Script for Workflow System   ║', 'cyan');
  log('║   Sprint 6.5 Phase 3 - Automated Workflow Validation      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nAPI Base: ${API_BASE}`);
  log(`Admin Email: ${ADMIN_EMAIL}\n`);

  // Login
  const loggedIn = await loginAsAdmin();
  if (!loggedIn) {
    log('\nCannot proceed without authentication', 'red');
    process.exit(1);
  }

  // Run test suites
  await testWorkflowTransitions();
  await testTimelineDisplay();
  await testClientStateFiltering();
  await testValidationRules();

  // Generate report
  const allPassed = generateReport();

  log('\n=== UAT Complete ===', 'cyan');
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  log(`\nFatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
