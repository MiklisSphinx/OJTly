'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ============================================
// INTERFACES (Matches Supabase Schema)
// ============================================
type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};

interface OJTPost {
  id: string;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  duration_hours: number;
  skills: string[] | string;
  work_type: string;
  allowance_type: string;
  course_category: string;
  vacancies: number;
  status: string; // 'active', 'offline', 'closed'
  created_at: string;
  
  // From JOIN
  companies?: {
    id: string;
    company_name: string;
  };
}

// ============================================
// SVG ICON COMPONENTS
// ============================================
const LocationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Custom Logo for Admin
const AdminLogo = () => (
  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
    <span className="text-white font-black text-xl">O</span>
  </div>
);

export default function AdminCompanyPosts() {
  const router = useRouter();
  const supabase = createClient();
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'offline'>('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  // Data State
  const [posts, setPosts] = useState<OJTPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Action Loading States (per-post)
  const [actionLoading, setActionLoading] = useState<Record<string, 'offline' | 'online' | 'delete' | null>>({});

  // ============================================
  // FETCH ALL POSTS WITH COMPANY JOIN
  // ============================================
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('ojt_posts')
          .select('*, companies(company_name)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fetch error:', error.message);
          addToast('Failed to load posts', 'error');
          return;
        }

        console.log(`✅ Loaded ${data?.length || 0} posts`);
        setPosts(data || []);

      } catch (err) {
        console.error('Unexpected error:', err);
        addToast('Something went wrong', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // ============================================
  // TOAST HELPER
  // ============================================
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ============================================
  // TOGGLE OFFLINE / ONLINE (Supabase UPDATE)
  // ============================================
  const handleToggleStatus = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newStatus = post.status === 'active' ? 'offline' : 'active';
    const actionLabel = newStatus === 'active' ? 'Online' : 'Offline';

    // Set loading state
    setActionLoading(prev => ({ ...prev, [postId]: newStatus === 'active' ? 'online' : 'offline' }));

    try {
      // ✅ SUPABASE UPDATE
      const { error } = await supabase
        .from('ojt_posts')
        .update({ status: newStatus })
        .eq('id', postId);

      if (error) {
        console.error('Update error:', error.message);
        addToast(`Failed to update status: ${error.message}`, 'error');
        return;
      }

      // ✅ UI SYNC - Update local state immediately
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, status: newStatus } : p
      ));

      addToast(`"${post.title}" is now ${actionLabel}`, newStatus === 'active' ? 'success' : 'warning');

    } catch (err) {
      console.error('Toggle error:', err);
      addToast('Network error. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [postId]: null }));
    }
  };

  // ============================================
  // DELETE POST (Supabase DELETE)
  // ============================================
  const handleDeletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // ✅ WINDOW.CONFIRM before delete
    const confirmed = window.confirm(
      `Are you sure you want to delete "${post.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    // Set loading state
    setActionLoading(prev => ({ ...prev, [postId]: 'delete' }));

    try {
      // ✅ SUPABASE DELETE
      const { error } = await supabase
        .from('ojt_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Delete error:', error.message);
        addToast(`Delete failed: ${error.message}`, 'error');
        return;
      }

      // ✅ UI SYNC - Remove from local state immediately
      setPosts(prev => prev.filter(p => p.id !== postId));
      
      // Also remove from selection if selected
      setSelectedPosts(prev => prev.filter(id => id !== postId));

      addToast(`"${post.title}" has been deleted`, 'error');

    } catch (err) {
      console.error('Delete error:', err);
      addToast('Network error. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [postId]: null }));
    }
  };

  // ============================================
  // BULK ACTIONS
  // ============================================
  const handleBulkAction = async (action: 'activate' | 'offline' | 'delete') => {
    if (selectedPosts.length === 0) return;

    const actionLabel = action === 'activate' ? 'activate' : action === 'offline' ? 'set offline' : 'delete';
    
    // Confirm for bulk delete
    if (action === 'delete') {
      const confirmed = window.confirm(
        `Delete ${selectedPosts.length} post(s)?\n\nThis action cannot be undone.`
      );
      if (!confirmed) return;
    }

    try {
      if (action === 'delete') {
        // Bulk delete
        const { error } = await supabase
          .from('ojt_posts')
          .delete()
          .in('id', selectedPosts);

        if (error) throw error;

        // UI Sync
        setPosts(prev => prev.filter(p => !selectedPosts.includes(p.id)));
        addToast(`${selectedPosts.length} post(s) deleted`, 'error');

      } else {
        // Bulk status update
        const newStatus = action === 'activate' ? 'active' : 'offline';
        
        const { error } = await supabase
          .from('ojt_posts')
          .update({ status: newStatus })
          .in('id', selectedPosts);

        if (error) throw error;

        // UI Sync
        setPosts(prev => prev.map(p => 
          selectedPosts.includes(p.id) ? { ...p, status: newStatus } : p
        ));
        
        addToast(`${selectedPosts.length} post(s) ${actionLabel}d`, action === 'activate' ? 'success' : 'warning');
      }

      setSelectedPosts([]);

    } catch (err: any) {
      console.error('Bulk action error:', err);
      addToast(err?.message || 'Action failed', 'error');
    }
  };

  // ============================================
  // FILTER LOGIC
  // ============================================
  const filteredPosts = posts.filter(post => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      post.title.toLowerCase().includes(searchLower) ||
      (post.companies?.company_name || '').toLowerCase().includes(searchLower) ||
      post.location_name.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // ============================================
  // STATS - Auto-recalculates on state change!
  // ============================================
  const stats = {
    total: posts.length,
    active: posts.filter(p => p.status === 'active').length,
    offline: posts.filter(p => p.status === 'offline').length,
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(p => p.id));
    }
  };

  const toggleSelectOne = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  // Status config helper
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Active' };
      case 'offline':
        return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Offline' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500', label: status };
    }
  };

  // Format skills helper
  const formatSkills = (skills: string[] | string): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string' && skills) return skills.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading posts...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">

      {/* Toast Container */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50/95 border-amber-200 text-amber-800' :
              'bg-blue-50/95 border-blue-200 text-blue-800'
            }`}>
            <span className={`shrink-0 ${
              toast.type === 'success' ? 'text-emerald-600' :
              toast.type === 'error' ? 'text-red-600' :
              toast.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
            }`}>
              {toast.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> :
               toast.type === 'error' ? <XCircleIcon className="w-5 h-5" /> :
               toast.type === 'warning' ? <span className="font-bold text-sm">!</span> :
               <span className="font-bold text-sm">i</span>}
            </span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-[#0f172a] text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        
        <div className="p-6 pb-4">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
            <AdminLogo />
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-tight">OJTly</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="px-4 space-y-1 mt-2">
          <p className="px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Main</p>
          
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-3 bg-[#1e293b] rounded-xl font-medium text-white border border-white/5">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span className="flex-1">Company Posts</span>
            <span className="bg-indigo-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{stats.active}</span>
          </Link>

          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <span>Company Approvals</span>
          </Link>

          <p className="px-4 pt-5 pb-2 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Analytics</p>

          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Reports</span>
          </Link>

          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen">
        
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-800">Company Posts</h1>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Manage all OJT job postings</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 sm:p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-[18px] h-[18px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md">A</div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">

          {/* STATS DASHBOARD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Total Posts Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-slate-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-semibold opacity-80 uppercase tracking-wider">Total Posts</p>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                </div>
                <p className="text-4xl sm:text-5xl font-black tracking-tight">{stats.total}</p>
                <p className="text-xs sm:text-sm mt-2 opacity-60">All job postings</p>
              </div>
            </div>

            {/* Active Posts Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-500/30">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-semibold opacity-90 uppercase tracking-wider">Active</p>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <CheckCircleIcon />
                  </div>
                </div>
                <p className="text-4xl sm:text-5xl font-black tracking-tight">{stats.active}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <p className="text-xs sm:text-sm opacity-80">Live postings</p>
                </div>
              </div>
            </div>

            {/* Offline Posts Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-gray-400/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-semibold opacity-90 uppercase tracking-wider">Offline</p>
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <XCircleIcon />
                  </div>
                </div>
                <p className="text-4xl sm:text-5xl font-black tracking-tight">{stats.offline}</p>
                <p className="text-xs sm:text-sm mt-2 opacity-70">Inactive postings</p>
              </div>
            </div>

          </div>

          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input
                    type="text"
                    placeholder="Search posts or companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="all">All Status ({stats.total})</option>
                  <option value="active">Active ({stats.active})</option>
                  <option value="offline">Offline ({stats.offline})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedPosts.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in bg-indigo-50 px-3 py-2 rounded-xl">
                    <span className="text-xs font-semibold text-indigo-700">{selectedPosts.length} selected</span>
                    <button onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">
                      Activate
                    </button>
                    <button onClick={() => handleBulkAction('offline')} className="px-3 py-1.5 bg-gray-500 text-white text-xs font-semibold rounded-lg hover:bg-gray-600 transition-colors shadow-sm">
                      Offline
                    </button>
                    <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-slate-500">
              Showing <span className="font-bold text-slate-800">{filteredPosts.length}</span> of <span className="font-bold text-slate-800">{stats.total}</span> posts
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors">
                Clear search
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* GRID VIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredPosts.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <p className="font-bold text-lg text-slate-700">No posts found</p>
                <p className="text-sm text-slate-400 mt-1.5">Try adjusting your search or filter</p>
                {(searchQuery || statusFilter !== 'all') && (
                  <button 
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                    className="mt-4 px-5 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/25"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => {
                const statusCfg = getStatusConfig(post.status);
                const isSelected = selectedPosts.includes(post.id);
                const isLoading = !!actionLoading[post.id];
                const skillsList = formatSkills(post.skills);
                
                return (
                  <div key={post.id} className={`group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-200 shadow-lg' : ''} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
                    
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(post.id);
                      }}
                      disabled={isLoading}
                      className={`absolute top-3.5 left-3.5 z-10 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' 
                          : 'border-slate-200 bg-white opacity-0 group-hover:opacity-100 hover:border-indigo-400'
                      }`}
                    >
                      {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </button>

                    {/* Status Badge */}
                    <div className={`absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                      {statusCfg.label}
                    </div>

                    {/* Loading Overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                        <SpinnerIcon />
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-5 pt-11">
                      
                      {/* Title */}
                      <h3 className="font-bold text-base text-slate-800 leading-snug mb-1.5 group-hover:text-indigo-600 transition-colors pr-16 line-clamp-1">{post.title}</h3>
                      
                      {/* Company Name from JOIN */}
                      <p className="text-sm text-teal-600 font-semibold mb-5 truncate">
                        {post.companies?.company_name || 'Unknown Company'}
                      </p>

                      {/* Info Items */}
                      <div className="space-y-3.5 mb-5">
                        
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                            <LocationIcon />
                          </div>
                          <span className="text-sm text-slate-700 truncate">{post.location_name || 'Not specified'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                            <ClockIcon />
                          </div>
                          <span className="text-sm text-slate-700">{post.duration_hours || 0} Hours</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                            <DollarIcon />
                          </div>
                          <span className={`text-sm font-medium ${post.allowance_type === 'Paid' ? 'text-green-600 font-semibold' : 'text-slate-600'}`}>{post.allowance_type || 'Unpaid'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                            <CodeIcon />
                          </div>
                          <span className="text-sm text-slate-700 truncate">{skillsList.slice(0, 3).join(', ') || 'Not specified'}{skillsList.length > 3 ? ` (+${skillsList.length - 3})` : ''}</span>
                        </div>

                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">{post.description || 'No description available.'}</p>

                      {/* Date */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-4 pb-4 border-b border-slate-100">
                        <CalendarIcon />
                        <span>Posted {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2">
                        
                        {/* Vacancies Count */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                            <UsersIcon />
                          </div>
                          <span className="font-bold text-teal-700 text-sm">{post.vacancies || 1} Slot{(post.vacancies || 1) > 1 ? 's' : ''}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleStatus(post.id)}
                            disabled={isLoading}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              isLoading ? 'cursor-not-allowed opacity-50' :
                              post.status === 'active' 
                                ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' 
                                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                            }`}
                            title={post.status === 'active' ? 'Set offline' : 'Set active'}
                          >
                            {actionLoading[post.id] === 'offline' || actionLoading[post.id] === 'online' ? (
                              <SpinnerIcon />
                            ) : post.status === 'active' ? (
                              <XCircleIcon />
                            ) : (
                              <CheckCircleIcon />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={isLoading}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ${
                              isLoading ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                            title="Delete post"
                          >
                            {actionLoading[post.id] === 'delete' ? (
                              <SpinnerIcon />
                            ) : (
                              <TrashIcon />
                            )}
                          </button>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}