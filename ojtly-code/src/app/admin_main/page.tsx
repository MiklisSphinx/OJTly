'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mock Data
  const [companies, setCompanies] = useState([
    { id: 1, name: 'Global Tech Sol.', permit: 'Business_Permit_2024.pdf', status: 'Pending' },
    { id: 2, name: 'InnoCorp Solutions', permit: 'InnoCorp_Docs.pdf', status: 'Pending' },
    { id: 3, name: 'Digital Minds Inc.', permit: 'DM_License.pdf', status: 'Pending' },
  ]);

  const [posts, setPosts] = useState([
    { id: 1, title: 'Web Developer Intern', company: 'ABC Tech', status: 'Pending' },
    { id: 2, title: 'Data Science Intern', company: 'Global Tech', status: 'Pending' },
    { id: 3, title: 'Marketing Assistant', company: 'Creative Hub', status: 'Pending' },
  ]);

  const [students, setStudents] = useState([
    { id: 1, name: 'Juan Dela Cruz', role: 'UI/UX Designer', status: 'Pending' },
    { id: 2, name: 'Maria Santos', role: 'Web Developer', status: 'Accepted' },
    { id: 3, name: 'Pedro Reyes', role: 'Data Analyst', status: 'Pending' },
  ]);

  // Actions
  const handleCompanyAction = (id: number, action: 'approve' | 'reject') => {
    setCompanies(companies.filter(c => c.id !== id));
    alert(`Company ${action}d successfully.`);
  };

  const handlePostAction = (id: number, action: 'approve' | 'reject') => {
    setPosts(posts.filter(p => p.id !== id));
    alert(`Post ${action}d successfully.`);
  };

  const handleStudentAction = (id: number, action: 'accept' | 'reject') => {
    setStudents(students.map(s => s.id === id ? { ...s, status: action === 'accept' ? 'Accepted' : 'Rejected' } : s));
    alert(`Application ${action}ed.`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Admin Theme (Blue) */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-blue-900 text-white border-r border-blue-800 transition-transform duration-300 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-6 border-b border-blue-800">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-blue-300 text-2xl">◉</span> OJTly
          </Link>
          <p className="text-xs text-blue-400 mt-1">Admin Panel</p>
        </div>

        <nav className="p-4 space-y-1">
          {/* Active Link */}
          <Link href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-700 rounded-lg font-medium text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </Link>
          
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-blue-800 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Company Approvals
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-blue-800 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            OJT Post Approvals
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-blue-800 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Student Applications
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-blue-800 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Reports
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-blue-800 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
           <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-blue-200 hover:bg-red-600 hover:text-white rounded-lg font-medium transition-colors w-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800">Admin Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
               <span className="text-sm font-medium text-slate-700 hidden sm:block">Admin</span>
               <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm">
                A
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Companies</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">58</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">41</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending OJT</p>
                <p className="text-3xl font-bold text-yellow-500 mt-1">12</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Applicants</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">185</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
            </div>

          </div>

          {/* Data Tables/Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Company Approvals */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Company Approvals</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">{companies.length} Pending</span>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-96">
                {companies.map(company => (
                  <div key={company.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{company.name}</h4>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 truncate">{company.permit}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleCompanyAction(company.id, 'approve')} className="flex-1 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">Approve</button>
                      <button onClick={() => handleCompanyAction(company.id, 'reject')} className="flex-1 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OJT Post Approvals */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">OJT Post Approvals</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">{posts.length} Pending</span>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-96">
                {posts.map(post => (
                  <div key={post.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-slate-800">{post.title}</h4>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-xs text-blue-600 mb-3">{post.company}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors">View</button>
                      <button onClick={() => handlePostAction(post.id, 'approve')} className="flex-1 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">Approve</button>
                      <button onClick={() => handlePostAction(post.id, 'reject')} className="flex-1 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Applications */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Student Applications</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">{students.length} Total</span>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-96">
                {students.map(student => (
                  <div key={student.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-slate-800">{student.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${student.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {student.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{student.role}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors">Resume</button>
                      {student.status !== 'Accepted' && (
                        <>
                          <button onClick={() => handleStudentAction(student.id, 'accept')} className="flex-1 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">Accept</button>
                          <button onClick={() => handleStudentAction(student.id, 'reject')} className="flex-1 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}