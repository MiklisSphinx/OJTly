'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CompanyRegister() {
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactPerson: '',
    phoneNumber: '',
    officeAddress: '',
    latitude: null as number | null,
    longitude: null as number | null,
    businessPermit: null as File | null,
    secDtiFile: null as File | null,
    bir2303File: null as File | null,
    industry: '', // 🔥 NEW: Optional field
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Upload status
  const [uploadedFiles, setUploadedFiles] = useState<{
    permit: { name: string; size: string; date: string; type: string; url?: string } | null;
    secDti: { name: string; size: string; date: string; type: string; url?: string } | null;
    bir2303: { name: string; size: string; date: string; type: string; url?: string } | null;
  }>({
    permit: null,
    secDti: null,
    bir2303: null,
  });

  // Step tracking
  const [currentStep, setCurrentStep] = useState<'idle' | 'uploading' | 'creating' | 'profiling' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Auto-Locate Function (GPS)
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setStatusMessage('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          setStatusMessage('Converting coordinates to address...');
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          
          const data = await response.json();
          
          if (data && data.display_name) {
            setFormData(prev => ({
              ...prev,
              officeAddress: data.display_name,
              latitude,
              longitude,
            }));
            setStatusMessage('');
            alert("Location detected successfully!");
          } else {
            setFormData(prev => ({
              ...prev,
              officeAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              latitude,
              longitude,
            }));
            setStatusMessage('');
          }
        } catch (error) {
          setFormData(prev => ({
            ...prev,
            officeAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          }));
          setStatusMessage('');
        }
        
        setIsLocating(false);
      },
      
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        setStatusMessage('');
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out.");
            break;
          default:
            alert("An unknown error occurred while getting location.");
        }
      },
      
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle File Uploads (Supports 3 files)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'permit' | 'secDti' | 'bir2303') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, PNG, or JPG file only.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    if (type === 'permit') {
      setFormData(prev => ({ ...prev, businessPermit: file }));
      setUploadedFiles(prev => ({
        ...prev,
        permit: {
          name: file.name,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          type: file.type === 'application/pdf' ? 'PDF Document' : 'Image File'
        }
      }));
    } else if (type === 'secDti') {
      setFormData(prev => ({ ...prev, secDtiFile: file }));
      setUploadedFiles(prev => ({
        ...prev,
        secDti: {
          name: file.name,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          type: file.type === 'application/pdf' ? 'PDF Document' : 'Image File'
        }
      }));
    } else if (type === 'bir2303') {
      setFormData(prev => ({ ...prev, bir2303File: file }));
      setUploadedFiles(prev => ({
        ...prev,
        bir2303: {
          name: file.name,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          type: file.type === 'application/pdf' ? 'PDF Document' : 'Image File'
        }
      }));
    }
  };

  // Remove uploaded file
  const handleRemoveFile = (type: 'permit' | 'secDti' | 'bir2303') => {
    if (type === 'permit') {
      setFormData(prev => ({ ...prev, businessPermit: null }));
      setUploadedFiles(prev => ({ ...prev, permit: null }));
    } else if (type === 'secDti') {
      setFormData(prev => ({ ...prev, secDtiFile: null }));
      setUploadedFiles(prev => ({ ...prev, secDti: null }));
    } else if (type === 'bir2303') {
      setFormData(prev => ({ ...prev, bir2303File: null }));
      setUploadedFiles(prev => ({ ...prev, bir2303: null }));
    }
  };

