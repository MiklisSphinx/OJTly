'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // ✅ ADDED: Import from @supabase/ssr

// ============================================
// TYPES
// ============================================
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type FilterTab = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Archived';

interface Company {
  id: string;
  name?: string;           
  company_name?: string;   
  industry?: string;
  email: string;
  phone?: string;
  address?: string;
  office_address?: string;
  permit_url?: string;
  sec_dti_url?: string;
  bir_2303_url?: string;
  contact_person?: string;
  status: string;          
  created_at?: string;
}

interface PreviewDoc {
  url: string;
  name: string;
}

export default function AdminApprovalPage() {
  const router = useRouter();
  
  // ✅ FIXED: Create browser client from @supabase/ssr
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // STATE MANAGEMENT
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  // Responsive Sidebar
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toast System
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchCompanies = async () => {
    setLoading(true);
    
    try {
      console.log('🔍 [FETCH] Starting...');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const normalized: Company[] = data.map((c: any) => ({
          ...c,
          name: c.name || c.company_name || 'Unknown Company',
          // Normalize status: capitalize first letter, rest lowercase
          status: c.status?.charAt(0).toUpperCase() + c.status?.slice(1)?.toLowerCase() || 'Pending'
        }));
        
        setCompanies(normalized);
        
        const archivedCount = normalized.filter(c => c.status.toLowerCase() === 'archived').length;
        const activeCount = normalized.filter(c => c.status.toLowerCase() !== 'archived').length;
        console.log(`📊 Total: ${normalized.length} | Active: ${activeCount} | Archived: ${archivedCount}`);
      } else {
        setCompanies([]);
      }
      
    } catch (error: any) {
      console.error('❌ Supabase Error:', error.message);
      addToast('Database connection error', 'error');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchCompanies(); 
  }, []);

  // ==========================================
  // ✅ RESTORE FUNCTION (Moves back to Pending)
  // ==========================================
  const handleRestore = async (companyId: string) => {
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: 'pending' })
        .eq('id', companyId);
        
      if (error) throw error;
      
      addToast("Company restored to Pending! 🔄", 'info');
      setIsDrawerOpen(false);
      setSelectedCompany(null);
      fetchCompanies();
      
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // MOVE TO TRASH FUNCTION
  const handleMoveToTrash = async (companyId: string) => {
    if (!selectedCompany && !companyId) return;
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: 'archived' })
        .eq('id', companyId);
        
      if (error) throw error;
      
      addToast("Company moved to Trash! 🗑️", 'info');
      setIsDrawerOpen(false);
      setSelectedCompany(null);
      fetchCompanies();
      
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

 // ==========================================
