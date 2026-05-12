'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info'; };
type Student = { id: string; full_name: string; email: string; course: string | null; ojt_status?: string; };
type Company = { id: string; company_name: string; industry?: string; email?: string; status?: string; post_count: number; };

export default function AdminDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [animatedCards, setAnimatedCards] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);

  type ActiveView = 'students' | 'companies' | null;
  const [activeView, setActiveView] = useState<ActiveView>('students');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // LIVE counts directly from database state
  const totalAcceptedStudents = useMemo(() => {
    return students.filter(s => {
      const st = (s.ojt_status || '').toLowerCase();
      return st === 'accepted' || st === 'active' || st === 'ongoing' || st === 'hired';
    }).length;
  }, [students]);

  const totalAcceptedCompanies = useMemo(() => {
    return companies.filter(c => {
      const st = (c.status || '').toLowerCase();
      return st === 'accepted' || st === 'active' || st === 'ongoing';
    }).length;
  }, [companies]);

  useEffect(() => { const t = setTimeout(() => setAnimatedCards(true), 100); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStats(true); setIsLoadingList(true);
      try {
        const supabase = createClient();

        // ── CLEAN stats count: no row data, handles NULL status correctly ──
        const { count: studentCount, error: studentCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .or('status.is.null,status.neq.deleted');
        if (studentCountError) throw new Error(`Student count failed: ${studentCountError.message}`);
        setTotalStudents(studentCount || 0);

        const { count: companyCount, error: companyCountError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .or('status.is.null,status.neq.deleted');
        if (companyCountError) throw new Error(`Company count failed: ${companyCountError.message}`);
        setTotalCompanies(companyCount || 0);

        // ── Student list (same NULL-safe filter) ──
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles').select('id, full_name, email, course, ojt_status')
          .eq('role', 'student')
          .or('status.is.null,status.neq.deleted')
          .order('full_name', { ascending: true });
        if (studentsError) throw new Error(`Student fetch failed: ${studentsError.message}`);

        const normalizedStudents: Student[] = (studentsData || []).map((p: Record<string, any>) => ({
          id: p.id || '', full_name: p.full_name || 'Unknown', email: p.email || 'No Email',
          course: p.course || null, ojt_status: p.ojt_status || 'Not Started'
        }));
        setStudents(normalizedStudents);

        // ── Company list (same NULL-safe filter) ──
        const { data: companiesRaw, error: companiesError } = await supabase
          .from('companies').select('id, company_name, industry, email, status, ojt_posts(count)')
          .or('status.is.null,status.neq.deleted')
          .order('company_name', { ascending: true });
        if (companiesError) throw new Error(`Company fetch failed: ${companiesError.message}`);

        const normalizedCompanies: Company[] = (companiesRaw || []).map((c: Record<string, any>) => {
          const postsRel = c.ojt_posts; let count = 0;
          if (!postsRel) { count = 0; }
          else if (Array.isArray(postsRel)) { count = postsRel.length; if (postsRel.length > 0 && typeof postsRel[0] === 'object' && 'count' in postsRel[0]) count = postsRel[0].count || 0; }
          else if (typeof postsRel === 'object' && 'count' in postsRel) count = (postsRel as { count: number }).count || 0;
          return { id: c.id || '', company_name: c.company_name || 'Unnamed', industry: c.industry || null, email: c.email || null, status: c.status || 'Looking', post_count: count };
        });
        setCompanies(normalizedCompanies);

      } catch (error) {
        console.error("💥 ERROR:", error);
        addToast(error instanceof Error ? error.message : 'Failed to load', 'error');
      } finally { setIsLoadingStats(false); setIsLoadingList(false); }
    };
    fetchInitialData();
    const interval = setInterval(fetchInitialData, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshStudents = async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, course, ojt_status').eq('role', 'student').or('status.is.null,status.neq.deleted').order('full_name', { ascending: true });
      if (error) throw error;
      const n: Student[] = (data || []).map((p: Record<string, any>) => ({ id: p.id || '', full_name: p.full_name || 'Unknown', email: p.email || 'No Email', course: p.course || null, ojt_status: p.ojt_status || 'Not Started' }));
      setStudents(n); setTotalStudents(n.length);
    } catch (err) { addToast('Failed to refresh students', 'error'); } finally { setIsLoadingList(false); }
  };

  const refreshCompanies = async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('companies').select('id, company_name, industry, email, status, ojt_posts(count)').or('status.is.null,status.neq.deleted').order('company_name', { ascending: true });
      if (error) throw error;
      const n: Company[] = (data || []).map((c: Record<string, any>) => {
        const pr = c.ojt_posts; let cnt = 0;
        if (!pr) cnt = 0; else if (Array.isArray(pr)) { cnt = pr.length; if (pr.length > 0 && typeof pr[0] === 'object' && 'count' in pr[0]) cnt = pr[0].count || 0; } else if (typeof pr === 'object' && 'count' in pr) cnt = (pr as { count: number }).count || 0;
        return { id: c.id || '', company_name: c.company_name || 'Unnamed', industry: c.industry || null, email: c.email || null, status: c.status || 'Looking', post_count: cnt };
      });
      setCompanies(n); setTotalCompanies(n.length);
    } catch (err) { addToast('Failed to refresh companies', 'error'); } finally { setIsLoadingList(false); }
  };

  const handleCardClick = (view: ActiveView) => {
    if (activeView === view) { setActiveView(null); setSearchQuery(''); }
    else { setActiveView(view); setSearchQuery(''); if (view === 'students') refreshStudents(); if (view === 'companies') refreshCompanies(); }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [students, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(c => c.company_name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q));
  }, [companies, searchQuery]);

  useEffect(() => { const h = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); }; window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, message, type }]); setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: () => {} });
  }, []);

  const handleStudentDelete = async (studentId: string, studentName: string) => {
    hideConfirm();
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ status: 'deleted' }).eq('id', studentId);
      if (error) throw error;
      setStudents(prev => { const u = prev.filter(s => s.id !== studentId); setTotalStudents(u.length); return u; });
      addToast(`${studentName} removed`, 'info');
    } catch (err) { addToast('Failed to remove student', 'error'); }
  };

  // SOFT DELETE for companies — mark as 'deleted', don't remove the row
  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    hideConfirm();
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('companies')
        .update({ status: 'deleted' })
        .eq('id', companyId);

      if (error) throw error;

      // Remove from UI immediately
      setCompanies(prev => { const u = prev.filter(c => c.id !== companyId); setTotalCompanies(u.length); return u; });
      addToast(`${companyName} removed`, 'info');

      // Refresh to keep stats in sync
      refreshCompanies();
    } catch (err) {
      addToast('Failed to remove company', 'error');
    }
  };

  const handleCompanyAction = async (companyId: string, companyName: string, action: 'accept' | 'activate' | 'ongoing' | 'looking') => {
    try {
      const supabase = createClient();
      const statusMap: Record<string, string> = { accept: 'Accepted', activate: 'Active', ongoing: 'Ongoing', looking: 'Looking' };
      const { error } = await supabase.from('companies').update({ status: statusMap[action] }).eq('id', companyId);
      if (error) throw error;
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: statusMap[action] } : c));
      addToast(`${companyName} set to ${statusMap[action]}`, 'success');
    } catch (err) { addToast(`Failed to update company`, 'error'); }
  };

  const getStatusStyle = (status: string | undefined | null): string => {
    if (!status) return 'bg-slate-50 text-slate-600 border-slate-200';
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'accepted': return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'ongoing': return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'looking': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'not started': return 'bg-slate-100 text-slate-500 border-slate-300';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string; }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4"><span className="text-3xl">{icon}</span></div>
      <p className="font-semibold text-slate-700 text-base">{title}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-[250px] leading-relaxed">{description}</p>
    </div>
  );

  if (isLoadingStats) {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-600 font-medium">Loading Dashboard...</p></div></div>);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      {/* Toasts */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-blue-50/95 border-blue-200 text-blue-800'}`}>
            <span className="text-sm font-bold">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0 bg-black/60" onClick={hideConfirm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-5 pl-[52px]">{confirmDialog.message}</p>
            <div className="flex gap-2.5">
              <button onClick={hideConfirm} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors">Cancel</button>
              <button onClick={() => { confirmDialog.onConfirm(); }} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-red-600/25">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (<div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />)}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"><span className="text-white font-black text-lg">O</span></div>
            <div><span className="text-xl font-bold tracking-tight text-white">OJTly</span><p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p></div>
          </Link>
        </div>
        <nav className="px-3 space-y-0.5">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5">
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>
          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="flex-1">Company Posts</span>
          </Link>
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span className="flex-1">Approvals</span>
          </Link>
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">System</p>
          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Reports
          </Link>
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">Admin User</p><p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p></div>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
              <div><h1 className="text-sm sm:text-base font-bold text-slate-800">Dashboard</h1><p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Manage students and companies</p></div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20">A</div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
            <div><h2 className="text-lg sm:text-2xl font-bold text-slate-800">Welcome back, Admin 👋</h2><p className="text-xs sm:text-sm text-slate-500 mt-0.5">Click a card to switch directories.</p></div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>

          {/* Accepted Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
              <p className="text-sm font-semibold text-gray-400 uppercase">Total Students Accepted</p>
              <h2 className="text-4xl font-bold text-blue-600 mt-1">{totalAcceptedStudents}</h2>
              <div className="flex items-center mt-2 text-green-500 text-xs">
                <span>● Active OJT Status</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
              <p className="text-sm font-semibold text-gray-400 uppercase">Total Companies Accepted</p>
              <h2 className="text-4xl font-bold text-blue-600 mt-1">{totalAcceptedCompanies}</h2>
              <div className="flex items-center mt-2 text-green-500 text-xs">
                <span>● Active Company Status</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            <div onClick={() => handleCardClick('students')} className={`bg-white rounded-xl sm:rounded-2xl border-2 shadow-sm p-4 sm:p-6 cursor-pointer ${animatedCards ? 'opacity-100' : 'opacity-0'} ${activeView === 'students' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Students</p>
                    {activeView === 'students' && (<span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">VIEWING</span>)}
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold text-slate-800 mt-1 sm:mt-2 tracking-tight">{totalStudents.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-indigo-500 font-medium mt-1 sm:mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    {totalAcceptedStudents} accepted / active
                  </p>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${activeView === 'students' ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
                  <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${activeView === 'students' ? 'text-indigo-600' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </div>
              </div>
            </div>

            <div onClick={() => handleCardClick('companies')} className={`bg-white rounded-xl sm:rounded-2xl border-2 shadow-sm p-4 sm:p-6 cursor-pointer ${animatedCards ? 'opacity-100' : 'opacity-0'} ${activeView === 'companies' ? 'border-purple-500 bg-purple-50/30' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Companies</p>
                    {activeView === 'companies' && (<span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">VIEWING</span>)}
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold text-slate-800 mt-1 sm:mt-2 tracking-tight">{totalCompanies.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-purple-500 font-medium mt-1 sm:mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    {totalAcceptedCompanies} accepted / active
                  </p>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${activeView === 'companies' ? 'bg-purple-100' : 'bg-purple-50'}`}>
                  <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${activeView === 'companies' ? 'text-purple-600' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* STUDENTS LIST */}
          {activeView === 'students' && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-indigo-50"><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div><h3 className="font-bold text-xs sm:text-sm text-slate-800">Student Directory</h3></div>
                  <button onClick={() => { setActiveView(null); setSearchQuery(''); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>)}
                </div>
                <div className="text-[10px] text-slate-500">Showing {filteredStudents.length} of {students.length}</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {isLoadingList ? (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>) : filteredStudents.length === 0 ? (
                  <EmptyState icon={searchQuery ? "🔍" : "👨‍🎓"} title={searchQuery ? "No students found" : "No students registered"} description={searchQuery ? "Try adjusting your search" : "Students will appear here once they sign up"} />
                ) : (<>
                  <div className="hidden md:block">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">OJT Status</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">{(s.full_name || 'U').charAt(0).toUpperCase()}</div><div><p className="font-semibold text-xs sm:text-sm text-slate-800">{s.full_name}</p><p className="text-[10px] text-slate-400 truncate max-w-[180px]">{s.email}</p></div></div></td>
                            <td className="px-4 py-3"><span className={`text-xs font-medium ${!s.course ? 'text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-600'}`}>{s.course || 'Not Enrolled'}</span></td>
                            <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(s.ojt_status)}`}>{s.ojt_status || 'N/A'}</span></td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={(e) => { e.stopPropagation(); showConfirm('Remove Student', `Are you sure you want to remove "${s.full_name}"? This cannot be undone.`, () => handleStudentDelete(s.id, s.full_name)); }} className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredStudents.map((s) => (
                      <div key={s.id} className="p-3 sm:p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">{(s.full_name || 'U').charAt(0).toUpperCase()}</div>
                            <div className="min-w-0"><p className="font-semibold text-sm text-slate-800 truncate">{s.full_name}</p><p className="text-[10px] text-slate-400 truncate">{s.email}</p></div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${getStatusStyle(s.ojt_status)}`}>{s.ojt_status || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pl-[46px]">
                          <span className={`text-[10px] sm:text-xs font-medium ${!s.course ? 'text-amber-600 italic' : 'text-slate-500'}`}>{s.course || 'Not Enrolled'}</span>
                          <button type="button" onClick={() => showConfirm('Remove Student', `Remove "${s.full_name}"? This cannot be undone.`, () => handleStudentDelete(s.id, s.full_name))} className="bg-red-500 active:bg-red-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>
            </div>
          )}

          {/* COMPANIES LIST */}
          {activeView === 'companies' && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-purple-50"><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div><h3 className="font-bold text-xs sm:text-sm text-slate-800">Company Directory</h3></div>
                  <button onClick={() => { setActiveView(null); setSearchQuery(''); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input type="text" placeholder="Search companies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                  {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>)}
                </div>
                <div className="text-[10px] text-slate-500">Showing {filteredCompanies.length} of {companies.length}</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {isLoadingList ? (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div></div>) : filteredCompanies.length === 0 ? (
                  <EmptyState icon={searchQuery ? "🔍" : "🏢"} title={searchQuery ? "No companies found" : "No companies registered"} description={searchQuery ? "Try adjusting your search" : "Companies will appear here once they sign up"} />
                ) : (<>
                  <div className="hidden lg:block">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Industry</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Posts</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredCompanies.map((c) => (
                          <tr key={c.id}>
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">{(c.company_name || 'C').charAt(0).toUpperCase()}</div><div><p className="font-semibold text-xs sm:text-sm text-slate-800">{c.company_name}</p><p className="text-[10px] text-slate-400 truncate max-w-[180px]">{c.email || ''}</p></div></div></td>
                            <td className="px-4 py-3"><span className="text-xs text-slate-600 font-medium">{c.industry || 'General'}</span></td>
                            <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">{c.post_count ?? 0}</span></td>
                            <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(c.status)}`}>{c.status || 'Looking'}</span></td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {c.status !== 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'accept')} className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors">Accept</button>)}
                                {c.status === 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'activate')} className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors">Activate</button>)}
                                {(c.status === 'Active' || c.status === 'Ongoing') && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, c.status === 'Active' ? 'ongoing' : 'looking')} className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors">{c.status === 'Active' ? 'Ongoing' : 'Looking'}</button>)}
                                <button type="button" onClick={(e) => { e.stopPropagation(); showConfirm('Remove Company', `Remove "${c.company_name}"? They will no longer appear in the directory.`, () => handleDeleteCompany(c.id, c.company_name)); }} className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors">Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <table className="hidden md:table lg:hidden w-full text-left">
                    <thead><tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredCompanies.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">{(c.company_name || 'C').charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="font-semibold text-xs text-slate-800 truncate">{c.company_name}</p><p className="text-[10px] text-slate-400 truncate">{c.industry || 'General'}</p></div></div></td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(c.status)}`}>{c.status || 'Looking'}</span></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c.status !== 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'accept')} className="bg-blue-500 active:bg-blue-700 text-white p-1.5 rounded-lg transition-colors text-[10px] font-bold">✓</button>)}
                              {c.status === 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'activate')} className="bg-emerald-500 active:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors text-[10px] font-bold">⚡</button>)}
                              {(c.status === 'Active' || c.status === 'Ongoing') && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, c.status === 'Active' ? 'ongoing' : 'looking')} className="bg-amber-500 active:bg-amber-700 text-white p-1.5 rounded-lg transition-colors text-[10px] font-bold">↻</button>)}
                              <button type="button" onClick={() => showConfirm('Remove Company', `Remove "${c.company_name}"?`, () => handleDeleteCompany(c.id, c.company_name))} className="bg-red-500 active:bg-red-700 text-white p-1.5 rounded-lg transition-colors text-[10px] font-bold">✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredCompanies.map((c) => (
                      <div key={c.id} className="p-3 sm:p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">{(c.company_name || 'C').charAt(0).toUpperCase()}</div>
                            <div className="min-w-0"><p className="font-semibold text-sm text-slate-800 truncate">{c.company_name}</p><p className="text-[10px] text-slate-400 truncate">{c.industry || 'General'}</p></div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${getStatusStyle(c.status)}`}>{c.status || 'Looking'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">{c.post_count ?? 0} posts</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.status !== 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'accept')} className="bg-blue-500 active:bg-blue-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors">Accept</button>)}
                            {c.status === 'Accepted' && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, 'activate')} className="bg-emerald-500 active:bg-emerald-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors">Active</button>)}
                            {(c.status === 'Active' || c.status === 'Ongoing') && (<button type="button" onClick={() => handleCompanyAction(c.id, c.company_name, c.status === 'Active' ? 'ongoing' : 'looking')} className="bg-amber-500 active:bg-amber-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors">{c.status === 'Active' ? 'Ongoing' : 'Looking'}</button>)}
                            <button type="button" onClick={() => showConfirm('Remove Company', `Remove "${c.company_name}"?`, () => handleDeleteCompany(c.id, c.company_name))} className="bg-red-500 active:bg-red-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors">Del</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .overflow-y-auto::-webkit-scrollbar { width: 3px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 100px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}