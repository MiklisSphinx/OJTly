'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ============================================================
// <NotificationBell />
// Real-time notification bell for OJTly.
// Schema: id, user_id, title, message, is_read, type, link_url, created_at, deleted_at
//
// Features:
//   - Real-time INSERT subscription (filtered by user_id)
//   - 4 tabs: Active | Approved | Rejected | History
//   - Active: unread badge, mark-as-read, dismiss (soft-delete)
//   - History: restore, delete-forever
//   - All dismissals are soft-deletes (recoverable from History)
// ============================================================

type NotificationType =
  | 'application_status'
  | 'application_update'
  | 'ojt_post'
  | 'system'
  | 'general';

type NotificationView = 'active' | 'approved' | 'rejected' | 'history';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: NotificationType | string;
  link_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

// ---------- icons ----------
const BellIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SpinnerIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className + ' animate-spin'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
  </svg>
);

// ---------- helpers ----------
const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const dotColor = (type: string): string => {
  switch (type) {
    case 'application_status':
    case 'application_update': return 'bg-emerald-500';
    case 'ojt_post':           return 'bg-blue-500';
    case 'system':             return 'bg-amber-500';
    default:                   return 'bg-slate-400';
  }
};

// ---------- component ----------
export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<NotificationView>('active');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const viewRef = useRef(view);

  // keep viewRef in sync so realtime callback can read latest view
  useEffect(() => { viewRef.current = view; }, [view]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // -------- 1. get current user --------
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (active && data?.user) setUserId(data.user.id);
    })();
    return () => { active = false; };
  }, [supabase]);

  // -------- 2. fetch (re-runs when view changes) --------
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      let query = supabase
        .from('notifications')
        .select('id, user_id, title, message, is_read, type, link_url, created_at, deleted_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (view === 'active') {
        query = query.is('deleted_at', null);
      } else if (view === 'history') {
        query = query.not('deleted_at', 'is', null);
      } else if (view === 'approved') {
        query = query
          .is('deleted_at', null)
          .eq('type', 'application_status')
          .ilike('title', 'Application Accepted%');
      } else if (view === 'rejected') {
        query = query
          .is('deleted_at', null)
          .eq('type', 'application_status')
          .ilike('title', 'Application Rejected%');
      }

      const { data, error } = await query;
      if (error) {
        console.error('NotificationBell: fetch error', error.message);
      } else {
        setNotifications((data ?? []) as Notification[]);
      }
      setLoading(false);
    })();
  }, [supabase, userId, view]);

  // -------- 3. realtime subscription (INSERTs only) --------
  useEffect(() => {
    if (!userId) return;

    const channelName = `notifications:${userId}:${Math.random().toString(36).slice(2)}`;

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
        (payload: any) => {
          // Only auto-prepend if user is currently viewing Active
          if (viewRef.current !== 'active') return;
          setNotifications((prev) =>
            [payload.new as Notification, ...prev].slice(0, 50)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // -------- 4. close dropdown on outside click --------
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // -------- actions --------
  // NOTE: notification rows are display-only (not clickable).
  // Use "Mark all read" in the header to mark notifications as read,
  // or the × button on each row to dismiss.
  const markAllAsRead = async () => {
    if (unreadCount === 0 || !userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('deleted_at', null);
  };

  // ❌ Soft-delete (dismiss) — moves to History, can be restored
  const dismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  };

  // 🗑️ Clear all (soft-delete) — recoverable from History
  const clearAll = async () => {
    if (notifications.length === 0 || !userId) return;
    setNotifications([]);
    await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null);
  };

  // ♻️ Restore a dismissed notification back to active
  const restoreNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase
      .from('notifications')
      .update({ deleted_at: null })
      .eq('id', id);
  };

  // 💀 Permanently delete one (History only)
  const deleteForever = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  // 💀 Permanently clear all history
  const clearHistory = async () => {
    if (notifications.length === 0 || !userId) return;
    setNotifications([]);
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .not('deleted_at', 'is', null);
  };

  // -------- render --------
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
      >
        <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && view === 'active' && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed inset-x-2 top-14 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-80 sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col"
          style={{ maxHeight: '80vh' }}
        >
          {/* header with tabs */}
          <div className="border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {view === 'active'   && 'Notifications'}
                  {view === 'approved' && 'Approved'}
                  {view === 'rejected' && 'Rejected'}
                  {view === 'history'  && 'History'}
                </h3>
                {view === 'active' && unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 shrink-0">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {view === 'history' ? (
                <button
                  onClick={clearHistory}
                  disabled={notifications.length === 0}
                  className="text-[10px] sm:text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <span className="sm:hidden">Delete all</span>
                  <span className="hidden sm:inline">Delete forever</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span className="sm:hidden">Mark read</span>
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                  {view === 'active' && (
                    <button
                      onClick={clearAll}
                      disabled={notifications.length === 0}
                      className="text-[10px] sm:text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* tab switcher */}
            <div className="flex px-1 sm:px-2">
              {([
                ['active',   'Active'],
                ['approved', 'Approved'],
                ['rejected', 'Rejected'],
                ['history',  'History'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`flex-1 text-[10px] sm:text-[11px] font-semibold py-2 sm:py-1.5 rounded-t-md transition-colors ${
                    view === key
                      ? 'text-blue-600 bg-blue-50/60 border-b-2 border-blue-500'
                      : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* list - scrolls inside */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
                <SpinnerIcon /> Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <BellIcon className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {view === 'active'   && 'No notifications yet'}
                  {view === 'approved' && 'No approvals yet'}
                  {view === 'rejected' && 'No rejections yet'}
                  {view === 'history'  && 'No dismissed notifications'}
                </p>
                <p className="text-xs text-slate-400 mt-1 px-2">
                  {view === 'active'   && "You'll be notified here when something happens."}
                  {view === 'approved' && 'When a company accepts your application, it will show up here.'}
                  {view === 'rejected' && 'If a company declines your application, it will show up here.'}
                  {view === 'history'  && 'Dismissed notifications will appear here.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => {
                  const inner = (
                    <div className="flex gap-3 w-full">
                      <span className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${dotColor(n.type)} ${view === 'history' ? 'opacity-40' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-snug ${view === 'history' ? 'text-slate-500' : 'text-slate-800'}`}>{n.title}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {view === 'active' && !n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-0.5" />
                            )}

                            {view === 'active' ? (
                              <button
                                onClick={(e) => dismissNotification(e, n.id)}
                                aria-label="Dismiss"
                                className="p-1 -mr-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => restoreNotification(e, n.id)}
                                  aria-label="Restore"
                                  title="Restore to active"
                                  className="p-1 -mr-1 rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors touch-manipulation"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => deleteForever(e, n.id)}
                                  aria-label="Delete forever"
                                  title="Delete forever"
                                  className="p-1 -mr-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${view === 'history' ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {view === 'history'
                            ? `Dismissed ${timeAgo(n.deleted_at || n.created_at)}`
                            : timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <li
                      key={n.id}
                      // NOT clickable — display only. No onClick, no navigation.
                      // Use "Mark all read" in the header, or the × button to dismiss.
                      className={`px-3 sm:px-4 py-3 cursor-default ${view === 'active' && !n.is_read ? 'bg-blue-50/40' : ''}`}
                    >
                      {inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
