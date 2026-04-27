'use client';
export const dynamic = "force-dynamic";
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const supabase = createClient();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ AUTH SESSION LISTENER - Catches the recovery link!
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'success'>('loading');

  useEffect(() => {
    // 1. This "catches" the session from the email link (PASSWORD_RECOVERY event)
   const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth event:', event); // Debug log
      
      if (event === "PASSWORD_RECOVERY" || session) {
        setStatus('ready');
      } else if (event === 'SIGNED_OUT') {
        setStatus('error');
      }
    });

    // Also check current session on mount (in case user is already authenticated)
    const checkSession = async () => {
      try {
        // Check URL hash for access_token or recovery token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          // We have a token in URL - this is from the reset link!
          console.log('Found recovery token in URL');
          setStatus('ready');
          return;
        }

        // Fallback: Check existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          setStatus('ready');
        } else {
          // If no session and no error after 2 seconds, show error
          setTimeout(() => {
            if (status === 'loading') setStatus('error');
          }, 2000);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setStatus('error');
      }
    };

    checkSession();

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Password strength indicator
  const getStrength = (pwd: string): { color: string; width: string; label: string } => {
    if (!pwd) return { color: 'bg-gray-500', width: '0%', label: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { color: 'bg-red-500', width: '20%', label: 'Weak' };
    if (score <= 2) return { color: 'bg-white', width: '40%', label: 'Fair' };
    if (score <= 3) return { color: 'bg-white', width: '60%', label: 'Good' };
    if (score <= 4) return { color: 'bg-green-500', width: '80%', label: 'Strong' };
    return { color: 'bg-emerald-500', width: '100%', label: 'Excellent' };
  };

  const strength = getStrength(password);

  // Handle Update Password
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // Success! → Redirect to login
      setStatus('success');
      
      setTimeout(() => {
        window.location.href = '/student/login';
      }, 2000);

    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOADING STATE - Verifying link...
  // ==========================================
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob"></div>
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob-delayed"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
              <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h6a2 2 0 002 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2zm0 0V5a2 2 0 012-2h6a2 2 0 012 2v2z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Verifying your link...</h2>
          <p className="text-slate-400 text-sm">Please wait while we validate your recovery session</p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-400"></div>
          </div>

          <p className="text-xs text-slate-600 mt-8">
            Checking authentication state • Supabase Auth
          </p>
        </div>

        <style jsx global>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob { animation: blob 8s infinite; }
          .animate-blob-delayed { animation: blob 8s infinite; animation-delay: 2s; }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-12px); }
          }
          .animation-delay-200 { animation-delay: 0.2s; }
          .animation-delay-400 { animation-delay: 0.4s; }
        `}</style>
      </div>
    );
  }

  // ==========================================
  // ERROR STATE - Invalid/expired link
  // ==========================================
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 relative overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-md w-full">
          <div className="bg-red-500/10 backdrop-blur-2xl border border-red-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/30 text-center">
            
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9"/>
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Invalid or Expired Link
            </h1>
            
            <p className="text-red-300/70 text-sm leading-relaxed mb-8">
              The password reset link you used is no longer valid. It may have expired or already been used.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link 
                href="/student/forgotpassword"
                className="block w-full py-3.5 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all"
              >
                Request New Reset Link
              </Link>
              
              <Link 
                href="/student/login"
                className="block w-full py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition-all border border-white/10"
              >
                Back to Login
              </Link>
            </div>

            <p className="text-xs text-slate-500 mt-6">
              ⚠️ Security: Reset links expire after 1 hour for your protection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUCCESS STATE - Password changed!
  // ==========================================
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 relative overflow-hidden flex items-center justify-center px-4">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-md w-full">
          <div className="bg-emerald-500/10 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/30 text-center">
            
            {/* Success Icon */}
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 animate-scale-in">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Password Updated! 🎉
            </h1>
            
            <p className="text-emerald-300/70 text-sm leading-relaxed mb-4">
              Your password has been successfully changed.
            </p>

            <p className="text-sm text-slate-300 mb-8">
              Redirecting to login page...
            </p>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-progress-bar"></div>
            </div>

            <Link 
              href="/student/login"
              className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:text-emerald-300 font-medium transition-colors group"
            >
              Go to login now
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // READY STATE - Main form (link verified!)
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-blob-slow"></div>
      </div>

      {/* Main Content */}
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
          <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/30">
            
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/30 rotate-6 hover:rotate-0 transition-transform duration-500">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Create new password
              </h1>
              
              {/* Verified badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-medium mt-2">
                <svg className="w-3.5 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Recovery link verified ✓
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdate} className="space-y-5">
              
              {/* Password Field with 👁️ Eye Icon */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  New Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    placeholder="•••••••••"
                    className="w-full px-4 py-3.5 pr-12 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all duration-200 disabled:opacity-50"
                  />
                  
                  {/* 👁️ EYE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Strength Meter */}
                {password && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Strength</span>
                      <span className={`font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strength.color} transition-all duration-500 ease-out rounded-full`}
                        style={{ width: strength.width }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field with 👁️ Eye Icon */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 ml-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    placeholder="•••••••••"
                    className="w-full px-4 py-3.5 pr-12 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all duration-200 disabled:opacity-50"
                  />
                  
                  {/* 👁️ EYE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Match Indicator */}
                {confirmPassword && (
                  <div className={`flex items-center gap-1.5 text-xs animate-in fade-in slide-in-from-left-2 duration-300 ${
                    confirmPassword === password ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {confirmPassword === password ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        <span>Passwords don't match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Password
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-6H6"/>
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
              <Link 
                href="/student/login" 
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                <span>Back to login</span>
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-8 tracking-wide">
            🔒 Secure connection • OJTly Authentication
          </p>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-blob-delayed { animation: blob 8s cubic-bezier(0.4, 0, 0.2, 1) infinite; animation-delay: 2s; }
        .animate-blob-slow { animation: blob 10s cubic-bezier(0.4, 0, 0.2, 1) infinite; animation-delay: 4s; }
        
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-bar { animation: progressBar 2s linear forwards; }
        
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
} 