'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

// ==========================================
// INTERFACES
// ==========================================
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
  
  companies?: {
    company_name: string;
    id?: string;
    logo_url?: string;
  };
}

// ==========================================
// CUSTOM SVG LOGO COMPONENT
// ==========================================
const OJTLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
      </filter>
    </defs>
    <path 
      d="M20 4C12.268 4 6 10.268 6 18C6 25.5 20 36 20 36C20 36 34 25.5 34 18C34 10.268 27.732 4 20 4Z" 
      fill="url(#logoGrad)"
      filter="url(#logoShadow)"
    />
    <circle cx="20" cy="18" r="8" fill="white" opacity="0.95"/>
    <path 
      d="M16 18L18.5 20.5L24 15" 
      stroke="url(#logoGrad)" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="28" cy="10" r="3" fill="#fbbf24" />
  </svg>
);

// ==========================================
// SVG ICON COMPONENTS
// ==========================================

const MapPinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SendIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const BookmarkIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ArrowLeftIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LockClosedIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4m8 0v4" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// ==========================================
// COMPANY LOGO COMPONENT WITH FALLBACK
// ==========================================
interface CompanyLogoProps {
  logoUrl?: string;
  companyName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CompanyLogo = ({ logoUrl, companyName, size = 'md', className = '' }: CompanyLogoProps) => {
  const [imgError, setImgError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-9 h-9 text-[10px] sm:w-10 sm:h-10 sm:text-xs',
    md: 'w-11 h-11 text-xs sm:w-12 sm:h-12 sm:text-sm md:w-14 md:h-14 md:text-base',
    lg: 'w-14 h-14 text-base sm:w-16 sm:h-16 sm:text-lg md:w-20 md:h-20 md:text-xl'
  };

  const initial = (companyName || 'C').charAt(0).toUpperCase();

  if (!logoUrl || imgError) {
    return (
      <div className={`
        ${sizeClasses[size]} 
        rounded-xl flex items-center justify-center font-bold shrink-0 
        bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 
        border border-blue-200 shadow-sm transition-all duration-200 
        hover:shadow-md hover:scale-105 active:scale-95 ${className}
      `}>
        {initial}
      </div>
    );
  }

  return (
    <div className={`
      ${sizeClasses[size]} rounded-xl overflow-hidden flex items-center justify-center 
      shrink-0 bg-white border border-slate-200 shadow-sm transition-all duration-200 
      hover:shadow-md hover:scale-105 active:scale-95 relative ${className}
    `}>
      <Image
        src={logoUrl}
        alt={`${companyName} logo`}
        width={80}
        height={80}
        className="object-contain p-1 w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
        priority
      />
    </div>
  );
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const formatSkills = (skills: string[] | string): string[] => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string' && skills.length > 0) {
    return skills.split(',').map((s: any) => s.trim()).filter((s: any) => s);
  }
  return [];
};

const getWorkTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'remote': return <HomeIcon />;
    case 'hybrid': return <RefreshIcon />;
    default: return <BuildingIcon />;
  }
};

const getWorkTypeLabel = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'remote': return 'Remote';
    case 'hybrid': return 'Hybrid';
    default: return 'On-site';
  }
};