// Main Registration Handler
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const { 
    companyName, 
    email, 
    password, 
    confirmPassword,
    contactPerson,
    phoneNumber,
    businessPermit,
    secDtiFile,
    bir2303File,
    industry // 🔥 NEW FIELD
  } = formData;

  // Validation
  if (!companyName || !email || !password || !confirmPassword) {
    alert("Please fill in all required fields (*).");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  // Validate required documents (industry is NOT required here)
  if (!businessPermit || !secDtiFile || !bir2303File) {
    alert("Please upload all required documents:\n• Business Permit\n• SEC/DTI Certificate\n• BIR Form 2303");
    return;
  }

  setIsLoading(true);
  let permitUrl = null;
  let secDtiUrl = null;
  let bir2303Url = null;

  try {
    
    // STEP 0: FILE UPLOADS
    setCurrentStep('uploading');
    setStatusMessage('Uploading Business Permit...');
    setUploadProgress(10);

    const uploadToStorage = async (file: File, folder: string, label: string): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${folder}/${Date.now()}_${sanitizedCompanyName}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`📤 Uploading ${label}:`, fileName);

      const { data: fileData, error: fileError } = await supabase.storage
        .from('business-permits')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (fileError) throw new Error(`${label} upload failed: ${fileError.message}`);

      const { data: urlData } = supabase.storage.from('business-permits').getPublicUrl(fileName);
      return urlData.publicUrl;
    };

    permitUrl = await uploadToStorage(businessPermit, 'permits', 'Business Permit');
    setUploadProgress(30);

    setStatusMessage('Uploading SEC/DTI Certificate...');
    secDtiUrl = await uploadToStorage(secDtiFile, 'sec-dti', 'SEC/DTI');
    setUploadProgress(55);

    setStatusMessage('Uploading BIR Form 2303...');
    bir2303Url = await uploadToStorage(bir2303File, 'bir-2303', 'BIR 2303');
    setUploadProgress(80);

    setStatusMessage('All files uploaded! Creating account...');

    // STEP 1: AUTH SIGN UP
    setCurrentStep('creating');
    setUploadProgress(85);
    setStatusMessage('Creating authentication credentials...');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'company', status: 'pending' },
      },
    });

    setUploadProgress(90);

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('This email is already registered. Try logging in instead.');
      }
      throw new Error(authError.message);
    }

    if (!authData.user) throw new Error('User creation failed.');

    // STEP 2: PROFILE UPSERT
    setCurrentStep('profiling');
    setUploadProgress(92);
    setStatusMessage('Saving profile...');

    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        [{ 
          id: authData.user.id,                    
          full_name: contactPerson || companyName, 
          role: 'company',                         
          email: email,                            
          status: 'pending',                       
        }],
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (profileError) throw new Error(`Profile operation failed: ${profileError.message}`);
    
    setUploadProgress(95);
    setStatusMessage('Saving company details...');

   // STEP 3: INSERT INTO COMPANIES TABLE
   // 🔥 INDUSTRY IS OPTIONAL - Falls back to 'General' if empty
    const { error: companyError } = await supabase
      .from('companies')
      .insert([{
        user_id: newProfile.id, 
        company_name: companyName,
        contact_person: contactPerson,
        office_address: formData.officeAddress, 
        phone_number: phoneNumber,
        email: email,
        permit_url: permitUrl,
        sec_dti_url: secDtiUrl,
        bir_2303_url: bir2303Url,
        industry: formData.industry.trim() || 'General', // 🔥 OPTIONAL FIELD FIX
        location: { lat: formData.latitude || 10.7572, lng: formData.longitude || 122.9814 },
        status: 'pending',
      }]);

    if (companyError) throw new Error(companyError.message);

    setUploadProgress(100);
    setCurrentStep('success');
    
    const successMessage = `
🎉 Company Registration Complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPANY DETAILS SAVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${companyName}
Industry: ${formData.industry || 'General'} 🔥
Contact: ${contactPerson || 'N/A'}
Email: ${email}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTS UPLOADED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Business Permit: ${uploadedFiles.permit?.name}
📋 SEC/DTI: ${uploadedFiles.secDti?.name}  
🏛️ BIR 2303: ${uploadedFiles.bir2303?.name}

✅ Profile created in system
⏳ Verification: 24-48 hours

Redirecting to login...
    `.trim();

    alert(successMessage);
    setTimeout(() => window.location.href = '/company/login', 2500);

  } catch (err: any) {
    console.error('❌ Registration error:', err);
    setCurrentStep('error');
    setStatusMessage('');
    alert(`Registration Failed:\n\n${err.message || 'An unexpected error occurred.'}`);
  } finally {
    setIsLoading(false);
    setTimeout(() => setUploadProgress(0), 2000);
  }
};
  
  return (
    <div className="min-h-screen flex font-sans bg-gray-50">
      
      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 relative overflow-hidden justify-center items-center">
        <div className="absolute top-10 left-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center text-white p-8">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-28 h-28 bg-white/15 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="relative text-5xl font-black tracking-tight"><span className="text-white">O</span><span className="text-teal-200">J</span></span>
                <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-400 rounded-full opacity-80"></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-white rounded-full opacity-60"></div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white/90 tracking-wide">For Companies</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight">Grow Your Team</h1>
          <p className="text-lg text-teal-100/90 max-w-sm mx-auto leading-relaxed mb-10">Find talented interns and build your future workforce.</p>

          <div className="flex justify-center gap-6">
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer w-36">
              <div className="w-12 h-12 bg-emerald-400/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-400/30 transition-colors"><svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg></div>
              <p className="text-sm font-semibold text-white">Map View</p>
              <p className="text-xs text-teal-200/70 mt-1">Find nearby talent</p>
            </div>
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer w-36">
              <div className="w-12 h-12 bg-blue-400/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-400/30 transition-colors"><svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></div>
              <p className="text-sm font-semibold text-white">Post Jobs</p>
              <p className="text-xs text-teal-200/70 mt-1">Create listings</p>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-teal-200/60 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Secure & Verified Platform
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto relative">
        
        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-teal-600 transition-colors font-medium text-sm group z-20">
          <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </Link>

        <div className="w-full max-w-lg space-y-5 my-8">
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Company Registration</h2>
            <p className="text-gray-500 mt-2 text-sm">Create your company profile</p>
          </div>

          {/* Role Tabs */}
          <div className="flex justify-center">
            <div className="bg-gray-200/60 p-1 rounded-full flex gap-1 backdrop-blur-sm inline-flex">
              <Link href="/student/register" className="px-5 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50 transition-all">User</Link>
              <Link href="/company/register" className="px-5 py-2 rounded-full bg-white shadow-sm text-teal-600 font-medium text-sm transition-all">Company</Link>
              <Link href="/admin/register" className="px-5 py-2 rounded-full text-gray-600 font-medium text-sm hover:bg-white/50 transition-all">Admin</Link>
            </div>
          </div>

          {/* Progress Indicator */}
          {isLoading && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'uploading' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                  currentStep === 'creating' ? 'bg-purple-100 text-purple-600 animate-pulse' :
                  currentStep === 'profiling' ? 'bg-orange-100 text-orange-600 animate-pulse' :
                  currentStep === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {currentStep === 'uploading' && (<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>)}
                  {currentStep === 'creating' && (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>)}
                  {currentStep === 'profiling' && (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>)}
                  {currentStep === 'success' && (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>)}
                  {currentStep === 'error' && (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 capitalize">{statusMessage || currentStep}</p>
                  <p className="text-xs text-gray-500">
                    {currentStep === 'uploading' && 'Uploading your documents to secure storage... (3 files)'}
                    {currentStep === 'creating' && 'Creating your authentication credentials...'}
                    {currentStep === 'profiling' && 'Saving your data to our database...'}
                    {currentStep === 'success' && 'Registration complete! Redirecting...'}
                    {currentStep === 'error' && 'Something went wrong'}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ease-out ${currentStep === 'success' ? 'bg-green-500' : currentStep === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-teal-500 via-blue-500 to-emerald-500'}`} style={{ width: `${uploadProgress}%` }}></div>
              </div>
              
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span className={currentStep === 'uploading' || uploadProgress > 10 ? 'text-teal-600 font-medium' : ''}>Upload</span>
                <span className={currentStep === 'creating' || uploadProgress > 85 ? 'text-purple-600 font-medium' : ''}>Auth</span>
                <span className={currentStep === 'profiling' || uploadProgress > 92 ? 'text-orange-600 font-medium' : ''}>Save</span>
                <span className={currentStep === 'success' ? 'text-green-600 font-medium' : ''}>Done!</span>
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* COMPANY INFORMATION SECTION */}
            <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-200/40 border border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                Company Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="GlobalTech Solutions Inc." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition" required disabled={isLoading} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></span>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="hr@globaltech.com" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition" required disabled={isLoading} />
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" className={`w-full px-4 pr-12 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition ${formData.password && formData.password.length < 6 ? 'border-red-300' : 'border-gray-200'}`} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-teal-600">
                      {showPassword ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>)}
                    </button>
                  </div>
                  {formData.password && formData.password.length < 6 && (<p className="mt-1 text-xs text-red-500">Need {6 - formData.password.length} more characters</p>)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className={`w-full px-4 pr-12 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-400' : 'border-gray-200'}`} required disabled={isLoading} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-teal-600">
                      {showConfirmPassword ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>)}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (<p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>Passwords do not match</p>)}
                </div>
              </div>

              {/* 🔥 OPTIONAL INDUSTRY FIELD - ADDED HERE */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Industry <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 top-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    placeholder="e.g., IT & Software Development, BPO, Manufacturing" 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-gray-100"
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400 ml-1">Leave blank if not applicable</p>
              </div>
            </div>

            {/* CONTACT INFORMATION SECTION */}
            <div className="bg-blue-50/60 p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Contact Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></span>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="Juan Dela Cruz (HR Manager)" className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg></span>
                  <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="0912-345-6789" className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" disabled={isLoading} />
                </div>
              </div>

              {/* Office Address WITH AUTO-LOCATE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Address / Location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 top-3"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></span>
                    <input type="text" name="officeAddress" value={formData.officeAddress} onChange={handleChange} placeholder="123 IT Park, Bacolod City" className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" disabled={isLoading} />
                  </div>
                  
                  <button type="button" onClick={handleAutoLocate} disabled={isLocating || isLoading} className={`px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 font-medium text-sm min-w-[120px] ${isLocating ? 'bg-blue-100 text-blue-600 cursor-wait border border-blue-200' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg active:scale-95'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} title="Auto-detect location using GPS">
                    {isLocating ? (<><svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Locating...</span></>) : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span>Locate Me</span></>)}
                  </button>
                </div>
                
                {isLocating && (<p className="mt-2 text-xs text-blue-600 flex items-center gap-1 animate-pulse"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>Detecting your location...</p>)}
                {(formData.latitude && formData.longitude) && !isLocating && (<p className="mt-2 text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded-lg"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>Location saved!</p>)}
              </div>
            </div>

            {/* BUSINESS PERMIT UPLOAD */}
            <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Business Permit <span className="text-red-500">*</span>
              </h3>

              {!uploadedFiles.permit ? (
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer bg-white transition-all group ${isLoading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-2 text-gray-400 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-teal-600">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-400">PDF, PNG or JPG up to 10MB</p>
                  </div>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(e) => handleFileUpload(e, 'permit')} className="hidden" disabled={isLoading} />
                </label>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${uploadedFiles.permit.type === 'PDF Document' ? 'bg-red-100' : 'bg-green-100'}`}>
                      {uploadedFiles.permit.type === 'PDF Document' ? (<svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6zm8-10v6h-2v-6h2zm-4 0v6H8v-6h2z"/></svg>) : (<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{uploadedFiles.permit.name}</p>
                      <p className="text-xs text-gray-500">{uploadedFiles.permit.type} • {uploadedFiles.permit.size} • Uploaded on {uploadedFiles.permit.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => alert('Preview coming soon!')} className="px-3 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors" disabled={isLoading}>View</button>
                    <button type="button" onClick={() => handleRemoveFile('permit')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" disabled={isLoading}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                  </div>
                </div>
              )}
            </div>

            {/* SEC/DTI CERTIFICATE */}
            <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                SEC / DTI Certificate <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-indigo-600/70 -mt-2">Securities and Exchange Commission or Department of Trade & Industry registration.</p>

              {!uploadedFiles.secDti ? (
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer bg-white transition-all group ${isLoading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-2 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-indigo-600">Upload SEC/DTI</span> certificate</p>
                    <p className="text-xs text-gray-400">PDF only recommended</p>
                  </div>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileUpload(e, 'secDti')} className="hidden" disabled={isLoading} />
                </label>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-indigo-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-indigo-100">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{uploadedFiles.secDti.name}</p>
                      <p className="text-xs text-gray-500">{uploadedFiles.secDti.type} • {uploadedFiles.secDti.size}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemoveFile('secDti')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" disabled={isLoading}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
            </div>

            {/* BIR FORM 2303 */}
            <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-100 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                BIR Form 2303 (COR) <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-rose-600/70 -mt-2">Bureau of Internal Revenue Certificate of Registration for tax purposes.</p>

              {!uploadedFiles.bir2303 ? (
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer bg-white transition-all group ${isLoading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-rose-300 hover:border-rose-500 hover:bg-rose-50/30'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-2 text-rose-400 group-hover:text-rose-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-rose-600">Upload BIR 2303</span> form</p>
                    <p className="text-xs text-gray-400">Certificate of Registration (COR)</p>
                  </div>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileUpload(e, 'bir2303')} className="hidden" disabled={isLoading} />
                </label>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-rose-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-rose-100">
                      <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{uploadedFiles.bir2303.name}</p>
                      <p className="text-xs text-gray-500">{uploadedFiles.bir2303.type} • {uploadedFiles.bir2303.size}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemoveFile('bir2303')} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" disabled={isLoading}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
            </div>

            {/* Required Notice */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">All 3 documents are required for verification:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs mt-1 text-yellow-700">
                    <li><strong>Business Permit</strong> - Local government operation permit</li>
                    <li><strong>SEC/DTI</strong> - Corporate or business registration</li>
                    <li><strong>BIR 2303</strong> - Tax registration certificate</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} className={`w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? (<><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</>) : (<>Register Company<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg></>)}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-4">
            Already registered?{' '}
            <Link href="/company/login" className="font-semibold text-teal-600 hover:text-teal-500 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}