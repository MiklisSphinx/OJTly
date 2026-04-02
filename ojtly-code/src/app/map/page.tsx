'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Job } from '@/lib/recommendation';

// Import Map dynamically
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-200 animate-pulse rounded-xl" />
});

// Extended mock data to match the "Find OJT" card structure
const jobsData: (Job & { status: string; duration: string; allowance: string; skills: string[]; deadline: string })[] = [
  { id: 1, title: 'Web Developer Intern', company: 'ABC Tech Solutions', salary: 15000, location: 'Talisay City', role: 'Developer', mode: 'On-Site', description: 'We are looking for students who are willing to learn web development and assist in building modern web applications.', lat: 10.7400, lng: 122.9500, status: 'Active', duration: '300 Hours', allowance: 'Paid', skills: ['HTML', 'CSS', 'JavaScript'], deadline: 'July 30, 2026' },
  { id: 2, title: 'UI/UX Designer', company: 'Creative Studio', salary: 12000, location: 'Silay City', role: 'Designer', mode: 'Remote', description: 'Assist in creating user-centered designs for mobile and web applications. Proficiency in Figma is a plus.', lat: 10.8000, lng: 122.9667, status: 'Active', duration: '250 Hours', allowance: 'Unpaid', skills: ['Figma', 'Adobe XD'], deadline: 'August 15, 2026' },
  { id: 3, title: 'Data Analyst Intern', company: 'Data Insights Inc.', salary: 18000, location: 'Bacolod City', role: 'Data Analyst', mode: 'Hybrid', description: 'Support the data team in analyzing market trends and generating reports. Knowledge of Excel and Python required.', lat: 10.6840, lng: 122.9563, status: 'Active', duration: '400 Hours', allowance: 'Paid', skills: ['Python', 'SQL', 'Excel'], deadline: 'September 01, 2026' },
  { id: 4, title: 'Marketing Assistant', company: 'Negros Marketing', salary: 13000, location: 'Bacolod City', role: 'Designer', mode: 'On-Site', description: 'Help with marketing campaigns and layouts. Creativity is key!', lat: 10.6940, lng: 122.9300, status: 'Active', duration: '200 Hours', allowance: 'Paid', skills: ['Canva', 'Social Media'], deadline: 'August 20, 2026' },
  { id: 5, title: 'IT Support', company: 'Silay IT Hub', salary: 14000, location: 'Silay City', role: 'Developer', mode: 'On-Site', description: 'Provide technical support to employees. Troubleshooting hardware and software issues.', lat: 10.8100, lng: 122.9800, status: 'Active', duration: '300 Hours', allowance: 'Paid', skills: ['Hardware', 'Networking'], deadline: 'July 15, 2026' }
];

