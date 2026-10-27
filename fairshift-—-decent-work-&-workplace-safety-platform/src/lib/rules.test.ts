import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHourlyEquivalent,
  calculateShiftMetrics,
  calculatePayslip,
  calculateHaversineDistanceMeters,
  evaluateFatigueFlags,
  calculateQuitRisk,
  evaluateHazardOverdue,
  aggregateAnonymousFeedback,
  canAccessRoute,
} from './rules';

test('calculateHourlyEquivalent computes daily, hourly, and monthly rates accurately', () => {
  assert.equal(calculateHourlyEquivalent('daily', 800, 8), 100);
  assert.equal(calculateHourlyEquivalent('hourly', 125, 8), 125);
  assert.equal(calculateHourlyEquivalent('monthly', 20800, 8), 100);
});

test('calculateShiftMetrics handles overtime, late grace period, and night shifts crossing midnight', () => {
  // Night shift starting 2026-10-25 at 22:15 (scheduled 22:00, 10m grace -> late by 15m)
  // Ending 2026-10-26 at 08:45 (10h 30m = 630m total, minus 30m break = 600m worked = 8h reg + 2h OT)
  const res = calculateShiftMetrics({
    checkInIso: '2026-10-25T22:15:00.000Z',
    checkOutIso: '2026-10-26T08:45:00.000Z',
    breakMinutes: 30,
    regularHoursPerDay: 8,
    shiftStartHHMM: '22:00',
    lateGraceMinutes: 10,
  });

  assert.equal(res.shiftDate, '2026-10-25');
  assert.equal(res.workedMinutes, 600);
  assert.equal(res.regularMinutes, 480);
  assert.equal(res.overtimeMinutes, 120);
  assert.equal(res.isLate, true);
  assert.equal(res.lateByMinutes, 15);
  assert.ok(res.flags.includes('LATE'));
  assert.ok(res.flags.includes('OVERTIME'));
});

test('calculatePayslip computes base, 2x overtime, bonus, deductions, gross and net pay', () => {
  const slip = calculatePayslip({
    wageType: 'daily',
    wageRate: 800, // ₹100/hr
    regularHoursPerDay: 8,
    overtimeMultiplier: 2.0, // ₹200/hr OT
    attendanceRecords: [
      { date: '2026-10-20', regularMinutes: 480, overtimeMinutes: 120 }, // ₹800 base + ₹400 OT
      { date: '2026-10-21', regularMinutes: 480, overtimeMinutes: 60 },  // ₹800 base + ₹200 OT
    ],
    bonusAmount: 500,
    deductions: [{ label: 'Canteen Advance', amount: 300, explanation: 'Meal advance recovery' }],
  });

  assert.equal(slip.hourlyEquivalent, 100);
  assert.equal(slip.regularHoursTotal, 16);
  assert.equal(slip.overtimeHoursTotal, 3);
  assert.equal(slip.basePay, 1600);
  assert.equal(slip.overtimePay, 600);
  assert.equal(slip.bonusPay, 500);
  assert.equal(slip.gross, 2700);
  assert.equal(slip.deductionsTotal, 300);
  assert.equal(slip.net, 2400);
});

test('calculateHaversineDistanceMeters verifies geofence radius accurately', () => {
  // Same point = 0m
  assert.equal(calculateHaversineDistanceMeters(10.0159, 76.3419, 10.0159, 76.3419), 0);
  // ~111m for 0.001 deg latitude
  const dist = calculateHaversineDistanceMeters(10.0159, 76.3419, 10.0169, 76.3419);
  assert.ok(dist >= 105 && dist <= 115);
});

test('evaluateFatigueFlags detects 7-day streak, >9h daily shift, >48h weekly, and <11h rest', () => {
  const shifts = Array.from({ length: 7 }, (_, i) => {
    const day = 18 + i;
    return {
      date: `2026-10-${day}`,
      checkIn: `2026-10-${day}T08:00:00.000Z`,
      checkOut: `2026-10-${day}T18:30:00.000Z`, // 10h worked
      workedMinutes: 600,
    };
  });

  const evalRes = evaluateFatigueFlags(shifts);
  assert.equal(evalRes.isFlagged, true);
  assert.equal(evalRes.consecutiveDaysWorked, 7);
  assert.equal(evalRes.maxSingleDayHours, 10);
  assert.equal(evalRes.weeklyHours, 70);
  assert.ok(evalRes.reasons.length >= 3);
});

test('calculateQuitRisk computes explainable 0-100 score and top 3 reasons', () => {
  const risk = calculateQuitRisk({
    absencesLast30Days: 3, // 24 pts
    lateCountLast30Days: 2, // 6 pts
    weeklyOvertimeHours: 14, // 15 pts
    activeFatigueFlagCount: 2, // 15 pts
    unresolvedDisputeOrHazardCount: 1, // 15 pts
    lowMoodCheckinCount: 2, // 10 pts
    teamFeedbackAverage: 2.5, // 10 pts
  });

  assert.equal(risk.score, 95);
  assert.equal(risk.level, 'high');
  assert.equal(risk.topReasons.length, 3);
  assert.ok(risk.topReasons[0].includes('unscheduled absences'));
});

test('evaluateHazardOverdue flags unresolved danger reports past 24 hours', () => {
  const overdue = evaluateHazardOverdue(
    '2026-10-24T08:00:00.000Z',
    'danger',
    'received',
    '2026-10-26T12:00:00.000Z'
  );
  assert.equal(overdue.isOverdue, true);
  assert.ok(overdue.hoursRemaining < 0);

  const fixed = evaluateHazardOverdue(
    '2026-10-24T08:00:00.000Z',
    'danger',
    'fixed',
    '2026-10-26T12:00:00.000Z'
  );
  assert.equal(fixed.isOverdue, false);
});

test('aggregateAnonymousFeedback hides scores below 5 responses and unlocks at 5+', () => {
  const fourResponses = [1, 2, 3, 4].map((n) => ({
    id: `resp-${n}`,
    org_id: 'org-1',
    team_id: 'team-a',
    week: '2026-W43',
    answers: { manager: 4, safety: 5 },
    comment: `Comment ${n}`,
  }));

  const hidden = aggregateAnonymousFeedback(fourResponses, 5);
  assert.equal(hidden.isVisible, false);
  assert.equal(hidden.sanitizedComments.length, 0);

  const fiveResponses = [
    ...fourResponses,
    {
      id: 'resp-5',
      org_id: 'org-1',
      team_id: 'team-a',
      week: '2026-W43',
      answers: { manager: 4, safety: 5 },
      comment: 'Need cooler drinking water near Block B',
    },
  ];

  const visible = aggregateAnonymousFeedback(fiveResponses, 5);
  assert.equal(visible.isVisible, true);
  assert.equal(visible.responseCount, 5);
  assert.equal(visible.topicAverages.manager, 4);
  assert.equal(visible.topicAverages.safety, 5);
  assert.equal(visible.sanitizedComments.length, 5);
});

test('canAccessRoute blocks workers from /admin and managers from payroll/settings', () => {
  assert.equal(canAccessRoute('worker', '/admin').allowed, false);
  assert.equal(canAccessRoute('worker', '/admin/payroll').allowed, false);
  assert.equal(canAccessRoute('worker', '/worker/payslips').allowed, true);
  assert.equal(canAccessRoute('manager', '/admin/hazards').allowed, true);
  assert.equal(canAccessRoute('manager', '/admin/payroll').allowed, false);
  assert.equal(canAccessRoute('admin', '/admin/payroll').allowed, true);
});
