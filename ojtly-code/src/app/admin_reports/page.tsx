'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminReportPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState('This Month');
  const [animatedCharts, setAnimatedCharts] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedCharts(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data strictly focused on BSCS & Accounts
  const bscsData = [
    { label: 'Active OJT', value: 85, color: 'bg-blue-500' },
    { label: 'Pending', value: 15, color: 'bg-amber-500' },
    { label: 'Completed', value: 24, color: 'bg-emerald-500' },
  ];
  const maxBscsValue = Math.max(...bscsData.map(d => d.value));

  // Data for Accounts Donut Chart (Calculated to equal 100%)
  const accountData = [
    { label: 'BSCS Students', value: 67, color: '#6366f1', textColor: 'text-indigo-600', bgColor: 'bg-indigo-50', count: 124 },
    { label: 'Companies', value: 31, color: '#10b981', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', count: 58 },
    { label: 'Admins', value: 2, color: '#a855f7', textColor: 'text-purple-600', bgColor: 'bg-purple-50', count: 3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans">

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

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
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Company Approvals
          </Link>

          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>
          <Link href="/admin_report" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/5">
            <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Reports
          </Link>
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                <h1 className="text-sm sm:text-base font-bold text-slate-800">Reports & Analytics</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Platform accounts and BSCS statistics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition hidden sm:flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export PDF
              </button>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20">A</div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Overview 📊</h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              {['This Week', 'This Month', 'This Year'].map(time => (
                <button key={time} onClick={() => setActiveTimeframe(time)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTimeframe === time ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Top Stats Row - ONLY Total Accounts, BSCS, Companies */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Total User Accounts', value: '185', change: '+12 this month', icon: '👥', bg: 'bg-blue-50' },
              { label: 'BSCS Students', value: '124', change: '67% of users', icon: '🎓', bg: 'bg-indigo-50' },
              { label: 'Registered Companies', value: '58', change: '31% of users', icon: '🏢', bg: 'bg-emerald-50' },
            ].map((card, i) => (
              <div key={card.label} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all duration-500 hover:shadow-md hover:-translate-y-0.5 ${animatedCharts ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center text-xl`}>{card.icon}</div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md leading-relaxed text-center">{card.change}</span>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">{card.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* BSCS Status Breakdown (Bar Chart) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-sm text-slate-800">BSCS Student Status</h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wide">BSCS Only</span>
              </div>
              <div className="space-y-6 pt-2">
                {bscsData.map((data) => (
                  <div key={data.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-xs font-medium text-slate-600">{data.label}</span>
                      <span className="text-xs font-bold text-slate-800">{data.value} Students</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${data.color} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: animatedCharts ? `${(data.value / maxBscsValue) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Types Breakdown (Donut Chart) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-sm text-slate-800">Account Breakdown</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">By Role</span>
              </div>
              <div className="flex-1 flex items-center justify-center relative w-44 h-44 sm:w-52 sm:h-52 mx-auto mb-6">
                {/* CSS Conic Gradient Donut - Values add to 100 (67 + 31 + 2) */}
                <div 
                  className="w-full h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    background: `conic-gradient(
                      from 0deg, 
                      ${accountData[0].color} 0% ${accountData[0].value * 3.6}deg, 
                      ${accountData[1].color} ${accountData[0].value * 3.6}deg ${(accountData[0].value + accountData[1].value) * 3.6}deg, 
                      ${accountData[2].color} ${(accountData[0].value + accountData[1].value) * 3.6}deg 360deg
                    )` 
                  }}
                />
                <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-800">185</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {accountData.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-slate-600">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-800">{item.count}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${item.bgColor} ${item.textColor}`}>
                        {item.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 100px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}