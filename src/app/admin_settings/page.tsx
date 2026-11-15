'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import FloatingChatButton from '@/components/FloatingChatButton';

// ============================================
// TYPES
// ============================================
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

interface AdminProfile {
  email: string;
  fullName: string;
  role: string;
  createdAt?: string;
}

interface SystemPrefs {
  itemsPerPage: number;
  defaultLanding: 'admin_main' | 'admin_approval' | 'admin_reports' | 'admin_cpost';
  compactMode: boolean;
  autoRefreshSeconds: number;
}

interface NotificationPrefs {
  newCompanyRegistration: boolean;
  newPostCreated: boolean;
  applicationMilestones: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const supabase = createClient();
const LS_KEY_PREFS = 'ojtly_admin_prefs';
const LS_KEY_NOTIFS = 'ojtly_admin_notifs';

const DEFAULT_PREFS: SystemPrefs = {
  itemsPerPage: 25,
  defaultLanding: 'admin_main',
  compactMode: false,
  autoRefreshSeconds: 60,
};

const DEFAULT_NOTIFS: NotificationPrefs = {
  newCompanyRegistration: true,
  newPostCreated: true,
  applicationMilestones: false,
  weeklyDigest: true,
  securityAlerts: true,
};

// ============================================
// COMPONENT
// ============================================
export default function AdminSettingsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeSection, setActiveSection] = useState<'profile' | 'system' | 'notifications' | 'security'>('profile');

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [prefs, setPrefs] = useState<SystemPrefs>(DEFAULT_PREFS);
  const [notifs, setNotifs] = useState<NotificationPrefs>(DEFAULT_NOTIFS);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-close sidebar on desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Toast system
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ==========================================
  // LOAD PROFILE + STORED PREFERENCES
  // ==========================================
  useEffect(() => {
    const loadAll = async () => {
      // 1) Load admin profile from auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            email: user.email || 'admin@ojtly.com',
            fullName: (user.user_metadata?.full_name as string) || 'Admin User',
            role: 'Administrator',
            createdAt: user.created_at,
          });
        } else {
          setProfile({ email: 'admin@ojtly.com', fullName: 'Admin User', role: 'Administrator' });
        }
      } catch {
        setProfile({ email: 'admin@ojtly.com', fullName: 'Admin User', role: 'Administrator' });
      } finally {
        setProfileLoading(false);
      }

      // 2) Load stored prefs (localStorage — no DB table needed for a graduation project)
      try {
        const storedPrefs = localStorage.getItem(LS_KEY_PREFS);
        if (storedPrefs) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(storedPrefs) });
        const storedNotifs = localStorage.getItem(LS_KEY_NOTIFS);
        if (storedNotifs) setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(storedNotifs) });
      } catch {
        // Ignore parse errors — fall back to defaults
      }
    };
    loadAll();
  }, []);

  // Mark dirty on changes
  const updatePref = <K extends keyof SystemPrefs>(key: K, value: SystemPrefs[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateNotif = <K extends keyof NotificationPrefs>(key: K, value: boolean) => {
    setNotifs(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // ==========================================
  // SAVE / RESET
  // ==========================================
  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(LS_KEY_PREFS, JSON.stringify(prefs));
      localStorage.setItem(LS_KEY_NOTIFS, JSON.stringify(notifs));
      setHasUnsavedChanges(false);
      addToast('Settings saved successfully', 'success');
    } catch (error: any) {
      addToast(error?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setNotifs(DEFAULT_NOTIFS);
    setHasUnsavedChanges(true);
    addToast('Settings reset to defaults (click Save to apply)', 'info');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore — we still navigate away
    }
    router.push('/');
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 mt-0.5 sm:mt-0.5 ${
        checked ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  );

  const Section = ({ id, title, description, icon, children }: {
    id: typeof activeSection;
    title: string;
    description: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section className={`bg-white rounded-xl sm:rounded-2xl border shadow-sm transition-all ${
      activeSection === id ? 'border-blue-200 shadow-md' : 'border-slate-100'
    }`}>
      <button
        onClick={() => setActiveSection(id)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left"
      >
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
          activeSection === id ? 'bg-blue-100' : 'bg-slate-100'
        }`}>
          <div className={activeSection === id ? 'text-blue-600' : 'text-slate-500'}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm sm:text-base text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
        </div>
        <svg className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${
          activeSection === id ? 'rotate-180' : ''
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      {activeSection === id && (
        <div className="px-4 sm:px-5 pb-5 sm:pb-6 pt-0 space-y-4 animate-fade-in border-t border-slate-100">
          {children}
        </div>
      )}
    </section>
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      {/* TOASTS */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
            toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
            'bg-blue-50/95 border-blue-200 text-blue-800'
          }`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-black text-lg">O</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">OJTly</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>
        <nav className="px-3 space-y-0.5">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span className="flex-1">Dashboard</span>
          </Link>
          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="flex-1">Company Posts</span>
          </Link>
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span className="flex-1">Approvals</span>
          </Link>
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">System</p>
          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="flex-1">Reports</span>
          </Link>
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span className="flex-1">Settings</span>
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.fullName || 'Admin User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{profile?.email || 'admin@ojtly.com'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Settings</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Manage your account &amp; platform preferences</p>
              </div>
            </div>
            <AdminNotificationBell />
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Unsaved changes
              </span>
            )}
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Settings</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Configure your admin account, system behavior, and notifications.</p>
          </div>

          {/* ──────────────────────────────────────────── */}
          {/* PROFILE SECTION */}
          {/* ──────────────────────────────────────────── */}
          <Section
            id="profile"
            title="Admin Profile"
            description="Your administrator account information"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
          >
            {profileLoading ? (
              <div className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded-lg w-40 animate-pulse"></div>
                  <div className="h-3 bg-slate-100 rounded-lg w-56 animate-pulse"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 py-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/25 shrink-0">
                    {(profile?.fullName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-800">{profile?.fullName}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                      {profile?.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Account Email</p>
                    <p className="text-sm font-medium text-slate-700 mt-1 truncate">{profile?.email}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Member Since</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-1">
                  Account information is managed by Supabase Auth. To change your name or email, contact the system administrator.
                </p>
              </>
            )}
          </Section>

          {/* ──────────────────────────────────────────── */}
          {/* SYSTEM PREFERENCES */}
          {/* ──────────────────────────────────────────── */}
          <Section
            id="system"
            title="System Preferences"
            description="List density, default landing page, and auto-refresh behavior"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          >
            {/* Default landing page */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Default Landing Page</p>
                <p className="text-xs text-slate-500 mt-0.5">Where to go after logging in as admin.</p>
              </div>
              <select
                value={prefs.defaultLanding}
                onChange={(e) => updatePref('defaultLanding', e.target.value as SystemPrefs['defaultLanding'])}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="admin_main">Dashboard</option>
                <option value="admin_approval">Approvals</option>
                <option value="admin_reports">Reports</option>
                <option value="admin_cpost">Company Posts</option>
              </select>
            </div>

            {/* Items per page */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Items Per Page</p>
                <p className="text-xs text-slate-500 mt-0.5">Number of rows shown in directory lists.</p>
              </div>
              <select
                value={prefs.itemsPerPage}
                onChange={(e) => updatePref('itemsPerPage', parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Auto-refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Auto-Refresh Interval</p>
                <p className="text-xs text-slate-500 mt-0.5">How often dashboard data refreshes in the background.</p>
              </div>
              <select
                value={prefs.autoRefreshSeconds}
                onChange={(e) => updatePref('autoRefreshSeconds', parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={120}>Every 2 minutes</option>
                <option value={300}>Every 5 minutes</option>
                <option value={0}>Off (manual only)</option>
              </select>
            </div>

            {/* Compact mode */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Compact Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">Reduces row padding and card spacing for denser lists.</p>
              </div>
              <Toggle checked={prefs.compactMode} onChange={(v) => updatePref('compactMode', v)} />
            </div>
          </Section>

          {/* ──────────────────────────────────────────── */}
          {/* NOTIFICATIONS */}
          {/* ──────────────────────────────────────────── */}
          <Section
            id="notifications"
            title="Email Notifications"
            description="Choose which platform events trigger admin emails"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>}
          >
            {[
              { key: 'newCompanyRegistration' as const, label: 'New Company Registration', desc: 'Email me when a new company signs up.' },
              { key: 'newPostCreated' as const, label: 'New OJT Post Created', desc: 'Email me when a company publishes a new OJT opportunity.' },
              { key: 'applicationMilestones' as const, label: 'Application Milestones', desc: 'Email me when applications are accepted or completed.' },
              { key: 'weeklyDigest' as const, label: 'Weekly Digest', desc: 'Receive a Monday morning summary of platform activity.' },
              { key: 'securityAlerts' as const, label: 'Security Alerts', desc: 'Critical: failed logins, deleted accounts, suspicious activity.' },
            ].map(item => (
              <div key={item.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 first:pt-0 border-t border-slate-100 first:border-t-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={notifs[item.key]} onChange={(v) => updateNotif(item.key, v)} />
              </div>
            ))}

            <p className="text-[11px] text-slate-400 italic pt-3 border-t border-slate-100">
              Notification preferences are stored locally in this browser. For server-side email triggers, configure Supabase Edge Functions or a webhook.
            </p>
          </Section>

          {/* ──────────────────────────────────────────── */}
          {/* SECURITY */}
          {/* ──────────────────────────────────────────── */}
          <Section
            id="security"
            title="Security & Access"
            description="Sign out of the admin session"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Sign Out</p>
                <p className="text-xs text-slate-500 mt-0.5">End your current admin session and return to the homepage.</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shrink-0"
              >
                Sign Out
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Reset Settings</p>
                <p className="text-xs text-slate-500 mt-0.5">Restore preferences and notifications to defaults.</p>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                Reset to Defaults
              </button>
            </div>
          </Section>

          {/* SAVE BAR */}
          <div className="sticky bottom-4 z-20">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-lg p-3 sm:p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 hidden sm:block">
                {hasUnsavedChanges ? 'You have unsaved changes.' : 'All changes saved.'}
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleReset}
                  className="px-3 sm:px-4 py-2 text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-md"
                >
                  {saving ? (
                    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <FloatingChatButton />

    </div>
  );
}
