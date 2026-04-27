  'use client';
  import { createClient } from '@/utils/supabase/client';
  import { useState } from 'react';
  import Link from 'next/link';

  export default function ForgotPasswordPage() {
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/student/resetpassword`,
      });
      
      if (error) alert(error.message);
      else setMessage("Check your email for the reset link.");
      
      setLoading(false);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
        
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-slow"></div>
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          ></div>
        </div>

        {/* Main Container */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <Link href="/student/login" className="group mb-10">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-sm">OJ</span>
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">OJTly</span>
            </div>
          </Link>

          {/* Card */}
          <div className="w-full max-w-md">
            <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">
              
              {message ? (
                /* Success State */
                <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Check your inbox</h2>
                  <p className="text-purple-200/70 text-sm leading-relaxed">{message}</p>
                  <p className="text-purple-300/50 text-xs mt-3">Don't forget to check spam folder</p>
                </div>
              ) : (
                /* Form State */
                <>
                  <div className="mb-8 text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25 -rotate-6 hover:rotate-0 transition-transform duration-500">
                      <svg className="w-7 h-7 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                      </svg>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                      Forgot password?
                    </h1>
                    <p className="text-purple-200/60 text-sm leading-relaxed">
                      No worries! Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleReset} className="space-y-5">
                    
                    {/* Email Input */}
                    <div className="relative group">
                      <label className="block text-sm font-medium text-purple-200/80 mb-2 ml-1">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="name@university.edu"
                        className="w-full px-4 py-3.5 bg-white/[0.06] border border-white/[0.15] rounded-xl text-white placeholder:text-purple-300/40 focus:border-blue-400/50 focus:bg-white/[0.09] focus:ring-2 focus:ring-blue-400/20 outline-none transition-all duration-200 disabled:opacity-50"
                      />
                      
                      {/* Focus Glow */}
                      <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-blue-500/5 group-focus-within:to-cyan-500/10 blur-xl transition-all duration-300"></div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            Send reset link
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                            </svg>
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
                <Link 
                  href="/student/login" 
                  className="inline-flex items-center gap-2 text-sm text-purple-300/70 hover:text-white transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                  <span>Back to login</span>
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-purple-300/30 mt-8 tracking-wide">
              🔒 Secured by OJTly • Enterprise-grade protection
            </p>
          </div>
        </div>

        {/* Animations */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
          }
          .animate-float { animation: float 8s ease-in-out infinite; }
          .animate-float-delayed { animation: float 8s ease-in-out infinite; animation-delay: 2s; }
          .animate-float-slow { animation: float 10s ease-in-out infinite; animation-delay: 4s; }
        `}</style>
      </div>
    );
  }