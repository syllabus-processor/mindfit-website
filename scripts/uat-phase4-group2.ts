#!/usr/bin/env tsx
/**
 * MindFit Phase 4 Group 2 - UAT Test Suite
 * Tests: Therapists API, Rooms API, Appointments API with Conflict Detection
 *
 * Usage: npx tsx scripts/uat-phase4-group2.ts
 */

import { expect } from "chai";

const BASE_URL = process.env.BASE_URL || "https://uat.ruha.io";
const API_BASE = `${BASE_URL}/api`;

// Test context
let authToken: string | null = null;
let createdTherapistId: number | null = null;
let createdRoomId: number | null = null;
let createdAppointmentId: number | null = null;

// Stats
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper functions
function test(description: string, fn: () => Promise<void>) {
  return async () => {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✅ ${description}`);
    } catch (error: any) {
      failedTests++;
      console.log(`  ❌ ${description}`);
      console.log(`     Error: ${error.message}`);
    }
  };
}

async function login() {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "admin123",
    }),
    credentials: "include",
  });

  const cookies = response.headers.get("set-cookie");
  if (cookies) {
    const match = cookies.match(/connect\.sid=([^;]+)/);
    if (match) {
      authToken = match[1];
    }
  }

  return response;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(authToken ? { Cookie: `connect.sid=${authToken}` } : {}),
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function runTherapistTests() {
  console.log("\n📋 THERAPISTS API TESTS\n");

  await test("Create therapist - valid data", async () => {
    const response = await fetch(`${API_BASE}/therapists`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@mindfit.local",
        phone: "+1-555-0101",
        specialties: ["Cognitive Behavioral Therapy", "Trauma-Informed Care"],
        isActive: true,
      }),
    });

    expect(response.status).to.equal(201);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.therapist).to.have.property("id");
    expect(data.therapist.name).to.equal("Dr. Sarah Johnson");
    createdTherapistId = data.therapist.id;
  })();

  await test("Create therapist - invalid email", async () => {
    const response = await fetch(`${API_BASE}/therapists`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Dr. Invalid Email",
        email: "not-an-email",
        isActive: true,
      }),
    });

    expect(response.status).to.equal(400);
    const data = await response.json();
    expect(data.success).to.be.false;
    expect(data.message).to.include("email");
  })();

  await test("Get all therapists", async () => {
    const response = await fetch(`${API_BASE}/therapists`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.therapists).to.be.an("array");
    expect(data.therapists.length).to.be.greaterThan(0);
  })();

  await test("Get therapist by ID", async () => {
    expect(createdTherapistId).to.not.be.null;
    const response = await fetch(`${API_BASE}/therapists/${createdTherapistId}`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.therapist.id).to.equal(createdTherapistId);
    expect(data.therapist.name).to.equal("Dr. Sarah Johnson");
  })();

  await test("Get therapist by ID - not found", async () => {
    const response = await fetch(`${API_BASE}/therapists/999999`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(404);
    const data = await response.json();
    expect(data.success).to.be.false;
  })();

  await test("Update therapist", async () => {
    expect(createdTherapistId).to.not.be.null;
    const response = await fetch(`${API_BASE}/therapists/${createdTherapistId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        phone: "+1-555-0102",
        specialties: ["CBT", "Trauma", "EMDR"],
      }),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.therapist.phone).to.equal("+1-555-0102");
    expect(data.therapist.specialties).to.have.lengthOf(3);
  })();

  await test("Filter therapists by active status", async () => {
    const response = await fetch(`${API_BASE}/therapists?isActive=true`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.therapists).to.be.an("array");
    data.therapists.forEach((t: any) => expect(t.isActive).to.be.true);
  })();
}

