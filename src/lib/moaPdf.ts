// lib/moaPdf.ts
// Shared MOA PDF builder used by BOTH the admin generator (MoaGenerator)
// and the company card (CompanyMoaCard). The PDF is rebuilt on demand from
// moa_documents data, embedding any saved e-signatures (base64 PNG data URLs)
// above the signature lines. Because it is rebuilt live, a re-signed MOA
// instantly produces an updated PDF.

import { jsPDF } from 'jspdf';

export type MoaPdfData = {
  companyName: string;
  companyRep: string;
  schoolRep: string;
  moaNumber: string;
  dateStarted: string;
  dateExpired: string;
  schoolSignature?: string | null; // base64 PNG data URL
  companySignature?: string | null; // base64 PNG data URL
  schoolSignedAt?: string | null;
  companySignedAt?: string | null;
};

const SCHOOL_NAME = 'Silay Institute';

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export function buildMoaPdf(data: MoaPdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 18; // page margin
  let y = 0;

  const ink: [number, number, number] = [30, 41, 59]; // slate-800
  const navy: [number, number, number] = [30, 58, 138]; // blue-900
  const gray: [number, number, number] = [100, 116, 139]; // slate-500

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 24) {
      doc.addPage();
      y = 22;
    }
  };

  // ---------- header band ----------
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(SCHOOL_NAME.toUpperCase(), pageW / 2, 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('OFFICE OF THE OJT COORDINATOR', pageW / 2, 18.5, { align: 'center' });

  // ---------- title ----------
  y = 36;
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MEMORANDUM OF AGREEMENT', pageW / 2, y, { align: 'center' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...gray);
  doc.text(
    `MOA NO. ${data.moaNumber || '-'}   |   EFFECTIVE: ${fmtDate(data.dateStarted) || '-'}`,
    pageW / 2,
    y,
    { align: 'center' }
  );
  doc.setTextColor(...ink);

  // ---------- parties ----------
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('PARTY 1 - THE COMPANY', M, y);
  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const p1 = doc.splitTextToSize(
    `This Memorandum of Agreement ("AGREEMENT") is entered into by and between ${
      data.companyName || 'the Company'
    }${data.companyRep ? `, represented herein by ${data.companyRep}` : ''}, hereinafter referred to as the "COMPANY";`,
    pageW - M * 2
  );
  doc.text(p1, M, y);
  y += p1.length * 4.8 + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  ensureSpace(30);
  doc.text('PARTY 2 - THE SCHOOL', M, y);
  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const p2 = doc.splitTextToSize(
    `and ${SCHOOL_NAME}${data.schoolRep ? `, represented herein by ${data.schoolRep}` : ''}, hereinafter referred to as the "SCHOOL".`,
    pageW - M * 2
  );
  doc.text(p2, M, y);
  y += p2.length * 4.8 + 3;

  // ---------- terms ----------
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TERMS OF AGREEMENT', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const terms: string[] = [
    'The SCHOOL shall endorse bona fide students for On-the-Job Training placement with the COMPANY, subject to the COMPANY\'s screening and acceptance process.',
    'The COMPANY shall provide supervised, relevant training assignments and shall assign an officer or staff member to oversee the trainees during the training period.',
    'The training engagement of individual students shall be covered by separate endorsement letters or hiring forms processed through the OJTly platform.',
    'Both parties shall comply with applicable labor laws, school policies, and confidentiality and data privacy requirements.',
    'This Agreement shall be valid for the period stated below and may be renewed by generating a new MOA in the OJTly platform upon mutual consent of both parties.',
    'Either party may terminate this Agreement by giving thirty (30) days written notice to the other party.',
  ];
  terms.forEach((t, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageW - M * 2);
    ensureSpace(lines.length * 4.8 + 4);
    doc.text(lines, M, y);
    y += lines.length * 4.8 + 2.5;
  });

  // ---------- validity line ----------
  ensureSpace(16);
  y += 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const vLine = doc.splitTextToSize(
    `This Agreement shall be valid from ${fmtDate(data.dateStarted) || '-'} until ${fmtDate(data.dateExpired) || '-'}.`,
    pageW - M * 2
  );
  doc.text(vLine, M, y);
  y += vLine.length * 4.8 + 4;

  // ---------- signatures ----------
  ensureSpace(50);
  y += 6;
  const colL = 55;
  const colR = pageW - 55;
  const lineY = y + 16;

  const drawSign = (
    cx: number,
    sig: string | null | undefined,
    name: string,
    role: string,
    org: string,
    signedAt: string | null | undefined
  ) => {
    // e-signature image sits just above the line
    if (sig) {
      try {
        doc.addImage(sig, 'PNG', cx - 22.5, y - 3, 45, 16.2);
      } catch {
        // ignore malformed image data and keep the plain line
      }
    }
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.3);
    doc.line(cx - 25, lineY, cx + 25, lineY);

    let ny = lineY + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...ink);
    const nameLines: string[] = doc.splitTextToSize(name || '________________________', 62);
    nameLines.forEach((ln) => {
      doc.text(ln, cx, ny, { align: 'center' });
      ny += 4.6;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(role, cx, ny + 0.5, { align: 'center' });
    doc.setFontSize(8);
    doc.text(org, cx, ny + 4, { align: 'center' });
    if (signedAt) {
      doc.setFontSize(7.5);
      doc.text(`E-signed ${fmtDate(signedAt)} via OJTly`, cx, ny + 7.5, { align: 'center' });
    }
  };

  drawSign(colL, data.schoolSignature, data.schoolRep, 'School Representative', SCHOOL_NAME, data.schoolSignedAt);
  drawSign(colR, data.companySignature, data.companyRep, 'Company Representative', data.companyName, data.companySignedAt);

  // ---------- footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(`Recorded in OJTly - MOA No. ${data.moaNumber || '-'}`, pageW / 2, pageH - 8, {
      align: 'center',
    });
  }

  return doc;
}
