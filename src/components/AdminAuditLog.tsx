'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  company_approved:        { label: 'Approved Company',       color: 'emerald', icon: '✓' },
  company_rejected:        { label: 'Rejected Company',       color: 'red',     icon: '✕' },
  company_archived:        { label: 'Archived Company',       color: 'slate',   icon: '📦' },
  company_restored:        { label: 'Restored Company',       color: 'blue',    icon: '♻️' },
  company_status_changed:  { label: 'Company Status Changed', color: 'amber',   icon: '↻' },
  company_removed:         { label: 'Removed Company',        color: 'red',     icon: '🗑️' },
  post_featured:           { label: 'Featured Post',          color: 'amber',   icon: '⭐' },
  post_unfeatured:         { label: 'Unfeatured Post',        color: 'slate',   icon: '☆' },
  post_taken_down:         { label: 'Took Down Post',         color: 'amber',   icon: '🚫' },
  post_restored:           { label: 'Restored Post',          color: 'emerald', icon: '↺' },
  post_deleted:            { label: 'Deleted Post',           color: 'red',     icon: '🗑️' },
  post_status_changed:     { label: 'Post Status Changed',    color: 'amber',   icon: '↻' },
  student_removed:         { label: 'Removed Student',        color: 'red',     icon: '🗑️' },
  student_status_changed:  { label: 'Student Status Changed', color: 'amber',   icon: '↻' },
  certificate_issued:      { label: 'Issued Certificate',     color: 'emerald', icon: '🎓' },
  certificate_revoked:     { label: 'Revoked Certificate',    color: 'red',     icon: '✕' },
};

const TARGET_ICONS: Record<string, string> = {
  company: '🏢', student: '🎓', post: '📄', application: '📋', certificate: '🏆',
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200' },
};

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, admin_id, admin_email, action, target_type, target_id, target_name, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error('❌ Audit log fetch error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const availableActions = useMemo(() => {
    const set = new Set(entries.map(e => e.action));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let f = entries;
    if (actionFilter !== 'all') f = f.filter(e => e.action === actionFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(e =>
        (e.target_name || '').toLowerCase().includes(q) ||
        (e.admin_email || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        (e.target_type || '').toLowerCase().includes(q)
      );
    }
    return f;
  }, [entries, actionFilter, searchQuery]);

  const fmtRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Audit Log</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{entries.length} total actions · last 200 shown</p>
            </div>
          </div>
          <button onClick={fetchEntries} disabled={loading} className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Refresh">
            <svg className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Search by target, admin, or action…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition">
            <option value="all">All actions</option>
            {availableActions.map(a => (<option key={a} value={a}>{a.replace(/_/g, ' ')}</option>))}
          </select>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3"><span className="text-2xl">{searchQuery || actionFilter !== 'all' ? '🔍' : '📋'}</span></div>
            <p className="text-sm font-semibold text-slate-700">{searchQuery || actionFilter !== 'all' ? 'No matching entries' : 'No audit entries yet'}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">{searchQuery || actionFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Admin actions (approve, reject, take down, etc.) will appear here once logged.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(entry => {
              const meta = ACTION_LABELS[entry.action] || { label: entry.action.replace(/_/g, ' '), color: 'slate', icon: '•' };
              const colors = COLOR_CLASSES[meta.color] || COLOR_CLASSES.slate;
              const targetIcon = TARGET_ICONS[entry.target_type] || '•';
              return (
                <div key={entry.id} className="p-3 sm:p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${colors.bg} ${colors.border} border`}><span className={colors.text}>{meta.icon}</span></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{meta.label}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{fmtRelative(entry.created_at)}</span>
                      </div>
                      {entry.target_name && (<p className="text-xs text-slate-500 mt-0.5 truncate"><span className="mr-1">{targetIcon}</span>{entry.target_name}</p>)}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>{entry.admin_email || 'Admin'}</span>
                        <span className="text-slate-300">·</span>
                        <span className={`font-semibold ${colors.text}`}>{entry.action}</span>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">Details</summary>
                          <pre className="mt-1 text-[10px] text-slate-500 bg-slate-50 rounded p-2 overflow-x-auto">{JSON.stringify(entry.details, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}