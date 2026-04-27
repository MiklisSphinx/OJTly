'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

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
  status: string;
  created_at: string;
  companies?: Array<{ company_name: string }>;
}

const OJTLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#14b8a6" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
      </filter>
    </defs>
    <path d="M20 4C12.268 4 6 10.268 6 18C6 25.5 20 36 20 36C20 36 34 25.5 34 18C34 10.268 27.732 4 20 4Z" fill="url(#logoGradient)" filter="url(#shadow)"/>
    <circle cx="20" cy="18" r="8" fill="white" opacity="0.95"/>
    <path d="M16 18L18.5 20.5L24 15" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="28" cy="10" r="3" fill="#fbbf24" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PencilIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DollarSignIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GiftIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const HomeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const BuildingIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const CodeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DesktopIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const InfoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ShieldOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

export default function CompanyPostsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [posts, setPosts] = useState<OJTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const supabase = createClient();

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        const { data: { session }, error: authErr } = await supabase.auth.getSession();
        const user = session?.user;
        
        if (authErr || !user) {
          router.push('/company/login');
          return;
        }

        const { data: company, error: companyErr } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('user_id', user.id)
          .single();

        if (companyErr || !company) {
          console.error('Company not found');
          setLoading(false);
          return;
        }

        setCompanyName(company.company_name);

        const { data: postsData, error: postsErr } = await supabase
          .from('ojt_posts')
          .select('*, companies(company_name)')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (postsErr) {
          console.error('Fetch error:', postsErr.message);
          return;
        }

        console.log('Posts loaded:', postsData?.length);
        setPosts(postsData || []);

      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);
  
  const handleDelete = async (postId: string) => {
    console.log("Confirming Delete for Post ID:", postId);

    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setDeleteLoading(postId);

    const { data, error: deleteErr, status } = await supabase
      .from('ojt_posts')
      .delete()
      .eq('id', postId)
      .select();

    if (deleteErr) {
      alert("System Error: " + deleteErr.message);
      setDeleteLoading(null);
    } else if (!data || data.length === 0) {
      alert("Still Protected. Try disabling RLS temporarily in Supabase for ojt_posts.");
      setDeleteLoading(null);
    } else {
      alert("Success! Post deleted.");
      setPosts(prev => prev.filter(p => p.id !== postId));
      setDeleteLoading(null);
    }
  };

  const formatSkills = (skills: string[] | string) => {
    if (Array.isArray(skills)) return skills.join(', ');
    return String(skills || '');
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
            <AlertTriangleIcon className="w-3 h-3" />
            Offline
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Closed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <PencilIcon className="w-3 h-3" />
            Draft
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getAllowanceDisplay = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <DollarSignIcon className="w-4 h-4" />
            Paid
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
            <GiftIcon className="w-4 h-4" />
            Unpaid
          </span>
        );
      default:
        return <span className="text-slate-500">{type || 'N/A'}</span>;
    }
  };

  const getWorkTypeDisplay = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'remote':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
            <HomeIcon className="w-3.5 h-3.5" />
            Remote
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
            <RefreshIcon className="w-3.5 h-3.5" />
            Hybrid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
            <BuildingIcon className="w-3.5 h-3.5" />
            On-site
          </span>
        );
    }
  };

  const getCourseBadge = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'BSCS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
            <CodeIcon className="w-3.5 h-3.5" />
            BSCS
          </span>
        );
      case 'BSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-200">
            <DesktopIcon className="w-3.5 h-3.5" />
            BSIT
          </span>
        );
      case 'BOTH':
        return (
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
              <CodeIcon className="w-3 h-3" />
              BSCS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-200">
              <DesktopIcon className="w-3 h-3" />
              BSIT
            </span>
          </div>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200">
            {category}
          </span>
        );
    }
  };

  const isPostOffline = (post: OJTPost) => {
    return post.status?.toLowerCase() === 'offline';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans antialiased">
        <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="p-6 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <OJTLogo className="w-8 h-8" />
              <span>OJTly</span>
            </Link>
          </div>
          <nav className="p-4 space-y-1">
            <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              Dashboard
            </Link>
            <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg font-medium shadow-sm shadow-teal-200">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              My OJT Posts
            </Link>
            <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Create Post
            </Link>
            <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              Applicants
            </Link>
            <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              Documents
            </Link>
            <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Settings
            </Link>
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
            <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors w-full">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Log out
            </button>
          </div>
        </aside>

        <main className="lg:ml-64 min-h-screen">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">My OJT Posts</h1>
              </div>
            </div>
          </header>

          <div className="p-8 flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Loading your posts...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activePostsCount = posts.filter(p => p.status === 'active').length;
  const offlinePostsCount = posts.filter(p => p.status === 'offline').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      
      {notification && (
        <div className="fixed top-4 right-4 z-[100] max-w-md animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <span className="shrink-0 mt-0.5">
              {notification.type === 'success' && <CheckIcon className="w-5 h-5 text-emerald-600" />}
              {notification.type === 'error' && <XIcon className="w-5 h-5 text-red-600" />}
              {notification.type === 'warning' && <AlertTriangleIcon className="w-5 h-5 text-amber-600" />}
              {notification.type === 'info' && <InfoIcon className="w-5 h-5 text-blue-600" />}
            </span>
            <p className="text-sm font-medium flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-current opacity-40 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
            <OJTLogo className="w-8 h-8" />
            <span>OJTly</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            Dashboard
          </Link>
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-white bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg font-medium shadow-sm shadow-teal-200">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            My OJT Posts
          </Link>
          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Create Post
          </Link>
          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Applicants
          </Link>
          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            Documents
          </Link>
          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors w-full">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800 truncate">My OJT Posts</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <span className="hidden sm:block text-sm text-slate-500 font-medium truncate max-w-[150px]">{companyName}</span>
              <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {companyName.charAt(0)?.toUpperCase() || 'C'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Your Posts</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{posts.length}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-600 font-semibold">{activePostsCount} Active</span>
                  </span>
                  {offlinePostsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-red-600 font-semibold">{offlinePostsCount} Offline</span>
                    </span>
                  )}
                </div>
              </div>
              <Link href="/company_createpost" className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-200 transition-all flex items-center gap-2 whitespace-nowrap">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New Post
              </Link>
            </div>
          </div>

          {posts.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-200">
                <OJTLogo className="w-10 h-10 opacity-40" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No posts yet</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto leading-relaxed">Create your first OJT post to start receiving applications from qualified students.</p>
              <Link href="/company_createpost" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-all hover:shadow-lg hover:shadow-teal-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Create Your First Post
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {posts.map((post) => {
              const offline = isPostOffline(post);
              
              return (
                <div 
                  key={post.id} 
                  className={`
                    relative bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col group
                    transition-all duration-300
                    ${offline 
                      ? 'border-red-200 border-2 opacity-60 grayscale-[30%]' 
                      : 'border-slate-100 hover:shadow-xl hover:border-teal-100'
                    }
                  `}
                >
                  
                  {offline && (
                    <div className="absolute inset-0 z-20 bg-red-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-2xl">
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                        <ShieldOffIcon className="w-7 h-7 text-red-600" />
                      </div>
                      <h4 className="text-base font-bold text-red-800 text-center mb-2">Post Taken Offline</h4>
                      <p className="text-sm text-red-600 text-center leading-relaxed max-w-xs">
                        This post has been disabled by the Administrator. Please contact support or create a new post.
                      </p>
                      <Link 
                        href="/company_createpost"
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                        Create New Post
                      </Link>
                    </div>
                  )}
                  
                  <div className="p-5 border-b border-slate-50 bg-gradient-to-br from-slate-50/80 to-white">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-base font-bold truncate leading-snug ${offline ? 'text-slate-500' : 'text-slate-800 group-hover:text-teal-600'} transition-colors`}>
                          {post.title}
                        </h3>
                        <p className={`text-sm font-medium mt-1 truncate ${offline ? 'text-slate-400' : 'text-teal-600'}`}>
                          {(Array.isArray(post.companies) ? post.companies[0] : null)?.company_name || companyName}
                        </p>
                      </div>
                      {getStatusBadge(post.status)}
                    </div>
                  </div>

                  <div className="p-5 flex-1 space-y-4 text-sm">
                    
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 min-w-0 ${offline ? 'text-slate-400' : 'text-slate-600'}`}>
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span className="truncate">{post.location_name}</span>
                      </div>
                      {!offline && getWorkTypeDisplay(post.work_type)}
                    </div>

                    <div className={`flex items-center gap-2 ${offline ? 'text-slate-400' : 'text-slate-600'}`}>
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span><strong className={offline ? 'text-slate-500' : 'text-slate-800'}>{post.duration_hours}</strong> hours required</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={offline ? 'opacity-50' : ''}>
                        {getAllowanceDisplay(post.allowance_type)}
                      </div>
                      
                      {post.vacancies && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${offline ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {post.vacancies} slot{post.vacancies > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {post.course_category && (
                      <div className={`pt-1 ${offline ? 'opacity-50' : ''}`}>
                        {getCourseBadge(post.course_category)}
                      </div>
                    )}

                    <div className="flex items-start gap-2 pt-1">
                      <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                      <div className={`flex flex-wrap gap-1.5 ${offline ? 'opacity-50' : ''}`}>
                        {formatSkills(post.skills).split(',').map((skill, i) => (
                          skill.trim() && (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
                              {skill.trim()}
                            </span>
                          )
                        ))}
                      </div>
                    </div>

                    <p className={`pt-2 text-sm leading-relaxed line-clamp-3 border-t border-slate-50 ${offline ? 'text-slate-400' : 'text-slate-500'}`}>
                      {post.description}
                    </p>

                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      Posted {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                    
                    <button 
                      onClick={() => !offline && router.push('/company_applicants')}
                      disabled={offline}
                      className={`
                        flex items-center gap-2 text-sm font-medium transition-colors
                        ${offline 
                          ? 'cursor-not-allowed text-slate-300' 
                          : 'text-slate-600 hover:text-teal-600 group/btn'
                        }
                      `}
                      title={offline ? 'Post is offline - cannot view applicants' : 'View applicants'}
                    >
                      <svg className={`w-4 h-4 ${!offline ? 'group-hover/btn:scale-110 transition-transform' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                      View Applicants
                      {offline && (
                        <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364L5.636 5.636M18.364 5.636L5.636 18.364" />
                        </svg>
                      )}
                    </button>

                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleDelete(post.id)}
                        disabled={deleteLoading === post.id}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                        title="Delete Post"
                      >
                        {deleteLoading === post.id ? (
                          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                        ) : (
                          <TrashIcon />
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}