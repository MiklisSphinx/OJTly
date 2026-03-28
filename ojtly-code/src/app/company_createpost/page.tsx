'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreatePostPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    companyName: 'ABC Company', // Auto-filled
    description: '',
    skills: '',
    location: '',
    vacancies: '',
    workType: 'On-site',
    duration: '300',
    preferredCourse: 'BSIT',
    allowance: 'Paid' // New field with default value
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Publishing Post:", formData);
    alert("OJT Post Published Successfully!");
    router.push('/company_main'); // Redirect back to dashboard
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* --- Mobile Overlay --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar --- */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </Link>
          
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            My OJT Posts
          </Link>

          {/* Active Link: Create Post */}
          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Create Post
          </Link>

          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Applicants
          </Link>

          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Documents
          </Link>

          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
           <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 rounded-lg font-medium transition-colors w-full text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="lg:ml-64 min-h-screen">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
            
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800">Create Post</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Form Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* Header Section */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">New OJT Opportunity</h2>
              <p className="text-sm text-slate-500 mt-1">Fill in the details below to post a new internship opportunity.</p>
            </div>

            {/* Body Section */}
            <div className="p-6 space-y-6">
              
              {/* OJT Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">OJT Title</label>
                <input 
                  type="text" 
                  name="title"
                  placeholder="e.g. Web Developer Intern"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Company Name (Auto-filled) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Company Name</label>
                  <span className="text-xs text-slate-400 italic">Auto-filled from account</span>
                </div>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500">
                  {formData.companyName}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  name="description"
                  rows={5}
                  placeholder="Describe the internship role, responsibilities, and what the intern will learn..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Grid Layout for smaller fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Required Skills</label>
                  <input 
                    type="text" 
                    name="skills"
                    placeholder="e.g. HTML, CSS, JavaScript"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    value={formData.skills}
                    onChange={handleChange}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                  <input 
                    type="text" 
                    name="location"
                    placeholder="e.g. Talisay City"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                {/* Number of Vacancies */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Vacancies</label>
                  <input 
                    type="number" 
                    name="vacancies"
                    placeholder="e.g. 3"
                    min="1"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    value={formData.vacancies}
                    onChange={handleChange}
                  />
                </div>

                {/* Work Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Work Type</label>
                  <select 
                    name="workType"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none"
                    value={formData.workType}
                    onChange={handleChange}
                  >
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (Hours)</label>
                  <select 
                    name="duration"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none"
                    value={formData.duration}
                    onChange={handleChange}
                  >
                    <option value="200">200 Hours</option>
                    <option value="300">300 Hours</option>
                    <option value="400">400 Hours</option>
                  </select>
                </div>

                {/* Preferred Course */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Course</label>
                  <select 
                    name="preferredCourse"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none"
                    value={formData.preferredCourse}
                    onChange={handleChange}
                  >
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* --- NEW: Allowance Field (Green/Red) --- */}
                <div className="md:col-span-2">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Allowance</label>
                   <div className="flex gap-4">
                      {/* Paid Option (Green) */}
                      <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm
                        ${formData.allowance === 'Paid' 
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <input 
                          type="radio" 
                          name="allowance" 
                          value="Paid" 
                          checked={formData.allowance === 'Paid'} 
                          onChange={handleChange} 
                          className="sr-only" 
                        />
                        {formData.allowance === 'Paid' ? (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ) : (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        )}
                        <span>Paid / With Allowance</span>
                      </label>

                      {/* Unpaid Option (Red) */}
                      <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm
                        ${formData.allowance === 'Unpaid' 
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <input 
                          type="radio" 
                          name="allowance" 
                          value="Unpaid" 
                          checked={formData.allowance === 'Unpaid'} 
                          onChange={handleChange} 
                          className="sr-only" 
                        />
                        {formData.allowance === 'Unpaid' ? (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ) : (
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        )}
                        <span>Unpaid</span>
                      </label>
                   </div>
                </div>

              </div>
            </div>

            {/* Footer Section */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-xl shadow-md hover:bg-teal-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Publish OJT Post
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}