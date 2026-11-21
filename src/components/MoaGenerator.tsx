'use client';

// components/MoaGenerator.tsx  (full replacement — v3)
// Admin-side MOA generator for Silay Institute.
// - Creates a School <-> Company MOA (one MOA per company, students are covered
//   separately through the hiring flow).
// - Admin signs the SCHOOL side with an E-Signature (draw / type), and can
//   re-sign an existing MOA anytime — the PDF is rebuilt with the new signature.
// - Signature Inbox: every MOA + signing status. When a company signs, the
//   signature + timestamp show up here (and the image is previewed in the
//   Existing MOA panel) — this is how the admin RECEIVES company signatures.
// - NEW: Company Submissions panel — reviews Option A (uploaded file) and
//   Option B (created) MOAs sent by companies: Approve, or Reject with a
//   reason. The company is notified automatically and can revise & resubmit.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildMoaPdf } from '@/lib/moaPdf';
import SignaturePad from '@/components/SignaturePad';

type Props = { adminId: string };

const SCHOOL_NAME = 'Silay Institute';

type CompanyOption = { id: string; company_name: string };

type MoaRecord = {
  id: string;
  company_id: string | null;
  moa_number: string | null;
  date_started: string | null;
  date_expired: string | null;
  company_rep: string | null;
  school_rep: string | null;
  school_signature: string | null;
  school_signed_at: string | null;
  company_signature: string | null;
  company_signed_at: string | null;
  created_at?: string | null;
  submission_type?: string | null;
  review_status?: string | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  document_name?: string | null;
  document_data?: string | null;
};

type InboxMoa = MoaRecord & { companyName: string };
type SubRow = MoaRecord & { companyName: string; user_id: string | null };

// Column list WITH the submission/review columns (SQL-moa-submissions.sql).
const MOA_COLS_NEW =
  'id, company_id, moa_number, date_started, date_expired, company_rep, school_rep, school_signature, school_signed_at, company_signature, company_signed_at, created_at, submission_type, review_status, review_notes, reviewed_at, document_name';
// Fallback WITHOUT them, so the admin page keeps working before the SQL runs.
const MOA_COLS_OLD =
  'id, company_id, moa_number, date_started, date_expired, company_rep, school_rep, school_signature, school_signed_at, company_signature, company_signed_at, created_at';

async function fetchMoaRows(
  opts: { companyId?: string; limit?: number } = {}
): Promise<{ rows: MoaRecord[]; legacy?: boolean; error?: string }> {
  const run = async (cols: string) => {
    let q = supabase.from('moa_documents').select(cols).order('created_at', { ascending: false });
    if (opts.companyId) q = q.eq('company_id', opts.companyId);
    if (opts.limit) q = q.limit(opts.limit);
    return await q;
  };
  const first = await run(MOA_COLS_NEW);
  if (!first.error) return { rows: ((first.data ?? []) as unknown as MoaRecord[]) };
  if (/column|42703/i.test(first.error.message)) {
    const second = await run(MOA_COLS_OLD);
    return { rows: ((second.data ?? []) as unknown as MoaRecord[]), legacy: true };
  }
  return { rows: [], error: first.error.message };
}

function decodeAndDownload(dataUrl: string, filename: string) {
  try {
    const meta = dataUrl.slice(0, dataUrl.indexOf(','));
    const mime = /data:(.*?);/.exec(meta)?.[1] || 'application/octet-stream';
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('Could not decode uploaded file:', e);
  }
}

async function notifyCompany(userId: string | null | undefined, title: string, message: string) {
  if (!userId) return;
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type: 'moa',
      is_read: false,
      link_url: '/company_main',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('MOA notification failed (non-fatal):', e);
  }
}

const localDate = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const todayStr = () => localDate(new Date());
const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return localDate(d);
};

const fmtShort = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const reviewBadgeCls = (s: string | null | undefined) =>
  s === 'approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : s === 'rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';

