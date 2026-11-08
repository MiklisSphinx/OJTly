'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Cert {
  id: string;
  certificate_number: string;
  pdf_url: string | null;
  issued_at: string;
  company_name: string;
  post_title: string;
  verification_token: string;
}

export default function StudentCertificate({ studentId }: { studentId: string }) {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select('id, certificate_number, pdf_url, issued_at, company_name, post_title, verification_token')
          .eq('student_id', studentId)
          .eq('status', 'issued')
          .order('issued_at', { ascending: false });
        if (error) throw error;
        setCerts(data || []);
      } catch (err) {
        console.warn('⚠️ Cert fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchCerts();
  }, [studentId]);

  if (loading) return null;

  if (certs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-800">My Certificates</h3>
            <p className="text-xs text-slate-500 mt-0.5">{certs.length} certificate{certs.length > 1 ? 's' : ''} issued</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {certs.map(cert => (
          <div key={cert.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-slate-800 truncate">{cert.post_title}</p>
              <p className="text-xs text-slate-500 truncate">{cert.company_name}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                <span className="font-mono font-bold text-slate-600">{cert.certificate_number}</span>
                <span>·</span>
                <span>Issued {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-emerald-600 font-bold">✓ Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/verify/${cert.verification_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Verify
              </a>
              {cert.pdf_url && (
                <button
                                 onClick={() => cert.pdf_url && window.open(cert.pdf_url, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}