'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ==========================================
// SVG ICON COMPONENTS
// ==========================================

const BuildingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a3 3 0 01-3-3V7m3 3v5a3 3 0 003 3H9m12 0a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v10z"/>
  </svg>
);

const MailIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);

const PhoneIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
  </svg>
);

const GlobeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const CheckCircleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
  </svg>
);

const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
  </svg>
);

const SparklesIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
  </svg>
);

const UserGroupIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
  </svg>
);

const DocumentTextIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);

// ==========================================
// STEP INDICATOR COMPONENT
// ==========================================
const StepIndicator = ({ 
  steps, 
  currentStep, 
  onStepClick 
}: { 
  steps: Array<{id: number; title: string; icon: React.ReactNode}>; 
  currentStep: number; 
  onStepClick: (step: number) => void;
}) => (
  <div className="mb-8">
    {/* Mobile: Horizontal scrollable */}
    <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            currentStep === step.id
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
              : currentStep > step.id
              ? 'bg-teal-100 text-teal-700'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <span>{step.icon}</span>
          <span className="hidden sm:inline">{step.title}</span>
        </button>
      ))}
    </div>

    {/* Desktop: Vertical stepper */}
    <div className="hidden lg:flex items-center justify-between relative">
      {/* Background line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200 rounded-full"></div>
      {/* Progress line */}
      <div 
        className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      ></div>

      {steps.map((step) => (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          className={`relative flex flex-col items-center gap-2 group`}
        >
          {/* Circle */}
          <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            currentStep === step.id
              ? 'border-teal-600 bg-teal-600 text-white scale-110 shadow-lg shadow-teal-200'
              : currentStep > step.id
              ? 'border-teal-600 bg-teal-100 text-teal-600'
              : 'border-slate-300 bg-white text-slate-400 hover:border-teal-300 hover:text-teal-500'
          }`}>
            {currentStep > step.id ? (
              <CheckCircleIcon className="w-6 h-6" />
            ) : (
              step.icon
            )}
          </div>
          
          {/* Label */}
          <span className={`text-xs font-semibold mt-1 transition-colors ${
            currentStep === step.id ? 'text-teal-700' : 'text-slate-500'
          }`}>
            {step.title}
          </span>
        </button>
      ))}
    </div>
  </div>
);

// ==========================================
// MAIN COMPANY SETUP PAGE
// ==========================================
export default function CompanySetupPage() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    companyName: '',
    industry: '',
    description: '',
    employeeCount: '',
    
    // Step 2: Contact
    email: '',
    phone: '',
    website: '',
    
    // Step 3: Location
    address: '',
    city: '',
    region: 'Negros Occidental',
  });

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Steps Configuration
  const steps = [
    { id: 1, title: 'Basic Info', icon: <BuildingIcon /> },
    { id: 2, title: 'Contact', icon: <MailIcon /> },
    { id: 3, title: 'Location', icon: <MapPinIcon /> },
    { id: 4, title: 'Review', icon: <DocumentTextIcon /> },
  ];

  // Industries List
  const industries = [
    'Information Technology',
    'Software Development',
    'Finance & Banking',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Retail & E-commerce',
    'Tourism & Hospitality',
    'Government',
    'BPO / Call Center',
    'Construction',
    'Agriculture',
    'Other'
  ];

  // Cities in Negros Occidental
  const cities = [
    'Bacolod City',
    'Bago City',
    'Cadiz City',
    'Escalante City',
    'Himamaylan City',
    'Kabankalan City',
    'La Carlota City',
    'Sagay City',
    'San Carlos City',
    'Silay City',
    'Sipalay City',
    'Talisay City',
    'Victorias City',
    'Other'
  ];

  // Check if user already has profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          // Profile already exists, redirect to dashboard
          showNotification('info', 'Company profile already exists! Redirecting...');
          setTimeout(() => router.push('/company_main'), 1500);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingProfile();
  }, []);

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
        if (!formData.industry) newErrors.industry = 'Please select an industry';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        break;
      
      case 2:
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      
      case 3:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'Please select a city';
        break;

      case 4:
        // Final review - validate all
        return validateStep(1) && validateStep(2) && validateStep(3);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (step: number) => {
    // Only allow going back or to completed steps
    if (step <= currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      console.log('Creating company profile...');

      const { data, error } = await supabase
        .from('companies')
        .insert([{
          user_id: user.id,
          company_name: formData.companyName.trim(),
          industry: formData.industry,
          description: formData.description.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          website: formData.website.trim() || null,
          address: formData.address.trim(),
          city: formData.city,
          region: formData.region,
          status: 'pending', // Requires admin approval
          created_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Insert Error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Company created:', data.id);
      
      showNotification('success', 'Company profile created successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/company_main');
      }, 2000);

    } catch (err: any) {
      console.error('Submit Error:', err);
      showNotification('error', err.message || 'Failed to create company profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20">
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] max-w-md animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <span className="shrink-0">
              {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
              {notification.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-600" />}
              {notification.type === 'warning' && <AlertTriangleIcon className="w-5 h-5 text-amber-600" />}
              {notification.type === 'info' && <InfoIcon className="w-5 h-5 text-blue-600" />}
            </span>
            <p className="text-sm font-medium flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="opacity-40 hover:opacity-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white mb-4 shadow-lg shadow-teal-200">
            <SparklesIcon />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            Set Up Your Company Profile
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            Complete your company information to start posting OJT opportunities for students.
            This only takes a few minutes!
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          
          {/* Step Indicator */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8">
            <StepIndicator 
              steps={steps} 
              currentStep={currentStep} 
              onStepClick={goToStep}
            />
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8">
            
            {/* ========================================== */}
            {/* STEP 1: BASIC INFORMATION */}
            {/* ========================================== */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-teal-100 text-teal-600">
                    <BuildingIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Basic Information</h2>
                    <p className="text-sm text-slate-500">Tell us about your company</p>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g., Acme Corporation"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition ${
                      errors.companyName 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent' 
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                    }`}
                  />
                  {errors.companyName && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none appearance-none cursor-pointer transition bg-white ${
                      errors.industry 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                    }`}
                  >
                    <option value="">Select your industry...</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  {errors.industry && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.industry}
                    </p>
                  )}
                </div>

                {/* Employee Count */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['1-10', '11-50', '51-200', '200+'].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, employeeCount: size }))}
                        className={`py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                          formData.employeeCount === size
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    About Your Company <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your company culture, mission, and what makes you a great place for OJT students..."
                    className={`w-full px-4 py-3 rounded-xl border outline-none resize-none transition ${
                      errors.description 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* STEP 2: CONTACT INFORMATION */}
            {/* ========================================== */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                    <MailIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Contact Information</h2>
                    <p className="text-sm text-slate-500">How can students reach you?</p>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="hr@yourcompany.com"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition ${
                        errors.email 
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                          : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+63 9XX XXX XXXX"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition ${
                        errors.phone 
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                          : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Website <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <GlobeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://www.yourcompany.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Privacy Note</p>
                    <p>Your contact information will only be visible to students who apply to your posts.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* STEP 3: LOCATION */}
            {/* ========================================== */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Office Location</h2>
                    <p className="text-sm text-slate-500">Where is your company located?</p>
                  </div>
                </div>

                {/* Region (Pre-filled) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Province/Region
                  </label>
                  <input
                    type="text"
                    value="Negros Occidental"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Currently serving Negros Occidental area</p>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    City/Municipality <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none appearance-none cursor-pointer transition bg-white ${
                      errors.city 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                    }`}
                  >
                    <option value="">Select city...</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.city}
                    </p>
                  )}
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Complete Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Street address, Barangay, Building name..."
                    className={`w-full px-4 py-3 rounded-xl border outline-none resize-none transition ${
                      errors.address 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500' 
                        : 'border-slate-200 focus:ring-2 focus:ring-teal-500'
                    }`}
                  />
                  {errors.address && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangleIcon className="w-4 h-4" />
                      {errors.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* STEP 4: REVIEW & SUBMIT */}
            {/* ========================================== */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Review Your Information</h2>
                    <p className="text-sm text-slate-500">Please verify everything before submitting</p>
                  </div>
                </div>

                {/* Review Cards */}
                <div className="space-y-4">
                  
                  {/* Basic Info Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <BuildingIcon className="w-4 h-4 text-teal-600" />
                      Basic Information
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-slate-500">Company Name</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.companyName || '-'}</dd></div>
                      <div><dt className="text-slate-500">Industry</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.industry || '-'}</dd></div>
                      <div><dt className="text-slate-500">Size</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.employeeCount || 'Not specified'}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-slate-500">Description</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.description || '-'}</dd></div>
                    </dl>
                  </div>

                  {/* Contact Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <MailIcon className="w-4 h-4 text-blue-600" />
                      Contact Details
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800 mt-0.5 break-all">{formData.email || '-'}</dd></div>
                      <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.phone || '-'}</dd></div>
                      <div><dt className="text-slate-500">Website</dt><dd className="font-medium text-slate-800 mt-0.5 break-all">{formData.website || '-'}</dd></div>
                    </dl>
                  </div>

                  {/* Location Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-purple-600" />
                      Location
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-slate-500">City</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.city || '-'}</dd></div>
                      <div><dt className="text-slate-500">Region</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.region}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium text-slate-800 mt-0.5">{formData.address || '-'}</dd></div>
                    </dl>
                  </div>

                </div>

                {/* Terms Notice */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Before You Submit</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>Your profile will be reviewed by admin before activation</li>
                      <li>You can edit this information later in Settings</li>
                      <li>Make sure all details are accurate</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* NAVIGATION BUTTONS */}
            {/* ========================================== */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              
              {/* Back Button */}
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-all"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <Link href="/company_main" className="flex items-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-all">
                  Cancel
                </Link>
              )}

              {/* Next / Submit Button */}
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Continue
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Create Profile
                    </>
                  )}
                </button>
              )}

            </div>
          </form>
        </div>

        {/* Footer Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Need help?{' '}
            <Link href="/support" className="text-teal-600 hover:text-teal-700 font-medium underline">
              Contact Support
            </Link>
          </p>
        </div>

      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Custom Select Styling */
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1rem;
        }
      `}</style>
    </div>
  );
}

// Missing icons used in notifications
const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const AlertTriangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
  </svg>
);

const InfoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);