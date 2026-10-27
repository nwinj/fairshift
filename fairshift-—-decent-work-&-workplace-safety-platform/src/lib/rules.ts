export type Role = 'worker' | 'manager' | 'admin';
export type WageType = 'daily' | 'hourly' | 'monthly';
export type SectorKey = 'construction' | 'college' | 'hospital' | 'factory';
export type Severity = 'danger' | 'medium' | 'low';
export type HazardStatus = 'received' | 'seen' | 'in_progress' | 'fixed';

export interface OrgLabourSettings {
  regularHoursPerDay: number;
  overtimeMultiplier: number;
  lateGraceMinutes: number;
  defaultRadiusMeters: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  minRestHours: number;
  maxConsecutiveDays: number;
  feedbackVisibilityThreshold: number;
  hazardResponseHours: {
    danger: number;
    medium: number;
    low: number;
  };
}

export const DEFAULT_LABOUR_SETTINGS: OrgLabourSettings = {
  regularHoursPerDay: 8,
  overtimeMultiplier: 2.0,
  lateGraceMinutes: 10,
  defaultRadiusMeters: 200,
  maxDailyHours: 9,
  maxWeeklyHours: 48,
  minRestHours: 11,
  maxConsecutiveDays: 7,
  feedbackVisibilityThreshold: 5,
  hazardResponseHours: {
    danger: 24,
    medium: 72,
    low: 168, // 7 days
  },
};

/**
 * Hourly equivalent for daily-wage workers = daily rate divided by regular hours per day.
 * Monthly workers = monthly rate divided by (26 working days * regular hours per day).
 */
export function calculateHourlyEquivalent(
  wageType: WageType,
  wageRate: number,
  regularHoursPerDay = 8
): number {
  const safeHours = Math.max(1, regularHoursPerDay);
  if (wageType === 'hourly') {
    return Number(wageRate.toFixed(2));
  }
  if (wageType === 'daily') {
    return Number((wageRate / safeHours).toFixed(2));
  }
  // monthly
  return Number((wageRate / (26 * safeHours)).toFixed(2));
}

export interface ShiftCalculationResult {
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  lateByMinutes: number;
  shiftDate: string; // YYYY-MM-DD of start time (night shifts crossing midnight belong to start date)
  flags: string[];
}

/**
 * Computes worked minutes, regular minutes, automatic overtime minutes, lateness, and shift date.
 * A night shift that crosses midnight belongs to its start date.
 */
export function calculateShiftMetrics(params: {
  checkInIso: string;
  checkOutIso: string;
  breakMinutes: number;
  regularHoursPerDay: number;
  shiftStartHHMM: string;
  lateGraceMinutes: number;
}): ShiftCalculationResult {
  const checkIn = new Date(params.checkInIso);
  const checkOut = new Date(params.checkOutIso);
  const rawMinutes = Math.max(
    0,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
  );
  const workedMinutes = Math.max(0, rawMinutes - Math.max(0, params.breakMinutes));
  const targetRegularMinutes = Math.round(params.regularHoursPerDay * 60);
  const regularMinutes = Math.min(workedMinutes, targetRegularMinutes);
  const overtimeMinutes = Math.max(0, workedMinutes - targetRegularMinutes);

  // Attribute shift date to start date in local/UTC YYYY-MM-DD
  const shiftDate = params.checkInIso.slice(0, 10);

  // Compare check-in against scheduled start time on shiftDate
  const [schedHour, schedMin] = params.shiftStartHHMM.split(':').map(Number);
  const scheduledStart = new Date(checkIn);
  scheduledStart.setUTCHours(schedHour || 0, schedMin || 0, 0, 0);

  const diffFromStartMinutes = Math.round(
    (checkIn.getTime() - scheduledStart.getTime()) / 60000
  );
  const isLate = diffFromStartMinutes > params.lateGraceMinutes;
  const lateByMinutes = isLate ? diffFromStartMinutes : 0;

  const flags: string[] = [];
  if (isLate) flags.push('LATE');
  if (overtimeMinutes > 0) flags.push('OVERTIME');
  if (workedMinutes > 9 * 60) flags.push('LONG_SHIFT');

  return {
    workedMinutes,
    regularMinutes,
    overtimeMinutes,
    isLate,
    lateByMinutes,
    shiftDate,
    flags,
  };
}

export interface PayslipLineItem {
  id: string;
  category: 'base' | 'overtime' | 'bonus' | 'deduction';
  labelKey: string;
  label: string;
  explanation: string;
  amount: number;
  details: Array<{
    date: string;
    hours: number;
    rate: number;
    amount: number;
    note: string;
  }>;
}

