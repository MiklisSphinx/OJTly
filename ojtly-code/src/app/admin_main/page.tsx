'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [animatedCards, setAnimatedCards] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedCards(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const [companies, setCompanies] = useState([
    { id: 1, name: 'Global Tech Solutions', permit: 'Business_Permit_2024.pdf', status: 'Pending', industry: 'IT & Software', date: 'Jan 15, 2024' },
    { id: 2, name: 'InnoCorp Solutions', permit: 'InnoCorp_Docs.pdf', status: 'Pending', industry: 'Consulting', date: 'Jan 14, 2024' },
    { id: 3, name: 'Digital Minds Inc.', permit: 'DM_License.pdf', status: 'Pending', industry: 'Digital Marketing', date: 'Jan 13, 2024' },
    { id: 4, name: 'NexaBuild Corp.', permit: 'NexaBuild_Permit.pdf', status: 'Pending', industry: 'Construction Tech', date: 'Jan 12, 2024' },
    { id: 5, name: 'Alpha Finance Ltd.', permit: 'Alpha_Biz_Permit.pdf', status: 'Pending', industry: 'Finance & Banking', date: 'Jan 11, 2024' },
  ]);

  const pendingCompanyCount = companies.length;

  const handleCompanyAction = (id: number, action: 'approve' | 'reject') => {
    const company = companies.find(c => c.id === id);
    setCompanies(prev => prev.filter(c => c.id !== id));
    addToast(`${company?.name} has been ${action}d.`, action === 'approve' ? 'success' : 'error');
  };

  const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="font-semibold text-slate-700 text-base">{title}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-[250px] leading-relaxed">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">

      {/* Toast Container */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' :
              'bg-blue-50/95 border-blue-200 text-blue-800'
            }`}>
            <span className="text-sm font-bold">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-black text-lg">O</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">OJTly</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="px-3 space-y-0.5">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          
          <Link href="#" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5">
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>

          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span className="flex-1">Company Approvals</span>
            {pendingCompanyCount > 0 && <span className="text-[10px] bg-amber-500/90 text-white px-2 py-0.5 rounded-full font-bold">{pendingCompanyCount}</span>}
          </Link>

  

          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>

          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Reports
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all duration-200 group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all duration-200 w-full text-sm">
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
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors -ml-1">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Dashboard</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Overview of all activities</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="relative p-2 sm:p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 ml-0.5">A</div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-2">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Welcome back, Admin 👋</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage pending company registrations.</p>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Stats Grid (3 columns) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {[
              { label: 'Total Companies', value: '58', icon: '🏢', bg: 'bg-blue-50' },
              { label: 'Approved', value: '41', icon: '✅', bg: 'bg-emerald-50' },
              { label: 'Pending', value: pendingCompanyCount.toString(), icon: '⏳', bg: 'bg-amber-50' },
            ].map((card, i) => (
              <div key={card.label} className={`bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-5 transition-all duration-500 hover:shadow-md hover:-translate-y-0.5 ${animatedCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="flex flex-col items-start sm:items-start gap-1 sm:gap-2">
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 ${card.bg} rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-xl shrink-0`}>{card.icon}</div>
                  <div className="min-w-0 w-full">
                    <p className="text-[9px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate">{card.label}</p>
                    <p className="text-lg sm:text-3xl font-bold text-slate-800 mt-0.5 sm:mt-1 tracking-tight">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Width Company Approvals */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-800">Pending Company Registrations</h3>
              </div>
              {companies.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  {companies.length} pending
                </span>
              )}
            </div>
            
            <div className="p-2.5 sm:p-4">
              {companies.length === 0 ? (
                <EmptyState icon="🏢" title="All caught up!" description="No pending company registrations to review right now." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                  {companies.map(company => (
                    <div key={company.id} className="group p-3.5 sm:p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all duration-200 bg-white flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-blue-600 transition-colors leading-snug pr-2">{company.name}</h4>
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold shrink-0">Pending</span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 mb-1 font-medium">{company.industry}</p>
                      <p className="text-[11px] text-slate-400 mb-3">{company.date}</p>

                      {/* Attachment */}
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mb-4 flex-1">
                        <div className="w-8 h-8 bg-white rounded-md border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-slate-700 truncate">{company.permit}</p>
                          <p className="text-[10px] text-slate-400">PDF Document</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleCompanyAction(company.id, 'approve')}
                          className="flex-1 py-2.5 text-[11px] sm:text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all duration-200 hover:shadow-md hover:shadow-emerald-500/25 active:scale-[0.97]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleCompanyAction(company.id, 'reject')}
                          className="flex-1 py-2.5 text-[11px] sm:text-xs bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-lg font-semibold transition-all duration-200 active:scale-[0.97]"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }

        .overflow-y-auto::-webkit-scrollbar { width: 3px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 100px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}