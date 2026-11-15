'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface AttendanceLog {
  id: string;
  log_date: string;
  hours_rendered: number | null;
  verification_status: string;
  distance_m: number | null;
}

interface StudentWithAttendance {
  student_id: string;
  student_name: string;
  student_email: string;
  post_title: string;
  post_id: string;
  total_hours: number;
  verified_days: number;
  rejected_days: number;
  today_status: string | null;
  today_distance: number | null;
  recent_logs: AttendanceLog[];
}

export default function CompanyAttendanceView({ companyId, postId }: { companyId: string; postId?: string | null }) {
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('applications')
        .select(`
          id, student_id, post_id, status,
          profiles!applications_student_id_fkey ( full_name, email ),
          ojt_posts!applications_post_id_fkey ( title )
        `)
        .eq('company_id', companyId)
        .in('status', ['Accepted', 'accepted', 'Active', 'active', 'Ongoing', 'ongoing']);

      if (postId) {
        query = query.eq('post_id', postId);
      }

      const { data: apps, error: appsError } = await query;
      if (appsError) throw appsError;

      const studentIds = Array.from(new Set((apps || []).map((a: any) => a.student_id)));
      // ⚠️ .eq('archived', false): CRITICAL — only show logs from the CURRENT
      // OJT cycle. Without this filter, when a company accepts a student who
      // previously finished an OJT elsewhere, the company instantly sees the
      // student's OLD archived logs (from the previous OJT) as if they were
      // attendance for THIS OJT — even though the student hasn't checked in yet.
      // The archived=true logs belong to past OJTs and are read separately by
      // the certificate generator.
      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('id, student_id, log_date, hours_rendered, verification_status, distance_m')
        .in('student_id', studentIds)
        .eq('archived', false)
        .order('log_date', { ascending: false });

      const today = new Date().toISOString().slice(0, 10);
      const logMap: Record<string, AttendanceLog[]> = {};
      (logs || []).forEach((l: any) => {
        if (!logMap[l.student_id]) logMap[l.student_id] = [];
        logMap[l.student_id].push({
          id: l.id, log_date: l.log_date,
          hours_rendered: l.hours_rendered,
          verification_status: l.verification_status,
          distance_m: l.distance_m,
        });
      });

      const normalized: StudentWithAttendance[] = (apps || []).map((a: any) => {
        const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const post = Array.isArray(a.ojt_posts) ? a.ojt_posts[0] : a.ojt_posts;
        const studentLogs = logMap[a.student_id] || [];
        const verifiedLogs = studentLogs.filter(l => l.verification_status === 'verified');
        const todayLog = studentLogs.find(l => l.log_date === today);
        return {
          student_id: a.student_id,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || '',
          post_title: post?.title || 'Untitled',
          post_id: a.post_id,
          total_hours: verifiedLogs.reduce((s, l) => s + (Number(l.hours_rendered) || 0), 0),
          verified_days: verifiedLogs.length,
          rejected_days: studentLogs.filter(l => l.verification_status === 'rejected_outside_geofence').length,
          today_status: todayLog?.verification_status || null,
          today_distance: todayLog?.distance_m || null,
          recent_logs: studentLogs.slice(0, 7),
        };
      });

      setStudents(normalized);
    } catch (err: any) {
      console.error('❌ CompanyAttendanceView error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, postId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.student_name.toLowerCase().includes(q) ||
      s.student_email.toLowerCase().includes(q) ||
      s.post_title.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtDistance = (m: number | null) => {
    if (m == null) return '—';
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(2)}km`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="h-6 bg-slate-100 rounded w-48 mb-4 animate-pulse"></div>
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse"></div>)}</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-base text-slate-800 mb-2">Student Attendance</h3>
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">No active OJT students yet.</p>
          <p className="text-xs text-slate-400 mt-1">Accept student applications to see their attendance here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-800">Student Attendance</h3>
            <p className="text-xs text-slate-500 mt-0.5">GPS-verified check-ins · {students.length} students</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            type="text"
            placeholder="Search by student name, email, or post…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-slate-400 mt-1.5">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No students match "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Clear search
            </button>
          </div>
        ) : (
          filteredStudents.map(s => (
            <div key={s.student_id} className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === s.student_id ? null : s.student_id)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center font-bold text-blue-600 shrink-0">{s.student_name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-800 truncate">{s.student_name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.post_title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Hours</p>
                    <p className="text-sm font-bold text-slate-700">{s.total_hours}h</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Days</p>
                    <p className="text-sm font-bold text-emerald-600">{s.verified_days}✓</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Today</p>
                    {s.today_status === 'verified' ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600">✓ Present</span>
                    ) : s.today_status === 'rejected_outside_geofence' ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">✕ Rejected</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-400">— Not checked in</span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${expandedId === s.student_id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>

              {expandedId === s.student_id && (
                <div className="mt-4 pl-1 sm:pl-13 animate-fade-in">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Recent Attendance (last 7 days)</p>
                  {s.recent_logs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">No attendance logs yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {s.recent_logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-xs gap-2">
                          <span className="font-medium text-slate-600">{fmtDate(log.log_date)}</span>
                          <div className="flex items-center gap-2">
                            {log.verification_status === 'verified' ? (
                              <span className="text-emerald-600 font-bold">✓ Verified</span>
                            ) : log.verification_status === 'rejected_outside_geofence' ? (
                              <span className="text-red-600 font-bold">✕ Rejected</span>
                            ) : (
                              <span className="text-slate-500 font-bold">{log.verification_status}</span>
                            )}
                            <span className="text-slate-400 hidden sm:inline">{fmtDistance(log.distance_m)}</span>
                            <span className="text-slate-400">{log.hours_rendered || 0}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Total: <strong className="text-slate-700">{s.total_hours}h</strong></span>
                    <span className="text-slate-500">Verified days: <strong className="text-emerald-600">{s.verified_days}</strong></span>
                    {s.rejected_days > 0 && <span className="text-slate-500">Rejected: <strong className="text-red-600">{s.rejected_days}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
