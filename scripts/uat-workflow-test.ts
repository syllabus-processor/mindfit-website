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
    const response = await fetch(`${API_BASE}/api/referrals/submit`, {
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
        `Referral ID: ${data.referralId}`,
        Date.now() - start
      );
      return data.referralId;
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
    return await response.json();
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
      name: 'Referral Phase - Full Path',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'documents_requested',
        'referral_under_review',
        'referral_accepted',
      ],
    },
    {
      name: 'Referral Phase - Accept Path',
      transitions: ['referral_submitted', 'referral_under_review', 'referral_accepted'],
    },
    {
      name: 'Referral Phase - Decline Path',
      transitions: ['referral_submitted', 'referral_under_review', 'referral_declined'],
      requiresReason: 'referral_declined',
    },
    {
      name: 'Pre-Staging to Staging',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
      ],
    },
    {
      name: 'Staging to Assignment - Accept Path',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
      ],
    },
    {
      name: 'Staging to Assignment - Decline and Retry',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_declined',
        'staging',
      ],
    },
    {
      name: 'Full Happy Path to Treatment',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
      ],
    },
    {
      name: 'Treatment On Hold and Resume',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
        'treatment_on_hold',
        'in_treatment',
      ],
    },
    {
      name: 'Treatment Complete',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
        'treatment_complete',
      ],
    },
    {
      name: 'Decline from Treatment',
      transitions: [
        'referral_submitted',
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
        'declined',
      ],
      requiresReason: 'declined',
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
    for (let i = 1; i < testCase.transitions.length; i++) {
      const targetStatus = testCase.transitions[i];
      const reason = testCase.requiresReason === targetStatus ? 'UAT test decline reason' : undefined;

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
      addResult(testCase.name, 'PASS', `All ${testCase.transitions.length - 1} transitions successful`);
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
    'referral_under_review',
    'documents_requested',
    'referral_under_review',
    'referral_accepted',
    'pre_staging',
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
    { name: 'Prospective Client 2', finalStatus: 'referral_under_review' },
    { name: 'Pending Client 1', finalStatus: 'pre_staging' },
    { name: 'Pending Client 2', finalStatus: 'staging' },
    { name: 'Active Client 1', finalStatus: 'in_treatment' },
    { name: 'Active Client 2', finalStatus: 'treatment_on_hold' },
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
      referral_under_review: ['referral_under_review'],
      pre_staging: ['referral_under_review', 'referral_accepted', 'pre_staging'],
      staging: ['referral_under_review', 'referral_accepted', 'pre_staging', 'pre_staging_complete', 'staging'],
      in_treatment: [
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
      ],
      treatment_on_hold: [
        'referral_under_review',
        'referral_accepted',
        'pre_staging',
        'pre_staging_complete',
        'staging',
        'assignment_proposed',
        'assignment_accepted',
        'intake_scheduled',
        'waiting_first_session',
        'in_treatment',
        'treatment_on_hold',
      ],
    };

    const path = pathMap[ref.finalStatus] || [];
    for (const status of path) {
      await transitionStatus(ref.referralId, status);
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
  await transitionStatus(referralId, 'referral_under_review');
  const start2 = Date.now();
  const response2 = await fetch(`${API_BASE}/api/referrals/${referralId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ targetStatus: 'referral_declined' }), // No reason provided
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

  // Test 3: Terminal states should have no next statuses
  const referralId2 = await createTestReferral('UAT Terminal State Test');
  if (referralId2) {
    // Transition to terminal state
    const path = [
      'referral_under_review',
      'referral_accepted',
      'pre_staging',
      'pre_staging_complete',
      'staging',
      'assignment_proposed',
      'assignment_accepted',
      'intake_scheduled',
      'waiting_first_session',
      'in_treatment',
      'treatment_complete',
    ];
    for (const status of path) {
      await transitionStatus(referralId2, status);
    }

    const nextStatuses = await getNextStatuses(referralId2);
    if (nextStatuses.length === 0) {
      addResult('Terminal State', 'PASS', 'treatment_complete has no next statuses');
    } else {
      addResult('Terminal State', 'FAIL', `Terminal state has ${nextStatuses.length} next statuses`);
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
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`⏭️  Skipped: ${skipped}`, 'yellow');

  const passRate = ((passed / total) * 100).toFixed(2);
  log(`\nPass Rate: ${passRate}%`, passed === total ? 'green' : 'yellow');

  if (failed > 0) {
    log('\n=== Failed Tests ===', 'red');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        log(`❌ ${r.test}: ${r.message}`, 'red');
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
    log('\n❌ Cannot proceed without authentication', 'red');
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
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
