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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans overflow-x-hidden">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* ============================================ */}
      {/* SIDEBAR - FULLY RESPONSIVE                 */}
      {/* ============================================ */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto shadow-2xl`}>
        
        {/* Logo Section */}
        <div className="p-5 pb-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 transition-transform group-hover:scale-105">
              <span className="text-white font-black text-lg">O</span>
            </div>
            <div className="min-w-0">
              <span className="text-xl font-bold tracking-tight text-white block leading-tight">OJTly</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>
        
        {/* Navigation - Scrollable on small screens */}
        <nav className="px-3 space-y-0.5 py-4 pb-24 overflow-y-auto">
          <p className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Main</p>
          
          {/* Dashboard */}
          <Link href="/admin_main" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group active:scale-[0.98]" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            <span className="truncate">Dashboard</span>
          </Link>

          {/* Company Posts with Badge */}
          <Link href="/admin_cpost" className="flex items-center justify-between px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group active:scale-[0.98]" onClick={() => setIsSidebarOpen(false)}>
            <div className="flex items-center gap-3 min-w-0">
              <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span className="truncate">Company Posts</span>
            </div>
            <span className="min-w-[20px] h-5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 transition-all shrink-0 ml-2">4</span>
          </Link>

          {/* Company Approvals */}
          <Link href="/admin_approval" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group active:scale-[0.98]" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span className="truncate">Company Approvals</span>
          </Link>

          <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Analytics</p>
          
          {/* Reports - Active State */}
          <Link href="/admin_reports" className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl font-medium text-white border border-white/10 shadow-inner">
            <svg className="w-[18px] h-[18px] text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="truncate">Reports</span>
          </Link>

          {/* Settings */}
          <Link href="/admin_settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all group active:scale-[0.98]" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-[18px] h-[18px] group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="truncate">Settings</span>
          </Link>
        </nav>

        {/* Bottom User Section - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 shrink-0 ring-2 ring-white/10">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-[11px] text-slate-500 truncate">admin@ojtly.com</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all w-full text-sm active:scale-[0.98]"
          >
            <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* ============================================ */}
      {/* MAIN CONTENT - RESPONSIVE LAYOUT           */}
      {/* ============================================ */}
      <main className="lg:ml-[280px] min-h-screen w-full flex flex-col">
        
        {/* Header - Sticky & Responsive */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between max-w-[1920px] mx-auto w-full">
            
            {/* Left Side: Menu + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="lg:hidden p-2 hover:bg-slate-100 rounded-xl -ml-1 active:scale-95 transition-transform"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
              
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 truncate leading-tight">
                  Reports & Analytics
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate mt-0.5">
                  Platform accounts and BSCS statistics
                </p>
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 sm:ml-4">
              <button className="hidden xs:flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all active:scale-95">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">Export</span>
              </button>
              
              {/* Avatar */}
              <div className="relative group cursor-pointer">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-shadow group-hover:shadow-lg">
                  A
                </div>
                {/* Optional: Dropdown indicator */}
                <div className="absolute -bottom-1 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
            
            {/* Page Title & Timeframe Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white/50 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-100/50">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                  Overview 📊
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 hidden sm:block">
                  Real-time platform analytics dashboard
                </p>
              </div>
              
              {/* Responsive Timeframe Buttons */}
              <div className="flex gap-1.5 sm:gap-2 bg-slate-100 p-1 rounded-xl w-fit shrink-0 self-start sm:self-auto overflow-x-auto max-w-full scrollbar-hide">
                {['This Week', 'This Month', 'This Year'].map(time => (
                  <button 
                    key={time} 
                    onClick={() => setActiveTimeframe(time)} 
                    className={`px-3 sm:px-4 lg:px-5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap min-w-fit ${
                      activeTimeframe === time 
                        ? 'bg-white text-slate-900 shadow-sm text-slate-800' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* ============================================ */}
            {/* STATS CARDS - RESPONSIVE GRID             */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {[
                { label: 'Total User Accounts', value: '185', change: '+12 this month', icon: '👥', bg: 'bg-blue-50', gradient: 'from-blue-500 to-cyan-500' },
                { label: 'BSCS Students', value: '124', change: '67% of users', icon: '🎓', bg: 'bg-indigo-50', gradient: 'from-indigo-500 to-purple-500' },
                { label: 'Registered Companies', value: '58', change: '31% of users', icon: '🏢', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-500' },
              ].map((card, i) => (
                <div 
                  key={card.label} 
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-slate-200 ${
                    animatedCharts ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`} 
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 ${card.bg} rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0`}>
                      {card.icon}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md leading-relaxed text-right line-clamp-2 max-w-[80px] sm:max-w-none">
                      {card.change}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight leading-tight">
                      {card.value}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                      {card.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ============================================ */}
            {/* CHARTS SECTION - STACK ON MOBILE           */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              
              {/* BSCS Status Breakdown (Bar Chart) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-6 overflow-hidden order-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">BSCS Student Status</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Current semester breakdown</p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 sm:px-2.5 py-1 rounded-md uppercase tracking-wide whitespace-nowrap self-start shrink-0">
                    BSCS Only
                  </span>
                </div>
                
                <div className="space-y-4 sm:space-y-5 lg:space-y-6 pt-2 sm:pt-3">
                  {bscsData.map((data) => (
                    <div key={data.label} className="group">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{data.label}</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0 ml-2 tabular-nums">
                          {data.value} Students
                        </span>
                      </div>
                      <div className="w-full h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${data.color} rounded-full transition-all duration-1000 ease-out group-hover:brightness-110`}
                          style={{ width: animatedCharts ? `${(data.value / maxBscsValue) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend for accessibility */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3 sm:gap-4">
                  {bscsData.map(data => (
                    <div key={data.label} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${data.color}`} />
                      <span className="text-[10px] text-slate-500">{data.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Types Breakdown (Donut Chart) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-6 flex flex-col overflow-hidden order-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">Account Breakdown</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">By user role type</p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md whitespace-nowrap self-start shrink-0">
                    By Role
                  </span>
                </div>
                
                {/* Donut Chart Container - Responsive sizing */}
                <div className="flex-1 flex items-center justify-center relative my-4 sm:my-6 lg:my-8 min-h-[180px] sm:min-h-[220px] lg:min-h-[250px]">
                  <div 
                    className="w-36 h-36 sm:w-44 sm:w-48 lg:w-52 lg:h-52 rounded-full shadow-inner transition-all duration-1000 ease-out animate-in fade-in zoom-in duration-700"
                    style={{ 
                      background: `conic-gradient(
                        from 0deg, 
                        ${accountData[0].color} 0% ${accountData[0].value * 3.6}deg, 
                        ${accountData[1].color} ${accountData[0].value * 3.6}deg ${(accountData[0].value + accountData[1].value) * 3.6}deg, 
                        ${accountData[2].color} ${(accountData[0].value + accountData[1].value) * 3.6}deg 360deg
                      )` 
                    }}
                  />
                  
                  {/* Center Label */}
                  <div className="absolute inset-3 sm:inset-4 lg:inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-lg">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tabular-nums">185</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total</span>
                  </div>
                </div>
                
                {/* Legend List */}
                <div className="space-y-2 sm:space-y-3 mt-auto pt-4 border-t border-slate-100">
                  {accountData.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2 sm:gap-3 group">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm shrink-0 ring-2 ring-offset-1 ring-transparent group-hover:ring-current/20 transition-all" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-xs sm:text-sm font-medium text-slate-600 truncate group-hover:text-slate-800 transition-colors">
                          {item.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2 sm:gap-3 shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 w-6 sm:w-8 text-right tabular-nums">
                          {item.count}
                        </span>
                        <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md min-w-[34px] sm:min-w-[38px] text-center tabular-nums ${item.bgColor} ${item.textColor}`}>
                          {item.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Info Cards (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-purple-500/20 col-span-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] sm:text-xs font-medium opacity-80 uppercase tracking-wider">Growth Rate</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    📈
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-black tracking-tight">+23%</p>
                <p className="text-[10px] sm:text-xs opacity-80 mt-1">vs last month</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 col-span-1 sm:col-span-2 lg:col-span-2">
                <h4 className="font-bold text-sm text-slate-800 mb-3">Quick Insights</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-lg sm:text-xl font-bold text-slate-800">89%</p>
                    <p className="text-[10px] text-slate-500">Completion</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-lg sm:text-xl font-bold text-slate-800">15</p>
                    <p className="text-[10px] text-slate-500">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                    <p className="text-lg sm:text-xl font-bold text-slate-800">4.8</p>
                    <p className="text-[10px] text-slate-500">Avg Rating</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          {/* Bottom Spacing for mobile nav safety */}
          <div className="h-8 lg:hidden"></div>
        </div>
      </main>

      {/* Global Styles */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome/Safari */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Custom sidebar scrollbar */
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        aside::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 100px;
        }
        
        /* Smooth animations */
        @keyframes fadeInZoom {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-in {
          animation-duration: 700ms;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        
        .fade-in {
          --tw-enter-opacity: 0;
        }
        
        .zoom-in {
          --tw-enter-scale: 0.95;
        }
        
        /* Touch optimization */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        /* Ensure no horizontal scroll on any device */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        /* Tabular numbers for data */
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}