async function runRoomTests() {
  console.log("\n🏢 ROOMS API TESTS\n");

  await test("Create room - physical", async () => {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Therapy Room 101",
        location: "Building A, First Floor",
        capacity: 2,
        isVirtual: false,
        isActive: true,
      }),
    });

    expect(response.status).to.equal(201);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.room).to.have.property("id");
    expect(data.room.name).to.equal("Therapy Room 101");
    expect(data.room.isVirtual).to.be.false;
    createdRoomId = data.room.id;
  })();

  await test("Create room - virtual", async () => {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Zoom Room A",
        location: "https://zoom.us/j/123456789",
        capacity: 10,
        isVirtual: true,
        isActive: true,
      }),
    });

    expect(response.status).to.equal(201);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.room.isVirtual).to.be.true;
  })();

  await test("Get all rooms", async () => {
    const response = await fetch(`${API_BASE}/rooms`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.rooms).to.be.an("array");
    expect(data.rooms.length).to.be.greaterThan(0);
  })();

  await test("Get room by ID", async () => {
    expect(createdRoomId).to.not.be.null;
    const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.room.id).to.equal(createdRoomId);
  })();

  await test("Update room", async () => {
    expect(createdRoomId).to.not.be.null;
    const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        capacity: 3,
        location: "Building A, First Floor (Updated)",
      }),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.room.capacity).to.equal(3);
  })();

  await test("Filter rooms by virtual status", async () => {
    const response = await fetch(`${API_BASE}/rooms?isVirtual=true`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.rooms).to.be.an("array");
    data.rooms.forEach((r: any) => expect(r.isVirtual).to.be.true);
  })();

  await test("Filter rooms by active status", async () => {
    const response = await fetch(`${API_BASE}/rooms?isActive=true`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    data.rooms.forEach((r: any) => expect(r.isActive).to.be.true);
  })();
}

async function runAppointmentTests() {
  console.log("\n📅 APPOINTMENTS API TESTS\n");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  await test("Create appointment - valid data", async () => {
    const response = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        clientId: 1,
        therapistId: createdTherapistId,
        roomId: createdRoomId,
        startTime: tomorrow.toISOString(),
        endTime: tomorrowEnd.toISOString(),
        status: "scheduled",
        notes: "Initial consultation",
      }),
    });

    expect(response.status).to.equal(201);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.appointment).to.have.property("id");
    createdAppointmentId = data.appointment.id;
  })();

  await test("Create appointment - conflict detection", async () => {
    // Try to create overlapping appointment with same therapist
    const response = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        clientId: 2,
        therapistId: createdTherapistId, // Same therapist
        roomId: null,
        startTime: new Date(tomorrow.getTime() + 30 * 60000).toISOString(), // 30 min into existing
        endTime: new Date(tomorrowEnd.getTime() + 30 * 60000).toISOString(),
        status: "scheduled",
      }),
    });

    expect(response.status).to.equal(409); // Conflict
    const data = await response.json();
    expect(data.success).to.be.false;
    expect(data.message).to.include("conflict");
    expect(data.conflicts).to.be.an("array");
  })();

  await test("Create appointment - no conflict (different time)", async () => {
    const laterTime = new Date(tomorrow);
    laterTime.setHours(14, 0, 0, 0);
    const laterTimeEnd = new Date(laterTime);
    laterTimeEnd.setHours(15, 0, 0, 0);

    const response = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        clientId: 2,
        therapistId: createdTherapistId,
        roomId: createdRoomId,
        startTime: laterTime.toISOString(),
        endTime: laterTimeEnd.toISOString(),
        status: "scheduled",
      }),
    });

    expect(response.status).to.equal(201);
    const data = await response.json();
    expect(data.success).to.be.true;
  })();

  await test("Check conflicts endpoint", async () => {
    const response = await fetch(
      `${API_BASE}/appointments/conflicts?` +
        `therapistId=${createdTherapistId}&` +
        `startTime=${tomorrow.toISOString()}&` +
        `endTime=${tomorrowEnd.toISOString()}`,
      { headers: getHeaders() }
    );

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.hasConflict).to.be.true;
    expect(data.conflicts).to.be.an("array");
    expect(data.conflicts.length).to.be.greaterThan(0);
  })();

  await test("Get all appointments", async () => {
    const response = await fetch(`${API_BASE}/appointments`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.appointments).to.be.an("array");
    expect(data.appointments.length).to.be.greaterThan(0);
  })();

  await test("Get appointment by ID", async () => {
    expect(createdAppointmentId).to.not.be.null;
    const response = await fetch(`${API_BASE}/appointments/${createdAppointmentId}`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.appointment.id).to.equal(createdAppointmentId);
  })();

  await test("Filter appointments by therapist", async () => {
    const response = await fetch(`${API_BASE}/appointments?therapistId=${createdTherapistId}`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.appointments).to.be.an("array");
    data.appointments.forEach((apt: any) => {
      expect(apt.therapistId).to.equal(createdTherapistId);
    });
  })();

  await test("Filter appointments by status", async () => {
    const response = await fetch(`${API_BASE}/appointments?status=scheduled`, {
      headers: getHeaders(),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    data.appointments.forEach((apt: any) => {
      expect(apt.status).to.equal("scheduled");
    });
  })();

  await test("Update appointment", async () => {
    expect(createdAppointmentId).to.not.be.null;
    const response = await fetch(`${API_BASE}/appointments/${createdAppointmentId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        notes: "Updated consultation notes",
        status: "confirmed",
      }),
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data.success).to.be.true;
    expect(data.appointment.notes).to.equal("Updated consultation notes");
    expect(data.appointment.status).to.equal("confirmed");
  })();

  await test("Update appointment - conflict detection", async () => {
    // Get the second appointment ID
    const listResponse = await fetch(
      `${API_BASE}/appointments?therapistId=${createdTherapistId}`,
      { headers: getHeaders() }
    );
    const listData = await listResponse.json();
    const secondAppointment = listData.appointments.find(
      (apt: any) => apt.id !== createdAppointmentId
    );

    if (secondAppointment) {
      // Try to update it to conflict with first appointment
      const response = await fetch(`${API_BASE}/appointments/${secondAppointment.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: tomorrowEnd.toISOString(),
        }),
      });

      expect(response.status).to.equal(409);
      const data = await response.json();
      expect(data.success).to.be.false;
      expect(data.message).to.include("conflict");
    }
  })();
}

