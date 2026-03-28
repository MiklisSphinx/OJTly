'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // 1. Import useRouter

export default function AdminLogin() {
  const router = useRouter(); // 2. Initialize the router
  const [showPassword, setShowPassword] = useState(false);
  const [showSecurityKey, setShowSecurityKey] = useState(false);

  // 3. State for inputs (initialized with empty strings)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityKey, setSecurityKey] = useState('');

  // 4. Create the submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    
    // Optional: You can add validation here
    if (!username || !password || !securityKey) {
      alert("Please fill in all fields.");
      return;
    }

    console.log("Admin Login Attempt:", { username, password, securityKey });
    
    // Redirect to Admin Dashboard
    router.push('/admin_main'); 
  };

  return (
    <div className="min-h-screen flex font-sans bg-gray-900">

      {/* LEFT SIDE - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-800 to-gray-900 relative overflow-hidden justify-center items-center">
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-gray-700 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
           <div className="w-20 h-20 mx-auto mb-6 border-2 border-red-500 rounded-2xl flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">Admin Portal</h1>
          <p className="text-lg text-gray-400">Restricted Access Area</p>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-900 p-6 relative">

        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition-colors font-medium text-sm group z-20">
            <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
        </Link>

        {/* Mobile Logo */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 lg:hidden">
           <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           </div>
        </div>

        <div className="w-full max-w-md space-y-8 mt-12 lg:mt-0">

          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Secure Login</h2>
            <p className="text-gray-400 mt-2">Administrator access only.</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center">
            <div className="bg-gray-800 p-1 rounded-full flex gap-1 border border-gray-700">
              <Link href="/student/login" className="px-6 py-2 rounded-full text-gray-500 font-medium text-sm hover:text-white transition-all">User</Link>
              <Link href="/company/login" className="px-6 py-2 rounded-full text-gray-500 font-medium text-sm hover:text-white transition-all">Company</Link>
              <Link href="/admin/login" className="px-6 py-2 rounded-full bg-red-600/10 text-red-500 border border-red-500/20 font-medium text-sm transition-all">Admin</Link>
            </div>
          </div>

          <div className="bg-gray-800/50 p-8 rounded-3xl border border-gray-700 backdrop-blur-sm shadow-2xl">
            {/* 5. Attach handleSubmit to form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </span>
                    <input 
                      placeholder='Username' 
                      type="text" 
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition placeholder-gray-500" 
                      required 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </span>
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder='Password'
                        className="w-full pl-12 pr-12 py-3.5 bg-gray-900 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition placeholder-gray-500" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        )}
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Security Key</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                  </span>
                  <input 
                    type={showSecurityKey ? "text" : "password"} 
                    placeholder='Security Key'
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-900 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition placeholder-gray-500" 
                    required 
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowSecurityKey(!showSecurityKey)} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    {showSecurityKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5 transition-all duration-300">
                Access Admin
              </button>
            </form>
          </div>

          <p className="text-center text-gray-500 text-sm pb-8">
            Need an account?{' '}
            <Link href="/admin_main" className="font-semibold text-red-500 hover:text-red-400 hover:underline">
              Request Access
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}