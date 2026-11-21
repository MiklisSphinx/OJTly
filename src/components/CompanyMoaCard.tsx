'use client';

// components/CompanyMoaSection.tsx   (FULL REPLACEMENT for the old MOA card)
//
// One complete MOA hub for the company dashboard. Two directions in one place:
//
//  TAB 1 - "Received from School"
//    MOAs issued by the OJT Coordinator (admin panel) appear here automatically
//    (auto-checks every 15 seconds). The company signs with an E-Signature
//    (draw / type + consent checkbox). Signed wrong? "Edit Signature" re-signs
//    and the PDF is rebuilt instantly. The admin receives the signature in
//    their Signature Inbox the moment it is saved.
//
//  TAB 2 - "Submit MOA"   (Option A / Option B)
//    Option A - Upload an existing MOA file (PDF/JPG/PNG, up to ~4 MB).
//    Option B - Create the MOA right here (form + optional own E-Signature).
//    Submission goes to: Pending Admin Review -> Approved (company notified)
//    or Rejected (reason shown, "Revise & Resubmit" reopens the form).
//
//  Requires SQL-moa-submissions.sql (submission/review columns + test cleanup).
//  Without that SQL, Tab 1 still works; Tab 2 asks you to run the SQL.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { buildMoaPdf } from '@/lib/moaPdf';
import SignaturePad from '@/components/SignaturePad';

