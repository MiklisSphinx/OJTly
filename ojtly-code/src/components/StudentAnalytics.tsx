'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Profile {
  full_name: string;
  required_hours: number;
  ojt_status: string;
  course: string | null;
  skills: string[] | null;
}

interface AttendanceLog {
  id: string;
  log_date: string;
  hours_rendered: number | null;
  verification_status: string;
}

interface Application {
  id: string;
  status: string;
  created_at: string;
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StudentAnalytics({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Post-specific data (from the student's accepted OJT application)
  const [postDurationHours, setPostDurationHours] = useState<number | null>(null);
  const [postTitle, setPostTitle] = useState<string | null>(null);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    // Date.now() + Math.random() avoids duplicate-key crashes when the
    // same message fires twice within the same millisecond.
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [profileR, attR, appsR] = await Promise.all([
        supabase.from('profiles').select('full_name, required_hours, ojt_status, course, skills').eq('id', studentId).maybeSingle(),
        // ⚠️ archived=false: only show the CURRENT OJT's attendance, not
        // logs from a previously-completed OJT that were archived by
        // handleFinishOJT.
        supabase
          .from('attendance_logs')
          .select('id, log_date, hours_rendered, verification_status')
          .eq('student_id', studentId)
          .eq('verification_status', 'verified')
          .eq('archived', false)
          .order('log_date', { ascending: true }),
        supabase.from('applications').select('id, status, created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
      ]);

      if (profileR.error) console.warn('⚠️ Profile load:', profileR.error.message);
      if (attR.error) console.warn('⚠️ Attendance load:', attR.error.message);
      if (appsR.error) console.warn('⚠️ Applications load:', appsR.error.message);

      const profileData = profileR.data as any;
      if (profileData) {
        let skills: string[] | null = null;
        if (Array.isArray(profileData.skills)) {
          skills = profileData.skills.filter((s: any) => typeof s === 'string' && s.trim());
        } else if (typeof profileData.skills === 'string') {
          try {
            const parsed = JSON.parse(profileData.skills);
            if (Array.isArray(parsed)) skills = parsed.filter((s: any) => typeof s === 'string');
          } catch {
            skills = profileData.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
        setProfile({
          full_name: profileData.full_name || 'Student',
          required_hours: profileData.required_hours || 0,
          ojt_status: profileData.ojt_status || 'Not Started',
          course: profileData.course || null,
          skills,
        });
      }

      setAttendance((attR.data || []) as AttendanceLog[]);
      setApplications((appsR.data || []) as Application[]);

      // Fetch the student's accepted OJT post's duration_hours + title
      try {
        const { data: acceptedApp } = await supabase
          .from('applications')
          .select(`
            status,
            ojt_posts!applications_post_id_fkey ( title, duration_hours )
          `)
          .eq('student_id', studentId)
          .in('status', ['Accepted', 'accepted', 'Active', 'active', 'Ongoing', 'ongoing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (acceptedApp?.ojt_posts) {
          const post = Array.isArray(acceptedApp.ojt_posts) ? acceptedApp.ojt_posts[0] : acceptedApp.ojt_posts;
          setPostTitle(post?.title || null);
          setPostDurationHours(post?.duration_hours || null);
        }
      } catch (postErr) {
        console.warn('⚠️ Post hours fetch failed:', postErr);
      }
    } catch (err: any) {
      console.error('❌ StudentAnalytics load error:', err);
      addToast(err?.message || 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId, addToast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const metrics = useMemo(() => {
    const verifiedLogs = attendance.filter(a => a.verification_status === 'verified');
    const rejectedLogs = attendance.filter(a => a.verification_status === 'rejected_outside_geofence');
    const totalHours = verifiedLogs.reduce((sum, a) => sum + (Number(a.hours_rendered) || 0), 0);

    // Use the post's duration_hours if available, otherwise fall back to profile.required_hours
    const requiredHours = postDurationHours || profile?.required_hours || 0;
    const hoursProgress = requiredHours > 0 ? Math.min(100, (totalHours / requiredHours) * 100) : 0;

    let streak = 0;
    if (verifiedLogs.length > 0) {
      const sortedDates = verifiedLogs.map(a => a.log_date).filter(Boolean).sort((a, b) => b.localeCompare(a));
      const uniqueDates = Array.from(new Set(sortedDates));
      if (uniqueDates.length > 0) {
        let checkDate = new Date();
        const today = checkDate.toISOString().slice(0, 10);
        const yesterday = new Date(checkDate.getTime() - 86400000).toISOString().slice(0, 10);
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          for (const d of uniqueDates) {
            const dStr = new Date(checkDate).toISOString().slice(0, 10);
            if (d === dStr) { streak++; checkDate = new Date(checkDate.getTime() - 86400000); }
            else if (d < dStr) { break; }
          }
        }
      }
    }

    const totalApps = applications.length;
    const accepted = applications.filter(a => {
      const s = (a.status || '').toLowerCase();
      return s === 'accepted' || s === 'active' || s === 'ongoing' || s === 'completed';
    }).length;
    const rejected = applications.filter(a => (a.status || '').toLowerCase() === 'rejected').length;
    const pending = applications.filter(a => { const s = (a.status || '').toLowerCase(); return s === 'pending' || s === ''; }).length;
    const completed = applications.filter(a => (a.status || '').toLowerCase() === 'completed').length;
    const successRate = totalApps > 0 ? (accepted / totalApps) * 100 : 0;

    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: MONTH_LABELS[d.getMonth()], count: 0 });
    }
    const bucketMap: Record<string, number> = {};
    buckets.forEach(b => { bucketMap[b.key] = 0; });
    verifiedLogs.forEach(a => { if (!a.log_date) return; const key = a.log_date.slice(0, 7); if (key in bucketMap) bucketMap[key]++; });
    buckets.forEach(b => { b.count = bucketMap[b.key]; });
    const maxMonthly = Math.max(1, ...buckets.map(b => b.count));

    return { totalHours, requiredHours, hoursProgress, verifiedCount: verifiedLogs.length, rejectedCount: rejectedLogs.length, streak, totalApps, accepted, rejected, pending, completed, successRate, monthlyBuckets: buckets, maxMonthly };
  }, [attendance, applications, profile, postDurationHours]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-48 mb-4"></div>
          <div className="h-32 bg-slate-50 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (<div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-28 animate-pulse"><div className="h-4 bg-slate-100 rounded w-20 mb-3"></div><div className="h-8 bg-slate-50 rounded w-16"></div></div>))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center"><p className="text-sm text-slate-500">Profile not found.</p></div>);
  }

  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (metrics.hoursProgress / 100) * ringCircumference;

  return (
    <div className="space-y-4">
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-blue-50/95 border-blue-200 text-blue-800'}`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div><h2 className="font-bold text-base sm:text-lg text-slate-800">My Analytics</h2><p className="text-xs text-slate-500 mt-0.5">Track your OJT progress and application performance</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-3">OJT Hours Progress</p>
          <div className="flex items-center justify-center py-2">
            <svg viewBox="0 0 130 130" className="w-32 h-32">
              <circle cx="65" cy="65" r={ringRadius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle cx="65" cy="65" r={ringRadius} fill="none" stroke="url(#progressGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
              <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
              <text x="65" y="60" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(metrics.hoursProgress)}%</text>
              <text x="65" y="78" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9, fontWeight: 600 }}>COMPLETE</text>
            </svg>
          </div>
          <div className="text-center mt-3">
            <p className="text-2xl font-bold text-slate-800">{metrics.totalHours}<span className="text-sm font-normal text-slate-400 ml-1">/ {metrics.requiredHours}h</span></p>
            <p className="text-[10px] text-slate-400 mt-1">{Math.max(0, metrics.requiredHours - metrics.totalHours)}h remaining</p>
            {postTitle && (
              <p className="text-[10px] text-slate-500 mt-1 truncate">📌 {postTitle}</p>
            )}
            {postDurationHours && profile?.required_hours && postDurationHours !== profile.required_hours && (
              <p className="text-[9px] text-slate-400 mt-0.5">(School requires {profile.required_hours}h)</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Attendance Streak</p><span className="text-base">🔥</span></div>
            <p className="text-3xl font-bold text-orange-600">{metrics.streak}</p>
            <p className="text-[10px] text-slate-400 mt-1">consecutive days</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Verified Days</p><span className="text-base">✓</span></div>
            <p className="text-3xl font-bold text-emerald-600">{metrics.verifiedCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">{metrics.rejectedCount} rejected</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Success Rate</p><span className="text-base">🎯</span></div>
            <p className="text-3xl font-bold text-blue-600">{metrics.totalApps > 0 ? Math.round(metrics.successRate) : 0}%</p>
            <p className="text-[10px] text-slate-400 mt-1">{metrics.accepted} of {metrics.totalApps} accepted</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">OJT Status</p><span className="text-base">📌</span></div>
            <p className="text-base font-bold text-purple-600 capitalize truncate">{profile.ojt_status || 'Not Started'}</p>
            <p className="text-[10px] text-slate-400 mt-1">{profile.course || 'No course set'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
            <h3 className="font-bold text-sm text-slate-800">Attendance History</h3>
          </div>
          <span className="text-[10px] text-slate-400">Last 6 months</span>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-3 h-40 px-1">
          {metrics.monthlyBuckets.map((b, i) => {
            const heightPct = (b.count / metrics.maxMonthly) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-700">{b.count}</span>
                <div className="w-full flex-1 flex items-end">
                  <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md sm:rounded-t-lg transition-all duration-700 hover:from-emerald-600 hover:to-emerald-500" style={{ height: `${Math.max(heightPct, b.count > 0 ? 4 : 0)}%` }} />
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
            <h3 className="font-bold text-sm text-slate-800">Application Breakdown</h3>
          </div>
          <span className="text-[10px] text-slate-400">{metrics.totalApps} total</span>
        </div>
        {metrics.totalApps === 0 ? (
          <div className="text-center py-6"><p className="text-sm text-slate-500">No applications yet.</p><p className="text-xs text-slate-400 mt-1">Start applying to OJT posts to see your stats here.</p></div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'PENDING', count: metrics.pending, color: 'amber', barClass: 'bg-amber-400' },
              { label: 'ACCEPTED', count: metrics.accepted, color: 'blue', barClass: 'bg-blue-500' },
              { label: 'REJECTED', count: metrics.rejected, color: 'red', barClass: 'bg-red-500' },
              { label: 'COMPLETED', count: metrics.completed, color: 'emerald', barClass: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`text-[10px] font-bold text-${item.color}-700 bg-${item.color}-100 px-2 py-0.5 rounded-md border border-${item.color}-200 w-16 text-center shrink-0`}>{item.label}</span>
                <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                  <div className={`h-full ${item.barClass} rounded-lg flex items-center px-2 transition-all duration-500`} style={{ width: `${metrics.totalApps > 0 ? (item.count / metrics.totalApps) * 100 : 0}%` }}>
                    {item.count > 0 && <span className="text-[10px] font-bold text-white">{item.count}</span>}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {profile.skills && profile.skills.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center"><svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg></div>
            <h3 className="font-bold text-sm text-slate-800">Your Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-100">{skill}</span>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
