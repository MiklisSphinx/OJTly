'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Please enter email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (signInError) {
        alert("Error: " + signInError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          alert("Error fetching profile");
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        if (profile.role === 'admin') {
          alert("Welcome back, Admin!");
          setTimeout(() => {
            router.push('/admin_main');
          }, 1000);
        } else {
          alert("Unauthorized! This is the Admin Portal only.");
          await supabase.auth.signOut();
          setUsername('');
          setPassword('');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-gray-900">
      
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-800 to-gray-900 relative overflow-hidden justify-center items-center">
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-gray-700 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <div className="w-20 h-20 mx-auto mb-6 border-2 border-red-500 rounded-2xl flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">Admin Portal</h1>
          <p className="text-lg text-gray-400">Restricted Access</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-900 p-6 relative">

        <Link href="/" className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition-colors font-medium text-sm group z-20">
          <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>

        <div className="w-full max-w-md space-y-8 mt-12 lg:mt-0">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Secure Login</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">Administrator access only</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-800 p-1 rounded-full flex gap-1 border border-gray-700 inline-flex">
              <Link href="/student/login" className="px-4 py-2 rounded-full text-gray-500 text-sm hover:text-white transition-all text-xs">User</Link>
              <Link href="/company/login" className="px-4 py-2 rounded-full text-gray-500 text-sm hover:text-white transition-all text-xs">Company</Link>
              <Link href="/admin/login" className="px-4 py-2 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-white text-xs font-semibold shadow-lg shadow-red-900/20">Admin</Link>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl border border-gray-700 backdrop-blur-sm shadow-xl">
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              
              {/* Email Field */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                <input 
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@ojtly.com"
                  className="w-full pl-4 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-500"
                  required 
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-500"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg shadow hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-wait"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4 4m0 0l4 4m3-13V8a3 3 0 00-3-3H5a3 3 0 00-3 3v6a3 3 0 003 3h2" />
                    </svg>
                    <span>Login to Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Links Section */}
            <div className="pt-4 border-t border-gray-700 mt-4 space-y-2 text-center">
              <p className="text-xs text-gray-500">
                Not an admin?{" "}
                <Link href="/student/login" className="text-blue-400 hover:underline font-medium">Student Login</Link>
                {" | "}
                <Link href="/company/login" className="text-blue-400 hover:underline font-medium">Company Login</Link>
              </p>
              <p className="text-xs text-gray-600">
                New here?{" "}
                <Link href="/admin/register" className="text-red-400 hover:underline font-semibold">Register as Admin</Link>
              </p>
            </div>
          </div>

          {/* Warning Badge */}
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-yellow-800">Admin Only</p>
              <p className="text-[10px] text-yellow-600 leading-tight">Non-admin accounts will be rejected.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}