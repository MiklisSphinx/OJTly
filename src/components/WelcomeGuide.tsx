'use client';

// components/WelcomeGuide.tsx
//
// Welcome Card + User Guide for OJTly — BLUE theme.
// The floating Help button is DRAGGABLE (same as the chat button) so users
// can move it out of the way. Position is saved to localStorage.
//
// Drop `<WelcomeGuide />` onto any student page (student features by default).
// Use `<WelcomeGuide variant="company" />` for the company dashboard.

import { useState, useEffect, useRef } from 'react';

type Variant = 'student' | 'company' | 'map';

// ─── Student features ───
const STUDENT_FEATURES = [
  { name: 'Dashboard', desc: 'Track your OJT progress, required hours, and assigned company.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>) },
  { name: 'My Profile', desc: 'Edit your personal info, skills, portfolio, and upload your resume.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>) },
  { name: 'OJT Map', desc: 'Browse nearby OJT opportunities on an interactive map.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
  { name: 'AI Recommendations', desc: 'Get matched with OJT posts based on your skills and location.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3l1.9 5.7a2 2 0 001.4 1.4L20 12l-5.7 1.9a2 2 0 00-1.4 1.4L11 21l-1.9-5.7a2 2 0 00-1.4-1.4L2 12l5.7-1.9a2 2 0 001.4-1.4L11 3z" /></svg>) },
  { name: 'My Applications', desc: 'Track the status of your OJT applications.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>) },
  { name: 'Notifications', desc: 'Receive updates about your applications and announcements.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>) },
];

// ─── Company features ───
const COMPANY_FEATURES = [
  { name: 'Dashboard', desc: 'Track your OJT posts, applications, and hiring stats.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>) },
  { name: 'My OJT Posts', desc: 'Manage and review your existing job postings.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>) },
  { name: 'Create Post', desc: 'Publish a new OJT opportunity for students.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
  { name: 'Applicants', desc: 'Review student applications and hire candidates.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
  { name: 'Documents', desc: 'Manage your company documents and MOA.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>) },
  { name: 'Settings', desc: 'Update your company profile and preferences.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
];

// ─── Map features ───
const MAP_FEATURES = [
  { name: 'Search & Filter', desc: 'Search OJT posts by title, company, or location using the search bar.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>) },
  { name: 'GPS Location', desc: 'Click the location button on the left panel to detect your GPS and track your movement.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 6L14.5 12L12 18L9.5 12Z" fill="currentColor" stroke="none" /></svg>) },
  { name: 'Map Markers', desc: 'Tap any colored marker to view job details, distance, and skill match percentage.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 20l4-16m2 16l-4-16M6 9h14M7 15h14" /></svg>) },
  { name: 'Route Directions', desc: 'Choose walking, motorcycle, or car mode to see travel time to each OJT post.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>) },
  { name: 'Satellite View', desc: 'Toggle between street map and satellite imagery using the satellite button.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
  { name: 'Saved Posts', desc: 'Bookmark OJT posts for quick access. Filter by saved using the Saved button.', icon: (<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>) },
];

const STUDENT_QUICK_GUIDE = ['Complete your student profile', 'Find recommended OJT opportunities', 'Submit your applications', 'Track your application status'];
const COMPANY_QUICK_GUIDE = ['Create your company profile', 'Post OJT opportunities', 'Review applicant submissions', 'Track your hiring pipeline'];
const MAP_QUICK_GUIDE = ['Click the location button on the left panel to detect your GPS', 'Search for OJT posts using the search bar', 'Tap any marker on the map to view full details', 'Apply or save positions you are interested in'];

const WELCOME_TEXTS: Record<Variant, string> = {
  student: 'Find opportunities, discover companies, and manage your OJT applications all in one place.',
  company: 'Post opportunities, review applicants, and manage your OJT hiring pipeline all in one place.',
  map: 'Explore OJT opportunities near you on an interactive map. Track your location, see distances, and find the best matches.',
};
const WELCOME_SUBTITLES: Record<Variant, string> = {
  student: 'Your OJT journey starts here.',
  company: 'Manage your OJT program with ease.',
  map: 'Explore OJT opportunities near you.',
};

export default function WelcomeGuide({ variant = 'student' }: { variant?: Variant }) {
  const FEATURES = variant === 'company' ? COMPANY_FEATURES : variant === 'map' ? MAP_FEATURES : STUDENT_FEATURES;
  const QUICK_GUIDE = variant === 'company' ? COMPANY_QUICK_GUIDE : variant === 'map' ? MAP_QUICK_GUIDE : STUDENT_QUICK_GUIDE;

  const [showWelcome, setShowWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // ── Draggable Help button state ──
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef({ active: false, moved: false, ox: 0, oy: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('ojtly_welcome_seen')) {
      setShowWelcome(true);
    }
    // Restore saved button position (with viewport bounds check)
    const saved = localStorage.getItem('ojtly-help-btn-pos');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        const sz = 44;
        if (pos.x >= 0 && pos.x <= window.innerWidth - sz && pos.y >= 0 && pos.y <= window.innerHeight - sz) {
          setBtnPos(pos);
        } else {
          // Saved position is off-screen (e.g. saved on desktop, now on mobile)
          localStorage.removeItem('ojtly-help-btn-pos');
        }
      } catch { /* ignore */ }
    }
    const handler = () => setShowGuide(true);
    window.addEventListener('open-ojtly-guide', handler);
    return () => window.removeEventListener('open-ojtly-guide', handler);
  }, []);

  // Reset button position if viewport shrinks (e.g. desktop → mobile, closing devtools)
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        if (!prev) return prev;
        const sz = 44;
        if (prev.x > window.innerWidth - sz || prev.y > window.innerHeight - sz) {
          if (typeof window !== 'undefined') localStorage.removeItem('ojtly-help-btn-pos');
          return null; // falls back to default CSS position
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== 'undefined') sessionStorage.setItem('ojtly_welcome_seen', '1');
  };
  const openGuideFromWelcome = () => {
    setShowGuide(true);
    setShowWelcome(false);
    if (typeof window !== 'undefined') sessionStorage.setItem('ojtly_welcome_seen', '1');
  };

  // ── Drag handlers (pointer events = mouse + touch) ──
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { active: true, moved: false, ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    const dx = e.clientX - (drag.current.ox);
    const dy = e.clientY - (drag.current.oy);
    if (Math.abs(dx - (btnPos?.x ?? 0)) > 2 || Math.abs(dy - (btnPos?.y ?? 0)) > 2) drag.current.moved = true;
    const sz = 44;
    const x = Math.max(4, Math.min(e.clientX - drag.current.ox, window.innerWidth - sz - 4));
    const y = Math.max(4, Math.min(e.clientY - drag.current.oy, window.innerHeight - sz - 4));
    setBtnPos({ x, y });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag.current.moved && btnPos && typeof window !== 'undefined') {
      localStorage.setItem('ojtly-help-btn-pos', JSON.stringify(btnPos));
    }
  };
  const onBtnClick = () => {
    // Only open if it was a click, not a drag
    if (!drag.current.moved) setShowGuide(true);
  };

  return (
    <>
      {/* ─── Draggable floating Help button ─── */}
      <button
        type="button"
        onClick={onBtnClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Help / User Guide"
        title="Help / User Guide (drag to move)"
        style={btnPos ? { left: `${btnPos.x}px`, top: `${btnPos.y}px`, right: 'auto', bottom: 'auto' } : undefined}
        className="fixed bottom-20 left-4 z-[55] flex h-11 w-11 cursor-pointer touch-none select-none items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 sm:bottom-5 sm:left-4"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* ─── Welcome Card ─── */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
          onClick={closeWelcome}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-5">
           
              <button onClick={closeWelcome} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 pt-3">
              <div className="mb-4 text-center">
               
                <h2 className="text-xl font-bold text-slate-900">Welcome to OJTly!</h2>
                <p className="mt-1 text-sm font-semibold text-blue-600">{WELCOME_SUBTITLES[variant]}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{WELCOME_TEXTS[variant]}</p>
              </div>

              {/* Quick Guide */}
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Quick Guide</p>
                <div className="space-y-2.5">
                  {QUICK_GUIDE.map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <span className="text-xs font-medium text-slate-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Guide card */}
              <button onClick={openGuideFromWelcome} className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 transition-all hover:bg-blue-100 active:scale-[0.98]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">User Guide / Help Center</p>
                  <p className="text-xs text-slate-500">View all features and how to use them</p>
                </div>
                <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">View Guide</span>
              </button>

              <button onClick={closeWelcome} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── User Guide Modal ─── */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">User Guide</h3>
              </div>
              <button onClick={() => setShowGuide(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-3">
                {FEATURES.map((f) => (
                  <div key={f.name} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">{f.icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{f.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-3">
              <button onClick={() => setShowGuide(false)} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">Got it!</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
