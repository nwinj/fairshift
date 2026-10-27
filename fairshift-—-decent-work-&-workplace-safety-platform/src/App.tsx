import React, { useEffect, useState } from 'react';
import {
  PublicViews,
  NotAllowedView,
  DemoAccountSummary,
} from './components/PublicViews';
import { WorkerPortal, WorkerTab } from './components/WorkerPortal';
import { AdminPortal, AdminView } from './components/AdminPortal';
import { LanguageCode } from './lib/i18n';
import { canAccessRoute } from './lib/rules';

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [largeFont, setLargeFont] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountSummary[]>([]);

  const [session, setSession] = useState<{
    user: any;
    organization: any;
    sectorProfile: any;
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem('fairshift_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const navigate = (to: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', to);
    }
    setPathname(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (largeFont) {
      root.classList.add('large-font');
    } else {
      root.classList.remove('large-font');
    }
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [largeFont, highContrast]);

  useEffect(() => {
    fetch('/api/public/info')
      .then((r) => r.json())
      .then((data) => {
        if (data.demoAccounts) {
          setDemoAccounts(data.demoAccounts);
        }
      })
      .catch(() => {
        // ignore initial fetch error
      });
  }, []);

  const saveSession = (
    next: { user: any; organization: any; sectorProfile: any } | null
  ) => {
    setSession(next);
    try {
      if (next) {
        sessionStorage.setItem('fairshift_session', JSON.stringify(next));
      } else {
        sessionStorage.removeItem('fairshift_session');
      }
    } catch {
      // ignore storage error
    }
  };

  const handleLoginSuccess = (payload: {
    user: any;
    organization: any;
    sectorProfile: any;
  }) => {
    saveSession(payload);
    if (payload.user.language) {
      setLanguage(payload.user.language);
    }
    if (payload.user.role === 'worker') {
      navigate('/worker');
    } else {
      navigate('/admin');
    }
  };

  const handleLogout = () => {
    saveSession(null);
    navigate('/');
  };

  const handleAttemptAdminUrlFromWorker = async () => {
    if (session?.user) {
      await fetch('/api/auth/record-role-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.id}`,
        },
        body: JSON.stringify({ attemptedPath: '/admin' }),
      }).catch(() => {});
    }
    navigate('/admin');
  };

  // Forced password change modal for invited workers with temporary password
  if (session?.user?.must_change_password) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <h1 className="text-xl font-extrabold text-slate-900">
            Change Your Temporary Password
          </h1>
          <p className="text-xs text-slate-600">
            Welcome, <strong>{session.user.full_name}</strong>. Because this is
            your first login with a printed temporary password card, please set
            a personal password.
          </p>
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 text-xs font-semibold text-red-700">
              {passwordError}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPasswordInput.trim().length < 6) {
                setPasswordError('Password must be at least 6 characters.');
                return;
              }
              const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.user.id}`,
                },
                body: JSON.stringify({ newPassword: newPasswordInput }),
              });
              if (res.ok) {
                saveSession({
                  ...session,
                  user: { ...session.user, must_change_password: false },
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="new-pw-input"
                className="block text-xs font-bold text-slate-800 mb-1"
              >
                New Personal Password
              </label>
              <input
                id="new-pw-input"
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm min-h-[48px]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm min-h-[48px]"
            >
              Save Password & Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Route Guard Check when logged in
  if (session?.user) {
    const access = canAccessRoute(session.user.role, pathname);
    if (!access.allowed) {
      return (
        <NotAllowedView
          language={language}
          userRole={session.user.role}
          attemptedPath={pathname}
          onReturnHome={() =>
            navigate(session.user.role === 'worker' ? '/worker' : '/admin')
          }
        />
      );
    }

    if (pathname.startsWith('/worker')) {
      const sub = pathname.replace('/worker', '').replace(/^\//, '');
      const validTabs: WorkerTab[] = [
        'home',
        'shifts',
        'payslips',
        'report',
        'feedback',
        'skills',
        'issues',
        'notices',
        'profile',
      ];
      const activeTab: WorkerTab = validTabs.includes(sub as WorkerTab)
        ? (sub as WorkerTab)
        : 'home';

      return (
        <WorkerPortal
          user={session.user}
          activeTab={activeTab}
          onChangeTab={(tab) =>
            navigate(tab === 'home' ? '/worker' : `/worker/${tab}`)
          }
          onAttemptAdminUrl={handleAttemptAdminUrlFromWorker}
          onLogout={handleLogout}
          language={language}
          onChangeLanguage={setLanguage}
          largeFont={largeFont}
          onToggleLargeFont={() => setLargeFont(!largeFont)}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast(!highContrast)}
        />
      );
    }

    if (pathname.startsWith('/admin')) {
      const sub = pathname.replace('/admin', '').replace(/^\//, '');
      const validViews: AdminView[] = [
        'dashboard',
        'people',
        'shifts',
        'qr',
        'payroll',
        'hazards',
        'feedback',
        'risk',
        'skills',
        'issues',
        'notices',
        'settings',
      ];
      const activeView: AdminView = validViews.includes(sub as AdminView)
        ? (sub as AdminView)
        : 'dashboard';

      return (
        <AdminPortal
          user={session.user}
          activeView={activeView}
          onChangeView={(view) =>
            navigate(view === 'dashboard' ? '/admin' : `/admin/${view}`)
          }
          onSwitchOrganization={(newSess) => {
            saveSession(newSess);
          }}
          onLogout={handleLogout}
        />
      );
    }
  }

  // If unauthenticated user visits /worker or /admin, redirect to /login
  const publicRoute:
    | '/'
    | '/login'
    | '/register-organisation'
    | '/forgot-password' =
    pathname === '/login' ||
    pathname.startsWith('/worker') ||
    pathname.startsWith('/admin')
      ? '/login'
      : pathname === '/register-organisation'
      ? '/register-organisation'
      : pathname === '/forgot-password'
      ? '/forgot-password'
      : '/';

  return (
    <PublicViews
      route={publicRoute}
      onNavigate={navigate}
      language={language}
      onChangeLanguage={setLanguage}
      largeFont={largeFont}
      onToggleLargeFont={() => setLargeFont(!largeFont)}
      highContrast={highContrast}
      onToggleHighContrast={() => setHighContrast(!highContrast)}
      demoAccounts={demoAccounts}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
