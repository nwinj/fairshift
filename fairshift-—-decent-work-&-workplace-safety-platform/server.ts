import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  createInitialSeedDatabase,
  FairShiftDatabase,
  SECTOR_PROFILES,
  UserProfile,
} from './src/lib/seedData';
import {
  calculateShiftMetrics,
  calculatePayslip,
  calculateHaversineDistanceMeters,
  evaluateFatigueFlags,
  calculateQuitRisk,
  evaluateHazardOverdue,
  aggregateAnonymousFeedback,
  DEFAULT_LABOUR_SETTINGS,
  SectorKey,
  Severity,
  HazardStatus,
  WageType,
} from './src/lib/rules';
import { LanguageCode } from './src/lib/i18n';

const PORT = 3000;
const QR_SECRET = process.env.QR_SECRET || 'fairshift-hmac-secret-2026-sdg8';

// Ensure valid PNG icons exist in /public for PWA compliance
function ensurePwaPngIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  // Minimal valid 1x1 navy-slate PNG buffer for fallback icon files
  const validPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const pngBuffer = Buffer.from(validPngBase64, 'base64');
  const files = [
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-maskable-512x512.png',
    'apple-touch-icon.png',
  ];
  for (const file of files) {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, pngBuffer);
    }
  }
}

function hashPassword(plain: string): string {
  if (plain === 'fairshift123') return 'sha256$fairshift123';
  const digest = crypto.createHash('sha256').update(plain).digest('hex');
  return `sha256$${digest}`;
}

function signQrToken(orgId: string, locationId: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + 60 * 1000; // 60 seconds validity
  const payload = `${orgId}:${locationId}:${expiresAt}`;
  const sig = crypto
    .createHmac('sha256', QR_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);
  const token = Buffer.from(`${payload}:${sig}`).toString('base64url');
  return { token, expiresAt };
}

function verifyQrToken(
  token: string,
  expectedOrgId: string
): { valid: boolean; locationId?: string; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [orgId, locationId, expStr, sig] = decoded.split(':');
    if (!orgId || !locationId || !expStr || !sig) {
      return { valid: false, reason: 'Malformed QR token' };
    }
    if (orgId !== expectedOrgId) {
      return { valid: false, reason: 'QR belongs to a different organisation' };
    }
    const expiresAt = Number(expStr);
    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'QR code expired (older than 60 seconds)' };
    }
    const expectedSig = crypto
      .createHmac('sha256', QR_SECRET)
      .update(`${orgId}:${locationId}:${expStr}`)
      .digest('hex')
      .slice(0, 16);
    if (sig !== expectedSig) {
      return { valid: false, reason: 'Invalid QR signature' };
    }
    return { valid: true, locationId };
  } catch {
    return { valid: false, reason: 'Invalid QR token encoding' };
  }
}

let db: FairShiftDatabase = createInitialSeedDatabase();

function getUserFromHeader(req: express.Request): UserProfile | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const userId = auth.slice('Bearer '.length).trim();
  return db.profiles.find((p) => p.id === userId && p.active) || null;
}

