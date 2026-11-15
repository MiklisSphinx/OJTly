'use client';

// ============================================================
// CompanyNotificationBell
// Drop-in component for the company dashboard header.
// READS ONLY from: notifications, ojt_posts, applications, profiles
// WRITES ONLY:     UPDATE notifications SET is_read = true
// No schema changes, no migrations, no inserts/deletes on other tables.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createPortal } from 'react-dom';

// ============================================================
// TYPES — match your confirmed schema exactly
// ============================================================
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  link_url: string | null;
  created_at: string;
  deleted_at: string | null;   // ← matches your student bell's soft-delete pattern
}

interface Applicant {
  id: string;
  post_id: string;
  student_id: string;
  status: string;
  created_at: string;
  full_name: string;
}

interface PostWithApplicants {
  id: string;
  title: string;
  status?: string;
  vacancies?: number;
  applicants: Applicant[];
  unreadCount: number;
}

// ============================================================
// STATUS HELPERS — mirrors the normalization used in company_main
// ============================================================
const APPROVED_VARIANTS = ['approved', 'accepted', 'hired', 'confirmed', 'enrolled', 'active'];
const REJECTED_VARIANTS = ['rejected', 'declined', 'denied', 'unsuccessful', 'withdrawn'];
const COMPLETED_VARIANTS = ['completed', 'finished', 'done'];

const norm = (s?: string | null): string => (s || '').toLowerCase().trim();
const isApproved = (s?: string | null) => APPROVED_VARIANTS.some(v => norm(s).includes(v));
const isRejected = (s?: string | null) => REJECTED_VARIANTS.some(v => norm(s).includes(v));
const isCompleted = (s?: string | null) => COMPLETED_VARIANTS.some(v => norm(s).includes(v));
const isPending  = (s?: string | null) => !isApproved(s) && !isRejected(s) && !isCompleted(s);

