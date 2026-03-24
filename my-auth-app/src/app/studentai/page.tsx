'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StudentAIPage() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans overflow-x-hidden flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/student_main" className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-cyan-400 text-2xl">◉</span> 
            <span>OJTly <span className="text-cyan-400">A.I.</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full">
            <Link href="/student_main" className="px-4 py-1.5 text-sm font-medium text-slate-300 rounded-full hover:bg-white/10">Find OJT</Link>
            <Link href="/map" className="px-4 py-1.5 text-sm font-medium text-slate-300 rounded-full hover:bg-white/10">Map</Link>
            <Link href="/student_main/studentai" className="px-4 py-1.5 text-sm font-medium bg-cyan-500/20 text-cyan-300 rounded-full">A.I Chat Bot</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
              <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white shadow-md">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <span className="hidden sm:inline font-semibold">Profile</span>
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-transparent border border-slate-700 text-slate-300 text-sm font-semibold rounded-lg hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400">Log out</button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800">
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 inset-x-0 bg-slate-900 border-b border-slate-800 shadow-lg z-40">
            <div className="px-4 py-4 space-y-3">
              <Link href="/jobs" className="block px-4 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 rounded-lg">Find OJT</Link>
              <Link href="/map" className="block px-4 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 rounded-lg">Map</Link>
              <Link href="/student_main/studentai" className="block px-4 py-2 text-base font-medium text-cyan-400 bg-cyan-900/20 rounded-lg">A.I Chat Bot</Link>
              <hr className="border-slate-800"/>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 text-base font-medium">Log out</button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-cyan-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 mb-6 shadow-lg shadow-cyan-500/30">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
               </svg>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">OJTly A.I.</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-10">
              Your smart assistant for finding the best OJT opportunities. Streamline your search with artificial intelligence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <button className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-cyan-500/20">
                   <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">View BPED Nearby OJT</h3>
                <p className="text-xs text-slate-400">Locate physical education opportunities close to you.</p>
              </button>

              <button className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20">
                   <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                   </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Find BSC OJT Near You</h3>
                <p className="text-xs text-slate-400">Discover Business & Service Centers in your area.</p>
              </button>

              <button className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 hover:shadow-xl hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Start Searching</h3>
                <p className="text-xs text-cyan-100">Find specific roles tailored to your skills.</p>
              </button>
            </div>

            <p className="text-slate-500 text-xs">
              Tip: Use specific keywords for better AI matching results.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}