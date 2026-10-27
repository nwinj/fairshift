import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Wallet,
  AlertTriangle,
  MessageSquareHeart,
  Award,
  FileWarning,
  Bell,
  UserCheck,
  Volume2,
  Mic,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  WifiOff,
  RefreshCw,
  LogOut,
  Smile,
  Meh,
  Frown,
  Printer,
  Share2,
  Lock,
  Sparkles,
  Globe,
  Sun,
  Type,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { LanguageCode, LANGUAGES, t, speakTextAloud } from '../lib/i18n';
import { PWAInstallButton } from '../hooks/usePWAInstall';

export type WorkerTab =
  | 'home'
  | 'shifts'
  | 'payslips'
  | 'report'
  | 'feedback'
  | 'skills'
  | 'issues'
  | 'notices'
  | 'profile';

interface OfflineQueueItem {
  id: string;
  locationId: string;
  locationName: string;
  offlineTimestamp: string;
}

interface WorkerPortalProps {
  user: any;
  activeTab: WorkerTab;
  onChangeTab: (tab: WorkerTab) => void;
  onAttemptAdminUrl: () => void;
  onLogout: () => void;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  largeFont: boolean;
  onToggleLargeFont: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  user,
  activeTab,
  onChangeTab,
  onAttemptAdminUrl,
  onLogout,
  language,
  onChangeLanguage,
  largeFont,
  onToggleLargeFont,
  highContrast,
  onToggleHighContrast,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Offline Queue (F13)
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('fairshift_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Payslip line drilldown & AI explainer
  const [expandedLineId, setExpandedLineId] = useState<string>('line-overtime');
  const [showSimpleExplanation, setShowSimpleExplanation] = useState(false);

  // Hazard report state
  const [hazCategory, setHazCategory] = useState<string>('');
  const [hazLocationId, setHazLocationId] = useState<string>('');
  const [hazSeverity, setHazSeverity] = useState<'danger' | 'medium' | 'low'>(
    'danger'
  );
  const [hazDescription, setHazDescription] = useState<string>('');
  const [hazAnonymous, setHazAnonymous] = useState<boolean>(false);
  const [hazPhotoAttached, setHazPhotoAttached] = useState<boolean>(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);

  // Anonymous feedback state
  const [pulseAnswers, setPulseAnswers] = useState<Record<string, number>>({});
  const [pulseComment, setPulseComment] = useState<string>('');

  // Issue / Dispute modal or form state
  const [issueType, setIssueType] = useState<'pay' | 'attendance' | 'grievance'>(
    'pay'
  );
  const [issueTitle, setIssueTitle] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueRefId, setIssueRefId] = useState('');

  // Leave request state
  const [leaveType, setLeaveType] = useState<'leave' | 'shift_swap'>('leave');
  const [leaveDate, setLeaveDate] = useState('2026-10-28');
  const [leaveReason, setLeaveReason] = useState('');