// ✅ UPDATED: Dual-Update Approval Function
// Updates BOTH status AND is_approved at once!
// ==========================================
const handleUpdateStatus = async (companyId: string, newStatus: 'approved' | 'rejected') => {
  if (!selectedCompany) return;
  setActionLoading(true);
  
  try {
    console.log(`🔄 [ACTION] Updating company ${companyId} to status: ${newStatus}`);
    
    // ✅ DUAL-UPDATE LOGIC: Update both fields simultaneously
    const { error } = await supabase
      .from('companies')
      .update({ 
        status: newStatus,                    // ✅ Field 1: Status text
        is_approved: newStatus === 'approved'   // ✅ Field 2: Boolean flag
      })
      .eq('id', companyId);

    if (error) {
      console.error('❌ Update Error:', error.message, error.code, error.details);
      throw error;
    }

    console.log(`✅ Company ${newStatus} successfully!`);
    console.log('   → status:', newStatus);
    console.log('   → is_approved:', newStatus === 'approved');

    // Success toast with details
    if (newStatus === 'approved') {
      addToast("✅ Company approved! They can now post OJT opportunities.", 'success');
    } else {
      addToast("❌ Company rejected. They have been notified.", 'error');
    }
    
    setIsDrawerOpen(false);
    setSelectedCompany(null);
    fetchCompanies(); // Refresh list
    
  } catch (error: any) {
    console.error('💥 Action Failed:', error);
    addToast(error.message || `Failed to ${newStatus} company`, 'error');
  } finally {
    setActionLoading(false);
  }
};

  // ==========================================
  // ✅ FIXED COUNTS - "All" EXCLUDES ARCHIVED!
  // ==========================================
  const getCounts = () => {
    // Separate archived from active companies
    const activeCompanies = companies.filter(c => c.status.toLowerCase() !== 'archived');
    const archivedCompanies = companies.filter(c => c.status.toLowerCase() === 'archived');
    
    return {
      // ✅ "All" now ONLY counts active (non-archived) companies
      all: activeCompanies.length,
      pending: activeCompanies.filter(c => c.status.toLowerCase() === 'pending').length,
      approved: activeCompanies.filter(c => c.status.toLowerCase() === 'approved').length,
      rejected: activeCompanies.filter(c => c.status.toLowerCase() === 'rejected').length,
      // Archived is counted separately
      archived: archivedCompanies.length,
    };
  };

  const counts = getCounts();
  const openDrawer = (company: Company) => { setSelectedCompany(company); setIsDrawerOpen(true); };

  // ==========================================
  // ✅ FIXED FILTERING - Exclude archived from all tabs except "Archived"
  // ==========================================
  const getDisplayedCompanies = () => {
    let filtered = companies;
    
    // ✅ KEY FIX: If NOT on Archived tab, exclude archived items!
    if (activeTab !== 'Archived') {
      filtered = filtered.filter(c => c.status.toLowerCase() !== 'archived');
    }
    
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const name = (c.name || c.company_name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }
    
    // Apply tab filter (but not for "All" since we already filtered)
    if (activeTab !== 'All' && activeTab !== 'Archived') {
      filtered = filtered.filter(c => c.status.toLowerCase() === activeTab.toLowerCase());
    }
    
    // If we're on Archived tab, only show archived (already handled above)
    // If we're on All tab, show everything except archived (already handled above)
    
    return filtered;
  };

  const displayedCompanies = getDisplayedCompanies();

  // Helper: Check if URL exists
  const hasDocument = (url?: string | null): boolean => {
    return !!url && url !== '' && url !== 'null' && url !== '#';
  };

  // Preview Modal
  const openPreview = (url: string, name: string) => {
    setPreviewDoc({ url, name });
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  // ==========================================
  // RENDER UI (rest stays the same)
  // ==========================================
  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">
      <div className="h-full flex overflow-hidden">
        
        {/* TOASTS */}
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <span className="text-base font-bold shrink-0">{
                toast.type === 'success' ? '✓' : 
                toast.type === 'error' ? '✕' : 
                toast.type === 'info' ? '🔄' : '⚠️'
              }</span>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* BACKDROPS */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
        {isDrawerOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => !actionLoading && setIsDrawerOpen(false)} />}
        {previewDoc && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110]" onClick={closePreview} />}

        {/* SIDEBAR NAVIGATION */}
        <aside className={`fixed lg:relative z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto overflow-x-hidden shadow-2xl`}>
          
          {/* Logo Section */}
          <div className="p-6 pb-5 border-b border-white/10 flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-xl">O</span>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block leading-tight">OJTly</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-4 space-y-1 flex-shrink-0">
            <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
            
            <Link href="/admin_main" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2-2h-2a2 2 0 01-2-2v-2z"/></svg>
              <span>Dashboard</span>
            </Link>

            <Link href="/admin_cpost" className="flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span className="truncate">Company Posts</span>
              </div>
              <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">4</span>
            </Link>

            <Link href="/admin_approval" className="flex items-center justify-between px-4 py-3 bg-white/10 rounded-xl font-medium text-white border border-white/10 shadow-inner">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                <span className="truncate">Approvals</span>
              </div>
              <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">{counts.pending}</span>
            </Link>

            <p className="px-4 pt-5 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>

            <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Reports</span>
            </Link>

            <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>Settings</span>
            </Link>
          </nav>

          {/* User Profile */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Admin User</p>
                <p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p>
              </div>
            </div>
            <button onClick={() => router.push('/')} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Log out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/50">
          
          {/* HEADER */}
          <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16 sm:h-18 w-full shadow-sm z-20">
            <div className="px-5 sm:px-6 lg:px-8 h-full flex items-center justify-between max-w-full">
              
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl -ml-1 active:scale-95 transition-transform">
                  <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-11 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 truncate">Company Approvals</h1>
                    <p className="text-xs sm:text-sm text-slate-400 hidden sm:block truncate">Verify and manage registrations</p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 ml-2"></div>
            </div>
          </header>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-5 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
              
              {/* Search & Filters */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-6">
                <div className="relative mb-5">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input 
                    type="text" 
                    placeholder="Search by company name or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                  />
                </div>

                {/* TABS WITH TRASH */}
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl overflow-x-auto scrollbar-hide">
                  {(['All', 'Pending', 'Approved', 'Rejected', 'Archived'] as FilterTab[]).map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      disabled={loading}
                      className={`px-4 sm:px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                        activeTab === tab ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 
                        tab === 'Archived' ? 'text-slate-500 hover:text-slate-700 hover:bg-white/70' : 
                        'text-slate-500 hover:text-slate-700 hover:bg-white/70'
                      }`}
                    >
                      {tab === 'Archived' ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116 21H8a2 2 0 01-2-2L5.133 7.858A2 2 0 017.133 6H16.867a2 2 0 011.866 1.858zM10 11v6m4-6v6M9 7h6"/>
                          </svg>
                          Trash
                        </>
                      ) : tab}
                      
                      <span className={`${
                        activeTab === tab ? 'bg-blue-500 text-white' : 
                        tab === 'Archived' ? 'bg-slate-300 text-slate-600' : 
                        'bg-slate-300 text-slate-600'
                      } text-xs px-2 py-0.5 rounded-full font-bold`}>
                        {tab === 'All' ? counts.all : 
                         tab === 'Pending' ? counts.pending : 
                         tab === 'Approved' ? counts.approved : 
                         tab === 'Rejected' ? counts.rejected : 
                         counts.archived}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LOADING STATE */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-5 bg-slate-200 rounded-lg w-3/4"></div>
                          <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
                        </div>
                        <div className="h-11 bg-slate-200 rounded-xl w-28 hidden sm:block"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedCompanies.length > 0 ? (
                /* COMPANY LIST */
                <div className="space-y-4">
                  {displayedCompanies.map((company) => (
                    <div key={company.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 p-5 sm:p-6 ${
                      activeTab === 'Archived' ? 'border-slate-300 opacity-75' : 'border-slate-100 hover:border-slate-200'
                    }`}>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0 border ${
                            company.status?.toLowerCase() === 'archived' ? 
                            'bg-slate-200 text-slate-600 border-slate-300' : 
                            'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 border-blue-100'
                          }`}>
                            {(company.name || company.company_name || '?').charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-bold text-base sm:text-lg truncate ${
                              company.status?.toLowerCase() === 'archived' ? 'text-slate-500 line-through' : 'text-slate-800'
                            }`}>
                              {company.name || company.company_name || 'Unnamed Company'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5 truncate">{company.industry || 'No industry specified'}</p>
                            <p className="text-sm text-slate-400 mt-1 truncate">{company.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className={`text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg uppercase tracking-wide border shrink-0 ${
                            company.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            company.status?.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            company.status?.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                            company.status?.toLowerCase() === 'archived' ? 'bg-slate-200 text-slate-600 border-slate-300' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {company.status || 'Unknown'}
                          </span>
                          
                          {activeTab === 'Archived' ? (
                            /* RESTORE BUTTON IN LIST VIEW */
                            <button 
                              onClick={() => handleRestore(company.id)}
                              disabled={actionLoading}
                              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg flex items-center gap-2 active:scale-95 shrink-0"
                            >
                              {actionLoading ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                              ) : (
                                <>♻️ Restore</>
                              )}
                            </button>
                          ) : (
                            <button 
                              onClick={() => openDrawer(company)}
                              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg flex items-center gap-2 active:scale-95 shrink-0"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* EMPTY STATE */
                <div className="bg-white rounded-2xl border border-slate-100 p-12 sm:p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">
                      {activeTab === 'Archived' ? '🗑️' : loading ? '⏳' : searchQuery ? '🔍' : '📭'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {activeTab === 'Archived' ? 'Trash is Empty' : 
                     searchQuery ? 'No results found' : 
                     'No companies yet'}
                  </h3>
                  
                  <p className="text-slate-500 mb-6 max-w-md">
                    {activeTab === 'Archived' ? 
                      "No archived companies yet." : 
                      searchQuery ? `No companies matching "${searchQuery}" in ${activeTab}.` : 
                      activeTab === 'Pending' ? "No pending applications at the moment." : 
                      `No ${activeTab.toLowerCase()} companies to display.`}
                  </p>
                  
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DETAIL DRAWER */}
        <div className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[450px] lg:w-[480px] bg-white shadow-2xl transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-hidden`}>
          
          {selectedCompany && (
            <>
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <h2 className="font-bold text-lg text-slate-800">Application Details</h2>
                <button onClick={() => !actionLoading && setIsDrawerOpen(false)} disabled={actionLoading} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Company Info */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shrink-0">
                    {(selectedCompany.name || selectedCompany.company_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="pt-2 min-w-0">
                    <h3 className="text-xl font-bold text-slate-800 truncate">{selectedCompany.name || selectedCompany.company_name}</h3>
                    <p className="text-base text-slate-500 mt-1">{selectedCompany.industry || 'Business'}</p>
                    <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wide ${
                      selectedCompany.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700' :
                      selectedCompany.status?.toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      selectedCompany.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' :
                      selectedCompany.status?.toLowerCase() === 'archived' ? 'bg-slate-200 text-slate-600' :
                      'bg-slate-100 text-slate-700'
                    }`}>{selectedCompany.status || 'Unknown Status'}</span>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Contact Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 uppercase font-medium">Email Address</p>
                        <p className="text-base font-medium text-slate-700 break-all">{selectedCompany.email}</p>
                      </div>
                    </div>

                    {selectedCompany.phone && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                        <div><p className="text-xs text-slate-400 uppercase font-medium">Phone Number</p><p className="text-base font-medium text-slate-700">{selectedCompany.phone}</p></div>
                      </div>
                    )}

                    {(selectedCompany.address || selectedCompany.office_address) && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <div className="min-w-0"><p className="text-xs text-slate-400 uppercase font-medium">Office Address</p><p className="text-base font-medium text-slate-700">{selectedCompany.address || selectedCompany.office_address}</p></div>
                      </div>
                    )}

                    {selectedCompany.contact_person && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <div><p className="text-xs text-slate-400 uppercase font-medium">Contact Person</p><p className="text-base font-medium text-slate-700">{selectedCompany.contact_person}</p></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Verification Documents</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">Business Permit</p>
                          <p className="text-xs text-slate-500">Local government operation permit</p>
                        </div>
                      </div>
                      {hasDocument(selectedCompany.permit_url) ? (
                        <button onClick={() => openPreview(selectedCompany.permit_url!, 'Business Permit')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 hover:border-blue-300 transition-colors shrink-0">View</button>
                      ) : (<span className="px-2.5 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 shrink-0">Not Uploaded</span>)}
                    </div>

                    <div className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">SEC / DTI Registration</p>
                          <p className="text-xs text-slate-500">Corporate or business registration</p>
                        </div>
                      </div>
                      {hasDocument(selectedCompany.sec_dti_url) ? (
                        <button onClick={() => openPreview(selectedCompany.sec_dti_url!, 'SEC / DTI Registration')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 hover:border-indigo-300 transition-colors shrink-0">View</button>
                      ) : (<span className="px-2.5 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 shrink-0">Not Uploaded</span>)}
                    </div>

                    <div className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">BIR Form 2303 (COR)</p>
                          <p className="text-xs text-slate-500">Tax registration certificate</p>
                        </div>
                      </div>
                      {hasDocument(selectedCompany.bir_2303_url) ? (
                        <button onClick={() => openPreview(selectedCompany.bir_2303_url!, 'BIR Form 2303 (COR)')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 hover:border-rose-300 transition-colors shrink-0">View</button>
                      ) : (<span className="px-2.5 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 shrink-0">Not Uploaded</span>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="p-6 border-t border-slate-100 bg-white space-y-3 shrink-0">
                
                {selectedCompany.status?.toLowerCase() === 'archived' ? (
                  /* ARCHIVED STATE: Show Restore button */
                  <div className="space-y-3">
                    <div className="w-full py-4 bg-slate-100 text-slate-600 font-bold text-lg rounded-xl text-center border border-slate-200">
                      🗑️ This company is in Trash
                    </div>
                    
                    <button 
                      onClick={() => handleRestore(selectedCompany.id)} 
                      disabled={actionLoading}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {actionLoading ? (
                        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <>♻️ Restore to Pending</>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => handleMoveToTrash(selectedCompany.id)} 
                      disabled={actionLoading}
                      className="w-full py-4 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      🗑️ Delete Permanently
                    </button>
                  </div>
                ) : selectedCompany.status?.toLowerCase() === 'pending' ? (
                  /* PENDING STATE */
                  <>
                    <button onClick={() => handleUpdateStatus(selectedCompany.id, 'approved')} disabled={actionLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-lg rounded-xl transition-all hover:shadow-xl hover:shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-[0.98]">
                      {actionLoading ? (<svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>) : (<>✅ Approve Application</>)}
                    </button>
                    
                    <button onClick={() => handleUpdateStatus(selectedCompany.id, 'rejected')} disabled={actionLoading} className="w-full py-4 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 disabled:border-red-100 disabled:text-red-300 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                      {actionLoading ? (<svg className="animate-spin h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.667z"/></svg>) : (<>❌ Reject Application</>)}
                    </button>

                    <button 
                      onClick={() => handleMoveToTrash(selectedCompany.id)} 
                      disabled={actionLoading}
                      className="w-full py-4 bg-white border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      🗑️ Move to Trash
                    </button>
                  </>
                ) : (
                  /* APPROVED/REJECTED STATE */
                  <div className="space-y-3">
                    <div className="w-full py-4 bg-slate-100 text-slate-500 font-bold text-lg rounded-xl text-center">
                      Already {selectedCompany.status}
                    </div>
                    
                    <button 
                      onClick={() => handleMoveToTrash(selectedCompany.id)} 
                      disabled={actionLoading}
                      className="w-full py-4 bg-white border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      🗑️ Move to Trash
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* DOCUMENT PREVIEW MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePreview}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">📄</div>
                  <div>
                    <h3 className="font-bold text-slate-800">{previewDoc.name}</h3>
                    <p className="text-xs text-slate-500">Document Preview</p>
                  </div>
                </div>
                <button onClick={closePreview} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-100">
                {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewDoc.url} className="w-full h-[70vh] rounded-lg border-0 shadow-inner bg-white" title={previewDoc.name}></iframe>
                ) : (
                  <div className="flex items-center justify-center h-[70vh] bg-white rounded-lg shadow-inner p-4">
                    <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-md"/>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Click outside or press ESC to close</p>
                <div className="flex items-center gap-3">
                  <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Open in New Tab</a>
                  <button onClick={closePreview} className="px-6 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: zoom-in 0.2s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        aside::-webkit-scrollbar { width: 5px; }
        aside::-webkit-scrollbar-track { background: transparent; }
        aside::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        html, body { overflow-x: hidden; width: 100%; height: 100%; }
      `}</style>
    </div>
  );
}