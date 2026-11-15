'use client';

import { useEffect, useState } from 'react';

// ============================================================
// <InstallButton />
// Shows an "Install App" button when the app is PWA-installable.
//
// Handles the case where `beforeinstallprompt` fires BEFORE
// the component mounts (common in Next.js SSR):
//   1. An inline script in layout.tsx captures the event globally
//      and stores it in window.deferredPrompt
//   2. This component checks window.deferredPrompt on mount
//   3. Also listens for future beforeinstallprompt events
// ============================================================

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // ✅ Check if the event was already captured globally (by the inline script)
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    // Listen for future beforeinstallprompt events
    const handler = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;  // Store globally for late-mounting components
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide button after installation
    const installedHandler = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.deferredPrompt = undefined;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (!promptEvent) return;

    setIsInstalling(true);
    promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') console.log('✅ PWA Installed');

    setIsInstalling(false);
    setDeferredPrompt(null);
    setIsInstallable(false);
    window.deferredPrompt = undefined;
  };

  if (!isInstallable) return null;

  return (
    <div
      className="fixed z-[9999] group"
      style={{
        bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4rem))',
        right: '1.5rem'
      }}
    >
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="
          relative flex items-center gap-3
          px-6 py-4
          rounded-2xl

          bg-white/20
          backdrop-blur-2xl
          backdrop-saturate-200

          border border-white/30
          shadow-lg
          shadow-black/10
          hover:shadow-xl
          hover:shadow-black/20
          hover:bg-white/30

          text-slate-800
          font-medium
          text-sm

          transition-all
          duration-300
          ease-[cubic-bezier(0.25,0.46,0.45,0.94)]

          active:scale-95
          hover:scale-[1.02]

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-400/50
          focus-visible:ring-offset-2

          disabled:opacity-50
        "
        aria-label="Install OJTly Application"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md shadow-blue-500/30 text-white overflow-hidden">
          {isInstalling ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373,0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs font-normal text-slate-600 opacity-80 group-hover:opacity-100 transition-opacity">
            {isInstalling ? 'Opening...' : 'Available'}
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Install App
          </span>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all duration-300 ${isInstalling ? 'hidden' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white/50"></span>
      </span>
    </div>
  );
}
