'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

// ============================================================
// <AdminSupportRequests />
// Inline card with EXPANDABLE rows + Expand All / Collapse All.
//
// - Click any row → expands with smooth slide-down animation
//   showing full message + action buttons
// - "Expand All" / "Collapse All" button in the header
// ============================================================

const supabase = createClient();

interface SupportRequest {
  id: string;
  student_name: string;
  student_email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

type StatusFilter = 'all' | 'new' | 'reading' | 'resolved';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  'new':      { label: 'NEW',      className: 'bg-red-100 text-red-700 border-red-200' },
  'reading':  { label: 'READING',  className: 'bg-amber-100 text-amber-700 border-amber-200' },
  'resolved': { label: 'RESOLVED', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const extractReason = (message: string): string => {
  const match = message.match(/^\[Reason:\s*(.+?)\]/);
  return match ? match[1] : '—';
};

const stripReason = (message: string): string => {
  return message.replace(/^\[Reason:\s*.+?\]\s*\n*/i, '').trim();
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function AdminSupportRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // === NEW: track which rows are expanded ===
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_support_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch support requests:', error.message);
        return;
      }
      setRequests((data || []) as SupportRequest[]);
    } catch (err) {
      console.error('Support requests fetch crash:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('admin-support-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_support_requests' }, () => fetchRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'student_support_requests' }, () => fetchRequests())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'student_support_requests' }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  // === Expand / Collapse handlers ===
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Auto-mark as "reading" when first expanded
    const req = requests.find(r => r.id === id);
    if (req && req.status === 'new') {
      handleStatusChange(req, 'reading');
    }
  };

  const expandAll = () => {
    setExpandedIds(new Set(filtered.map(r => r.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleStatusChange = async (req: SupportRequest, newStatus: 'new' | 'reading' | 'resolved') => {
    setActionLoading(req.id);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved') updates.replied_at = new Date().toISOString();

      const { error } = await supabase
        .from('student_support_requests')
        .update(updates)
        .eq('id', req.id);

      if (error) throw error;

      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updates } : r));
    } catch (err: any) {
      console.error('Status update failed:', err.message);
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (req: SupportRequest) => {
    if (!confirm(`Delete the support request from ${req.student_name}? This cannot be undone.`)) return;
    setActionLoading(req.id);
    try {
      const { error } = await supabase
        .from('student_support_requests')
        .delete()
        .eq('id', req.id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== req.id));
      setExpandedIds(prev => { const n = new Set(prev); n.delete(req.id); return n; });
    } catch (err: any) {
      console.error('Delete failed:', err.message);
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const counts = {
    all: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    reading: requests.filter(r => r.status === 'reading').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
  };

  const allExpanded = filtered.length > 0 && filtered.every(r => expandedIds.has(r.id));

  return (
    <>
      <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">🎧 Student Support Requests</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Click a row to expand • Who reported + the reason</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* === NEW: Expand All / Collapse All button === */}
            {filtered.length > 0 && (
              <button
                onClick={() => allExpanded ? collapseAll() : expandAll()}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title={allExpanded ? 'Collapse all rows' : 'Expand all rows'}
              >
                <svg className={`w-3 h-3 transition-transform duration-300 ${allExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <button
              onClick={() => fetchRequests()}
              disabled={loading}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {([
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'new',      label: `🆕 New (${counts.new})` },
            { key: 'reading',  label: `👀 Reading (${counts.reading})` },
            { key: 'resolved', label: `✓ Resolved (${counts.resolved})` },
          ] as { key: StatusFilter; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                filter === opt.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-slate-400">Loading requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <span className="text-2xl">📭</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">No support requests yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              When students submit the support form on the landing page, their requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((req) => {
              const reason = extractReason(req.message);
              const cleanMessage = stripReason(req.message);
              const badge = STATUS_BADGES[req.status] || STATUS_BADGES['new'];
              const isExpanded = expandedIds.has(req.id);

              return (
                <div
                  key={req.id}
                  className={`relative rounded-xl border transition-all ${
                    req.status === 'new'
                      ? 'bg-red-50/40 border-red-200/60'
                      : req.status === 'reading'
                        ? 'bg-amber-50/40 border-amber-200/60'
                        : 'bg-slate-50/40 border-slate-200/60'
                  } ${isExpanded ? 'shadow-sm' : 'hover:shadow-sm'}`}
                >
                  {/* "NEW" indicator strip */}
                  {req.status === 'new' && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl"></span>
                  )}

                  {/* === Collapsible header — click to expand/collapse === */}
                  <button
                    onClick={() => toggleExpand(req.id)}
                    className="w-full text-left p-3 pl-4 flex items-start justify-between gap-3"
                    aria-expanded={isExpanded}
                  >
                    {/* Left: who + reason */}
                    <div className="flex-1 min-w-0">
                      {/* Student name + email */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {req.student_name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-bold text-slate-800 truncate">{req.student_name}</p>
                        <a
                          href={`mailto:${req.student_email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-indigo-600 hover:underline truncate"
                          title="Email this student"
                        >
                          {req.student_email}
                        </a>
                      </div>

                      {/* Reason badge */}
                      <div className="flex items-center gap-1.5 mb-1.5 ml-9">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reason:</span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                          {reason}
                        </span>
                      </div>

                      {/* Subject + message preview (only when collapsed) */}
                      {!isExpanded && (
                        <>
                          <p className="text-[11px] text-slate-500 ml-9 mb-1 truncate">
                            <span className="font-semibold">Subject:</span> {req.subject}
                          </p>
                          <p className="text-[11px] text-slate-600 ml-9 line-clamp-2">
                            {cleanMessage}
                          </p>
                          <p className="text-[9px] text-slate-400 ml-9 mt-1">
                            📅 {formatDate(req.created_at)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Right: status badge + date + chevron */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${badge.className}`}>
                        {badge.label}
                      </span>
                      {isExpanded && (
                        <span className="text-[9px] text-slate-400">{formatDate(req.created_at)}</span>
                      )}
                      {/* Chevron — rotates when expanded */}
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* === Expandable body — smooth slide-down animation === */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: isExpanded ? '800px' : '0px',
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/60 mt-1">
                      {/* Subject */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Subject</p>
                        <p className="text-xs text-slate-700">{req.subject}</p>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Date</p>
                        <p className="text-xs text-slate-700">
                          {new Date(req.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {formatDate(req.created_at)}
                        </p>
                      </div>

                      {/* Full message */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Message</p>
                        <div className="p-3 bg-white/60 border border-slate-200 rounded-lg">
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{cleanMessage}</p>
                        </div>
                      </div>

                      {/* Action buttons — stopPropagation so they don't toggle expand */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`mailto:${req.student_email}?subject=Re: ${encodeURIComponent(req.subject)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-semibold rounded-lg hover:shadow-md transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Reply via Email
                        </a>

                        {req.status !== 'resolved' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(req, 'resolved'); }}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Resolve
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(req, 'new'); }}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            ↻ Reopen
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(req); }}
                          disabled={actionLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50 ml-auto"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