export interface PayslipCalculationResult {
  hourlyEquivalent: number;
  basePay: number;
  overtimePay: number;
  bonusPay: number;
  deductionsTotal: number;
  gross: number;
  net: number;
  regularHoursTotal: number;
  overtimeHoursTotal: number;
  lines: PayslipLineItem[];
}

export function calculatePayslip(params: {
  wageType: WageType;
  wageRate: number;
  regularHoursPerDay: number;
  overtimeMultiplier: number;
  attendanceRecords: Array<{
    date: string;
    regularMinutes: number;
    overtimeMinutes: number;
    shiftName?: string;
  }>;
  bonusAmount?: number;
  bonusReason?: string;
  deductions?: Array<{ label: string; amount: number; explanation: string }>;
}): PayslipCalculationResult {
  const hourlyEquivalent = calculateHourlyEquivalent(
    params.wageType,
    params.wageRate,
    params.regularHoursPerDay
  );

  let regularMinutesSum = 0;
  let overtimeMinutesSum = 0;

  const baseDetails: PayslipLineItem['details'] = [];
  const overtimeDetails: PayslipLineItem['details'] = [];

  for (const rec of params.attendanceRecords) {
    regularMinutesSum += rec.regularMinutes;
    overtimeMinutesSum += rec.overtimeMinutes;

    const regHours = Number((rec.regularMinutes / 60).toFixed(2));
    const dayBaseAmount = Math.round(regHours * hourlyEquivalent);
    baseDetails.push({
      date: rec.date,
      hours: regHours,
      rate: hourlyEquivalent,
      amount: dayBaseAmount,
      note: rec.shiftName || 'Regular Shift',
    });

    if (rec.overtimeMinutes > 0) {
      const otHours = Number((rec.overtimeMinutes / 60).toFixed(2));
      const otRate = Number((hourlyEquivalent * params.overtimeMultiplier).toFixed(2));
      const dayOtAmount = Math.round(otHours * otRate);
      overtimeDetails.push({
        date: rec.date,
        hours: otHours,
        rate: otRate,
        amount: dayOtAmount,
        note: `${params.overtimeMultiplier}x Overtime (${otHours} hrs)`,
      });
    }
  }

  const regularHoursTotal = Number((regularMinutesSum / 60).toFixed(2));
  const overtimeHoursTotal = Number((overtimeMinutesSum / 60).toFixed(2));

  const basePay = Math.round(regularHoursTotal * hourlyEquivalent);
  const overtimePay = Math.round(
    overtimeHoursTotal * hourlyEquivalent * params.overtimeMultiplier
  );
  const bonusPay = Math.round(params.bonusAmount || 0);

  const deductionList = params.deductions || [];
  const deductionsTotal = Math.round(
    deductionList.reduce((acc, d) => acc + d.amount, 0)
  );

  const gross = basePay + overtimePay + bonusPay;
  const net = Math.max(0, gross - deductionsTotal);

  const lines: PayslipLineItem[] = [
    {
      id: 'line-base',
      category: 'base',
      labelKey: 'basePay',
      label: 'Base Pay (Regular Hours)',
      explanation: `${regularHoursTotal} regular hours across ${params.attendanceRecords.length} shifts at ₹${hourlyEquivalent}/hr`,
      amount: basePay,
      details: baseDetails,
    },
    {
      id: 'line-overtime',
      category: 'overtime',
      labelKey: 'overtimePay',
      label: `Overtime Pay (${params.overtimeMultiplier}x Rate)`,
      explanation: `${overtimeHoursTotal} extra hours paid at ${params.overtimeMultiplier}x (₹${(
        hourlyEquivalent * params.overtimeMultiplier
      ).toFixed(0)}/hr)`,
      amount: overtimePay,
      details: overtimeDetails,
    },
  ];

  if (bonusPay > 0) {
    lines.push({
      id: 'line-bonus',
      category: 'bonus',
      labelKey: 'bonusPay',
      label: 'Attendance & Safety Bonus',
      explanation: params.bonusReason || 'Full attendance and zero safety incidents bonus',
      amount: bonusPay,
      details: [
        {
          date: params.attendanceRecords[params.attendanceRecords.length - 1]?.date || 'Period',
          hours: 0,
          rate: bonusPay,
          amount: bonusPay,
          note: params.bonusReason || 'Period Bonus',
        },
      ],
    });
  }

  for (let i = 0; i < deductionList.length; i++) {
    const d = deductionList[i];
    lines.push({
      id: `line-deduction-${i + 1}`,
      category: 'deduction',
      labelKey: 'deduction',
      label: d.label,
      explanation: d.explanation,
      amount: d.amount,
      details: [
        {
          date: 'Payroll Deduction',
          hours: 0,
          rate: d.amount,
          amount: d.amount,
          note: d.explanation,
        },
      ],
    });
  }

  return {
    hourlyEquivalent,
    basePay,
    overtimePay,
    bonusPay,
    deductionsTotal,
    gross,
    net,
    regularHoursTotal,
    overtimeHoursTotal,
    lines,
  };
}

