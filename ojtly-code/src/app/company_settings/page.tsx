'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false); // ✅ NEW: For auto-locate loading state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ==========================================
  // STATE VARIABLES
  // ==========================================
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');

  // Toast helper
  const addToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // ==========================================
  // AUTOFILL
  // ==========================================
  useEffect(() => {
    const autofillFromRegistration = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user || authError) return;

        let { data, error } = await supabase
          .from('companies')
          .select('company_name, email, office_address, phone, logo_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!data && !error) {
          const profileResult = await supabase
            .from('profiles')
            .select('company_name, email, office_address, phone, logo_url')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileResult.data) data = profileResult.data;
        }

        if (error) return;

        if (data) {
          setCompanyName(data.company_name || '');
          setEmail(data.email || '');
          setOfficeAddress(data.office_address || '');
          setPhone(data.phone || '');
          
          if (data.logo_url) {
            setCurrentLogoUrl(data.logo_url);
            setLogoPreview(data.logo_url);
          }
        }

      } catch (err) {
        console.error("Autofill failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    autofillFromRegistration();
    
  }, []);

  // ==========================================
  // ✅ NEW: AUTO LOCATE FUNCTION
  // Uses Browser Geolocation + OpenStreetMap Reverse Geocoding (Free, no API key)
  // ==========================================
  const handleAutoLocate = async () => {
    setIsLocating(true);
    
    try {
      // Step 1: Get browser location
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      console.log(`📍 Location found: ${latitude}, ${longitude}`);

      // Step 2: Reverse geocode using OpenStreetMap Nominatim (Free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'OJTlySettings/1.0' // Required by OSM terms of service
          }
        }
      );

      if (!response.ok) throw new Error("Failed to fetch address");

      const data = await response.json();

      if (data && data.display_name) {
        // Format the address nicely
        const address = data.display_name;
        setOfficeAddress(address);
        addToast("Location detected! 📍", "success");
        
        console.log("📝 Auto-filled address:", address);
      } else {
        // Fallback: Just put coordinates if no address found
        setOfficeAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        addToast("Location found but address unavailable", "info");
      }

    } catch (error: any) {
      console.error("❌ Location error:", error.message);
      
      let message = "Could not get location";
      
      if (error.code === 1 || error.message?.includes('permission')) {
        message = "Location permission denied. Please allow location access.";
      } else if (error.code === 2 || error.message?.includes('unavailable')) {
        message = "Location unavailable. Please check your device settings.";
      } else if (error.code === 3 || error.message?.includes('timeout')) {
        message = "Location request timed out. Please try again.";
      }
      
      addToast(message, "error");
    } finally {
      setIsLocating(false);
    }
  };

  // ==========================================
  // MANUAL SYNC
  // ==========================================
  const handleSync = async () => {
    const btn = document.activeElement as HTMLButtonElement;
    if (btn) {
      btn.textContent = "Syncing...";
      btn.disabled = true;
    }
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) throw new Error("Not logged in");

      let { data, error } = await supabase
        .from('companies')
        .select('company_name, email, office_address, phone, logo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data && !error) {
        const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (profileRes.data) data = profileRes.data;
      }

      if (error) throw new Error(error.message);

      if (data) {
        setCompanyName(data.company_name || '');
        setEmail(data.email || '');
        setOfficeAddress(data.office_address || '');
        setPhone(data.phone || '');
        
        if (data.logo_url) {
          setCurrentLogoUrl(data.logo_url);
          setLogoPreview(data.logo_url);
        }
        
        addToast("Data synced successfully!", "success");
      } else {
        addToast("No profile data found.", "error");
      }

    } catch (err: any) {
      addToast("Error: " + err.message, "error");
    } finally {
      if (btn) {
        btn.textContent = "🔄 Refresh";
        btn.disabled = false;
      }
    }
  };

  // Input change handler
  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    switch(name) {
      case 'name': 
        setCompanyName(value); 
        break;
      case 'email': 
        setEmail(value); 
        break;
      case 'address': 
        setOfficeAddress(value); 
        break;
      case 'phone': 
        setPhone(value); 
        break;
    }
  };

  // Logo handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return addToast('Images only', 'error');
      if (file.size > 2 * 1024 * 1024) return addToast('Max 2MB', 'error');
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/') && file.size <= 2*1024*1024) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setCurrentLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ==========================================
  // SAVE HANDLER - LOCKED (No router.push)
  // ==========================================
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!companyName.trim()) throw new Error("Company Name required");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth required");

      let finalLogoUrl = currentLogoUrl;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${user.id}_${Date.now()}.${ext}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('company-logos') 
          .upload(path, logoFile, { upsert: true });
          
        if (uploadErr) throw uploadErr;
        
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path);
        finalLogoUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('companies').upsert({
        user_id: user.id,
        company_name: companyName.trim(),
        email: email.trim(), // Still saves the original email even though input is disabled
        office_address: officeAddress.trim(),
        phone: phone.trim(),
        logo_url: finalLogoUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (dbError) throw dbError;

      addToast("Settings updated successfully! ✨", "success");
      setCurrentLogoUrl(finalLogoUrl);

    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-slate-500 text-sm">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm flex justify-between items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-600' : 
            toast.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="hover:opacity-70">✕</button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Dashboard</Link>
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">My OJT Posts</Link>
          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Create Post</Link>
          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Applicants</Link>
          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Documents</Link>
          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg font-medium">Settings</Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
           <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg font-medium w-full">Log out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="lg:ml-64 min-h-screen">
        
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
            
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800">Company Settings</h1>
            </div>

            <button onClick={() => router.push('/')} className="text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          
          <form onSubmit={handleSaveChanges} className="space-y-6">
            
            {/* LOGO CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Company Logo</h2>
                <p className="text-sm text-slate-500">Upload your company logo.</p>
              </div>

              <div className="p-6">
                {!logoPreview ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400"
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📷</div>
                    <p className="font-semibold text-slate-700">Click to upload</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG max 2MB</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-lg border" onError={(e) => {(e.target as HTMLImageElement).src='/images/default.png'}}/>
                      <div>
                        <p className="font-medium text-sm">{logoFile?.name || "Current Logo"}</p>
                        <p className="text-xs text-green-600">Ready</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveLogo} className="text-sm text-red-500 hover:underline">Remove</button>
                  </div>
                )}
              </div>
            </div>

            {/* INFO CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Company Information</h2>
                  <p className="text-xs text-slate-500 mt-1">Auto-filled from registration data</p>
                </div>
                
                <button
                  type="button"
                  onClick={handleSync}
                  className="shrink-0 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 active:scale-95 transition-transform"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="p-6 space-y-5">
                
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Tech Solutions Inc."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                    required
                  />
                </div>

                {/* 🔒 EMAIL - LOCKED / READ ONLY */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email Address 
                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">🔒 Cannot change</span>
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={email}
                    readOnly
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-100 text-slate-600 cursor-not-allowed outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Contact support to change email</p>
                </div>

                {/* 📍 OFFICE ADDRESS WITH AUTO LOCATE */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-slate-700">
                      Office Address
                    </label>
                    
                    {/* ✅ AUTO LOCATE BUTTON */}
                    <button
                      type="button"
                      onClick={handleAutoLocate}
                      disabled={isLocating}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        isLocating 
                          ? 'bg-blue-50 text-blue-600 border-blue-200 cursor-wait' 
                          : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 active:scale-95'
                      }`}
                      title="Detect my current location"
                    >
                      {isLocating ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Locating...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          Auto Locate
                        </>
                      )}
                    </button>
                  </div>
                  
                  <textarea 
                    name="address"
                    rows={3}
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="123 Innovation Drive, Bacolod City"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  />
                  
                  {/* Helper text when locating */}
                  {isLocating && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Detecting your location...
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 917 123 4567"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end pb-8">
              <button 
                type="submit"
                disabled={isSaving}
                className={`px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Saving...
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}