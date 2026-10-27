import {
  Role,
  SectorKey,
  Severity,
  HazardStatus,
  WageType,
  OrgLabourSettings,
  DEFAULT_LABOUR_SETTINGS,
  calculatePayslip,
  PayslipLineItem,
} from './rules';
import { LanguageCode } from './i18n';

export interface SectorProfileConfig {
  sector: SectorKey;
  title: string;
  subtitle: string;
  typicalRoles: string[];
  shiftTypes: Array<{ name: string; start_time: string; end_time: string; break_minutes: number }>;
  checkInPointDesc: string;
  hazardCategories: Array<{ id: string; label: string;mlLabel: string; iconName: string }>;
  feedbackTopics: Array<{ id: string; label: string; mlLabel: string }>;
  skillTags: string[];
}

export const SECTOR_PROFILES: Record<SectorKey, SectorProfileConfig> = {
  construction: {
    sector: 'construction',
    title: 'Construction Site',
    subtitle: 'Daily-wage & shift crews with gate QR check-in, automatic overtime, and scaffolding/electrical hazard tracking.',
    typicalRoles: ['Mason', 'Structural Helper', 'Site Electrician', 'Crane Operator', 'Site Supervisor'],
    shiftTypes: [
      { name: 'Day Shift', start_time: '08:00', end_time: '17:00', break_minutes: 60 },
      { name: 'Night Shift', start_time: '20:00', end_time: '05:00', break_minutes: 60 },
      { name: 'Daily-Wage Crew', start_time: '07:30', end_time: '16:30', break_minutes: 60 },
    ],
    checkInPointDesc: 'Site Gate QR plus 200m GPS location check',
    hazardCategories: [
      { id: 'scaffolding', label: 'Unsafe Scaffolding', mlLabel: 'സുരക്ഷിതമല്ലാത്ത തട്ട് (Scaffolding)', iconName: 'HardHat' },
      { id: 'fall_height', label: 'Fall from Height Risk', mlLabel: 'ഉയരത്തിൽ നിന്ന് വീഴാനുള്ള സാധ്യത', iconName: 'AlertTriangle' },
      { id: 'electrical', label: 'Exposed Electrical Wire', mlLabel: 'തുറന്നുകിടക്കുന്ന ഇലക്ട്രിക് വയർ', iconName: 'Zap' },
      { id: 'no_helmet', label: 'Missing Safety Gear / Helmet', mlLabel: 'ഹെൽമെറ്റ് / സുരക്ഷാ ഉപകരണ കുറവ്', iconName: 'ShieldAlert' },
      { id: 'machinery', label: 'Heavy Machinery Fault', mlLabel: 'യന്ത്രത്തകരാർ', iconName: 'Wrench' },
    ],
    feedbackTopics: [
      { id: 'supervisor', label: 'Site Supervisor Fairness', mlLabel: 'സൂപ്പർവൈസറുടെ പെരുമാറ്റം' },
      { id: 'water', label: 'Clean Drinking Water', mlLabel: 'കുടിവെള്ള സൗകര്യം' },
      { id: 'toilets', label: 'Restrooms & Sanitation', mlLabel: 'ശുചിമുറി സൗകര്യം' },
      { id: 'safety_gear', label: 'PPE & Safety Gear', mlLabel: 'സുരക്ഷാ ഉപകരണങ്ങൾ' },
      { id: 'pay_clarity', label: 'Overtime & Pay Clarity', mlLabel: 'ശമ്പള വ്യക്തത' },
    ],
    skillTags: ['Scaffolding Level 2', 'Arc Welding', 'Masonry & Plastering', 'Site First Aid', 'Heavy Rigging'],
  },
  college: {
    sector: 'college',
    title: 'College or School',
    subtitle: 'Campus housekeeping, security, mess staff, and lab attendants with department check-in and pulse feedback.',
    typicalRoles: ['Housekeeping Staff', 'Campus Security', 'Mess & Canteen Staff', 'Lab Attendant', 'Estate Supervisor'],
    shiftTypes: [
      { name: 'Morning Shift', start_time: '07:00', end_time: '15:30', break_minutes: 30 },
      { name: 'Evening Shift', start_time: '14:00', end_time: '22:30', break_minutes: 30 },
    ],
    checkInPointDesc: 'Main Gate or Department QR plus location check',
    hazardCategories: [
      { id: 'wet_floor', label: 'Wet / Slippery Corridor', mlLabel: 'വഴുക്കലുള്ള തറ', iconName: 'Droplets' },
      { id: 'broken_wiring', label: 'Broken Switchboard / Wiring', mlLabel: 'കേടായ സ്വിച്ച് ബോർഡ്', iconName: 'Zap' },
      { id: 'lab_chemical', label: 'Lab Chemical / Fume Leak', mlLabel: 'ലാബ് കെമിക്കൽ ചോർച്ച', iconName: 'FlaskConical' },
      { id: 'fire_exit', label: 'Blocked Fire Exit', mlLabel: 'തടസ്സപ്പെട്ട ഫയർ എക്സിറ്റ്', iconName: 'Flame' },
    ],
    feedbackTopics: [
      { id: 'dept_head', label: 'Department Head Respect', mlLabel: 'വകുപ്പ് മേധാവിയുടെ സമീപനം' },
      { id: 'break_time', label: 'Fair Break Time', mlLabel: 'വിശ്രമ സമയം' },
      { id: 'rest_area', label: 'Staff Rest Area', mlLabel: 'വിശ്രമ മുറി സൗകര്യം' },
      { id: 'workload', label: 'Daily Workload Balance', mlLabel: 'ജോലിഭാരം' },
      { id: 'pay_clarity', label: 'Extra Duty Pay Clarity', mlLabel: 'ശമ്പള വ്യക്തത' },
    ],
    skillTags: ['Fire Safety & Extinguisher', 'Campus First Aid', 'Lab Equipment Handling', 'Hygienic Food Prep'],
  },
  hospital: {
    sector: 'hospital',
    title: 'Hospital & Healthcare (Bonus)',
    subtitle: '3-shift ward attendants, sanitation staff, and biohazard safety tracking with rapid response targets.',
    typicalRoles: ['Sanitation Worker', 'Ward Attendant', 'Sterilization Tech', 'Ambulance Bay Staff', 'Nursing Supervisor'],
    shiftTypes: [
      { name: 'Morning Rotation', start_time: '06:00', end_time: '14:30', break_minutes: 30 },
      { name: 'Afternoon Rotation', start_time: '14:00', end_time: '22:30', break_minutes: 30 },
      { name: 'Night Duty', start_time: '22:00', end_time: '06:30', break_minutes: 30 },
    ],
    checkInPointDesc: 'Ward Station QR plus hospital geofence check',
    hazardCategories: [
      { id: 'needlestick', label: 'Needle-Stick / Sharps Hazard', mlLabel: 'സൂചി / മൂർച്ചയുള്ള മാലിന്യം', iconName: 'Syringe' },
      { id: 'biohazard', label: 'Biohazard Waste Spill', mlLabel: 'ബയോഹാസാർഡ് മാലിന്യ ചോർച്ച', iconName: 'Skull' },
      { id: 'night_overload', label: 'Unsafe Night-Duty Staffing', mlLabel: 'രാത്രി ഡ്യൂട്ടിയിലെ അമിതഭാരം', iconName: 'Moon' },
      { id: 'oxygen_line', label: 'Cylinder / Oxygen Valve Fault', mlLabel: 'ഓക്സിജൻ സിലിണ്ടർ തകരാർ', iconName: 'Activity' },
    ],
    feedbackTopics: [
      { id: 'shift_incharge', label: 'Shift In-Charge Support', mlLabel: 'ഷിഫ്റ്റ് ഇൻ-ചാർജ് പിന്തുണ' },
      { id: 'ppe_gloves', label: 'Masks, Gloves & PPE Supply', mlLabel: 'മാസ്ക് / ഗ്ലൗസ് ലഭ്യത' },
      { id: 'night_rest', label: 'Night Shift Recovery Rest', mlLabel: 'രാത്രി ഷിഫ്റ്റ് വിശ്രമം' },
      { id: 'sanitation', label: 'Changing Room Hygiene', mlLabel: 'വസ്ത്രം മാറുന്ന മുറി ശുചിത്വം' },
    ],
    skillTags: ['Biohazard Waste Protocol', 'Autoclave Sterilization', 'Safe Patient Transfer', 'Basic Life Support (BLS)'],
  },
  factory: {
    sector: 'factory',
    title: 'Manufacturing Factory (Bonus)',
    subtitle: 'Assembly line operators, machine guard verification, heat/noise monitoring, and lockout-tagout skills.',
    typicalRoles: ['Line Operator', 'Forklift Driver', 'CNC Technician', 'Packaging Worker', 'Floor Supervisor'],
    shiftTypes: [
      { name: 'Shift A (Morning)', start_time: '06:00', end_time: '14:30', break_minutes: 30 },
      { name: 'Shift B (Swing)', start_time: '14:00', end_time: '22:30', break_minutes: 30 },
      { name: 'Shift C (Night)', start_time: '22:00', end_time: '06:30', break_minutes: 30 },
    ],
    checkInPointDesc: 'Shopfloor Bay QR plus 200m location check',
    hazardCategories: [
      { id: 'machine_guard', label: 'Missing Machine Guard', mlLabel: 'മെഷീൻ സുരക്ഷാ കവർ ഇല്ല', iconName: 'Cog' },
      { id: 'overheating', label: 'Extreme Heat / Ventilation', mlLabel: 'അമിത ചൂട് / വായുസഞ്ചാര കുറവ്', iconName: 'Flame' },
      { id: 'noise', label: 'Excessive Line Noise (>85dB)', mlLabel: 'അമിത ശബ്ദം', iconName: 'Volume2' },
      { id: 'conveyor', label: 'Blocked Emergency Stop', mlLabel: 'എമർജൻസി സ്റ്റോപ്പ് തടസ്സം', iconName: 'OctagonAlert' },
    ],
    feedbackTopics: [
      { id: 'line_supervisor', label: 'Line Supervisor Respect', mlLabel: 'സൂപ്പർവൈസറുടെ സമീപനം' },
      { id: 'line_breaks', label: 'Rest & Relief Breaks', mlLabel: 'ഇടവേള സമയം' },
      { id: 'ventilation', label: 'Cooling & Drinking Water', mlLabel: 'വായുസഞ്ചാരവും കുടിവെള്ളവും' },
      { id: 'ear_protection', label: 'Earplugs & Safety Boots', mlLabel: 'സുരക്ഷാ ഉപകരണങ്ങൾ' },
    ],
    skillTags: ['Lockout-Tagout (LOTO)', 'Forklift Safety Cert', 'CNC Guard Inspection', 'Industrial Fire Drill'],
  },
};