/**
 * Haversine distance in meters between two GPS coordinates.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface FatigueEvaluation {
  isFlagged: boolean;
  reasons: string[];
  maxSingleDayHours: number;
  weeklyHours: number;
  minRestBetweenShiftsHours: number;
  consecutiveDaysWorked: number;
  recommendation: string;
}

/**
 * Evaluates F6 Fatigue rules:
 * - More than maxDailyHours (default 9) in a day
 * - More than maxWeeklyHours (default 48) in a 7-day window
 * - Less than minRestHours (default 11) of rest between shifts
 * - maxConsecutiveDays (default 7) days in a row without a day off
 */
export function evaluateFatigueFlags(
  shifts: Array<{ date: string; checkIn: string; checkOut: string; workedMinutes: number }>,
  settings: Pick<
    OrgLabourSettings,
    'maxDailyHours' | 'maxWeeklyHours' | 'minRestHours' | 'maxConsecutiveDays'
  > = DEFAULT_LABOUR_SETTINGS
): FatigueEvaluation {
  if (!shifts.length) {
    return {
      isFlagged: false,
      reasons: [],
      maxSingleDayHours: 0,
      weeklyHours: 0,
      minRestBetweenShiftsHours: 24,
      consecutiveDaysWorked: 0,
      recommendation: 'Schedule within healthy limits.',
    };
  }

  const sorted = [...shifts].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const reasons: string[] = [];

  // 1. Max daily hours
  let maxSingleDayMinutes = 0;
  for (const s of sorted) {
    if (s.workedMinutes > maxSingleDayMinutes) {
      maxSingleDayMinutes = s.workedMinutes;
    }
  }
  const maxSingleDayHours = Number((maxSingleDayMinutes / 60).toFixed(1));
  if (maxSingleDayHours > settings.maxDailyHours) {
    reasons.push(
      `Worked ${maxSingleDayHours} hrs in a single day (limit: ${settings.maxDailyHours} hrs)`
    );
  }

  // 2. Weekly hours (last 7 shifts / 7 days)
  const recent7 = sorted.slice(-7);
  const weeklyMinutes = recent7.reduce((acc, s) => acc + s.workedMinutes, 0);
  const weeklyHours = Number((weeklyMinutes / 60).toFixed(1));
  if (weeklyHours > settings.maxWeeklyHours) {
    reasons.push(
      `Worked ${weeklyHours} hrs in 7-day window (limit: ${settings.maxWeeklyHours} hrs)`
    );
  }

  // 3. Rest between consecutive shifts
  let minRestHours = 24;
  for (let i = 1; i < sorted.length; i++) {
    const prevOut = new Date(sorted[i - 1].checkOut).getTime();
    const currIn = new Date(sorted[i].checkIn).getTime();
    const restHrs = Number(((currIn - prevOut) / (1000 * 60 * 60)).toFixed(1));
    if (restHrs >= 0 && restHrs < minRestHours) {
      minRestHours = restHrs;
    }
  }
  if (minRestHours < settings.minRestHours) {
    reasons.push(
      `Only ${minRestHours} hrs rest between shifts (minimum: ${settings.minRestHours} hrs)`
    );
  }

  // 4. Consecutive days worked
  const uniqueDates = Array.from(new Set(sorted.map((s) => s.date))).sort();
  let maxStreak = uniqueDates.length > 0 ? 1 : 0;
  let currentStreak = uniqueDates.length > 0 ? 1 : 0;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + 'T00:00:00Z').getTime();
    const curr = new Date(uniqueDates[i] + 'T00:00:00Z').getTime();
    const dayDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (dayDiff === 1) {
      currentStreak += 1;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  if (maxStreak >= settings.maxConsecutiveDays) {
    reasons.push(
      `Worked ${maxStreak} days in a row without a rest day (limit: ${settings.maxConsecutiveDays} days)`
    );
  }

  return {
    isFlagged: reasons.length > 0,
    reasons,
    maxSingleDayHours,
    weeklyHours,
    minRestBetweenShiftsHours: minRestHours,
    consecutiveDaysWorked: maxStreak,
    recommendation:
      reasons.length > 0
        ? 'Assign mandatory 24-hour rest day and rotate off night/heavy shift.'
        : 'Schedule within healthy limits.',
  };
}

