'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Types
type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

type Student = {
  id: string;
  full_name: string;
  email: string;
  course: string | null;
  ojt_status?: string; // ✅ Correct property name
};

type Company = {
  id: string;
  company_name: string;
  industry?: string;
  email?: string;
  status?: string;
  post_count: number;
};

type Post = {
  id: string;
  title: string;
  company_id?: string;
  company_name?: string;
  status: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [animatedCards, setAnimatedCards] = useState(false);
  
  // Stats State
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);

  type ActiveView = 'students' | 'companies' | null;
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedCards(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ==========================================
  // ✅ MAIN FETCH - All errors fixed here
  // ==========================================
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStats(true);
      try {
        const supabase = createClient();

        // STUDENT FETCH
        console.log('📚 Fetching students...');
        
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('id, full_name, email, course, ojt_status')
          .eq('role', 'student')
          .order('full_name', { ascending: true });

        if (studentsError) {
          console.error("❌ Student DB Error:", studentsError.message, studentsError.hint);
          throw new Error(`Student fetch failed: ${studentsError.message}`);
        }

        console.log(`✅ Raw student data:`, studentsData?.length || 0, 'records');

        // Safe mapping
        const normalizedStudents: Student[] = (studentsData || []).map((p: Record<string, any>) => ({
          id: p.id || '',
          full_name: p.full_name || 'Unknown Student',
          email: p.email || 'No Email',
          course: p.course || null,
          ojt_status: p.ojt_status || 'Not Started'
        }));

        console.log('🎓 Mapped students:', normalizedStudents.length);
        
        setStudents(normalizedStudents);
        setTotalStudents(normalizedStudents.length);

        // COMPANY FETCH
        console.log('🏢 Fetching companies...');
        
        const { data: companiesRaw, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            company_name,
            industry,
            email,
            status,
            ojt_posts(count)
          `)
          .order('company_name', { ascending: true });

        if (companiesError) {
          console.error("❌ Company DB Error:", companiesError.message, companiesError.hint);
          throw new Error(`Company fetch failed: ${companiesError.message}`);
        }

        // ✅ FIXED: Proper type handling for Supabase count relation
        const normalizedCompanies: Company[] = (companiesRaw || []).map((c: Record<string, any>) => {
          const postsRel = c.ojt_posts;
          let count = 0;
          
          if (!postsRel) {
            count = 0;
          } else if (Array.isArray(postsRel)) {
            count = postsRel.length;
            if (postsRel.length > 0 && typeof postsRel[0] === 'object' && 'count' in postsRel[0]) {
              count = postsRel[0].count || 0;
            }
          } else if (typeof postsRel === 'object' && 'count' in postsRel) {
            count = (postsRel as { count: number }).count || 0;
          }
          
          return {
            id: c.id || '',
            company_name: c.company_name || 'Unnamed',
            industry: c.industry || null,
            email: c.email || null,
            status: c.status || 'Pending',
            post_count: count
          };
        });

        setCompanies(normalizedCompanies);
        setTotalCompanies(normalizedCompanies.length);

        // POSTS FETCH
        console.log('📋 Fetching posts...');
        
        try {
          const { data: postsData, error: postsError } = await supabase
            .from('ojt_posts')
            .select('id, title, company_id, status, company:company_id(company_name)')
            .order('created_at', { ascending: false })
            .limit(10);

          if (postsError) {
            console.error("❌ Posts Error:", postsError.message, postsError.hint);
            setPosts([]);
          } else if (postsData && Array.isArray(postsData)) {
            const mappedPosts: Post[] = postsData.map((p: Record<string, any>) => ({
              id: p.id,
              title: p.title || 'Untitled',
              company_id: p.company_id,
              // ✅ FIXED: Safe navigation for company relation
              company_name: (() => {
                const comp = p.company;
                if (!comp) return 'Unknown';
                if (Array.isArray(comp)) return comp[0]?.company_name || 'Unknown';
                return comp?.company_name || 'Unknown';
              })(),
              status: p.status || 'Active'
            }));
            setPosts(mappedPosts);
          }
        } catch (err) {
          console.error("⚠️ Posts non-critical error:", err);
          setPosts([]);
        }

      } catch (error) {
        console.error("💥 DASHBOARD ERROR:", error instanceof Error ? error.message : error);
        addToast(error instanceof Error ? error.message : 'Failed to load dashboard', 'error');
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchInitialData();
    
    const interval = setInterval(fetchInitialData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // ✅ REFRESH FUNCTIONS - All variable name errors fixed
  // ==========================================
  const refreshStudents = async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, course, ojt_status')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

      if (error) {
        console.error("Refresh Student Error:", error.message, error.hint);
        throw error;
      }

      // ✅ Use consistent variable naming
      const normalized: Student[] = (data || []).map((p: Record<string, any>) => ({
        id: p.id || '',
        full_name: p.full_name || 'Unknown',
        email: p.email || 'No Email',
        course: p.course || null,
        ojt_status: p.ojt_status || 'Not Started'
      }));

      setStudents(normalized);
      setTotalStudents(normalized.length);
      
    } catch (err) {
      console.error("Refresh failed:", err);
      addToast('Failed to refresh students', 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  const refreshCompanies = async () => {
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      
      // ✅ FIX 1: Changed to 'data' (not 'companiesData') to match destructuring
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, industry, email, status, ojt_posts(count)')
        .order('company_name', { ascending: true });

      if (error) {
        console.error("Refresh Company Error:", error.message, error.hint);
        throw error;
      }

      // ✅ FIX 2: Added explicit type annotation for parameter 'c'
      // ✅ FIX 3 & 4: Named variable 'normalizedCompanies' (not 'normalized') to match usage below
      const normalizedCompanies: Company[] = (data || []).map((c: Record<string, any>) => {
        const postsRel = c.ojt_posts;
        let count = 0;
        
        if (!postsRel) {
          count = 0;
        } else if (Array.isArray(postsRel)) {
          count = postsRel.length;
          if (postsRel.length > 0 && typeof postsRel[0] === 'object' && 'count' in postsRel[0]) {
            count = postsRel[0].count || 0;
          }
        } else if (typeof postsRel === 'object' && 'count' in postsRel) {
          count = (postsRel as { count: number }).count || 0;
        }
        
        return {
          id: c.id || '',
          company_name: c.company_name || 'Unnamed',
          industry: c.industry || null,
          email: c.email || null,
          status: c.status || 'Pending',
          post_count: count
        };
      });

      // ✅ Now using correct variable name 'normalizedCompanies'
      setCompanies(normalizedCompanies);
      setTotalCompanies(normalizedCompanies.length);
      
    } catch (err) {
      console.error("Refresh failed:", err);
      addToast('Failed to refresh companies', 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  // Handle Card Click
  const handleCardClick = (view: ActiveView) => {
    if (activeView === view) {
      setActiveView(null); 
      setSearchQuery('');
    } else {
      setActiveView(view);
      setSearchQuery(''); 
      
      if (view === 'students') refreshStudents();
      if (view === 'companies') refreshCompanies();
    }
  };

  // Filtered Data
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.full_name.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(c => 
      c.company_name.toLowerCase().includes(q) || 
      c.industry?.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Action Handlers
  const handlePostAction = async (postId: string, action: 'activate' | 'close') => {
    try {
      const supabase = createClient();
      const newStatus = action === 'activate' ? 'Active' : 'Closed';
      const { error } = await supabase.from('ojt_posts').update({ status: newStatus }).eq('id', postId);
      
      if (error) throw error;

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
      addToast(`Post ${action}d`, action === 'activate' ? 'success' : 'error');
    } catch (err) {
      addToast('Failed to update post', 'error');
    }
  };

  const handleStudentAction = async (studentId: string, action: 'delete') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ status: 'deactivated' }).eq('id', studentId);
      if (error) throw error;
      
      setStudents(prev => {
        const updated = prev.filter(s => s.id !== studentId);
        setTotalStudents(updated.length);
        return updated;
      });
      addToast('Student deactivated', 'error');
    } catch (err) {
      addToast('Failed to deactivate student', 'error');
    }
  };

  const handleCompanyAction = async (companyId: string, action: 'verify' | 'deactivate' | 'delete') => {
    try {
      const supabase = createClient();
      
      if (action === 'delete') {
        const { error } = await supabase.from('companies').delete().eq('id', companyId);
        if (error) throw error;
        
        setCompanies(prev => {
          const updated = prev.filter(c => c.id !== companyId);
          setTotalCompanies(updated.length);
          return updated;
        });
        addToast('Company deleted', 'error');
        return;
      }

      const newStatus = action === 'verify' ? 'verified' : 'inactive';
      const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', companyId);
      if (error) throw error;

      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus } : c));
      addToast(`Company ${action}d`, action === 'verify' ? 'success' : 'error');
    } catch (err) {
      addToast(`Failed to ${action} company`, 'error');
    }
  };

  // Helpers
  const getStatusStyle = (status: string | undefined | null): string => {
    if (!status) return 'bg-slate-50 text-slate-600 border-slate-200';
    
    switch (status.toLowerCase()) {
      case 'active': case 'verified': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'closed': case 'inactive': case 'deactivated': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'pending': case 'draft': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="font-semibold text-slate-700 text-base">{title}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-[250px] leading-relaxed">{description}</p>
    </div>
  );

  // Loading State
  if (isLoadingStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      {/* Toast Container */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
              'bg-blue-50/95 border-blue-200 text-blue-800'
            }`}>
            <span className="text-sm font-bold">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
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
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5">
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>
          
          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="flex-1">Company Posts</span>
            <span className="text-[10px] bg-indigo-500/90 text-white px-2 py-0.5 rounded-full font-bold">{posts.filter(p => p.status === 'Active').length}</span>
          </Link>

          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span className="flex-1">Company Approvals</span>
          </Link>

          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>
          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Reports
          </Link>
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all duration-200 w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Dashboard</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Overview of all activities</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="relative p-2 sm:p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </svg>
              </button>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 ml-0.5">A</div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-2">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Welcome back, Admin 👋</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Platform overview at a glance.</p>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            
            {/* Students Card */}
            <div 
              onClick={() => handleCardClick('students')} 
              className={`bg-white rounded-xl sm:rounded-2xl border-2 shadow-sm p-4 sm:p-6 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                animatedCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              } ${
                activeView === 'students' 
                  ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-100' 
                  : 'border-slate-100 hover:border-indigo-200 hover:-translate-y-1'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Students</p>
                    {activeView === 'students' && (
                      <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">VIEWING</span>
                    )}
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold text-slate-800 mt-1 sm:mt-2 tracking-tight">
                    {totalStudents.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-indigo-500 font-medium mt-1 sm:mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    {activeView === 'students' ? `${filteredStudents.length} shown` : `${totalStudents} registered`}
                  </p>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${activeView === 'students' ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
                  <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${activeView === 'students' ? 'text-indigo-600' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </div>
              </div>
            </div>

            {/* Companies Card */}
            <div 
              onClick={() => handleCardClick('companies')} 
              className={`bg-white rounded-xl sm:rounded-2xl border-2 shadow-sm p-4 sm:p-6 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                animatedCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              } ${
                activeView === 'companies' 
                  ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-100' 
                  : 'border-slate-100 hover:border-purple-200 hover:-translate-y-1'
              }`} 
              style={{ transitionDelay: '80ms' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Companies</p>
                    {activeView === 'companies' && (
                      <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">VIEWING</span>
                    )}
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold text-slate-800 mt-1 sm:mt-2 tracking-tight">
                    {totalCompanies.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-purple-500 font-medium mt-1 sm:mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    {activeView === 'companies' ? `${filteredCompanies.length} shown` : `${totalCompanies} partners`}
                  </p>
                </div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${activeView === 'companies' ? 'bg-purple-100' : 'bg-purple-50'}`}>
                  <svg className={`w-6 h-6 sm:w-7 sm:h-7 ${activeView === 'companies' ? 'text-purple-600' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Table Section */}
          {activeView && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${activeView === 'students' ? 'bg-indigo-50' : 'bg-purple-50'}`}>
                      {activeView === 'students' ? (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                      {activeView === 'students' ? 'Student Directory' : 'Company Directory'}
                    </h3>
                  </div>
                  
                  <button 
                    onClick={() => { setActiveView(null); setSearchQuery(''); }} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input 
                    type="text" 
                    placeholder={`Search ${activeView === 'students' ? 'students...' : 'companies...'}`} 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Showing {activeView === 'students' ? filteredStudents.length : filteredCompanies.length} of {activeView === 'students' ? students.length : companies.length}</span>
                  {searchQuery && (
                    <span className={activeView === 'students' ? 'text-indigo-600' : 'text-purple-600'} font-medium>
                      Filtered by "{searchQuery}"
                    </span>
                  )}
                </div>
              </div>

              {/* Table Content */}
              <div className="p-2.5 sm:p-4 max-h-[500px] overflow-y-auto">
                {isLoadingList ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                ) : activeView === 'students' ? (
                  filteredStudents.length === 0 ? (
                    <EmptyState 
                      icon={searchQuery ? "🔍" : "👨‍🎓"} 
                      title={searchQuery ? "No students found" : "No students registered"} 
                      description={searchQuery ? "Try adjusting your search terms" : "Students will appear here once they sign up"} 
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Course</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">OJT Status</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                    {(student?.full_name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-xs sm:text-sm text-slate-800">
                                      {student?.full_name || 'Unknown'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                      {student?.email || 'No email'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span className={`text-xs font-medium ${
                                  !student?.course 
                                    ? 'text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200' 
                                    : 'text-slate-600'
                                }`}>
                                  {student?.course || 'Not Enrolled'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {/* ✅ FIX 5: Fixed typo oj_status -> ojt_status */}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(student?.ojt_status)}`}>
                                  {student?.ojt_status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleStudentAction(student.id, 'delete')} 
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100" 
                                  title="Deactivate Account"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  filteredCompanies.length === 0 ? (
                    <EmptyState 
                      icon={searchQuery ? "🔍" : "🏢"} 
                      title={searchQuery ? "No companies found" : "No companies registered"} 
                      description={searchQuery ? "Try adjusting your search terms" : "Companies will appear here once they sign up"} 
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Industry</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Posts</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredCompanies.map((company) => (
                            <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
                                    {(company?.company_name || 'C').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-xs sm:text-sm text-slate-800">{company?.company_name || 'Unnamed'}</p>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{company?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <span className="text-xs text-slate-600 font-medium">{company?.industry || 'General'}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">
                                  {company?.post_count ?? 0}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(company?.status)}`}>
                                  {company?.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(company?.status === 'Pending' || company?.status === 'Inactive') && (
                                    <button 
                                      onClick={() => handleCompanyAction(company.id, 'verify')} 
                                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all" 
                                      title="Verify Company"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </button>
                                  )}
                                  {(company?.status === 'Active' || company?.status === 'Verified') && (
                                    <button 
                                      onClick={() => handleCompanyAction(company.id, 'deactivate')} 
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all" 
                                      title="Deactivate Company"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                    </button>
                                  )}
                                  
                                  <button 
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete "${company?.company_name}"? This cannot be undone.`)) {
                                        handleCompanyAction(company.id, 'delete');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-700 transition-all"
                                    title="Delete Company Permanently"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {!activeView && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800">Recent Company Posts</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{posts.length} total</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{posts.filter(p => p.status === 'Active').length} active</span>
                </div>
              </div>
              
              <div className="p-2.5 sm:p-4">
                {posts.length === 0 ? (
                  <EmptyState icon="📝" title="No posts yet" description="Companies haven't created any OJT posts." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Job Title</th>
                          <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Company</th>
                          <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {posts.slice(0, 5).map((post) => (
                          <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                                  {post?.title || 'Untitled'}
                                </p>
                                <p className="text-[10px] text-slate-400 sm:hidden mt-0.5">{post?.company_name || 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <p className="text-xs text-slate-600 font-medium">{post?.company_name || 'Unknown'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(post?.status)}`}>
                                {post?.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handlePostAction(post.id, post?.status === 'Active' ? 'close' : 'activate')} 
                                  className={`p-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                    post?.status === 'Active' 
                                      ? 'hover:bg-red-50 text-slate-400 hover:text-red-600' 
                                      : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                                  }`}
                                  title={post?.status === 'Active' ? 'Close post' : 'Activate post'}
                                >
                                  {post?.status === 'Active' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}