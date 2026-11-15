'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import ChatPanel from '@/components/ChatPanel';

interface Application {
  id: string;
  status: string;
  created_at: string;
  post_id: string;
  student_id: string;
  ojt_posts?: {
    title: string;
    location_name: string;
    work_type: string;
    allowance_type: string;
    duration_hours: number;
    companies: { company_name: string; logo_url?: string; user_id?: string };
  };
}

const getStatusStyle = (status: string): string => {
  const s = status?.toLowerCase();
  if (['accepted', 'approved', 'hired'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['rejected', 'declined', 'denied'].includes(s)) return 'bg-red-100 text-red-700 border-red-200';
  if (['completed', 'finished'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const getStatusLabel = (status: string): string => {
  const s = status?.toLowerCase();
  if (['accepted', 'approved', 'hired'].includes(s)) return 'Accepted';
  if (['rejected', 'declined', 'denied'].includes(s)) return 'Rejected';
  if (['completed', 'finished'].includes(s)) return 'Completed';
  return 'Pending';
};

export default function ApplicationHistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'completed'>('all');
  const [showChat, setShowChat] = useState(false);
  const [chatCompanyUserId, setChatCompanyUserId] = useState<string | null>(null);
  const [chatCompanyName, setChatCompanyName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/student/login'); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) setStudentName(profile.full_name);

      const { data: apps, error } = await supabase
        .from('applications')
        .select(`
          id, status, created_at, post_id, student_id,
          ojt_posts:post_id (
            title, location_name, work_type, allowance_type, duration_hours,
            companies:company_id ( company_name, logo_url, user_id )
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && apps) setApplications(apps as Application[]);
      setLoading(false);
    })();
  }, [router, supabase]);

  const filteredApps = applications.filter(a => {
    if (filter === 'all') return true;
    const s = a.status?.toLowerCase();
    if (filter === 'pending') return !['accepted', 'approved', 'hired', 'rejected', 'declined', 'denied', 'completed', 'finished'].includes(s);
    if (filter === 'accepted') return ['accepted', 'approved', 'hired'].includes(s);
    if (filter === 'rejected') return ['rejected', 'declined', 'denied'].includes(s);
    if (filter === 'completed') return ['completed', 'finished'].includes(s);
    return true;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => !['accepted', 'approved', 'hired', 'rejected', 'declined', 'denied', 'completed', 'finished'].includes(a.status?.toLowerCase())).length,
    accepted: applications.filter(a => ['accepted', 'approved', 'hired'].includes(a.status?.toLowerCase())).length,
    rejected: applications.filter(a => ['rejected', 'declined', 'denied'].includes(a.status?.toLowerCase())).length,
    completed: applications.filter(a => ['completed', 'finished'].includes(a.status?.toLowerCase())).length,
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-14 sm:h-16">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-1 shrink-0">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate px-2 flex-1 text-center">My Applications</h1>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <Link href="/" className="text-lg sm:text-xl font-bold text-slate-900">
              <span className="text-blue-600">◉</span> <span className="hidden xs:inline">OJTly</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm text-center">
            <p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p>
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm text-center">
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Accepted</p>
            <p className="text-xl font-bold text-emerald-600">{stats.accepted}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase">Completed</p>
            <p className="text-xl font-bold text-blue-600">{stats.completed}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm text-center">
            <p className="text-[10px] font-bold text-red-600 uppercase">Rejected</p>
            <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'pending', 'accepted', 'completed', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors capitalize ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Application list */}
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-500 font-medium">{filter === 'all' ? 'No applications yet' : `No ${filter} applications`}</p>
            <p className="text-slate-400 text-sm mt-1">Browse OJT posts and apply to get started</p>
            <Link href="/student_main" className="mt-4 inline-flex px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Browse Posts
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApps.map((app) => {
              const post = app.ojt_posts;
              const company = post?.companies;
              const statusLabel = getStatusLabel(app.status);
              const statusStyle = getStatusStyle(app.status);
              const isAccepted = ['accepted', 'approved', 'hired'].includes(app.status?.toLowerCase());
              const isCompleted = ['completed', 'finished'].includes(app.status?.toLowerCase());

              return (
                <div key={app.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  {/* Company logo */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                    {(company?.company_name || 'C').charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{post?.title || 'Unknown Position'}</h3>
                        <p className="text-xs text-slate-500 truncate">{company?.company_name || 'Unknown Company'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap shrink-0 ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 flex-wrap">
                      {post?.location_name && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {post.location_name}
                        </span>
                      )}
                      {post?.work_type && (
                        <span className="capitalize">{post.work_type}</span>
                      )}
                      {post?.allowance_type && (
                        <span className={post.allowance_type === 'Paid' ? 'text-emerald-500 font-medium' : ''}>{post.allowance_type}</span>
                      )}
                      <span>Applied {formatDate(app.created_at)}</span>
                    </div>

                    {/* Action: Message company if accepted */}
                    {isAccepted && !isCompleted && company?.user_id && (
                      <button
                        onClick={() => {
                          setChatCompanyUserId(company.user_id!);
                          setChatCompanyName(company.company_name || 'Company');
                          setShowChat(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Message Company
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Chat modal */}
      {showChat && userId && chatCompanyUserId && (
        <ChatPanel
          myUserId={userId}
          otherUserId={chatCompanyUserId}
          myName={studentName}
          otherName={chatCompanyName}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
