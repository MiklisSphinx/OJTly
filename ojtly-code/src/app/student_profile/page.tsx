'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 1. Define the type for User Data explicitly
type UserProfile = {
  name: string;
  course: string;
  location: string;
  school: string;
  yearLevel: string;
  avatar: string | null; // Allow both string (image URL) and null
  resumeName: string;
};

export default function ProfilePage() {
  const router = useRouter();

  // 2. Apply the type to the useState hook
  const [user, setUser] = useState<UserProfile>({
    name: 'Mik Antonares',
    course: 'BS Computer Science',
    location: 'Talisay City, Negros Occidental',
    school: 'Silay Institute',
    yearLevel: '4th Year',
    avatar: null,
    resumeName: 'My_Resume.pdf'
  });

  // State for OJT Progress
  const [progress, setProgress] = useState({
    completed: 120, 
    total: 1500, 
    company: 'WebDev Inc.',
    status: 'Ongoing'
  });

  // State for Calendar
  const [attendedDays, setAttendedDays] = useState<number[]>([1, 2, 5, 8, 9, 10]); 
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // State for Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false); 
  
  // 3. Apply the type to the temporary state as well
  const [tempUser, setTempUser] = useState<UserProfile>(user); 
  const [tempCompany, setTempCompany] = useState(progress.company);
  const [tempTotal, setTempTotal] = useState(progress.total); 

  const progressPercent = (progress.completed / progress.total) * 100;

  // Calendar Logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDayClick = (day: number) => {
    if (attendedDays.includes(day)) {
      setAttendedDays(attendedDays.filter(d => d !== day));
    } else {
      setAttendedDays([...attendedDays, day]);
    }
  };

  // Fixed function: Now works because UserProfile allows 'string | null'
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempUser((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setUser(tempUser);
    setIsProfileModalOpen(false);
  };

  const handleSaveProgress = () => {
    let finalTotal = tempTotal;
    if (finalTotal > 1500) finalTotal = 1500;
    if (finalTotal < 1) finalTotal = 1;

    setProgress({...progress, company: tempCompany, total: finalTotal});
    setIsProgressModalOpen(false);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUser({...user, resumeName: e.target.files[0].name});
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full">
               <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 className="text-lg font-bold text-slate-800">My Profile</h1>
          </div>
          
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-blue-600 text-2xl">◉</span> 
            <span className="hidden sm:block">OJTly</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-8">

        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/50 shadow-md overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-blue-100 text-sm">{user.course}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {user.location}
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button 
              onClick={() => { setTempUser(user); setIsProfileModalOpen(true); }}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
          </div>
        </div>

        {/* OJT Progress Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-800">OJT Progress</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${progress.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {progress.status}
              </span>
              <button 
                onClick={() => { 
                  setTempCompany(progress.company); 
                  setTempTotal(progress.total);
                  setIsProgressModalOpen(true); 
                }}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-slate-900">{progress.completed}<span className="text-lg text-slate-400">/{progress.total}</span></span>
            <span className="text-sm text-slate-500">Hours Completed</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            ></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl flex-1">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <span className="font-medium">Company:</span>
              <span className="truncate">{progress.company}</span>
            </div>

            <button 
              onClick={() => setIsCalendarModalOpen(true)}
              className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 p-3 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              View Calendar
            </button>
          </div>
        </div>

        {/* Student Info & Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Student Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Student Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm text-slate-500">School</span>
                <span className="text-sm font-semibold text-slate-700">{user.school}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-sm text-slate-500">Course</span>
                <span className="text-sm font-semibold text-slate-700">{user.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Year Level</span>
                <span className="text-sm font-semibold text-slate-700">{user.yearLevel}</span>
              </div>
            </div>
          </div>

          {/* Documents & Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Documents & Resume</h3>
            
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors mb-3">
                  <input type="file" id="resumeUpload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                  <label htmlFor="resumeUpload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      <span className="text-sm font-medium">Upload Resume</span>
                      <span className="text-xs text-slate-400">{user.resumeName || 'No file chosen'}</span>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mb-4">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Companies can view your resume once applied.
                </p>
              </div>

              <button 
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-red-500 hover:bg-red-50 text-sm font-medium py-3 rounded-lg transition-colors mt-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Log out
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Edit Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-3xl font-bold text-slate-400 overflow-hidden">
                    {tempUser.avatar ? (
                      <img src={tempUser.avatar} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      tempUser.name.charAt(0)
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors border-2 border-white shadow-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">Click icon to change photo</p>
              </div>

              {/* Text Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tempUser.name}
                  onChange={(e) => setTempUser({...tempUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Course</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tempUser.course}
                  onChange={(e) => setTempUser({...tempUser, course: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tempUser.location}
                  onChange={(e) => setTempUser({...tempUser, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">School</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={tempUser.school}
                    onChange={(e) => setTempUser({...tempUser, school: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Year Level</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={tempUser.yearLevel}
                    onChange={(e) => setTempUser({...tempUser, yearLevel: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSaveProfile} className="flex-1 py-2.5 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROGRESS MODAL */}
      {isProgressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Update OJT Details</h3>
              <button onClick={() => setIsProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Required Hours</label>
                <input 
                  type="number" 
                  min="1"
                  max="1500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tempTotal}
                  onChange={(e) => setTempTotal(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-400 mt-1">You can set hours from 1 to 1500 (Maximum).</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Company</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={tempCompany}
                  onChange={(e) => setTempCompany(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsProgressModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSaveProgress} className="flex-1 py-2.5 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Attendance Calendar</h3>
              <button onClick={() => setIsCalendarModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m-1)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="font-bold text-slate-700">{monthNames[currentMonth]} {currentYear}</span>
                <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m+1)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-xs font-bold text-slate-400 pb-2">{d}</div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-full aspect-square"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isMarked = attendedDays.includes(day);
                  const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                  
                  return (
                    <button 
                      key={day} 
                      onClick={() => handleDayClick(day)}
                      className={`relative w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                        ${isMarked ? 'bg-green-100 text-green-700 ring-1 ring-green-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                      `}
                    >
                      {day}
                      {isMarked && (
                        <span className="absolute top-1 right-1 text-green-500 font-bold text-[8px]">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">Click a day to toggle attendance</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}