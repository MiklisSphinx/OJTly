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
      // Double-check: no duplicate cert
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id, certificate_number, pdf_url, issued_at')
        .eq('student_id', props.studentId)
        .eq('post_id', props.postId)
        .maybeSingle();

      if (existingCert) {
        setCertificate(existingCert);
        if (existingCert.pdf_url) window.open(existingCert.pdf_url, '_blank');
        alert(`Certificate ${existingCert.certificate_number} already exists. Opening the existing one.`);
        return;
      }

      // 1) Certificate number
      const { data: certNum, error: numError } = await supabase.rpc('next_certificate_number');
      if (numError || !certNum) throw numError || new Error('No cert number');

      // 2) Verification token + URL
      const verificationToken = crypto.randomUUID();
      const verifyUrl = `${window.location.origin}/verify/${verificationToken}`;

      // 3) ✅ PRE-FETCH QR as data URL (fixes QR not scanning)
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
      } catch (qrErr) {
        console.warn('⚠️ QR fetch failed:', qrErr);
      }

      // 4) Get hours — fallback to ALL verified hours if archived = 0
      let hoursRendered: number = 0;
      try {
        const { data: rpcHours } = await supabase
          .rpc('get_archived_hours_for_app', { p_application_id: props.applicationId });
        hoursRendered = Number(rpcHours) || 0;
      } catch (e) {
        console.warn('⚠️ archived hours RPC failed:', e);
      }

      // Fallback: if archived hours = 0, count ALL verified hours for this student
      if (hoursRendered === 0) {
        try {
          const { data: allLogs } = await supabase
            .from('attendance_logs')
            .select('hours_rendered')
            .eq('student_id', props.studentId)
            .eq('verification_status', 'verified');
          hoursRendered = (allLogs || []).reduce((s: number, r: any) => s + (Number(r.hours_rendered) || 0), 0);
        } catch (e) {
          console.warn('⚠️ fallback hours fetch failed:', e);
        }
      }

      // 5) Build PDF with NEW DESIGN
      const pdfBlob = buildCertificatePDF({
        certificateNumber: certNum,
        studentName: props.studentName,
        companyName: props.companyName,
        postTitle: props.postTitle,
        course: props.courseId,
        hoursRendered,
        requiredHours: props.requiredHours,
        startDate: null,
        endDate: new Date().toISOString().slice(0, 10),
        verifyUrl,
        qrDataUrl,
      });

      // 6) Upload to storage
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

      // 7) Insert certificate row
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

      // 8) ✅ ONLY 1 notification to student
      await supabase.from('notifications').insert({
        user_id: props.studentId,
        title: 'Certificate Ready ',
        message: `Your certificate from ${props.companyName} is ready. Certificate No: ${certNum}`,
        type: 'certificate',
        is_read: false,
        link_url: '/student_profile',
        created_at: new Date().toISOString(),
        deleted_at: null,
      });

      // 9) Open PDF + refresh
      window.open(URL.createObjectURL(pdfBlob), '_blank');
      setCertificate({ certificate_number: certNum, pdf_url: pdfUrl, issued_at: new Date().toISOString() });
      alert(`Certificate ${certNum} issued!`);
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

// ============================================================================
// buildCertificatePDF — NEW DESIGN with cream bg, gold borders, seal, QR
// ============================================================================

function buildCertificatePDF(opts: {
  certificateNumber: string; studentName: string; companyName: string; postTitle: string;
  course: string | null; hoursRendered: number; requiredHours: number;
  startDate: string | null; endDate: string | null; verifyUrl: string;
  qrDataUrl?: string | null;
}): Blob {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297, pageHeight = 210;

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
  pdf.text(`Training Period: ${fmtDate(opts.startDate)} — ${fmtDate(opts.endDate)}`, pageWidth / 2, 156, { align: 'center' });

  // 12. SIGNATURE LINES — at y=172, NO seal in the middle
  const sigLineY = 172;
  const leftSigX = 85;
  const rightSigX = pageWidth - 85;
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
  pdf.text(`Issued ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, leftSigX, sigLineY + 11, { align: 'center' });
  pdf.text('Company Representative', rightSigX, sigLineY + 11, { align: 'center' });

  // 13. SMALL GOLD SEAL — centered below signatures, smaller (radius 7)
  const sealX = pageWidth / 2;
  const sealY = 178;
  const sealR = 7;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(1);
  pdf.setFillColor(...LIGHT_GOLD_TINT);
  pdf.circle(sealX, sealY, sealR, 'FD');
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.5);
  pdf.circle(sealX, sealY, sealR - 1.5, 'S');
  pdf.setTextColor(...NAVY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.text('OJTly', sealX, sealY - 0.5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(3.5);
  pdf.setTextColor(...GOLD);
  pdf.text('VERIFIED', sealX, sealY + 2.5, { align: 'center' });

  // 14. BOTTOM BAR — certificate number only, NO QR
  const bottomY = 188;
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.7);
  pdf.line(25, bottomY - 4, pageWidth - 25, bottomY - 4);
  pdf.setLineWidth(0.3);
  pdf.line(25, bottomY - 3, pageWidth - 25, bottomY - 3);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text(`Certificate No: ${opts.certificateNumber}`, pageWidth / 2, bottomY, { align: 'center' });

  // 15. FOOTER
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE_LIGHT);
  pdf.text('Electronically issued by OJTly platform — verify at ojtly.vercel.app', pageWidth / 2, 192, { align: 'center' });

  return pdf.output('blob');
}
