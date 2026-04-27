'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true); 
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    // Optional: Log outcome or send analytics
    if (outcome === 'accepted') console.log('PWA Installed');

    setIsInstalling(false);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Don't render anything if not installable
  if (!isInstallable) return null;

  return (
    <div 
      className="fixed z-[9999] group"
      style={{ 
        bottom: 'max(1.5rem, env(safe-area-inset-bottom))', 
        right: '1.5rem' 
      }}
    >
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="
          relative flex items-center gap-3
          px-6 py-4 
          rounded-2xl /* iOS uses slightly squarer circles than full pills */
          
          /* The Glass Core */
          bg-white/20 
          backdrop-blur-2xl 
          backdrop-saturate-200
          
          /* Border & Shadow */
          border border-white/30 
          shadow-lg 
          shadow-black/10 
          hover:shadow-xl 
          hover:shadow-black/20
          hover:bg-white/30
          
          /* Text & Icon */
          text-slate-800 
          font-medium 
          text-sm
          
          /* Transitions */
          transition-all 
          duration-300 
          ease-[cubic-bezier(0.25,0.46,0.45,0.94)] /* iOS Spring-like easing */
          
          /* Interaction */
          active:scale-95 
          hover:scale-[1.02]
          
          /* Focus Ring */
          focus-visible:outline-none 
          focus-visible:ring-2 
          focus-visible:ring-blue-400/50 
          focus-visible:ring-offset-2
          
          disabled:opacity-50
        "
        aria-label="Install OJTly Application"
      >
        
        {/* Animated Background Glow (Subtle) */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Icon Container */}
        <div className="
          relative flex items-center justify-center 
          w-8 h-8 
          bg-gradient-to-br from-blue-500 to-indigo-600 
          rounded-lg 
          shadow-md shadow-blue-500/30
          text-white
          overflow-hidden
        ">
           {/* Spinner for loading state */}
           {isInstalling && (
             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           )}
           
           {/* Download Icon */}
           {!isInstalling && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
           )}
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs font-normal text-slate-600 opacity-80 group-hover:opacity-100 transition-opacity">
            {isInstalling ? 'Opening...' : 'Available'}
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Install App
          </span>
        </div>

        {/* Chevron Indicator */}
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
      
      {/* Pulse ring effect for initial attention (Optional) */}
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white/50"></span>
      </span>
    </div>
  );
}