// Status color mapping (CASE-INSENSITIVE)
const getStatusStyle = (status: string | undefined): string => {
  const normalized = status?.toLowerCase();
  
  switch (normalized) {
    case 'accepted':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected':
    case 'declined':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'pending':
    case 'under review':
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};

const getStatusLabel = (status: string | undefined): string => {
  if (!status) return 'Applied';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export default function StudentMainPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<{ id: string; email: string } | null | undefined>(undefined);
  const [postsLoading, setPostsLoading] = useState(true); 
  const [authStuck, setAuthStuck] = useState(false);
  
  const [posts, setPosts] = useState<OJTPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<OJTPost | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [studentName, setStudentName] = useState('');
  const [studentInitial, setStudentInitial] = useState('S');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<Map<string, string>>(new Map());
  const [applyingPostId, setApplyingPostId] = useState<string | null>(null);
  const [hasActiveOJT, setHasActiveOJT] = useState(false);
  const [activeOJTCompany, setActiveOJTCompany] = useState<string>('');
  const [activeOJTPostId, setActiveOJTPostId] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getApplicationStatus = (postId: string): string | undefined => {
    return applicationStatuses.get(postId);
  };

  const hasAppliedTo = (postId: string): boolean => {
    return applicationStatuses.has(postId);
  };

  const isActiveOJTPost = (postId: string): boolean => {
    return postId === activeOJTPostId && hasActiveOJT;
  };

  // ==========================================
  // MANUAL AUTH CHECK (SAFETY BUTTON)
  // ==========================================
  const handleManualAuthCheck = async () => {
    setAuthStuck(false);
    setPostsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setCurrentUserId(session.user.id);
        setStudentInitial(session.user.email?.charAt(0).toUpperCase() || 'S');

        const { data: apps } = await supabase.from('applications').select('post_id, status').eq('student_id', session.user.id);
        if (apps && apps.length > 0) {
          const statusMap = new Map<string, string>();
          let foundActiveOJT = false; let activePostId = '';
          const activeStatuses = ['approved', 'accepted', 'hired', 'ongoing', 'active', 'in-progress'];
          apps.forEach((app: any) => {
            if (app.post_id) {
              statusMap.set(app.post_id, app.status || 'pending');
              if (activeStatuses.includes((app.status || '').toLowerCase())) { foundActiveOJT = true; activePostId = app.post_id; }
            }
          });
          setApplicationStatuses(statusMap); setHasActiveOJT(foundActiveOJT);
          if (foundActiveOJT) setActiveOJTPostId(activePostId);
        }

        const { data: postsData } = await supabase.from('ojt_posts').select(`*, companies(id, company_name, logo_url)`).eq('status', 'active').order('created_at', { ascending: false });
        if (postsData) setPosts(postsData);
      } else {
        setUser(null);
      }
      setPostsLoading(false); 
    } catch (err: any) {
      console.error('❌ Manual auth refresh failed:', err);
      setUser(null);
      setPostsLoading(false);
    }
  };

  // ==========================================
  // AUTH LISTENER
  // ==========================================
  useEffect(() => {
    const supabase = createClient();

    const stuckTimer = setTimeout(() => {
      setAuthStuck(true);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(stuckTimer);
        
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setCurrentUserId(session.user.id);
          setStudentInitial(session.user.email?.charAt(0).toUpperCase() || 'S');

          const { data: apps } = await supabase.from('applications').select('post_id, status').eq('student_id', session.user.id);
          if (apps && apps.length > 0) {
            const statusMap = new Map<string, string>();
            let foundActiveOJT = false; let activePostId = '';
            const activeStatuses = ['approved', 'accepted', 'hired', 'ongoing', 'active', 'in-progress'];
            apps.forEach((app: any) => {
              if (app.post_id) {
                statusMap.set(app.post_id, app.status || 'pending');
                if (activeStatuses.includes((app.status || '').toLowerCase())) { foundActiveOJT = true; activePostId = app.post_id; }
              }
            });
            setApplicationStatuses(statusMap); setHasActiveOJT(foundActiveOJT);
            if (foundActiveOJT) setActiveOJTPostId(activePostId);
          }

          const { data: postsData } = await supabase.from('ojt_posts').select(`*, companies(id, company_name, logo_url)`).eq('status', 'active').order('created_at', { ascending: false });
          if (postsData) setPosts(postsData);
          
        } else {
          setUser(null); 
        }
        setPostsLoading(false); 
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        window.location.href = '/student/login';
      }
    });

    return () => {
      clearTimeout(stuckTimer);
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // ✅ CHECK EXISTING APPLICATIONS ON LOAD
  // ==========================================
  useEffect(() => {
    if (!currentUserId) return;

    const fetchApplicationStatuses = async () => {
      try {
        const { data: apps, error } = await supabase
          .from('applications')
          .select('post_id, status')
          .eq('student_id', currentUserId);

        if (error) {
          console.error('Error fetching applications:', error);
          return;
        }

        if (apps && apps.length > 0) {
          const statusMap = new Map<string, string>();
          let foundActiveOJT = false;
          let activePostId = '';
          
          const activeStatuses = ['approved', 'accepted', 'hired', 'ongoing', 'active', 'in-progress'];
          
          apps.forEach((app: any) => {
            if (app.post_id) {
              statusMap.set(app.post_id, app.status || 'pending');
              
              const appStatus = (app.status || '').toLowerCase();
              if (activeStatuses.includes(appStatus)) {
                foundActiveOJT = true;
                activePostId = app.post_id;
              }
            }
          });
          
          setApplicationStatuses(statusMap);
          setHasActiveOJT(foundActiveOJT);
          
          if (foundActiveOJT) {
            setActiveOJTPostId(activePostId);
          }
        }
      } catch (err: any) {
        console.error('Error in fetchApplicationStatuses:', err);
      }
    };

    fetchApplicationStatuses();
  }, [currentUserId]);

  // ==========================================
  // ✅ CORRECT STUDENT fetchPosts (NOT COMPANY!)
  // ==========================================
  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ojt_posts')
        .select(`*, companies(id, company_name, logo_url)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      if (data && Array.isArray(data)) {
        setPosts(data);
        
        if (hasActiveOJT && activeOJTPostId) {
          const activePost = data.find((p: any) => p.id === activeOJTPostId);
          if (activePost?.companies?.company_name) {
            setActiveOJTCompany(activePost.companies.company_name);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      showNotification('error', 'Failed to load positions');
    } finally {
      setPostsLoading(false);
    }
  }, [hasActiveOJT, activeOJTPostId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        fetchPosts();
        await refreshApplicationStatuses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUserId, fetchPosts]);

  const refreshApplicationStatuses = async () => {
    if (!currentUserId) return;

    try {
      const { data: apps } = await supabase
        .from('applications')
        .select('post_id, status')
        .eq('student_id', currentUserId);

      if (apps && apps.length > 0) {
        const statusMap = new Map<string, string>();
        let foundActiveOJT = false;
        let activePostId = '';
        
        const activeStatuses = ['approved', 'accepted', 'hired', 'ongoing', 'active', 'in-progress'];
        
        apps.forEach((app: any) => {
          if (app.post_id) {
            statusMap.set(app.post_id, app.status || 'pending');
            
            const appStatus = (app.status || '').toLowerCase();
            if (activeStatuses.includes(appStatus)) {
              foundActiveOJT = true;
              activePostId = app.post_id;
            }
          }
        });
        
        setApplicationStatuses(statusMap);
        setHasActiveOJT(foundActiveOJT);
        
        if (foundActiveOJT && activePostId !== activeOJTPostId) {
          setActiveOJTPostId(activePostId);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing statuses:', err);
    }
  };

  // ==========================================
  // ✅ CORRECT handleApply (NO company_id)
  // ==========================================
  
  const handleApply = async (postId: string) => {
    const { data: { user: liveUser } } = await supabase.auth.getUser(); 
    
    if (!liveUser) {
      console.log("❌ No user found in live check");
      showNotification('error', 'Please log in to apply');
      return;
    }

    const userId = liveUser.id;
    console.log("✅ Applying with userId:", userId);

    if (hasActiveOJT && !isActiveOJTPost(postId)) {
      showNotification('warning', `You're currently enrolled at ${activeOJTCompany}. Complete it first or contact admin.`);
      return;
    }

    if (hasAppliedTo(postId)) {
      showNotification('warning', 'You have already applied to this position');
      return;
    }

    setApplyingPostId(postId);

    try {
      
               // 1. DECLARE THE QUERY FIRST (with checkError)
            const { data: applicationData, error: checkError } = await supabase
              .from('applications')
              .select(`
                status,
                ojt_posts (
                  companies (
                    company_name
                  )
                )
              `)
              .eq('student_id', userId)
              // .eq('ojt_post_id', postId) <-- Z might have had this, keep it if you need it for applying!
              .maybeSingle();

            // 2. NOW YOU CAN USE checkError
            if (checkError) {
              console.error("Error checking application:", checkError.message);
              return;
            }

            // 3. DECLARE existingApp
            const existingApp = applicationData;

            // 4. NOW YOU CAN USE applicationData/existingApp (with the [0] fix!)
            const fetchedCompanyName = (existingApp as any)?.ojt_posts?.[0]?.companies?.[0]?.company_name;

            // Do whatever you need with fetchedCompanyName below this line

      if (existingApp) {
        console.log("⚠️ Already applied:", existingApp);
        setApplicationStatuses(prev => new Map(prev).set(postId, (existingApp as any).status || 'pending'));
        showNotification('warning', 'You have already applied to this position');
        return;
      }

            const { error: insertError } = await supabase
        .from('applications')
        .insert([{
          post_id: postId,
          student_id: userId,
          status: 'pending', // ✅ Matches schema
          created_at: new Date().toISOString(),
        }])
        .select(); // ✅ Fixes RLS select policy

      if (insertError) {
               console.error('❌ Insert error:', insertError);
        
        if (insertError.code === '23505') {
          setApplicationStatuses(prev => new Map(prev).set(postId, 'pending'));
          showNotification('warning', 'Already applied to this position');
          return;
        }
        throw new Error(insertError.message || 'Failed to submit application');
      }

      console.log("✅ Application inserted successfully!");

      setApplicationStatuses(prev => new Map(prev).set(postId, 'pending'));
      showNotification('success', 'Application submitted successfully!');

    } catch (err: any) {
      console.error('❌ Apply error:', err);
      showNotification('error', err?.message || 'Failed to submit application');
    } finally {
      setApplyingPostId(null);
    }
  };

  // ==========================================
  // CLICK HANDLERS
  // ==========================================
  const handlePostClick = (post: OJTPost) => {
    if (!post) return;
    setSelectedPost(post);
    
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const detailSection = document.getElementById('mobile-detail-view');
        if (detailSection) {
          detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('❌ SignOut error:', error);
      }
    } catch (err: any) {
      console.error('❌ SignOut crash:', err);
    }

    document.cookie.split(';').forEach((cookie: any) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    });

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = '/student/login';
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-menu-container')) {
          setIsMobileMenuOpen(false);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  // ==========================================
  // FILTER LOGIC
  // ==========================================
  const filteredPosts = posts.filter((post: any) => {
    if (!post) return false;
    const searchLower = searchQuery.toLowerCase().trim();
    
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchLower) ||
      (post.companies?.company_name || '').toLowerCase().includes(searchLower) ||
      post.location_name.toLowerCase().includes(searchLower) ||
      formatSkills(post.skills).some((skill: any) => skill.toLowerCase().includes(searchLower));
    
    const matchesCity = selectedCity === 'All Cities' || 
      post.location_name.toLowerCase().includes(selectedCity.toLowerCase());
    
    return matchesSearch && matchesCity;
  });

  const cities = ['All Cities', ...new Set(posts.filter((p: any) => p).map((p: any) => p.location_name.split(',')[0].trim()))];

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (user === undefined || postsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans antialiased flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Loading opportunities...</p>
          
          {authStuck && (
            <button 
              type="button"
              onClick={handleManualAuthCheck}
              className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 mx-auto"
            >
              🔄 Refresh Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased overflow-x-hidden">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-[100] max-w-md animate-slide-in`}>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <span className={`shrink-0 mt-0.5 ${
              notification.type === 'success' ? 'text-emerald-600' :
               notification.type === 'error' ? 'text-red-600' :
               notification.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
            }`}>
              {notification.type === 'success' ? <CheckCircleIcon /> :
               notification.type === 'error' ? <span className="font-bold text-sm">!</span> :
               notification.type === 'warning' ? <span className="font-bold text-sm">!</span> :
               <span className="font-bold text-sm">i</span>}
            </span>
            <p className="text-xs sm:text-sm font-medium flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-current opacity-40 hover:opacity-100 transition-opacity shrink-0 p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 h-14 sm:h-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 text-lg sm:text-xl font-bold text-slate-900">
            <OJTLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="hidden xs:inline">OJTly</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            <Link href="/student_main" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium bg-white text-blue-600 rounded-full shadow-sm transition-all duration-200">Find OJT</Link>
            <Link href="/map" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">Map</Link>
            <Link href="/studentai" className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">AI Assistant</Link>
          </nav>

          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <Link href="/student_profile" className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-md text-xs sm:text-sm font-bold">
                {studentInitial}
              </div>
              <span className="hidden sm:inline font-semibold">Profile</span>
            </Link>
            <button onClick={handleLogout} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200">Log out</button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link href="/student_profile" className="flex items-center justify-center w-9 h-9 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full text-white shadow-md text-sm font-bold hover:shadow-lg transition-shadow">
              {studentInitial}
            </Link>
            <button onClick={(e: any) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors mobile-menu-container">
              <svg className={`w-6 h-6 ${isMobileMenuOpen ? 'rotate-90' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-14 sm:top-16 inset-x-0 bg-white border-b border-slate-200 shadow-xl z-40 animate-fade-in-down mobile-menu-container">
            <div className="px-4 py-3 sm:py-4 space-y-1 sm:space-y-2 max-h-[70vh] overflow-y-auto">
              <Link href="/student_main" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-blue-600 bg-blue-50 rounded-xl">📋 Find OJT</Link>
              <Link href="/map" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl">🗺️ Map View</Link>
              <Link href="/studentai" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl">🤖 AI Assistant</Link>
              <hr className="border-slate-100 my-2 sm:my-3" />
              <Link href="/student_profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{studentInitial}</div>
                <span>My Profile</span>
              </Link>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 sm:py-3 text-red-600 text-sm sm:text-base font-medium hover:bg-red-50 rounded-xl">🚪 Log out</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-6 sm:pt-8 pb-20 sm:pb-28 px-3 sm:px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-56 sm:w-72 h-56 sm:h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight px-2">
            Your OJT Journey Starts Here
          </h1>
          <p className="text-blue-100 text-sm sm:text-lg max-w-xl sm:max-w-2xl mx-auto mb-4 sm:mb-8 px-4">
            Discover internship opportunities tailored for you
          </p>
          
          <div className="max-w-3xl mx-auto px-2 sm:px-0">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input type="text" placeholder="Search by job title, company, skill..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} className="block w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm transition-all"/>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <select value={selectedCity} onChange={(e: any) => setSelectedCity(e.target.value)} className="flex-1 sm:flex-none sm:w-40 md:w-44 pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-2.5 sm:py-3 text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg sm:rounded-xl bg-white transition-all cursor-pointer">
                  {cities.map((city: any) => (<option key={city} value={city}>{city}</option>))}
                </select>
                
                <button type="button" className="flex-1 sm:flex-none sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98]">Search</button>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-blue-200 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full"></span>
                <strong className="text-white text-sm sm:text-base">{filteredPosts.length}</strong>
                <span className="hidden xs:inline">positions available</span>
              </span>
              
              {hasActiveOJT && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400/20 text-yellow-200 rounded-full border border-yellow-300/50">
                  <LockClosedIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-semibold">Enrolled at {activeOJTCompany}</span>
                  <span className="sm:hidden font-semibold">OJT Active</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 pb-12 sm:pb-16 -mt-10 sm:-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* LEFT COLUMN - POSTS LIST */}
          <aside className="lg:col-span-5 order-2 lg:order-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4 lg:sticky lg:top-24 max-h-[60vh] lg:max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              
              <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wide">
                  Available Positions
                  <span className="ml-1.5 sm:ml-2 text-blue-600 text-sm sm:text-base normal-case tracking-normal">{filteredPosts.length}</span>
                </h3>
                
                {selectedPost && (
                  <span className="lg:hidden text-[10px] text-blue-500 font-medium flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" /> Viewing: {selectedPost.title.length > 15 ? selectedPost.title.slice(0,15)+'...' : selectedPost.title}
                  </span>
                )}
              </div>

              <div className="space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin pb-2">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post: any) => {
                    if (!post) return null;
                    const isSelected = selectedPost?.id === post.id;
                    const skillsList = formatSkills(post.skills);
                    const appStatus = getApplicationStatus(post.id);
                    const isApplied = hasAppliedTo(post.id);
                    const isThisActiveOJT = isActiveOJTPost(post.id);
                    
                    return (
                      <div key={post.id} onClick={() => handlePostClick(post)} className={`group bg-white p-3.5 sm:p-5 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out ${
                        isSelected ? 'border-blue-500 shadow-lg shadow-blue-100 scale-[1.02]' : 
                        isThisActiveOJT ? 'border-purple-500 bg-purple-50/30 shadow-md' :
                        isApplied ? (appStatus?.toLowerCase() === 'accepted' || appStatus?.toLowerCase() === 'approved' ? 'border-emerald-300 bg-emerald-50/30' : appStatus?.toLowerCase() === 'rejected' || appStatus?.toLowerCase() === 'declined' ? 'border-red-300 bg-red-50/30' : 'border-amber-300 bg-amber-50/30') :
                        'border-slate-100 hover:border-slate-300 hover:shadow-md'
                      }`}>
                        
                        <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                          <CompanyLogo logoUrl={post.companies?.logo_url} companyName={post.companies?.company_name || 'Company'} size="sm" className={`${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`} />
                          
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold ${post.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                              <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${post.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              <span className="hidden xs:inline">Active</span>
                            </span>

                            {isThisActiveOJT && (
                              <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                ⭐ Current
                              </span>
                            )}
                            
                            {isApplied && !isThisActiveOJT && (
                              <span className={`inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold border ${getStatusStyle(appStatus)}`}>
                                <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="hidden xxxs:inline">{getStatusLabel(appStatus)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <h4 className={`text-sm sm:text-base font-bold mb-0.5 sm:mb-1 line-clamp-1 transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'}`}>{post.title}</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3 truncate">{post.companies?.company_name || 'Company'}</p>
                        
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3 flex-wrap">
                          <span className="inline-flex items-center gap-1"><MapPinIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="truncate max-w-[70px] sm:max-w-[100px]">{post.location_name.split(',')[0]}</span></span>
                          <span className="text-slate-300 hidden xs:inline">|</span>
                          <span className="inline-flex items-center gap-1 hidden xs:flex"><ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{post.duration_hours}h</span>
                          <span className="ml-auto inline-flex items-center gap-1">{getWorkTypeIcon(post.work_type)}<span className="hidden sm:inline">{getWorkTypeLabel(post.work_type)}</span></span>
                        </div>

                        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                          {skillsList.slice(0, 3).map((skill: any, i: any) => (<span key={i} className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-medium rounded-md ${isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{skill}</span>))}
                          {skillsList.length > 3 && (<span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-medium text-slate-400 bg-slate-50 rounded-md">+{skillsList.length - 3}</span>)}
                        </div>

                        <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-slate-100">
                          <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${post.allowance_type === 'Paid' ? 'text-emerald-600' : 'text-slate-500'}`}>{post.allowance_type === 'Paid' ? <><DollarSignIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline">Paid</span></> : <><GiftIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline">Unpaid</span></>}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 inline-flex items-center gap-1"><CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-xl m-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4"><SearchIcon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" /></div>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">No positions found</p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN - DETAIL VIEW */}
          <section id="mobile-detail-view" className="lg:col-span-7 order-1 lg:order-2 mt-4 lg:mt-0">
            
            {selectedPost ? (
              <div key={selectedPost.id} className="bg-white rounded-xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
                
                <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <CompanyLogo logoUrl={selectedPost.companies?.logo_url} companyName={selectedPost.companies?.company_name || 'Company'} size="lg" />
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div>
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">{selectedPost.title}</h2>
                          <p className="text-slate-500 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm">{selectedPost.companies?.company_name || 'Company Name'}</p>
                          
                          {isActiveOJTPost(selectedPost.id) && (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                              <LockClosedIcon className="w-4 h-4" />
                              Your Current OJT
                            </div>
                          )}
                        </div>
                        
                        {hasAppliedTo(selectedPost.id) && !isActiveOJTPost(selectedPost.id) ? (
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-full border whitespace-nowrap shrink-0 ${getStatusStyle(getApplicationStatus(selectedPost.id))}`}>
                            <CheckCircleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">{getStatusLabel(getApplicationStatus(selectedPost.id))}</span>
                          </span>
                        ) : !isActiveOJTPost(selectedPost.id) && (
                          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Accepting Applications
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-xs font-medium text-slate-600">
                      <MapPinIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" /> {selectedPost.location_name}
                    </span>
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-xs font-medium text-slate-600">
                      {getWorkTypeIcon(selectedPost.work_type)}
                      <span className="capitalize hidden sm:inline">{getWorkTypeLabel(selectedPost.work_type)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-xs font-medium text-slate-600">
                      <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                      Posted {new Date(selectedPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto scrollbar-thin">
                  
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 sm:gap-2 block text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-1.5 uppercase font-bold">
                        <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Duration
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-800">
                        {selectedPost.duration_hours} <span className="text-xs sm:text-sm font-normal text-slate-500">hrs</span>
                      </span>
                    </div>
                    
                    <div className={`${selectedPost.allowance_type === 'Paid' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'} p-3 sm:p-4 rounded-lg sm:rounded-xl border`}>
                      <span className={`flex items-center gap-1.5 sm:gap-2 block text-[10px] sm:text-xs mb-1 sm:mb-1.5 uppercase font-bold ${selectedPost.allowance_type === 'Paid' ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {selectedPost.allowance_type === 'Paid' ? (
                          <><DollarSignIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline">Paid</span></>
                        ) : (
                          <><GiftIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline">Unpaid</span></>
                        )}
                      </span>
                      <span className={`text-base sm:text-lg font-bold ${selectedPost.allowance_type === 'Paid' ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {selectedPost.allowance_type}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 sm:gap-2 block text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-1.5 uppercase font-bold">
                        Vacancies
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-800">
                        {selectedPost.vacancies || 1} 
                        <span className="text-xs sm:text-sm font-normal text-slate-500">
                          slot{((selectedPost.vacancies || 1) > 1 ? 's' : '')}
                        </span>
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 sm:gap-2 block text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-1.5 uppercase font-bold">
                        Category
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 capitalize">
                        {selectedPost.course_category || 'Any IT Course'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2 sm:mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2 2h10a2 2 0 002-2-2V7a2 2 0 00-2-2H-2M9 5a2 2 0 002 2 2h2a2 2 0 012-2M-3 7h3m-3 4h3m-6-4h.01M9 16h.01M9 16h.01" /></svg>
                      Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {formatSkills(selectedPost.skills).map((skill: any, i: any) => (<span key={i} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">{skill}</span>))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2 sm:mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2 2z" /></svg>
                      Job Description
                    </h3>
                    <div className="prose prose-slate prose-sm max-w-none">
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">{selectedPost.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>

                {/* DETAIL FOOTER - Action Buttons */}
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    
                    {(() => {
                      const currentStatus = getApplicationStatus(selectedPost.id);
                      const isThisActive = isActiveOJTPost(selectedPost.id);
                      const isApplied = hasAppliedTo(selectedPost.id);
                      
                      if (!user && postsLoading) {
                        return (
                          <button disabled className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-slate-200 text-slate-500 font-semibold rounded-lg sm:rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm">
                            <SpinnerIcon /> Loading...
                          </button>
                        );
                      }
                      
                      if (!user && !postsLoading) {
                        return (
                          <button 
                            onClick={() => {
                              showNotification('info', 'Please log in to apply');
                              router.push('/student/login');
                            }} 
                            className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-gradient-to-r from-slate-400 to-slate-500 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm"
                          >
                            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Log in to Apply
                          </button>
                        );
                      }
                      
                      if (isThisActive) {
                        return (
                          <button disabled className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold rounded-lg sm:rounded-xl shadow-lg cursor-not-allowed flex items-center justify-center gap-2 border-2 border-purple-300 text-xs sm:text-sm">
                            <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            Current OJT
                          </button>
                        );
                      }
                      
                      if (hasActiveOJT && !isThisActive) {
                        return (
                          <button disabled className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-slate-100 text-slate-400 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm">
                            <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            Already Enrolled
                          </button>
                        );
                      }

                      if (isApplied) {
                        return (
                          <button disabled className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-amber-50 text-amber-700 font-bold rounded-lg sm:rounded-xl border-2 border-amber-300 cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm">
                            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            Pending
                          </button>
                        );
                      }
                      
                      return applyingPostId === selectedPost.id ? (
                        <button disabled className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-blue-400 text-white font-semibold rounded-lg sm:rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm">
                          <SpinnerIcon /> Submitting...
                        </button>
                      ) : (
                        <button onClick={() => handleApply(selectedPost.id)} className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm">
                          <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Apply Now
                        </button>
                      );
                    })()}
                    
                    <button className="w-full sm:flex-1 py-2.5 sm:py-3.5 bg-white text-slate-600 font-semibold rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm">
                      <BookmarkIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Save Position
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-xl sm:rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-slate-100">
                  <OJTLogo className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-slate-700 mb-2">Select a Position</h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-xs sm:max-w-sm mx-auto">Choose an opportunity from the list above to view full details and apply.</p>
                
                {hasActiveOJT && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                      <LockClosedIcon className="w-4 h-4 shrink-0" />
                      You're currently enrolled in an OJT at <strong>{activeOJTCompany}</strong>. Complete it before applying to new positions.
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.35s ease-out forwards; }

        @keyframes fade-in-down { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fade-in-down 0.25s ease-out forwards; }

        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}