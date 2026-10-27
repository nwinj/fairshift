import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 min-h-[40px]'
            : 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[48px]'
        }
      >
        <Download className="w-4 h-4 text-amber-600 shrink-0" />
        <span>{isIOS ? 'Install on iOS' : 'Install App (PWA)'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 border border-slate-200 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="pwa-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Install FairShift on Your Phone
                  </h3>
                  <p className="text-xs text-slate-500">
                    Works offline for gate QR check-in & audio payslips
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install guide"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-900">
                How to add FairShift to your Home Screen:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                <li>
                  <strong>Android (Chrome):</strong> Tap the browser menu (⋮) and
                  choose <strong>Add to Home screen</strong> or{' '}
                  <strong>Install app</strong>.
                </li>
                <li>
                  <strong>iPhone / iPad (Safari):</strong> Tap the{' '}
                  <strong>Share</strong> icon at the bottom, then tap{' '}
                  <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  <strong>Low-End Phone Ready:</strong> Uses under 200 KB cached
                  shell and queues gate check-ins even without mobile data.
                </li>
              </ol>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-[48px]"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
