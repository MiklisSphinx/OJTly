'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function UserRegister() {
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state - ADDED for Supabase
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  
  // Loading state - ADDED
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes - ADDED
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

    // ✅ SUPABASE REGISTRATION HANDLER - WITH REDIRECT!
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { email, password, confirmPassword, fullName } = formData;

    // Validation 1: Check empty fields
    if (!email || !password || !confirmPassword || !fullName) {
      alert("Please fill in all fields.");
      return;
    }

    // Validation 2: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Validation 3: Password match
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Validation 4: Password length
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      // Call Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student', // Default role for OJTly users
          },
        },
      });

      if (error) {
        alert(error.message);
        return;
      }

      // ✅ SUCCESS! Show alert then REDIRECT!
      alert("✅ Account created successfully! Redirecting to login...");
      
      // ✅✅✅ REDIRECT TO /STUDENT/LOGIN AFTER 1 SECOND ✅✅✅
      setTimeout(() => {
        window.location.href = '/student/login';
      }, 1000);
      
    } catch (err) {
      console.error('Registration error:', err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ GOOGLE LOGIN HANDLER - ADDED (Optional)
  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${window.location.origin}/auth/callback` 
        },
      });
    } catch (error) {
      console.error('Google login error:', error);
      alert("Google login failed. Please try again.");
    }
  };
  
  return (
    <div className="min-h-screen flex font-sans overflow-x-hidden">
      
      {/* Left Side - Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-indigo-600 to-purple-600 relative overflow-hidden justify-center items-center">
         <div className="absolute top-10 left-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">Join Our Community</h1>
          <p className="text-lg text-indigo-100">Create an account to start your professional journey.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 relative">
        
        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm group z-20">
            <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
        </Link>

        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 mt-2">Fill in your details</p>
          </div>

          {/* Role Toggle Tabs */}
          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-full flex gap-1">
              <Link href="/user/register" className="px-6 py-2 rounded-full bg-white shadow-sm text-blue-600 font-medium text-sm">User</Link>
              <Link href="/company/register" className="px-6 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50">Company</Link>
              <Link href="/admin/register" className="px-6 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50">Admin</Link>
            </div>
          </div>

          {/* Registration Form Card */}
          <div className="bg-slate-50 p-8 rounded-3xl border border-gray-100 shadow-xl">
            
            {/* ✅ FORM WITH onSubmit handler */}
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* ✅ Full Name Field - NEWLY ADDED */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz" 
                  className="w-full pl-4 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm" 
                  required 
                />
              </div>

              {/* ✅ Email Field - CONNECTED TO STATE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com" 
                  className="w-full pl-4 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm" 
                  required 
                />
              </div>

              {/* ✅ Password Field - CONNECTED TO STATE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder='Min. 6 characters'
                        className={`w-full pl-4 pr-12 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm ${
                          formData.password && formData.password.length < 6 ? 'border-red-300' : 'border-gray-200'
                        }`}
                        required 
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600"
                    >
                    {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    )}
                    </button>
                </div>
                
                {/* Password strength indicator - BONUS */}
                {formData.password && (
                  <p className={`mt-1 text-xs ${formData.password.length >= 6 ? 'text-green-600' : 'text-red-500'}`}>
                    {formData.password.length >= 6 ? '✓ Strong enough' : `⚠ Need ${6 - formData.password.length} more characters`}
                  </p>
                )}
              </div>

              {/* ✅ Confirm Password Field - CONNECTED TO STATE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                    <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder='Re-enter password'
                        className={`w-full pl-4 pr-12 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm ${
                          formData.confirmPassword && formData.password !== formData.confirmPassword 
                            ? 'border-red-400 focus:ring-red-500' 
                            : 'border-gray-200'
                        }`} 
                        required 
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600"
                    >
                    {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    )}
                    </button>
                </div>
                
                {/* Real-time password match error - BONUS */}
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Divider - NEW */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-50 px-3 text-gray-400">or continue with</span>
                </div>
              </div>

              {/* ✅ Google Login Button - NEWLY ADDED */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              {/* ✅ Submit Button - WITH LOADING STATE */}
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 mt-4 flex items-center justify-center gap-2 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-600">
            Already have an account?{' '}
            <Link href="/student/login" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
      
      {/* Blob Animation Styles */}
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