'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { logAuditAction } from '@/utils/audit';
import { useBulkSelection, BulkActionBar, BulkCheckbox } from '@/components/BulkActions';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import FloatingChatButton from '@/components/FloatingChatButton';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type FilterTab = 'All' | 'Active' | 'Featured' | 'TakenDown' | 'Trash';

interface OjtPost {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  vacancies: number | null;
  work_type: string | null;
  company_id: string;
  company_name: string;
  company_industry: string | null;
  status: string;
  is_featured: boolean;
  is_deleted: boolean;
  created_at: string | null;
  application_count: number;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmStyle: 'danger' | 'primary' | 'neutral';
  onConfirm: () => void;
}

const supabase = createClient();

export default function AdminCPostPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<OjtPost[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const bulk = useBulkSelection();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
    open: false, title: '', message: '', confirmLabel: 'Confirm',
    confirmStyle: 'danger', onConfirm: () => {},
  });

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const describeError = (err: any): string => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    return [err.message, err.code && `code=${err.code}`, err.hint && `hint=${err.hint}`, err.details && `details=${err.details}`].filter(Boolean).join(' | ');
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let postsData: any[] | null = null;
      let postsError: any = null;
      let usedFallback = false;

      const fullQuery = supabase
        .from('ojt_posts')
        .select('id, title, description, location_name, vacancies, work_type, company_id, status, is_featured, is_deleted, created_at, applications(count)')
        .order('created_at', { ascending: false });

      const fullResult = await fullQuery;
      postsData = fullResult.data;
      postsError = fullResult.error;

      if (postsError) {
        console.warn('⚠️  Full query failed, trying minimal fallback:', describeError(postsError));
        const { data: minData, error: minError } = await supabase
          .from('ojt_posts')
          .select('id, title, description, location_name, vacancies, work_type, company_id, status, created_at')
          .order('created_at', { ascending: false });
        if (minError) throw minError;
        postsData = minData;
        postsError = null;
        usedFallback = true;
      }

      const companyIds = Array.from(new Set((postsData || []).map((p: any) => p.company_id).filter(Boolean)));
      const companyMap: Record<string, { name: string; industry?: string }> = {};
      if (companyIds.length > 0) {
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, company_name, industry')
          .in('id', companyIds);
        if (companiesError) console.warn('⚠️  Company lookup failed:', describeError(companiesError));
        (companiesData || []).forEach((c: any) => { companyMap[c.id] = { name: c.company_name || 'Unnamed', industry: c.industry }; });
      }

      let appCountMap: Record<string, number> = {};
      if (usedFallback && companyIds.length > 0) {
        try {
          const { data: appsData } = await supabase
            .from('applications')
            .select('post_id')
            .in('post_id', (postsData || []).map((p: any) => p.id).filter(Boolean));
          (appsData || []).forEach((a: any) => { if (a?.post_id) appCountMap[a.post_id] = (appCountMap[a.post_id] || 0) + 1; });
        } catch { }
      }

      const normalized: OjtPost[] = (postsData || []).map((p: any) => {
        const appsRel = p.applications;
        let appCount = 0;
        if (Array.isArray(appsRel) && appsRel.length > 0 && typeof appsRel[0] === 'object' && 'count' in appsRel[0]) {
          appCount = appsRel[0].count || 0;
        } else if (Array.isArray(appsRel)) {
          appCount = appsRel.length;
        } else if (p.id && p.id in appCountMap) {
          appCount = appCountMap[p.id];
        }
        const company = p.company_id ? companyMap[p.company_id] : undefined;
        return {
          id: p.id || '',
          title: p.title || 'Untitled Post',
          description: p.description || null,
          location_name: p.location_name || null,
          vacancies: p.vacancies ?? null,
          work_type: p.work_type || null,
          company_id: p.company_id || '',
          company_name: company?.name || 'Unknown Company',
          company_industry: company?.industry || null,
          status: p.status || 'active',
          is_featured: Boolean(p.is_featured ?? false),
          is_deleted: Boolean(p.is_deleted ?? false),
          created_at: p.created_at || null,
          application_count: appCount,
        };
      });

      setPosts(normalized);
      if (usedFallback) {
        addToast('Some admin features are unavailable — run admin_rls.sql in Supabase to enable them.', 'info');
      }
    } catch (error: any) {
      const description = describeError(error);
      console.error('❌ Posts fetch error:', description, error);
      addToast(`Failed to load posts: ${description}`, 'error');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const counts = useMemo(() => {
    const active = posts.filter(p => !p.is_deleted);
    return {
      all: active.length,
      active: active.filter(p => (p.status || 'active').toLowerCase() === 'active').length,
      featured: active.filter(p => p.is_featured).length,
      takenDown: active.filter(p => (p.status || '').toLowerCase() === 'taken_down').length,
      trash: posts.filter(p => p.is_deleted).length,
    };
  }, [posts]);

  const displayedPosts = useMemo(() => {
    let filtered = posts;
    if (activeTab === 'Trash') {
      filtered = filtered.filter(p => p.is_deleted);
    } else {
      filtered = filtered.filter(p => !p.is_deleted);
      if (activeTab === 'Active') filtered = filtered.filter(p => { const st = (p.status || 'active').toLowerCase(); return st !== 'taken_down' && st !== 'archived'; });
      if (activeTab === 'Featured') filtered = filtered.filter(p => p.is_featured);
      if (activeTab === 'TakenDown') filtered = filtered.filter(p => (p.status || '').toLowerCase() === 'taken_down');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q) || (p.location_name || '').toLowerCase().includes(q));
    }
    return filtered;
  }, [posts, activeTab, searchQuery]);

  // ---------- Group displayed posts by company ----------
  interface CompanyGroup {
    key: string;
    companyName: string;
    industry: string | null;
    posts: OjtPost[];
  }
  const groupedPosts = useMemo<CompanyGroup[]>(() => {
    const map: Record<string, CompanyGroup> = {};
    for (const post of displayedPosts) {
      const key = post.company_id || post.company_name || 'unknown';
      if (!map[key]) {
        map[key] = {
          key,
          companyName: post.company_name || 'Unknown Company',
          industry: post.company_industry || null,
          posts: [],
        };
      }
      map[key].posts.push(post);
    }
    // Sort companies alphabetically by name
    return Object.values(map).sort((a, b) =>
      a.companyName.localeCompare(b.companyName, undefined, { sensitivity: 'base' })
    );
  }, [displayedPosts]);

  const hideConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));
  const showConfirm = (params: Omit<ConfirmState, 'open'>) => { setConfirmDialog({ ...params, open: true }); };

  const handleFeature = async (postId: string, featured: boolean) => {
    try {
      const { error } = await supabase.from('ojt_posts').update({ is_featured: !featured }).eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_featured: !featured } : p));
      addToast(featured ? 'Removed from featured' : 'Post featured ⭐', 'success');
      await logAuditAction({ action: featured ? 'post_unfeatured' : 'post_featured', target_type: 'post', target_id: postId });
    } catch (error: any) {
      addToast(error?.message || 'Failed to update post', 'error');
    }
  };

  const bulkFeature = async () => {
    const cnt = bulk.selectedIds.length;
    for (const id of bulk.selectedIds) {
      const post = posts.find(p => p.id === id);
      if (post) {
        try {
          const { error } = await supabase.from('ojt_posts').update({ is_featured: !post.is_featured }).eq('id', id);
          if (error) throw error;
          setPosts(prev => prev.map(p => p.id === id ? { ...p, is_featured: !post.is_featured } : p));
        } catch (err) { console.error('Bulk feature error:', err); }
      }
    }
    bulk.clear();
    addToast(`${cnt} posts updated`, 'success');
  };

  const bulkTakeDown = async () => {
    const cnt = bulk.selectedIds.length;
    for (const id of bulk.selectedIds) {
      try {
        const { error } = await supabase.from('ojt_posts').update({ status: 'taken_down' }).eq('id', id);
        if (error) throw error;
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'taken_down' } : p));
      } catch (err) { console.error('Bulk takeDown error:', err); }
    }
    bulk.clear();
    addToast(`${cnt} posts taken down`, 'info');
  };

  const bulkDelete = async () => {
    const cnt = bulk.selectedIds.length;
    for (const id of bulk.selectedIds) {
      try {
        const { error } = await supabase.from('ojt_posts').update({ is_deleted: true }).eq('id', id);
        if (error) throw error;
        setPosts(prev => prev.map(p => p.id === id ? { ...p, is_deleted: true } : p));
      } catch (err) { console.error('Bulk delete error:', err); }
    }
    bulk.clear();
    addToast(`${cnt} posts moved to trash`, 'info');
  };

  const handleTakeDown = async (postId: string) => {
    hideConfirm();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('ojt_posts').update({ status: 'taken_down' }).eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'taken_down' } : p));
      const post = posts.find(p => p.id === postId);
      try {
        if (post?.company_id) {
          const { data: company } = await supabase.from('companies').select('user_id').eq('id', post.company_id).maybeSingle();
          if (company?.user_id) {
            await supabase.from('notifications').insert({ user_id: company.user_id, title: 'Post Taken Down by Admin 🚫', message: `Your post "${post.title}" has been taken down by the administrator. Students will no longer see this post. Please contact admin if you have questions.`, type: 'admin_action', is_read: false, link_url: '/company_ojtpost' });
          }
        }
      } catch (e) { console.warn('⚠️ Company notify failed:', e); }
      try {
        const { data: acceptedApps } = await supabase.from('applications').select('student_id').eq('post_id', postId).in('status', ['Accepted', 'accepted', 'Active', 'active', 'Ongoing', 'ongoing']);
        for (const app of (acceptedApps || [])) {
          await supabase.from('notifications').insert({ user_id: app.student_id, title: 'OJT Post Taken Down 🚫', message: `The OJT post "${post?.title || 'your post'}" has been taken down by the administrator. Please check the map for other available OJT opportunities or contact your school coordinator.`, type: 'admin_action', is_read: false, link_url: '/map' });
          await supabase.from('applications').update({ status: 'Pending' }).eq('post_id', postId).eq('student_id', app.student_id);
          await supabase.from('profiles').update({ ojt_status: 'Unassigned', assigned_company: null }).eq('id', app.student_id);
        }
      } catch (e) { console.warn('⚠️ Student reset failed:', e); }
      await logAuditAction({ action: 'post_taken_down', target_type: 'post', target_id: postId });
      addToast('Post taken down — students will no longer see it', 'info');
    } catch (error: any) {
      addToast(error?.message || 'Failed to take down post', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (postId: string) => {
    hideConfirm();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('ojt_posts').update({ status: 'active', is_deleted: false }).eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'active', is_deleted: false } : p));
      await logAuditAction({ action: 'post_restored', target_type: 'post', target_id: postId });
      addToast('Post restored to active', 'success');
    } catch (error: any) {
      addToast(error?.message || 'Failed to restore post', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveToTrash = async (postId: string) => {
    hideConfirm();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('ojt_posts').update({ is_deleted: true }).eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_deleted: true } : p));
      const post = posts.find(p => p.id === postId);
      try {
        if (post?.company_id) {
          const { data: company } = await supabase.from('companies').select('user_id').eq('id', post.company_id).maybeSingle();
          if (company?.user_id) {
            await supabase.from('notifications').insert({ user_id: company.user_id, title: 'Post Deleted by Admin 🗑️', message: `Your post "${post.title}" has been moved to trash by the administrator.`, type: 'admin_action', is_read: false, link_url: '/company_ojtpost' });
          }
        }
      } catch (e) { console.warn('⚠️ Company notify failed:', e); }
      try {
        const { data: acceptedApps } = await supabase.from('applications').select('student_id').eq('post_id', postId).in('status', ['Accepted', 'accepted', 'Active', 'active', 'Ongoing', 'ongoing']);
        for (const app of (acceptedApps || [])) {
          await supabase.from('notifications').insert({ user_id: app.student_id, title: 'OJT Post Removed 🗑️', message: `The OJT post "${post?.title || 'your post'}" has been removed by the administrator. Please check the map for other available OJT opportunities.`, type: 'admin_action', is_read: false, link_url: '/map' });
          await supabase.from('applications').update({ status: 'Pending' }).eq('post_id', postId).eq('student_id', app.student_id);
          await supabase.from('profiles').update({ ojt_status: 'Unassigned', assigned_company: null }).eq('id', app.student_id);
        }
      } catch (e) { console.warn('⚠️ Student reset failed:', e); }
      await logAuditAction({ action: 'post_deleted', target_type: 'post', target_id: postId });
      addToast('Post moved to Trash 🗑️', 'info');
    } catch (error: any) {
      addToast(error?.message || 'Failed to move post to trash', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (postId: string) => {
    hideConfirm();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('ojt_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      addToast('Post permanently deleted', 'info');
    } catch (error: any) {
      addToast(error?.message || 'Failed to delete permanently', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return 'Unknown date';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const truncate = (s: string | null | undefined, n: number) => (s && s.length > n) ? s.slice(0, n) + '…' : (s || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-blue-50/95 border-blue-200 text-blue-800'}`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        ))}
      </div>

      {confirmDialog.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !actionLoading && hideConfirm()} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmDialog.confirmStyle === 'danger' ? 'bg-red-100' : confirmDialog.confirmStyle === 'primary' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <svg className={`w-5 h-5 ${confirmDialog.confirmStyle === 'danger' ? 'text-red-600' : confirmDialog.confirmStyle === 'primary' ? 'text-blue-600' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-5 pl-[52px]">{confirmDialog.message}</p>
            <div className="flex gap-2.5">
              <button onClick={hideConfirm} disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors">Cancel</button>
              <button onClick={() => confirmDialog.onConfirm()} disabled={actionLoading} className={`flex-1 px-4 py-2.5 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-lg disabled:opacity-50 ${confirmDialog.confirmStyle === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25' : confirmDialog.confirmStyle === 'primary' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/25'}`}>
                {actionLoading ? (<span className="flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Working...</span>) : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"><span className="text-white font-black text-lg">O</span></div>
            <div><span className="text-xl font-bold tracking-tight text-white">OJTly</span><p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p></div>
          </Link>
        </div>
        <nav className="px-3 space-y-0.5">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span className="flex-1">Dashboard</span>
          </Link>
          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
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
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span className="flex-1">Settings</span>
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">Admin User</p><p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p></div>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div><h1 className="text-sm sm:text-base font-bold text-slate-800">Company Posts</h1><p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Manage all OJT posts on the platform</p></div>
            </div>
            <div className="flex items-center gap-2">
              <AdminNotificationBell />
              <button onClick={() => fetchPosts()} disabled={loading} className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50" title="Refresh">
                <svg className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800">OJT Posts Management</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Feature, take down, or remove posts that violate platform guidelines.</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" placeholder="Search by post title, company name, or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50" />
            </div>
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
              {([ { key: 'All', label: 'All', count: counts.all }, { key: 'Active', label: 'Active', count: counts.active }, { key: 'Featured', label: '⭐ Featured', count: counts.featured }, { key: 'TakenDown', label: 'Taken Down', count: counts.takenDown }, { key: 'Trash', label: '🗑️ Trash', count: counts.trash } ] as { key: FilterTab; label: string; count: number }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} disabled={loading} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}>
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-200 rounded-xl"></div><div className="flex-1 space-y-2"><div className="h-4 bg-slate-200 rounded-lg w-3/4"></div><div className="h-3 bg-slate-100 rounded-lg w-1/2"></div></div><div className="h-8 bg-slate-200 rounded-lg w-20 hidden sm:block"></div></div></div>))}</div>
          ) : displayedPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 sm:p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4"><span className="text-3xl">{activeTab === 'Trash' ? '🗑️' : searchQuery ? '🔍' : activeTab === 'Featured' ? '⭐' : activeTab === 'TakenDown' ? '🚫' : '📭'}</span></div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">{activeTab === 'Trash' ? 'Trash is Empty' : searchQuery ? 'No results found' : activeTab === 'Featured' ? 'No featured posts' : activeTab === 'TakenDown' ? 'No taken-down posts' : 'No posts yet'}</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">{activeTab === 'Trash' ? 'Posts moved to trash will appear here.' : searchQuery ? `No posts matching "${searchQuery}".` : activeTab === 'Featured' ? 'Feature posts to highlight them at the top of student searches.' : activeTab === 'TakenDown' ? 'Posts you take down will appear here for restoration.' : 'Companies\' OJT posts will appear here once they publish them.'}</p>
              {searchQuery && (<button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Clear Search</button>)}
            </div>
          ) : (
            <div className="space-y-4">
              {/* ============ Company Selector Cards ============ */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Select Company</h3>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {/* "All Posts" card */}
                  <button
                    onClick={() => setSelectedCompany(null)}
                    className={`shrink-0 rounded-xl border-2 px-3 py-2.5 transition-all flex items-center gap-2.5 min-w-[150px] text-left ${
                      selectedCompany === null
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                      selectedCompany === null
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                        : 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
                    }`}>
                      All
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">All Posts</p>
                      <p className="text-[10px] text-slate-500 truncate">{displayedPosts.length} total posts</p>
                    </div>
                    {selectedCompany === null && (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        ✓
                      </div>
                    )}
                  </button>

                  {/* Company cards */}
                  {groupedPosts.map(group => {
                    const isSelected = selectedCompany === group.key;
                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedCompany(group.key)}
                        className={`shrink-0 rounded-xl border-2 px-3 py-2.5 transition-all flex items-center gap-2.5 min-w-[160px] text-left ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'
                        }`}>
                          {(group.companyName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{group.companyName}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {group.posts.length} post{group.posts.length !== 1 ? 's' : ''}
                            {group.industry ? ` · ${group.industry}` : ''}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============ Posts for selected company ============ */}
              <div className="space-y-3">
                {(selectedCompany === null
                  ? displayedPosts
                  : (groupedPosts.find(g => g.key === selectedCompany)?.posts || [])
                ).map(post => (
                <div key={post.id} className={`bg-white rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 sm:p-5 ${post.is_deleted ? 'border-slate-200 opacity-75' : post.status?.toLowerCase() === 'taken_down' ? 'border-amber-200 bg-amber-50/30' : post.is_featured ? 'border-amber-300 bg-amber-50/40' : 'border-slate-100'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 ${post.is_deleted ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600'}`}>{(post.company_name || '?').charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {post.is_featured && !post.is_deleted && (<span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">⭐ Featured</span>)}
                        {post.is_deleted ? (<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 border border-slate-300 uppercase">Archived</span>) : post.status?.toLowerCase() === 'taken_down' ? (<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200 uppercase">Taken Down</span>) : (<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Active</span>)}
                      </div>
                      <h3 className={`text-sm sm:text-base font-bold text-slate-800 truncate ${post.is_deleted ? 'line-through text-slate-500' : ''}`}>{post.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{post.company_name}{post.company_industry ? ` · ${post.company_industry}` : ''}</p>
                      {post.description && (<p className="text-xs text-slate-400 mt-1.5 line-clamp-2 hidden sm:block">{truncate(post.description, 180)}</p>)}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] sm:text-xs text-slate-400">
                        {post.location_name && (<span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>{post.location_name}</span>)}
                        {post.vacancies != null && (<span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>{post.vacancies} vacanc{post.vacancies === 1 ? 'y' : 'ies'}</span>)}
                        {post.work_type && (<span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>{post.work_type}</span>)}
                        <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>{(post.application_count ?? 0)} application{(post.application_count ?? 0) === 1 ? '' : 's'}</span>
                        <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:flex-col sm:items-stretch pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {post.is_deleted ? (
                        <div className="flex items-center gap-2 w-full">
                          <button onClick={() => showConfirm({ title: 'Restore Post', message: `Restore "${post.title}"? It will become visible to students again.`, confirmLabel: 'Restore', confirmStyle: 'primary', onConfirm: () => handleRestore(post.id) })} disabled={actionLoading} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            Restore
                          </button>
                          <button onClick={() => showConfirm({ title: 'Delete Permanently', message: `Permanently delete "${post.title}"? This CANNOT be undone.`, confirmLabel: 'Delete Forever', confirmStyle: 'danger', onConfirm: () => handlePermanentDelete(post.id) })} disabled={actionLoading} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            Delete Forever
                          </button>
                        </div>
                      ) : (
                        <>
                          <BulkCheckbox checked={bulk.isSelected(post.id)} onChange={() => bulk.toggle(post.id)} />
                          <button onClick={() => handleFeature(post.id, post.is_featured)} disabled={actionLoading} className={`flex-1 sm:w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${post.is_featured ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200' : 'bg-white hover:bg-amber-50 text-amber-600 border border-amber-200'}`}>
                            <span>{post.is_featured ? '⭐' : '☆'}</span>
                            {post.is_featured ? 'Unfeature' : 'Feature'}
                          </button>
                          {post.status?.toLowerCase() === 'taken_down' ? (
                            <button onClick={() => showConfirm({ title: 'Restore Post', message: `Restore "${post.title}" to active status? Students will see it again.`, confirmLabel: 'Restore', confirmStyle: 'primary', onConfirm: () => handleRestore(post.id) })} disabled={actionLoading} className="flex-1 sm:w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg transition-colors">↺ Restore</button>
                          ) : (
                            <button onClick={() => showConfirm({ title: 'Take Down Post', message: `Take down "${post.title}"? Students will no longer see this post.`, confirmLabel: 'Take Down', confirmStyle: 'danger', onConfirm: () => handleTakeDown(post.id) })} disabled={actionLoading} className="flex-1 sm:w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white text-xs font-semibold rounded-lg transition-colors">Take Down</button>
                          )}
                          <button onClick={() => showConfirm({ title: 'Move to Trash', message: `Move "${post.title}" to trash? It will be hidden from all views until restored.`, confirmLabel: 'Move to Trash', confirmStyle: 'danger', onConfirm: () => handleMoveToTrash(post.id) })} disabled={actionLoading} className="flex-1 sm:w-full px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}

          {!loading && posts.length > 0 && (<div className="text-center text-xs text-slate-400 pt-2">Showing {(selectedCompany === null ? displayedPosts.length : (groupedPosts.find(g => g.key === selectedCompany)?.posts.length || 0))} of {posts.length} total posts across {groupedPosts.length} compan{groupedPosts.length === 1 ? 'y' : 'ies'}</div>)}
        </div>
      </main>

      <BulkActionBar count={bulk.count} actions={[{ label: 'Feature', style: 'primary', onClick: bulkFeature }, { label: 'Take Down', style: 'danger', onClick: bulkTakeDown }, { label: 'Delete', style: 'danger', onClick: bulkDelete }]} onClear={bulk.clear} />

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <FloatingChatButton />

    </div>
  );
}
