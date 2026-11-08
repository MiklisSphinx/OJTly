'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { jsPDF } from 'jspdf';

const supabase = createClient();

interface Props {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string | null;
  companyId: string;
  companyName: string;
  postId: string;
  postTitle: string;
  requiredHours: number;
  userId: string;
}

export default function CompanyCertificateButton(props: Props) {
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    try {
      // ✅ Check by student_id + post_id (NOT application_id).
      // This is more robust because application_id can change if the
      // application row is deleted + recreated. student_id + post_id
      // uniquely identifies one OJT cycle.
      const { data } = await supabase
        .from('certificates')
        .select('id, certificate_number, pdf_url, issued_at')
        .eq('student_id', props.studentId)
        .eq('post_id', props.postId)
        .maybeSingle();
      setCertificate(data);
    } catch (err) {
      console.warn('⚠️ Cert check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // ✅ DOUBLE-CHECK: before generating, verify no cert already exists
      // for this student + post. This prevents duplicate certs if the user
      // clicks "Issue Certificate" multiple times quickly, or if the initial
      // checkExisting() missed an existing cert (e.g. application_id mismatch).
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id, certificate_number, pdf_url, issued_at')
        .eq('student_id', props.studentId)
        .eq('post_id', props.postId)
        .maybeSingle();

      if (existingCert) {
        // A cert already exists — don't create a duplicate. Just download it.
        setCertificate(existingCert);
        if (existingCert.pdf_url) {
          window.open(existingCert.pdf_url, '_blank');
        }
        alert(`Certificate ${existingCert.certificate_number} already exists for this student. Opening the existing one instead of creating a duplicate.`);
        return;
      }

      // 1) Get certificate number
      const { data: certNum, error: numError } = await supabase.rpc('next_certificate_number');
      if (numError || !certNum) throw numError || new Error('No cert number');

      // 2) Generate verification token + URL
      const verificationToken = crypto.randomUUID();
      const verifyUrl = `${window.location.origin}/verify/${verificationToken}`;

      // 3) Fetch student's verified attendance hours for THIS OJT cycle only.
      //    ✅ Uses get_archived_hours_for_app (NOT get_archived_hours) which
      //    filters by the application's created_at boundary. This prevents
      //    the "cheat" bug where a student who did 2 OJTs (8h each) would
      //    get a cert showing 16h (sum of BOTH OJTs). Now it only counts
      //    logs from the CURRENT application's OJT cycle.
      const { data: rpcHours, error: rpcError } = await supabase
        .rpc('get_archived_hours_for_app', { p_application_id: props.applicationId });

      let hoursRendered: number;
      if (rpcError) {
        console.warn('⚠️ get_archived_hours_for_app RPC failed, using requiredHours as fallback:', rpcError.message);
        hoursRendered = props.requiredHours;
      } else {
        hoursRendered = Number(rpcHours) || 0;
      }

      // 4) Build PDF
      const pdfBlob = buildPDF({
        certNum,
        studentName: props.studentName,
        companyName: props.companyName,
        postTitle: props.postTitle,
        course: props.courseId,
        hoursRendered,
        requiredHours: props.requiredHours,
        startDate: null,
        endDate: new Date().toISOString().slice(0, 10),
        verifyUrl,
      });

      // 5) Upload to storage
      let pdfUrl: string | null = null;
      try {
        const filePath = `certificates/certificate-${certNum}.pdf`;
        const { error: upErr } = await supabase
          .storage
          .from('certificates')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (!upErr) {
          pdfUrl = supabase.storage.from('certificates').getPublicUrl(filePath).data.publicUrl;
        }
      } catch (e) {
        console.warn('⚠️ Upload failed:', e);
      }

      // 6) Insert certificate row
      const { error: insErr } = await supabase.from('certificates').insert({
        certificate_number: certNum,
        verification_token: verificationToken,
        student_id: props.studentId,
        company_id: props.companyId,
        post_id: props.postId,
        application_id: props.applicationId,
        student_name: props.studentName,
        student_email: props.studentEmail,
        company_name: props.companyName,
        post_title: props.postTitle,
        course: props.courseId,
        hours_rendered: hoursRendered,
        required_hours: props.requiredHours,
        start_date: null,
        end_date: new Date().toISOString().slice(0, 10),
        issued_by: props.userId,
        status: 'issued',
        pdf_url: pdfUrl,
      });
      if (insErr) throw insErr;

      // 7) Notify the student
      await supabase.from('notifications').insert({
        user_id: props.studentId,
        title: 'Certificate Ready! 🎓',
        message: `Your OJT completion certificate from ${props.companyName} is ready. Certificate No: ${certNum}. You can download it from your applications page.`,
        type: 'certificate',
        is_read: false,
      });

      // 8) Open PDF + refresh
      window.open(URL.createObjectURL(pdfBlob), '_blank');
      setCertificate({ certificate_number: certNum, pdf_url: pdfUrl, issued_at: new Date().toISOString() });
      alert(`Certificate ${certNum} issued! The student has been notified.`);
    } catch (err: any) {
      const desc = [err?.message, err?.code && `code=${err.code}`].filter(Boolean).join(' | ');
      console.error('❌ Certificate error:', desc, err);
      alert('Failed: ' + desc);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (certificate?.pdf_url) window.open(certificate.pdf_url, '_blank');
  };

  if (loading) {
    return (
      <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg">
        Loading…
      </button>
    );
  }

  if (certificate) {
    return (
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Certificate
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-300 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-amber-500/20"
    >
      {generating ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating…
        </>
      ) : (
        <>
          <span>🎓</span>
          Issue Certificate
        </>
      )}
    </button>
  );
}

function buildPDF(opts: any): Blob {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  pdf.setDrawColor(30, 58, 138); pdf.setLineWidth(1.5);
  pdf.rect(10, 10, W - 20, H - 20);
  pdf.setLineWidth(0.5); pdf.setDrawColor(99, 102, 241);
  pdf.rect(14, 14, W - 28, H - 28);
  pdf.setFillColor(255, 215, 0);
  pdf.circle(14, 14, 2.5, 'F'); pdf.circle(W - 14, 14, 2.5, 'F');
  pdf.circle(14, H - 14, 2.5, 'F'); pdf.circle(W - 14, H - 14, 2.5, 'F');

  pdf.setFillColor(30, 58, 138);
  pdf.roundedRect(W / 2 - 18, 24, 36, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
  pdf.text('OJTly', W / 2, 32.5, { align: 'center' });
  pdf.setTextColor(100, 116, 139); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
  pdf.text('ON-THE-JOB TRAINING MANAGEMENT PLATFORM', W / 2, 42, { align: 'center' });

  pdf.setTextColor(15, 23, 42); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(28);
  pdf.text('Certificate of Completion', W / 2, 60, { align: 'center' });
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(11); pdf.setTextColor(100, 116, 139);
  pdf.text('This is to certify that', W / 2, 70, { align: 'center' });

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(24); pdf.setTextColor(30, 58, 138);
  pdf.text(opts.studentName, W / 2, 82, { align: 'center' });
  const nw = pdf.getTextWidth(opts.studentName);
  pdf.setDrawColor(30, 58, 138); pdf.setLineWidth(0.5);
  pdf.line(W / 2 - nw / 2 - 5, 84, W / 2 + nw / 2 + 5, 84);

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(51, 65, 85);
  pdf.text('has successfully completed On-the-Job Training at', W / 2, 94, { align: 'center' });
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(15, 23, 42);
  pdf.text(opts.companyName, W / 2, 102, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(51, 65, 85);
  pdf.text(`in the position of ${opts.postTitle}`, W / 2, 110, { align: 'center' });
  if (opts.course) pdf.text(`Course: ${opts.course}`, W / 2, 117, { align: 'center' });

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(30, 58, 138);
  pdf.text(`Rendering ${opts.hoursRendered} hours of required ${opts.requiredHours} hours`, W / 2, 126, { align: 'center' });

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(100, 116, 139);
  pdf.text(`Training Period: ${fmt(opts.startDate)} — ${fmt(opts.endDate)}`, W / 2, 133, { align: 'center' });

  pdf.setDrawColor(15, 23, 42); pdf.setLineWidth(0.3);
  pdf.line(50, 165, 110, 165); pdf.line(W - 110, 165, W - 50, 165);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(15, 23, 42);
  pdf.text('OJTly Platform', 80, 170, { align: 'center' });
  pdf.text(opts.companyName, W - 80, 170, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
  pdf.text(`Issued on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 80, 175, { align: 'center' });
  pdf.text('Company Representative', W - 80, 175, { align: 'center' });

  pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
  pdf.text(`Certificate No: ${opts.certNum}`, 20, H - 18);
  pdf.text(`Verify at: ${opts.verifyUrl}`, 20, H - 13);

  try {
    pdf.addImage(`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(opts.verifyUrl)}`, 'PNG', W - 35, H - 35, 18, 18);
    pdf.setFontSize(7); pdf.text('Scan to verify', W - 26, H - 14, { align: 'center' });
  } catch {}

  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(148, 163, 184);
  pdf.text('This certificate was electronically issued by the OJTly platform.', W / 2, H - 8, { align: 'center' });

  return pdf.output('blob');
}