  const fetchBootstrap = async () => {
    try {
      const res = await fetch('/api/worker/bootstrap', {
        headers: { Authorization: `Bearer ${user.id}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!hazCategory && json.sectorProfile?.hazardCategories?.[0]) {
          setHazCategory(json.sectorProfile.hazardCategories[0].id);
        }
        if (!hazLocationId && json.locations?.[0]) {
          setHazLocationId(json.locations[0].id);
        }
        if (
          Object.keys(pulseAnswers).length === 0 &&
          json.sectorProfile?.feedbackTopics
        ) {
          const initial: Record<string, number> = {};
          for (const topic of json.sectorProfile.feedbackTopics) {
            initial[topic.id] = 4;
          }
          setPulseAnswers(initial);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, [user.id]);

  const saveOfflineQueue = (items: OfflineQueueItem[]) => {
    setOfflineQueue(items);
    try {
      localStorage.setItem('fairshift_offline_queue', JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  };

  const handleReadCurrentScreen = () => {
    if (!data) return;
    let textToSpeak = `${t(language, 'appName')}. ${user.full_name}. `;
    if (activeTab === 'home') {
      textToSpeak += `${t(language, 'checkInTile')}, ${t(
        language,
        'myPayTile'
      )}, ${t(language, 'reportProblemTile')}, ${t(
        language,
        'giveFeedbackTile'
      )}. `;
      if (data.fatigueEval?.isFlagged) {
        textToSpeak += `${t(language, 'fatigueAlertTitle')}: ${
          data.fatigueEval.reasons[0]
        }`;
      }
    } else if (activeTab === 'payslips' && data.myPayslips?.[0]) {
      const slip = data.myPayslips[0];
      textToSpeak += `${t(language, 'netPayLabel')}: ₹${slip.net}. ${t(
        language,
        'regularHours'
      )}: ${slip.regular_hours} hours. ${t(language, 'overtimeHours')}: ${
        slip.overtime_hours
      } hours. ${t(language, 'deductionsLabel')}: ₹${slip.deductions}.`;
    } else if (activeTab === 'report') {
      textToSpeak += `${t(language, 'reportProblemTile')}. Choose a category icon, danger level, and record your voice.`;
    } else {
      textToSpeak += `${t(language, 'tagline')}`;
    }

    const res = speakTextAloud(
      textToSpeak,
      language,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
    setBannerMsg(res.message);
  };

  const handleVoiceMicInput = (target: 'hazard' | 'feedback' | 'issue') => {
    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice(false);
      const sampleByLang: Record<LanguageCode, string> = {
        ml: 'ടവർ ബി മൂന്നാം നിലയിലെ സ്കാഫോൾഡിങ് ക്ലാമ്പ് അയഞ്ഞിരിക്കുന്നു, ഉടൻ പരിശോധിക്കണം (Loose scaffolding clamp on Tower B 3rd floor, needs immediate check).',
        hi: 'टावर बी तीसरी मंजिल पर मचान का क्लैंप ढीला है, तुरंत जांच करें (Loose scaffolding clamp on Tower B 3rd floor).',
        ta: 'டவர் பி 3வது தளத்தில் சாரக்கட்டு கிளாம்ப் தளர்வாக உள்ளது, உடனே சரிபார்க்கவும்.',
        en: 'Loose guardrail and wet planks near Block B 3rd floor hoist bay. Please inspect urgently.',
      };
      const text = sampleByLang[language] || sampleByLang.en;
      if (target === 'hazard') {
        setHazDescription(text);
      } else if (target === 'feedback') {
        setPulseComment(
          'Drinking water station on 2nd floor needs afternoon refill during hot weather.'
        );
      } else {
        setIssueNotes(
          'Worked 2 extra overtime hours on 24 Oct evening shift; please check gate QR log.'
        );
      }
      setBannerMsg('Voice note captured and transcribed in ' + language.toUpperCase());
    }, 900);
  };

  const handleQrCheckIn = async () => {
    if (!data) return;
    const loc = data.locations?.[0];
    if (simulateOffline) {
      const item: OfflineQueueItem = {
        id: `off-${Date.now()}`,
        locationId: loc?.id || 'loc-1',
        locationName: loc?.name || 'Site Gate QR',
        offlineTimestamp: new Date().toISOString(),
      };
      saveOfflineQueue([item, ...offlineQueue]);
      setBannerMsg(
        `Offline Check-in Saved on Phone (${new Date(
          item.offlineTimestamp
        ).toLocaleTimeString()}). Will sync when online.`
      );
      return;
    }

    const res = await fetch('/api/worker/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        locationId: loc?.id,
        qrToken: data.activeSiteQrToken?.token,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBannerMsg(json.error || 'Check-in failed');
      return;
    }
    setBannerMsg(
      `Checked in at ${json.locationName} (${json.distanceMeters}m away — GPS & Signed QR Verified).`
    );
    await fetchBootstrap();
  };

  const handleCheckOut = async () => {
    const res = await fetch('/api/worker/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({ simulatedHours: 10 }), // 8h regular + 1.5h OT (after 30m break)
    });
    const json = await res.json();
    if (!res.ok) {
      setBannerMsg(json.error || 'Check-out failed');
      return;
    }
    setBannerMsg(
      `Shift Checked Out: ${json.metrics.regularMinutes / 60}h Regular + ${
        json.metrics.overtimeMinutes / 60
      }h Overtime (2x) recorded!`
    );
    await fetchBootstrap();
  };

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    for (const item of offlineQueue) {
      await fetch('/api/worker/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          locationId: item.locationId,
          offlineTimestamp: item.offlineTimestamp,
        }),
      });
    }
    const count = offlineQueue.length;
    saveOfflineQueue([]);
    setSimulateOffline(false);
    setBannerMsg(
      `Synced ${count} offline check-in(s) to server with original timestamps!`
    );
    await fetchBootstrap();
  };

  const handleMoodSelect = async (mood: 'good' | 'okay' | 'bad') => {
    await fetch('/api/worker/mood', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({ mood }),
    });
    setBannerMsg(`Daily mood check-in saved (${mood.toUpperCase()}). Thank you!`);
    await fetchBootstrap();
  };

  const handleTriggerSos = async () => {
    const res = await fetch('/api/worker/sos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.id}` },
    });
    if (res.ok) {
      const json = await res.json();
      setBannerMsg(
        `EMERGENCY SOS SENT! Tracking Code: ${json.sosHazard.tracking_code}. Site Manager alerted with your GPS location.`
      );
      await fetchBootstrap();
    }
  };

  const handleHazardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hazDescription.trim()) {
      setBannerMsg('Please speak or type a short description of the hazard.');
      return;
    }
    const res = await fetch('/api/worker/hazards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        category: hazCategory,
        locationId: hazLocationId,
        severity: hazSeverity,
        description: hazDescription,
        audioTranscript: hazDescription,
        photoLabel: hazPhotoAttached
          ? 'Worker_Hazard_Site_Photo.jpg'
          : undefined,
        isAnonymous: hazAnonymous,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBannerMsg(json.error || 'Could not send report');
      return;
    }
    setHazDescription('');
    setHazPhotoAttached(false);
    setBannerMsg(
      `Safety Report Sent! Tracking Code: ${json.hazard.tracking_code} (Status: Received)`
    );
    await fetchBootstrap();
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/worker/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        answers: pulseAnswers,
        comment: pulseComment,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBannerMsg(json.error || 'Could not submit feedback');
      return;
    }
    setPulseComment('');
    setBannerMsg(
      'Anonymous weekly pulse saved! Zero user ID or timestamp was stored with your answers.'
    );
    await fetchBootstrap();
  };

  const handleRaiseDisputeFromPayslip = (
    slipId: string,
    lineLabel: string
  ) => {
    setIssueType('pay');
    setIssueRefId(slipId);
    setIssueTitle(`Pay question on: ${lineLabel}`);
    setIssueNotes(
      `Requesting review of ${lineLabel} on payslip ${slipId}. Please verify my gate QR overtime log.`
    );
    onChangeTab('issues');
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim()) {
      setBannerMsg('Please enter a short title for your issue.');
      return;
    }
    const res = await fetch('/api/worker/issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        type: issueType,
        referenceId: issueRefId || undefined,
        title: issueTitle,
        notes: issueNotes,
      }),
    });
    if (res.ok) {
      setIssueTitle('');
      setIssueNotes('');
      setBannerMsg(
        'Issue submitted to supervisor! Auto-escalates to Admin if unresolved in 3 days.'
      );
      await fetchBootstrap();
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      setBannerMsg('Please enter a reason for your leave or shift swap.');
      return;
    }
    const res = await fetch('/api/worker/leaves', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        requestType: leaveType,
        fromDate: leaveDate,
        toDate: leaveDate,
        reason: leaveReason,
      }),
    });
    if (res.ok) {
      setLeaveReason('');
      setBannerMsg('Leave / shift-swap request sent to your supervisor.');
      await fetchBootstrap();
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-slate-600">
          Loading Worker Workspace...
        </div>
      </div>
    );
  }

  const openShift = data.myAttendance?.find((a: any) => a.check_out === null);
  const latestPayslip = data.myPayslips?.[0];
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMood = data.myMoods?.find((m: any) => m.date === todayIso)?.mood;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-8">
      {/* Top App Bar (sticky only on desktop so mobile has only the 56px bottom bar fixed, <7% of viewport) */}
      <header className="md:sticky md:top-0 z-30 h-14 bg-slate-900 text-white px-4 flex items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onChangeTab('home')}
            className="text-base font-extrabold tracking-tight text-amber-400 whitespace-nowrap shrink-0 font-display"
          >
            FairShift
          </button>
          <span className="text-xs text-slate-300 truncate">
            {user.full_name} · {data.organization.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReadCurrentScreen}
            aria-label={t(language, 'listenScreen')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[38px] whitespace-nowrap shrink-0 ${
              isSpeaking
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{t(language, 'listenScreen')}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label={t(language, 'logout')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 min-h-[38px] whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(language, 'logout')}</span>
          </button>
        </div>
      </header>

      {/* Secondary Language & Accessibility Bar (Scrolls with page, not sticky) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 hc-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Globe className="w-4 h-4 text-slate-500" />
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onChangeLanguage(l.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap ${
                  language === l.code
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {l.nativeName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onToggleLargeFont}
              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[36px] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Type className="w-3.5 h-3.5" />
              <span>{largeFont ? 'A+ ON' : 'A+ Text'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleHighContrast}
              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[36px] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{highContrast ? 'Contrast ON' : 'Contrast'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulateOffline(!simulateOffline)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold min-h-[36px] inline-flex items-center gap-1 whitespace-nowrap ${
                simulateOffline
                  ? 'bg-amber-500 text-slate-950'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>
                {simulateOffline ? 'Offline Queue: ACTIVE' : 'Simulate Offline'}
              </span>
            </button>

            <PWAInstallButton compact />
          </div>
        </div>
      </div>

      {/* Desktop Horizontal Sub-Navigation */}
      <nav
        aria-label="Worker Sections"
        className="hidden md:block bg-white border-b border-slate-200 px-4 py-2"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'home', label: t(language, 'workerHome'), icon: UserCheck },
              { id: 'shifts', label: t(language, 'checkInTile'), icon: QrCode },
              { id: 'payslips', label: t(language, 'myPayTile'), icon: Wallet },
              {
                id: 'report',
                label: t(language, 'reportProblemTile'),
                icon: AlertTriangle,
              },
              {
                id: 'feedback',
                label: t(language, 'giveFeedbackTile'),
                icon: MessageSquareHeart,
              },
              {
                id: 'skills',
                label: t(language, 'skillPassportTile'),
                icon: Award,
              },
              {
                id: 'issues',
                label: t(language, 'issuesTile'),
                icon: FileWarning,
              },
              { id: 'notices', label: t(language, 'noticesTile'), icon: Bell },
              {
                id: 'profile',
                label: t(language, 'profileTile'),
                icon: Lock,
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Live Action / Voice Feedback Banner */}
      {bannerMsg && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-4">
          <div
            role="status"
            className="p-3.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-semibold flex items-center justify-between gap-3"
          >
            <span>{bannerMsg}</span>
            <button
              type="button"
              onClick={() => setBannerMsg('')}
              className="text-slate-400 hover:text-white underline whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Offline Queue Sync Bar (F13) */}
      {offlineQueue.length > 0 && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-3">
          <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-slate-900 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold">
              {offlineQueue.length} offline check-in(s) saved on phone with
              original timestamp.
            </div>
            <button
              type="button"
              onClick={handleSyncOfflineQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t(language, 'syncNow')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Worker Viewport */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1 space-y-6">
        {/* TAB 1: WORKER HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Primary 4 Large Icon-and-Voice Tiles */}
            <section aria-label="Primary Worker Actions">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => onChangeTab('shifts')}
                  className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-6 text-left transition-colors flex flex-col justify-between min-h-[148px] hc-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-extrabold text-slate-900">
                      {t(language, 'checkInTile')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {openShift
                        ? t(language, 'onShiftNow')
                        : 'Gate QR + 2x Overtime Counter'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTab('payslips')}
                  className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-6 text-left transition-colors flex flex-col justify-between min-h-[148px] hc-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-extrabold text-slate-900">
                      {t(language, 'myPayTile')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      {latestPayslip
                        ? `Latest Net: ₹${latestPayslip.net.toLocaleString('en-IN')}`
                        : 'View & Listen to Payslip'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTab('report')}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-2xl p-6 text-left transition-colors flex flex-col justify-between min-h-[148px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-extrabold">
                      {t(language, 'reportProblemTile')}
                    </div>
                    <div className="text-xs text-red-100 mt-1">
                      Speak, photo or anonymous report
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTab('feedback')}
                  className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-6 text-left transition-colors flex flex-col justify-between min-h-[148px] hc-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <MessageSquareHeart className="w-6 h-6" />
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-extrabold text-slate-900">
                      {t(language, 'giveFeedbackTile')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      100% Untraceable Weekly Pulse
                    </div>
                  </div>
                </button>
              </div>
            </section>

            {/* Fatigue Alert + Daily Mood Check-in Row (F6) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {data.fatigueEval?.isFlagged && (
                <div className="lg:col-span-7 bg-amber-50 rounded-2xl border border-amber-300 p-6 space-y-3 hc-border">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-800 shrink-0" />
                      <h2 className="text-base font-extrabold text-slate-900">
                        {t(language, 'fatigueAlertTitle')}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakTextAloud(
                          `You have worked ${data.fatigueEval.consecutiveDaysWorked} days in a row. Please rest.`,
                          language
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-xs font-bold text-slate-900 min-h-[38px]"
                    >
                      Listen
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    You have worked {data.fatigueEval.consecutiveDaysWorked} days
                    in a row ({data.fatigueEval.weeklyHours} hrs this week).
                    Please rest.
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                    {data.fatigueEval.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* One-Tap Daily Mood Check-in with Three Faces */}
              <div
                className={`${
                  data.fatigueEval?.isFlagged
                    ? 'lg:col-span-5'
                    : 'lg:col-span-12'
                } bg-white rounded-2xl border border-slate-200 p-6 hc-border flex flex-col justify-between`}
              >
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {t(language, 'dailyMoodTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Private wellbeing check-in (never shown to coworkers)
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: 'good',
                        label: t(language, 'moodGood'),
                        icon: Smile,
                        activeCls: 'bg-emerald-600 text-white border-emerald-600',
                      },
                      {
                        key: 'okay',
                        label: t(language, 'moodOkay'),
                        icon: Meh,
                        activeCls: 'bg-amber-500 text-slate-950 border-amber-500',
                      },
                      {
                        key: 'bad',
                        label: t(language, 'moodBad'),
                        icon: Frown,
                        activeCls: 'bg-red-600 text-white border-red-600',
                      },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    const isSelected = todayMood === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => handleMoodSelect(m.key)}
                        className={`p-3 rounded-xl border text-center transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[76px] ${
                          isSelected
                            ? m.activeCls
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Secondary Feature Row: Skill Passport, Issues, Notices, Privacy, SOS & Role Block Test */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => onChangeTab('skills')}
                className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left flex items-center justify-between min-h-[72px] hc-border"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {t(language, 'skillPassportTile')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.mySkills?.length || 0} Verified Badges
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('issues')}
                className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left flex items-center justify-between min-h-[72px] hc-border"
              >
                <div className="flex items-center gap-3">
                  <FileWarning className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {t(language, 'issuesTile')}
                    </div>
                    <div className="text-xs text-slate-500">
                      Pay disputes & leave requests
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('notices')}
                className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left flex items-center justify-between min-h-[72px] hc-border"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {t(language, 'noticesTile')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.announcements?.length || 0} Audio Notices
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('profile')}
                className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left flex items-center justify-between min-h-[72px] hc-border"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {t(language, 'profileTile')}
                    </div>
                    <div className="text-xs text-slate-500">
                      Privacy Centre & ID Card
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </section>

            {/* Emergency SOS + Judge Role-Block Verification Bar */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 hc-border">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTriggerSos}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs min-h-[48px] whitespace-nowrap"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t(language, 'sosButton')}</span>
                </button>
                <span className="text-xs text-slate-500">
                  Sends immediate location alert to supervisor
                </span>
              </div>

              <button
                type="button"
                onClick={onAttemptAdminUrl}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-800 min-h-[44px] whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Test Role Security: Try Opening /admin URL</span>
              </button>
            </section>
          </div>
        )}

        {/* TAB 2: SHIFTS & AUTOMATIC OVERTIME (F2) */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Check In / Out Card */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 hc-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      {data.sectorProfile.title} · Gate QR & Geofence
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {openShift
                        ? t(language, 'onShiftNow')
                        : t(language, 'notCheckedIn')}
                    </h1>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-600">
                    <div>Regular: {data.organization.settings.regularHoursPerDay}h/day</div>
                    <div>Overtime: {data.organization.settings.overtimeMultiplier}x Rate</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Location: {data.locations?.[0]?.name || 'Site Gate 1'}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Allowed Radius: {data.locations?.[0]?.radius_m || 200}m ·
                    Signed QR refreshes every 60s
                  </div>
                </div>

                {!openShift ? (
                  <button
                    type="button"
                    onClick={handleQrCheckIn}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2.5 transition-colors min-h-[56px]"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{t(language, 'scanQrCheckIn')}</span>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-100">
                        <div className="text-xs text-slate-500">
                          {t(language, 'regularHours')}
                        </div>
                        <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
                          8.0 hrs
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="text-xs text-amber-900 font-semibold">
                          {t(language, 'overtimeHours')}
                        </div>
                        <div className="text-xl font-extrabold text-amber-900 font-mono tabular-nums mt-0.5">
                          +1.5 hrs (2x)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckOut}
                      className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base flex items-center justify-center gap-2.5 transition-colors min-h-[56px]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                      <span>{t(language, 'checkOutNow')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Weekly Hours & Overtime Summary Card */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hc-border">
                <h2 className="text-lg font-bold text-slate-900">
                  Attendance & Automatic Overtime Log
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Shifts Logged</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                      {data.myAttendance.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Regular Hours</div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                      {(
                        data.myAttendance.reduce(
                          (s: number, a: any) => s + a.regular_minutes,
                          0
                        ) / 60
                      ).toFixed(1)}
                      h
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-xs text-amber-900 font-semibold">
                      2x Overtime
                    </div>
                    <div className="text-xl font-extrabold text-amber-900 font-mono tabular-nums mt-1">
                      +
                      {(
                        data.myAttendance.reduce(
                          (s: number, a: any) => s + a.overtime_minutes,
                          0
                        ) / 60
                      ).toFixed(1)}
                      h
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {data.myAttendance.map((att: any) => (
                    <div
                      key={att.id}
                      className="py-3 flex items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          {att.date}
                        </div>
                        <div className="text-slate-500">
                          Check-in: {att.check_in.slice(11, 16)} UTC · GPS:{' '}
                          {att.distance_m}m
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          Reg: {(att.regular_minutes / 60).toFixed(1)}h · OT:{' '}
                          {(att.overtime_minutes / 60).toFixed(1)}h
                        </div>
                        <div className="text-slate-500">
                          {att.flags?.length ? att.flags.join(' · ') : 'ON TIME'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLEAR PAYSLIPS IN WORKER'S LANGUAGE WITH AUDIO (F3 & F17) */}
        {activeTab === 'payslips' && (
          <div className="space-y-6">
            {latestPayslip ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 hc-border">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      <span>Period: {latestPayslip.period_label}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Version v{latestPayslip.version} (Locked)</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mt-2">
                      {t(language, 'netPayLabel')}
                    </div>
                    <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight mt-1">
                      ₹{latestPayslip.net.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReadCurrentScreen}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs min-h-[44px] whitespace-nowrap"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{t(language, 'listenScreen')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowSimpleExplanation(!showSimpleExplanation)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs min-h-[44px] whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Simple Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs min-h-[44px] whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Plain Words Summary Box (F17) */}
                {showSimpleExplanation && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-900">
                      Simple Summary ({language.toUpperCase()}):
                    </div>
                    <p>
                      You worked{' '}
                      <strong>{latestPayslip.regular_hours} regular hours</strong>{' '}
                      plus{' '}
                      <strong>
                        {latestPayslip.overtime_hours} extra overtime hours
                      </strong>{' '}
                      paid at double rate (2x). Your total earnings before
                      deductions were{' '}
                      <strong>
                        ₹{latestPayslip.gross.toLocaleString('en-IN')}
                      </strong>
                      , minus{' '}
                      <strong>
                        ₹{latestPayslip.deductions.toLocaleString('en-IN')}
                      </strong>{' '}
                      in advances/welfare, giving you{' '}
                      <strong>₹{latestPayslip.net.toLocaleString('en-IN')}</strong>{' '}
                      in hand.
                    </p>
                  </div>
                )}

                {/* Visual Proportional Bar (Base, Overtime, Bonus, Deductions) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>
                      Gross Earnings: ₹
                      {latestPayslip.gross.toLocaleString('en-IN')}
                    </span>
                    <span>
                      Deductions: -₹
                      {latestPayslip.deductions.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100">
                    <div
                      style={{ width: '62%' }}
                      className="bg-slate-900"
                      title="Base Pay"
                    />
                    <div
                      style={{ width: '28%' }}
                      className="bg-amber-500"
                      title="2x Overtime Pay"
                    />
                    <div
                      style={{ width: '10%' }}
                      className="bg-emerald-500"
                      title="Bonus"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span>■ Base Pay ({latestPayslip.regular_hours}h)</span>
                    <span>
                      ■ 2x Overtime ({latestPayslip.overtime_hours}h)
                    </span>
                    <span>■ Bonus & Welfare</span>
                  </div>
                </div>

                {/* Interactive Payslip Lines — Tap a line to see exact days & hours */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    Tap any line below to inspect the exact days and hours behind
                    it:
                  </div>

                  {latestPayslip.lines.map((line: any) => {
                    const isExpanded = expandedLineId === line.id;
                    const isDeduction = line.category === 'deduction';
                    return (
                      <div
                        key={line.id}
                        className="rounded-xl border border-slate-200 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLineId(isExpanded ? '' : line.id)
                          }
                          className="w-full p-4 bg-white hover:bg-slate-50 flex items-center justify-between gap-4 text-left min-h-[60px]"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {line.label}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {line.explanation}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div
                              className={`text-base font-extrabold ${
                                isDeduction
                                  ? 'text-red-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {isDeduction ? '-' : '+'}₹
                              {line.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-slate-500 underline">
                              {isExpanded ? 'Hide days ▲' : 'Show days ▼'}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 space-y-2">
                            <div className="divide-y divide-slate-200/70">
                              {line.details?.map((d: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="py-2 flex items-center justify-between text-xs font-mono tabular-nums"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">
                                      {d.date}
                                    </span>{' '}
                                    · {d.note}
                                  </div>
                                  <div className="text-slate-800 font-semibold">
                                    {d.hours > 0
                                      ? `${d.hours}h × ₹${d.rate} = `
                                      : ''}
                                    ₹{d.amount}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRaiseDisputeFromPayslip(
                                    latestPayslip.id,
                                    line.label
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs min-h-[40px]"
                              >
                                <FileWarning className="w-3.5 h-3.5" />
                                <span>{t(language, 'somethingWrong')}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
                No published payslips yet for this period.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAFETY REPORTING BY VOICE, TEXT OR PHOTO + STATUS TIMELINE (F4) */}
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Report Form */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 hc-border">
              <h1 className="text-xl font-extrabold text-slate-900">
                {t(language, 'reportProblemTile')}
              </h1>

              <form onSubmit={handleHazardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    1. Choose Hazard Category ({data.sectorProfile.title})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.sectorProfile.hazardCategories.map((cat: any) => {
                      const active = hazCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setHazCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition-colors min-h-[54px] ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <div className="text-xs font-bold">{cat.label}</div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              active ? 'text-amber-300' : 'text-slate-500'
                            }`}
                          >
                            {cat.mlLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="haz-location"
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                  >
                    2. Choose Work Location
                  </label>
                  <select
                    id="haz-location"
                    value={hazLocationId}
                    onChange={(e) => setHazLocationId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white min-h-[48px]"
                  >
                    {data.locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    3. Danger Level (Response Target)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        {
                          key: 'danger',
                          label: 'High Danger (24h)',
                          cls: 'bg-red-600 text-white border-red-600',
                        },
                        {
                          key: 'medium',
                          label: 'Medium (72h)',
                          cls: 'bg-amber-500 text-slate-950 border-amber-500',
                        },
                        {
                          key: 'low',
                          label: 'Low Risk (7d)',
                          cls: 'bg-slate-800 text-white border-slate-800',
                        },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setHazSeverity(s.key)}
                        className={`p-3 rounded-xl border text-xs font-bold min-h-[48px] ${
                          hazSeverity === s.key
                            ? s.cls
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="haz-desc"
                      className="text-xs font-bold text-slate-800"
                    >
                      4. Speak or Type Description
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVoiceMicInput('hazard')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold min-h-[38px]"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>
                          {isRecordingVoice
                            ? 'Listening...'
                            : t(language, 'speakInput')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHazPhotoAttached(!hazPhotoAttached)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold min-h-[38px] ${
                          hazPhotoAttached
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-300 text-slate-700'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{hazPhotoAttached ? 'Photo Added' : 'Photo'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="haz-desc"
                    rows={3}
                    value={hazDescription}
                    onChange={(e) => setHazDescription(e.target.value)}
                    placeholder="Tap 'Speak with Mic' or describe the hazard here..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hazAnonymous}
                    onChange={(e) => setHazAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>{t(language, 'anonymousToggle')}</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm min-h-[52px]"
                >
                  {t(language, 'reportHazardBtn')}
                </button>
              </form>
            </div>

            {/* Live Hazard Status Timelines (Received -> Seen -> In progress -> Fixed) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hc-border">
              <h2 className="text-lg font-bold text-slate-900">
                Hazard Status Timeline (Received → Seen → In Progress → Fixed)
              </h2>

              <div className="space-y-4">
                {data.myHazards.map((h: any) => {
                  const steps = ['received', 'seen', 'in_progress', 'fixed'];
                  const currentIdx = steps.indexOf(h.status);
                  return (
                    <div
                      key={h.id}
                      className="p-4 rounded-xl border border-slate-200 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {h.category_label}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Code: {h.tracking_code} · {h.location_name}
                          </div>
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-900 font-mono">
                          {h.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700">{h.description}</p>

                      {/* 4-Step Visual Progress Bar */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[
                          { key: 'received', label: '1. Received' },
                          { key: 'seen', label: '2. Seen' },
                          { key: 'in_progress', label: '3. In Progress' },
                          { key: 'fixed', label: '4. Fixed' },
                        ].map((st, idx) => {
                          const done = idx <= currentIdx;
                          return (
                            <div key={st.key} className="space-y-1">
                              <div
                                className={`h-2 rounded-full ${
                                  done ? 'bg-emerald-600' : 'bg-slate-200'
                                }`}
                              />
                              <div
                                className={`text-[11px] font-semibold ${
                                  done ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {st.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {h.updates?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                          {h.updates.map((u: any) => (
                            <div key={u.id}>
                              <strong>{u.updated_by_name}:</strong> {u.note}
                              {u.photo_label ? ` [${u.photo_label}]` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ANONYMOUS FEEDBACK (F5) */}
        {activeTab === 'feedback' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 hc-border">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {t(language, 'giveFeedbackTile')}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {t(language, 'privacyPromise')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">
                Database-Enforced Privacy Guarantee:
              </div>
              <div>
                Your answers go into <code className="font-mono">feedback_responses</code>{' '}
                with <strong>no user_id</strong> and <strong>no timestamp</strong>.
                Team averages appear to management only when 5 or more workers
                respond.
              </div>
            </div>

            {data.hasSubmittedFeedbackThisWeek ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-base font-bold text-slate-900">
                  Weekly Pulse Submitted for {data.currentWeek}
                </div>
                <p className="text-xs text-slate-600">
                  Your submission marker is recorded so no one can vote twice,
                  while your answers remain completely untraceable.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                {data.sectorProfile.feedbackTopics.map((topic: any) => {
                  const val = pulseAnswers[topic.id] || 4;
                  return (
                    <div
                      key={topic.id}
                      className="p-4 rounded-xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {topic.label}
                        </span>
                        <span className="text-slate-500">{topic.mlLabel}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { score: 1, label: '1 · Poor' },
                          { score: 2, label: '2 · Fair' },
                          { score: 3, label: '3 · Okay' },
                          { score: 4, label: '4 · Good' },
                          { score: 5, label: '5 · Great' },
                        ].map((opt) => (
                          <button
                            key={opt.score}
                            type="button"
                            onClick={() =>
                              setPulseAnswers({
                                ...pulseAnswers,
                                [topic.id]: opt.score,
                              })
                            }
                            className={`py-2.5 px-2 rounded-lg border text-xs font-bold min-h-[44px] ${
                              val === opt.score
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="pulse-comment"
                      className="text-xs font-bold text-slate-800"
                    >
                      Optional Anonymous Voice or Text Comment
                    </label>
                    <button
                      type="button"
                      onClick={() => handleVoiceMicInput('feedback')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold min-h-[36px]"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{t(language, 'speakInput')}</span>
                    </button>
                  </div>
                  <textarea
                    id="pulse-comment"
                    rows={2}
                    value={pulseComment}
                    onChange={(e) => setPulseComment(e.target.value)}
                    placeholder="Shown in random order without timestamps..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm min-h-[52px]"
                >
                  Submit Anonymous Weekly Pulse
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 6: SKILL PASSPORT & TRAINING (F9 & F15) */}
        {activeTab === 'skills' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 hc-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {t(language, 'skillPassportTile')}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.full_name} · {user.job_title} ·{' '}
                    {user.years_experience} Years Experience
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/worker/skills/toggle-share', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${user.id}` },
                    });
                    await fetchBootstrap();
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold min-h-[42px] ${
                    data.user.passport_share_enabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {data.user.passport_share_enabled
                      ? 'Public Share QR: ON'
                      : 'Public Share QR: OFF'}
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  Verified Skills & Certifications:
                </div>
                {data.mySkills.map((sk: any) => (
                  <div
                    key={sk.id}
                    className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {sk.skill_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Level: {sk.level} · Verified by {sk.verified_by_name}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      ✓ VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hc-border">
              <h2 className="text-lg font-bold text-slate-900">
                Safety Trainings & Toolbox Talks (F15)
              </h2>
              <div className="space-y-3">
                {data.myTrainings.map((tr: any) => (
                  <div
                    key={tr.id}
                    className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {tr.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        Completed: {tr.date} · Instructor: {tr.verified_by_name}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      Acknowledged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DISPUTES & LEAVE / SHIFT SWAP (F10 & F12) */}
        {activeTab === 'issues' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 hc-border">
              <h1 className="text-xl font-extrabold text-slate-900">
                Raise Pay Dispute, Attendance Correction or Grievance
              </h1>
              <form onSubmit={handleIssueSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="iss-type"
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                  >
                    Issue Category
                  </label>
                  <select
                    id="iss-type"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white min-h-[48px]"
                  >
                    <option value="pay">Pay / Overtime Dispute</option>
                    <option value="attendance">Attendance Correction</option>
                    <option value="grievance">Workplace Grievance</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="iss-title"
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                  >
                    Short Summary
                  </label>
                  <input
                    id="iss-title"
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="e.g. Overtime hours on 24 Oct missing"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm min-h-[48px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="iss-notes"
                      className="text-xs font-bold text-slate-800"
                    >
                      Details (Speak or Type)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleVoiceMicInput('issue')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold min-h-[34px]"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{t(language, 'speakInput')}</span>
                    </button>
                  </div>
                  <textarea
                    id="iss-notes"
                    rows={2}
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs min-h-[48px]"
                >
                  Submit Issue (Auto-Escalates After 3 Days)
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="text-xs font-bold text-slate-700">
                  My Issues & Disputes:
                </div>
                {data.myIssues.map((iss: any) => (
                  <div
                    key={iss.id}
                    className="p-3.5 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{iss.title}</span>
                      <span className="uppercase font-mono">{iss.status}</span>
                    </div>
                    <div className="text-slate-600">{iss.notes}</div>
                    {iss.resolution_note && (
                      <div className="text-emerald-700 font-semibold">
                        Resolution: {iss.resolution_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave & Shift-Swap Requests (F12) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 hc-border">
              <h2 className="text-xl font-extrabold text-slate-900">
                Leave & Shift-Swap Requests (F12)
              </h2>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="lv-type"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Request Type
                    </label>
                    <select
                      id="lv-type"
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                      className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white min-h-[48px]"
                    >
                      <option value="leave">Rest / Leave Day</option>
                      <option value="shift_swap">Shift Swap</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="lv-date"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Date
                    </label>
                    <input
                      id="lv-date"
                      type="date"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-mono min-h-[48px]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lv-reason"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Reason
                  </label>
                  <input
                    id="lv-reason"
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="e.g. Rest day after 7-day shift streak"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm min-h-[48px]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs min-h-[48px]"
                >
                  Send Request to Supervisor
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                {data.myLeaves.map((lv: any) => (
                  <div
                    key={lv.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {lv.request_type.toUpperCase()} · {lv.from_date}
                      </div>
                      <div className="text-slate-500">{lv.reason}</div>
                    </div>
                    <span className="font-mono font-bold uppercase">
                      {lv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ANNOUNCEMENTS WITH AUDIO (F11) */}
        {activeTab === 'notices' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-xl font-extrabold text-slate-900">
              {t(language, 'noticesTile')}
            </h1>
            {data.announcements.map((ann: any) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 hc-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      {ann.audience} · {ann.created_at.slice(0, 10)}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {ann.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      speakTextAloud(
                        language === 'ml' && ann.ml_text
                          ? ann.ml_text
                          : ann.text,
                        language
                      );
                      await fetch(`/api/worker/announcements/${ann.id}/read`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${user.id}` },
                      });
                      await fetchBootstrap();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs min-h-[42px] shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Listen</span>
                  </button>
                </div>
                <p className="text-sm text-slate-700">{ann.text}</p>
                {ann.ml_text && (
                  <p className="text-sm text-slate-800 font-medium">
                    {ann.ml_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 9: PRIVACY CENTRE & WORKER DATA TRANSPARENCY (F14) */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 hc-border">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Worker Privacy Centre & My Data Record (F14)
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Transparency on exactly what FairShift stores and what is never
                collected.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">
                  Your Account & Wage Record
                </div>
                <div>Full Name: {user.full_name}</div>
                <div>Login ID: {user.email}</div>
                <div>Department: {user.department}</div>
                <div>
                  Wage Rate: ₹{user.wage_rate} ({user.wage_type})
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <div className="font-bold text-slate-900">
                  Strict Privacy Protections
                </div>
                <div>• GPS checked only at gate check-in, never tracked continuously</div>
                <div>• Anonymous feedback holds zero user_id or timestamps</div>
                <div>• Mood check-ins are never visible to coworkers</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (56px height = 6.6% of 844px mobile viewport) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: UserCheck },
            { id: 'shifts', label: 'Shifts', icon: QrCode },
            { id: 'payslips', label: 'Pay', icon: Wallet },
            { id: 'report', label: 'Safety', icon: AlertTriangle },
            { id: 'feedback', label: 'Pulse', icon: MessageSquareHeart },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`h-full flex flex-col items-center justify-center min-h-[48px] ${
                active ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