export interface Organization {
  id: string;
  name: string;
  sector: SectorKey;
  default_language: LanguageCode;
  settings: OrgLabourSettings;
  created_at: string;
}

export interface UserProfile {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  must_change_password: boolean;
  role: Role;
  full_name: string;
  department: string;
  job_title: string;
  language: LanguageCode;
  wage_type: WageType;
  wage_rate: number;
  manager_id: string | null;
  active: boolean;
  years_experience: number;
  passport_share_enabled: boolean;
  created_at: string;
}

export interface WorkLocation {
  id: string;
  org_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
}

export interface ShiftTemplate {
  id: string;
  org_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

export interface AttendanceRecord {
  id: string;
  org_id: string;
  user_id: string;
  location_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  method: 'qr_geo' | 'offline_sync' | 'manual_approved';
  regular_minutes: number;
  overtime_minutes: number;
  flags: string[];
  distance_m: number;
}

export interface PayrollRun {
  id: string;
  org_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'published';
  created_at: string;
}

export interface Payslip {
  id: string;
  org_id: string;
  user_id: string;
  run_id: string;
  period_label: string;
  wage_type: WageType;
  wage_rate: number;
  regular_hours: number;
  overtime_hours: number;
  gross: number;
  deductions: number;
  net: number;
  lines: PayslipLineItem[];
  version: number;
  published_at: string;
}

export interface HazardReport {
  id: string;
  org_id: string;
  reporter_id: string | null; // null when reported anonymously
  tracking_code: string;
  category: string;
  category_label: string;
  location_id: string;
  location_name: string;
  severity: Severity;
  description: string;
  audio_transcript?: string;
  photo_label?: string;
  status: HazardStatus;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface HazardUpdate {
  id: string;
  report_id: string;
  status: HazardStatus;
  note: string;
  photo_label?: string;
  updated_by_name: string;
  created_at: string;
}

/**
 * Privacy by design: NO user_id and NO exact timestamp on feedback_responses!
 */
export interface FeedbackResponse {
  id: string;
  org_id: string;
  team_id: string; // department name
  week: string;
  answers: Record<string, number>;
  comment?: string;
  flagged?: boolean;
}

/**
 * Separate marker table to prevent double voting for a given week; holds NO answers.
 */
export interface FeedbackSubmissionMarker {
  id: string;
  org_id: string;
  user_id: string;
  week: string;
}

export interface MoodCheckin {
  id: string;
  org_id: string;
  user_id: string;
  date: string;
  mood: 'good' | 'okay' | 'bad';
}

export interface IssueRecord {
  id: string;
  org_id: string;
  user_id: string;
  user_name: string;
  type: 'pay' | 'attendance' | 'grievance';
  reference_id?: string;
  title: string;
  notes: string;
  status: 'open' | 'in_review' | 'resolved';
  resolution_note?: string;
  created_at: string;
  due_at: string;
}

export interface UserSkillRecord {
  id: string;
  org_id: string;
  user_id: string;
  skill_name: string;
  sector: SectorKey;
  level: 'Basic' | 'Skilled' | 'Master';
  verified_by_name: string | null;
  verified_at: string | null;
}

export interface TrainingRecord {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  date: string;
  verified_by_name: string;
  acknowledged: boolean;
}

export interface Announcement {
  id: string;
  org_id: string;
  title: string;
  text: string;
  ml_text?: string;
  audience: string;
  created_at: string;
  read_user_ids: string[]; // Admin only sees count
}

export interface LeaveRequest {
  id: string;
  org_id: string;
  user_id: string;
  user_name: string;
  request_type: 'leave' | 'shift_swap';
  from_date: string;
  to_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface FairShiftDatabase {
  organizations: Organization[];
  profiles: UserProfile[];
  locations: WorkLocation[];
  shift_templates: ShiftTemplate[];
  attendance: AttendanceRecord[];
  payroll_runs: PayrollRun[];
  payslips: Payslip[];
  hazard_reports: HazardReport[];
  hazard_updates: HazardUpdate[];
  feedback_responses: FeedbackResponse[];
  feedback_submissions: FeedbackSubmissionMarker[];
  mood_checkins: MoodCheckin[];
  issues: IssueRecord[];
  user_skills: UserSkillRecord[];
  trainings: TrainingRecord[];
  announcements: Announcement[];
  leave_requests: LeaveRequest[];
  audit_log: AuditLogEntry[];
}

export function createInitialSeedDatabase(): FairShiftDatabase {
  const organizations: Organization[] = [
    {
      id: 'org-greenvalley',
      name: 'Green Valley Construction Site',
      sector: 'construction',
      default_language: 'ml',
      settings: { ...DEFAULT_LABOUR_SETTINGS },
      created_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'org-sunrise',
      name: 'Sunrise College of Engineering',
      sector: 'college',
      default_language: 'en',
      settings: { ...DEFAULT_LABOUR_SETTINGS },
      created_at: '2026-09-05T08:00:00.000Z',
    },
    {
      id: 'org-mercy-hospital',
      name: 'Mercy General Hospital',
      sector: 'hospital',
      default_language: 'ml',
      settings: { ...DEFAULT_LABOUR_SETTINGS },
      created_at: '2026-09-10T08:00:00.000Z',
    },
    {
      id: 'org-apex-factory',
      name: 'Apex Precision Components Factory',
      sector: 'factory',
      default_language: 'ta',
      settings: { ...DEFAULT_LABOUR_SETTINGS },
      created_at: '2026-09-12T08:00:00.000Z',
    },
  ];

  // Demo password for all seeded accounts: "fairshift123" (hashed representation)
  const DEMO_HASH = 'sha256$fairshift123';

  const profiles: UserProfile[] = [
    // --- ORG 1: GREEN VALLEY CONSTRUCTION SITE (12 people) ---
    {
      id: 'usr-gv-admin',
      org_id: 'org-greenvalley',
      email: 'admin@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'admin',
      full_name: 'Priya Nair',
      department: 'Site Management & HR',
      job_title: 'Project HR Director',
      language: 'en',
      wage_type: 'monthly',
      wage_rate: 52000,
      manager_id: null,
      active: true,
      years_experience: 9,
      passport_share_enabled: true,
      created_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'usr-gv-manager',
      org_id: 'org-greenvalley',
      email: 'suresh.manager@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'manager',
      full_name: 'Suresh Menon',
      department: 'Tower B Structural Crew',
      job_title: 'Senior Site Supervisor',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 36000,
      manager_id: 'usr-gv-admin',
      active: true,
      years_experience: 12,
      passport_share_enabled: true,
      created_at: '2026-09-01T08:15:00.000Z',
    },
    {
      id: 'usr-gv-ravi',
      org_id: 'org-greenvalley',
      email: 'ravi.017@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Ravi Kumar (രവി കുമാർ)',
      department: 'Tower B Structural Crew',
      job_title: 'Senior Mason & Scaffolder',
      language: 'ml',
      wage_type: 'daily',
      wage_rate: 960, // ₹120/hr regular, ₹240/hr OT
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 7,
      passport_share_enabled: true,
      created_at: '2026-09-02T08:00:00.000Z',
    },
    {
      id: 'usr-gv-abdul',
      org_id: 'org-greenvalley',
      email: 'abdul.023@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Abdul Rahman',
      department: 'Tower B Structural Crew',
      job_title: 'Site Electrician',
      language: 'ml',
      wage_type: 'daily',
      wage_rate: 1040, // ₹130/hr
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 5,
      passport_share_enabled: true,
      created_at: '2026-09-02T08:10:00.000Z',
    },
    {
      id: 'usr-gv-lakshmi',
      org_id: 'org-greenvalley',
      email: 'lakshmi.031@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Lakshmi Devi',
      department: 'Tower B Structural Crew',
      job_title: 'Structural Helper',
      language: 'ta',
      wage_type: 'daily',
      wage_rate: 800,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 4,
      passport_share_enabled: true,
      created_at: '2026-09-02T08:20:00.000Z',
    },
    {
      id: 'usr-gv-manoj',
      org_id: 'org-greenvalley',
      email: 'manoj.042@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Manoj Varghese',
      department: 'Tower B Structural Crew',
      job_title: 'Welder & Rigger',
      language: 'ml',
      wage_type: 'daily',
      wage_rate: 1000,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 6,
      passport_share_enabled: true,
      created_at: '2026-09-02T08:30:00.000Z',
    },
    {
      id: 'usr-gv-kiran',
      org_id: 'org-greenvalley',
      email: 'kiran.055@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Kiran Yadav',
      department: 'Tower B Structural Crew',
      job_title: 'Crane & Hoist Operator',
      language: 'hi',
      wage_type: 'daily',
      wage_rate: 1120,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 8,
      passport_share_enabled: false,
      created_at: '2026-09-02T08:40:00.000Z',
    },
    {
      id: 'usr-gv-santhosh',
      org_id: 'org-greenvalley',
      email: 'santhosh.061@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Santhosh K',
      department: 'Foundation & Finishing',
      job_title: 'Plastering Mason',
      language: 'ml',
      wage_type: 'daily',
      wage_rate: 920,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 5,
      passport_share_enabled: true,
      created_at: '2026-09-02T08:50:00.000Z',
    },
    {
      id: 'usr-gv-deepak',
      org_id: 'org-greenvalley',
      email: 'deepak.074@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Deepak Sharma',
      department: 'Foundation & Finishing',
      job_title: 'Bar Bender',
      language: 'hi',
      wage_type: 'daily',
      wage_rate: 880,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 3,
      passport_share_enabled: true,
      created_at: '2026-09-02T09:00:00.000Z',
    },
    {
      id: 'usr-gv-murugan',
      org_id: 'org-greenvalley',
      email: 'murugan.088@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Murugan S',
      department: 'Foundation & Finishing',
      job_title: 'Scaffolding Specialist',
      language: 'ta',
      wage_type: 'daily',
      wage_rate: 960,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 7,
      passport_share_enabled: true,
      created_at: '2026-09-02T09:10:00.000Z',
    },
    {
      id: 'usr-gv-anitha',
      org_id: 'org-greenvalley',
      email: 'anitha.092@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Anitha Babu',
      department: 'Foundation & Finishing',
      job_title: 'Site Safety & Store Helper',
      language: 'ml',
      wage_type: 'daily',
      wage_rate: 840,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 4,
      passport_share_enabled: true,
      created_at: '2026-09-02T09:20:00.000Z',
    },
    {
      id: 'usr-gv-rajesh',
      org_id: 'org-greenvalley',
      email: 'rajesh.099@greenvalley.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: true, // Invited user who needs password change prompt option
      role: 'worker',
      full_name: 'Rajesh Paswan',
      department: 'Tower B Structural Crew',
      job_title: 'Concrete Mixer Operator',
      language: 'hi',
      wage_type: 'daily',
      wage_rate: 920,
      manager_id: 'usr-gv-manager',
      active: true,
      years_experience: 5,
      passport_share_enabled: true,
      created_at: '2026-09-02T09:30:00.000Z',
    },

    // --- ORG 2: SUNRISE COLLEGE (10 staff) ---
    {
      id: 'usr-sc-admin',
      org_id: 'org-sunrise',
      email: 'admin@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'admin',
      full_name: 'Dr. Meera Krishnan',
      department: 'Campus Administration',
      job_title: 'Campus Registrar & Estate Admin',
      language: 'en',
      wage_type: 'monthly',
      wage_rate: 62000,
      manager_id: null,
      active: true,
      years_experience: 14,
      passport_share_enabled: true,
      created_at: '2026-09-05T08:00:00.000Z',
    },
    {
      id: 'usr-sc-manager',
      org_id: 'org-sunrise',
      email: 'rajan.manager@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'manager',
      full_name: 'Rajan Pillai',
      department: 'Campus Operations & Facilities',
      job_title: 'Estate Supervisor',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 32000,
      manager_id: 'usr-sc-admin',
      active: true,
      years_experience: 10,
      passport_share_enabled: true,
      created_at: '2026-09-05T08:15:00.000Z',
    },
    {
      id: 'usr-sc-geetha',
      org_id: 'org-sunrise',
      email: 'geetha.04@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Geetha Kumari',
      department: 'Campus Operations & Facilities',
      job_title: 'Senior Housekeeping Staff',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 18720, // ₹90/hr
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 6,
      passport_share_enabled: true,
      created_at: '2026-09-05T08:30:00.000Z',
    },
    {
      id: 'usr-sc-senthil',
      org_id: 'org-sunrise',
      email: 'senthil.07@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Senthil Nathan',
      department: 'Campus Security',
      job_title: 'Main Gate Security Guard',
      language: 'ta',
      wage_type: 'monthly',
      wage_rate: 20800, // ₹100/hr
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 8,
      passport_share_enabled: true,
      created_at: '2026-09-05T08:40:00.000Z',
    },
    {
      id: 'usr-sc-bindu',
      org_id: 'org-sunrise',
      email: 'bindu.08@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Bindu Thomas',
      department: 'Hostel Mess & Canteen',
      job_title: 'Mess Head Cook Assistant',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 19500,
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 5,
      passport_share_enabled: true,
      created_at: '2026-09-05T08:50:00.000Z',
    },
    {
      id: 'usr-sc-anand',
      org_id: 'org-sunrise',
      email: 'anand.11@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Anand Varma',
      department: 'Science & Chemistry Labs',
      job_title: 'Chemistry Lab Attendant',
      language: 'en',
      wage_type: 'monthly',
      wage_rate: 22880, // ₹110/hr
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 4,
      passport_share_enabled: true,
      created_at: '2026-09-05T09:00:00.000Z',
    },
    {
      id: 'usr-sc-selvi',
      org_id: 'org-sunrise',
      email: 'selvi.14@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Selvi M',
      department: 'Campus Operations & Facilities',
      job_title: 'Academic Block Housekeeping',
      language: 'ta',
      wage_type: 'monthly',
      wage_rate: 18720,
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 3,
      passport_share_enabled: true,
      created_at: '2026-09-05T09:10:00.000Z',
    },
    {
      id: 'usr-sc-harish',
      org_id: 'org-sunrise',
      email: 'harish.18@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Harish Nair',
      department: 'Campus Security',
      job_title: 'Night Patrol Security',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 20800,
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 7,
      passport_share_enabled: true,
      created_at: '2026-09-05T09:20:00.000Z',
    },
    {
      id: 'usr-sc-kavitha',
      org_id: 'org-sunrise',
      email: 'kavitha.21@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Kavitha R',
      department: 'Hostel Mess & Canteen',
      job_title: 'Mess Sanitation Staff',
      language: 'ta',
      wage_type: 'monthly',
      wage_rate: 18200,
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 2,
      passport_share_enabled: true,
      created_at: '2026-09-05T09:30:00.000Z',
    },
    {
      id: 'usr-sc-joseph',
      org_id: 'org-sunrise',
      email: 'joseph.25@sunrisecollege.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'worker',
      full_name: 'Joseph Mathew',
      department: 'Science & Chemistry Labs',
      job_title: 'Electrical & Lab Maintenance',
      language: 'ml',
      wage_type: 'monthly',
      wage_rate: 23920,
      manager_id: 'usr-sc-manager',
      active: true,
      years_experience: 9,
      passport_share_enabled: true,
      created_at: '2026-09-05T09:40:00.000Z',
    },

    // --- BONUS ORG 3: HOSPITAL ADMIN & WORKER ---
    {
      id: 'usr-mh-admin',
      org_id: 'org-mercy-hospital',
      email: 'admin@mercyhospital.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'admin',
      full_name: 'Dr. Elizabeth Chacko',
      department: 'Hospital Operations',
      job_title: 'Chief Nursing & Staff Officer',
      language: 'en',
      wage_type: 'monthly',
      wage_rate: 68000,
      manager_id: null,
      active: true,
      years_experience: 15,
      passport_share_enabled: true,
      created_at: '2026-09-10T08:00:00.000Z',
    },
    // --- BONUS ORG 4: FACTORY ADMIN ---
    {
      id: 'usr-af-admin',
      org_id: 'org-apex-factory',
      email: 'admin@apexfactory.fairshift.app',
      password_hash: DEMO_HASH,
      must_change_password: false,
      role: 'admin',
      full_name: 'Karthik Sundaram',
      department: 'Plant Management',
      job_title: 'Plant Safety & HR Head',
      language: 'ta',
      wage_type: 'monthly',
      wage_rate: 58000,
      manager_id: null,
      active: true,
      years_experience: 11,
      passport_share_enabled: true,
      created_at: '2026-09-12T08:00:00.000Z',
    },
  ];

  const locations: WorkLocation[] = [
    {
      id: 'loc-gv-gate1',
      org_id: 'org-greenvalley',
      name: 'Main Gate 1 — Tower B Entry (Kakkanad)',
      latitude: 10.0159,
      longitude: 76.3419,
      radius_m: 200,
    },
    {
      id: 'loc-gv-yard',
      org_id: 'org-greenvalley',
      name: 'Steel Fabrication Yard & Hoist Bay',
      latitude: 10.0165,
      longitude: 76.3425,
      radius_m: 200,
    },
    {
      id: 'loc-sc-main',
      org_id: 'org-sunrise',
      name: 'Main Academic Block & Gate QR',
      latitude: 12.8231,
      longitude: 80.0444,
      radius_m: 200,
    },
    {
      id: 'loc-sc-lab',
      org_id: 'org-sunrise',
      name: 'Science & Chemistry Lab Wing',
      latitude: 12.8238,
      longitude: 80.0451,
      radius_m: 150,
    },
    {
      id: 'loc-mh-ward',
      org_id: 'org-mercy-hospital',
      name: 'Emergency & ICU Sanitation Bay',
      latitude: 9.9816,
      longitude: 76.2999,
      radius_m: 150,
    },
    {
      id: 'loc-af-line1',
      org_id: 'org-apex-factory',
      name: 'Assembly Shopfloor Line 1',
      latitude: 13.0827,
      longitude: 80.2707,
      radius_m: 200,
    },
  ];

  const shift_templates: ShiftTemplate[] = [
    { id: 'st-gv-day', org_id: 'org-greenvalley', name: 'Day Shift (08:00 - 17:00)', start_time: '08:00', end_time: '17:00', break_minutes: 60 },
    { id: 'st-gv-night', org_id: 'org-greenvalley', name: 'Night Shift (20:00 - 05:00)', start_time: '20:00', end_time: '05:00', break_minutes: 60 },
    { id: 'st-sc-morn', org_id: 'org-sunrise', name: 'Morning Shift (07:00 - 15:30)', start_time: '07:00', end_time: '15:30', break_minutes: 30 },
    { id: 'st-sc-eve', org_id: 'org-sunrise', name: 'Evening Shift (14:00 - 22:30)', start_time: '14:00', end_time: '22:30', break_minutes: 30 },
  ];

  // Create 7-day consecutive streak + heavy overtime for Ravi Kumar (usr-gv-ravi) so fatigue alert and overtime payslip are live!
  const attendance: AttendanceRecord[] = [
    {
      id: 'att-ravi-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-19',
      check_in: '2026-10-19T07:55:00.000Z',
      check_out: '2026-10-19T19:00:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120, // 2h OT
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 18,
    },
    {
      id: 'att-ravi-2',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-20',
      check_in: '2026-10-20T08:02:00.000Z',
      check_out: '2026-10-20T19:30:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 150, // 2.5h OT
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 24,
    },
    {
      id: 'att-ravi-3',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-21',
      check_in: '2026-10-21T08:18:00.000Z',
      check_out: '2026-10-21T19:18:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120, // 2h OT
      flags: ['LATE', 'OVERTIME', 'LONG_SHIFT'],
      distance_m: 31,
    },
    {
      id: 'att-ravi-4',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-22',
      check_in: '2026-10-22T07:58:00.000Z',
      check_out: '2026-10-22T18:58:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120, // 2h OT
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 15,
    },
    {
      id: 'att-ravi-5',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-23',
      check_in: '2026-10-23T08:00:00.000Z',
      check_out: '2026-10-23T19:00:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120, // 2h OT
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 12,
    },
    {
      id: 'att-ravi-6',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-24',
      check_in: '2026-10-24T08:04:00.000Z',
      check_out: '2026-10-24T18:34:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 90, // 1.5h OT
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 29,
    },
    {
      id: 'att-ravi-7',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-25',
      check_in: '2026-10-25T08:00:00.000Z',
      check_out: '2026-10-25T19:00:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120, // 2h OT (total 14h OT across 7 consecutive days!)
      flags: ['OVERTIME', 'LONG_SHIFT'],
      distance_m: 20,
    },
    // Abdul Rahman (on site today, plus past shifts)
    {
      id: 'att-abdul-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-abdul',
      location_id: 'loc-gv-gate1',
      date: '2026-10-25',
      check_in: '2026-10-25T08:15:00.000Z',
      check_out: '2026-10-25T18:45:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 90,
      flags: ['LATE', 'OVERTIME'],
      distance_m: 44,
    },
    {
      id: 'att-abdul-today',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-abdul',
      location_id: 'loc-gv-gate1',
      date: '2026-10-26',
      check_in: '2026-10-26T08:02:00.000Z',
      check_out: null,
      method: 'qr_geo',
      regular_minutes: 390,
      overtime_minutes: 0,
      flags: [],
      distance_m: 22,
    },
    // Lakshmi Devi (on site today)
    {
      id: 'att-lakshmi-today',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-lakshmi',
      location_id: 'loc-gv-gate1',
      date: '2026-10-26',
      check_in: '2026-10-26T07:56:00.000Z',
      check_out: null,
      method: 'qr_geo',
      regular_minutes: 400,
      overtime_minutes: 0,
      flags: [],
      distance_m: 19,
    },
    // Manoj Varghese (on site today, late)
    {
      id: 'att-manoj-today',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-manoj',
      location_id: 'loc-gv-yard',
      date: '2026-10-26',
      check_in: '2026-10-26T08:22:00.000Z',
      check_out: null,
      method: 'qr_geo',
      regular_minutes: 370,
      overtime_minutes: 0,
      flags: ['LATE'],
      distance_m: 35,
    },
    // Sunrise College attendance for Geetha Kumari
    {
      id: 'att-geetha-1',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-geetha',
      location_id: 'loc-sc-main',
      date: '2026-10-24',
      check_in: '2026-10-24T06:58:00.000Z',
      check_out: '2026-10-24T17:28:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 120,
      flags: ['OVERTIME'],
      distance_m: 14,
    },
    {
      id: 'att-geetha-2',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-geetha',
      location_id: 'loc-sc-main',
      date: '2026-10-25',
      check_in: '2026-10-25T07:01:00.000Z',
      check_out: '2026-10-25T16:31:00.000Z',
      method: 'qr_geo',
      regular_minutes: 480,
      overtime_minutes: 60,
      flags: ['OVERTIME'],
      distance_m: 16,
    },
    {
      id: 'att-senthil-today',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-senthil',
      location_id: 'loc-sc-main',
      date: '2026-10-26',
      check_in: '2026-10-26T06:55:00.000Z',
      check_out: null,
      method: 'qr_geo',
      regular_minutes: 420,
      overtime_minutes: 0,
      flags: [],
      distance_m: 10,
    },
  ];

  const payroll_runs: PayrollRun[] = [
    {
      id: 'run-gv-oct',
      org_id: 'org-greenvalley',
      period_label: '19 Oct – 25 Oct 2026 (Weekly Wage Run)',
      period_start: '2026-10-19',
      period_end: '2026-10-25',
      status: 'published',
      created_at: '2026-10-25T20:00:00.000Z',
    },
    {
      id: 'run-sc-oct',
      org_id: 'org-sunrise',
      period_label: 'October 2026 Campus Staff Run',
      period_start: '2026-10-01',
      period_end: '2026-10-25',
      status: 'published',
      created_at: '2026-10-25T18:00:00.000Z',
    },
  ];

  // Build Ravi Kumar's payslip using our deterministic formula
  const raviAttendance = attendance.filter((a) => a.user_id === 'usr-gv-ravi' && a.check_out);
  const raviCalc = calculatePayslip({
    wageType: 'daily',
    wageRate: 960, // ₹120/hr regular, ₹240/hr OT
    regularHoursPerDay: 8,
    overtimeMultiplier: 2.0,
    attendanceRecords: raviAttendance.map((a) => ({
      date: a.date,
      regularMinutes: a.regular_minutes,
      overtimeMinutes: a.overtime_minutes,
      shiftName: 'Tower B Day Shift',
    })),
    bonusAmount: 600,
    bonusReason: 'Zero Safety Incident & Structural Milestone Bonus',
    deductions: [
      {
        label: 'Site Canteen Meal Advance',
        amount: 350,
        explanation: '7 hot lunches at subsidised ₹50/day rate',
      },
      {
        label: 'Welfare Fund Contribution',
        amount: 150,
        explanation: 'Kerala Building & Construction Workers Welfare Board',
      },
    ],
  });

  const abdulCalc = calculatePayslip({
    wageType: 'daily',
    wageRate: 1040,
    regularHoursPerDay: 8,
    overtimeMultiplier: 2.0,
    attendanceRecords: [
      { date: '2026-10-20', regularMinutes: 480, overtimeMinutes: 60, shiftName: 'Day Shift' },
      { date: '2026-10-21', regularMinutes: 480, overtimeMinutes: 120, shiftName: 'Day Shift' },
      { date: '2026-10-22', regularMinutes: 480, overtimeMinutes: 0, shiftName: 'Day Shift' },
      { date: '2026-10-23', regularMinutes: 480, overtimeMinutes: 60, shiftName: 'Day Shift' },
      { date: '2026-10-25', regularMinutes: 480, overtimeMinutes: 90, shiftName: 'Day Shift' },
    ],
    bonusAmount: 400,
    deductions: [
      { label: 'Salary Advance Recovery', amount: 1000, explanation: 'Mid-month cash advance taken on 15 Oct' },
    ],
  });

  const geethaCalc = calculatePayslip({
    wageType: 'monthly',
    wageRate: 18720, // ₹90/hr
    regularHoursPerDay: 8,
    overtimeMultiplier: 2.0,
    attendanceRecords: [
      { date: '2026-10-20', regularMinutes: 480, overtimeMinutes: 60, shiftName: 'Morning Shift' },
      { date: '2026-10-21', regularMinutes: 480, overtimeMinutes: 0, shiftName: 'Morning Shift' },
      { date: '2026-10-22', regularMinutes: 480, overtimeMinutes: 60, shiftName: 'Morning Shift' },
      { date: '2026-10-23', regularMinutes: 480, overtimeMinutes: 0, shiftName: 'Morning Shift' },
      { date: '2026-10-24', regularMinutes: 480, overtimeMinutes: 120, shiftName: 'Convocation Extra Duty' },
      { date: '2026-10-25', regularMinutes: 480, overtimeMinutes: 60, shiftName: 'Morning Shift' },
    ],
    bonusAmount: 500,
    bonusReason: 'Annual Convocation Hall Preparation Bonus',
    deductions: [
      { label: 'EPF & ESI Contribution', amount: 420, explanation: 'Statutory Provident Fund & Medical Insurance' },
    ],
  });

  const payslips: Payslip[] = [
    {
      id: 'slip-ravi-oct',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      run_id: 'run-gv-oct',
      period_label: '19 Oct – 25 Oct 2026',
      wage_type: 'daily',
      wage_rate: 960,
      regular_hours: raviCalc.regularHoursTotal,
      overtime_hours: raviCalc.overtimeHoursTotal,
      gross: raviCalc.gross,
      deductions: raviCalc.deductionsTotal,
      net: raviCalc.net,
      lines: raviCalc.lines,
      version: 1,
      published_at: '2026-10-25T20:05:00.000Z',
    },
    {
      id: 'slip-abdul-oct',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-abdul',
      run_id: 'run-gv-oct',
      period_label: '19 Oct – 25 Oct 2026',
      wage_type: 'daily',
      wage_rate: 1040,
      regular_hours: abdulCalc.regularHoursTotal,
      overtime_hours: abdulCalc.overtimeHoursTotal,
      gross: abdulCalc.gross,
      deductions: abdulCalc.deductionsTotal,
      net: abdulCalc.net,
      lines: abdulCalc.lines,
      version: 1,
      published_at: '2026-10-25T20:05:00.000Z',
    },
    {
      id: 'slip-geetha-oct',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-geetha',
      run_id: 'run-sc-oct',
      period_label: '19 Oct – 25 Oct 2026',
      wage_type: 'monthly',
      wage_rate: 18720,
      regular_hours: geethaCalc.regularHoursTotal,
      overtime_hours: geethaCalc.overtimeHoursTotal,
      gross: geethaCalc.gross,
      deductions: geethaCalc.deductionsTotal,
      net: geethaCalc.net,
      lines: geethaCalc.lines,
      version: 1,
      published_at: '2026-10-25T18:10:00.000Z',
    },
  ];

  // Hazards: 1 overdue danger hazard (>24h old), 1 in_progress, 1 fixed, plus Sunrise College hazards
  const hazard_reports: HazardReport[] = [
    {
      id: 'haz-gv-1',
      org_id: 'org-greenvalley',
      reporter_id: 'usr-gv-ravi',
      tracking_code: 'FS-HAZ-8921',
      category: 'scaffolding',
      category_label: 'Unsafe Scaffolding',
      location_id: 'loc-gv-gate1',
      location_name: 'Main Gate 1 — Tower B Entry (Kakkanad)',
      severity: 'danger',
      description: 'Loose bamboo & steel clamp scaffolding on Tower B 3rd floor east ledge. Planks shift when walking with mortar loads.',
      audio_transcript: 'ടവർ ബി മൂന്നാം നിലയിലെ സ്കാഫോൾഡിങ് ക്ലാമ്പ് അയഞ്ഞിരിക്കുന്നു. പെട്ടെന്ന് ശരിയാക്കണം.',
      photo_label: 'Tower_B_3rd_Floor_Clamp_Photo.jpg',
      status: 'seen', // Overdue because created > 36 hours ago and danger target is 24h!
      assigned_to: 'usr-gv-manager',
      created_at: '2026-10-24T22:00:00.000Z',
      resolved_at: null,
    },
    {
      id: 'haz-gv-2',
      org_id: 'org-greenvalley',
      reporter_id: null, // Anonymous report
      tracking_code: 'FS-HAZ-9044',
      category: 'electrical',
      category_label: 'Exposed Electrical Wire',
      location_id: 'loc-gv-yard',
      location_name: 'Steel Fabrication Yard & Hoist Bay',
      severity: 'danger',
      description: 'Main 3-phase welding cable insulation is cut near water puddle by the rebar cutter.',
      audio_transcript: 'വെൽഡിങ് കേബിൾ വെള്ളക്കെട്ടിന് സമീപം പൊട്ടിയിട്ടുണ്ട്.',
      photo_label: 'Yard_Cable_Damage.jpg',
      status: 'in_progress',
      assigned_to: 'usr-gv-manager',
      created_at: '2026-10-26T06:30:00.000Z',
      resolved_at: null,
    },
    {
      id: 'haz-gv-3',
      org_id: 'org-greenvalley',
      reporter_id: 'usr-gv-lakshmi',
      tracking_code: 'FS-HAZ-7712',
      category: 'no_helmet',
      category_label: 'Missing Safety Gear / Helmet',
      location_id: 'loc-gv-gate1',
      location_name: 'Main Gate 1 — Tower B Entry (Kakkanad)',
      severity: 'medium',
      description: 'New chin-straps needed for 8 yellow helmets in store room.',
      status: 'fixed',
      assigned_to: 'usr-gv-manager',
      created_at: '2026-10-22T09:00:00.000Z',
      resolved_at: '2026-10-23T14:20:00.000Z',
    },
    {
      id: 'haz-sc-1',
      org_id: 'org-sunrise',
      reporter_id: 'usr-sc-anand',
      tracking_code: 'FS-HAZ-5501',
      category: 'lab_chemical',
      category_label: 'Lab Chemical / Fume Leak',
      location_id: 'loc-sc-lab',
      location_name: 'Science & Chemistry Lab Wing',
      severity: 'danger',
      description: 'Organic Chemistry Lab 2 exhaust fume hood fan belt snapped; acid vapors accumulating.',
      status: 'seen',
      assigned_to: 'usr-sc-manager',
      created_at: '2026-10-24T10:00:00.000Z',
      resolved_at: null,
    },
    {
      id: 'haz-sc-2',
      org_id: 'org-sunrise',
      reporter_id: 'usr-sc-geetha',
      tracking_code: 'FS-HAZ-5590',
      category: 'wet_floor',
      category_label: 'Wet / Slippery Corridor',
      location_id: 'loc-sc-main',
      location_name: 'Main Academic Block & Gate QR',
      severity: 'medium',
      description: 'Leaking water cooler pipe on Ground Floor East Corridor; need plumbers and warning cones.',
      status: 'in_progress',
      assigned_to: 'usr-sc-manager',
      created_at: '2026-10-26T08:00:00.000Z',
      resolved_at: null,
    },
  ];

  const hazard_updates: HazardUpdate[] = [
    {
      id: 'hup-1',
      report_id: 'haz-gv-1',
      status: 'received',
      note: 'Report logged via Malayalam voice note & assigned tracking code FS-HAZ-8921.',
      updated_by_name: 'FairShift Safety System',
      created_at: '2026-10-24T22:00:00.000Z',
    },
    {
      id: 'hup-2',
      report_id: 'haz-gv-1',
      status: 'seen',
      note: 'Supervisor Suresh Menon inspected 3rd floor east ledge and cordoned off outer bay.',
      updated_by_name: 'Suresh Menon (Manager)',
      created_at: '2026-10-25T09:15:00.000Z',
    },
    {
      id: 'hup-3',
      report_id: 'haz-gv-3',
      status: 'fixed',
      note: 'Issued 15 new BIS-certified helmets with chin straps at Gate 1 store.',
      photo_label: 'New_Helmets_Issued_Store.jpg',
      updated_by_name: 'Suresh Menon (Manager)',
      created_at: '2026-10-23T14:20:00.000Z',
    },
  ];

  // Seed 6 anonymous feedback responses for Green Valley (above threshold of 5!) and 6 for Sunrise College
  const feedback_responses: FeedbackResponse[] = [
    {
      id: 'fb-gv-101',
      org_id: 'org-greenvalley',
      team_id: 'Tower B Structural Crew',
      week: '2026-W43',
      answers: { supervisor: 4, water: 2, toilets: 3, safety_gear: 4, pay_clarity: 5 },
      comment: 'Drinking water cans on 3rd floor finish by 2 PM in afternoon heat. Please refill twice.',
    },
    {
      id: 'fb-gv-102',
      org_id: 'org-greenvalley',
      team_id: 'Tower B Structural Crew',
      week: '2026-W43',
      answers: { supervisor: 4, water: 3, toilets: 2, safety_gear: 3, pay_clarity: 5 },
      comment: 'Automatic overtime on payslip stopped the monthly argument with timekeeper. Very helpful.',
    },
    {
      id: 'fb-gv-103',
      org_id: 'org-greenvalley',
      team_id: 'Tower B Structural Crew',
      week: '2026-W43',
      answers: { supervisor: 3, water: 2, toilets: 3, safety_gear: 3, pay_clarity: 4 },
      comment: 'Need more heavy-duty welding gloves at the fabrication yard.',
    },
    {
      id: 'fb-gv-104',
      org_id: 'org-greenvalley',
      team_id: 'Tower B Structural Crew',
      week: '2026-W43',
      answers: { supervisor: 5, water: 3, toilets: 3, safety_gear: 4, pay_clarity: 5 },
      comment: 'Malayalam audio payslip helped my family understand exact overtime earnings.',
    },
    {
      id: 'fb-gv-105',
      org_id: 'org-greenvalley',
      team_id: 'Foundation & Finishing',
      week: '2026-W43',
      answers: { supervisor: 4, water: 3, toilets: 2, safety_gear: 4, pay_clarity: 4 },
      comment: 'Mobile toilet near east gate needs daily cleaning.',
    },
    {
      id: 'fb-gv-106',
      org_id: 'org-greenvalley',
      team_id: 'Foundation & Finishing',
      week: '2026-W43',
      answers: { supervisor: 3, water: 2, toilets: 3, safety_gear: 4, pay_clarity: 5 },
      comment: 'Continuous 7-day shifts are causing back pain; please rotate Sunday rest.',
    },
    // Sunrise College (6 responses)
    {
      id: 'fb-sc-201',
      org_id: 'org-sunrise',
      team_id: 'Campus Operations & Facilities',
      week: '2026-W43',
      answers: { dept_head: 4, break_time: 3, rest_area: 2, workload: 3, pay_clarity: 5 },
      comment: 'Housekeeping staff rest room fan is not working; please repair before summer exams.',
    },
    {
      id: 'fb-sc-202',
      org_id: 'org-sunrise',
      team_id: 'Campus Operations & Facilities',
      week: '2026-W43',
      answers: { dept_head: 5, break_time: 4, rest_area: 3, workload: 4, pay_clarity: 5 },
      comment: 'Convocation extra duty hours were paid accurately in this month payslip.',
    },
    {
      id: 'fb-sc-203',
      org_id: 'org-sunrise',
      team_id: 'Campus Security',
      week: '2026-W43',
      answers: { dept_head: 4, break_time: 3, rest_area: 3, workload: 3, pay_clarity: 4 },
      comment: 'Main gate night booth needs mosquito mesh and a better raincoat stand.',
    },
    {
      id: 'fb-sc-204',
      org_id: 'org-sunrise',
      team_id: 'Hostel Mess & Canteen',
      week: '2026-W43',
      answers: { dept_head: 3, break_time: 2, rest_area: 3, workload: 2, pay_clarity: 4 },
      comment: 'Morning breakfast rush needs one additional helper for dishwashing.',
    },
    {
      id: 'fb-sc-205',
      org_id: 'org-sunrise',
      team_id: 'Science & Chemistry Labs',
      week: '2026-W43',
      answers: { dept_head: 4, break_time: 4, rest_area: 4, workload: 4, pay_clarity: 5 },
      comment: 'Eyewash stations in Chemistry Lab were serviced on time.',
    },
    {
      id: 'fb-sc-206',
      org_id: 'org-sunrise',
      team_id: 'Campus Operations & Facilities',
      week: '2026-W43',
      answers: { dept_head: 4, break_time: 3, rest_area: 3, workload: 3, pay_clarity: 5 },
      comment: 'Department QR check-in is much faster than signing the paper register at main gate.',
    },
  ];

  const feedback_submissions: FeedbackSubmissionMarker[] = [
    { id: 'fsub-1', org_id: 'org-greenvalley', user_id: 'usr-gv-abdul', week: '2026-W43' },
    { id: 'fsub-2', org_id: 'org-greenvalley', user_id: 'usr-gv-lakshmi', week: '2026-W43' },
    { id: 'fsub-3', org_id: 'org-greenvalley', user_id: 'usr-gv-manoj', week: '2026-W43' },
    { id: 'fsub-4', org_id: 'org-greenvalley', user_id: 'usr-gv-kiran', week: '2026-W43' },
    { id: 'fsub-5', org_id: 'org-greenvalley', user_id: 'usr-gv-santhosh', week: '2026-W43' },
    { id: 'fsub-6', org_id: 'org-greenvalley', user_id: 'usr-gv-deepak', week: '2026-W43' },
    // Note: usr-gv-ravi has NOT submitted for 2026-W43 yet so the demo user can submit live!
  ];

  const mood_checkins: MoodCheckin[] = [
    { id: 'mood-1', org_id: 'org-greenvalley', user_id: 'usr-gv-ravi', date: '2026-10-24', mood: 'bad' },
    { id: 'mood-2', org_id: 'org-greenvalley', user_id: 'usr-gv-ravi', date: '2026-10-25', mood: 'bad' },
    { id: 'mood-3', org_id: 'org-greenvalley', user_id: 'usr-gv-abdul', date: '2026-10-25', mood: 'okay' },
    { id: 'mood-4', org_id: 'org-greenvalley', user_id: 'usr-gv-lakshmi', date: '2026-10-25', mood: 'good' },
  ];

  // One pay dispute (Abdul Rahman) and one attendance correction + Ravi's unresolved hazard
  const issues: IssueRecord[] = [
    {
      id: 'iss-gv-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-abdul',
      user_name: 'Abdul Rahman',
      type: 'pay',
      reference_id: 'slip-abdul-oct',
      title: 'Overtime hours on 22 Oct not counted in payslip',
      notes: 'Worked 2 extra hours fixing generator panel on 22 Oct evening, but payslip shows 0 overtime for that day.',
      status: 'open', // Created > 3 days ago -> auto-escalated to Admin!
      created_at: '2026-10-22T18:00:00.000Z',
      due_at: '2026-10-25T18:00:00.000Z',
    },
    {
      id: 'iss-gv-2',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      user_name: 'Ravi Kumar (രവി കുമാർ)',
      type: 'grievance',
      reference_id: 'haz-gv-1',
      title: 'Requesting Sunday rest day after 7-day continuous shift',
      notes: 'Have worked 7 consecutive days with 14 hrs overtime. Need approved rest day tomorrow.',
      status: 'in_review',
      created_at: '2026-10-25T19:30:00.000Z',
      due_at: '2026-10-28T19:30:00.000Z',
    },
    {
      id: 'iss-sc-1',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-bindu',
      user_name: 'Bindu Thomas',
      type: 'attendance',
      title: 'Missed evening QR check-out during hostel power outage',
      notes: 'Phone battery died during 23 Oct evening shift; left mess hall at 22:30.',
      status: 'open',
      created_at: '2026-10-24T08:00:00.000Z',
      due_at: '2026-10-27T08:00:00.000Z',
    },
  ];

  const user_skills: UserSkillRecord[] = [
    {
      id: 'usk-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      skill_name: 'Scaffolding Level 2',
      sector: 'construction',
      level: 'Master',
      verified_by_name: 'Suresh Menon (Supervisor)',
      verified_at: '2026-09-15',
    },
    {
      id: 'usk-2',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      skill_name: 'Masonry & Plastering',
      sector: 'construction',
      level: 'Master',
      verified_by_name: 'Priya Nair (HR Director)',
      verified_at: '2026-09-10',
    },
    {
      id: 'usk-3',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      skill_name: 'Site First Aid',
      sector: 'construction',
      level: 'Skilled',
      verified_by_name: 'Suresh Menon (Supervisor)',
      verified_at: '2026-10-02',
    },
    {
      id: 'usk-4',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-abdul',
      skill_name: 'Industrial 3-Phase Wiring',
      sector: 'construction',
      level: 'Master',
      verified_by_name: 'Suresh Menon (Supervisor)',
      verified_at: '2026-09-18',
    },
    {
      id: 'usk-5',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-manoj',
      skill_name: 'Arc Welding',
      sector: 'construction',
      level: 'Skilled',
      verified_by_name: 'Suresh Menon (Supervisor)',
      verified_at: '2026-09-20',
    },
    {
      id: 'usk-sc-1',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-geetha',
      skill_name: 'Fire Safety & Extinguisher',
      sector: 'college',
      level: 'Skilled',
      verified_by_name: 'Rajan Pillai (Supervisor)',
      verified_at: '2026-09-25',
    },
    {
      id: 'usk-sc-2',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-anand',
      skill_name: 'Lab Equipment Handling',
      sector: 'college',
      level: 'Master',
      verified_by_name: 'Dr. Meera Krishnan',
      verified_at: '2026-09-28',
    },
  ];

  const trainings: TrainingRecord[] = [
    {
      id: 'trn-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      title: 'Working at Height & Harness Inspection Toolbox Talk',
      date: '2026-10-15',
      verified_by_name: 'Suresh Menon',
      acknowledged: true,
    },
    {
      id: 'trn-2',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      title: 'Monsoon Electrical & Scaffolding Safety Drill',
      date: '2026-10-22',
      verified_by_name: 'Priya Nair',
      acknowledged: true,
    },
    {
      id: 'trn-3',
      org_id: 'org-sunrise',
      user_id: 'usr-sc-geetha',
      title: 'Campus Fire Evacuation & First Aid Certification',
      date: '2026-10-10',
      verified_by_name: 'Dr. Meera Krishnan',
      acknowledged: true,
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'ann-gv-1',
      org_id: 'org-greenvalley',
      title: 'Mandatory Rest Shade & Drinking Water Stations Added at Tower B',
      text: 'Two new cooled drinking water dispensers and shaded rest benches have been installed on Tower B Ground and 2nd Floor. All workers on day shift get an extra 15-minute hydration break at 2:00 PM.',
      ml_text: 'ടവർ ബി ഗ്രൗണ്ട് ഫ്ലോറിലും രണ്ടാം നിലയിലും തണുത്ത കുടിവെള്ളവും വിശ്രമ ഇരിപ്പിടങ്ങളും ഒരുക്കിയിട്ടുണ്ട്. ഉച്ചയ്ക്ക് 2 മണിക്ക് 15 മിനിറ്റ് അധിക വിശ്രമം അനുവദിച്ചിട്ടുണ്ട്.',
      audience: 'All Site Workers',
      created_at: '2026-10-25T10:00:00.000Z',
      read_user_ids: ['usr-gv-ravi', 'usr-gv-abdul', 'usr-gv-lakshmi', 'usr-gv-manoj', 'usr-gv-kiran'],
    },
    {
      id: 'ann-gv-2',
      org_id: 'org-greenvalley',
      title: 'Weekly Wage & 2x Overtime Payslips Published for 19–25 Oct',
      text: 'Your weekly payslip is now ready in My Payslips. Press the Listen button to hear your regular pay, 2x overtime hours, and deductions explained in Malayalam, Hindi, Tamil or English.',
      ml_text: 'ഒക്ടോബർ 19 മുതൽ 25 വരെയുള്ള ശമ്പള ബിൽ ഇപ്പോൾ ആപ്പിൽ ലഭ്യമാണ്. ശബ്ദത്തിൽ കേൾക്കാൻ Listen ബട്ടൺ അമർത്തുക.',
      audience: 'All Site Workers',
      created_at: '2026-10-25T20:10:00.000Z',
      read_user_ids: ['usr-gv-ravi', 'usr-gv-abdul', 'usr-gv-lakshmi'],
    },
    {
      id: 'ann-sc-1',
      org_id: 'org-sunrise',
      title: 'Convocation Extra-Duty Overtime Paid & Staff Rest Room Upgrade',
      text: 'All overtime hours from the Annual Convocation have been credited at 2x rate. The Housekeeping Staff Rest Room ceiling fan and water purifier maintenance is scheduled for tomorrow morning.',
      audience: 'All Campus Staff',
      created_at: '2026-10-25T18:30:00.000Z',
      read_user_ids: ['usr-sc-geetha', 'usr-sc-senthil', 'usr-sc-bindu', 'usr-sc-anand'],
    },
  ];

  const leave_requests: LeaveRequest[] = [
    {
      id: 'lv-gv-1',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-ravi',
      user_name: 'Ravi Kumar (രവി കുമാർ)',
      request_type: 'leave',
      from_date: '2026-10-27',
      to_date: '2026-10-27',
      reason: 'Mandatory fatigue recovery rest day after 7-day shift streak',
      status: 'pending',
      created_at: '2026-10-26T07:30:00.000Z',
    },
    {
      id: 'lv-gv-2',
      org_id: 'org-greenvalley',
      user_id: 'usr-gv-lakshmi',
      user_name: 'Lakshmi Devi',
      request_type: 'shift_swap',
      from_date: '2026-10-28',
      to_date: '2026-10-28',
      reason: 'Swap morning slot with Anitha Babu for clinic visit',
      status: 'approved',
      created_at: '2026-10-24T16:00:00.000Z',
    },
  ];

  const audit_log: AuditLogEntry[] = [
    {
      id: 'aud-1',
      org_id: 'org-greenvalley',
      actor_id: 'usr-gv-admin',
      actor_name: 'Priya Nair (Admin)',
      action: 'PAYROLL_PUBLISHED',
      target: 'Weekly Wage Run (19 Oct – 25 Oct 2026)',
      timestamp: '2026-10-25T20:05:00.000Z',
    },
    {
      id: 'aud-2',
      org_id: 'org-greenvalley',
      actor_id: 'usr-gv-manager',
      actor_name: 'Suresh Menon (Manager)',
      action: 'HAZARD_STATUS_CHANGED',
      target: 'FS-HAZ-8921 (Received → Seen)',
      timestamp: '2026-10-25T09:15:00.000Z',
    },
    {
      id: 'aud-3',
      org_id: 'org-greenvalley',
      actor_id: 'usr-gv-manager',
      actor_name: 'Suresh Menon (Manager)',
      action: 'SKILL_VERIFIED',
      target: 'Ravi Kumar — Site First Aid (Skilled)',
      timestamp: '2026-10-02T11:00:00.000Z',
    },
    {
      id: 'aud-4',
      org_id: 'org-sunrise',
      actor_id: 'usr-sc-admin',
      actor_name: 'Dr. Meera Krishnan (Admin)',
      action: 'PAYROLL_PUBLISHED',
      target: 'October 2026 Campus Staff Run',
      timestamp: '2026-10-25T18:10:00.000Z',
    },
  ];

  return {
    organizations,
    profiles,
    locations,
    shift_templates,
    attendance,
    payroll_runs,
    payslips,
    hazard_reports,
    hazard_updates,
    feedback_responses,
    feedback_submissions,
    mood_checkins,
    issues,
    user_skills,
    trainings,
    announcements,
    leave_requests,
    audit_log,
  };
}