async function runCleanupTests() {
  console.log("\n🧹 CLEANUP TESTS\n");

  await test("Delete appointment", async () => {
    if (createdAppointmentId) {
      const response = await fetch(`${API_BASE}/appointments/${createdAppointmentId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.success).to.be.true;
    }
  })();

  await test("Delete therapist (soft delete)", async () => {
    if (createdTherapistId) {
      const response = await fetch(`${API_BASE}/therapists/${createdTherapistId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.success).to.be.true;
    }
  })();

  await test("Delete room (soft delete)", async () => {
    if (createdRoomId) {
      const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.success).to.be.true;
    }
  })();

  await test("Verify therapist is soft deleted", async () => {
    if (createdTherapistId) {
      const response = await fetch(`${API_BASE}/therapists/${createdTherapistId}`, {
        headers: getHeaders(),
      });

      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.therapist.isActive).to.be.false;
    }
  })();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("MindFit Phase 4 Group 2 - UAT Test Suite");
  console.log("Testing: Therapists, Rooms, Appointments APIs");
  console.log("=".repeat(70));

  try {
    // Login first
    console.log("\n🔐 AUTHENTICATION\n");
    await test("Admin login", async () => {
      const response = await login();
      expect(response.status).to.equal(200);
      const data = await response.json();
      expect(data.success).to.be.true;
      expect(authToken).to.not.be.null;
    })();

    if (!authToken) {
      throw new Error("Authentication failed - cannot proceed with tests");
    }

    // Run all test suites
    await runTherapistTests();
    await runRoomTests();
    await runAppointmentTests();
    await runCleanupTests();

    // Print summary
    console.log("\n" + "=".repeat(70));
    console.log("TEST SUMMARY");
    console.log("=".repeat(70));
    console.log(`Total Tests:  ${totalTests}`);
    console.log(`✅ Passed:    ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed:    ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log("=".repeat(70));

    if (failedTests === 0) {
      console.log("\n🎉 ALL TESTS PASSED! Phase 4 Group 2 is production-ready.\n");
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Review errors above.\n`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run tests
main();
