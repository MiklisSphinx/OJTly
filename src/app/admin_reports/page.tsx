'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import CertificateGenerator from '@/components/CertificateGenerator';
import AdminAuditLog from '@/components/AdminAuditLog';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import FloatingChatButton from '@/components/FloatingChatButton';
import AdminSupportRequests from '@/components/AdminSupportRequests';

// ============================================
// TYPES
// ============================================
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type TimeRange = '7d' | '30d' | '90d' | 'all';

interface KpiData {
  totalStudents: number;
  totalCompanies: number;
  totalPosts: number;
  totalApplications: number;
  pendingApprovals: number;
  acceptedStudents: number;
}

interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

interface CompanyLeaderRow {
  id: string;
  name: string;
  post_count: number;
  application_count: number;
}

interface MonthBucket {
  label: string;
  count: number;
}

// ============================================
// HELPERS
// ============================================
const supabase = createClient();

const STATUS_COLORS_STUDENT: Record<string, string> = {
  'Not Started': '#94a3b8',
  'Pending':     '#f59e0b',
  'Accepted':    '#3b82f6',
  'Rejected':    '#ef4444',
  'Completed':   '#10b981',
};

const STATUS_COLORS_COMPANY: Record<string, string> = {
  'Pending':   '#f59e0b',
  'Approved':  '#10b981',
  'Rejected':  '#ef4444',
  'Active':    '#3b82f6',
  'Ongoing':   '#8b5cf6',
  'Looking':   '#06b6d4',
  'Archived':  '#64748b',
};