export interface QuitRiskInput {
  absencesLast30Days: number; // up to 25 pts
  lateCountLast30Days: number; // up to 10 pts
  weeklyOvertimeHours: number; // up to 15 pts
  activeFatigueFlagCount: number; // up to 15 pts
  unresolvedDisputeOrHazardCount: number; // up to 15 pts
  lowMoodCheckinCount: number; // up to 10 pts
  teamFeedbackAverage: number; // 1 to 5 scale; low (< 3.2) adds up to 10 pts
}

export interface QuitRiskResult {
  score: number; // 0 to 100
  level: 'low' | 'moderate' | 'high';
  topReasons: string[];
  breakdown: Array<{ factor: string; points: number; maxPoints: number; reason: string }>;
}

/**
 * F7 Quit-risk indicator (0 to 100), rule-based and explainable:
 * - Absences in the last 30 days (up to 25)
 * - Repeated lateness (10)
 * - Heavy overtime (15)
 * - Fatigue flags (15)
 * - Unresolved dispute or hazard (15)
 * - Low mood check-ins (10)
 * - Low team feedback (10)
 * Shows the top 3 reasons next to every score.
 */
export function calculateQuitRisk(input: QuitRiskInput): QuitRiskResult {
  const factors: Array<{ factor: string; points: number; maxPoints: number; reason: string }> = [];

  const absencePts = Math.min(25, Math.max(0, input.absencesLast30Days * 8));
  if (absencePts > 0) {
    factors.push({
      factor: 'absences',
      points: absencePts,
      maxPoints: 25,
      reason: `${input.absencesLast30Days} unscheduled absences in the last 30 days (+${absencePts})`,
    });
  }

  const latePts = Math.min(10, Math.max(0, input.lateCountLast30Days * 3));
  if (latePts > 0) {
    factors.push({
      factor: 'lateness',
      points: latePts,
      maxPoints: 10,
      reason: `${input.lateCountLast30Days} late check-ins in the last 30 days (+${latePts})`,
    });
  }

  const otPts =
    input.weeklyOvertimeHours >= 12
      ? 15
      : input.weeklyOvertimeHours >= 6
      ? 10
      : input.weeklyOvertimeHours >= 3
      ? 5
      : 0;
  if (otPts > 0) {
    factors.push({
      factor: 'overtime',
      points: otPts,
      maxPoints: 15,
      reason: `Heavy overtime load (${input.weeklyOvertimeHours} hrs/week) (+${otPts})`,
    });
  }

  const fatiguePts =
    input.activeFatigueFlagCount >= 2 ? 15 : input.activeFatigueFlagCount === 1 ? 10 : 0;
  if (fatiguePts > 0) {
    factors.push({
      factor: 'fatigue',
      points: fatiguePts,
      maxPoints: 15,
      reason: `${input.activeFatigueFlagCount} active fatigue/streak alert${
        input.activeFatigueFlagCount > 1 ? 's' : ''
      } (+${fatiguePts})`,
    });
  }

  const disputePts = input.unresolvedDisputeOrHazardCount > 0 ? 15 : 0;
  if (disputePts > 0) {
    factors.push({
      factor: 'dispute',
      points: disputePts,
      maxPoints: 15,
      reason: `${input.unresolvedDisputeOrHazardCount} unresolved pay dispute or safety hazard (+15)`,
    });
  }

  const moodPts = Math.min(10, Math.max(0, input.lowMoodCheckinCount * 5));
  if (moodPts > 0) {
    factors.push({
      factor: 'mood',
      points: moodPts,
      maxPoints: 10,
      reason: `${input.lowMoodCheckinCount} stressed/exhausted daily mood check-ins (+${moodPts})`,
    });
  }

  const teamPts =
    input.teamFeedbackAverage > 0 && input.teamFeedbackAverage < 2.8
      ? 10
      : input.teamFeedbackAverage > 0 && input.teamFeedbackAverage < 3.5
      ? 6
      : 0;
  if (teamPts > 0) {
    factors.push({
      factor: 'team_feedback',
      points: teamPts,
      maxPoints: 10,
      reason: `Low team pulse score (${input.teamFeedbackAverage.toFixed(1)}/5.0) (+${teamPts})`,
    });
  }

  const totalScore = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.points, 0)
  );

  const sortedFactors = [...factors].sort((a, b) => b.points - a.points);
  const topReasons = sortedFactors.slice(0, 3).map((f) => f.reason);

  const level: 'low' | 'moderate' | 'high' =
    totalScore >= 60 ? 'high' : totalScore >= 35 ? 'moderate' : 'low';

  return {
    score: totalScore,
    level,
    topReasons:
      topReasons.length > 0
        ? topReasons
        : ['Steady attendance and healthy workload'],
    breakdown: sortedFactors,
  };
}