export default function MoaGenerator({ adminId }: Props) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [companyId, setCompanyId] = useState('');
  const [moaNumber, setMoaNumber] = useState('');
  const [dateStarted, setDateStarted] = useState(todayStr());
  const [dateExpired, setDateExpired] = useState(oneYearFromNow());
  const [companyRep, setCompanyRep] = useState('');
  const [schoolRep, setSchoolRep] = useState('');

  // school e-signature (at generation time)
  const [showSchoolPad, setShowSchoolPad] = useState(false);
  const [schoolSig, setSchoolSig] = useState<string | null>(null);

  // existing MOA strip (re-sign school signature on an already-saved MOA)
  const [existing, setExisting] = useState<MoaRecord | null>(null);
  const [existingErr, setExistingErr] = useState('');
  const [showResignPad, setShowResignPad] = useState(false);
  const [resignSig, setResignSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // signature inbox — every MOA + signing status (admin receives signatures here)
  const [inbox, setInbox] = useState<InboxMoa[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);

  // company submissions (Option A upload / Option B create) — admin reviews here
  const [submissions, setSubmissions] = useState<SubRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subsErr, setSubsErr] = useState('');
  const [subsMsg, setSubsMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ row: SubRow; reason: string } | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  // search filters so the inbox / submissions stay manageable with many companies
  const [inboxSearch, setInboxSearch] = useState('');
  const [subsSearch, setSubsSearch] = useState('');

  // in-page PDF viewer (View MOA / View file) — renders in an iframe overlay
  // so it never triggers a download.
  const [viewer, setViewer] = useState<{ url: string; isBlob: boolean; download: () => void } | null>(null);

  // load company list
  useEffect(() => {
    (async () => {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name')
        .or('status.is.null,status.neq.deleted')
        .order('company_name');
      if (!error && data) setCompanies(data as CompanyOption[]);
      setLoadingCompanies(false);
    })();
  }, []);

  const companyName = useMemo(
    () => companies.find((c) => c.id === companyId)?.company_name ?? '',
    [companies, companyId]
  );

  // load the latest existing MOA for the selected company
  const loadExisting = useCallback(async (cid: string) => {
    setExisting(null);
    setExistingErr('');
    setShowResignPad(false);
    setResignSig(null);
    if (!cid) return;
    const res = await fetchMoaRows({ companyId: cid, limit: 1 });
    if (res.error) {
      setExistingErr(res.error);
      return;
    }
    setExisting(res.rows[0] ?? null);
  }, []);

  useEffect(() => {
    loadExisting(companyId);
  }, [companyId, loadExisting]);

  // signature inbox: all MOAs joined with company names in JS (no FK needed)
  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    const res = await fetchMoaRows({ limit: 50 });
    const { data: compData } = await supabase.from('companies').select('id, company_name');
    const comps = (compData ?? []) as { id: string; company_name: string }[];
    const nameOf = (cid: string | null) =>
      comps.find((c) => c.id === cid)?.company_name ?? 'Unknown company';
    setInbox(res.rows.map((m) => ({ ...m, companyName: nameOf(m.company_id) })));
    setLoadingInbox(false);
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // company submissions: Option A (upload) + Option B (create), newest first
  const loadSubmissions = useCallback(async () => {
    setLoadingSubs(true);
    setSubsErr('');
    const { data: rows } = await supabase
      .from('moa_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    const { data: comps } = await supabase.from('companies').select('id, company_name, user_id');
    const cmap = (comps ?? []) as { id: string; company_name: string; user_id: string | null }[];
    const subs = ((rows ?? []) as MoaRecord[])
      .filter((r) => r.submission_type === 'company_submitted')
      .map<SubRow>((r) => {
        const c = cmap.find((x) => x.id === r.company_id);
        return {
          ...r,
          companyName: c?.company_name ?? 'Unknown company',
          user_id: c?.user_id ?? null,
        };
      });
    setSubmissions(subs);
    setLoadingSubs(false);
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.review_status === 'pending').length,
    [submissions]
  );

  const sortedSubs = useMemo(() => {
    const pending = submissions.filter((s) => s.review_status === 'pending');
    const rest = submissions.filter((s) => s.review_status !== 'pending');
    return [...pending, ...rest];
  }, [submissions]);

  // Group the inbox by company (collapsible per-company sections) so a directory
  // with many accounts stays scannable. Also applies the search filter
  // (matches company name OR MOA number).
  const groupedInbox = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    const filtered = q
      ? inbox.filter(
          (r) =>
            (r.companyName || '').toLowerCase().includes(q) ||
            (r.moa_number || '').toLowerCase().includes(q)
        )
      : inbox;
    const groups = new Map<string, { key: string; companyName: string; rows: InboxMoa[] }>();
    for (const r of filtered) {
      const key = r.company_id || r.companyName || 'unknown';
      const g = groups.get(key) ?? { key, companyName: r.companyName, rows: [] as InboxMoa[] };
      g.rows.push(r);
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [inbox, inboxSearch]);

  // Same grouping for company submissions.
  const groupedSubs = useMemo(() => {
    const q = subsSearch.trim().toLowerCase();
    const filtered = q
      ? sortedSubs.filter(
          (r) =>
            (r.companyName || '').toLowerCase().includes(q) ||
            (r.moa_number || '').toLowerCase().includes(q) ||
            (r.document_name || '').toLowerCase().includes(q)
        )
      : sortedSubs;
    const groups = new Map<string, { key: string; companyName: string; rows: SubRow[] }>();
    for (const r of filtered) {
      const key = r.company_id || r.companyName || 'unknown';
      const g = groups.get(key) ?? { key, companyName: r.companyName, rows: [] as SubRow[] };
      g.rows.push(r);
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [sortedSubs, subsSearch]);

  // live status preview of the dates being entered
  const preview = useMemo(() => {
    if (!dateExpired) return null;
    const days = Math.ceil((new Date(dateExpired + 'T00:00:00').getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700 border-red-200' };
    if (days <= 30)
      return {
        label: `Expiring soon - ${days} day${days === 1 ? '' : 's'} left`,
        cls: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    return {
      label: `Valid - ${days} days left`,
      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  }, [dateExpired]);

  const existingBadge = useMemo(() => {
    if (!existing?.date_expired) return null;
    const days = Math.ceil(
      (new Date(existing.date_expired + 'T00:00:00').getTime() - Date.now()) / 86400000
    );
    if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700 border-red-200' };
    if (days <= 30) return { label: 'Expiring soon', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }, [existing]);

  const downloadExistingPdf = (row: MoaRecord) => {
    if (!row) return;
    const doc = buildMoaPdf({
      companyName: companyName || 'Company',
      companyRep: row.company_rep ?? '',
      schoolRep: row.school_rep ?? '',
      moaNumber: row.moa_number ?? '',
      dateStarted: row.date_started ?? '',
      dateExpired: row.date_expired ?? '',
      schoolSignature: row.school_signature,
      companySignature: row.company_signature,
      schoolSignedAt: row.school_signed_at,
      companySignedAt: row.company_signed_at,
    });
    doc.save(`MOA-${(row.moa_number ?? 'document').replace(/[^\w-]/g, '')}.pdf`);
  };

  // Opens the same MOA PDF in an in-page iframe overlay so the admin can read it
  // in-system without downloading. The Download MOA button beside it saves the file.
  const viewExistingPdf = (row: MoaRecord) => {
    if (!row) return;
    const doc = buildMoaPdf({
      companyName: companyName || 'Company',
      companyRep: row.company_rep ?? '',
      schoolRep: row.school_rep ?? '',
      moaNumber: row.moa_number ?? '',
      dateStarted: row.date_started ?? '',
      dateExpired: row.date_expired ?? '',
      schoolSignature: row.school_signature,
      companySignature: row.company_signature,
      schoolSignedAt: row.school_signed_at,
      companySignedAt: row.company_signed_at,
    });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setViewer({ url, isBlob: true, download: () => downloadExistingPdf(row) });
  };

  // View an uploaded (Option A) file inline from a submissions row (the select('*')
  // load already includes document_data).
  const viewUploadedSub = (row: SubRow) => {
    const dd = row.document_data;
    if (!dd) return;
    setViewer({
      url: dd,
      isBlob: false,
      download: () => decodeAndDownload(dd, row.document_name || 'moa-upload'),
    });
  };

  // View an uploaded file from an inbox row (the inbox select excludes
  // document_data, so fetch it on demand first).
  const viewInboxUpload = async (row: InboxMoa) => {
    const { data } = await supabase
      .from('moa_documents')
      .select('document_data, document_name')
      .eq('id', row.id)
      .maybeSingle();
    const rec = data as { document_data: string | null; document_name: string | null } | null;
    const dd = rec?.document_data;
    const dn = rec?.document_name ?? null;
    if (!dd) return;
    setViewer({
      url: dd,
      isBlob: false,
      download: () => decodeAndDownload(dd, dn || 'moa-upload'),
    });
  };

  // View a generated MOA PDF from an inbox row in the in-page viewer.
  const viewInboxPdf = (row: InboxMoa) => {
    const doc = buildMoaPdf({
      companyName: row.companyName,
      companyRep: row.company_rep ?? '',
      schoolRep: row.school_rep ?? '',
      moaNumber: row.moa_number ?? '',
      dateStarted: row.date_started ?? '',
      dateExpired: row.date_expired ?? '',
      schoolSignature: row.school_signature,
      companySignature: row.company_signature,
      schoolSignedAt: row.school_signed_at,
      companySignedAt: row.company_signed_at,
    });
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setViewer({ url, isBlob: true, download: () => downloadInboxPdf(row) });
  };

  const closeViewer = () => {
    setViewer((prev) => {
      if (prev?.isBlob) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  // inbox row helpers
  const inboxChip = (r: InboxMoa) => {
    if (r.submission_type === 'company_submitted') {
      if (r.review_status === 'pending')
        return { label: 'Company-submitted · Pending review', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
      if (r.review_status === 'rejected')
        return { label: 'Company-submitted · Rejected', cls: 'bg-red-100 text-red-700 border-red-200' };
      if (r.review_status === 'approved')
        return { label: 'Company-submitted · Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    if (r.company_signature && r.school_signature)
      return { label: 'Fully signed', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    if (r.company_signature)
      return {
        label: 'Signed by company — awaiting school',
        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    return { label: 'Awaiting company signature', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  };

  const isFreshSig = (r: InboxMoa) =>
    !!r.company_signed_at && Date.now() - new Date(r.company_signed_at).getTime() < 48 * 3600 * 1000;

  const downloadInboxPdf = (row: InboxMoa) => {
    const doc = buildMoaPdf({
      companyName: row.companyName,
      companyRep: row.company_rep ?? '',
      schoolRep: row.school_rep ?? '',
      moaNumber: row.moa_number ?? '',
      dateStarted: row.date_started ?? '',
      dateExpired: row.date_expired ?? '',
      schoolSignature: row.school_signature,
      companySignature: row.company_signature,
      schoolSignedAt: row.school_signed_at,
      companySignedAt: row.company_signed_at,
    });
    doc.save(`MOA-${(row.moa_number ?? 'document').replace(/[^\w-]/g, '')}.pdf`);
  };

  // for uploaded (Option A) rows: fetch the stored file on demand and download it
  const downloadInboxUpload = async (row: InboxMoa) => {
    const { data } = await supabase
      .from('moa_documents')
      .select('document_data, document_name')
      .eq('id', row.id)
      .maybeSingle();
    const rec = data as { document_data: string | null; document_name: string | null } | null;
    if (rec?.document_data) decodeAndDownload(rec.document_data, rec.document_name || 'moa-upload');
  };

  // RE-EDIT: replace the school signature on the existing MOA, PDF rebuilt instantly
  const saveSchoolResign = async () => {
    if (!existing || !resignSig) return;
    setBusy(true);
    const signedAt = new Date().toISOString();
    const { error } = await supabase
      .from('moa_documents')
      .update({ school_signature: resignSig, school_signed_at: signedAt })
      .eq('id', existing.id);
    setBusy(false);
    if (error) {
      setExistingErr(error.message);
      return;
    }
    const refreshed: MoaRecord = { ...existing, school_signature: resignSig, school_signed_at: signedAt };
    setExisting(refreshed);
    setShowResignPad(false);
    setResignSig(null);
    setOkMsg(
      `School signature updated on ${refreshed.moa_number ?? 'existing MOA'}. Use the Download MOA button to save the updated PDF.`
    );
    loadInbox();
    loadSubmissions();
  };

  // ---------- review actions for company submissions ----------
  const approveSubmission = async (row: SubRow) => {
    setReviewBusy(true);
    setSubsErr('');
    setSubsMsg('');
    const { error } = await supabase
      .from('moa_documents')
      .update({ review_status: 'approved', review_notes: null, reviewed_at: new Date().toISOString() })
      .eq('id', row.id);
    setReviewBusy(false);
    if (error) {
      setSubsErr(error.message);
      return;
    }
    await notifyCompany(
      row.user_id,
      'MOA Approved',
      `Your MOA "${row.moa_number || row.document_name || 'submission'}" was approved by the school. Open the Submit MOA tab on your dashboard to view it and add your e-signature if you have not yet.`
    );
    setSubsMsg(
      `Approved "${row.moa_number || row.document_name || 'submission'}" for ${row.companyName} — the company was notified. To countersign it, choose the company above and use "Add School Signature" in the Existing MOA panel.`
    );
    loadSubmissions();
    loadInbox();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectTarget.reason.trim();
    if (!reason) {
      setSubsErr('Please type a short rejection reason — the company will see it.');
      return;
    }
    setReviewBusy(true);
    setSubsErr('');
    const { error } = await supabase
      .from('moa_documents')
      .update({ review_status: 'rejected', review_notes: reason, reviewed_at: new Date().toISOString() })
      .eq('id', rejectTarget.row.id);
    setReviewBusy(false);
    if (error) {
      setSubsErr(error.message);
      return;
    }
    await notifyCompany(
      rejectTarget.row.user_id,
      'MOA Rejected — Revision Needed',
      `Your MOA "${rejectTarget.row.moa_number || rejectTarget.row.document_name || 'submission'}" was not approved. Reason: ${reason}. Open the Submit MOA tab to revise and resubmit.`
    );
    setSubsMsg(
      `Rejected "${rejectTarget.row.moa_number || rejectTarget.row.document_name || 'submission'}" — the company was notified with your reason and can revise & resubmit.`
    );
    setRejectTarget(null);
    loadSubmissions();
    loadInbox();
  };

  const handleGenerate = async () => {
    setOkMsg('');
    setErrMsg('');
    if (!companyId) return setErrMsg('Please choose a company first.');
    if (!moaNumber.trim()) return setErrMsg('MOA No. is required (e.g. MOA-2026-0001).');
    if (!dateStarted || !dateExpired) return setErrMsg('Both dates are required.');
    if (new Date(dateExpired + 'T00:00:00') <= new Date(dateStarted + 'T00:00:00'))
      return setErrMsg('"Valid Until" must be after "Date Started".');

    setGenerating(true);
    const signedAt = new Date().toISOString();
    const { error } = await supabase.from('moa_documents').insert({
      company_id: companyId,
      moa_number: moaNumber.trim(),
      date_started: dateStarted,
      date_expired: dateExpired,
      company_rep: companyRep.trim() || null,
      school_rep: schoolRep.trim() || null,
      school_signature: schoolSig,
      school_signed_at: schoolSig ? signedAt : null,
      created_by: adminId,
    });
    setGenerating(false);

    if (error) {
      const hint = /column|42703/i.test(error.message)
        ? ' — run the MOA signature migration SQL in Supabase first.'
        : '';
      setErrMsg(error.message + hint);
      return;
    }

    setOkMsg(
      `MOA ${moaNumber.trim()} saved for ${companyName}.` +
        (schoolSig
          ? ' School e-signature included.'
          : ' School line is unsigned — you can re-sign anytime below.') +
        ' Download it with the Download MOA button in the Existing MOA panel below. The company receives it on their dashboard (auto-refreshes).'
    );
    setMoaNumber('');
    setSchoolSig(null);
    setShowSchoolPad(false);
    loadExisting(companyId);
    loadInbox();
    loadSubmissions();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">MOA Generator</h2>
      <p className="mt-1 text-sm text-slate-500">
        Creates a School–Company Memorandum of Agreement — one MOA per company. Students are covered
        separately through the hiring flow.
      </p>

      {/* SIGNATURE INBOX — company signs, admin receives here */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Signature Inbox</h3>
            <p className="text-xs text-slate-400">
              Every MOA and its signing status — when a company signs, it shows up here.
            </p>
          </div>
          <button
            type="button"
            onClick={loadInbox}
            disabled={loadingInbox}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            {loadingInbox ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {inbox.length === 0 && !loadingInbox && (
          <p className="mt-3 text-sm text-slate-500">No MOAs yet — generate one below.</p>
        )}

        {inbox.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <svg className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Filter by company or MOA no.…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              {groupedInbox.length} compan{groupedInbox.length === 1 ? 'y' : 'ies'} · {inbox.length} MOA{inbox.length === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {inbox.length > 0 && groupedInbox.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No MOAs match &quot;{inboxSearch}&quot;.</p>
        )}

        <div className="mt-3 grid gap-2">
          {groupedInbox.map((group) => (
            <details key={group.key} open={groupedInbox.length <= 2} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="text-sm font-semibold text-slate-800">{group.companyName}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{group.rows.length}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {group.rows.filter((r) => r.company_signature && r.school_signature).length} fully signed · {group.rows.filter((r) => !r.company_signature).length} awaiting company
                </span>
              </summary>
              <div className="divide-y divide-slate-100">
                {group.rows.map((r) => {
                  const chip = inboxChip(r);
                  return (
                    <div key={r.id} className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.moa_number || '—'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fmtShort(r.date_started)} → {fmtShort(r.date_expired)}
                            {' · '}School:{' '}
                            {r.school_signature ? `signed ${fmtShort(r.school_signed_at)}` : 'unsigned'}{' '}{' · '}Company:{' '}
                            {r.company_signature ? `signed ${fmtShort(r.company_signed_at)}` : 'awaiting'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isFreshSig(r) && (
                            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">
                              New signature received
                            </span>
                          )}
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${chip.cls}`}>
                            {chip.label}
                          </span>
                          {r.document_name && (
                            <button
                              type="button"
                              onClick={() => viewInboxUpload(r)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View file
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => viewInboxPdf(r)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View MOA
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadInboxPdf(r)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Download MOA
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* COMPANY SUBMISSIONS — Option A / Option B review */}
      <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              Company Submissions
              {pendingCount > 0 && (
                <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {pendingCount} pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Option A (uploaded file) / Option B (created) MOAs from companies. Approve, or reject
              with a reason — the company is notified automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSubmissions}
            disabled={loadingSubs}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            {loadingSubs ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {subsErr && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            {subsErr}
            {/column|42703/i.test(subsErr) ? ' — run SQL-moa-submissions.sql in Supabase first.' : ''}
          </p>
        )}
        {subsMsg && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
            {subsMsg}
          </p>
        )}

        {sortedSubs.length === 0 && !loadingSubs && (
          <p className="mt-3 text-sm text-slate-500">
            No company submissions yet — companies send MOAs from the &quot;Submit MOA&quot; tab (Option A / Option B).
          </p>
        )}

        {sortedSubs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <svg className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={subsSearch}
                onChange={(e) => setSubsSearch(e.target.value)}
                placeholder="Filter by company, MOA no. or filename…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-[11px] text-slate-500">
              {groupedSubs.length} compan{groupedSubs.length === 1 ? 'y' : 'ies'} · {sortedSubs.length} submission{sortedSubs.length === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {sortedSubs.length > 0 && groupedSubs.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No submissions match &quot;{subsSearch}&quot;.</p>
        )}

        <div className="mt-3 grid gap-2">
          {groupedSubs.map((group) => (
            <details key={group.key} open={groupedSubs.length <= 2} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-sm font-semibold text-slate-800">{group.companyName}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{group.rows.length}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {group.rows.filter((r) => r.review_status === 'pending').length} pending · {group.rows.filter((r) => r.review_status === 'approved').length} approved
                </span>
              </summary>
              <div className="divide-y divide-slate-100">
                {group.rows.map((r) => {
                  const label = r.moa_number || r.document_name || 'Submission';
                  const st = r.review_status;
                  return (
                    <div key={r.id} className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {label}
                            {r.document_name && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                uploaded file
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fmtShort(r.date_started)} → {fmtShort(r.date_expired)}
                            {' · '}Rep: {r.company_rep || '—'}
                            {' · '}Company sig:{' '}
                            {r.company_signature ? `received ${fmtShort(r.company_signed_at)}` : 'not attached'}
                          </p>
                          {r.review_notes && st === 'rejected' && (
                            <p className="mt-1 text-xs text-red-600">Reason: {r.review_notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reviewBadgeCls(st)}`}>
                            {st === 'pending' ? 'Pending review' : st === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                          {r.document_name && (
                            <button
                              type="button"
                              onClick={() => viewUploadedSub(r)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View file
                            </button>
                          )}
                          {st === 'pending' && rejectTarget?.row.id !== r.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveSubmission(r)}
                                disabled={reviewBusy}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget({ row: r, reason: '' })}
                                disabled={reviewBusy}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {st === 'pending' && rejectTarget?.row.id === r.id && (
                            <>
                              <input
                                value={rejectTarget.reason}
                                onChange={(e) =>
                                  setRejectTarget({ row: rejectTarget.row, reason: e.target.value })
                                }
                                placeholder="Reason (sent to the company)…"
                                className="w-56 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                              <button
                                type="button"
                                onClick={confirmReject}
                                disabled={reviewBusy}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
                              >
                                {reviewBusy ? 'Saving…' : 'Confirm reject'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(null)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      {okMsg && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {okMsg}
        </div>
      )}
      {errMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* existing MOA strip with school RE-SIGN + received company signature preview */}
      {companyId && existingErr && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Could not read signature data: {existingErr} — if it mentions a missing column, run the MOA
          signature migration SQL in Supabase.
        </div>
      )}
      {companyId && existing && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800">Existing MOA: {existing.moa_number || '—'}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {fmtShort(existing.date_started)} → {fmtShort(existing.date_expired)}
                {' · '}School:{' '}
                {existing.school_signature ? `signed ${fmtShort(existing.school_signed_at)}` : 'unsigned'}
                {' · '}Company:{' '}
                {existing.company_signature ? `signed ${fmtShort(existing.company_signed_at)}` : 'awaiting signature'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {existing.submission_type === 'company_submitted' && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
                  Company-submitted{existing.review_status ? ` · ${existing.review_status}` : ''}
                </span>
              )}
              {existingBadge && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${existingBadge.cls}`}>
                  {existingBadge.label}
                </span>
              )}
            </div>
          </div>

          {/* RECEIVED company signature — proof that the admin got their e-signature */}
          {existing.company_signature ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-700">
                Company signature received {fmtShort(existing.company_signed_at)}
              </p>
              <img
                src={existing.company_signature ?? undefined}
                alt="Company signature received"
                className="mt-2 h-16 rounded-lg border border-emerald-200 bg-white"
              />
              <p className="mt-1 text-[11px] text-emerald-600">
                Signed by {existing.company_rep || 'company representative'} — included in the PDF download.
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              Awaiting company signature — it will appear here automatically the moment they sign on their
              dashboard (their MOA card checks every 15 seconds, this panel refreshes with Refresh / page reload).
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowResignPad((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {showResignPad ? 'Cancel re-sign' : existing.school_signature ? 'Re-sign School Signature' : 'Add School Signature'}
            </button>
            <button
              type="button"
              onClick={() => viewExistingPdf(existing)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              View MOA
            </button>
            <button
              type="button"
              onClick={() => downloadExistingPdf(existing)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Download MOA
            </button>
          </div>

          {showResignPad && (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-white p-3">
              {existing.school_signature && (
                <>
                  <p className="mb-1 text-xs font-semibold text-amber-700">
                    Current school signature — it will be replaced
                  </p>
                  <img
                    src={existing.school_signature ?? undefined}
                    alt="Current school signature"
                    className="mb-2 h-16 rounded-lg border border-slate-200 bg-white"
                  />
                </>
              )}
              <SignaturePad onChange={setResignSig} />
              <button
                type="button"
                onClick={saveSchoolResign}
                disabled={!resignSig || busy}
                className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'Save School Signature'}
              </button>
            </div>
          )}

          <p className="mt-2 text-[11px] text-slate-400">
            Generating a new MOA below creates a newer version (renewal) — the company card always shows
            the latest one.
          </p>
        </div>
      )}

      {/* form */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Company *</label>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setOkMsg('');
              setErrMsg('');
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{loadingCompanies ? 'Loading companies…' : '— Choose a company —'}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">MOA No. *</label>
          <input
            value={moaNumber}
            onChange={(e) => setMoaNumber(e.target.value)}
            placeholder="e.g. MOA-2026-0001"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Date Started *</label>
          <input
            type="date"
            value={dateStarted}
            onChange={(e) => setDateStarted(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Valid Until *</label>
          <input
            type="date"
            value={dateExpired}
            onChange={(e) => setDateExpired(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {preview && (
            <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${preview.cls}`}>
              {preview.label}
            </span>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Company Representative</label>
          <input
            value={companyRep}
            onChange={(e) => setCompanyRep(e.target.value)}
            placeholder="Full name of the company signer"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">School Representative</label>
          <input
            value={schoolRep}
            onChange={(e) => setSchoolRep(e.target.value)}
            placeholder={`Full name of the ${SCHOOL_NAME} signer`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* school e-signature */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">School Representative Signature</p>
            <p className="text-xs text-slate-400">
              E-Signature: draw with mouse/finger or type your name. Optional — the school line stays
              blank if skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSchoolPad((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {showSchoolPad ? 'Hide' : schoolSig ? 'Signed — Edit' : 'Sign now'}
          </button>
        </div>
        {showSchoolPad && <SignaturePad onChange={setSchoolSig} />}
        {schoolSig && !showSchoolPad && (
          <img
            src={schoolSig ?? undefined}
            alt="School signature preview"
            className="h-16 rounded-lg border border-slate-200 bg-white"
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || loadingCompanies}
        className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? 'Generating…' : 'Generate MOA + PDF'}
      </button>

      {/* IN-PAGE PDF VIEWER — View MOA / View file without downloading */}
      {viewer && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/70 p-4"
          onClick={closeViewer}
        >
          <div
            className="mb-2 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-semibold text-white">MOA Preview</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={viewer.download}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Download
              </button>
              <button
                type="button"
                onClick={closeViewer}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
          <iframe
            src={viewer.url}
            className="h-full w-full rounded-lg bg-white"
            title="MOA preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
