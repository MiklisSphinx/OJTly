'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ==========================================
// INTERFACES
// ==========================================
interface JobPost {
  id: string;
  title: string;
  status: string;
  created_at: string;
  description?: string;
  location?: string;
  company_id?: string;
  applicant_count?: number;
  approved_count?: number;
  rejected_count?: number;
}

interface DashboardStats {
  totalPosts: number;
  totalApplications: number;
  approved: number;
  rejected: number;
}

export default function CompanyDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalApplications: 0,
    approved: 0,
    rejected: 0
  });
  const [companyName, setCompanyName] = useState('Company');
  const [companyInitial, setCompanyInitial] = useState('C');
  
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [companyRecordId, setCompanyRecordId] = useState<string | null>(null);
  const [foundStatuses, setFoundStatuses] = useState<string[]>([]);
  
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    return () => setIsMounted(false);
  }, []);

  // ==========================================
  // AUTH & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session?.user) {
          router.push('/company/login');
          return;
        }

        const user = session.user;
        
        if (!isMounted) return;
        
        setAuthUserId(user.id);
        setCompanyInitial(user.email?.charAt(0).toUpperCase() || 'C');

        const companyId = await fetchCompanyId(user.id);
        
        if (!companyId) {
          if (isMounted) setLoading(false);
          return;
        }

        if (!isMounted) return;
        setCompanyRecordId(companyId);

        await fetchCompanyName(companyId);

        await Promise.all([
          fetchStats(companyId),
          fetchPostsWithCounts(companyId)
        ]);

      } catch (error) {
        console.error('💥 Dashboard init crash:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  const fetchCompanyId = async (userId: string): Promise<string | null> => {
    try {
      let { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (company?.id) return company.id;

      ({ data: company } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single());

      return company?.id || null;

    } catch (err) {
      console.error('Company lookup failed:', err);
      return null;
    }
  };

  const fetchCompanyName = async (companyId: string) => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, name')
        .eq('id', companyId)
        .single();

      if (company && isMounted) {
        setCompanyName(company.company_name || company.name || 'Company');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, full_name')
        .eq('id', companyId)
        .single();

      if (profile && isMounted) {
        setCompanyName(profile.company_name || profile.full_name || 'Company');
      }
    } catch (e) {
      console.warn('Could not fetch company name:', e);
    }
  };

  // ==========================================
  // ✅ FIXED: Stats - Properly structured!
  // ==========================================
  const fetchStats = async (companyId: string) => {
    console.log('📊 Fetching stats...');

    try {
      // Step 1: Total Posts
      const { count: totalPosts } = await supabase
        .from('ojt_posts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Step 2: Get Post IDs
      const { data: companyPosts } = await supabase
        .from('ojt_posts')
        .select('id')
        .eq('company_id', companyId);

      const postIds = companyPosts?.map((p: { id: string }) => p.id) || [];
      
      if (postIds.length === 0 && isMounted) {
        setStats({ 
          totalPosts: totalPosts ?? 0,
          totalApplications: 0, 
          approved: 0,
          rejected: 0 
        });
        return;
      }

      // Step 3: Count ALL applications
      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);

      // Step 4: Count APPROVED
      const { count: approvedExact } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
        .or(
          'status.eq.approved,status.eq.Approved,status.eq.APPROVED,' +
          'status.eq.accepted,status.eq.Accepted,status.eq.ACCEPTED,' +
          'status.eq.hired,status.eq.Hired,status.eq.HIRED,' +
          'status.eq.confirmed,status.eq.Confirmed,status.eq.CONFIRMED,' +
          'status.eq.active,status.eq.enrolled'
        );

      let finalApproved = approvedExact ?? 0;

      // Step 5: Count REJECTED 🔴
      const { count: rejectedExact } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
        .or(
          'status.eq.rejected,status.eq.Rejected,status.eq.REJECTED,' +
          'status.eq.declined,status.eq.Declined,status.eq.DECLINED,' +
          'status.eq.denied,status.eq.Denied,status.eq.DENIED,' +
          'status.eq.unsuccessful,status.eq.Withdrawn'
        );

      let finalRejected = rejectedExact ?? 0;

      // Fuzzy fallback for both counts
      if ((finalApproved === 0 || finalRejected === 0) && (totalApplications ?? 0) > 0) {
        console.log('⚠️ Trying fuzzy status match...');
        
        const { data: allApps } = await supabase
          .from('applications')
          .select('status')
          .in('post_id', postIds);

        // ✅ FIX #3: Cast Supabase data to correct type to match useState<string[]>
        const typedApps = allApps as { status: string }[] | null;

        if (typedApps && isMounted) {
          const uniqueStatuses = [...new Set(typedApps.map((a) => a.status).filter(Boolean))];
          // ✅ FIX #2: Use type assertion and typed map parameter
          setFoundStatuses(uniqueStatuses as string[]);
        }

        finalApproved = (typedApps || []).filter((app) => {
          const s = (app.status || '').toLowerCase().trim();
          return ['approved', 'accepted', 'hired', 'confirmed', 'enrolled', 'active'].some(
            (valid: string) => s.includes(valid) || s === valid
          );
        }).length;

        finalRejected = (typedApps || []).filter((app) => {
          const s = (app.status || '').toLowerCase().trim();
          return ['rejected', 'declined', 'denied', 'unsuccessful', 'withdrawn'].some(
            (valid: string) => s.includes(valid) || s === valid
          );
        }).length;
      }

      if (isMounted) {
        setStats({
          totalPosts: totalPosts ?? 0,
          totalApplications: totalApplications ?? 0,
          approved: finalApproved,
          rejected: finalRejected
        });
      }

      console.log('🎯 Final Stats:', { 
        posts: totalPosts, 
        apps: totalApplications, 
        approved: finalApproved,
        rejected: finalRejected
      });

    } catch (error) {
      console.error('💥 Stats crash:', error);
    }
  };

  // ==========================================
  // Posts with Counts
  // ==========================================
  const fetchPostsWithCounts = async (companyId: string) => {
    try {
      const { data: jobPosts, error } = await supabase
        .from('ojt_posts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !jobPosts?.length) {
        if (isMounted) setPosts([]);
        return;
      }

      const enrichedPosts = await Promise.all(
        jobPosts.map(async (post: JobPost) => {
          const { data: apps } = await supabase
            .from('applications')
            .select('status')
            .eq('post_id', post.id);

          // ✅ FIX #3: Cast Supabase data to correct type
          const typedApps = apps as { status: string }[] | null;
          
          const applicantCount = typedApps?.length || 0;
          
          const approvedCount = typedApps?.filter((app) => {
            const s = (app.status || '').toLowerCase().trim();
            return ['approved', 'accepted', 'hired', 'confirmed', 'enrolled', 'active'].some(
              (status: string) => s.includes(status) || s === status
            );
          }).length || 0;

          const rejectedCount = typedApps?.filter((app) => {
            const s = (app.status || '').toLowerCase().trim();
            return ['rejected', 'declined', 'denied', 'unsuccessful', 'withdrawn'].some(
              (status: string) => s.includes(status) || s === status
            );
          }).length || 0;

          return {
            ...post,
            applicant_count: applicantCount,
            approved_count: approvedCount,
            rejected_count: rejectedCount
          };
        })
      );

      if (isMounted) setPosts(enrichedPosts);

    } catch (err) {
      console.error('Posts fetch crashed:', err);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'open':
      case 'published':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'closed':
      case 'filled':
      case 'expired':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'draft':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (['active', 'open', 'published'].includes(s)) return '●';
    if (['closed', 'filled', 'expired'].includes(s)) return '○';
    return '◐';
  };

  const formatStatus = (status: string) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'Unknown';
  };

  const approvalRate = (() => {
    if (!stats.totalApplications || stats.totalApplications === 0) return 0;
    return Math.round((stats.approved / stats.totalApplications) * 100);
  })();

  const rejectionRate = (() => {
    if (!stats.totalApplications || stats.totalApplications === 0) return 0;
    return Math.round((stats.rejected / stats.totalApplications) * 100);
  })();

  const pendingCount = Math.max(0, (stats.totalApplications ?? 0) - stats.approved - stats.rejected);

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure?')) return;
    
    try {
      const { error } = await supabase.from('ojt_posts').delete().eq('id', postId);
      if (error) throw error;
      
      if (companyRecordId) {
        await Promise.all([fetchStats(companyRecordId), fetchPostsWithCounts(companyRecordId)]);
      }
    } catch (error) {
      alert('Failed to delete.');
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </Link>

          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            My OJT Posts
          </Link>

          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Create Post
          </Link>

          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Applicants
          </Link>

          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Documents
          </Link>

          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
           <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 rounded-lg font-medium transition-colors w-full text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="lg:ml-64 min-h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-bold text-slate-800 hidden lg:block">Dashboard</h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{companyName}</span>
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold border-2 border-white shadow-sm">
                {companyInitial}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, {companyName}</h2>
            <p className="text-slate-500 mt-1">Here's how your OJT program is performing.</p>
            
            {foundStatuses.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block max-w-full overflow-x-auto">
                <p className="text-xs font-semibold text-blue-800 mb-1">🔍 Status Values Found:</p>
                <div className="flex flex-wrap gap-1">
                  {foundStatuses.map((s: string, i: number) => (
                    <span key={i} className={`px-2 py-0.5 bg-white border rounded text-[10px] font-mono ${
                      ['rejected','declined','denied'].some((r: string) => s.toLowerCase().includes(r))
                        ? 'border-red-200 text-red-700' 
                        : ['approved','accepted','hired'].some((a: string) => s.toLowerCase().includes(a))
                          ? 'border-emerald-200 text-emerald-700'
                          : 'border-blue-200 text-blue-700'
                    }`}>
                      "{s}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STATS GRID - 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Card 1: Total Posts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Posts</p>
                <p className="text-3xl font-bold text-slate-800 mt-0.5">{stats.totalPosts}</p>
                <p className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                  {/* ✅ FIX #1: Explicitly type parameter p as any */}
                  {posts.filter((p: any) => ['active','open','published'].includes(p.status?.toLowerCase())).length} active
                </p>
              </div>
            </div>

            {/* Card 2: Total Applications */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Applications</p>
                <p className="text-3xl font-bold text-slate-800 mt-0.5">{stats.totalApplications}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Total received
                </p>
              </div>
            </div>

            {/* Card 3: Approved ✅ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
              {stats.approved > 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
              )}
              
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 relative z-10">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-slate-500 font-medium">Approved</p>
                <p className={`text-3xl font-bold mt-0.5 ${stats.approved > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {stats.approved}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${stats.approved > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  {approvalRate}% rate
                </p>
              </div>
            </div>

            {/* Card 4: Rejected 🔴 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
              {stats.rejected > 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
              )}
              
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0 relative z-10">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-slate-500 font-medium">Rejected</p>
                <p className={`text-3xl font-bold mt-0.5 ${stats.rejected > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {stats.rejected}
                </p>
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${stats.rejected > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  {rejectionRate}% rate
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(stats.totalApplications > 0) && (
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 text-xs font-medium flex-wrap">
                <span className="text-slate-400">Breakdown:</span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  {stats.approved} Accepted
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {stats.rejected} Rejected
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  {pendingCount} Pending Review
                </span>
              </div>
              
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                {stats.totalApplications > 0 && (
                  <>
                    <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${approvalRate}%` }} title={`${stats.approved} accepted`}></div>
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${rejectionRate}%` }} title={`${stats.rejected} rejected`}></div>
                    <div className="bg-amber-400 transition-all duration-500" style={{ width: `${Math.max(0, 100 - approvalRate - rejectionRate)}%` }} title={`${pendingCount} pending`}></div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* POST LIST TABLE */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">OJT Postings</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.totalPosts} positions • {stats.totalApplications} applicants • 
                  <span className="text-emerald-600 font-semibold mx-1">{stats.approved} hired</span> • 
                  <span className="text-red-600 font-semibold ml-1">{stats.rejected} rejected</span>
                </p>
              </div>
              
              <Link href="/company_createpost" className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm flex items-center justify-center gap-2 w-fit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path></svg>
                Create New Post
              </Link>
            </div>

            <div className="overflow-x-auto">
              {posts.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Job Title</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold hidden sm:table-cell">Posted</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Applicants</th>
                      <th className="px-6 py-3.5 font-semibold text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {posts.map((post: JobPost) => (
                      <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{post.title}</div>
                          <div className="text-xs text-slate-400 sm:hidden mt-1">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${getStatusStyle(post.status)}`}>
                            <span className={`text-[8px] ${['active','open','published'].includes(post.status?.toLowerCase()) ? 'text-green-500' : 'text-slate-400'}`}>{getStatusIcon(post.status)}</span>
                            {formatStatus(post.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                          {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Link href={`/company_applicants?post_id=${post.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                              {post.applicant_count || 0}
                            </Link>
                            
                            {(post.approved_count || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                                ✓ {post.approved_count}
                              </span>
                            )}

                            {(post.rejected_count || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">
                                ✕ {post.rejected_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/company_ojtpost?id=${post.id}&action=edit`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </Link>
                            
                            <button onClick={() => handleDelete(post.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  </div>
                  <p className="text-slate-500 font-medium">No posts yet</p>
                  <p className="text-slate-400 text-sm mt-1">Create your first OJT posting to start receiving applications.</p>
                  
                  <Link href="/company_createpost" className="mt-4 inline-flex px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
                    + Create First Post
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}