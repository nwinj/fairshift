import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  QrCode,
  Wallet,
  AlertTriangle,
  MessageSquareHeart,
  HeartPulse,
  Award,
  FileWarning,
  Bell,
  Settings,
  Download,
  LogOut,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Building2,
  Plus,
  Printer,
  Lock,
} from 'lucide-react';
import { PWAInstallButton } from '../hooks/usePWAInstall';

export type AdminView =
  | 'dashboard'
  | 'people'
  | 'shifts'
  | 'qr'
  | 'payroll'
  | 'hazards'
  | 'feedback'
  | 'risk'
  | 'skills'
  | 'issues'
  | 'notices'
  | 'settings';

interface AdminPortalProps {
  user: any;
  activeView: AdminView;
  onChangeView: (view: AdminView) => void;
  onSwitchOrganization: (newSession: {
    user: any;
    organization: any;
    sectorProfile: any;
  }) => void;
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  user,
  activeView,
  onChangeView,
  onSwitchOrganization,
  onLogout,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusToast, setStatusToast] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [qrCountdown, setQrCountdown] = useState(60);

  // Add person form state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<
    'worker' | 'manager' | 'admin'
  >('worker');
  const [newPersonDept, setNewPersonDept] = useState('');
  const [newPersonWageType, setNewPersonWageType] = useState<
    'daily' | 'hourly' | 'monthly'
  >('daily');
  const [newPersonWageRate, setNewPersonWageRate] = useState('960');
  const [newPersonLang, setNewPersonLang] = useState<'ml' | 'hi' | 'ta' | 'en'>(
    'ml'
  );
  const [selectedCardPerson, setSelectedCardPerson] = useState<any | null>(
    null
  );

  // Hazard resolution note state
  const [hazardNotes, setHazardNotes] = useState<Record<string, string>>({});

  // Payroll run state
  const [payrollPeriodLabel, setPayrollPeriodLabel] = useState(
    '26 Oct – 01 Nov 2026 (Weekly Wage Run)'
  );
  const [payrollBonus, setPayrollBonus] = useState('500');

  // Skill verification state
  const [verifyWorkerId, setVerifyWorkerId] = useState('');
  const [verifySkillName, setVerifySkillName] = useState('');
  const [verifySkillLevel, setVerifySkillLevel] = useState<
    'Basic' | 'Skilled' | 'Master'
  >('Skilled');

  // Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annText, setAnnText] = useState('');
  const [annMlText, setAnnMlText] = useState('');

  // Settings form state
  const [regHoursInput, setRegHoursInput] = useState('8');
  const [otMultiplierInput, setOtMultiplierInput] = useState('2.0');
  const [radiusInput, setRadiusInput] = useState('200');

  const fetchAdminBootstrap = async () => {
    try {
      const res = await fetch('/api/admin/bootstrap', {
        headers: { Authorization: `Bearer ${user.id}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!verifyWorkerId && json.people?.length) {
          const firstWorker = json.people.find((p: any) => p.role === 'worker');
          if (firstWorker) setVerifyWorkerId(firstWorker.id);
        }
        if (
          !verifySkillName &&
          json.sectorProfile?.skillTags?.length
        ) {
          setVerifySkillName(json.sectorProfile.skillTags[0]);
        }
        if (json.organization?.settings) {
          setRegHoursInput(
            String(json.organization.settings.regularHoursPerDay)
          );
          setOtMultiplierInput(
            String(json.organization.settings.overtimeMultiplier)
          );
          setRadiusInput(
            String(json.organization.settings.defaultRadiusMeters)
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminBootstrap();
  }, [user.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOrgSwitch = async (orgId: string) => {
    const res = await fetch('/api/admin/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    if (res.ok) {
      const json = await res.json();
      onSwitchOrganization(json);
      setStatusToast(
        `Switched live organisation to ${json.organization.name} (${json.sectorProfile.title} preset)`
      );
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const headers = [
      'Name',
      'Email',
      'Role',
      'Department',
      'WageType',
      'WageRate',
      'Language',
    ];
    const rows = data.people.map((p: any) =>
      [
        `"${p.full_name}"`,
        p.email,
        p.role,
        `"${p.department}"`,
        p.wage_type,
        p.wage_rate,
        p.language,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairshift-${data.organization.sector}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusToast('Exported organisation roster & attendance metrics to CSV.');
  };

  const handleHazardStatusUpdate = async (
    hazardId: string,
    newStatus: 'received' | 'seen' | 'in_progress' | 'fixed'
  ) => {
    const note =
      hazardNotes[hazardId] ||
      (newStatus === 'fixed'
        ? 'Hazard repaired, inspected, and verified safe for shift crew.'
        : `Updated to ${newStatus.replace('_', ' ')} by ${user.full_name}`);

    const res = await fetch(`/api/admin/hazards/${hazardId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        status: newStatus,
        note,
        photoLabel:
          newStatus === 'fixed' ? 'Verified_Fix_Site_Photo.jpg' : undefined,
      }),
    });
    if (res.ok) {
      setStatusToast(
        `Hazard status updated to ${newStatus.toUpperCase()}. Worker timeline updated immediately!`
      );
      await fetchAdminBootstrap();
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      setStatusToast('Please enter the worker or staff member full name.');
      return;
    }
    const res = await fetch('/api/admin/people', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        fullName: newPersonName,
        role: newPersonRole,
        department: newPersonDept || 'Site Operations',
        wageType: newPersonWageType,
        wageRate: Number(newPersonWageRate) || 960,
        language: newPersonLang,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setNewPersonName('');
      setSelectedCardPerson(json.person);
      setStatusToast(
        `Added ${json.person.full_name} with login ID ${json.person.email}`
      );
      await fetchAdminBootstrap();
    }
  };

  const handleRunPayroll = async () => {
    const res = await fetch('/api/admin/payroll/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        periodLabel: payrollPeriodLabel,
        bonusAmount: Number(payrollBonus) || 0,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setStatusToast(
        `Payroll Run Published! ${json.payslipsCount} locked payslips generated with automatic 2x overtime.`
      );
      await fetchAdminBootstrap();
    }
  };

  const handleResolveIssue = async (
    issueId: string,
    addOvertimeHours = 0
  ) => {
    const res = await fetch(`/api/admin/issues/${issueId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        status: 'resolved',
        resolutionNote:
          addOvertimeHours > 0
            ? `Verified gate QR log & issued corrected v2 payslip (+${addOvertimeHours}h 2x Overtime)`
            : `Reviewed and resolved by ${user.full_name}`,
        addOvertimeHours,
      }),
    });
    if (res.ok) {
      setStatusToast(
        addOvertimeHours > 0
          ? 'Dispute resolved & new v2 Payslip published (v1 preserved for audit)!'
          : 'Issue marked as resolved.'
      );
      await fetchAdminBootstrap();
    }
  };

  const handleVerifySkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/skills/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        workerId: verifyWorkerId,
        skillName: verifySkillName,
        level: verifySkillLevel,
      }),
    });
    if (res.ok) {
      setStatusToast(`Verified skill "${verifySkillName}" on worker Skill Passport.`);
      await fetchAdminBootstrap();
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annText.trim()) {
      setStatusToast('Please provide an announcement title and text.');
      return;
    }
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        title: annTitle,
        text: annText,
        mlText: annMlText,
        audience: 'All Organisation Workers',
      }),
    });
    if (res.ok) {
      setAnnTitle('');
      setAnnText('');
      setAnnMlText('');
      setStatusToast('Audio announcement published to all worker phones.');
      await fetchAdminBootstrap();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        settings: {
          regularHoursPerDay: Number(regHoursInput) || 8,
          overtimeMultiplier: Number(otMultiplierInput) || 2.0,
          defaultRadiusMeters: Number(radiusInput) || 200,
        },
      }),
    });
    if (res.ok) {
      setStatusToast('Updated organisation labour rules and logged in audit trail.');
      await fetchAdminBootstrap();
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-slate-600">
          Loading Management Console...
        </div>
      </div>
    );
  }

  const isManager = user.role === 'manager';
  const departments = Array.from(
    new Set(data.people.map((p: any) => p.department))
  ) as string[];

  const filteredPeople =
    deptFilter === 'all'
      ? data.people
      : data.people.filter((p: any) => p.department === deptFilter);

  // Compute Dashboard KPI metrics
  const presentTodayCount = data.attendance.filter(
    (a: any) => a.check_out === null || a.date === '2026-10-26'
  ).length;
  const lateCount = data.attendance.filter((a: any) =>
    a.flags?.includes('LATE')
  ).length;
  const weeklyOvertimeHours = Number(
    (
      data.attendance.reduce(
        (acc: number, a: any) => acc + a.overtime_minutes,
        0
      ) / 60
    ).toFixed(1)
  );
  const openHazardsCount = data.hazards.filter(
    (h: any) => h.status !== 'fixed'
  ).length;
  const overdueHazardsCount = data.hazards.filter(
    (h: any) => h.overdueInfo?.isOverdue
  ).length;
  const fatigueFlagsCount = data.workerInsights.filter(
    (wi: any) => wi.fatigue.isFlagged
  ).length;
  const highQuitRiskCount = data.workerInsights.filter(
    (wi: any) => wi.quitRisk?.level === 'high'
  ).length;

  const navItems: Array<{
    id: AdminView;
    label: string;
    icon: any;
    adminOnly?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'hazards', label: 'Hazard Queue', icon: AlertTriangle },
    { id: 'risk', label: 'Fatigue & Quit-Risk', icon: HeartPulse },
    { id: 'feedback', label: 'Anonymous Pulse', icon: MessageSquareHeart },
    { id: 'shifts', label: 'Shifts & Attendance', icon: Clock },
    { id: 'qr', label: 'Live Gate QR Code', icon: QrCode },
    {
      id: 'payroll',
      label: 'Payroll & Payslips',
      icon: Wallet,
      adminOnly: true,
    },
    { id: 'people', label: 'People & ID Cards', icon: Users },
    { id: 'skills', label: 'Skill Matrix', icon: Award },
    { id: 'issues', label: 'Disputes & Leave', icon: FileWarning },
    { id: 'notices', label: 'Audio Notices', icon: Bell },
    {
      id: 'settings',
      label: 'Labour Rules & Audit',
      icon: Settings,
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar Navigation (260px width) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-200 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800">
          <div className="text-lg font-extrabold tracking-tight text-white font-display">
            FairShift Console
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {data.organization.name}
          </div>
          <div className="text-[11px] text-amber-400 font-mono mt-1">
            Role: {user.role.toUpperCase()} · {data.sectorProfile.title}
          </div>
        </div>

        <nav
          aria-label="Management Sidebar"
          className="flex-1 p-3 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            const restrictedForManager = isManager && item.adminOnly;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[40px] ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {restrictedForManager && (
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-white truncate">
            {user.full_name}
          </div>
          <div className="truncate font-mono text-[11px]">{user.email}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Header Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-6">
          <div className="text-sm font-semibold text-slate-600 truncate">
            <span className="text-slate-900 font-bold">
              {data.organization.name}
            </span>
            <span aria-hidden="true"> / </span>
            <span>{data.sectorProfile.title}</span>
            <span aria-hidden="true"> / </span>
            <span className="text-slate-900 capitalize">{activeView}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Cross-Sector Live Organisation Switcher & PWA Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-1">
              Sector Org:
            </span>
            {data.allOrganizations.map((org: any) => {
              const active = org.id === data.organization.id;
              const shortLabel =
                org.sector === 'construction'
                  ? 'Green Valley (Construction)'
                  : org.sector === 'college'
                  ? 'Sunrise College (Education)'
                  : org.sector === 'hospital'
                  ? 'Mercy Hospital (Healthcare)'
                  : org.sector === 'factory'
                  ? 'Apex Factory (Manufacturing)'
                  : org.name;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleOrgSwitch(org.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
          </div>
        </div>

        {/* Mobile/Tablet View Selector */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px] ${
                activeView === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {statusToast && (
          <div className="px-6 pt-4">
            <div
              role="status"
              className="p-3.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-semibold flex items-center justify-between gap-4"
            >
              <span>{statusToast}</span>
              <button
                type="button"
                onClick={() => setStatusToast('')}
                className="text-slate-400 hover:text-white underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Viewport */}
        <main className="p-6 space-y-6 flex-1">
          {/* Manager Restriction Guard for Payroll & Settings */}
          {isManager &&
          (activeView === 'payroll' || activeView === 'settings') ? (
            <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
              <Lock className="w-10 h-10 text-red-600 mx-auto" />
              <h2 className="text-xl font-extrabold text-slate-900">
                Restricted to Organisation Admin
              </h2>
              <p className="text-xs text-slate-600">
                Supervisor / Manager accounts can manage team attendance,
                hazards, and issues, but cannot view or modify organisation
                payroll rules or labour settings.
              </p>
              <button
                type="button"
                onClick={() => onChangeView('dashboard')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold min-h-[42px]"
              >
                Back to Dashboard
              </button>
            </div>
          ) : null}

          {/* VIEW 1: DASHBOARD OVERVIEW (F7) */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* 8 KPI Cards with Tabular Numerals */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Present Today / Active
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {presentTodayCount} / {data.people.length}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Verified via Gate QR
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Late Check-Ins
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {lateCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Grace: {data.organization.settings.lateGraceMinutes} mins
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Overtime Hours (Week)
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {weeklyOvertimeHours} hrs
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    Paid at {data.organization.settings.overtimeMultiplier}x rate
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Open Safety Hazards
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {openHazardsCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Across {data.locations.length} work locations
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Overdue Hazards
                  </div>
                  <div
                    className={`text-2xl font-extrabold font-mono tabular-nums mt-1 ${
                      overdueHazardsCount > 0
                        ? 'text-red-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {overdueHazardsCount}
                  </div>
                  <div className="text-[11px] text-red-700 font-semibold mt-1">
                    {overdueHazardsCount > 0
                      ? 'Auto-Escalated to Admin'
                      : 'All within SLA target'}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Fatigue & Streak Flags
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 font-mono tabular-nums mt-1">
                    {fatigueFlagsCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    &gt;9h/day or 7-day streak
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Anonymous Pulse Score
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {data.feedbackAggregate.isVisible
                      ? `${data.feedbackAggregate.overallAverage} / 5.0`
                      : 'Hidden (<5)'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {data.feedbackAggregate.responseCount} anonymous responses
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 font-medium">
                    High Quit-Risk Indicator
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                    {isManager ? 'Admin Only' : highQuitRiskCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Explainable 0–100 rule model
                  </div>
                </div>
              </section>

              {/* Charts & Priority Action Queues */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 14-Day Attendance & Overtime Trend Chart */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        14-Day Attendance & Overtime Hours Trend
                      </h2>
                      <p className="text-xs text-slate-500">
                        Daily regular hours (slate) vs automatic 2x overtime
                        hours (amber)
                      </p>
                    </div>
                    <select
                      aria-label="Filter by Department"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-7 gap-2 pt-4 items-end h-44">
                    {[
                      { day: '19 Oct', reg: 78, ot: 18 },
                      { day: '20 Oct', reg: 82, ot: 22 },
                      { day: '21 Oct', reg: 80, ot: 16 },
                      { day: '22 Oct', reg: 85, ot: 14 },
                      { day: '23 Oct', reg: 84, ot: 20 },
                      { day: '24 Oct', reg: 76, ot: 24 },
                      { day: '25 Oct', reg: 88, ot: 26 },
                    ].map((bar) => (
                      <div
                        key={bar.day}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div className="w-full flex flex-col justify-end h-32 bg-slate-100 rounded-lg overflow-hidden p-1 gap-0.5">
                          <div
                            style={{ height: `${bar.ot}%` }}
                            className="w-full bg-amber-500 rounded-xs"
                            title={`Overtime: ${bar.ot}h`}
                          />
                          <div
                            style={{ height: `${bar.reg}%` }}
                            className="w-full bg-slate-900 rounded-xs"
                            title={`Regular: ${bar.reg}h`}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-600">
                          {bar.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Urgent Escalations: Overdue Hazards & Fatigue Flags */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Early Warning Escalations
                    </h2>
                    <button
                      type="button"
                      onClick={() => onChangeView('hazards')}
                      className="text-xs font-semibold text-slate-900 underline"
                    >
                      Open Hazard Queue →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data.hazards.slice(0, 3).map((h: any) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {h.category_label} ({h.tracking_code})
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                            {h.description}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {h.overdueInfo?.isOverdue ? (
                              <span className="text-red-600 font-bold">
                                OVERDUE PAST TARGET · ESCALATED
                              </span>
                            ) : (
                              <span>Status: {h.status.toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        {h.status !== 'fixed' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleHazardStatusUpdate(h.id, 'fixed')
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 min-h-[36px]"
                          >
                            Mark Fixed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 2: HAZARD QUEUE & RESOLUTION (F4) */}
          {activeView === 'hazards' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    Workplace Safety Hazard Queue (F4)
                  </h1>
                  <p className="text-xs text-slate-500">
                    Response targets: High Danger = 24h · Medium = 72h · Low = 7
                    days. Overdue reports auto-escalate to Admin.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {data.hazards.map((h: any) => (
                  <div
                    key={h.id}
                    className={`bg-white rounded-xl border p-5 space-y-4 ${
                      h.overdueInfo?.isOverdue
                        ? 'border-red-400'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-500 font-mono">
                          <span>{h.tracking_code}</span>
                          <span aria-hidden="true"> · </span>
                          <span>Severity: {h.severity.toUpperCase()}</span>
                          <span aria-hidden="true"> · </span>
                          <span>Reporter: {h.reporter_name}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{h.location_name}</span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-1">
                          {h.category_label}
                        </h2>
                        <p className="text-sm text-slate-700 mt-1">
                          {h.description}
                        </p>
                        {h.audio_transcript && (
                          <div className="text-xs text-slate-600 mt-1 italic">
                            Voice Transcript: &ldquo;{h.audio_transcript}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-xs font-mono font-bold uppercase">
                          Status: {h.status.replace('_', ' ')}
                        </div>
                        {h.overdueInfo?.isOverdue && (
                          <div className="text-xs font-bold text-red-600">
                            ! OVERDUE ESCALATION
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                      <input
                        type="text"
                        aria-label={`Resolution note for ${h.tracking_code}`}
                        placeholder="Add supervisor inspection or fix note..."
                        value={hazardNotes[h.id] || ''}
                        onChange={(e) =>
                          setHazardNotes({
                            ...hazardNotes,
                            [h.id]: e.target.value,
                          })
                        }
                        className="flex-1 min-w-[220px] px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                      />

                      {(['seen', 'in_progress', 'fixed'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleHazardStatusUpdate(h.id, st)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold min-h-[38px] ${
                            h.status === st
                              ? 'bg-slate-900 text-white'
                              : st === 'fixed'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          Set {st.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: FATIGUE ALERTS & EXPLAINABLE QUIT-RISK INDICATOR (F6 & F7) */}
          {activeView === 'risk' && (
            <div className="space-y-6">
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs text-slate-800 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    Ethical Guardrail: Supportive Early Warning Indicator Only
                  </div>
                  <p className="mt-0.5">
                    The Quit-Risk Indicator (0–100) is rule-based and
                    explainable, showing the top 3 contributing factors next to
                    every score. Only Admin can see it, and it exists strictly to
                    initiate a supportive wellbeing conversation or approve rest
                    days — never to penalize a worker.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-3 px-4">Worker & Role</th>
                      <th className="py-3 px-4">Fatigue & Streak Status</th>
                      <th className="py-3 px-4 text-right">
                        Quit-Risk Score (0–100)
                      </th>
                      <th className="py-3 px-4">
                        Top 3 Explainable Reasons & Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.workerInsights.map((wi: any) => (
                      <tr key={wi.worker.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {wi.worker.full_name}
                          </div>
                          <div className="text-slate-500">
                            {wi.worker.job_title} · {wi.worker.department}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {wi.fatigue.isFlagged ? (
                            <div className="space-y-1">
                              <div className="font-bold text-amber-800">
                                FLAGGED ({wi.fatigue.consecutiveDaysWorked}-Day
                                Streak · {wi.fatigue.weeklyHours}h/wk)
                              </div>
                              <div className="text-slate-600">
                                {wi.fatigue.reasons[0]}
                              </div>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-semibold">
                              Healthy Schedule ({wi.fatigue.weeklyHours}h/wk)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          {wi.quitRisk ? (
                            <span
                              className={`text-base font-extrabold ${
                                wi.quitRisk.level === 'high'
                                  ? 'text-red-600'
                                  : wi.quitRisk.level === 'moderate'
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                              }`}
                            >
                              {wi.quitRisk.score} / 100 (
                              {wi.quitRisk.level.toUpperCase()})
                            </span>
                          ) : (
                            <span className="text-slate-400">Admin Only</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {wi.quitRisk ? (
                            <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                              {wi.quitRisk.topReasons.map(
                                (r: string, idx: number) => (
                                  <li key={idx}>{r}</li>
                                )
                              )}
                            </ul>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: ANONYMOUS PULSE ANALYTICS (F5) */}
          {activeView === 'feedback' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900">
                      Anonymous Worker Pulse Analytics (F5)
                    </h1>
                    <p className="text-xs text-slate-500">
                      Scores unlock only when a group has{' '}
                      {data.feedbackAggregate.threshold} or more responses.
                      Comments are shown in random order without timestamps or
                      user IDs.
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div>
                      Responses This Week:{' '}
                      <strong>{data.feedbackAggregate.responseCount}</strong>
                    </div>
                    <div>
                      Privacy Threshold:{' '}
                      <strong>&ge; {data.feedbackAggregate.threshold}</strong>
                    </div>
                  </div>
                </div>

                {!data.feedbackAggregate.isVisible ? (
                  <div className="p-8 rounded-xl bg-slate-50 text-center text-sm text-slate-600">
                    Waiting for at least {data.feedbackAggregate.threshold}{' '}
                    responses before displaying scores to protect worker
                    anonymity.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        Topic Averages (1.0 to 5.0)
                      </h2>
                      {data.sectorProfile.feedbackTopics.map((topic: any) => {
                        const avg =
                          data.feedbackAggregate.topicAverages[topic.id] || 0;
                        return (
                          <div key={topic.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{topic.label}</span>
                              <span className="font-mono tabular-nums">
                                {avg.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${(avg / 5) * 100}%` }}
                                className={`h-full ${
                                  avg < 3
                                    ? 'bg-red-500'
                                    : avg < 3.8
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        Randomized Untraceable Comments (Zero Timestamps)
                      </h2>
                      <div className="space-y-2.5">
                        {data.feedbackAggregate.sanitizedComments.map(
                          (c: any) => (
                            <div
                              key={c.id}
                              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                            >
                              <div>&ldquo;{c.comment}&rdquo;</div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Team: {c.team_id} · No user_id · No timestamp
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 5: SHIFTS & LIVE ROSTER (F2) */}
          {activeView === 'shifts' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900">
                Live Site Attendance & Automatic Overtime Log
              </h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Check In / Out</th>
                      <th className="py-3 px-4 text-right">Regular</th>
                      <th className="py-3 px-4 text-right">Overtime (2x)</th>
                      <th className="py-3 px-4">Flags & GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {data.attendance.map((att: any) => {
                      const worker = data.people.find(
                        (p: any) => p.id === att.user_id
                      );
                      return (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold">{att.date}</td>
                          <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                            {worker?.full_name || att.user_id}
                          </td>
                          <td className="py-3 px-4">
                            {att.check_in.slice(11, 16)} →{' '}
                            {att.check_out
                              ? att.check_out.slice(11, 16)
                              : 'ON SITE NOW'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(att.regular_minutes / 60).toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-800">
                            +{(att.overtime_minutes / 60).toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 font-sans">
                            {att.distance_m}m ·{' '}
                            {att.flags?.join(' · ') || 'VERIFIED'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 6: FULL-SCREEN SIGNED GATE QR DISPLAY (F2) */}
          {activeView === 'qr' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-5">
              <div className="text-xs font-bold text-slate-500 uppercase">
                60-Second HMAC-Signed Gate Check-In Display
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {data.locations?.[0]?.name || 'Main Site Gate QR'}
              </h1>
              <p className="text-xs text-slate-600">
                Workers scan this QR with their phone at the gate. Token
                automatically rotates every 60 seconds and verifies 200m GPS
                radius.
              </p>

              {/* High-Contrast SVG QR Matrix Representation */}
              <div className="w-56 h-56 mx-auto p-4 rounded-2xl border-2 border-slate-900 bg-white flex flex-col items-center justify-center">
                <QrCode className="w-40 h-40 text-slate-900" />
                <div className="text-[10px] font-mono text-slate-500 mt-1 truncate max-w-full">
                  {data.locationQrTokens?.[0]?.token?.slice(0, 22)}...
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-mono">
                <span>Refreshes in: {qrCountdown}s</span>
                <button
                  type="button"
                  onClick={() => {
                    setQrCountdown(60);
                    fetchAdminBootstrap();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-sans font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rotate Token Now</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 7: PAYROLL ENGINE & PAYSLIPS (F3 - Admin Only) */}
          {activeView === 'payroll' && !isManager && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h1 className="text-xl font-extrabold text-slate-900">
                  Automated Payroll Engine (F3)
                </h1>
                <p className="text-xs text-slate-600">
                  Builds payslips directly from verified attendance records
                  (Regular hours + {data.organization.settings.overtimeMultiplier}
                  x Overtime). Published payslips are locked; any dispute
                  correction publishes a new version (v2) while keeping v1
                  visible.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label
                      htmlFor="pay-period"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Payroll Period Label
                    </label>
                    <input
                      id="pay-period"
                      type="text"
                      value={payrollPeriodLabel}
                      onChange={(e) => setPayrollPeriodLabel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pay-bonus"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Period Safety Bonus (₹)
                    </label>
                    <input
                      id="pay-bonus"
                      type="number"
                      value={payrollBonus}
                      onChange={(e) => setPayrollBonus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRunPayroll}
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs min-h-[40px]"
                    >
                      Run & Publish Payroll
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Period & Version</th>
                      <th className="py-3 px-4 text-right">Reg Hours</th>
                      <th className="py-3 px-4 text-right">2x OT Hours</th>
                      <th className="py-3 px-4 text-right">Gross (₹)</th>
                      <th className="py-3 px-4 text-right">Net Pay (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {data.payslips.map((slip: any) => {
                      const worker = data.people.find(
                        (p: any) => p.id === slip.user_id
                      );
                      return (
                        <tr key={slip.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-sans font-bold text-slate-900">
                            {worker?.full_name || slip.user_id}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            {slip.period_label} · v{slip.version}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {slip.regular_hours}h
                          </td>
                          <td className="py-3 px-4 text-right text-amber-800 font-bold">
                            +{slip.overtime_hours}h
                          </td>
                          <td className="py-3 px-4 text-right">
                            ₹{slip.gross.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            ₹{slip.net.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 8: PEOPLE, CSV IMPORT & PRINTED LOGIN CARDS (F1) */}
          {activeView === 'people' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Add Worker & Generate Login ID Card
                </h2>
                <p className="text-xs text-slate-500">
                  For workers without a personal email, FairShift automatically
                  creates an email-format Login ID (e.g.
                  name.123@sitename.fairshift.app) and a printable card.
                </p>

                <form onSubmit={handleAddPerson} className="space-y-3">
                  <div>
                    <label
                      htmlFor="add-name"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="add-name"
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="e.g. Biju Kuttan"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="add-role"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Role
                      </label>
                      <select
                        id="add-role"
                        value={newPersonRole}
                        onChange={(e) =>
                          setNewPersonRole(e.target.value as any)
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="worker">Worker</option>
                        <option value="manager">Manager / Supervisor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="add-lang"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Preferred Language
                      </label>
                      <select
                        id="add-lang"
                        value={newPersonLang}
                        onChange={(e) =>
                          setNewPersonLang(e.target.value as any)
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="ml">Malayalam (മലയാളം)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="add-wage-type"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Wage Type
                      </label>
                      <select
                        id="add-wage-type"
                        value={newPersonWageType}
                        onChange={(e) =>
                          setNewPersonWageType(e.target.value as any)
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="daily">Daily Wage</option>
                        <option value="monthly">Monthly Salary</option>
                        <option value="hourly">Hourly Rate</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="add-wage-rate"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Rate (₹)
                      </label>
                      <input
                        id="add-wage-rate"
                        type="number"
                        value={newPersonWageRate}
                        onChange={(e) => setNewPersonWageRate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Person & Generate Login Card</span>
                  </button>
                </form>

                {selectedCardPerson && (
                  <div className="p-4 rounded-xl border-2 border-dashed border-slate-900 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>PRINTED WORKER LOGIN CARD</span>
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>Name: {selectedCardPerson.full_name}</div>
                    <div className="font-mono">
                      Login ID: <strong>{selectedCardPerson.email}</strong>
                    </div>
                    <div className="font-mono">
                      Temporary Password: <strong>fairshift123</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Login ID / Email</th>
                      <th className="py-3 px-4">Role & Dept</th>
                      <th className="py-3 px-4 text-right">Wage Rate</th>
                      <th className="py-3 px-4 text-right">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPeople.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {p.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {p.email}
                        </td>
                        <td className="py-3 px-4">
                          {p.role.toUpperCase()} · {p.department}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          ₹{p.wage_rate} ({p.wage_type})
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedCardPerson(p)}
                            className="text-slate-900 font-semibold underline"
                          >
                            Print Card
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 9: SKILL MATRIX & VERIFICATION (F9) */}
          {activeView === 'skills' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Verify Worker Skill Badge (F9)
                </h2>
                <form onSubmit={handleVerifySkill} className="space-y-3">
                  <div>
                    <label
                      htmlFor="sk-worker"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Select Worker
                    </label>
                    <select
                      id="sk-worker"
                      value={verifyWorkerId}
                      onChange={(e) => setVerifyWorkerId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {data.people
                        .filter((p: any) => p.role === 'worker')
                        .map((w: any) => (
                          <option key={w.id} value={w.id}>
                            {w.full_name} ({w.job_title})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="sk-name"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Sector Skill Tag
                    </label>
                    <select
                      id="sk-name"
                      value={verifySkillName}
                      onChange={(e) => setVerifySkillName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {data.sectorProfile.skillTags.map((tag: string) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="sk-level"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Proficiency Level
                    </label>
                    <select
                      id="sk-level"
                      value={verifySkillLevel}
                      onChange={(e) =>
                        setVerifySkillLevel(e.target.value as any)
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Skilled">Skilled</option>
                      <option value="Master">Master</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs min-h-[40px]"
                  >
                    Issue Verified Skill Badge
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Organisation Skill Matrix
                </h2>
                <div className="divide-y divide-slate-200 text-xs">
                  {data.skills.map((sk: any) => {
                    const w = data.people.find(
                      (p: any) => p.id === sk.user_id
                    );
                    return (
                      <div
                        key={sk.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {w?.full_name || sk.user_id} — {sk.skill_name}
                          </div>
                          <div className="text-slate-500">
                            Verified by {sk.verified_by_name} on{' '}
                            {sk.verified_at}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">
                          {sk.level.toUpperCase()} ✓
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 10: DISPUTES & GRIEVANCES ESCALATION INBOX (F10 & F12) */}
          {activeView === 'issues' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h1 className="text-xl font-extrabold text-slate-900">
                  Disputes, Pay Corrections & Leave Requests (F10 & F12)
                </h1>
                <div className="space-y-3">
                  {data.issues.map((iss: any) => (
                    <div
                      key={iss.id}
                      className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-slate-500">
                          {iss.type.toUpperCase()} · Raised by {iss.user_name} ·
                          Status: {iss.status.toUpperCase()}
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {iss.title}
                        </div>
                        <div className="text-xs text-slate-600">{iss.notes}</div>
                        {iss.resolution_note && (
                          <div className="text-xs font-semibold text-emerald-700">
                            Resolution: {iss.resolution_note}
                          </div>
                        )}
                      </div>

                      {iss.status !== 'resolved' && (
                        <div className="flex items-center gap-2">
                          {iss.type === 'pay' && (
                            <button
                              type="button"
                              onClick={() => handleResolveIssue(iss.id, 2)}
                              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs min-h-[38px]"
                            >
                              Approve +2h OT & Issue v2 Payslip
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleResolveIssue(iss.id, 0)}
                            className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs min-h-[38px]"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 11: ANNOUNCEMENTS WITH AUDIO (F11) */}
          {activeView === 'notices' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Post Audio Announcement (F11)
                </h2>
                <form onSubmit={handlePostAnnouncement} className="space-y-3">
                  <div>
                    <label
                      htmlFor="ann-title"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Headline
                    </label>
                    <input
                      id="ann-title"
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g. Heatwave Hydration Breaks Starting Tomorrow"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ann-text"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      English Message
                    </label>
                    <textarea
                      id="ann-text"
                      rows={2}
                      value={annText}
                      onChange={(e) => setAnnText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ann-ml"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Malayalam / Regional Translation (Optional)
                    </label>
                    <textarea
                      id="ann-ml"
                      rows={2}
                      value={annMlText}
                      onChange={(e) => setAnnMlText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs min-h-[40px]"
                  >
                    Broadcast Notice with Voice Synthesis
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Published Notices & Read Counts (Counts Only)
                </h2>
                {data.announcements.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-slate-200 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{a.title}</span>
                      <span className="font-mono text-emerald-700">
                        Read / Listened: {a.readCount} workers
                      </span>
                    </div>
                    <p className="text-slate-600">{a.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 12: LABOUR RULES SETTINGS & AUDIT LOG (F14 - Admin Only) */}
          {activeView === 'settings' && !isManager && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Configurable Labour Rules (Section 9)
                </h2>
                <form onSubmit={handleSaveSettings} className="space-y-3">
                  <div>
                    <label
                      htmlFor="set-reg-hours"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Regular Hours Per Day
                    </label>
                    <input
                      id="set-reg-hours"
                      type="number"
                      value={regHoursInput}
                      onChange={(e) => setRegHoursInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="set-ot-mult"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Overtime Pay Multiplier
                    </label>
                    <input
                      id="set-ot-mult"
                      type="number"
                      step="0.5"
                      value={otMultiplierInput}
                      onChange={(e) => setOtMultiplierInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="set-radius"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      QR Geofence Allowed Radius (meters)
                    </label>
                    <input
                      id="set-radius"
                      type="number"
                      value={radiusInput}
                      onChange={(e) => setRadiusInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs min-h-[40px]"
                  >
                    Save Labour Settings
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Immutable Security & Payroll Audit Log (F14)
                </h2>
                <div className="divide-y divide-slate-200 text-xs font-mono">
                  {data.auditLog.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="py-2.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {entry.action}
                        </span>{' '}
                        · {entry.target}
                        <div className="text-[11px] text-slate-500 font-sans">
                          Actor: {entry.actor_name}
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">
                        {entry.timestamp.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
