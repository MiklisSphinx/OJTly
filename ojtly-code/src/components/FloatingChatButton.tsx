'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import SupportChat from '@/components/SupportChat';

const supabase = createClient();

// ============================================================
// <FloatingChatButton />
// A floating GREEN chat button (bottom-right corner) that opens
// a chat panel. Auto-detects the viewer's role:
//
//   - Admin  → sees a list of companies, picks one, chats with them
//   - Company → sees a direct chat with the admin team
//
// Just drop this on any page:
//   <FloatingChatButton />
//
// No props needed. Auto-detects role from auth + profiles.role.
// ============================================================

interface CompanyThread {
  id: string;
  company_name: string;
  industry: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_role: 'company' | 'admin' | null;
  unread_count: number;
  total_messages: number;
}

export default function FloatingChatButton() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'company' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  // Admin-only state
  const [threads, setThreads] = useState<CompanyThread[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Unread badge count (for the floating button)
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Helper: fetch the user's role + company info
  const loadRoleAndCompany = async (uid: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', uid)
      .maybeSingle();

    const userRole = (profile?.role || 'student') as 'admin' | 'company' | 'student';
    if (userRole !== 'admin' && userRole !== 'company') return;
    setRole(userRole);

    if (userRole === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('user_id', uid)
        .maybeSingle();
      if (company) {
        setCompanyId(company.id);
        setCompanyName(company.company_name || 'My Company');
      }
    }
  };

  // Detect user role + company info
  // Use getSession() to avoid navigator lock contention ("another request stole it")
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          // Fallback: try getUser() once if session is null
          const { data: { user: u } } = await supabase.auth.getUser();
          if (!u) return;
          setUserId(u.id);
          await loadRoleAndCompany(u.id);
          return;
        }
        setUserId(user.id);
        await loadRoleAndCompany(user.id);
      } catch (err) {
        console.error('❌ FloatingChatButton init error:', err);
      }
    })();
  }, []);

  // Fetch unread count (realtime)
  useEffect(() => {
    if (!role) return;
    const fetchUnread = async () => {
      if (role === 'company' && companyId) {
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('sender_role', 'admin')
          .eq('is_read', false);
        setTotalUnread(count || 0);
      } else if (role === 'admin') {
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_role', 'company')
          .eq('is_read', false);
        setTotalUnread(count || 0);
      }
    };
    fetchUnread();

    const ch = supabase
      .channel(`floating-chat-unread:${role}:${userId || 'anon'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [role, companyId, userId]);

  // Admin: fetch company threads
  const fetchThreads = useCallback(async () => {
    if (role !== 'admin') return;
    setLoadingThreads(true);
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('support_messages')
        .select('id, company_id, sender_role, message, is_read, created_at')
        .order('created_at', { ascending: false });
      if (msgError) throw msgError;

      const messages = msgData || [];
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name, industry')
        .order('company_name', { ascending: true });
      if (companiesError) throw companiesError;

      const companies = companiesData || [];
      const threadMap: Record<string, CompanyThread> = {};
      companies.forEach((c: any) => {
        threadMap[c.id] = {
          id: c.id,
          company_name: c.company_name || 'Unnamed',
          industry: c.industry || null,
          last_message: null,
          last_message_at: null,
          last_sender_role: null,
          unread_count: 0,
          total_messages: 0,
        };
      });

      messages.forEach((m: any) => {
        const thread = threadMap[m.company_id];
        if (!thread) return;
        thread.total_messages += 1;
        if (!thread.last_message_at) {
          thread.last_message = m.message;
          thread.last_message_at = m.created_at;
          thread.last_sender_role = m.sender_role;
        }
        if (m.sender_role === 'company' && !m.is_read) {
          thread.unread_count += 1;
        }
      });

      const allThreads = Object.values(threadMap).sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (b.unread_count > 0 && a.unread_count === 0) return 1;
        if (a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        }
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return a.company_name.localeCompare(b.company_name);
      });
      setThreads(allThreads);
    } catch (err) {
      console.error('❌ Fetch threads error:', err);
    } finally {
      setLoadingThreads(false);
    }
  }, [role]);

  // Admin: fetch threads on open + realtime
  useEffect(() => {
    if (role !== 'admin') return;
    fetchThreads();
    const ch = supabase
      .channel('admin-floating-threads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, fetchThreads)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_messages' }, fetchThreads)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role, fetchThreads]);

  if (!mounted || !role) return null;

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredThreads = threads.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (t.company_name || '').toLowerCase().includes(q)
      || (t.industry || '').toLowerCase().includes(q)
      || (t.last_message || '').toLowerCase().includes(q);
  });

  return createPortal(
    <>
      {/* ============ FLOATING BUTTON ============ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-[200] w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 hover:from-emerald-500 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group"
        style={{ boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.5)' }}
        title={role === 'admin' ? 'Company Support Chat' : 'Message Admin'}
        aria-label="Open support chat"
      >
        {/* Pulse ring when there are unread messages */}
        {totalUnread > 0 && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
        )}

        {/* Icon — chat bubble with 3 dots */}
        {isOpen ? (
          <svg className="w-7 h-7 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}

        {/* Unread badge */}
        {totalUnread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 ring-2 ring-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* ============ CHAT PANEL (modal) ============ */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 z-[199] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-slide-up"
          style={{
            width: 'calc(100vw - 2.5rem)',
            maxWidth: '900px',
            height: 'calc(100vh - 7rem)',
            maxHeight: '700px',
          }}
        >
          {role === 'company' && companyId ? (
            /* ============ COMPANY VIEW: direct chat with admin ============ */
            <SupportChat
              companyId={companyId}
              companyName={companyName}
              viewerRole="company"
            />
          ) : role === 'admin' ? (
            /* ============ ADMIN VIEW: company list + chat ============ */
            <div className="flex h-full">
              {/* Left: company list */}
              <div className="w-[280px] sm:w-[300px] border-r border-slate-100 flex flex-col shrink-0">
                {/* Header */}
                <div className="px-3 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
                  <h3 className="font-bold text-sm text-slate-800">Companies</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {threads.length} total · {totalUnread} unread
                  </p>
                </div>
                {/* Search */}
                <div className="p-2 border-b border-slate-100 shrink-0">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {loadingThreads ? (
                    <div className="p-4 text-center">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : filteredThreads.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-400">No companies found</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {filteredThreads.map(thread => {
                        const isSelected = selectedCompanyId === thread.id;
                        const hasUnread = thread.unread_count > 0;
                        return (
                          <li key={thread.id}>
                            <button
                              onClick={() => {
                                setSelectedCompanyId(thread.id);
                                setSelectedCompanyName(thread.company_name);
                              }}
                              className={`w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2 ${
                                isSelected ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {(thread.company_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>
                                    {thread.company_name}
                                  </p>
                                  <span className="text-[9px] text-slate-400 shrink-0">
                                    {formatTime(thread.last_message_at)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <p className={`text-[10px] truncate ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                    {thread.last_message ? (
                                      <>{thread.last_sender_role === 'company' ? '🏢: ' : '🔧: '}{thread.last_message}</>
                                    ) : (
                                      <span className="italic text-slate-400">No messages — click to start</span>
                                    )}
                                  </p>
                                  {hasUnread && (
                                    <span className="bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 shrink-0">
                                      {thread.unread_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right: chat panel */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedCompanyId ? (
                  <SupportChat
                    companyId={selectedCompanyId}
                    companyName={selectedCompanyName}
                    viewerRole="admin"
                    compact
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Pick a company</h3>
                    <p className="text-xs text-slate-500 max-w-[200px]">
                      Select a company from the left to view their support thread and reply.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </>,
    document.body
  );
}
