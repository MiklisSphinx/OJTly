'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // ✅ 1. Add this import at the top

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null); // ✅ Add error state
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // Clear previous errors
    
    // ✅ 2. REAL Supabase call - replaces the setTimeout
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/company/reset-password`,
    });

    if (resetError) {
      // Handle specific errors gracefully
      setError(resetError.message || 'Failed to send reset email');
      setIsLoading(false);
    } else {
      // Success!
      setIsLoading(false);
      setIsSent(true);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 to-emerald-700 relative overflow-hidden justify-center items-center">
        <div className="absolute top-10 left-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-lime-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">Reset Password</h1>
          <p className="text-lg text-teal-100">No worries, we'll send you reset instructions.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto relative">
        
        {/* Back Button */}
        <Link href="/student/login" className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-teal-600 transition-colors font-medium text-sm group z-20">
          <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Login
        </Link>

        <div className="w-full max-w-lg space-y-8 my-8">
          
          {!isSent ? (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Forgot Password?</h2>
                <p className="text-gray-500 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-gray-200/40 border border-gray-100">
                
                {/* ✅ Error Message Display */}
                {error && (
                  <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800">Error</p>
                      <p className="text-xs text-red-700 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null); // Clear error when user types
                        }}
                        placeholder='Enter your email'
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-teal-500 focus:border-teal-500'} rounded-xl outline-none transition`} 
                        required 
                        disabled={isLoading}
                      />
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg                        >
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Sign In Link */}
              <p className="text-center text-gray-600 text-sm">
                Remember your password?{' '}
                <Link href="/company/login" className="font-semibold text-teal-600 hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* Success State */
            <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-gray-200/40 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h3>
              <p className="text-gray-500 mb-6">We've sent a password reset link to<br/><strong className="text-gray-800">{email}</strong></p>
              
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 Didn't receive it?</span><br/>
                  Check your spam folder or{' '}
                  <button onClick={() => setIsSent(false)} className="font-bold underline hover:text-blue-600">try again</button>
                </p>
              </div>

              <Link 
                href="/company/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}