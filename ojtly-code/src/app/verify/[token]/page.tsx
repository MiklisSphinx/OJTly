'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface CertDetails {
  certificate_number: string;
  student_name: string;
  company_name: string;
  post_title: string;
  course: string | null;
  hours_rendered: number;
  required_hours: number;
  start_date: string | null;
  end_date: string | null;
  issued_at: string;
  status: string;
  valid: boolean;
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No certificate token provided');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const { data, error: rpcError } = await supabase
          .rpc('verify_certificate', { p_token: token });

        if (rpcError) {
          console.error('❌ Verify RPC error:', rpcError);
          throw rpcError;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
          setError('Certificate not found. The token may be invalid or the certificate may have been deleted.');
          setCert(null);
        } else {
          setCert(rows[0] as CertDetails);
          setError(null);
        }
      } catch (err: any) {
        console.error('❌ Verification failed:', err);
        setError(err?.message || 'Failed to verify certificate');
        setCert(null);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Verifying certificate…</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Verification Failed</h1>
          <p className="text-sm text-slate-500 leading-relaxed">{error || 'Certificate not found'}</p>
          <p className="text-xs text-slate-400 mt-4">
            If you scanned a QR code, the certificate may be invalid or revoked.
            Contact the issuing administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  const isValid = cert.valid && cert.status === 'issued';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isValid ? 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30' : 'bg-gradient-to-br from-slate-50 via-white to-red-50/30'}`}>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl w-full">
        <div className={`px-6 sm:px-8 py-6 text-center ${isValid ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
            {isValid ? (
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
            ) : (
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{isValid ? 'Certificate Verified' : 'Certificate Revoked'}</h1>
          <p className="text-sm text-white/80 mt-1">{isValid ? 'This is a genuine OJTly completion certificate.' : 'This certificate is no longer valid.'}</p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Certificate Number</span>
            <span className="font-mono text-sm font-bold text-slate-800">{cert.certificate_number}</span>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">This certifies that</p>
            <p className="text-xl font-bold text-slate-800">{cert.student_name}</p>
            {cert.course && <p className="text-sm text-slate-500 mt-0.5">{cert.course}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Completed Training At</p>
              <p className="font-bold text-slate-800">{cert.company_name}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Position</p>
              <p className="font-bold text-slate-800">{cert.post_title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">Hours Rendered</p>
              <p className="text-2xl font-bold text-blue-700">{cert.hours_rendered}<span className="text-sm font-normal text-blue-400 ml-1">hours</span></p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">Required Hours</p>
              <p className="text-2xl font-bold text-indigo-700">{cert.required_hours}<span className="text-sm font-normal text-indigo-400 ml-1">hours</span></p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Training Period</p>
            <p className="font-semibold text-slate-700 text-sm">{fmtDate(cert.start_date)} <span className="text-slate-400 mx-1">—</span> {fmtDate(cert.end_date)}</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Issued On</p>
              <p className="text-sm font-semibold text-slate-700">{fmtDate(cert.issued_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">O</div>
              <div>
                <p className="text-sm font-bold text-slate-800">OJTly Platform</p>
                <p className="text-[10px] text-slate-400">Official Certificate</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center pt-2 leading-relaxed">
            This certificate was electronically issued by the OJTly On-the-Job Training Management Platform.
            Verification is powered by Supabase RLS and a SECURITY DEFINER function.
          </p>
        </div>
      </div>
    </div>
  );
}