/**
 * Evaluates whether a hazard report is overdue based on its severity and creation time.
 */
export function evaluateHazardOverdue(
  createdAtIso: string,
  severity: Severity,
  status: HazardStatus,
  nowIso: string = new Date().toISOString(),
  targets = DEFAULT_LABOUR_SETTINGS.hazardResponseHours
): { isOverdue: boolean; dueAtIso: string; hoursRemaining: number } {
  const createdMs = new Date(createdAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  const targetHours = targets[severity] || 72;
  const dueMs = createdMs + targetHours * 3600 * 1000;
  const dueAtIso = new Date(dueMs).toISOString();
  const hoursRemaining = Number(((dueMs - nowMs) / (3600 * 1000)).toFixed(1));
  const isOverdue = status !== 'fixed' && nowMs > dueMs;

  return {
    isOverdue,
    dueAtIso,
    hoursRemaining,
  };
}

/**
 * F5 Privacy by Design:
 * Aggregates anonymous feedback only when response count >= threshold (default 5).
 * Never exposes user_id or submission timestamps on comments.
 */
export function aggregateAnonymousFeedback(
  responses: Array<{
    id: string;
    org_id: string;
    team_id: string;
    week: string;
    answers: Record<string, number>;
    comment?: string;
    flagged?: boolean;
  }>,
  threshold = 5
): {
  isVisible: boolean;
  responseCount: number;
  threshold: number;
  topicAverages: Record<string, number>;
  overallAverage: number;
  sanitizedComments: Array<{ id: string; comment: string; team_id: string; flagged: boolean }>;
} {
  const responseCount = responses.length;
  if (responseCount < threshold) {
    return {
      isVisible: false,
      responseCount,
      threshold,
      topicAverages: {},
      overallAverage: 0,
      sanitizedComments: [],
    };
  }

  const sums: Record<string, { total: number; count: number }> = {};
  for (const r of responses) {
    for (const [topic, score] of Object.entries(r.answers)) {
      if (!sums[topic]) sums[topic] = { total: 0, count: 0 };
      sums[topic].total += Number(score);
      sums[topic].count += 1;
    }
  }

  const topicAverages: Record<string, number> = {};
  let allTotal = 0;
  let allCount = 0;
  for (const [topic, data] of Object.entries(sums)) {
    topicAverages[topic] = Number((data.total / data.count).toFixed(2));
    allTotal += data.total;
    allCount += data.count;
  }

  const overallAverage = allCount > 0 ? Number((allTotal / allCount).toFixed(2)) : 0;

  // Deterministic order by hash of id (never chronological timestamp order)
  const sanitizedComments = responses
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .map((r) => ({
      id: r.id,
      comment: r.comment!.trim(),
      team_id: r.team_id,
      flagged: Boolean(r.flagged),
    }))
    .sort((a, b) => a.id.split('').reverse().join('').localeCompare(b.id.split('').reverse().join('')));

  return {
    isVisible: true,
    responseCount,
    threshold,
    topicAverages,
    overallAverage,
    sanitizedComments,
  };
}

/**
 * Role-based route guard check (Section 3.1 & Section 6)
 */
export function canAccessRoute(role: Role, pathname: string): {
  allowed: boolean;
  reason?: string;
} {
  if (pathname.startsWith('/admin')) {
    if (role === 'worker') {
      return {
        allowed: false,
        reason: 'Worker accounts cannot access management or admin pages (/admin).',
      };
    }
    if (
      role === 'manager' &&
      (pathname.startsWith('/admin/payroll') || pathname.startsWith('/admin/settings'))
    ) {
      return {
        allowed: false,
        reason: 'Managers cannot access organisation payroll rules or system settings.',
      };
    }
    return { allowed: true };
  }
  return { allowed: true };
}
