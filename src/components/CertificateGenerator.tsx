'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { jsPDF } from 'jspdf';
import { logAuditAction } from '@/utils/audit';

const supabase = createClient();

interface CompletedApp {
  application_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course: string | null;
  company_id: string;
  company_name: string;
  post_id: string;
  post_title: string;
  required_hours: number | null;
  hours_rendered: number;
  start_date: string | null;
  end_date: string | null;
  has_certificate: boolean;
  certificate_id?: string;
  certificate_number?: string;
  certificate_pdf_url?: string | null;
  issued_at?: string;
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export default function CertificateGenerator({ adminId }: { adminId: string }) {
  const [completedApps, setCompletedApps] = useState<CompletedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [collapsedStudents, setCollapsedStudents] = useState<Set<string>>(new Set());

  const toggleStudent = (key: string) => {
    setCollapsedStudents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsedStudents(new Set());
  const collapseAll = () => setCollapsedStudents(new Set(groupedByStudent.map(g => g.key)));

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select(`id, student_id, post_id, company_id, status, created_at, profiles!applications_student_id_fkey ( full_name, email, course ), companies!applications_company_id_fkey ( company_name ), ojt_posts!applications_post_id_fkey ( title, duration_hours )`)
        .in('status', ['Completed', 'completed'])
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      const appIds = (apps || []).map((a: any) => a.id);
      const { data: certs } = await supabase
        .from('certificates')
        .select('id, certificate_number, application_id, pdf_url, issued_at, status')
        .in('application_id', appIds);

      const certMap: Record<string, any> = {};
      (certs || []).forEach((c: any) => { certMap[c.application_id] = c; });

      const hoursMap: Record<string, number> = {};
      if (appIds.length > 0) {
        const promises = appIds.map(async (appId: string) => {
          const { data } = await supabase.rpc('get_archived_hours_for_app', { p_application_id: appId });
          hoursMap[appId] = Number(data) || 0;
        });
        await Promise.all(promises);
      }

      const normalized: CompletedApp[] = (apps || []).map((a: any) => {
        const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const company = Array.isArray(a.companies) ? a.companies[0] : a.companies;
        const post = Array.isArray(a.ojt_posts) ? a.ojt_posts[0] : a.ojt_posts;
        const cert = certMap[a.id];
        const requiredHours = Number(post?.duration_hours) || 0;
        return {
          application_id: a.id,
          student_id: a.student_id,
          student_name: profile?.full_name || 'Unknown Student',
          student_email: profile?.email || '',
          course: profile?.course || null,
          company_id: a.company_id,
          company_name: company?.company_name || 'Unknown Company',
          post_id: a.post_id,
          post_title: post?.title || 'Untitled Post',
          required_hours: requiredHours,
          hours_rendered: hoursMap[a.id] || 0,
          start_date: a.created_at ? a.created_at.slice(0, 10) : null,
          end_date: new Date().toISOString().slice(0, 10),
          has_certificate: !!cert,
          certificate_id: cert?.id,
          certificate_number: cert?.certificate_number,
          certificate_pdf_url: cert?.pdf_url || null,
          issued_at: cert?.issued_at,
        };
      });

      setCompletedApps(normalized);
    } catch (err: any) {
      const describe = (e: any): string => {
        if (!e) return 'Unknown error';
        if (typeof e === 'string') return e;
        return [e.message, e.code && `code=${e.code}`, e.hint && `hint=${e.hint}`, e.details && `details=${e.details}`].filter(Boolean).join(' | ');
      };
      const desc = describe(err);
      console.error('❌ Certificate generation error:', desc, err);
      addToast(`Failed: ${desc}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  interface StudentGroup {
    key: string;
    studentName: string;
    course: string | null;
    certs: CompletedApp[];
  }
  const groupedByStudent = useMemo<StudentGroup[]>(() => {
    const map: Record<string, StudentGroup> = {};
    for (const app of completedApps) {
      const key = app.student_id || app.student_name || 'unknown';
      if (!map[key]) {
        map[key] = {
          key,
          studentName: app.student_name,
          course: app.course,
          certs: [],
        };
      }
      map[key].certs.push(app);
    }
    return Object.values(map).sort((a, b) =>
      a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' })
    );
  }, [completedApps]);

  const generateCertificate = async (app: CompletedApp) => {
    setGenerating(app.application_id);
    try {
      const { data: certNum, error: numError } = await supabase.rpc('next_certificate_number');
      if (numError) throw numError;
      if (!certNum) throw new Error('Failed to generate certificate number');

      const verificationToken = crypto.randomUUID();
      const verifyUrl = `${window.location.origin}/verify/${verificationToken}`;

      // ✅ PRE-FETCH QR CODE as base64 data URL — fixes "QR not scanning"
      let qrDataUrl: string | null = null;
      try {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`;
        const response = await fetch(qrApiUrl);
        const blob = await response.blob();
        qrDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log('✅ QR pre-fetched as data URL');
      } catch (qrErr) {
        console.warn('⚠️ QR fetch failed, will use text fallback:', qrErr);
      }

      const pdfBlob = buildCertificatePDF({
        certificateNumber: certNum,
        studentName: app.student_name,
        companyName: app.company_name,
        postTitle: app.post_title,
        course: app.course,
        hoursRendered: app.hours_rendered,
        requiredHours: app.required_hours || 0,
        startDate: app.start_date,
        endDate: app.end_date,
        verifyUrl,
        qrDataUrl,
      });

      let pdfUrl: string | null = null;
      try {
        const fileName = `certificate-${certNum}.pdf`;
        const filePath = `certificates/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('certificates')
            .getPublicUrl(filePath);
          pdfUrl = publicUrl;
        } else {
          console.warn('⚠️ Storage upload error:', uploadError.message);
        }
      } catch (uploadErr) {
        console.warn('⚠️ PDF upload to storage failed:', uploadErr);
      }

      const { error: insertError } = await supabase
        .from('certificates')
        .insert({
          certificate_number: certNum,
          verification_token: verificationToken,
          student_id: app.student_id,
          company_id: app.company_id,
          post_id: app.post_id,
          application_id: app.application_id,
          student_name: app.student_name,
          student_email: app.student_email,
          company_name: app.company_name,
          post_title: app.post_title,
          course: app.course,
          hours_rendered: app.hours_rendered,
          required_hours: app.required_hours || 0,
          start_date: app.start_date,
          end_date: app.end_date,
          issued_by: adminId,
          status: 'issued',
          pdf_url: pdfUrl,
        });
      if (insertError) throw insertError;

      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfObjectUrl, '_blank');
      addToast(`Certificate ${certNum} issued for ${app.student_name}`, 'success');

      await logAuditAction({
        action: 'certificate_issued',
        target_type: 'certificate',
        target_id: verificationToken,
        target_name: app.student_name,
        details: { certificate_number: certNum, company: app.company_name, hours: app.hours_rendered }
      });

      loadData();
    } catch (err: any) {
      console.error('❌ Certificate generation error:', err);
      addToast(err?.message || 'Failed to generate certificate', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const downloadCertificate = (app: CompletedApp) => {
    if (app.certificate_pdf_url) {
      window.open(app.certificate_pdf_url, '_blank');
    } else {
      addToast('PDF not available — regenerate the certificate', 'info');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
          <div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded-lg w-48 animate-pulse"></div><div className="h-3 bg-slate-50 rounded-lg w-64 animate-pulse"></div></div>
        </div>
        <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse"></div>))}</div>
      </div>
    );
  }

  if (completedApps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div><h3 className="font-bold text-base text-slate-800">OJT Completion Certificates</h3><p className="text-xs text-slate-500 mt-0.5">Issue verifiable PDF certificates to students who completed their OJT</p></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No completed OJT applications yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Certificates become available once companies mark an application as "Completed" in the applicants page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-blue-50/95 border-blue-200 text-blue-800'}`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-slate-800">OJT Completion Certificates</h3>
            <p className="text-xs text-slate-500 mt-0.5">Issue verifiable PDF certificates with QR codes · {completedApps.length} completed · {groupedByStudent.length} student{groupedByStudent.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={expandAll}
              className="text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
              title="Expand all students"
            >
              <span className="hidden sm:inline">Expand all</span>
              <span className="sm:hidden">▽</span>
            </button>
            <button
              onClick={collapseAll}
              className="text-[10px] sm:text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
              title="Collapse all students"
            >
              <span className="hidden sm:inline">Collapse all</span>
              <span className="sm:hidden">▷</span>
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {groupedByStudent.map(group => {
          const isCollapsed = collapsedStudents.has(group.key);
          return (
          <div key={group.key} className="p-4 sm:p-5">
            <button
              onClick={() => toggleStudent(group.key)}
              className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 w-full text-left hover:bg-slate-50/60 rounded-lg transition-colors -mx-1 px-1"
              aria-expanded={!isCollapsed}
            >
              <svg
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-sm">
                {(group.studentName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-slate-800 truncate">
                  {group.studentName} Certificate
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  {group.certs.length} certificate{group.certs.length !== 1 ? 's' : ''}
                  {group.course ? ` · ${group.course}` : ''}
                  {isCollapsed && <span className="text-slate-400"> · click to expand</span>}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md shrink-0 border border-amber-200">
                🎓 Student
              </div>
            </button>

            {!isCollapsed && (
            <div className="space-y-3 pl-3 sm:pl-5 ml-5 border-l-2 border-amber-100">
              {group.certs.map(app => (
          <div key={app.application_id} className="bg-white rounded-xl border border-slate-100 p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center font-bold text-base text-blue-600 shrink-0">{(app.student_name || '?').charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-800 truncate">{app.student_name}</p>
                  <p className="text-xs text-slate-500 truncate">{app.company_name} · {app.post_title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{app.hours_rendered}h / {app.required_hours || 0}h</span>
                    {app.course && <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>{app.course}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {app.has_certificate ? (
                  <>
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Certificate</p>
                      <p className="text-xs font-bold text-slate-700">{app.certificate_number}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">✓ Issued {app.issued_at ? new Date(app.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                    </div>
                    <button onClick={() => downloadCertificate(app)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download PDF
                    </button>
                  </>
                ) : (
                  <button onClick={() => generateCertificate(app)} disabled={generating === app.application_id} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-300 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-amber-500/20">
                    {generating === app.application_id ? (
                      <><svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating…</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>Issue Certificate</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
              ))}
            </div>
            )}
          </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// ============================================================================
// buildCertificatePDF — standalone function (OUTSIDE the component)
// Generates a beautifully designed certificate PDF with:
// - Warm cream background (clearly visible, not white)
// - Triple border (navy + gold + navy)
// - Gold corner ornaments
// - Faint "OJTly" watermark
// - Gold seal/medallion
// - Pre-fetched QR code (via data URL — no CORS issues)
// - Large readable bottom text
// ============================================================================

function buildCertificatePDF(opts: {
  certificateNumber: string; studentName: string; companyName: string; postTitle: string;
  course: string | null; hoursRendered: number; requiredHours: number;
  startDate: string | null; endDate: string | null; verifyUrl: string;
  qrDataUrl?: string | null;
}): Blob {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297, pageHeight = 210;

  // Color palette — tuple types so spread works with jsPDF
  const NAVY: [number, number, number] = [30, 58, 138];
  const GOLD: [number, number, number] = [184, 134, 11];
  const GOLD_LIGHT: [number, number, number] = [218, 165, 32];
  const SLATE_DARK: [number, number, number] = [15, 23, 42];
  const SLATE_MED: [number, number, number] = [51, 65, 85];
  const SLATE_LIGHT: [number, number, number] = [71, 85, 105];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT_GOLD_TINT: [number, number, number] = [255, 248, 220];
  const CREAM: [number, number, number] = [245, 230, 200];
  const CREAM_DARK: [number, number, number] = [235, 220, 185];
  const WATERMARK: [number, number, number] = [225, 215, 190];

  // 1. CREAM BACKGROUND
  pdf.setFillColor(...CREAM);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setFillColor(...CREAM_DARK);
  pdf.rect(0, 0, pageWidth, 20, 'F');
  pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  // 2. WATERMARK
  pdf.setTextColor(...WATERMARK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(160);
  pdf.text('OJTly', pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(...CREAM_DARK);
  pdf.text('• On-the-Job Training • Excellence • Verification •', pageWidth / 2, pageHeight / 2 - 50, { align: 'center' });

  // 3. TRIPLE BORDER
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(3);
  pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(1.5);
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.5);
  pdf.rect(16, 16, pageWidth - 32, pageHeight - 32);

  // 4. CORNER ORNAMENTS
  const drawCornerOrnament = (x: number, y: number) => {
    pdf.setDrawColor(...GOLD); pdf.setLineWidth(1);
    pdf.circle(x, y, 5, 'S');
    pdf.setLineWidth(0.5);
    pdf.circle(x, y, 3.5, 'S');
    pdf.setFillColor(...GOLD_LIGHT);
    pdf.circle(x, y, 2, 'F');
    pdf.setFillColor(...NAVY);
    pdf.circle(x, y, 0.8, 'F');
  };
  drawCornerOrnament(16, 16);
  drawCornerOrnament(pageWidth - 16, 16);
  drawCornerOrnament(16, pageHeight - 16);
  drawCornerOrnament(pageWidth - 16, pageHeight - 16);

  // 5. LOGO BOX
  const logoW = 50, logoH = 16;
  const logoX = pageWidth / 2 - logoW / 2;
  const logoY = 26;
  pdf.setFillColor(...GOLD);
  pdf.roundedRect(logoX - 1.5, logoY - 1.5, logoW + 3, logoH + 3, 2.5, 2.5, 'F');
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(logoX, logoY, logoW, logoH, 2, 2, 'F');
  pdf.setTextColor(...WHITE);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text('OJTly', pageWidth / 2, logoY + 11, { align: 'center' });

  pdf.setTextColor(...SLATE_MED);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('ON-THE-JOB TRAINING MANAGEMENT PLATFORM', pageWidth / 2, 49, { align: 'center' });

  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.8);
  pdf.line(pageWidth / 2 - 65, 53, pageWidth / 2 + 65, 53);
  pdf.setLineWidth(0.4);
  pdf.line(pageWidth / 2 - 45, 54.5, pageWidth / 2 + 45, 54.5);

  // 6. TITLE
  pdf.setTextColor(...SLATE_DARK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(36);
  pdf.text('Certificate of Completion', pageWidth / 2, 68, { align: 'center' });

  const titleY = 72;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(1);
  pdf.line(pageWidth / 2 - 70, titleY, pageWidth / 2 - 10, titleY);
  pdf.line(pageWidth / 2 + 10, titleY, pageWidth / 2 + 70, titleY);
  pdf.setFillColor(...GOLD);
  pdf.triangle(pageWidth / 2 - 4, titleY, pageWidth / 2 + 4, titleY, pageWidth / 2, titleY - 4, 'F');
  pdf.triangle(pageWidth / 2 - 4, titleY, pageWidth / 2 + 4, titleY, pageWidth / 2, titleY + 4, 'F');

  // 7. "This is to certify that"
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(14);
  pdf.setTextColor(...SLATE_MED);
  pdf.text('This is to certify that', pageWidth / 2, 82, { align: 'center' });

  // 8. STUDENT NAME
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(...NAVY);
  pdf.text(opts.studentName, pageWidth / 2, 94, { align: 'center' });

  const nameWidth = pdf.getTextWidth(opts.studentName);
  const underlineHalf = Math.min(nameWidth / 2 + 10, 90);
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(1);
  pdf.line(pageWidth / 2 - underlineHalf, 97, pageWidth / 2 + underlineHalf, 97);
  pdf.setFillColor(...GOLD);
  pdf.circle(pageWidth / 2 - underlineHalf, 97, 1, 'F');
  pdf.circle(pageWidth / 2 + underlineHalf, 97, 1, 'F');

  // 9. BODY TEXT
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.setTextColor(...SLATE_MED);
  pdf.text('has successfully completed On-the-Job Training at', pageWidth / 2, 106, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...SLATE_DARK);
  pdf.text(opts.companyName, pageWidth / 2, 114, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.setTextColor(...SLATE_MED);
  pdf.text(`in the position of ${opts.postTitle}`, pageWidth / 2, 122, { align: 'center' });

  if (opts.course) {
    pdf.setFontSize(12);
    pdf.setTextColor(...SLATE_LIGHT);
    pdf.text(`Course: ${opts.course}`, pageWidth / 2, 128, { align: 'center' });
  }

  // 10. HOURS BOX
  const hoursBoxY = 136;
  const hoursBoxW = 130, hoursBoxH = 16;
  const hoursBoxX = pageWidth / 2 - hoursBoxW / 2;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.7);
  pdf.setFillColor(...LIGHT_GOLD_TINT);
  pdf.roundedRect(hoursBoxX, hoursBoxY, hoursBoxW, hoursBoxH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...NAVY);
  pdf.text(`Rendering ${opts.hoursRendered} hours of required ${opts.requiredHours} hours`, pageWidth / 2, hoursBoxY + 10.5, { align: 'center' });

  // 11. TRAINING PERIOD
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(...SLATE_LIGHT);
  pdf.text(`Training Period: ${fmtDate(opts.startDate)} — ${fmtDate(opts.endDate)}`, pageWidth / 2, 160, { align: 'center' });

  // 12. GOLD SEAL
  const sealX = pageWidth / 2;
  const sealY = 175;
  const sealR = 11;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(1.5);
  pdf.setFillColor(...LIGHT_GOLD_TINT);
  pdf.circle(sealX, sealY, sealR, 'FD');
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.8);
  pdf.circle(sealX, sealY, sealR - 2, 'S');
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.5);
  pdf.circle(sealX, sealY, sealR - 3, 'S');
  pdf.setTextColor(...NAVY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('OJTly', sealX, sealY - 1, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5);
  pdf.setTextColor(...GOLD);
  pdf.text('VERIFIED', sealX, sealY + 4, { align: 'center' });
  pdf.setTextColor(...GOLD);
  pdf.setFontSize(10);
  pdf.text('★', sealX - sealR - 4, sealY + 1, { align: 'center' });
  pdf.text('★', sealX + sealR + 4, sealY + 1, { align: 'center' });

  // 13. SIGNATURE LINES
  const sigLineY = 175;
  const leftSigX = 55;
  const rightSigX = pageWidth - 55;
  pdf.setDrawColor(...SLATE_DARK); pdf.setLineWidth(0.5);
  pdf.line(leftSigX - 30, sigLineY, leftSigX + 30, sigLineY);
  pdf.line(rightSigX - 30, sigLineY, rightSigX + 30, sigLineY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...SLATE_DARK);
  pdf.text('OJTly Administrator', leftSigX, sigLineY + 6, { align: 'center' });
  pdf.text(opts.companyName, rightSigX, sigLineY + 6, { align: 'center' });
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_LIGHT);
  pdf.text(`Issued on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, leftSigX, sigLineY + 11, { align: 'center' });
  pdf.text('Company Representative', rightSigX, sigLineY + 11, { align: 'center' });

  // 14. BOTTOM BAR — large readable text
  const bottomY = pageHeight - 12;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.7);
  pdf.line(25, bottomY - 8, pageWidth - 25, bottomY - 8);
  pdf.setLineWidth(0.3);
  pdf.line(25, bottomY - 7, pageWidth - 25, bottomY - 7);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...NAVY);
  pdf.text(`Certificate No:`, 25, bottomY - 1);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...SLATE_DARK);
  pdf.text(opts.certificateNumber, 70, bottomY - 1);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...NAVY);
  pdf.text('Scan QR to verify authenticity', pageWidth / 2, bottomY - 1, { align: 'center' });

  // QR CODE — use pre-fetched data URL
  if (opts.qrDataUrl) {
    try {
      pdf.addImage(opts.qrDataUrl, 'PNG', pageWidth - 35, bottomY - 20, 20, 20);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...SLATE_LIGHT);
      pdf.text('Scan', pageWidth - 25, bottomY + 2, { align: 'center' });
    } catch (imgErr) {
      console.warn('⚠️ addImage failed:', imgErr);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...SLATE_LIGHT);
      pdf.text('Scan to verify', pageWidth - 50, bottomY - 1);
    }
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE_LIGHT);
    pdf.text('Scan to verify', pageWidth - 50, bottomY - 1);
  }

  // 15. FOOTER
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(...SLATE_LIGHT);
  pdf.text('This certificate was electronically issued by the OJTly platform. Verify by scanning the QR code.', pageWidth / 2, pageHeight - 4, { align: 'center' });

  return pdf.output('blob');
}
