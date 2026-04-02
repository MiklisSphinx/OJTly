// app/admin_approval/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type CompanyStatus = 'Pending' | 'Approved' | 'Rejected';

interface Company {
  id: number;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  permit: string;
  status: CompanyStatus;
  date: string;
}

export default function CompanyApprovalPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<CompanyStatus | 'All'>('Pending');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const [companies, setCompanies] = useState<Company[]>([
    { id: 1, name: 'Global Tech Solutions', industry: 'IT & Software', email: 'hr@globaltech.com', phone: '0912-345-6789', address: '123 IT Park, Bacolod City', permit: 'Business_Permit_2024.pdf', status: 'Pending', date: 'Jan 15, 2024' },
    { id: 2, name: 'InnoCorp Solutions', industry: 'Consulting', email: 'admin@innocorp.ph', phone: '0934-567-8901', address: '456 Business Hub, Mandalagan', permit: 'InnoCorp_Docs.pdf', status: 'Pending', date: 'Jan 14, 2024' },
    { id: 3, name: 'Digital Minds Inc.', industry: 'Digital Marketing', email: 'careers@digitalminds.io', phone: '0956-789-0123', address: '789 Cyber Ave, Bata', permit: 'DM_License.pdf', status: 'Pending', date: 'Jan 13, 2024' },
    { id: 4, name: 'NexaBuild Corp.', industry: 'Construction Tech', email: 'info@nexabuild.com', phone: '0978-901-2345', address: '101 Builders St., Singcang', permit: 'NexaBuild_Permit.pdf', status: 'Approved', date: 'Jan 12, 2024' },
    { id: 5, name: 'Alpha Finance Ltd.', industry: 'Finance & Banking', email: 'sec@alphafinance.com', phone: '0911-223-3445', address: '222 Financial Ave., Brgy. 2', permit: 'Alpha_Biz_Permit.pdf', status: 'Rejected', date: 'Jan 11, 2024' },
  ]);

  const pendingCount = companies.filter(c => c.status === 'Pending').length;

  const filteredCompanies = companies.filter(c => {
    const matchesTab = activeTab === 'All' || c.status === activeTab;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const openDrawer = (company: Company) => {
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'Approved' : 'Rejected' } : c));
    setIsDrawerOpen(false);
    setSelectedCompany(null);
    addToast(`Company has been successfully ${action}d.`, action === 'approve' ? 'success' : 'error');
  };

  const tabs: Array<{ label: string; value: CompanyStatus | 'All'; count?: number }> = [
    { label: 'Pending', value: 'Pending', count: pendingCount },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'All', value: 'All' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">

      {/* Toasts */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 'bg-red-50/95 border-red-200 text-red-800'}`}>
            <span className="text-sm font-bold">{toast.type === 'success' ? '✓' : '✕'}</span>
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isDrawerOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"><span className="text-white font-black text-lg">O</span></div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">OJTly</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>
        <nav className="px-3 space-y-0.5">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          <Link href="/admin_dashboard" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>
          
          {/* Active State for this page */}
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5">
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Company Approvals
          </Link>

          {/* --- ADDED: Analytics Section --- */}
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>

          <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Reports
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
        </nav>

        {/* Log Out (Already at bottom, structure untouched) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all w-full text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-14 sm:h-16">
          <div className="px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Company Approvals</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Verify and manage company registrations</p>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20">A</div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 max-w-6xl mx-auto">
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search by company name or industry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"/>
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg font-medium">Total Pending: <span className="font-bold text-amber-600">{pendingCount}</span></p>
            </div>

            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              {tabs.map(tab => (
                <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab.label}
                  {tab.count !== undefined && (<span className={`${activeTab === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'} text-[10px] px-1.5 py-0.5 rounded-md font-bold`}>{tab.count}</span>)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredCompanies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-2xl">📭</div>
                <p className="font-bold text-slate-700">No companies found</p>
                <p className="text-sm text-slate-400 mt-1">There are no {activeTab.toLowerCase()} companies matching your search.</p>
              </div>
            ) : (
              filteredCompanies.map(company => (
                <div key={company.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg shrink-0 border border-blue-100">{company.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-800 truncate">{company.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{company.industry} • Applied {company.date}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5 hidden sm:block">{company.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide ${company.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' : company.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{company.status}</span>
                    <button onClick={() => openDrawer(company)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all hover:shadow-lg flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Detail Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[450px] bg-white shadow-2xl transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedCompany && (
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Company Details</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/25">{selectedCompany.name.charAt(0)}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedCompany.name}</h3>
                  <p className="text-sm text-slate-500">{selectedCompany.industry}</p>
                  <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${selectedCompany.status === 'Pending' ? 'bg-amber-100 text-amber-700' : selectedCompany.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{selectedCompany.status}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Information</h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <div><p className="text-xs text-slate-400">Email Address</p><p className="text-sm font-medium text-slate-700">{selectedCompany.email}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <div><p className="text-xs text-slate-400">Phone Number</p><p className="text-sm font-medium text-slate-700">{selectedCompany.phone}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <div><p className="text-xs text-slate-400">Office Address</p><p className="text-sm font-medium text-slate-700">{selectedCompany.address}</p></div>
                  </div>
                </div>
              </div>
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-blue-50/30">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Uploaded Business Permit</h4>
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{selectedCompany.permit}</p><p className="text-xs text-slate-400">PDF Document • Uploaded on {selectedCompany.date}</p></div>
                  <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition shrink-0">View</button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white space-y-2">
              {selectedCompany.status === 'Pending' ? (
                <>
                  <button onClick={() => handleAction(selectedCompany.id, 'approve')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Approve Company
                  </button>
                  <button onClick={() => handleAction(selectedCompany.id, 'reject')} className="w-full py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>Reject Application
                  </button>
                </>
              ) : (
                <div className="w-full py-3 bg-slate-100 text-slate-500 font-semibold rounded-xl text-center">This company has already been {selectedCompany.status.toLowerCase()}.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 100px; }
      `}</style>
    </div>
  );
}