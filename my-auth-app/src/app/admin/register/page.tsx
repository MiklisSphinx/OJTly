'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);

  return (
    <div className="min-h-screen flex font-sans bg-[#09090b]">

      {/* LEFT SIDE - Visual Context */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden justify-center items-center border-r border-zinc-800">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Animated Blobs - Classes restored */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-700 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-orange-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-800 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

        {/* Floating Dashboard Cards (Static) */}
        <div className="relative z-10 w-full max-w-md space-y-4 p-8">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-600/10 rounded-xl border border-red-500/20 rotate-12 backdrop-blur-sm"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-zinc-800 rounded-2xl border border-zinc-700 -rotate-6 backdrop-blur-sm flex items-center justify-center text-zinc-700">
                <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
            </div>

            {/* Main Content Card */}
            <div className="bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-700 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-3 w-20 bg-red-500/30 rounded-full"></div>
                    <div className="h-3 w-10 bg-zinc-700 rounded-full"></div>
                </div>
                <div className="h-4 w-3/4 bg-zinc-700 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-zinc-800 rounded mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-600">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <div className="h-20 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center text-zinc-600">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-8 z-10 relative">
                <h2 className="text-2xl font-bold text-white tracking-tight">System Administration</h2>
                <p className="text-zinc-500 mt-2 text-sm">Manage users, data, and platform settings.</p>
            </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative overflow-y-auto">
        
        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center text-zinc-500 hover:text-white transition-colors font-medium text-sm group z-20">
            <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
        </Link>

        <div className="w-full max-w-md space-y-6 py-12">
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-xl border border-red-500/20 mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Admin Account</h2>
            <p className="text-zinc-500 mt-1 text-sm">Enter credentials to begin setup.</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center">
            <div className="bg-zinc-900 p-1 rounded-full flex gap-1 border border-zinc-800">
              <Link href="/student/register" className="px-5 py-2 rounded-full text-zinc-500 font-medium text-sm hover:text-white hover:bg-zinc-800 transition-all">User</Link>
              <Link href="/company/register" className="px-5 py-2 rounded-full text-zinc-500 font-medium text-sm hover:text-white hover:bg-zinc-800 transition-all">Company</Link>
              <Link href="/admin/register" className="px-5 py-2 rounded-full bg-zinc-800 text-white shadow-sm font-medium text-sm border border-zinc-700 transition-all">Admin</Link>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-sm shadow-xl shadow-black/20">
            <form className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Username</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </span>
                    <input placeholder='admin_user' type="text" className="w-full pl-12 pr-4 py-3 bg-black/30 border border-zinc-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition placeholder-zinc-600" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder='••••••••'
                            className="w-full pl-4 pr-10 py-3 bg-black/30 border border-zinc-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition placeholder-zinc-600" 
                            required 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors"
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            )}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder='••••••••'
                            className="w-full pl-4 pr-10 py-3 bg-black/30 border border-zinc-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition placeholder-zinc-600" 
                            required 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            )}
                        </button>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Master Admin Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                     <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                  </div>
                  <input 
                    type={showAdminKey ? "text" : "password"} 
                    placeholder='Enter secure key'
                    className="w-full pl-12 pr-10 py-3 bg-black/30 border border-zinc-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition placeholder-zinc-600 font-mono tracking-wider" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAdminKey(!showAdminKey)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors"
                  >
                    {showAdminKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-left">
                 <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 <p className="text-xs text-zinc-400">
                    <span className="font-semibold text-red-400">Security Notice:</span> Creating an admin account requires a valid authorization key. All actions are logged.
                 </p>
              </div>

              <button type="submit" className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-lg shadow-lg shadow-red-900/20 hover:bg-red-500 hover:shadow-red-500/20 transition-all duration-300 mt-2 border border-red-500/50">
                Create Admin Account
              </button>
            </form>
          </div>

          <p className="text-center text-zinc-600 text-sm">
            Already have an account?{' '}
            <Link href="/admin/login" className="font-semibold text-red-500 hover:text-red-400 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Styles for Animation */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}