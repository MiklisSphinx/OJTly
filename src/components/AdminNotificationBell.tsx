'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

// ============================================================
// <AdminNotificationBell />
// Custom notification bell for ADMIN pages.
//
// Features:
//   - 5 tabs: Active | Student | Company | CertificateIssued | History
//   - Header actions: Mark All Read | Delete All | Multi-Select Delete
//   - Per-row: dismiss (soft-delete) → goes to History
//   - History: restore + delete-forever
//   - Real-time INSERT subscription (filtered by user_id)
//   - Unread badge on bell
//
// Schema: id, user_id, title, message, is_read, type, link_url, created_at, deleted_at
// ============================================================

type NotificationView = 'active' | 'student' | 'company' | 'certificate' | 'history';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  link_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

const supabase = createClient();

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

const getIcon = (type: string): string => {
  switch (type) {
    case 'company_registration':  return '🏢';
    case 'student_registration':  return '👤';
    case 'certificate':           return '🎓';
    case 'application_status':    return '📋';
    case 'company_status':        return '🏢';
    default:                      return '🔔';
  }
};

// ---------- component ----------
export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<NotificationView>('active');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // -------- 1. get current user --------
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (active && data?.user) setUserId(data.user.id);
      else setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // -------- 2. fetch (re-runs when view or userId changes) --------
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
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
    } else if (view === 'student') {
      query = query.is('deleted_at', null).eq('type', 'student_registration');
    } else if (view === 'company') {
      query = query.is('deleted_at', null).eq('type', 'company_registration');
    } else if (view === 'certificate') {
      query = query.is('deleted_at', null).eq('type', 'certificate');
    }

    const { data, error } = await query;
    if (error) {
      console.error('AdminNotificationBell fetch error:', error.message);
    } else {
      setNotifications((data ?? []) as Notification[]);
    }
    setLoading(false);
    setSelected(new Set());
  }, [userId, view]);

  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId, fetchNotifications]);

  // -------- 3. realtime subscription (INSERTs only) --------
  useEffect(() => {
    if (!userId) return;
    const channelName = `admin-notif:${userId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          if (viewRef.current !== 'history') fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);

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

  // soft-delete ALL notifications in current view (except History tab)
  const deleteAll = async () => {
    if (notifications.length === 0 || !userId || view === 'history') return;
    if (!confirm(`Delete all ${notifications.length} notifications in this view? They will be moved to History.`)) return;
    setActionLoading(true);
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    try {
      await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
    } finally {
      setActionLoading(false);
    }
  };

  // multi-select: toggle one
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // multi-select: select all in current view
  const selectAll = () => {
    setSelected(new Set(notifications.map((n) => n.id)));
  };

  const clearSelection = () => setSelected(new Set());

  // multi-delete: soft-delete selected (or hard-delete if in History)
  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    const ids = Array.from(selected);
    setNotifications((prev) => prev.filter((n) => !selected.has(n.id)));
    try {
      if (view === 'history') {
        await supabase.from('notifications').delete().in('id', ids);
      } else {
        await supabase
          .from('notifications')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids);
      }
      setSelected(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  // per-row dismiss (soft-delete)
  const dismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  };

  // per-row mark as read
  const markRowAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  // History: restore
  const restoreNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').update({ deleted_at: null }).eq('id', id);
  };

  // History: delete forever
  const deleteForever = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  // History: clear all (hard delete)
  const clearHistory = async () => {
    if (notifications.length === 0 || !userId) return;
    if (!confirm(`Permanently delete all ${notifications.length} notifications in History? This cannot be undone.`)) return;
    setActionLoading(true);
    setNotifications([]);
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .not('deleted_at', 'is', null);
      setSelected(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  // -------- render --------
  const tabs: Array<[NotificationView, string]> = [
    ['active',       'Active'],
    ['student',      'Student'],
    ['company',      'Company'],
    ['certificate',  'CertificateIssued'],
    ['history',      'History'],
  ];

  const showBulkActions = view !== 'history';
  const showHistoryActions = view === 'history';
  const hasSelection = selected.size > 0;

  return (
    <div className="relative">
      {/* Bell button */}
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
          className="fixed inset-x-2 top-14 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-[28rem] sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          {/* ============ HEADER with bulk actions ============ */}
          <div className="border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {view === 'active'       && 'Notifications'}
                  {view === 'student'      && 'Student Registrations'}
                  {view === 'company'      && 'Company Registrations'}
                  {view === 'certificate'  && 'Certificates Issued'}
                  {view === 'history'      && 'History'}
                </h3>
                {view === 'active' && unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 shrink-0">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {showBulkActions && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0 || actionLoading}
                      className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <span className="sm:hidden">Mark All</span>
                      <span className="hidden sm:inline">Mark All Read</span>
                    </button>
                    <button
                      onClick={deleteAll}
                      disabled={notifications.length === 0 || actionLoading}
                      className="text-[10px] sm:text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <span className="sm:hidden">Del All</span>
                      <span className="hidden sm:inline">Delete All</span>
                    </button>
                  </>
                )}
                {showHistoryActions && (
                  <button
                    onClick={clearHistory}
                    disabled={notifications.length === 0 || actionLoading}
                    className="text-[10px] sm:text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span className="sm:hidden">Del All</span>
                    <span className="hidden sm:inline">Delete Forever</span>
                  </button>
                )}
              </div>
            </div>

            {/* ============ Multi-select toolbar (when items selected) ============ */}
            {hasSelection && (
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-blue-50 border-y border-blue-100">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-blue-700">
                    {selected.size} selected
                  </span>
                  <button
                    onClick={selectAll}
                    disabled={selected.size === notifications.length}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
                  >
                    Select all
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>
                <button
                  onClick={deleteSelected}
                  disabled={actionLoading}
                  className="text-[10px] sm:text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md disabled:opacity-40"
                >
                  Delete {selected.size} selected
                </button>
              </div>
            )}

            {/* ============ TABS ============ */}
            <div className="flex px-1 sm:px-2 overflow-x-auto scrollbar-thin">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setView(key); setSelected(new Set()); }}
                  className={`flex-1 min-w-fit text-[10px] sm:text-[11px] font-semibold py-2 sm:py-1.5 px-2 rounded-t-md transition-colors whitespace-nowrap ${
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

          {/* ============ NOTIFICATIONS LIST ============ */}
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
                  {view === 'active'       && 'No notifications yet'}
                  {view === 'student'      && 'No student registrations yet'}
                  {view === 'company'      && 'No company registrations yet'}
                  {view === 'certificate'  && 'No certificates issued yet'}
                  {view === 'history'      && 'No dismissed notifications'}
                </p>
                <p className="text-xs text-slate-400 mt-1 px-2">
                  {view === 'active'       && 'When companies register, students sign up, or certificates are issued, you will see them here.'}
                  {view === 'student'      && 'New student registrations will appear here.'}
                  {view === 'company'      && 'New company registrations will appear here.'}
                  {view === 'certificate'  && 'When companies issue certificates to students, they will appear here.'}
                  {view === 'history'      && 'Dismissed notifications will appear here. You can restore or delete them forever.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {/* Select-all checkbox row */}
                {!showHistoryActions && notifications.length > 0 && (
                  <li className="px-3 sm:px-4 py-2 bg-slate-50/50 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.size === notifications.length && notifications.length > 0}
                      onChange={() => {
                        if (selected.size === notifications.length) clearSelection();
                        else selectAll();
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[11px] font-semibold text-slate-600">
                      {selected.size === notifications.length ? 'Deselect all' : 'Select all'}
                    </span>
                  </li>
                )}

                {notifications.map((n) => {
                  const isSelected = selected.has(n.id);
                  return (
                    <li
                      key={n.id}
                      className={`px-3 sm:px-4 py-3 flex gap-3 ${
                        view === 'active' && !n.is_read ? 'bg-blue-50/40' : ''
                      } ${isSelected ? 'ring-2 ring-inset ring-blue-300 bg-blue-50/60' : ''}`}
                    >
                      {/* Checkbox (only for non-history views) */}
                      {!showHistoryActions && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(n.id)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        />
                      )}

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg ${
                        !n.is_read && view === 'active' ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        {getIcon(n.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-snug ${
                            view === 'history' ? 'text-slate-500' : 'text-slate-800'
                          }`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {view === 'active' && !n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                            )}
                            {/* Per-row actions */}
                            {view === 'history' ? (
                              <>
                                <button
                                  onClick={(e) => restoreNotification(e, n.id)}
                                  aria-label="Restore"
                                  title="Restore to active"
                                  className="p-1 rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => deleteForever(e, n.id)}
                                  aria-label="Delete forever"
                                  title="Delete forever"
                                  className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                {!n.is_read && (
                                  <button
                                    onClick={(e) => markRowAsRead(e, n.id)}
                                    aria-label="Mark as read"
                                    title="Mark as read"
                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => dismissNotification(e, n.id)}
                                  aria-label="Dismiss"
                                  title="Dismiss (move to History)"
                                  className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 leading-relaxed ${
                          view === 'history' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {view === 'history'
                            ? `Dismissed ${timeAgo(n.deleted_at || n.created_at)}`
                            : timeAgo(n.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[10px] text-slate-400 text-center">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {hasSelection && ` · ${selected.size} selected`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
