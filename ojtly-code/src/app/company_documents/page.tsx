'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // ✅ CHANGED: Using @supabase/ssr

// ============================================
// 📋 TYPE DEFINITIONS
// ============================================

interface CompanyData {
  id: string;
  user_id: string;
  company_name: string;
  permit_url: string | null;
  sec_dti_url: string | null;
  bir_2303_url: string | null;
  status: string;
}

// For preview modal
interface PreviewDoc {
  url: string;
  name: string;
  type: string; // 'business_permit' | 'sec_dti' | 'bir_2303'
}

// ============================================
// 🎨 MAIN COMPONENT
// ============================================

export default function CompanyDocuments() {
  const router = useRouter();
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  
  // ✨ NEW: Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  
  // Data State
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false); // ✅ NEW: Track if we've checked session

  // ✅ FIXED: Use createBrowserClient from @supabase/ssr
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ============================================
  // 🔄 FETCH FROM COMPANIES TABLE
  // ============================================

  useEffect(() => {
    const fetchCompanyData = async () => {
      console.log('🔍 [FETCH] Starting...');
      
      // Step 1: Check session FIRST
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      setSessionChecked(true); // ✅ Mark that we've checked the session

      // ✅ FIXED: Redirect to login if no session!
      if (sessionError || !session) {
        console.error('❌ No session found - redirecting to login');
        console.error('Session error:', sessionError?.message);
        router.push('/login'); // ✅ REDIRECT INSTEAD OF JUST LOGGING
        setLoading(false);
        return;
      }

      console.log('✅ Session OK:', session.user.id);

     const { data, error } = await supabase
  .from('companies')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

// Handle "no rows" error specifically
if (error) {
  if (error.code === 'PGRST116') {
    // PGRST116 = "The result contains 0 rows"
    console.log('ℹ️ No company record yet');
    setCompanyData(null); // This is fine!
  } else {
    console.error('❌ Real DB Error:', error.message);
  }
  setLoading(false);
  return;
}

      if (data) {
        console.log('✅ Data received!');
        setCompanyData(data);
      } else {
        console.log('⚠️ No company record');
        setCompanyData(null);
      }

      setLoading(false);
    };

    fetchCompanyData();
  }, [router]); // ✅ Added router to dependencies

  // ============================================
  // 🔧 HELPERS: Check if documents exist
  // ============================================

  const hasBizPermit = companyData?.permit_url && companyData.permit_url.length > 0;
  const hasSecDti = companyData?.sec_dti_url && companyData.sec_dti_url.length > 0;
  const hasBir2303 = companyData?.bir_2303_url && companyData.bir_2303_url.length > 0;
  const totalDocsUploaded = [hasBizPermit, hasSecDti, hasBir2303].filter(Boolean).length;

  // ============================================
  // 👁️ OPEN PREVIEW MODAL (Instead of new tab!)
  // ============================================

  const openPreview = (url: string, name: string, type: string) => {
    console.log(`👁️ [PREVIEW] Opening preview for ${name}`);
    setPreviewDoc({ url, name, type });
  };

  const closePreview = () => {
    console.log('❌ [PREVIEW] Closing modal');
    setPreviewDoc(null);
  };

  // ============================================
  // 📤 UPLOAD HANDLER
  // ============================================

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(docType);

    try {
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(ext)) throw new Error('Invalid file type');
      if (file.size > 10 * 1024 * 1024) throw new Error('Max 10MB');

      // ✅ FIXED: Get fresh session for upload
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        throw new Error('Session expired. Please log in again.');
      }

      const filePath = `${session.user.id}/${docType}_${Date.now()}${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from('company-docs').upload(filePath, file);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from('company-docs').getPublicUrl(filePath);

      // Update correct column in companies table
      const updateData: Record<string, string> = {};
      switch (docType) {
        case 'business_permit':
          updateData.permit_url = publicUrl;
          break;
        case 'sec_dti':
          updateData.sec_dti_url = publicUrl;
          break;
        case 'bir_2303':
          updateData.bir_2303_url = publicUrl;
          break;
      }

      const { error: updateErr } = await supabase
        .from('companies')
        .update(updateData)
        .eq('user_id', session.user.id);

      if (updateErr) throw new Error(updateErr.message);

      alert(`✅ ${docType.replace(/_/g, ' ').toUpperCase()} uploaded!`);

      // Refresh data
      const { data: refreshedData } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (refreshedData) setCompanyData(refreshedData);

    } catch (err: any) {
      alert(`❌ ${err.message}`);
      
      // If session error during upload, redirect to login
      if (err.message.includes('Session')) {
        router.push('/login');
      }
    } finally {
      setIsUploading(null);
      e.target.value = '';
    }
  };

  // ============================================
  // ⏳ LOADING STATE (with session check)
  // ============================================

  // ✅ FIXED: Show loading while checking session OR fetching data
  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} router={router} />
        <main className="lg:ml-64 min-h-screen">
          <Header title="Company Documents" onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-semibold">
                {!sessionChecked ? 'Checking authentication...' : 'Loading documents...'}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // 🎨 RENDER UI (same as your original)
  // ============================================

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} router={router} />
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <Header title="Company Documents" onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          
          {/* Container */}
          <div className="bg-white/60 border-2 border-dashed border-blue-200 rounded-3xl p-8 shadow-sm">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V17a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-700 tracking-wide uppercase">Verification Documents</h2>
            </div>

            {/* Document Rows */}
            <div className="space-y-5">

              {/* ========================================== */}
              {/* 📄 ROW 1: BUSINESS PERMIT */}
              {/* ========================================== */}
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">📄</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Business Permit</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Local government operation permit</p>
                    
                    {companyData?.status && hasBizPermit && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                        companyData.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        companyData.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        ✓ {companyData.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 🔘 BUTTON: VIEW (Opens Modal) or UPLOAD */}
                {hasBizPermit ? (
                  /* ✅ VIEW BUTTON - Opens Modal, NOT new tab! */
                  <button 
                    onClick={() => openPreview(
                      companyData!.permit_url!, 
                      'Business Permit', 
                      'business_permit'
                    )}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-200 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                ) : (
                  /* ❌ UPLOAD BUTTON */
                  <>
                    {isUploading === 'business_permit' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-teal-100 text-teal-700 rounded-xl font-semibold flex-shrink-0">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => document.getElementById('upload-biz-permit')?.click()}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#57b2a4] hover:bg-[#489a8d] text-white rounded-xl font-bold transition-colors shadow-md flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                        </button>
                        
                        <input
                          id="upload-biz-permit"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUpload(e, 'business_permit')}
                          className="hidden"
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* ========================================== */}
              {/* 📄 ROW 2: SEC / DTI REGISTRATION */}
              {/* ========================================== */}
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">🛡️</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">SEC / DTI Registration</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Corporate or business registration</p>
                    
                    {companyData?.status && hasSecDti && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                        companyData.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        companyData.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        ✓ {companyData.status}
                      </span>
                    )}
                  </div>
                </div>

                {hasSecDti ? (
                  /* ✅ VIEW BUTTON - Opens Modal! */
                  <button 
                    onClick={() => openPreview(
                      companyData!.sec_dti_url!, 
                      'SEC / DTI Registration', 
                      'sec_dti'
                    )}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-200 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                ) : (
                  /* ❌ UPLOAD */
                  <>
                    {isUploading === 'sec_dti' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-teal-100 text-teal-700 rounded-xl font-semibold flex-shrink-0">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => document.getElementById('upload-sec-dti')?.click()}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#57b2a4] hover:bg-[#489a8d] text-white rounded-xl font-bold transition-colors shadow-md flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                        </button>
                        
                        <input
                          id="upload-sec-dti"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUpload(e, 'sec_dti')}
                          className="hidden"
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* ========================================== */}
              {/* 📄 ROW 3: BIR FORM 2303 */}
              {/* ========================================== */}
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-pink-100 shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">🏛️</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">BIR Form 2303 (COR)</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Tax registration certificate</p>
                    
                    {companyData?.status && hasBir2303 && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                        companyData.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        companyData.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        ✓ {companyData.status}
                      </span>
                    )}
                  </div>
                </div>

                {hasBir2303 ? (
                  /* ✅ VIEW BUTTON - Opens Modal! */
                  <button 
                    onClick={() => openPreview(
                      companyData!.bir_2303_url!, 
                      'BIR Form 2303 (COR)', 
                      'bir_2303'
                    )}
                    className="flex items-center gap-2 px-6 py-2.5 bg-pink-100 text-pink-600 rounded-xl font-bold hover:bg-pink-200 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                ) : (
                  /* ❌ UPLOAD */
                  <>
                    {isUploading === 'bir_2303' ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-teal-100 text-teal-700 rounded-xl font-semibold flex-shrink-0">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => document.getElementById('upload-bir-2303')?.click()}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#57b2a4] hover:bg-[#489a8d] text-white rounded-xl font-bold transition-colors shadow-md flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                        </button>
                        
                        <input
                          id="upload-bir-2303"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUpload(e, 'bir_2303')}
                          className="hidden"
                        />
                      </>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* Progress Footer */}
            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Documents uploaded:</span>
              
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${
                totalDocsUploaded === 3 ? 'bg-green-100 text-green-700 border border-green-200' :
                totalDocsUploaded > 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {totalDocsUploaded}/3
              </span>
            </div>

            {totalDocsUploaded === 3 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-green-700 font-semibold">✅ All Required Documents Uploaded!</p>
                <p className="text-sm text-green-600 mt-1">Your account verification is under review.</p>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ========================================== */}
      {/* ✨ DOCUMENT PREVIEW MODAL (NEW!) */}
      {/* Shows document WITHOUT leaving the page! */}
      {/* ========================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop (dark overlay) */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closePreview}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {/* Document Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  previewDoc.type === 'business_permit' ? 'bg-orange-100' :
                  previewDoc.type === 'sec_dti' ? 'bg-indigo-100' :
                  'bg-pink-100'
                }`}>
                  {previewDoc.type === 'business_permit' ? '📄' :
                   previewDoc.type === 'sec_dti' ? '🛡️' : '🏛️'}
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-800">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500">Document Preview</p>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={closePreview}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Document Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {/* Check if URL ends with .pdf */}
              {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                /* PDF Viewer (iframe) */
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[70vh] rounded-lg border-0 shadow-inner bg-white"
                  title={previewDoc.name}
                ></iframe>
              ) : (
                /* Image Viewer (img tag) */
                <div className="flex items-center justify-center h-[70vh] bg-white rounded-lg shadow-inner p-4">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Click outside or press ESC to close
              </p>
              
              <div className="flex items-center gap-3">
                {/* Download Button (opens in new tab - optional) */}
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Open in New Tab
                </a>
                
                {/* Close Button */}
                <button
                  onClick={closePreview}
                  className="px-6 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// 🧩 SIDEBAR COMPONENT (unchanged)
// ============================================

function Sidebar({ isOpen, onClose, router }: { 
  isOpen: boolean; 
  onClose: () => void; 
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <NavLink href="/company_main" icon="grid" label="Dashboard" />
          <NavLink href="/company_ojtpost" icon="file" label="My OJT Posts" />
          <NavLink href="/company_createpost" icon="plus" label="Create Post" />
          <NavLink href="/company_applicants" icon="users" label="Applicants" />
          <NavLink href="/company_documents" icon="document" label="Documents" isActive />
          <NavLink href="/company_settings" icon="settings" label="Settings" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg font-medium w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

// ============================================
// 🧩 HEADER COMPONENT (unchanged)
// ============================================

function Header({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
      <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">John Doe</p>
            <p className="text-xs text-slate-400">Acme Corp</p>
          </div>
          <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm border-2 border-white shadow-sm">JD</div>
        </div>
      </div>
    </header>
  );
}

// ============================================
// 🧩 NAV LINK COMPONENT (unchanged)
// ============================================

function NavLink({ 
  href, 
  icon, 
  label, 
  isActive = false 
}: { 
  href: string; 
  icon: string; 
  label: string; 
  isActive?: boolean;
}) {
  const icons: Record<string, React.ReactElement> = {
    grid: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2-2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    file: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V17a2 2 0 01-2 2z" />
      </svg>
    ),
    plus: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  };

  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
        isActive ? 'text-white bg-teal-600' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icons[icon]}
      {label}
    </Link>
  );
}