const getStatusBadge = (s?: string | null) => {
  const n = norm(s);
  if (COMPLETED_VARIANTS.some(v => n.includes(v)))
    return { label: 'Completed', className: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  if (APPROVED_VARIANTS.some(v => n.includes(v)))
    return { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  if (REJECTED_VARIANTS.some(v => n.includes(v)))
    return { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
  return { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
};

// Gradient avatar — picks a gradient based on the first letter of the name.
// More visually distinct than plain gray circles, and deterministic per student.
const getAvatarGradient = (name: string): string => {
  const gradients = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-violet-400 to-purple-500',
    'from-cyan-400 to-blue-500',
    'from-lime-400 to-green-500',
    'from-fuchsia-400 to-pink-500',
  ];
  const initial = (name || '?').charAt(0).toUpperCase();
  const code = initial.charCodeAt(0) || 0;
  return gradients[code % gradients.length];
};

// ============================================================
// COMPONENT
// ============================================================
export default function CompanyNotificationBell({
  companyId: propCompanyId,
  userId: propUserId,
}: {
  companyId?: string | null;
  userId?: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [companyId, setCompanyId] = useState<string | null>(propCompanyId ?? null);

  const [unread, setUnread] = useState<Notification[]>([]);
  const [posts, setPosts] = useState<PostWithApplicants[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedPostTitle, setSelectedPostTitle] = useState<string>('');
  const [markingRead, setMarkingRead] = useState<string | null>(null); // 'all' | postId | notifId
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(480); // px, recomputed on open
  const [mounted, setMounted] = useState(false); // for SSR-safe portal

  const unreadCount = unread.length;
  const totalApplicants = posts.reduce((s, p) => s + p.applicants.length, 0);

  // ============================================================
  // AUTH / COMPANY RESOLUTION (fallback when props missing)
  // ============================================================
  useEffect(() => {
    if (propUserId && propCompanyId) {
      setUserId(propUserId);
      setCompanyId(propCompanyId);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uId = session.user.id;
      setUserId(uId);
      if (!propCompanyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', uId)
          .maybeSingle();
        if (company?.id) setCompanyId(company.id);
      }
    })();
  }, [propUserId, propCompanyId, supabase]);

  // ============================================================
  // DATA FETCH
  //   1. unread notifications for this user
  //   2. company's OJT posts
  //   3. applications for this company, joined with profiles.full_name
  //   4. group + link unread notifs to posts via link_url
  // ============================================================
  const fetchNotifications = useCallback(async () => {
    if (!userId || !companyId) {
      console.log('🔔 fetchNotifications skipped — userId:', userId, 'companyId:', companyId);
      return;
    }
    setLoading(true);
    try {
      // 1. Unread, non-deleted notifications (respects student bell's soft-delete)
      const { data: notifData, error: nErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (nErr) {
        console.error('🚫 notifications SELECT failed:', JSON.stringify(nErr, null, 2));
        return;
      }
      const notifs = (notifData || []) as Notification[];
      console.log('🔔 notifications SELECT returned:', notifs.length, 'unread rows for userId:', userId);

      // 2. OJT posts for this company
      const { data: postData, error: pErr } = await supabase
        .from('ojt_posts')
        .select('id, title, status, vacancies')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (pErr) {
        console.error('🚫 ojt_posts SELECT failed:', pErr);
        return;
      }

      // Extract post IDs up-front — we'll query applications by post_id IN (...)
      // instead of by company_id, because student_main_page.tsx does NOT set
      // company_id on insert (the column ends up NULL for new applications).
      // The dashboard already uses this same post_id-based pattern.
      const postIds: string[] = (postData || []).map((p: any) => p.id).filter(Boolean);

      // 3. Applications joined with student profile name.
      //    Query by post_id IN (...) so we match applications even when
      //    applications.company_id is NULL (the common case for new apps).
      let applications: Applicant[] = [];
      if (postIds.length > 0) {
        const { data: appData, error: aErr } = await supabase
          .from('applications')
          .select(`
            id, post_id, student_id, status, created_at,
            profiles:student_id ( full_name )
          `)
          .in('post_id', postIds)
          .order('created_at', { ascending: false });

        if (aErr) {
          // Fallback: if the FK join isn't configured in Postgrest, fetch profiles separately.
          console.warn('applications join failed, falling back to flat query:', aErr);
          const { data: flatApps, error: fErr } = await supabase
            .from('applications')
            .select('id, post_id, student_id, status, created_at')
            .in('post_id', postIds)
            .order('created_at', { ascending: false });

          if (fErr) {
            console.error('🚫 applications flat SELECT failed:', fErr);
          } else {
            const studentIds = [...new Set((flatApps || []).map((a: any) => a.student_id).filter(Boolean))];
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', studentIds);

            const profileMap = new Map<string, string>();
            (profilesData || []).forEach((p: any) => {
              profileMap.set(p.id, p.full_name || 'Unknown student');
            });

            applications = (flatApps || []).map((a: any) => ({
              id: a.id,
              post_id: a.post_id,
              student_id: a.student_id,
              status: a.status,
              created_at: a.created_at,
              full_name: profileMap.get(a.student_id) || 'Unknown student',
            }));
          }
        } else {
          // Normal path: profiles comes back as a single object (1:1 FK) — handle array form too just in case.
          applications = (appData || []).map((a: any) => {
            const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            return {
              id: a.id,
              post_id: a.post_id,
              student_id: a.student_id,
              status: a.status,
              created_at: a.created_at,
              full_name: profile?.full_name || '',
            };
          });
        }

        // 3b. FIX-UP: if the join returned rows but any full_name is empty
        //     (e.g. profiles:student_id FK isn't configured, or the student
        //     has no profile row yet), batch-fetch those profiles now so the
        //     dropdown shows real names instead of 'Unknown student'.
        const missingNameIds = applications
          .filter(a => !a.full_name)
          .map(a => a.student_id)
          .filter(Boolean);
        if (missingNameIds.length > 0) {
          const uniqueMissing = [...new Set(missingNameIds)];
          const { data: missingProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', uniqueMissing);
          const missingMap = new Map<string, string>();
          (missingProfiles || []).forEach((p: any) => {
            missingMap.set(p.id, p.full_name || 'Unknown student');
          });
          applications = applications.map(a => ({
            ...a,
            full_name: a.full_name || missingMap.get(a.student_id) || 'Unknown student',
          }));
        }
      }

      // 4. Build grouped post list
      const grouped: PostWithApplicants[] = (postData || []).map((p: any) => {
        const postApplicants = applications.filter(a => a.post_id === p.id);
        const postUnread = notifs.filter(n =>
          n.link_url ? n.link_url.includes(p.id) : false
        );
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          vacancies: p.vacancies,
          applicants: postApplicants,
          unreadCount: postUnread.length,
        };
      });

      // 4b. AUTO-RESOLVE: if a post has unread notifications but NONE of its
      //     applicants are still pending (i.e. the company already approved or
      //     rejected them all via /company_applicants), auto-mark those
      //     notifications as read. This is why approving/removing an applicant
      //     makes the "NEW" pill disappear without needing a manual "Mark read".
      //     Fire-and-forget the UPDATE; local state is updated optimistically.
      const postsToAutoResolve = grouped.filter(p =>
        p.unreadCount > 0 &&
        p.applicants.length > 0 &&
        !p.applicants.some(a => isPending(a.status))
      );

      let effectiveNotifs = notifs;
      let effectiveGrouped = grouped;
      if (postsToAutoResolve.length > 0 && userId) {
        const resolvedPostIds = new Set(postsToAutoResolve.map(p => p.id));
        const notifIdsToResolve: string[] = [];
        notifs.forEach(n => {
          if (!n.link_url) return;
          for (const postId of resolvedPostIds) {
            if (n.link_url.includes(postId)) {
              notifIdsToResolve.push(n.id);
              break;
            }
          }
        });

        if (notifIdsToResolve.length > 0) {
          // Fire-and-forget DB update
          supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', notifIdsToResolve)
            .eq('user_id', userId)
            .then(({ error }: { error: any }) => {
              if (error) console.warn('Auto-resolve notifications UPDATE failed:', error);
            });

          // Optimistic local update so UI reflects immediately
          const resolvedIds = new Set(notifIdsToResolve);
          effectiveNotifs = notifs.filter(n => !resolvedIds.has(n.id));
          effectiveGrouped = grouped.map(p => ({
            ...p,
            unreadCount: resolvedPostIds.has(p.id) ? 0 : p.unreadCount,
          }));
        }
      }

      setUnread(effectiveNotifs);
      setPosts(effectiveGrouped);
    } catch (err) {
      console.error('💥 Notification bell fetch crash:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, supabase]);

  // Initial fetch + refetch whenever dropdown opens
  useEffect(() => {
    if (userId && companyId) fetchNotifications();
  }, [userId, companyId, fetchNotifications]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // ============================================================
  // REALTIME SUBSCRIPTION
  // Listens for INSERT events on notifications filtered by user_id.
  // When a student applies and a new notification row is created for
  // this company, the badge updates instantly without needing to
  // reopen the dropdown or refresh the page.
  // ============================================================
  useEffect(() => {
    if (!userId) return;

    const channelName = `company-notifs:${userId}:${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch the full notification state so the badge + dropdown
          // reflect the new notification immediately.
          console.log('🔔 Realtime: new notification received, refetching…');
          fetchNotifications();
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('🔔 Notification realtime channel error:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchNotifications]);

  // ============================================================
  // CLICK-OUTSIDE / ESCAPE
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSelectedApplicant(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (selectedApplicant) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedApplicant]);

  // ============================================================
  // MARK AS READ (3 scopes)
  //   - markOneRead(notifId)
  //   - markPostRead(postId)  — marks every unread notif whose link_url contains postId
  //   - markAllRead()
  // ============================================================
  const markAllRead = async () => {
    if (!userId || unread.length === 0) return;
    setMarkingRead('all');
    try {
      const ids = unread.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
        .eq('user_id', userId);
      if (error) throw error;
      setUnread([]);
      setPosts(prev => prev.map(p => ({ ...p, unreadCount: 0 })));
    } catch (err) {
      console.error('Mark all read failed:', err);
    } finally {
      setMarkingRead(null);
    }
  };

  const markPostRead = async (postId: string) => {
    if (!userId) return;
    setMarkingRead(postId);
    try {
      const postNotifs = unread.filter(n => n.link_url && n.link_url.includes(postId));
      if (postNotifs.length === 0) {
        setMarkingRead(null);
        return;
      }
      const ids = postNotifs.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
        .eq('user_id', userId);
      if (error) throw error;
      setUnread(prev => prev.filter(n => !ids.includes(n.id)));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, unreadCount: 0 } : p));
    } catch (err) {
      console.error('Mark post read failed:', err);
    } finally {
      setMarkingRead(null);
    }
  };

  // SSR-safe mount flag for the portal (document.body isn't available during SSR)
  useEffect(() => { setMounted(true); }, []);

  // ============================================================
  // DYNAMIC DROPDOWN HEIGHT
  // Measure the bell button's position on the viewport and compute
  // how much vertical space is available below it. This prevents the
  // dropdown from overflowing past the viewport bottom when the bell
  // sits low (e.g. after scrolling) or on short screens.
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;

    const computeHeight = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 16; // 16px buffer from viewport bottom
      // Clamp: min 220px (still usable), max 600px (doesn't get absurdly tall)
      setDropdownMaxHeight(Math.max(220, Math.min(available, 600)));
    };

    computeHeight();
    // Recompute on resize and scroll (scroll fires when the sticky header moves)
    window.addEventListener('resize', computeHeight);
    window.addEventListener('scroll', computeHeight, true);
    return () => {
      window.removeEventListener('resize', computeHeight);
      window.removeEventListener('scroll', computeHeight, true);
    };
  }, [isOpen]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const togglePost = (postId: string) =>
    setExpandedPostId(prev => prev === postId ? null : postId);

  const openApplicant = (applicant: Applicant, postTitle: string) => {
    setSelectedApplicant(applicant);
    setSelectedPostTitle(postTitle);
    setIsOpen(false);  // close dropdown so the modal isn't visually stacked on top of it
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatRelative = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d ago`;
      return formatDate(iso);
    } catch {
      return '';
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(o => !o)}
          className={`relative p-2 rounded-full transition-all duration-200 ${
            unreadCount > 0
              ? 'hover:bg-red-50 text-slate-700'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <svg className={`w-6 h-6 transition-transform ${isOpen ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-br from-red-400 to-red-600 rounded-full ring-2 ring-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          // Mobile-first positioning: on phones the dropdown is a near-full-width
          // fixed panel anchored below the header; on >=sm it becomes a 360px
          // popover anchored to the bell. Mirrors the student NotificationBell pattern.
          <div className="fixed inset-x-2 top-14 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 z-[60] sm:z-50 overflow-hidden animate-fade-in flex flex-col"
          style={{ maxHeight: `${dropdownMaxHeight}px` }}
          >
            {/* Gradient accent bar at top */}
            <div className="h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 shrink-0" />
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-slate-50 to-white shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-5.5">
                  {unreadCount > 0 ? (
                    <><span className="text-red-500 font-semibold">{unreadCount} unread</span> • {totalApplicants} total</>
                  ) : (
                    <>{totalApplicants} total applicants</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingRead === 'all'}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {markingRead === 'all' ? '…' : 'Mark all read'}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-slate-400">Loading…</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">No OJT posts yet</p>
                  <p className="text-xs text-slate-400 mt-1">Create a post to start receiving applications.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {posts.map((post) => {
                    const expanded = expandedPostId === post.id;
                    const pendingCount = post.applicants.filter(a => isPending(a.status)).length;
                    const approvedCount = post.applicants.filter(a => isApproved(a.status)).length;
                    const hasNew = post.unreadCount > 0;

                    return (
                      <div key={post.id} className={`relative transition-colors ${hasNew ? 'bg-amber-50/30' : ''} hover:bg-slate-50/50`}>
                        {hasNew && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 to-amber-500" />
                        )}
                        <div className="px-4 py-3">
                          {/* Post header row — click to expand.
                              NOTE: outer element is a <div role="button">, NOT a <button>,
                              because the row contains a real <button> ("Mark read") inside it.
                              HTML forbids <button>-inside-<button>; React would throw a
                              hydration error otherwise. */}
                          <div
                            onClick={() => togglePost(post.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                togglePost(post.id);
                              }
                            }}
                            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-800 truncate">{post.title}</span>
                                {hasNew && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 rounded-full text-[9px] font-bold uppercase tracking-wide shrink-0 border border-amber-200">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                    {post.unreadCount} new
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                                <span className="font-medium text-slate-500">{post.applicants.length} applicant{post.applicants.length === 1 ? '' : 's'}</span>
                                {post.vacancies != null && post.vacancies > 0 && (
                                  <span className={
                                    approvedCount >= post.vacancies
                                      ? 'text-emerald-600 font-semibold'
                                      : approvedCount > post.vacancies
                                        ? 'text-red-600 font-semibold'
                                        : 'text-slate-400'
                                  }>
                                    • {approvedCount}/{post.vacancies} slots
                                  </span>
                                )}
                                {pendingCount > 0 && <span className="text-amber-500 font-medium">• {pendingCount} pending</span>}
                              </div>
                              {/* Mini progress bar for slots */}
                              {post.vacancies != null && post.vacancies > 0 && (
                                <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      approvedCount >= post.vacancies
                                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                        : approvedCount > post.vacancies
                                          ? 'bg-gradient-to-r from-red-400 to-rose-500'
                                          : 'bg-gradient-to-r from-teal-400 to-cyan-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (approvedCount / post.vacancies) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasNew && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); markPostRead(post.id); }}
                                  disabled={markingRead === post.id}
                                  className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                  title="Mark this post's notifications as read"
                                >
                                  {markingRead === post.id ? '…' : 'Mark read'}
                                </button>
                              )}
                              <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Applicant list — only when expanded */}
                          {expanded && (
                            <div className="mt-2 space-y-1">
                              {post.applicants.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2 text-center">No applicants yet</p>
                              ) : (
                                post.applicants.map((app) => {
                                  const badge = getStatusBadge(app.status);
                                  return (
                                    <button
                                      key={app.id}
                                      onClick={() => openApplicant(app, post.title)}
                                      className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-left group"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm bg-gradient-to-br ${getAvatarGradient(app.full_name)}`}>
                                          {app.full_name.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-slate-800 truncate">{app.full_name}</p>
                                          <p className="text-[10px] text-slate-400">{formatDate(app.created_at)}</p>
                                        </div>
                                      </div>
                                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                        {badge.label}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                              <Link
                                href={`/company_applicants?post_id=${post.id}`}
                                onClick={() => setIsOpen(false)}
                                className="block text-center text-xs font-semibold text-teal-600 hover:text-teal-700 py-2 mt-1 border-t border-slate-100"
                              >
                                View all applicants →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <Link
                href="/company_applicants"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-slate-600 hover:text-teal-600"
              >
                All applicants →
              </Link>
              <span className="text-[10px] text-slate-400">Refreshes on open</span>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================== */}
      {/* APPLICANT DETAILS MODAL                                */}
      {/* Rendered via portal at document.body so it escapes any   */}
      {/* ancestor containing block (the sticky header has          */}
      {/* backdrop-blur-md, which can trap position:fixed children */}
      {/* in some browsers, making the modal appear too high).     */}
      {/* ====================================================== */}
      {selectedApplicant && mounted && createPortal(
        <div
          // Always-centered modal with safe viewport padding.
          // Rendered at document.body via portal — escapes ancestor
          // backdrop-filter/transform containing blocks.
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedApplicant(null); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden flex flex-col animate-fade-in"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header background */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-teal-50 via-white to-blue-50/30">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center text-white text-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </span>
                  Application Details
                </h3>
                <p className="text-xs text-slate-400 mt-1 ml-9">For: {selectedPostTitle}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
              <div className="flex items-center gap-4 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-md bg-gradient-to-br ${getAvatarGradient(selectedApplicant.full_name)}`}>
                  {selectedApplicant.full_name.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-base truncate">{selectedApplicant.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Student ID: {selectedApplicant.student_id ? selectedApplicant.student_id.slice(0, 8) + '…' : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Status
                  </p>
                  <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusBadge(selectedApplicant.status).className}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusBadge(selectedApplicant.status).dot}`} />
                    {getStatusBadge(selectedApplicant.status).label}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Applied On
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{formatDate(selectedApplicant.created_at)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatRelative(selectedApplicant.created_at)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Post
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{selectedPostTitle}</p>
                </div>
              </div>
            </div>

            <div className="px-3 sm:px-5 py-3 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50 flex gap-2 shrink-0">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  router.push(`/company_applicants?post_id=${selectedApplicant.post_id}&app_id=${selectedApplicant.id}`);
                  setSelectedApplicant(null);
                  setIsOpen(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-sm hover:from-teal-700 hover:to-cyan-700 transition-all shadow-sm hover:shadow-md"
              >
                Open Full Page →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
