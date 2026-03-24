'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Job } from '@/lib/recommendation';

// Import Map dynamically to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-200 animate-pulse rounded-xl" />
});

const jobsData: Job[] = [
  {
    id: 1,
    title: 'Web Developer',
    company: 'TechCorp Solutions',
    salary: 15000,
    location: 'Bacolod City',
    role: 'Developer',
    mode: 'On-Site',
    description: 'We are looking for a passionate Web Developer Intern to join our team. You will work on real-world projects using React and Next.js.',
    lat: 10.6840,
    lng: 122.9563
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    company: 'Creative Studio',
    salary: 12000,
    location: 'Silay City',
    role: 'Designer',
    mode: 'Remote',
    description: 'Assist in creating user-centered designs for mobile and web applications. Proficiency in Figma is a plus.',
    lat: 10.8000,
    lng: 122.9667
  },
  {
    id: 3,
    title: 'Data Analyst',
    company: 'Data Insights Inc.',
    salary: 18000,
    location: 'Talisay City',
    role: 'Data Analyst',
    mode: 'Hybrid',
    description: 'Support the data team in analyzing market trends and generating reports. Knowledge of Excel and Python required.',
    lat: 10.7400,
    lng: 122.9500
  },
  {
    id: 4,
    title: 'Marketing Assistant',
    company: 'Negros Marketing',
    salary: 13000,
    location: 'Bacolod City',
    role: 'Designer',
    mode: 'On-Site',
    description: 'Help with marketing campaigns and layouts. Creativity is key!',
    lat: 10.6940,
    lng: 122.9300
  },
  {
    id: 5,
    title: 'IT Support',
    company: 'Silay IT Hub',
    salary: 14000,
    location: 'Silay City',
    role: 'Developer',
    mode: 'On-Site',
    description: 'Provide technical support to employees. Troubleshooting hardware and software issues.',
    lat: 10.8100,
    lng: 122.9800
  }
];

export default function JobBoard() {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<Job | null>(jobsData[0]);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setIsMobileDetailOpen(true);
  };

  const handleBackToList = () => {
    setIsMobileDetailOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-blue-600 text-2xl">◉</span> 
            <span>OJTly</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3">
            
            {/* Find OJT Link */}
            <Link 
              href="/student_main" 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Find OJT
            </Link>

            {/* View Map Button */}
            <button 
              onClick={() => setIsMapExpanded(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              Map
            </button>

            {/* A.I Chatbot Link */}
            <Link 
              href="/studentai" 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              A.I Chatbot
            </Link>
          </nav>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => router.push('/login')}
               className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-700 hover:text-red-600 transition-colors"
             >
               Log out
             </button>

             {/* Mobile Menu Button */}
             <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
             >
               {isMobileMenuOpen ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               ) : (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
               )}
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-30">
            <div className="p-4 flex flex-col gap-2">
              <Link href="/student_main" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-lg">
                 <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                 <span className="font-medium">Find OJT</span>
              </Link>
              <button 
                onClick={() => { setIsMapExpanded(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                <span className="font-medium">Open Map</span>
              </button>
              <Link href="/student_ai" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                <span className="font-medium">A.I Chatbot</span>
              </Link>
              <div className="border-t border-slate-100 my-2"></div>
              <button 
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span className="font-medium">Log out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <main className="max-w-[1600px] mx-auto p-4 lg:p-6 h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full relative">
          
          {/* LEFT COLUMN: Map & List */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* Map Container */}
            <div 
              onClick={() => setIsMapExpanded(true)}
              className="h-48 lg:h-1/3 w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative z-0 cursor-pointer group"
            >
               {jobsData && <Map jobs={jobsData} />}
               
               {/* Hover Overlay */}
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center z-10">
                 <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                   <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                   <span className="text-xs font-bold text-slate-700">Expand Map</span>
                 </div>
               </div>
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                {jobsData.length} Positions Available
              </h3>
              
              {jobsData.map((job) => (
                <div 
                  key={job.id} 
                  onClick={() => handleJobClick(job)}
                  className={`bg-white p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden
                    ${selectedJob?.id === job.id 
                      ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                      : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}
                >
                  {/* Active Indicator */}
                  {selectedJob?.id === job.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                  )}

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-800">{job.title}</h4>
                      <p className="text-sm text-slate-500">{job.company}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      ₱{job.salary.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 pl-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                       {job.location}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      job.mode === 'Remote' ? 'bg-green-50 text-green-700' : 
                      job.mode === 'Hybrid' ? 'bg-orange-50 text-orange-700' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {job.mode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: Details Panel */}
          <div className={`lg:col-span-7 ${isMobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
            
            {/* Mobile Back Button */}
            <button 
              onClick={handleBackToList} 
              className="lg:hidden flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to List
            </button>

            {selectedJob && (
              /* Added key prop to trigger animation on job change, removed translate-y hover to fix jitter */
              <div 
                key={selectedJob.id} 
                className="bg-white rounded-3xl shadow-xl border border-slate-100 h-full lg:h-auto flex flex-col overflow-hidden animate-fade-in"
              >
                
                {/* Header Section */}
                <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
                      {selectedJob.company.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedJob.title}</h2>
                      <p className="text-slate-600 mb-3">{selectedJob.company}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                          {selectedJob.role}
                        </span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
                          {selectedJob.mode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Allowance</span>
                    <span className="text-sm font-bold text-slate-800">₱{selectedJob.salary.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Location</span>
                    <span className="text-sm font-bold text-slate-800">{selectedJob.location}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Duration</span>
                    <span className="text-sm font-bold text-slate-800">3 Months</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="block text-xs text-slate-400 mb-1 uppercase font-bold">Level</span>
                    <span className="text-sm font-bold text-slate-800">College</span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Job Description</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {selectedJob.description}
                  </p>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-3">What We Offer</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Internship allowance
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Flexible working hours
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Certificate of Completion
                    </li>
                  </ul>
                </div>

                {/* Action Buttons - Removed hover translation to prevent weird loop */}
                <div className="p-6 sm:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    Apply for this Position
                  </button>
                  <button className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300">
                    Save Job
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EXPANDED MAP OVERLAY */}
          {isMapExpanded && (
            <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4">
              
              {/* CLOSE BUTTON */}
              <button 
                onClick={() => setIsMapExpanded(false)}
                className="absolute top-6 right-6 z-[9999] bg-white p-3 rounded-full shadow-xl hover:bg-slate-100 transition-colors group border border-slate-200"
                aria-label="Close Map"
              >
                <svg className="w-8 h-8 text-slate-700 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>

              <div className="relative w-full h-full max-w-[1600px] mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                
                {/* Map Header Info */}
                <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-md border border-slate-100">
                   <span className="text-sm font-bold text-slate-700">Job Locations in Negros Occidental</span>
                </div>

                {/* The Actual Map */}
                <Map jobs={jobsData} />
              </div>
            </div>
          )}

        </div>
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}