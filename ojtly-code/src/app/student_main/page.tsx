'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Define the Job Interface
interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  posted: string;
  tags: string[];
  role: string;
  province: string;
  description: string;
  details: {
    level: string;
    mode: string;
    duration: string;
    hours: string;
    allowance: string;
  };
}

// Apply the interface to the data
const jobsData: Job[] = [
  {
    id: 1,
    title: 'Web Developer',
    company: 'TechCorp Solutions',
    location: 'Mandaluyong, Philippines',
    salary: '₱15,000 - ₱20,000',
    posted: '2 days ago',
    tags: ['On-site', 'Full-time'],
    role: 'Developer',
    province: 'Metro Manila',
    description: 'We are looking for a passionate Web Developer Intern. You will work on real-world projects using React and Next.js.',
    details: {
      level: 'College',
      mode: 'On-Site',
      duration: '3 Months',
      hours: '20-30 hrs/week',
      allowance: '₱15,000',
    }
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    company: 'Creative Studio',
    location: 'Libertad, Bacolod City',
    salary: '₱12,000',
    posted: '5 days ago',
    tags: ['Remote', 'Part-time'],
    role: 'Designer',
    province: 'Negros Occidental',
    description: 'Assist in creating user-centered designs for mobile and web applications.',
    details: {
      level: 'College',
      mode: 'Remote',
      duration: '2 Months',
      hours: '15-20 hrs/week',
      allowance: '₱12,000',
    }
  },
  {
    id: 3,
    title: 'Data Analyst Assistant',
    company: 'Data Insights Inc.',
    location: 'Cebu City',
    salary: '₱18,000',
    posted: '1 week ago',
    tags: ['Hybrid', 'Full-time'],
    role: 'Data Analyst',
    province: 'Cebu',
    description: 'Support the data team in analyzing market trends and generating reports.',
    details: {
      level: 'College',
      mode: 'Hybrid',
      duration: '6 Months',
      hours: '40 hrs/week',
      allowance: '₱18,000',
    }
  }
];

export default function JobBoard() {
  const router = useRouter();
  
  const [selectedJob, setSelectedJob] = useState<Job | null>(jobsData[0]);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedProvince, setSelectedProvince] = useState('All Provinces');

  const filteredJobs = jobsData.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All Roles' || job.role === selectedRole;
    const matchesProvince = selectedProvince === 'All Provinces' || job.province === selectedProvince;
    
    return matchesSearch && matchesRole && matchesProvince;
  });

  const handleJobClick = (job: Job) => {
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
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-blue-600 text-2xl">◉</span> 
            <span>OJTly</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            <Link href="/student_main" className="px-4 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-full shadow-sm transition-all duration-200">Find OJT</Link>
            <Link href="/map" className="px-4 py-1.5 text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">Map</Link>
            <Link href="/studentai" className="px-4 py-1.5 text-sm font-medium text-slate-600 rounded-full hover:bg-white/50 transition-all duration-200">A.I Chat Bot</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
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
              <Link href="/jobs" className="block px-4 py-2 text-base font-medium text-blue-600 bg-blue-50 rounded-lg">Find OJT</Link>
              <Link href="/map" className="block px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Map</Link>
              <Link href="/studentai" className="block px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">A.I Chat Bot</Link>
              <hr className="border-slate-100"/>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 text-base font-medium">Log out</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Search */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-8 pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Your OJT Journey Begins Here</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">Find the Perfect Internship Opportunities</p>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 0 4 4 0 100-8 0 4 4 0 00-8 0zm3.707 9.293a1 1 0 001.414 1.414l3.293 3.293a1 1 0 001.414-1.414L7.414 9.293zM15 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input 
                  type="text"
                  placeholder="Job title or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="block w-full pl-3 pr-8 py-2.5 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg bg-white transition-all"
                >
                  <option>All Roles</option>
                  <option>Developer</option>
                  <option>Designer</option>
                  <option>Data Analyst</option>
                </select>
                
                <select 
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="block w-full pl-3 pr-8 py-2.5 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm rounded-lg bg-white transition-all"
                >
                  <option>All Provinces</option>
                  <option>Metro Manila</option>
                  <option>Negros Occidental</option>
                  <option>Cebu</option>
                </select>
                
                <button 
                  type="button"
                  className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all active:scale-95"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-12 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Job List */}
          <aside className={`lg:col-span-5 ${isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-slate-100 rounded-2xl p-4 sticky top-24">
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-sm font-bold text-slate-500 uppercase">
                  <span className="text-blue-600">{filteredJobs.length}</span> Positions
                </h3>
              </div>

              <div className="space-y-3 lg:h-[calc(100vh-180px)] overflow-y-auto pr-2 py-1 scrollbar-thin">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <div 
                      key={job.id} 
                      onClick={() => handleJobClick(job)}
                      // FIX: Removed 'transform', 'hover:-translate-y-1', 'scale', and 'ring' to stop floating/circling
                      className={`bg-white p-5 rounded-xl border cursor-pointer transition-all duration-200 ease-in-out
                        ${selectedJob?.id === job.id 
                          ? 'border-blue-500 border-2 shadow-md' 
                          : 'border-slate-100 hover:border-slate-300 hover:shadow-md'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden">LOGO</div>
                        <div className="text-right">
                          <span className="block text-xs text-slate-400">{job.posted}</span>
                          <span className="block text-xs text-blue-500">{job.location}</span>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{job.title}</h4>
                      <p className="text-sm text-slate-500 mb-4">{job.company}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-5">
                        {job.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-medium rounded-lg border border-slate-100">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <span className="text-sm font-bold text-slate-900">{job.salary}</span>
                        <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                          View 
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-xl">
                    <p>No jobs found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column - Job Details */}
          <section className={`lg:col-span-7 ${isMobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
            <button onClick={handleBackToList} className="lg:hidden flex items-center gap-1 text-blue-600 font-semibold mb-4 text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to List
            </button>

            {selectedJob && (
              <div key={selectedJob.id} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden sticky top-24 animate-fade-in lg:h-[calc(100vh-140px)] flex flex-col">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-start sm:items-center gap-4 mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-xl font-bold text-slate-400 flex-shrink-0">LOGO</div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                      <p className="text-slate-500">{selectedJob.company}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.tags.map((tag, i) => (
                      <span key={i} className="px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto scrollbar-thin">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl transition-all hover:bg-slate-100">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Level</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.details.level}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl transition-all hover:bg-slate-100">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Work Mode</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.details.mode}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl transition-all hover:bg-slate-100">
                      <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Duration</span>
                      <span className="text-sm font-bold text-slate-800">{selectedJob.details.duration}</span>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl transition-all hover:bg-green-100">
                      <span className="block text-xs text-green-500 mb-1 uppercase font-bold">Allowance</span>
                      <span className="text-sm font-bold text-green-700">{selectedJob.details.allowance}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-4">Job Post Description</h3>
                  <p className="text-slate-600 text-sm mb-6">{selectedJob.description}</p>
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
      `}</style>
    </div>
  );
}