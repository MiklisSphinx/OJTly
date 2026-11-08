'use client';

import { Suspense } from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-gray-400 animate-pulse text-lg">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // 'checking' → 'ready' (form shown) | 'error' (invalid link)
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  // Ref to prevent the stale-closure bug where the timeout would overwrite
  // a successful 'ready' state with 'error'. We track resolution once.
  const resolvedRef = useRef(false);

  // ============================================================
  // AUTH SESSION DETECTION — robust version using onAuthStateChange
  // + URL hash check + getSession fallback.
  //
  // The original bug: it only called getSession() once on mount,
  // which races with Supabase's URL-hash token exchange. If
  // getSession ran before the token was exchanged, it returned
  // null → "Invalid reset link" error even though the link was fine.
  //
  // Fix: also listen for the PASSWORD_RECOVERY event, which fires
  // AFTER the token exchange completes.
  // ============================================================
  useEffect(() => {
    let mounted = true;
    resolvedRef.current = false;

    const markReady = () => {
      if (mounted && !resolvedRef.current) {
        resolvedRef.current = true;
        setSessionStatus('ready');
      }
    };
    const markError = () => {
      if (mounted && !resolvedRef.current) {
        resolvedRef.current = true;
        setSessionStatus('error');
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    // 1. Listen for the PASSWORD_RECOVERY event — this is the
    //    RELIABLE signal that the email link was clicked and the
    //    recovery token was successfully exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'PASSWORD_RECOVERY' && session) {
        markReady();
      } else if (event === 'SIGNED_OUT' && !session) {
        // Only mark error if we never resolved
        if (!resolvedRef.current) markError();
      }
    });

    // 2. Check URL hash for recovery token (covers the case where
    //    onAuthStateChange already fired before this component mounted)
    const checkSession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('type');

        if (accessToken || tokenType === 'recovery') {
          console.log('Found recovery token in URL hash');
          // Give Supabase a moment to exchange the token, then verify
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              markReady();
            } else {
              markError();
            }
          }, 300);
          return;
        }

        // No recovery token in URL — check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Existing session — allow password update
          markReady();
        } else {
          markError();
        }
      } catch (err) {
        console.error('Session check error:', err);
        markError();
      }
    };

    checkSession();

    // 3. Fallback timeout — if after 5s we still haven't resolved, show error.
    //    Uses functional state update so it doesn't overwrite a successful 'ready'.
    const timeoutId = setTimeout(() => {
      setSessionStatus((prev) => prev === 'checking' ? 'error' : prev);
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setError('Invalid or expired reset link. Please request a new one.');
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    return {
      score,
      label: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][score],
      color: ['red', 'orange', 'yellow', 'lime', 'green', 'emerald'][score],
      width: `${(score / 5) * 100}%`
    };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);

      setTimeout(() => {
        router.push('/company/login?message=Password+updated+successfully');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CHECKING STATE — Verifying link
  // ==========================================
  if (sessionStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Verifying your link...</h2>
          <p className="text-slate-500 text-sm">Please wait while we validate your recovery session</p>
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR STATE — Invalid/expired link
  // ==========================================
  if (sessionStatus === 'error' && !isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Invalid or Expired Link</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            The password reset link you used is no longer valid. It may have expired or already been used.
          </p>
          <div className="space-y-3">
            <Link
              href="/company/forgotpassword"
              className="block w-full py-3.5 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              Request New Reset Link
            </Link>
            <Link
              href="/company/login"
              className="block w-full py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all"
            >
              Back to Login
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            ⚠️ Security: Reset links expire after 1 hour for your protection
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN RENDER — form or success
  // ==========================================
  return (
    <div className="min-h-screen flex font-sans">

      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden justify-center items-center">

        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">Create New<br />Password</h1>
          <p className="text-lg text-purple-100 max-w-md mx-auto leading-relaxed">
            Your new password should be unique and secure. Make sure it's something you'll remember!
          </p>

          <div className="mt-10 space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span>At least 8 characters long</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span>Mix of letters & numbers</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span>Include special character (!@#$)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto relative">

        <Link href="/company/login" className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm group z-20">
          <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Login
        </Link>

        <div className="w-full max-w-lg space-y-8 my-8">

          {!isSuccess ? (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-gray-500 mt-2">Enter your new secure password below</p>

                {/* Verified badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-700 font-medium mt-3">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Recovery link verified ✓
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-gray-200/40 border border-gray-100">

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder='••••••••'
                        className={`w-full pl-11 pr-12 py-3 bg-gray-50 border ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl outline-none transition`}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />

                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>

                    {password && (
                      <div className="mt-3 space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Password Strength</span>
                          <span className={`font-semibold text-${strength.color}-600`}>{strength.label}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${strength.color}-500 transition-all duration-300 ease-out`}
                            style={{ width: strength.width }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder='••••••••'
                        className={`w-full pl-11 pr-12 py-3 bg-gray-50 border ${error || (confirmPassword && confirmPassword !== password) ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : confirmPassword === password ? 'border-green-300 focus:ring-green-500 focus:border-green-500' : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl outline-none transition`}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />

                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>

                    {confirmPassword && (
                      <div className={`mt-2 flex items-center gap-2 text-xs animate-fade-in ${confirmPassword === password ? 'text-green-600' : 'text-red-600'}`}>
                        {confirmPassword === password ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-medium">Passwords match!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            <span className="font-medium">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                    className={`w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 ${(isLoading || !password || !confirmPassword || password !== confirmPassword) ? 'opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-lg' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <p className="text-center text-gray-600 text-sm">
                Remember your password?{' '}
                <Link href="/company/login" className="font-semibold text-indigo-600 hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* Success State */
            <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-gray-200/40 border border-gray-100 text-center animate-scale-in">

              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="absolute inset-0 animate-ping-once">
                  <div className="w-28 h-28 border-4 border-green-300 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"></div>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-3">Password Updated! 🎉</h3>
              <p className="text-gray-500 mb-2 text-lg">Your password has been successfully changed.</p>
              <p className="text-gray-400 text-sm mb-8">Redirecting to login in <span className="font-semibold text-indigo-600">3 seconds...</span></p>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 text-left space-y-3">
                <div className="flex items-center gap-3 text-sm text-green-800">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span><strong>Secure:</strong> Encrypted and stored safely</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-green-800">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span><strong>Active:</strong> Ready to use immediately</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-green-800">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span><strong>Synchronized:</strong> All devices updated</span>
                </div>
              </div>

              <Link
                href="/company/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
              >
                Go to Login Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </Link>
            </div>
          )}
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

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }

        @keyframes ping-once {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .animate-ping-once { animation: ping-once 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
