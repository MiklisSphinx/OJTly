'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function CompanyLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();

      // ==========================================
      // 🧹 CLEAN SLATE - Clear old sessions
      // ==========================================
      console.log('🧹 Clearing old sessions...');
      
    // Clean old sessions
await supabase.auth.signOut({ scope: 'global' });

if (typeof window !== 'undefined') {
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear old cookies
        document.cookie = 'ojtly-auth-token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'ojtly_just_logged_in=; path=/; max-age=0; SameSite=Lax';
        
        console.log('🗑️ Old data cleared');
      }

      if (!email || !password) {
        setErrorMessage('Please fill in all fields.');
        setIsLoading(false);
        return;
      }

      // ==========================================
      // STEP 1: Authenticate User
      // ==========================================
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setErrorMessage('Invalid email or password.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Signed in:', authData.user?.id);

      // ==========================================
      // STEP 2: Fetch Profile to check Role
      // ==========================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('Profile not found. Please contact support.');
        setIsLoading(false);
        return;
      }

      console.log(`🎭 Role: "${profile.role}" → "${profile.role?.toLowerCase()}"`);

      // ==========================================
      // GUARD #1: BLOCK STUDENTS (with lowercase!)
      // ==========================================
      if (profile.role?.toLowerCase() === 'student' || profile.role?.toLowerCase() === 'user') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('❌ Access Denied!\n\nThis account is registered as a Student.\n\n→ Please use: /student/login');
        setIsLoading(false);
        return;
      }

      // ==========================================
      // GUARD #2: BLOCK ADMINS (with lowercase!)
      // ==========================================
      if (profile.role?.toLowerCase() === 'admin') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('❌ Access Denied!\n\nThis account is registered as an Admin.\n\n→ Please use: /admin/login');
        setIsLoading(false);
        return;
      }

      // ==========================================
      // GUARD #3: Only allow "company" role
      // ==========================================
      if (profile.role?.toLowerCase() !== 'company') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage(`❌ Access Denied!\n\nUnknown role: "${profile.role}"\n\nOnly Company accounts can use this portal.`);
        setIsLoading(false);
        return;
      }

      // ==========================================
      // STEP 3: CHECK COMPANY APPROVAL STATUS
      // ==========================================
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('status')
        .eq('user_id', authData.user.id)
        .single();

      if (companyError || !company) {
        console.error('Company fetch error:', companyError);
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('Company profile not found. Please register first.');
        setIsLoading(false);
        return;
      }

      if (company.status === 'pending') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('⏳ Account Pending Approval\n\nYour company registration is still under review.\nPlease wait for an administrator to verify your documents.');
        setIsLoading(false);
        return;
      }

      if (company.status === 'rejected') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage('❌ Application Rejected\n\nYour company application was not approved.\nPlease contact the administrator for more information.');
        setIsLoading(false);
        return;
      }

      if (company.status === 'archived' || company.status === 'suspended') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage(`🚫 Account ${company.status?.toUpperCase()}\n\nYour company account has been ${company.status}.\nPlease contact support.`);
        setIsLoading(false);
        return;
      }

      if (company.status !== 'approved' && company.status !== 'Approved') {
        await supabase.auth.signOut({ scope: 'global' });
        setErrorMessage(`⚠️ Account Status: ${company.status}\n\nYour account is not active. Please contact support.`);
        setIsLoading(false);
        return;
      }

      // ==========================================
      // ✅ SUCCESS! Ensure session is ready
      // ==========================================
      console.log('✅ All checks passed - preparing redirect');
      
      // Force session refresh to ensure middleware can read it
      await supabase.auth.getSession();
      
      // Small delay to ensure cookies are set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Hard redirect to dashboard
      window.location.href = '/company_main';

      return;

    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMessage('Login failed. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      
      {/* LEFT SIDE - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 to-emerald-700 relative overflow-hidden justify-center items-center">
        <div className="absolute top-10 left-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-lime-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">Company Portal</h1>
          <p className="text-lg text-teal-100">Manage your listings and find talent.</p>
          
          <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-teal-50">Secure Authentication</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-6 relative">
        
        <Link href="/" className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-teal-600 transition-colors font-medium text-sm group z-20">
            <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back
        </Link>

        <div className="w-full max-w-md space-y-8 mt-12 lg:mt-0">
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Company Sign In</h2>
            <p className="text-gray-500 mt-2">Access your Company Dashboard</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center">
            <div className="bg-gray-200/60 p-1 rounded-full flex gap-1 backdrop-blur-sm">
              <Link href="/student/login" className="px-6 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50 transition-all">Student</Link>
              <Link href="/company/login" className="px-6 py-2 rounded-full bg-white shadow-sm text-teal-600 font-medium text-sm transition-all">Company</Link>
              <Link href="/admin/login" className="px-6 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50 transition-all">Admin</Link>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-gray-200/40 border border-gray-100">
            
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Access Denied</p>
                  <p className="text-xs text-red-600 mt-1 whitespace-pre-line">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </span>
                  <input 
                    type="email" 
                    placeholder="company@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition ${errorMessage ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-teal-500 focus:border-transparent'}`}
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002 2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Enter your password'
                    disabled={isLoading}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition ${errorMessage ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-teal-500 focus:border-transparent'}`}
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-teal-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                 <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" disabled={isLoading} />
                  <span className="text-gray-600">Remember me</span>
                 </label>
                 <a href="/company/forgot" className="text-teal-600 hover:underline font-medium">Forgot Password?</a>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className={`w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign In as Company
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4 4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 00-3-3h7a3 3 0 003 3v1"/>
                    </svg>
                  </>
                )}
              </button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">Or continue with</span></div>
              </div>

              <div className="relative group">
                <button type="button" disabled={true} className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed opacity-60 transition-all">
                  <svg className="w-5 h-5 grayscale" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-500 font-medium">Google</span>
                </button>
                
                <div className="absolute -top-3 right-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200 shadow-sm">
                  Coming Soon
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 italic">
                🔒 For security, please use email/password for company accounts.
              </p>
            </form>
          </div>

          <p className="text-center text-gray-600 pb-8">
            Don&apos;t have an account?{' '}
            <Link href="/company/register" className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
              Register Your Company
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 pb-4">
            Having trouble?{' '}
            <Link href="/support" className="underline hover:text-teal-600">Contact Support</Link>
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