type MoaRow = {
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

type RecvStatus = 'pending' | 'active' | 'expiring' | 'expired';
type ReviewState = 'pending' | 'approved' | 'rejected';

const THEMES: Record<RecvStatus, { ring: string; bg: string; badge: string; dot: string; label: string }> = {
  pending: { ring: 'border-indigo-200', bg: 'bg-indigo-50/60', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', label: 'Pending Signature' },
  active: { ring: 'border-emerald-200', bg: 'bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
  expiring: { ring: 'border-amber-200', bg: 'bg-amber-50/60', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Expiring Soon' },
  expired: { ring: 'border-red-200', bg: 'bg-red-50/60', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Expired' },
};

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

const hintErr = (msg: string) => {
  if (/submission_type|review_status|document_data|document_name|42703/i.test(msg))
    return msg + ' — run SQL-moa-submissions.sql in Supabase first (it adds the submission columns).';
  if (/policy|row-level|42501/i.test(msg))
    return msg + ' — RLS blocked the write. If ROW LEVEL SECURITY was re-enabled on moa_documents, disable it again for the demo.';
  return msg;
};

const reviewOf = (r: MoaRow | null | undefined): ReviewState | null => {
  const s = r?.review_status;
  return s === 'pending' || s === 'approved' || s === 'rejected' ? s : null;
};

const fileToDataUrl = (f: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(f);
  });

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

// Small 3-step tracker: Submitted -> Admin review -> Decision
function Tracker({ status }: { status: ReviewState }) {
  const dot = (state: 'done' | 'active' | 'bad' | 'todo', label: string) => {
    const cls =
      state === 'done'
        ? 'bg-emerald-500 text-white'
        : state === 'active'
          ? 'bg-amber-400 text-white animate-pulse'
          : state === 'bad'
            ? 'bg-red-500 text-white'
            : 'bg-slate-200 text-slate-400';
    return (
      <div className="flex items-center gap-1.5">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${cls}`}>
          {state === 'done' ? '✓' : state === 'bad' ? '✕' : ''}
        </span>
        <span className={`font-semibold ${state === 'todo' ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      </div>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {dot('done', 'Submitted')}
      <span className="h-px w-6 bg-slate-300" />
      {dot(status === 'pending' ? 'active' : 'done', 'Admin review')}
      <span className="h-px w-6 bg-slate-300" />
      {dot(status === 'approved' ? 'done' : status === 'rejected' ? 'bad' : 'todo', status === 'rejected' ? 'Rejected' : 'Decision')}
    </div>
  );
}

const reviewBadgeCls = (s: ReviewState) =>
  s === 'approved'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : s === 'rejected'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';

export default function CompanyMoaSection() {
  // ---------- data ----------
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<{ id: string; company_name: string } | null>(null);
  const [uid, setUid] = useState('');
  const [companyMissing, setCompanyMissing] = useState(false);
  const [dbErr, setDbErr] = useState('');
  const [received, setReceived] = useState<MoaRow[]>([]);   // submission_type = admin_issued (school -> company)
  const [submissions, setSubmissions] = useState<MoaRow[]>([]); // submission_type = company_submitted (company -> admin)
  const [tab, setTab] = useState<'received' | 'submit'>('received');

  // ---------- sign / re-sign modal (works for received MOAs AND own submissions) ----------
  const [signRow, setSignRow] = useState<MoaRow | null>(null);
  const [newSig, setNewSig] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [repName, setRepName] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  // ---------- submit form (Option A upload / Option B create) ----------
  const [formMode, setFormMode] = useState<'choose' | 'upload' | 'create'>('choose');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formMoaNumber, setFormMoaNumber] = useState('');
  const [formStart, setFormStart] = useState(todayStr());
  const [formExpiry, setFormExpiry] = useState(oneYearFromNow());
  const [formRep, setFormRep] = useState('');
  const [formSig, setFormSig] = useState<string | null>(null);
  const [formAgree, setFormAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [formOk, setFormOk] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // "Revise & Resubmit" target

  // in-page PDF viewer (View MOA / View uploaded file) — renders in an iframe
  // overlay so it never triggers a download.
  const [viewer, setViewer] = useState<{ url: string; isBlob: boolean; download: () => void } | null>(null);

  // ---------- load (also runs every 15 s so admin-issued MOAs appear by themselves) ----------
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setDbErr('');
    setCompanyMissing(false);
    const { data: s } = await supabase.auth.getSession();
    const userId = s?.session?.user?.id;
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[CompanyMoaSection] no session — supabase.auth.getSession() returned no user. ' +
            'This is the GoTrueClient-drift symptom: the @/lib/supabase client and the ' +
            '@/utils/supabase/client client are different instances. Apply the supabase-fix ' +
            'files (one shared singleton) and the warning + this log will disappear.'
        );
      }
      if (!silent) setLoading(false);
      return;
    }
    setUid(userId);
    const { data: comp, error: compErr } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (compErr) {
      setDbErr(compErr.message);
      if (!silent) setLoading(false);
      return;
    }
    if (!comp) {
      // logged in, but no companies row is linked to this login (companies.user_id)
      setCompanyMissing(true);
      if (!silent) setLoading(false);
      return;
    }
    setCompany(comp as { id: string; company_name: string });
    const { data: rows, error } = await supabase
      .from('moa_documents')
      .select('*')
      .eq('company_id', (comp as { id: string }).id)
      .order('created_at', { ascending: false });
    if (error) setDbErr(error.message);
    const all = ((rows ?? []) as MoaRow[]).filter((r) => r.submission_type !== 'company_submitted');
    const subs = ((rows ?? []) as MoaRow[]).filter((r) => r.submission_type === 'company_submitted');
    setReceived(all);
    setSubmissions(subs);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[CompanyMoaSection] load result:', {
        userId,
        companyId: (comp as { id: string } | null)?.id ?? null,
        companyName: (comp as { company_name: string } | null)?.company_name ?? null,
        rowsReturned: (rows ?? []).length,
        receivedCount: all.length,
        submissionsCount: subs.length,
        error: error?.message || null,
      });
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(() => {
      load(true);
    }, 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const moa = received[0] ?? null; // newest school-issued MOA is the primary one

  const status: RecvStatus = useMemo(() => {
    if (!moa) return 'pending';
    if (!moa.company_signature) return 'pending';
    if (!moa.date_expired) return 'active';
    const days = Math.ceil((new Date(moa.date_expired + 'T00:00:00').getTime() - Date.now()) / 86400000);
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'active';
  }, [moa]);

  const daysLeft = useMemo(() => {
    if (!moa?.date_expired) return null;
    return Math.ceil((new Date(moa.date_expired + 'T00:00:00').getTime() - Date.now()) / 86400000);
  }, [moa]);

  const isResign = !!signRow?.company_signature;

  // ---------- PDF + file helpers ----------
  const downloadPdf = (row: MoaRow) => {
    if (!row) return;
    const doc = buildMoaPdf({
      companyName: company?.company_name ?? 'Company',
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

  // Opens the MOA PDF in an in-page iframe overlay so the company can read it
  // in-system without downloading. The Download MOA button beside it saves the file.
  const viewPdf = (row: MoaRow) => {
    if (!row) return;
    const doc = buildMoaPdf({
      companyName: company?.company_name ?? 'Company',
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
    setViewer({ url, isBlob: true, download: () => downloadPdf(row) });
  };

  // View an uploaded (Option A) file inline — its document_data is already a
  // data: URL, which an iframe can render directly (no download).
  const viewUploaded = (row: MoaRow) => {
    if (!row.document_data) return;
    setViewer({
      url: row.document_data,
      isBlob: false,
      download: () => downloadUploaded(row),
    });
  };

  const closeViewer = () => {
    setViewer((prev) => {
      if (prev?.isBlob) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const downloadUploaded = (row: MoaRow) => {
    if (row.document_data) decodeAndDownload(row.document_data, row.document_name || 'moa-upload');
  };

  // ---------- sign / re-sign (shared by received MOAs and own submissions) ----------
  const openSign = (row: MoaRow) => {
    setNewSig(null);
    setAgree(false);
    setModalErr('');
    setRepName(row.company_rep ?? '');
    setSignRow(row);
  };

  const saveSign = async () => {
    if (!signRow) return;
    setModalErr('');
    if (!newSig) return setModalErr('Please draw or type your signature first.');
    if (!agree) return setModalErr('Please tick the agreement box — that is your electronic consent.');
    const finalRep = signRow.company_rep || repName.trim();
    if (!finalRep) return setModalErr('Please enter your full name (authorized representative).');

    setSaving(true);
    const signedAt = new Date().toISOString();
    const patch: Record<string, unknown> = {
      company_signature: newSig,
      company_signed_at: signedAt,
    };
    if (!signRow.company_rep) patch.company_rep = finalRep;
    const { error } = await supabase.from('moa_documents').update(patch).eq('id', signRow.id);
    setSaving(false);

    if (error) {
      setModalErr(hintErr(error.message));
      return;
    }

    setSignRow(null);
    load(true);
  };

  // ---------- submit form ----------
  const resetForm = () => {
    setFormMode('choose');
    setUploadFile(null);
    setFormSig(null);
    setFormAgree(false);
    setFormErr('');
    setEditingId(null);
  };

  const openUpload = () => {
    setEditingId(null);
    setUploadFile(null);
    setFormAgree(false);
    setFormErr('');
    setFormMode('upload');
  };

  const openCreate = () => {
    setEditingId(null);
    setFormMoaNumber(`MOA-${new Date().getFullYear()}-${String(submissions.length + 1).padStart(4, '0')}`);
    setFormStart(todayStr());
    setFormExpiry(oneYearFromNow());
    setFormRep('');
    setFormSig(null);
    setFormAgree(false);
    setFormErr('');
    setFormMode('create');
  };

  const startRevise = (row: MoaRow) => {
    setFormOk('');
    setEditingId(row.id);
    setFormAgree(false);
    setFormErr('');
    if (row.document_data) {
      setUploadFile(null);
      setFormMode('upload');
    } else {
      setFormMoaNumber(row.moa_number ?? '');
      setFormStart(row.date_started ?? todayStr());
      setFormExpiry(row.date_expired ?? oneYearFromNow());
      setFormRep(row.company_rep ?? '');
      setFormSig(row.company_signature ?? null);
      setFormMode('create');
    }
  };

  const submitUpload = async () => {
    if (!company) return;
    setFormErr('');
    if (!uploadFile) return setFormErr('Choose a file first (PDF, JPG or PNG).');
    if (!formAgree) return setFormErr('Please tick the confirmation box.');
    if (uploadFile.size > 4 * 1024 * 1024)
      return setFormErr('File is larger than 4 MB — please compress it or upload a smaller copy.');

    setSubmitting(true);
    let dataUrl = '';
    try {
      dataUrl = await fileToDataUrl(uploadFile);
    } catch (e) {
      setSubmitting(false);
      setFormErr(e instanceof Error ? e.message : 'Could not read the file.');
      return;
    }

    const payload: Record<string, unknown> = {
      company_id: company.id,
      moa_number: uploadFile.name.replace(/\.[^.]+$/, ''),
      document_name: uploadFile.name,
      document_data: dataUrl,
      submission_type: 'company_submitted',
      review_status: 'pending',
      review_notes: null,
      reviewed_at: null,
    };
    const res = editingId
      ? await supabase.from('moa_documents').update(payload).eq('id', editingId)
      : await supabase.from('moa_documents').insert(payload);
    setSubmitting(false);

    if (res.error) {
      setFormErr(hintErr(res.error.message));
      return;
    }
    resetForm();
    setFormOk('MOA uploaded and submitted — status: Pending Admin Review. The admin will approve it or send back a reason.');
    load(true);
  };

  const submitCreate = async () => {
    if (!company) return;
    setFormErr('');
    if (!formMoaNumber.trim()) return setFormErr('MOA No. is required.');
    if (!formStart || !formExpiry) return setFormErr('Both dates are required.');
    if (new Date(formExpiry + 'T00:00:00') <= new Date(formStart + 'T00:00:00'))
      return setFormErr('"Valid Until" must be after "Date Started".');
    if (!formRep.trim()) return setFormErr("Enter the company representative's full name.");
    if (!formAgree) return setFormErr('Please tick the confirmation box.');

    setSubmitting(true);
    const signedAt = formSig ? new Date().toISOString() : null;
    const payload: Record<string, unknown> = {
      company_id: company.id,
      moa_number: formMoaNumber.trim(),
      date_started: formStart,
      date_expired: formExpiry,
      company_rep: formRep.trim(),
      company_signature: formSig,
      company_signed_at: signedAt,
      submission_type: 'company_submitted',
      review_status: 'pending',
      review_notes: null,
      reviewed_at: null,
    };
    const res = editingId
      ? await supabase.from('moa_documents').update(payload).eq('id', editingId)
      : await supabase.from('moa_documents').insert(payload);
    setSubmitting(false);

    if (res.error) {
      setFormErr(hintErr(res.error.message));
      return;
    }
    resetForm();
    setFormOk(
      `MOA ${formMoaNumber.trim()} submitted — status: Pending Admin Review.` +
        (formSig ? ' Your e-signature was attached.' : ' You can add your e-signature after it is approved.')
    );
    load(true);
  };

  // ---------- loading / diagnostic states ----------
  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-400">Checking your MOA…</p>
      </div>
    );
  }

  if (companyMissing) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-amber-800">Account not linked to a company</h3>
        <p className="mt-2 text-sm text-amber-700">
          You are logged in, but no row in the <code className="rounded bg-amber-100 px-1">companies</code> table has{' '}
          <code className="rounded bg-amber-100 px-1">user_id</code> equal to your login id. Ask the admin to link it.
        </p>
        <p className="mt-2 text-xs text-amber-600">
          Your login user id: <span className="break-all font-mono">{uid || '(not signed in)'}</span>
        </p>
        <p className="mt-2 text-xs text-amber-600">
          Fix in Supabase: SQL Editor →{' '}
          <code className="rounded bg-amber-100 px-1">
            UPDATE companies SET user_id = '{uid || 'YOUR-LOGIN-UUID'}' WHERE company_name = 'Mick Tech';
          </code>
        </p>
      </div>
    );
  }

  const tabCls = (active: boolean) =>
    `rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Memorandum of Agreement</h3>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* tabs */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTab('received')} className={tabCls(tab === 'received')}>
          Received from School ({received.length})
        </button>
        <button type="button" onClick={() => setTab('submit')} className={tabCls(tab === 'submit')}>
          Submit MOA ({submissions.length})
        </button>
      </div>

      {/* ============================================ TAB 1: RECEIVED */}
      {tab === 'received' && (
        <div className="mt-4">
          {received.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">No MOA received yet</p>
              <p className="mt-1 text-xs text-slate-500">
                MOAs issued by the OJT Coordinator appear here automatically — no need to refresh. You can also
                submit your own MOA for admin review in the <span className="font-semibold">Submit MOA</span> tab.
              </p>
            </div>
          ) : (
            <>
              <div className={`rounded-xl border p-4 ${THEMES[status].ring} ${THEMES[status].bg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${THEMES[status].dot}`} />
                    <p className="text-sm font-bold text-slate-800">
                      {moa?.moa_number || 'MOA'} · {company?.company_name}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${THEMES[status].badge}`}>
                    {THEMES[status].label}
                  </span>
                </div>

                <div className="mt-3 grid gap-1 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">Validity:</span>{' '}
                    {fmtShort(moa?.date_started)} – {fmtShort(moa?.date_expired)}
                    {status !== 'pending' && daysLeft !== null && daysLeft >= 0 && (
                      <> ({daysLeft} day{daysLeft === 1 ? '' : 's'} left)</>
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">School:</span>{' '}
                    {moa?.school_signature
                      ? `Signed by ${moa.school_rep || 'school representative'} on ${fmtShort(moa.school_signed_at)}`
                      : 'School signature pending'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Company:</span>{' '}
                    {moa?.company_signature
                      ? `Signed by ${moa.company_rep || 'company representative'} on ${fmtShort(moa.company_signed_at)}`
                      : 'Waiting for your signature'}
                  </p>
                </div>

                {status === 'pending' && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => moa && openSign(moa)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Sign MOA
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      Draw or type your signature and tick the agreement box — that is your company&apos;s
                      E-Signature. The admin receives it instantly in their Signature Inbox.
                    </p>
                  </div>
                )}

                {status !== 'pending' && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moa && downloadPdf(moa)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Download MOA
                    </button>
                    <button
                      type="button"
                      onClick={() => moa && viewPdf(moa)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View MOA
                    </button>
                    <button
                      type="button"
                      onClick={() => moa && openSign(moa)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit Signature
                    </button>
                    <span className="text-xs text-slate-400">
                      Signed wrong? Re-sign anytime — the admin gets the new version immediately.
                    </span>
                  </div>
                )}

                {status === 'expired' && (
                  <p className="mt-3 text-xs text-red-600">
                    This MOA has expired — ask the OJT Coordinator to issue a renewed MOA.
                  </p>
                )}
              </div>

              {received.length > 1 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                    Show {received.length - 1} older record{received.length - 1 === 1 ? '' : 's'} on file
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {received.slice(1).map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="text-xs text-slate-600">
                          {r.moa_number || '—'} · {fmtShort(r.date_started)} → {fmtShort(r.date_expired)}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadPdf(r)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Download PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================ TAB 2: SUBMIT (Option A / B) */}
      {tab === 'submit' && (
        <div className="mt-4">
          {formOk && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {formOk}
            </div>
          )}

          {/* latest submission card with review tracker */}
          {submissions[0] && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {submissions[0].moa_number || submissions[0].document_name || 'Submission'}
                </p>
                {reviewOf(submissions[0]) && (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${reviewBadgeCls(reviewOf(submissions[0]) as ReviewState)}`}
                  >
                    {reviewOf(submissions[0]) === 'pending'
                      ? 'Pending Admin Review'
                      : reviewOf(submissions[0]) === 'approved'
                        ? 'Approved'
                        : 'Rejected'}
                  </span>
                )}
              </div>

              {reviewOf(submissions[0]) && (
                <div className="mt-3">
                  <Tracker status={reviewOf(submissions[0]) as ReviewState} />
                </div>
              )}

              <div className="mt-3 grid gap-1 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">Validity:</span>{' '}
                  {fmtShort(submissions[0].date_started)} – {fmtShort(submissions[0].date_expired)}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Company:</span>{' '}
                  {submissions[0].company_signature
                    ? `Signed by ${submissions[0].company_rep || 'company representative'} on ${fmtShort(submissions[0].company_signed_at)}`
                    : 'Your signature not attached yet'}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">School:</span>{' '}
                  {submissions[0].school_signature
                    ? `Countersigned by ${submissions[0].school_rep || 'school representative'} on ${fmtShort(submissions[0].school_signed_at)}`
                    : 'Waiting for the school countersignature'}
                </p>
              </div>

              {reviewOf(submissions[0]) === 'rejected' && submissions[0].review_notes && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-700">Reason from the admin</p>
                  <p className="mt-1 text-xs text-red-600">{submissions[0].review_notes}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {reviewOf(submissions[0]) === 'approved' && (
                  <button
                    type="button"
                    onClick={() => downloadPdf(submissions[0])}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Download MOA PDF
                  </button>
                )}
                {reviewOf(submissions[0]) === 'approved' && !submissions[0].company_signature && (
                  <button
                    type="button"
                    onClick={() => openSign(submissions[0])}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Add my signature
                  </button>
                )}
                {reviewOf(submissions[0]) === 'rejected' && (
                  <button
                    type="button"
                    onClick={() => startRevise(submissions[0])}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Revise &amp; Resubmit
                  </button>
                )}
                {submissions[0].document_data && (
                  <button
                    type="button"
                    onClick={() => viewUploaded(submissions[0])}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    View uploaded file
                  </button>
                )}
                {reviewOf(submissions[0]) === 'pending' && (
                  <span className="text-xs text-slate-500">Waiting for the admin to review — this card updates itself.</span>
                )}
              </div>
            </div>
          )}

          {submissions.length > 1 && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                Show {submissions.length - 1} older submission{submissions.length - 1 === 1 ? '' : 's'}
              </summary>
              <div className="mt-2 grid gap-2">
                {submissions.slice(1).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-xs text-slate-600">
                      {r.moa_number || r.document_name || '—'} ·{' '}
                      {reviewOf(r) === 'pending'
                        ? 'pending'
                        : reviewOf(r) === 'approved'
                          ? 'approved'
                          : reviewOf(r) === 'rejected'
                            ? 'rejected'
                            : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadPdf(r)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* method chooser / forms */}
          {formMode === 'choose' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Choose MOA Submission Method</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openUpload}
                  className="rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Option A</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">Upload Existing MOA</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload your signed MOA file (PDF / JPG / PNG, max 4 MB) and send it to the admin for review.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-400"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Option B</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">Create MOA</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Fill out the MOA details here, optionally attach your E-Signature, and submit for review.
                  </p>
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Flow: Submit MOA → Pending Admin Review → Approved (you are notified) or Rejected (reason provided;
                revise and resubmit).
              </p>
            </div>
          )}

          {formMode === 'upload' && (
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">
                  Option A — Upload Existing MOA{editingId ? ' (replacing the rejected upload)' : ''}
                </p>
                <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] ?? null);
                  setFormErr('');
                }}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
              />
              {uploadFile && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {uploadFile.name} ({Math.round(uploadFile.size / 1024)} KB)
                </p>
              )}
              <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={formAgree}
                  onChange={(e) => setFormAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  I confirm this document is the actual MOA of {company?.company_name || 'our company'} and I am
                  authorized to submit it for review.
                </span>
              </label>
              {formErr && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{formErr}</p>
              )}
              <button
                type="button"
                onClick={submitUpload}
                disabled={submitting}
                className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Uploading…' : 'Upload & Submit for Review'}
              </button>
            </div>
          )}

          {formMode === 'create' && (
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">
                  Option B — Create MOA{editingId ? ' (revision)' : ''}
                </p>
                <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">MOA No. *</label>
                  <input
                    value={formMoaNumber}
                    onChange={(e) => setFormMoaNumber(e.target.value)}
                    placeholder="e.g. MOA-2026-0001"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Company Representative *</label>
                  <input
                    value={formRep}
                    onChange={(e) => setFormRep(e.target.value)}
                    placeholder="Full name of the company signer"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Date Started *</label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Valid Until *</label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Your E-Signature (optional but recommended)</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Attach your company&apos;s signature now — or add it later after the admin approves.
                </p>
                {formSig && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                    <p className="text-[11px] font-semibold text-amber-700">
                      Current signature — redraw below to replace it, or keep it
                    </p>
                    <img
                      src={formSig}
                      alt="Current company signature"
                      className="mt-1 h-14 rounded border border-amber-200 bg-white"
                    />
                  </div>
                )}
                <div className="mt-2">
                  <SignaturePad onChange={setFormSig} />
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={formAgree}
                  onChange={(e) => setFormAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  I confirm I am authorized to submit this MOA on behalf of {company?.company_name || 'our company'}.
                  {formSig ? ' My attached signature constitutes my electronic signature (E-Signature).' : ''}
                </span>
              </label>

              {formErr && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{formErr}</p>
              )}
              <button
                type="button"
                onClick={submitCreate}
                disabled={submitting}
                className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit MOA for Review'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* db error banner */}
      {dbErr && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
          DB: {hintErr(dbErr)}
        </p>
      )}

      {/* ============================================ SIGN / RE-SIGN MODAL */}
      {signRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!saving) setSignRow(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                {isResign ? 'Re-sign' : 'Sign'} MOA {signRow.moa_number || ''}
              </h3>
              <button
                type="button"
                onClick={() => setSignRow(null)}
                className="text-lg leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold">Company:</span> {company?.company_name || '—'}
              </p>
              <p>
                <span className="font-semibold">Validity:</span> {fmtShort(signRow.date_started)} –{' '}
                {fmtShort(signRow.date_expired)}
              </p>
              <p>
                <span className="font-semibold">School side:</span>{' '}
                {signRow.school_signature
                  ? `Signed by ${signRow.school_rep || 'school representative'}`
                  : 'School signature pending'}
              </p>
            </div>

            {isResign && signRow.company_signature && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-amber-700">
                  Your current signature — it will be replaced
                </p>
                <img
                  src={signRow.company_signature}
                  alt="Current company signature"
                  className="h-16 rounded-lg border border-amber-200 bg-white"
                />
              </div>
            )}

            {!signRow.company_rep && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Your full name (authorized representative)
                </label>
                <input
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <SignaturePad onChange={setNewSig} />

            <label className="mt-4 flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                I confirm I am authorized to sign on behalf of {company?.company_name || 'this company'} and I agree to
                the terms of this Memorandum of Agreement. Drawing/typing my name and ticking this box constitutes my
                electronic signature (E-Signature).
              </span>
            </label>

            {modalErr && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{modalErr}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignRow(null)}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSign}
                disabled={!newSig || !agree || saving || (!signRow.company_rep && !repName.trim())}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : isResign ? 'Save New Signature' : 'Save & Sign'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Signed electronically via OJTly — the signature image and timestamp are stored with this MOA and the
              admin receives it immediately. You can re-edit your signature anytime.
            </p>
          </div>
        </div>
      )}

      {/* IN-PAGE PDF VIEWER — View MOA / View uploaded file without downloading */}
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