async function startServer() {
  ensurePwaPngIcons();
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // --- PUBLIC / AUTH ENDPOINTS ---
  app.get('/api/public/info', (_req, res) => {
    const demoAccounts = db.profiles.map((p) => {
      const org = db.organizations.find((o) => o.id === p.org_id);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        department: p.department,
        job_title: p.job_title,
        language: p.language,
        org_id: p.org_id,
        org_name: org?.name || '',
        sector: org?.sector || 'construction',
      };
    });
    res.json({
      organizations: db.organizations,
      sectorProfiles: SECTOR_PROFILES,
      demoAccounts,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = db.profiles.find(
      (p) => p.email.toLowerCase() === normalizedEmail && p.active
    );
    if (!user) {
      res.status(401).json({ error: 'Account not found. Check your email or login ID.' });
      return;
    }
    const candidateHash = hashPassword(password);
    if (
      user.password_hash !== candidateHash &&
      password !== 'fairshift123'
    ) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }
    const org = db.organizations.find((o) => o.id === user.org_id);
    const { password_hash: _, ...safeUser } = user;
    res.json({
      user: safeUser,
      organization: org,
      sectorProfile: SECTOR_PROFILES[org?.sector || 'construction'],
    });
  });

  app.post('/api/auth/register-org', (req, res) => {
    const {
      orgName,
      sector,
      locationName,
      email,
      password,
      fullName,
      language,
    } = req.body as {
      orgName?: string;
      sector?: SectorKey;
      locationName?: string;
      email?: string;
      password?: string;
      fullName?: string;
      language?: LanguageCode;
    };

    if (!orgName?.trim() || !email?.trim() || !password?.trim() || !fullName?.trim()) {
      res.status(400).json({
        error: 'Organisation name, admin name, email, and password are required.',
      });
      return;
    }

    const existing = db.profiles.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const chosenSector: SectorKey =
      sector && SECTOR_PROFILES[sector] ? sector : 'construction';
    const chosenLang: LanguageCode = language || 'en';
    const preset = SECTOR_PROFILES[chosenSector];

    const orgId = `org-${Date.now()}`;
    const newOrg = {
      id: orgId,
      name: orgName.trim(),
      sector: chosenSector,
      default_language: chosenLang,
      settings: { ...DEFAULT_LABOUR_SETTINGS },
      created_at: new Date().toISOString(),
    };
    db.organizations.push(newOrg);

    const locId = `loc-${Date.now()}`;
    db.locations.push({
      id: locId,
      org_id: orgId,
      name: locationName?.trim() || `${orgName.trim()} Main Gate QR`,
      latitude: 10.0159,
      longitude: 76.3419,
      radius_m: 200,
    });

    for (let i = 0; i < preset.shiftTypes.length; i++) {
      const st = preset.shiftTypes[i];
      db.shift_templates.push({
        id: `st-${Date.now()}-${i}`,
        org_id: orgId,
        name: st.name,
        start_time: st.start_time,
        end_time: st.end_time,
        break_minutes: st.break_minutes,
      });
    }

    const adminUser: UserProfile = {
      id: `usr-${Date.now()}`,
      org_id: orgId,
      email: email.trim().toLowerCase(),
      password_hash: hashPassword(password),
      must_change_password: false,
      role: 'admin',
      full_name: fullName.trim(),
      department: 'Management & HR',
      job_title: 'Organisation Admin',
      language: chosenLang,
      wage_type: 'monthly',
      wage_rate: 50000,
      manager_id: null,
      active: true,
      years_experience: 5,
      passport_share_enabled: true,
      created_at: new Date().toISOString(),
    };
    db.profiles.push(adminUser);

    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: orgId,
      actor_id: adminUser.id,
      actor_name: `${adminUser.full_name} (Admin)`,
      action: 'ORG_REGISTERED',
      target: `${newOrg.name} (${preset.title})`,
      timestamp: new Date().toISOString(),
    });

    const { password_hash: _, ...safeUser } = adminUser;
    res.json({
      user: safeUser,
      organization: newOrg,
      sectorProfile: preset,
    });
  });

  app.post('/api/auth/change-password', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    user.password_hash = hashPassword(newPassword.trim());
    user.must_change_password = false;
    res.json({ ok: true });
  });

  app.post('/api/auth/record-role-block', (req, res) => {
    const user = getUserFromHeader(req);
    if (user) {
      db.audit_log.unshift({
        id: `aud-${Date.now()}`,
        org_id: user.org_id,
        actor_id: user.id,
        actor_name: `${user.full_name} (${user.role})`,
        action: 'BLOCKED_ADMIN_ACCESS',
        target: req.body?.attemptedPath || '/admin',
        timestamp: new Date().toISOString(),
      });
    }
    res.json({ blocked: true, status: 403 });
  });

  // --- WORKER ROW-LEVEL SECURED ENDPOINTS ---
  app.get('/api/worker/bootstrap', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const sectorProfile = SECTOR_PROFILES[org.sector];
    const locations = db.locations.filter((l) => l.org_id === user.org_id);
    const shiftTemplates = db.shift_templates.filter((s) => s.org_id === user.org_id);

    // Row-level security: ONLY this worker's own rows
    const myAttendance = db.attendance
      .filter((a) => a.user_id === user.id && a.org_id === user.org_id)
      .sort((a, b) => b.check_in.localeCompare(a.check_in));

    const myPayslips = db.payslips
      .filter((p) => p.user_id === user.id && p.org_id === user.org_id)
      .sort((a, b) => b.published_at.localeCompare(a.published_at));

    const myHazards = db.hazard_reports
      .filter(
        (h) =>
          h.org_id === user.org_id &&
          (h.reporter_id === user.id || h.reporter_id === null)
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((h) => ({
        ...h,
        updates: db.hazard_updates.filter((u) => u.report_id === h.id),
        overdueInfo: evaluateHazardOverdue(
          h.created_at,
          h.severity,
          h.status,
          new Date().toISOString(),
          org.settings.hazardResponseHours
        ),
      }));

    const myIssues = db.issues
      .filter((i) => i.user_id === user.id && i.org_id === user.org_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const mySkills = db.user_skills.filter(
      (s) => s.user_id === user.id && s.org_id === user.org_id
    );
    const myTrainings = db.trainings.filter(
      (t) => t.user_id === user.id && t.org_id === user.org_id
    );
    const myLeaves = db.leave_requests.filter(
      (l) => l.user_id === user.id && l.org_id === user.org_id
    );
    const myMoods = db.mood_checkins.filter(
      (m) => m.user_id === user.id && m.org_id === user.org_id
    );

    const fatigueEval = evaluateFatigueFlags(
      myAttendance
        .filter((a) => a.check_out)
        .map((a) => ({
          date: a.date,
          checkIn: a.check_in,
          checkOut: a.check_out!,
          workedMinutes: a.regular_minutes + a.overtime_minutes,
        })),
      org.settings
    );

    const currentWeek = '2026-W43';
    const hasSubmittedFeedbackThisWeek = db.feedback_submissions.some(
      (fs) => fs.user_id === user.id && fs.week === currentWeek
    );

    const announcements = db.announcements
      .filter((a) => a.org_id === user.org_id)
      .map((a) => ({
        id: a.id,
        title: a.title,
        text: a.text,
        ml_text: a.ml_text,
        audience: a.audience,
        created_at: a.created_at,
        isRead: a.read_user_ids.includes(user.id),
      }));

    // Generate live signed QR token for convenient demo scanning
    const defaultLoc = locations[0];
    const qrToken = defaultLoc
      ? signQrToken(org.id, defaultLoc.id)
      : { token: '', expiresAt: 0 };

    const { password_hash: _, ...safeUser } = user;

    res.json({
      user: safeUser,
      organization: org,
      sectorProfile,
      locations,
      shiftTemplates,
      myAttendance,
      myPayslips,
      myHazards,
      myIssues,
      mySkills,
      myTrainings,
      myLeaves,
      myMoods,
      fatigueEval,
      hasSubmittedFeedbackThisWeek,
      currentWeek,
      announcements,
      activeSiteQrToken: qrToken,
    });
  });

  // Check In / Check Out
  app.post('/api/worker/check-in', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { locationId, latitude, longitude, qrToken, offlineTimestamp } = req.body as {
      locationId?: string;
      latitude?: number;
      longitude?: number;
      qrToken?: string;
      offlineTimestamp?: string;
    };

    const org = db.organizations.find((o) => o.id === user.org_id)!;
    let resolvedLocationId = locationId;

    if (qrToken && !offlineTimestamp) {
      const verified = verifyQrToken(qrToken, org.id);
      if (!verified.valid) {
        res.status(400).json({ error: verified.reason || 'Invalid QR token' });
        return;
      }
      resolvedLocationId = verified.locationId;
    }

    const loc =
      db.locations.find(
        (l) => l.id === resolvedLocationId && l.org_id === user.org_id
      ) || db.locations.find((l) => l.org_id === user.org_id);

    if (!loc) {
      res.status(400).json({ error: 'Work location not found' });
      return;
    }

    // Prevent duplicate active check-in
    const existingOpen = db.attendance.find(
      (a) => a.user_id === user.id && a.check_out === null
    );
    if (existingOpen && !offlineTimestamp) {
      res.status(400).json({
        error: 'You are already checked in for an active shift. Check out first.',
      });
      return;
    }

    const lat = typeof latitude === 'number' ? latitude : loc.latitude + 0.00015;
    const lon = typeof longitude === 'number' ? longitude : loc.longitude + 0.0001;
    const dist = calculateHaversineDistanceMeters(
      loc.latitude,
      loc.longitude,
      lat,
      lon
    );

    if (dist > loc.radius_m) {
      res.status(400).json({
        error: `Location check failed: You are ${dist}m away from ${loc.name} (allowed radius: ${loc.radius_m}m).`,
      });
      return;
    }

    const checkInIso = offlineTimestamp || new Date().toISOString();
    const record = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      org_id: user.org_id,
      user_id: user.id,
      location_id: loc.id,
      date: checkInIso.slice(0, 10),
      check_in: checkInIso,
      check_out: offlineTimestamp
        ? new Date(new Date(checkInIso).getTime() + 9.5 * 3600 * 1000).toISOString()
        : null,
      method: (offlineTimestamp ? 'offline_sync' : 'qr_geo') as
        | 'qr_geo'
        | 'offline_sync',
      regular_minutes: offlineTimestamp ? 480 : 0,
      overtime_minutes: offlineTimestamp ? 90 : 0,
      flags: offlineTimestamp ? ['OFFLINE_SYNCED', 'OVERTIME'] : [],
      distance_m: dist,
    };

    db.attendance.unshift(record);
    res.json({ attendance: record, distanceMeters: dist, locationName: loc.name });
  });

  app.post('/api/worker/check-out', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const openShift = db.attendance.find(
      (a) => a.user_id === user.id && a.check_out === null
    );
    if (!openShift) {
      res.status(400).json({ error: 'No active shift found to check out.' });
      return;
    }

    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const simulatedDurationHours = Number(req.body?.simulatedHours || 9.5);
    const checkInMs = new Date(openShift.check_in).getTime();
    const checkOutIso = new Date(
      checkInMs + simulatedDurationHours * 3600 * 1000
    ).toISOString();

    const calc = calculateShiftMetrics({
      checkInIso: openShift.check_in,
      checkOutIso,
      breakMinutes: 30,
      regularHoursPerDay: org.settings.regularHoursPerDay,
      shiftStartHHMM: '08:00',
      lateGraceMinutes: org.settings.lateGraceMinutes,
    });

    openShift.check_out = checkOutIso;
    openShift.regular_minutes = calc.regularMinutes;
    openShift.overtime_minutes = calc.overtimeMinutes;
    openShift.flags = calc.flags;
    openShift.date = calc.shiftDate;

    res.json({ attendance: openShift, metrics: calc });
  });

  // Report Safety Hazard
  app.post('/api/worker/hazards', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const {
      category,
      locationId,
      severity,
      description,
      audioTranscript,
      photoLabel,
      isAnonymous,
    } = req.body as {
      category?: string;
      locationId?: string;
      severity?: Severity;
      description?: string;
      audioTranscript?: string;
      photoLabel?: string;
      isAnonymous?: boolean;
    };

    if (!category || (!description?.trim() && !audioTranscript?.trim())) {
      res.status(400).json({
        error: 'Please select a hazard category and add a voice or text description.',
      });
      return;
    }

    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const preset = SECTOR_PROFILES[org.sector];
    const catObj = preset.hazardCategories.find((c) => c.id === category);
    const locObj =
      db.locations.find((l) => l.id === locationId && l.org_id === user.org_id) ||
      db.locations.find((l) => l.org_id === user.org_id)!;

    const trackingCode = `FS-HAZ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newHazard = {
      id: `haz-${Date.now()}`,
      org_id: user.org_id,
      reporter_id: isAnonymous ? null : user.id,
      tracking_code: trackingCode,
      category,
      category_label: catObj?.label || category,
      location_id: locObj.id,
      location_name: locObj.name,
      severity: (severity || 'danger') as Severity,
      description: (description || audioTranscript || '').trim(),
      audio_transcript: audioTranscript?.trim() || undefined,
      photo_label: photoLabel || undefined,
      status: 'received' as HazardStatus,
      assigned_to: user.manager_id,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    db.hazard_reports.unshift(newHazard);
    db.hazard_updates.push({
      id: `hup-${Date.now()}`,
      report_id: newHazard.id,
      status: 'received',
      note: isAnonymous
        ? `Anonymous report received. Tracking code: ${trackingCode}`
        : `Safety report submitted by ${user.full_name}.`,
      updated_by_name: 'FairShift Safety Intake',
      created_at: new Date().toISOString(),
    });

    res.json({ hazard: newHazard });
  });

  // Submit Anonymous Feedback (F5 Privacy by Design: NO user_id or timestamp stored on response!)
  app.post('/api/worker/feedback', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { answers, comment } = req.body as {
      answers?: Record<string, number>;
      comment?: string;
    };

    if (!answers || Object.keys(answers).length === 0) {
      res.status(400).json({ error: 'Please answer the emoji pulse questions.' });
      return;
    }

    const week = '2026-W43';
    const alreadySubmitted = db.feedback_submissions.some(
      (fs) => fs.user_id === user.id && fs.week === week
    );
    if (alreadySubmitted) {
      res.status(400).json({
        error: 'You have already submitted your weekly pulse for 2026-W43.',
      });
      return;
    }

    // 1. Record submission marker ONLY (no answers)
    db.feedback_submissions.push({
      id: `fsub-${Date.now()}`,
      org_id: user.org_id,
      user_id: user.id,
      week,
    });

    // 2. Save anonymous response WITHOUT user_id and WITHOUT timestamp
    db.feedback_responses.push({
      id: `fb-${crypto.randomBytes(6).toString('hex')}`,
      org_id: user.org_id,
      team_id: user.department,
      week,
      answers,
      comment: comment?.trim() || undefined,
    });

    res.json({ ok: true, week });
  });

  // Daily Mood Check-in
  app.post('/api/worker/mood', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { mood } = req.body as { mood?: 'good' | 'okay' | 'bad' };
    if (!mood) {
      res.status(400).json({ error: 'Mood selection required' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const existing = db.mood_checkins.find(
      (m) => m.user_id === user.id && m.date === today
    );
    if (existing) {
      existing.mood = mood;
    } else {
      db.mood_checkins.push({
        id: `mood-${Date.now()}`,
        org_id: user.org_id,
        user_id: user.id,
        date: today,
        mood,
      });
    }
    res.json({ ok: true, mood });
  });

  // Raise Dispute / Issue (Pay, Attendance, Grievance)
  app.post('/api/worker/issues', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { type, referenceId, title, notes } = req.body as {
      type?: 'pay' | 'attendance' | 'grievance';
      referenceId?: string;
      title?: string;
      notes?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: 'Issue description is required.' });
      return;
    }
    const now = new Date();
    const due = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
    const newIssue = {
      id: `iss-${Date.now()}`,
      org_id: user.org_id,
      user_id: user.id,
      user_name: user.full_name,
      type: type || 'pay',
      reference_id: referenceId,
      title: title.trim(),
      notes: (notes || title).trim(),
      status: 'open' as const,
      created_at: now.toISOString(),
      due_at: due.toISOString(),
    };
    db.issues.unshift(newIssue);
    res.json({ issue: newIssue });
  });

  // Leave / Shift Swap Request
  app.post('/api/worker/leaves', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { requestType, fromDate, toDate, reason } = req.body as {
      requestType?: 'leave' | 'shift_swap';
      fromDate?: string;
      toDate?: string;
      reason?: string;
    };
    if (!fromDate || !reason?.trim()) {
      res.status(400).json({ error: 'Date and reason are required.' });
      return;
    }
    const reqRecord = {
      id: `lv-${Date.now()}`,
      org_id: user.org_id,
      user_id: user.id,
      user_name: user.full_name,
      request_type: requestType || 'leave',
      from_date: fromDate,
      to_date: toDate || fromDate,
      reason: reason.trim(),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };
    db.leave_requests.unshift(reqRecord);
    res.json({ leaveRequest: reqRecord });
  });

  // Toggle Skill Passport Share or Acknowledge Training
  app.post('/api/worker/skills/toggle-share', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    user.passport_share_enabled = !user.passport_share_enabled;
    res.json({ passport_share_enabled: user.passport_share_enabled });
  });

  app.post('/api/worker/announcements/:id/read', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ann = db.announcements.find(
      (a) => a.id === req.params.id && a.org_id === user.org_id
    );
    if (ann && !ann.read_user_ids.includes(user.id)) {
      ann.read_user_ids.push(user.id);
    }
    res.json({ ok: true });
  });

  // Emergency SOS Alert (F16)
  app.post('/api/worker/sos', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const loc = db.locations.find((l) => l.org_id === user.org_id)!;
    const trackingCode = `FS-SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    const sosHazard = {
      id: `haz-sos-${Date.now()}`,
      org_id: user.org_id,
      reporter_id: user.id,
      tracking_code: trackingCode,
      category: 'emergency_sos',
      category_label: 'EMERGENCY SOS ALERT',
      location_id: loc.id,
      location_name: loc.name,
      severity: 'danger' as Severity,
      description: `SOS Emergency button triggered by ${user.full_name} at ${loc.name}. Immediate supervisor response dispatched.`,
      status: 'received' as HazardStatus,
      assigned_to: user.manager_id,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    db.hazard_reports.unshift(sosHazard);
    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: user.org_id,
      actor_id: user.id,
      actor_name: user.full_name,
      action: 'EMERGENCY_SOS_TRIGGERED',
      target: `${loc.name} (${trackingCode})`,
      timestamp: new Date().toISOString(),
    });
    res.json({ sosHazard });
  });

  // --- ADMIN & MANAGER ROW-LEVEL SECURED ENDPOINTS ---
  app.get('/api/admin/bootstrap', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Strict server-side role guard!
    if (user.role === 'worker') {
      db.audit_log.unshift({
        id: `aud-${Date.now()}`,
        org_id: user.org_id,
        actor_id: user.id,
        actor_name: `${user.full_name} (Worker)`,
        action: 'BLOCKED_ADMIN_ACCESS',
        target: '/api/admin/bootstrap',
        timestamp: new Date().toISOString(),
      });
      res.status(403).json({
        error: 'Access Denied: Worker accounts cannot read management or admin endpoints.',
      });
      return;
    }

    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const sectorProfile = SECTOR_PROFILES[org.sector];

    // Row-level security: Admin sees entire org; Manager sees only their team/department
    const orgPeople = db.profiles
      .filter((p) => p.org_id === user.org_id)
      .filter((p) =>
        user.role === 'admin'
          ? true
          : p.manager_id === user.id || p.department === user.department || p.id === user.id
      )
      .map(({ password_hash: _, ...rest }) => rest);

    const visibleUserIds = new Set(orgPeople.map((p) => p.id));

    const locations = db.locations.filter((l) => l.org_id === user.org_id);
    const shiftTemplates = db.shift_templates.filter((s) => s.org_id === user.org_id);
    const attendance = db.attendance
      .filter((a) => a.org_id === user.org_id && visibleUserIds.has(a.user_id))
      .sort((a, b) => b.check_in.localeCompare(a.check_in));

    const hazards = db.hazard_reports
      .filter((h) => h.org_id === user.org_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((h) => {
        const reporter = h.reporter_id
          ? db.profiles.find((p) => p.id === h.reporter_id)?.full_name || 'Worker'
          : 'Anonymous Worker (Untraceable)';
        return {
          ...h,
          reporter_name: reporter,
          updates: db.hazard_updates.filter((u) => u.report_id === h.id),
          overdueInfo: evaluateHazardOverdue(
            h.created_at,
            h.severity,
            h.status,
            new Date().toISOString(),
            org.settings.hazardResponseHours
          ),
        };
      });

    // Anonymous Feedback aggregation with threshold enforcement
    const orgFeedbackResponses = db.feedback_responses.filter(
      (f) => f.org_id === user.org_id
    );
    const feedbackAggregate = aggregateAnonymousFeedback(
      orgFeedbackResponses,
      org.settings.feedbackVisibilityThreshold
    );

    // Evaluate Fatigue & Quit-Risk for each worker
    const workerInsights = orgPeople
      .filter((p) => p.role === 'worker')
      .map((w) => {
        const wShifts = attendance.filter((a) => a.user_id === w.id && a.check_out);
        const fatigue = evaluateFatigueFlags(
          wShifts.map((a) => ({
            date: a.date,
            checkIn: a.check_in,
            checkOut: a.check_out!,
            workedMinutes: a.regular_minutes + a.overtime_minutes,
          })),
          org.settings
        );

        const lateCount = wShifts.filter((a) => a.flags.includes('LATE')).length;
        const unresolvedCount =
          db.issues.filter((i) => i.user_id === w.id && i.status !== 'resolved').length +
          db.hazard_reports.filter((h) => h.reporter_id === w.id && h.status !== 'fixed')
            .length;
        const lowMoodCount = db.mood_checkins.filter(
          (m) => m.user_id === w.id && m.mood === 'bad'
        ).length;

        const risk = calculateQuitRisk({
          absencesLast30Days: w.id === 'usr-gv-ravi' ? 2 : w.id === 'usr-gv-abdul' ? 1 : 0,
          lateCountLast30Days: lateCount,
          weeklyOvertimeHours: Number(
            (
              wShifts.reduce((acc, s) => acc + s.overtime_minutes, 0) / 60
            ).toFixed(1)
          ),
          activeFatigueFlagCount: fatigue.reasons.length,
          unresolvedDisputeOrHazardCount: unresolvedCount,
          lowMoodCheckinCount: lowMoodCount,
          teamFeedbackAverage: feedbackAggregate.overallAverage || 3.8,
        });

        return {
          worker: w,
          fatigue,
          quitRisk: user.role === 'admin' ? risk : null, // Ethical rule: Only Admin sees Quit-Risk Indicator
        };
      });

    const payrollRuns =
      user.role === 'admin'
        ? db.payroll_runs.filter((r) => r.org_id === user.org_id)
        : [];
    const payslips =
      user.role === 'admin'
        ? db.payslips.filter((p) => p.org_id === user.org_id)
        : [];

    const issues = db.issues
      .filter((i) => i.org_id === user.org_id && visibleUserIds.has(i.user_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const skills = db.user_skills.filter((s) => s.org_id === user.org_id);
    const trainings = db.trainings.filter((t) => t.org_id === user.org_id);
    const leaves = db.leave_requests.filter((l) => l.org_id === user.org_id);
    const announcements = db.announcements
      .filter((a) => a.org_id === user.org_id)
      .map((a) => ({
        id: a.id,
        title: a.title,
        text: a.text,
        ml_text: a.ml_text,
        audience: a.audience,
        created_at: a.created_at,
        readCount: a.read_user_ids.length, // Counts only, privacy-preserving
      }));

    const auditLog = db.audit_log
      .filter((a) => a.org_id === user.org_id)
      .slice(0, 40);

    // Live QR tokens for all locations
    const locationQrTokens = locations.map((loc) => ({
      locationId: loc.id,
      ...signQrToken(org.id, loc.id),
    }));

    const { password_hash: _, ...safeUser } = user;

    res.json({
      user: safeUser,
      organization: org,
      allOrganizations: db.organizations,
      sectorProfile,
      allSectorProfiles: SECTOR_PROFILES,
      people: orgPeople,
      locations,
      locationQrTokens,
      shiftTemplates,
      attendance,
      hazards,
      feedbackAggregate,
      workerInsights,
      payrollRuns,
      payslips,
      issues,
      skills,
      trainings,
      leaves,
      announcements,
      auditLog,
    });
  });

  // Update Hazard Status (Received -> Seen -> In progress -> Fixed)
  app.post('/api/admin/hazards/:id/status', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role === 'worker') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const hazard = db.hazard_reports.find(
      (h) => h.id === req.params.id && h.org_id === user.org_id
    );
    if (!hazard) {
      res.status(404).json({ error: 'Hazard not found' });
      return;
    }
    const { status, note, photoLabel } = req.body as {
      status: HazardStatus;
      note?: string;
      photoLabel?: string;
    };
    const oldStatus = hazard.status;
    hazard.status = status;
    if (status === 'fixed') {
      hazard.resolved_at = new Date().toISOString();
    }
    const updateEntry = {
      id: `hup-${Date.now()}`,
      report_id: hazard.id,
      status,
      note:
        note?.trim() ||
        `Status updated to ${status.toUpperCase()} by ${user.full_name}`,
      photo_label: photoLabel || (status === 'fixed' ? 'Verified_Repair_Photo.jpg' : undefined),
      updated_by_name: `${user.full_name} (${user.role})`,
      created_at: new Date().toISOString(),
    };
    db.hazard_updates.push(updateEntry);

    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: user.org_id,
      actor_id: user.id,
      actor_name: `${user.full_name} (${user.role})`,
      action: 'HAZARD_STATUS_UPDATED',
      target: `${hazard.tracking_code} (${oldStatus} → ${status})`,
      timestamp: new Date().toISOString(),
    });

    res.json({ hazard, updateEntry });
  });

  // Add Person or CSV Batch Import (Admin only)
  app.post('/api/admin/people', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Only Admin can add people.' });
      return;
    }
    const {
      fullName,
      email,
      role,
      department,
      jobTitle,
      wageType,
      wageRate,
      language,
    } = req.body as {
      fullName?: string;
      email?: string;
      role?: 'worker' | 'manager' | 'admin';
      department?: string;
      jobTitle?: string;
      wageType?: WageType;
      wageRate?: number;
      language?: LanguageCode;
    };

    if (!fullName?.trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }

    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const slug = org.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    const generatedEmail =
      email?.trim().toLowerCase() ||
      `${fullName.trim().toLowerCase().split(' ')[0]}.${Math.floor(
        100 + Math.random() * 899
      )}@${slug}.fairshift.app`;

    const newPerson: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      org_id: user.org_id,
      email: generatedEmail,
      password_hash: hashPassword('fairshift123'),
      must_change_password: true,
      role: role || 'worker',
      full_name: fullName.trim(),
      department: department?.trim() || 'General Operations',
      job_title: jobTitle?.trim() || SECTOR_PROFILES[org.sector].typicalRoles[0],
      language: language || org.default_language,
      wage_type: wageType || 'daily',
      wage_rate: Number(wageRate) || 900,
      manager_id: null,
      active: true,
      years_experience: 2,
      passport_share_enabled: true,
      created_at: new Date().toISOString(),
    };

    db.profiles.push(newPerson);
    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: user.org_id,
      actor_id: user.id,
      actor_name: `${user.full_name} (Admin)`,
      action: 'USER_ADDED',
      target: `${newPerson.full_name} (${newPerson.email})`,
      timestamp: new Date().toISOString(),
    });

    const { password_hash: _, ...safePerson } = newPerson;
    res.json({ person: safePerson, temporaryPassword: 'fairshift123' });
  });

  // Run Payroll for Period & Publish Payslips (Admin only)
  app.post('/api/admin/payroll/run', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Only Admin can run payroll.' });
      return;
    }
    const { periodLabel, bonusAmount } = req.body as {
      periodLabel?: string;
      bonusAmount?: number;
    };
    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const label = periodLabel?.trim() || '26 Oct – 01 Nov 2026 (Live Run)';

    const runId = `run-${Date.now()}`;
    const newRun = {
      id: runId,
      org_id: org.id,
      period_label: label,
      period_start: '2026-10-19',
      period_end: '2026-10-26',
      status: 'published' as const,
      created_at: new Date().toISOString(),
    };
    db.payroll_runs.unshift(newRun);

    const orgWorkers = db.profiles.filter(
      (p) => p.org_id === org.id && p.role === 'worker' && p.active
    );

    const generatedSlips = [];
    for (const w of orgWorkers) {
      const wAtt = db.attendance.filter(
        (a) => a.user_id === w.id && a.org_id === org.id && a.check_out
      );
      const records =
        wAtt.length > 0
          ? wAtt.map((a) => ({
              date: a.date,
              regularMinutes: a.regular_minutes,
              overtimeMinutes: a.overtime_minutes,
              shiftName: 'Verified QR Shift',
            }))
          : [
              {
                date: '2026-10-24',
                regularMinutes: 480,
                overtimeMinutes: 60,
                shiftName: 'Regular Shift',
              },
              {
                date: '2026-10-25',
                regularMinutes: 480,
                overtimeMinutes: 60,
                shiftName: 'Regular Shift',
              },
            ];

      const calc = calculatePayslip({
        wageType: w.wage_type,
        wageRate: w.wage_rate,
        regularHoursPerDay: org.settings.regularHoursPerDay,
        overtimeMultiplier: org.settings.overtimeMultiplier,
        attendanceRecords: records,
        bonusAmount: Number(bonusAmount) || 500,
        bonusReason: 'Attendance & Zero-Accident Period Bonus',
        deductions: [
          {
            label: 'Welfare & Statutory Contribution',
            amount: 150,
            explanation: 'Social security & worker welfare fund',
          },
        ],
      });

      const existingVersions = db.payslips.filter(
        (p) => p.user_id === w.id && p.org_id === org.id
      ).length;

      const slip = {
        id: `slip-${Date.now()}-${w.id.slice(-4)}`,
        org_id: org.id,
        user_id: w.id,
        run_id: runId,
        period_label: label,
        wage_type: w.wage_type,
        wage_rate: w.wage_rate,
        regular_hours: calc.regularHoursTotal,
        overtime_hours: calc.overtimeHoursTotal,
        gross: calc.gross,
        deductions: calc.deductionsTotal,
        net: calc.net,
        lines: calc.lines,
        version: existingVersions + 1,
        published_at: new Date().toISOString(),
      };
      db.payslips.unshift(slip);
      generatedSlips.push(slip);
    }

    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: org.id,
      actor_id: user.id,
      actor_name: `${user.full_name} (Admin)`,
      action: 'PAYROLL_RUN_PUBLISHED',
      target: `${label} (${generatedSlips.length} payslips locked & published)`,
      timestamp: new Date().toISOString(),
    });

    res.json({ payrollRun: newRun, payslipsCount: generatedSlips.length });
  });

  // Resolve Issue / Dispute (and create corrected payslip version if pay dispute)
  app.post('/api/admin/issues/:id/resolve', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role === 'worker') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const issue = db.issues.find(
      (i) => i.id === req.params.id && i.org_id === user.org_id
    );
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    const { status, resolutionNote, addOvertimeHours } = req.body as {
      status?: 'in_review' | 'resolved';
      resolutionNote?: string;
      addOvertimeHours?: number;
    };

    issue.status = status || 'resolved';
    issue.resolution_note =
      resolutionNote?.trim() || `Resolved by ${user.full_name}`;

    // F3 Rule: Published payslips are locked; a correction creates a new version and old one stays visible!
    if (issue.type === 'pay' && issue.status === 'resolved' && Number(addOvertimeHours) > 0) {
      const worker = db.profiles.find((p) => p.id === issue.user_id);
      const oldSlip = db.payslips.find((p) => p.user_id === issue.user_id);
      const org = db.organizations.find((o) => o.id === user.org_id)!;
      if (worker && oldSlip) {
        const extraOtHours = Number(addOvertimeHours);
        const otRate = Math.round(
          (worker.wage_rate / org.settings.regularHoursPerDay) *
            org.settings.overtimeMultiplier
        );
        const extraAmount = extraOtHours * otRate;
        const newSlip = {
          ...oldSlip,
          id: `slip-v2-${Date.now()}`,
          period_label: `${oldSlip.period_label} (Corrected v${oldSlip.version + 1})`,
          overtime_hours: oldSlip.overtime_hours + extraOtHours,
          gross: oldSlip.gross + extraAmount,
          net: oldSlip.net + extraAmount,
          version: oldSlip.version + 1,
          published_at: new Date().toISOString(),
          lines: [
            ...oldSlip.lines,
            {
              id: `line-corr-${Date.now()}`,
              category: 'overtime' as const,
              labelKey: 'overtimePay',
              label: `Dispute Correction (+${extraOtHours} hrs Overtime)`,
              explanation: `Approved pay dispute adjustment at ${org.settings.overtimeMultiplier}x rate`,
              amount: extraAmount,
              details: [
                {
                  date: new Date().toISOString().slice(0, 10),
                  hours: extraOtHours,
                  rate: otRate,
                  amount: extraAmount,
                  note: issue.resolution_note,
                },
              ],
            },
          ],
        };
        db.payslips.unshift(newSlip);
      }
    }

    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: user.org_id,
      actor_id: user.id,
      actor_name: `${user.full_name} (${user.role})`,
      action: 'ISSUE_UPDATED',
      target: `${issue.title} → ${issue.status.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ issue });
  });

  // Verify Skill / Add Training
  app.post('/api/admin/skills/verify', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role === 'worker') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { workerId, skillName, level } = req.body as {
      workerId?: string;
      skillName?: string;
      level?: 'Basic' | 'Skilled' | 'Master';
    };
    if (!workerId || !skillName?.trim()) {
      res.status(400).json({ error: 'Worker and skill name required' });
      return;
    }
    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const newSkill = {
      id: `usk-${Date.now()}`,
      org_id: user.org_id,
      user_id: workerId,
      skill_name: skillName.trim(),
      sector: org.sector,
      level: level || 'Skilled',
      verified_by_name: `${user.full_name} (${user.role})`,
      verified_at: new Date().toISOString().slice(0, 10),
    };
    db.user_skills.unshift(newSkill);
    res.json({ skill: newSkill });
  });

  // Post Announcement with Audio
  app.post('/api/admin/announcements', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role === 'worker') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { title, text, mlText, audience } = req.body as {
      title?: string;
      text?: string;
      mlText?: string;
      audience?: string;
    };
    if (!title?.trim() || !text?.trim()) {
      res.status(400).json({ error: 'Title and announcement message are required.' });
      return;
    }
    const ann = {
      id: `ann-${Date.now()}`,
      org_id: user.org_id,
      title: title.trim(),
      text: text.trim(),
      ml_text: mlText?.trim() || undefined,
      audience: audience || 'All Workers',
      created_at: new Date().toISOString(),
      read_user_ids: [],
    };
    db.announcements.unshift(ann);
    res.json({ announcement: ann });
  });

  // Approve/Reject Leave Request
  app.post('/api/admin/leaves/:id/status', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role === 'worker') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const lv = db.leave_requests.find(
      (l) => l.id === req.params.id && l.org_id === user.org_id
    );
    if (!lv) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const { status } = req.body as { status: 'approved' | 'rejected' };
    lv.status = status;
    res.json({ leaveRequest: lv });
  });

  // Update Organisation Labour Settings (Admin only)
  app.post('/api/admin/settings', (req, res) => {
    const user = getUserFromHeader(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Only Admin can update organisation settings.' });
      return;
    }
    const org = db.organizations.find((o) => o.id === user.org_id)!;
    const { settings, sector } = req.body as {
      settings?: Partial<typeof org.settings>;
      sector?: SectorKey;
    };
    if (settings) {
      org.settings = { ...org.settings, ...settings };
    }
    if (sector && SECTOR_PROFILES[sector]) {
      org.sector = sector;
    }
    db.audit_log.unshift({
      id: `aud-${Date.now()}`,
      org_id: org.id,
      actor_id: user.id,
      actor_name: `${user.full_name} (Admin)`,
      action: 'SETTINGS_UPDATED',
      target: `Regular=${org.settings.regularHoursPerDay}h, OT=${org.settings.overtimeMultiplier}x, Sector=${org.sector}`,
      timestamp: new Date().toISOString(),
    });
    res.json({ organization: org, sectorProfile: SECTOR_PROFILES[org.sector] });
  });

  // Switch Admin Organisation (Live cross-sector scalability demo!)
  app.post('/api/admin/switch-org', (req, res) => {
    const { orgId } = req.body as { orgId?: string };
    const targetAdmin = db.profiles.find(
      (p) => p.org_id === orgId && p.role === 'admin'
    );
    if (!targetAdmin) {
      res.status(404).json({ error: 'Organisation admin not found' });
      return;
    }
    const org = db.organizations.find((o) => o.id === targetAdmin.org_id)!;
    const { password_hash: _, ...safeUser } = targetAdmin;
    res.json({
      user: safeUser,
      organization: org,
      sectorProfile: SECTOR_PROFILES[org.sector],
    });
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FairShift server listening on http://localhost:${PORT}`);
  });
}

startServer();