export default function JobBoard() {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<(typeof jobsData)[0] | null>(jobsData[0]);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleJobClick = (job: typeof jobsData[0]) => {
    setSelectedJob(job);
    setIsMobileDetailOpen(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToList = () => {
    setIsMobileDetailOpen(false);
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      
      {/* Navigation (Exact match from Find OJT) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-blue-600 text-2xl">◉</span> 
            <span>OJTly</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            <Link href="/student_main" className="px-4 py-1.5 text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">Find OJT</Link>
            <button onClick={() => setIsMapExpanded(true)} className="px-4 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-full shadow-sm transition-all duration-200">Map</button>
            <Link href="/studentai" className="px-4 py-1.5 text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">A.I Chat Bot</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/student_profile" className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <span className="hidden sm:inline font-semibold">Profile</span>
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-transparent border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200">Log out</button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 inset-x-0 bg-white border-b border-slate-200 shadow-lg z-40 animate-fade-in-down">
            <div className="px-4 py-4 space-y-3">
              <Link href="/student_main" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Find OJT</Link>
              <button onClick={() => { setIsMapExpanded(true); setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-base font-medium text-blue-600 bg-blue-50 rounded-lg">Map</button>
              <Link href="/studentai" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">A.I Chat Bot</Link>
              <hr className="border-slate-100"/>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 text-base font-medium">Log out</button>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN (Exact Match Find OJT) */}
          <aside className={`lg:col-span-5 ${isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
            <div className="space-y-4 lg:sticky lg:top-24">
              
              {/* Map Preview Card */}
              <div onClick={() => setIsMapExpanded(true)} className="h-48 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative z-0 cursor-pointer group bg-slate-100">
                 <div className="w-full h-full">
                    <Map jobs={jobsData} />
                 </div>
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center z-10">
                   <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                     <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                     <span className="text-xs font-bold text-slate-700">Expand Map</span>
                   </div>
                 </div>
              </div>

              {/* Job List Card */}
              <div className="bg-slate-100 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4 px-1">
                  <h3 className="text-sm font-bold text-slate-500 uppercase">
                    <span className="text-blue-600">{jobsData.length}</span> Positions
                  </h3>
                </div>

                <div className="space-y-3 lg:h-[calc(100vh-320px)] overflow-y-auto pr-2 py-1 scrollbar-thin">
                  {jobsData.map((job) => (
                    <div 
                      key={job.id} 
                      onClick={() => handleJobClick(job)}
                      className={`bg-white p-5 rounded-xl border cursor-pointer transition-all duration-200 ease-in-out
                        ${selectedJob?.id === job.id 
                          ? 'border-blue-500 border-2 shadow-md' 
                          : 'border-slate-100 hover:border-slate-300 hover:shadow-md'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden shrink-0">LOGO</div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{job.title}</h4>
                      <p className="text-sm text-slate-500 mb-3">{job.company}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.duration}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {job.skills.map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className={`text-xs font-bold ${job.allowance === 'Paid' ? 'text-green-600' : 'text-slate-500'}`}>{job.allowance}</span>
                        <span className="text-xs text-slate-400">Deadline: {job.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Details Panel */}
          <section className={`lg:col-span-7 ${isMobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
            <button onClick={handleBackToList} className="lg:hidden flex items-center gap-1 text-blue-600 font-semibold mb-4 text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to List
            </button>

            {selectedJob && (
              <div key={selectedJob.id} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden sticky top-24 animate-fade-in lg:h-[calc(100vh-140px)] flex flex-col">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-start sm:items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-xl font-bold text-slate-400 flex-shrink-0">LOGO</div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                      <p className="text-slate-500">{selectedJob.company}</p>
                    </div>
                  </div>
                  <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${selectedJob.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {selectedJob.status}
                  </span>
                </div>

                <div className="p-6 flex-1 overflow-y-auto scrollbar-thin">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Location</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.location}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Duration</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.duration}</span>
                    </div>
                    <div className={`${selectedJob.allowance === 'Paid' ? 'bg-green-50' : 'bg-slate-50'} p-4 rounded-xl`}>
                      <span className={`block text-xs mb-1 uppercase font-bold ${selectedJob.allowance === 'Paid' ? 'text-green-500' : 'text-slate-400'}`}>Allowance</span>
                      <span className={`text-sm font-bold ${selectedJob.allowance === 'Paid' ? 'text-green-700' : 'text-slate-800'}`}>{selectedJob.allowance}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Deadline</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.deadline}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedJob.skills.map((skill, i) => (
                      <span key={i} className="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-100">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-3">Job Description</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedJob.description}</p>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95">
                      Apply for this Position
                    </button>
                    <button className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300 active:scale-95">
                      Save Job
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* EXPANDED MAP OVERLAY */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm animate-fade-in-fast">
          
          <button onClick={() => setIsMapExpanded(false)} className="absolute top-6 right-6 z-[9999] bg-white p-3 rounded-full shadow-xl hover:bg-slate-100 transition-colors group border border-slate-200" aria-label="Close Map">
            <svg className="w-6 h-6 text-slate-700 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="absolute inset-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-md border border-slate-100">
               <span className="text-sm font-bold text-slate-700">Job Locations in Negros Occidental</span>
            </div>
            <div className="w-full h-full">
               <Map jobs={jobsData} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }

        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }

        @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}