function classFor(status: string | undefined | null): string {
  if (!status) return 'bg-slate-50 text-slate-600 border-slate-200';
  switch (status.toLowerCase()) {
    case 'active':    return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'accepted':  return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'approved':  return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'ongoing':   return 'bg-purple-50 text-purple-700 border-purple-300';
    case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'looking':   return 'bg-cyan-50 text-cyan-700 border-cyan-300';
    case 'pending':   return 'bg-amber-50 text-amber-700 border-amber-300';
    case 'rejected':  return 'bg-red-50 text-red-700 border-red-300';
    case 'not started': return 'bg-slate-100 text-slate-500 border-slate-300';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

// Build last N month buckets (inclusive of current month).
function buildMonthBuckets(months: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    out.push({ key, label });
  }
  return out;
}

// ============================================
// COMPONENT
// ============================================
export default function AdminReportsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [kpi, setKpi] = useState<KpiData>({
    totalStudents: 0, totalCompanies: 0, totalPosts: 0,
    totalApplications: 0, pendingApprovals: 0, acceptedStudents: 0,
  });

  const [studentStatus, setStudentStatus] = useState<StatusSlice[]>([]);
  const [companyStatus, setCompanyStatus] = useState<StatusSlice[]>([]);
  const [monthlyApplications, setMonthlyApplications] = useState<MonthBucket[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyLeaderRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [adminId, setAdminId] = useState('');

  // Auto-close sidebar on desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Toast system
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ==========================================
  // DATA FETCHING — single pass, parallel queries (allSettled so one failure
  // doesn't kill the whole page; we just show what we can)
  // ==========================================

  // Helper: surface the real Supabase error message (their error objects
  // log as `{}` because the properties aren't enumerable).
  const describeError = (err: any): string => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    return [
      err.message,
      err.code && `code=${err.code}`,
      err.hint && `hint=${err.hint}`,
      err.details && `details=${err.details}`,
    ].filter(Boolean).join(' | ');
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Compute date filter for "applications in range"
      const now = new Date();
      let since: Date | null = null;
      if (timeRange === '7d')  since = new Date(now.getTime() - 7 * 86400000);
      if (timeRange === '30d') since = new Date(now.getTime() - 30 * 86400000);
      if (timeRange === '90d') since = new Date(now.getTime() - 90 * 86400000);

      // ── 1) Counts (head-only). Use allSettled so a missing column or RLS
      //    issue on one table doesn't break the entire dashboard. ──
      const countResults = await Promise.allSettled([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .or('status.is.null,status.neq.deleted'),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .or('status.is.null,status.neq.deleted'),
        supabase.from('ojt_posts').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .ilike('status', 'pending'),
      ]);

      // Helper to extract count from a Promise.allSettled result
      const countOf = (r: PromiseSettledResult<{ count: number | null }>, fallback = 0) =>
        r.status === 'fulfilled' ? (r.value.count || 0) : fallback;

      const totalStudents      = countOf(countResults[0] as any);
      const totalCompanies     = countOf(countResults[1] as any);
      const totalPosts         = countOf(countResults[2] as any);
      const totalApplications  = countOf(countResults[3] as any);
      const pendingApprovals   = countOf(countResults[4] as any);

      // ── 2) Student status breakdown (ojt_status column) ──
      const studentsQ = await supabase
        .from('profiles').select('ojt_status')
        .eq('role', 'student')
        .or('status.is.null,status.neq.deleted');
      if (studentsQ.error) {
        console.warn('⚠️  Student status query failed:', describeError(studentsQ.error));
      }
      const students: any[] = studentsQ.data || [];

      // Accepted/active students
      const acceptedStudents = students.filter((s: any) => {
        const st = (s.ojt_status || '').toLowerCase();
        return st === 'accepted' || st === 'active' || st === 'ongoing' || st === 'hired';
      }).length;

      // ── 3) Company status breakdown — defensive against missing is_deleted column ──
      // Try the full query first; if it fails (e.g. is_deleted column doesn't exist
      // because admin_rls.sql hasn't been run), fall back to just `status`.
      let companies: any[] = [];
      const companyStatusFull = await supabase
        .from('companies').select('status, is_deleted')
        .or('status.is.null,status.neq.deleted');
      if (companyStatusFull.error) {
        console.warn('⚠️  Company status (full) failed, falling back to status-only:', describeError(companyStatusFull.error));
        const companyStatusMin = await supabase
          .from('companies').select('status');
        if (companyStatusMin.error) {
          console.warn('⚠️  Company status (minimal) failed:', describeError(companyStatusMin.error));
        } else {
          companies = (companyStatusMin.data || []).map((c: any) => ({ status: c.status || 'Pending', is_deleted: false }));
        }
      } else {
        companies = companyStatusFull.data || [];
      }

      // ── 4) Top companies by post count + application count ──
      // Try the nested count query first; if it fails (FK not configured or RLS),
      // fall back to a simple company list and compute counts client-side.
      let companyRows: CompanyLeaderRow[] = [];
      const companiesWithCounts = await supabase
        .from('companies').select('id, company_name, ojt_posts(count), applications(count)')
        .order('company_name', { ascending: true });
      if (companiesWithCounts.error) {
        console.warn('⚠️  Company nested-count query failed, using client-side fallback:', describeError(companiesWithCounts.error));
        // Fallback: fetch companies, then count posts & apps in separate queries
        const { data: cList } = await supabase.from('companies').select('id, company_name').order('company_name', { ascending: true });
        const { data: pCounts } = await supabase.from('ojt_posts').select('company_id');
        const { data: aCounts } = await supabase.from('applications').select('post_id');
        // Build count maps
        const pMap: Record<string, number> = {};
        (pCounts || []).forEach((p: any) => { if (p?.company_id) pMap[p.company_id] = (pMap[p.company_id] || 0) + 1; });
        // For app counts we'd need post→company join; skip if FK unknown, just use 0
        companyRows = (cList || []).map((c: any) => ({
          id: c.id || '',
          name: c.company_name || 'Unnamed',
          post_count: pMap[c.id] || 0,
          application_count: 0,
        })).sort((a: any, b: any) => b.post_count - a.post_count).slice(0, 5);
      } else {
        companyRows = (companiesWithCounts.data || [])
          .map((c: any) => {
            const postCount = Array.isArray(c.ojt_posts) && c.ojt_posts.length > 0 && typeof c.ojt_posts[0] === 'object' && 'count' in c.ojt_posts[0]
              ? (c.ojt_posts[0].count || 0)
              : (Array.isArray(c.ojt_posts) ? c.ojt_posts.length : 0);
            const appCount = Array.isArray(c.applications) && c.applications.length > 0 && typeof c.applications[0] === 'object' && 'count' in c.applications[0]
              ? (c.applications[0].count || 0)
              : (Array.isArray(c.applications) ? c.applications.length : 0);
            return {
              id: c.id || '',
              name: c.company_name || 'Unnamed',
              post_count: postCount,
              application_count: appCount,
            };
          })
          .sort((a: any, b: any) => (b.post_count + b.application_count) - (a.post_count + a.application_count))
          .slice(0, 5);
      }

      // ── 5) Recent applications for monthly chart ──
      let apps: any[] = [];
      let appsQuery = supabase.from('applications').select('created_at');
      if (since) appsQuery = appsQuery.gte('created_at', since.toISOString());
      const appsResult = await appsQuery.order('created_at', { ascending: true });
      if (appsResult.error) {
        console.warn('⚠️  Applications time-series query failed:', describeError(appsResult.error));
      } else {
        apps = appsResult.data || [];
      }

      // ── Commit KPI ──
      setKpi({
        totalStudents, totalCompanies, totalPosts,
        totalApplications, pendingApprovals, acceptedStudents,
      });

      // ── Student status distribution ──
      const sStatusCounts: Record<string, number> = {};
      students.forEach((s: any) => {
        const raw = (s.ojt_status || 'Not Started').toString();
        const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        sStatusCounts[label] = (sStatusCounts[label] || 0) + 1;
      });
      ['Not Started', 'Pending', 'Accepted', 'Rejected', 'Completed'].forEach(b => {
        if (!(b in sStatusCounts)) sStatusCounts[b] = 0;
      });
      const studentSlices: StatusSlice[] = Object.entries(sStatusCounts)
        .map(([label, value]) => ({ label, value, color: STATUS_COLORS_STUDENT[label] || '#cbd5e1' }))
        .sort((a, b) => b.value - a.value);
      setStudentStatus(studentSlices);

      // ── Company status distribution ──
      const cStatusCounts: Record<string, number> = {};
      companies.forEach(c => {
        if (c.is_deleted) {
          cStatusCounts['Archived'] = (cStatusCounts['Archived'] || 0) + 1;
          return;
        }
        const raw = (c.status || 'Pending').toString();
        const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        cStatusCounts[label] = (cStatusCounts[label] || 0) + 1;
      });
      const companySlices: StatusSlice[] = Object.entries(cStatusCounts)
        .map(([label, value]) => ({ label, value, color: STATUS_COLORS_COMPANY[label] || '#cbd5e1' }))
        .sort((a, b) => b.value - a.value);
      setCompanyStatus(companySlices);

      // ── Monthly applications ──
      const months = timeRange === '7d' ? 1 : timeRange === '30d' ? 3 : timeRange === '90d' ? 6 : 6;
      const buckets = buildMonthBuckets(Math.max(months, 6));
      const countsByMonth: Record<string, number> = {};
      buckets.forEach(b => { countsByMonth[b.key] = 0; });
      apps.forEach(a => {
        if (!a?.created_at) return;
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in countsByMonth) countsByMonth[key] += 1;
      });
      setMonthlyApplications(buckets.map(b => ({ label: b.label, count: countsByMonth[b.key] })));

      // ── Top companies leaderboard ──
      setTopCompanies(companyRows);

      setLastUpdated(new Date());
    } catch (error: any) {
      // Surface the REAL error details — Supabase errors have .message, .code,
      // .hint, .details but they log as {} because the properties are non-enumerable.
      const description = describeError(error);
      console.error('❌ Reports fetch error:', description, error);
      addToast(`Failed to load some reports: ${description}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, timeRange]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

    // Fetch admin user ID for certificate generation
  useEffect(() => {
    const fetchAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) setAdminId(data.user.id);
    };
    fetchAdmin();
  }, []);
  

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchAllData, 60000);
    return () => clearInterval(id);
  }, [fetchAllData]);

  // ==========================================
  // DERIVED VALUES
  // ==========================================
  const maxMonthly = useMemo(() => Math.max(1, ...monthlyApplications.map(m => m.count)), [monthlyApplications]);

  const studentTotal = useMemo(() => studentStatus.reduce((s, x) => s + x.value, 0), [studentStatus]);
  const companyTotal = useMemo(() => companyStatus.reduce((s, x) => s + x.value, 0), [companyStatus]);

  // ==========================================
  // CSV EXPORT
  // ==========================================
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Pull all rows needed for the CSV in parallel
      const [studentsR, companiesR, postsR, appsR] = await Promise.all([
        supabase.from('profiles').select('full_name, email, course, ojt_status, created_at')
          .eq('role', 'student').or('status.is.null,status.neq.deleted')
          .order('created_at', { ascending: false }),
        supabase.from('companies').select('company_name, industry, email, status, created_at')
          .or('status.is.null,status.neq.deleted').order('created_at', { ascending: false }),
        supabase.from('ojt_posts').select('title, company_id, vacancies, work_type, location_name, created_at').order('created_at', { ascending: false }),
        supabase.from('applications').select('student_id, post_id, status, created_at').order('created_at', { ascending: false }),
      ]);

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };

      const sections: string[] = [];

      sections.push('SECTION: Students');
      sections.push('Full Name,Email,Course,OJT Status,Created At');
      (studentsR.data || []).forEach((r: any) => {
        sections.push([escape(r.full_name), escape(r.email), escape(r.course), escape(r.ojt_status), escape(r.created_at)].join(','));
      });

      sections.push('');
      sections.push('SECTION: Companies');
      sections.push('Company Name,Industry,Email,Status,Created At');
      (companiesR.data || []).forEach((r: any) => {
        sections.push([escape(r.company_name), escape(r.industry), escape(r.email), escape(r.status), escape(r.created_at)].join(','));
      });

      sections.push('');
      sections.push('SECTION: OJT Posts');
      sections.push('Title,Company ID,Vacancies,Work Type,Location,Created At');
      (postsR.data || []).forEach((r: any) => {
        sections.push([escape(r.title), escape(r.company_id), escape(r.vacancies), escape(r.work_type), escape(r.location_name), escape(r.created_at)].join(','));
      });

      sections.push('');
      sections.push('SECTION: Applications');
      sections.push('Student ID,Post ID,Status,Created At');
      (appsR.data || []).forEach((r: any) => {
        sections.push([escape(r.student_id), escape(r.post_id), escape(r.status), escape(r.created_at)].join(','));
      });

      const csv = sections.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ojtly-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('Report exported successfully', 'success');
    } catch (error: any) {
      addToast(error?.message || 'Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ==========================================
  // SVG DONUT CHART RENDERER
  // ==========================================
  const Donut = ({ slices, total, label }: { slices: StatusSlice[]; total: number; label: string }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    const nonZeroSlices = slices.filter(s => s.value > 0);

    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 160 160" className="w-32 h-32 sm:w-36 sm:h-36 shrink-0">
          {/* Track */}
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {/* Slices */}
          {nonZeroSlices.length === 0 ? (
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" strokeDasharray="2 6" />
          ) : nonZeroSlices.map((s, i) => {
            const fraction = s.value / Math.max(total, 1);
            const dash = fraction * circumference;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                cx="80" cy="80" r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out' }}
              />
            );
          })}
          {/* Center label */}
          <text x="80" y="74" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 26, fontWeight: 700 }}>{total}</text>
          <text x="80" y="94" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>{label.toUpperCase()}</text>
        </svg>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 truncate">{s.label}</span>
              </div>
              <span className="font-bold text-slate-800 shrink-0">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // LOADING SKELETON
  // ==========================================
  if (loading && kpi.totalStudents === 0 && kpi.totalCompanies === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Reports...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      {/* TOASTS */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
            toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
            'bg-blue-50/95 border-blue-200 text-blue-800'
          }`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
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
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span className="flex-1">Dashboard</span>
          </Link>
          <Link href="/admin_cpost" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="flex-1">Company Posts</span>
          </Link>
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span className="flex-1">Approvals</span>
            {kpi.pendingApprovals > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{kpi.pendingApprovals}</span>
            )}
          </Link>
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">System</p>
          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="flex-1">Reports</span>
          </Link>
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span className="flex-1">Settings</span>
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
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Reports &amp; Analytics</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Platform-wide insights &amp; trends</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <p className="hidden sm:block text-[10px] text-slate-400 font-medium">Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
              <AdminNotificationBell />
              <button onClick={() => fetchAllData()} disabled={loading} className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50" title="Refresh">
                <svg className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              <button onClick={handleExportCSV} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-blue-500/20">
                {exporting ? (
                  <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                )}
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          {/* Time range filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Platform Overview</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Aggregated metrics from across the OJTly platform.</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {([
                { key: '7d',  label: '7D' },
                { key: '30d', label: '30D' },
                { key: '90d', label: '90D' },
                { key: 'all', label: 'All' },
              ] as { key: TimeRange; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTimeRange(opt.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === opt.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { label: 'Total Students', value: kpi.totalStudents, accent: 'indigo', sub: `${kpi.acceptedStudents} in active OJT`, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { label: 'Total Companies', value: kpi.totalCompanies, accent: 'purple', sub: `${kpi.pendingApprovals} pending review`, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { label: 'Total Posts', value: kpi.totalPosts, accent: 'blue', sub: 'OJT opportunities listed', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { label: 'Applications', value: kpi.totalApplications, accent: 'emerald', sub: 'Total student applications', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">{card.label}</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-800 mt-1 tracking-tight">{card.value.toLocaleString()}</p>
                    <p className={`text-[10px] sm:text-xs font-medium mt-1 text-${card.accent}-600`}>{card.sub}</p>
                  </div>
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-${card.accent}-50 flex items-center justify-center shrink-0`}>
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-${card.accent}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={card.icon}/></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CHARTS ROW 1 — Donuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            {/* Student status donut */}
            <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">Student OJT Status</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{studentTotal} total</span>
              </div>
              <Donut slices={studentStatus} total={studentTotal} label="Students" />
            </div>

            {/* Company status donut */}
            <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">Company Status</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{companyTotal} total</span>
              </div>
              <Donut slices={companyStatus} total={companyTotal} label="Companies" />
            </div>
          </div>

          {/* CHARTS ROW 2 — Monthly bar chart */}
          <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Applications Over Time</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Last 6 months of student application activity</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{monthlyApplications.reduce((s, m) => s + m.count, 0)} total</span>
            </div>

            <div className="flex items-end justify-between gap-2 sm:gap-3 h-44 sm:h-52 px-1">
              {monthlyApplications.map((m, i) => {
                const heightPct = (m.count / maxMonthly) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700">{m.count}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md sm:rounded-t-lg transition-all duration-700 ease-out hover:from-emerald-600 hover:to-emerald-500"
                        style={{ height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOP COMPANIES LEADERBOARD */}
          <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                </div>
                <h3 className="font-bold text-sm text-slate-800">Top Companies</h3>
              </div>
              <p className="text-[10px] text-slate-400">By combined posts &amp; applications</p>
            </div>

            {topCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                  <span className="text-2xl">🏢</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">No companies yet</p>
                <p className="text-xs text-slate-400 mt-1">Leaderboard will populate as companies post OJT opportunities.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topCompanies.map((c, i) => {
                  const total = c.post_count + c.application_count;
                  const maxTotal = Math.max(1, ...topCompanies.map(t => t.post_count + t.application_count));
                  const pct = (total / maxTotal) * 100;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-200 text-slate-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">{total} total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium shrink-0">{c.post_count}p · {c.application_count}a</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RECENT APPROVALS QUICK-LINK */}
          {kpi.pendingApprovals > 0 && (
            <Link href="/admin_approval" className="block bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl sm:rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-900">{kpi.pendingApprovals} compan{kpi.pendingApprovals === 1 ? 'y' : 'ies'} awaiting approval</p>
                  <p className="text-xs text-amber-700 mt-0.5">Tap to review verification documents →</p>
                </div>
                <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </Link>
          )}

          {/* 🎧 Student Support Requests — who reported + the reason */}
          <AdminSupportRequests />

          {/* Certificate Generator + Audit Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            <CertificateGenerator adminId={adminId || 'admin'} />
            <AdminAuditLog />
          </div>

        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .overflow-y-auto::-webkit-scrollbar { width: 3px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 100px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <FloatingChatButton />

    </div>
  );
}
