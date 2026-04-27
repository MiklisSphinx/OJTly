'use client';

import { useEffect, useState } from 'react';
import type { LeafletMouseEvent } from 'leaflet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// IMPORT SUPABASE CLIENT
import { createClient } from '@/utils/supabase/client';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

const useMapEvents = () => {
  const { useMapEvents: _useMapEvents } = require('react-leaflet');
  return _useMapEvents;
};

const useMap = () => {
  const { useMap: _useMap } = require('react-leaflet');
  return _useMap;
};

// Fix for default marker icons in Next.js/Webpack (client-only)
function useLeafletIcons() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);
}

// Debounce Hook for Autocomplete
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Component to handle clicking on the map
function LocationPicker({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const _useMapEvents = useMapEvents();
  _useMapEvents({
    click(e: LeafletMouseEvent) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to move the map when search/GPS is used
function MapController({ center }: { center: [number, number] }) {
  const _useMap = useMap();
  const map = _useMap();
  
  useEffect(() => {
    if (map) {
      map.flyTo(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

// ==========================================
// CUSTOM SVG LOGO COMPONENT
// ==========================================
const OJTLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#14b8a6" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
      </filter>
    </defs>
    
    <path 
      d="M20 4C12.268 4 6 10.268 6 18C6 25.5 20 36 20 36C20 36 34 25.5 34 18C34 10.268 27.732 4 20 4Z" 
      fill="url(#logoGradient)"
      filter="url(#shadow)"
    />
    
    <circle cx="20" cy="18" r="8" fill="white" opacity="0.95"/>
    
    <path 
      d="M16 18L18.5 20.5L24 15" 
      stroke="url(#logoGradient)" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    <circle cx="28" cy="10" r="3" fill="#fbbf24" />
  </svg>
);

// ==========================================
// SVG ICON COMPONENTS (No Emojis!)
// ==========================================

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const LockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CodeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DesktopIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const GraduationCapIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422L12 7.578l-6.16 3.422L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0 0l-3-3m3 3l3-3" />
  </svg>
);

const DollarSignIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GiftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const RocketIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 2.84m5.96 11.53L15.59 14.37m0 0L21 21M3 3l3.59 3.59m0 0A6 6 0 0014.37 9.63V4.8m-7.78 2.79L3 3m11.37 6.63L21 21" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default function CreatePostPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // INITIALIZE SUPABASE CLIENT
  const supabase = createClient();
  
  // State Management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Toast Notification System
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  useLeafletIcons();

  // ADD STATE FOR COMPANY DB ID
  const [companyDbId, setCompanyDbId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    description: '',
    skills: '',
    location: '',
    latitude: '',
    longitude: '',
    altitude: '',
    vacancies: '',
    workType: 'On-site',
    duration: '',
    preferredCourse: '',
    allowance: 'Paid' 
  });

  // Local state for current skill input value (FIX)
  const [currentSkillInput, setCurrentSkillInput] = useState('');

  // Map State - Default Center: Bacolod City
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.6633, 122.9661]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{display_name: string, lat: string, lon: string}>>([]);
  const [isLocating, setIsLocating] = useState(false);
  
  // Map Layer State (Standard / Grey / Satellite)
  const [mapLayer, setMapLayer] = useState<'standard' | 'grey' | 'satellite'>('standard');

  // Debounce the search query by 600ms
  const debouncedQuery = useDebounce(searchQuery, 600);

  // FETCH COMPANY - GETS ID (PK) + NAME
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setIsLoadingProfile(true);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Not authenticated');
          showNotification('error', 'You must be logged in.');
          return;
        }

        console.log('Fetching company for user:', user.id);

        // Changed from .single() to .maybeSingle()
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('DB Error:', error.message, error.hint, error.code);
          
          if (error.code === 'PGRST116') {
            console.warn('Company profile not found for user:', user.id);
          } else {
            showNotification('error', `Database error: ${error.message}`);
          }
          return;
        }

        // Null Handling - If no company profile exists, redirect
        if (!data || !data.id) {
          console.warn('No company profile found. Redirecting to setup...');
          showNotification('warning', 'Company profile not found. Please complete your profile first.');
          
          setTimeout(() => {
            router.push('/company_setup');
          }, 1500);
          
          return;
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.id)) {
          console.error('Invalid company ID format:', data.id);
          showNotification('error', 'Invalid company ID format. Contact support.');
          return;
        }

        // Set state with verified data
        setCompanyDbId(data.id);
        
        setFormData(prev => ({
          ...prev,
          companyName: data.company_name || 'Unnamed Company'
        }));

        console.log('Company profile loaded successfully');

      } catch (err) {
        console.error('Fetch error:', err);
        showNotification('error', err instanceof Error ? err.message : 'Failed to load company profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchCompanyData();
  }, []);

  // Helper: Show notification
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'duration') {
      const numValue = parseInt(value, 10);
      if (numValue > 1500) return;
      if (numValue < 0) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (notification) setNotification(null);
  };

  // Handle Map Click (Manual Pin Drop)
  const handleMapClick = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  // Fetch function restricted to Negros Occidental
  const fetchSearchResults = async (queryToFetch: string) => {
    if (!queryToFetch.trim() || queryToFetch.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryToFetch)}&limit=5&viewbox=122.20,9.70,123.60,11.10&bounded=1&countrycodes=ph`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // Effect that triggers automatically when typing stops
  useEffect(() => {
    fetchSearchResults(debouncedQuery);
  }, [debouncedQuery]);

  // Manual Search Submit
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchSearchResults(searchQuery);
  };

  // Select a search result
  const selectSearchResult = (result: {display_name: string, lat: string, lon: string}) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const cityName = result.display_name.split(',').slice(0, 2).join(','); 

    setFormData(prev => ({
      ...prev,
      location: cityName,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    
    setMapCenter([lat, lng]);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Handle "Locate Me" Button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showNotification('error', "Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const isWithinBounds = lat >= 9.70 && lat <= 11.10 && lng >= 122.20 && lng <= 123.60;
      
      if (!isWithinBounds) {
        showNotification('warning', "You are outside Negros Occidental. Please select a location within the province.");
        setIsLocating(false);
        return;
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const locationName = data.address.city || data.address.town || data.address.village || data.address.county || "Current Location";

        setFormData(prev => ({
          ...prev,
          location: locationName,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
      } catch (error) {
        setFormData(prev => ({
          ...prev,
          location: "My Location",
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
      }

      setMapCenter([lat, lng]);
      setIsLocating(false);
    }, (error) => {
      showNotification('error', "Unable to retrieve location. Please allow location access.");
      setIsLocating(false);
    });
  };

  // INSTANT PUBLISH - USES COMPANY DB ID (PK)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const durationNum = parseInt(formData.duration, 10);
    if (!durationNum || durationNum < 1 || durationNum > 1500) {
      showNotification('error', "Please enter a valid duration between 1 and 1500 hours.");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      showNotification('error', "Please select a location on the map before publishing.");
      return;
    }

    if (!formData.title.trim()) {
      showNotification('error', "Please enter an OJT title.");
      return;
    }

    if (!formData.description.trim()) {
      showNotification('error', "Please enter a job description.");
      return;
    }

    if (!formData.preferredCourse) {
      showNotification('error', "Please select a preferred course.");
      return;
    }

    // Check if we have the company DB ID
    if (!companyDbId) {
      showNotification('error', "Company profile not found. Please refresh.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Get user session (for logging/verification)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to publish a post.");
      }

      console.log('Publishing post...');
      console.log('   Auth User ID:', user.id);
      console.log('   Company DB ID (PK):', companyDbId);

      // Step B: Convert skills string to array
      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Allowance stays as STRING ('Paid' or 'Unpaid')
      const allowanceValue = formData.allowance;

      // PAYLOAD - company_id = DB PRIMARY KEY!
      const postData = {
        company_id: companyDbId,
        
        title: formData.title.trim(),
        description: formData.description.trim(),
        skills: skillsArray,
        
        location_name: formData.location,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        vacancies: parseInt(formData.vacancies) || 1,
        work_type: formData.workType,
        duration_hours: durationNum,
        allowance_type: allowanceValue,
        course_category: formData.preferredCourse,
        
        status: 'active',
        created_at: new Date().toISOString(),
      };

      console.log('Final Payload:', postData);

      // Step D: Insert into Supabase
      const { error: insertError } = await supabase
        .from('ojt_posts')
        .insert([postData]);

      if (insertError) {
        console.error("Insert Error:", insertError);
        
        if (insertError.code === '23503') {
          throw new Error("Foreign Key error: Company ID not found in companies table.");
        }
        
        throw new Error(insertError.message || "Failed to save post");
      }

      // SUCCESS!
      showNotification('success', "OJT Post published successfully!");
      
      setTimeout(() => {
        router.push('/company_ojtpost');
      }, 1500);
      
    } catch (err: any) {
      console.error("Error:", err);
      showNotification('error', err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased overflow-x-hidden">
      
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] max-w-md animate-slide-in`}>
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-sm ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="shrink-0 mt-0.5">
              {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
              {notification.type === 'warning' && <AlertTriangleIcon className="w-5 h-5 text-amber-600" />}
              {notification.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-600" />}
            </span>
            <p className="text-sm font-medium flex-1">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="text-current opacity-40 hover:opacity-100 transition-opacity shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar --- */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto`}>
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
            <OJTLogo className="w-8 h-8" />
            <span>OJTly</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            Dashboard
          </Link>
          
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            My OJT Posts
          </Link>

          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-white bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg font-medium shadow-sm shadow-teal-200">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Create Post
          </Link>

          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Applicants
          </Link>

          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            Documents
          </Link>

          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
           <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors w-full">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log out
           </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="lg:ml-64 min-h-screen w-full lg:w-[calc(100%-16rem)]">
        
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16 w-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2 shrink-0">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800 truncate">Create Post</h1>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">A</div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">New OJT Opportunity</h2>
                  <p className="text-sm text-slate-500 mt-1">Fill in the details below to publish.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Instant Publish
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">OJT Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="title" 
                  placeholder="e.g. Web Developer Intern" 
                  className={`w-full border rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:border-transparent outline-none transition ${
                    notification?.type === 'error' && !formData.title ? 'border-red-300 focus:ring-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                  }`} 
                  value={formData.title} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Name
                </label>
                
                <div className="relative rounded-xl border border-teal-300 bg-teal-50/50 overflow-hidden">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CheckCircleIcon className="w-5 h-5 text-teal-600" />
                  </div>

                  <input
                    type="text"
                    value={formData.companyName}
                    disabled
                    readOnly
                    className="w-full pl-11 pr-20 py-3 font-medium text-teal-800 bg-transparent outline-none cursor-not-allowed"
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-bold text-teal-700">
                      <LockIcon className="w-3 h-3" />
                      Locked
                    </span>
                  </div>
                </div>
                
                <p className="mt-1.5 text-xs text-slate-400">Auto-filled from your account</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea 
                  name="description" 
                  rows={5} 
                  placeholder="Describe the internship role, responsibilities, and what the student will learn..." 
                  className={`w-full border rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:border-transparent outline-none transition resize-none ${
                    notification?.type === 'error' && !formData.description ? 'border-red-300 focus:ring-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                  }`} 
                  value={formData.description} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* ENHANCED SKILLS INPUT WITH TAGS (FIXED) */}
                <div>
                  <label className="flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0L21 7.777M5.636 20.365l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      Required Skills
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-md border border-slate-200">
                      OPTIONAL
                    </span>
                  </label>
                  
                  <div className="relative">
                    <div 
                      onClick={() => document.getElementById('skills-input')?.focus()}
                      className={`min-h-[52px] w-full border-2 rounded-xl px-3 py-2.5 bg-white transition-all cursor-text flex flex-wrap items-center gap-2 ${
                        formData.skills ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {formData.skills.split(',').filter(s => s.trim()).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-800 text-sm font-medium rounded-lg border border-teal-200 shadow-sm animate-fade-in"
                        >
                          <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {skill.trim()}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const skillsArray = formData.skills.split(',').filter(s => s.trim());
                              skillsArray.splice(index, 1);
                              setFormData(prev => ({ ...prev, skills: skillsArray.join(', ') }));
                            }}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-teal-200/50 transition-colors group"
                          >
                            <svg className="w-3.5 h-3.5 text-teal-400 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      ))}
                      
                      <input
                        id="skills-input"
                        type="text"
                        name="skills"
                        placeholder={!formData.skills ? 'Type a skill and press Enter...' : 'Add another skill...'}
                        value={currentSkillInput}
                        onChange={(e) => setCurrentSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = currentSkillInput.trim();
                            if (value) {
                              setFormData(prev => ({ 
                                ...prev, 
                                skills: prev.skills ? `${prev.skills}, ${value}` : value 
                              }));
                              setCurrentSkillInput('');
                            }
                          }
                          if (e.key === 'Backspace' && !currentSkillInput && formData.skills) {
                            const skillsArray = formData.skills.split(',').filter(s => s.trim());
                            skillsArray.pop();
                            setFormData(prev => ({ ...prev, skills: skillsArray.join(', ') }));
                          }
                        }}
                        className="flex-1 min-w-[140px] outline-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 py-1"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 px-1">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Press Enter or comma to add skill
                      </p>
                      {formData.skills && (
                        <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                          {formData.skills.split(',').filter(s => s.trim()).length} skill{formData.skills.split(',').filter(s => s.trim()).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Location <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="location" 
                    placeholder="Search or click map below" 
                    className={`w-full border rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:border-transparent outline-none transition ${
                      notification?.type === 'error' && !formData.location ? 'border-red-300 focus:ring-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                    }`} 
                    value={formData.location} 
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Latitude</label>
                  <input 
                    type="text" 
                    name="latitude" 
                    placeholder="Auto-fills from map" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none transition" 
                    value={formData.latitude} 
                    readOnly 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Longitude</label>
                  <input 
                    type="text" 
                    name="longitude" 
                    placeholder="Auto-fills from map" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none transition" 
                    value={formData.longitude} 
                    readOnly 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Vacancies</label>
                  <input 
                    type="number" 
                    name="vacancies" 
                    placeholder="e.g. 3" 
                    min="1" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" 
                    value={formData.vacancies} 
                    onChange={handleChange} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Work Type</label>
                  <select 
                    name="workType" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none cursor-pointer" 
                    value={formData.workType} 
                    onChange={handleChange}
                  >
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (Hours) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    name="duration" 
                    placeholder="Min: 1, Max: 1500" 
                    min="1" 
                    max="1500" 
                    className={`w-full border rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:border-transparent outline-none transition ${
                      notification?.type === 'error' && (!formData.duration || parseInt(formData.duration) < 1 || parseInt(formData.duration) > 1500) ? 'border-red-300 focus:ring-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                    }`} 
                    value={formData.duration} 
                    onChange={handleChange} 
                    required 
                  />
                </div>

                {/* PREFERRED COURSE - SELECTABLE DROPDOWN */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Preferred Course <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="preferredCourse"
                    value={formData.preferredCourse}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:border-transparent outline-none transition appearance-none cursor-pointer ${
                      notification?.type === 'error' && !formData.preferredCourse ? 'border-red-300 focus:ring-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500'
                    }`}
                    required
                  >
                    <option value="" disabled>Select course...</option>
                    <option value="BSCS">BSCS - Bachelor of Science in Computer Science</option>
                    <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                    <option value="Both">Both BSCS & BSIT</option>
                    <option value="Any IT Course">Any IT Related Course</option>
                  </select>
                  
                  {formData.preferredCourse && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {formData.preferredCourse === 'BSCS' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                          <CodeIcon className="w-3.5 h-3.5" />
                          BSCS
                        </span>
                      )}
                      {formData.preferredCourse === 'BSIT' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-200">
                          <DesktopIcon className="w-3.5 h-3.5" />
                          BSIT
                        </span>
                      )}
                      {formData.preferredCourse === 'Both' && (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                            <CodeIcon className="w-3.5 h-3.5" />
                            BSCS
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-200">
                            <DesktopIcon className="w-3.5 h-3.5" />
                            BSIT
                          </span>
                        </>
                      )}
                      {formData.preferredCourse === 'Any IT Course' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">
                          <GraduationCapIcon className="w-3.5 h-3.5" />
                          Any IT Course
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Allowance Field */}
                <div className="sm:col-span-2">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Allowance Type</label>
                   <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm ${formData.allowance === 'Paid' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="allowance" value="Paid" checked={formData.allowance === 'Paid'} onChange={handleChange} className="sr-only" />
                        {formData.allowance === 'Paid' ? <CheckIcon className="w-5 h-5 shrink-0 text-emerald-600" /> : <DollarSignIcon className="w-5 h-5 shrink-0 text-slate-400" />}
                        <span>Paid / With Allowance</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm ${formData.allowance === 'Unpaid' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="allowance" value="Unpaid" checked={formData.allowance === 'Unpaid'} onChange={handleChange} className="sr-only" />
                        {formData.allowance === 'Unpaid' ? <CheckIcon className="w-5 h-5 shrink-0 text-orange-600" /> : <GiftIcon className="w-5 h-5 shrink-0 text-slate-400" />}
                        <span>Unpaid / Volunteer</span>
                      </label>
                   </div>
                </div>

                {/* Embedded Map with Layer Switcher */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="inline-flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-teal-600" />
                      Pin Exact Location on Map
                    </span>
                    <span className="text-teal-600 font-normal ml-1">(Negros Occidental Only)</span>
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mb-2 w-full">
                    <div className="flex flex-1 gap-2 w-full" role="search" aria-label="Search location">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch();
                          }
                        }}
                        placeholder="Search places in Negros Occidental..."
                        className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                      />
                      <button type="button" onClick={() => handleSearch()} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium text-sm whitespace-nowrap shrink-0">
                        Search
                      </button>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleLocateMe} 
                      disabled={isLocating}
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                    >
                      {isLocating ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1"></path></svg>
                      )}
                      <span className="hidden sm:inline">Locate Me</span>
                      <span className="sm:inline hidden">Locate</span>
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl bg-white shadow-lg mb-2 max-h-48 overflow-y-auto z-20 relative">
                      {searchResults.map((result, index) => (
                        <button 
                          key={index} 
                          type="button"
                          onClick={() => selectSearchResult(result)}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-0 transition text-sm text-slate-700 flex items-start gap-3"
                        >
                          <svg className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          <span className="break-words">{result.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* MAP CONTAINER WITH LAYER SWITCHER */}
                  <div className={`border rounded-xl overflow-hidden shadow-sm relative w-full ${notification?.type === 'error' && (!formData.latitude || !formData.longitude) ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`} style={{ minHeight: '350px', height: '400px', maxHeight: '500px' }}>
                    
                    {/* LAYER SWITCHER BUTTONS */}
                    <div className="absolute top-3 right-3 z-[1000] flex gap-1.5 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setMapLayer('standard')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mapLayer === 'standard' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        🗺️ Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapLayer('grey')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mapLayer === 'grey' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        🎨 Grey
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapLayer('satellite')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mapLayer === 'satellite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        🛰️ Satellite
                      </button>
                    </div>
                    
                    <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-10" style={{ width: '100%', height: '100%' }} scrollWheelZoom={true} zoomControl={true}>
                      
                      {/* DYNAMIC TILE LAYER BASED ON SELECTION */}
                      <TileLayer 
                        attribution='&amp;copy; &lt;a href=&quot;https://www.openstreetmap.org/copyright&quot;&gt;OpenStreetMap&lt;/a&gt; contributors' 
                        url={
                          mapLayer === 'standard' 
                            ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                            : mapLayer === 'grey'
                            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                            : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        }
                      />
                      
                      {/* LABEL OVERLAY FOR SATELLITE VIEW */}
                      {mapLayer === 'satellite' && (
                       // ✅ CORRECT: Removed invalid 'transparent' prop
<TileLayer 
  attribution='&amp;copy; &lt;a href=&quot;https://www.openstreetmap.org/copyright&quot;&gt;OpenStreetMap&lt;/a&gt; contributors' 
  url='https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
  zIndex={1000}
/>
                      )}
                      
                      <MapController center={mapCenter} />
                      <LocationPicker onMapClick={handleMapClick} />
                      
                      {formData.latitude && formData.longitude && (
                        <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}></Marker>
                      )}
                    </MapContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 italic">* Click on the map or use search to pin your location</p>
                </div>

              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.back()} 
                disabled={isSubmitting} 
                className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all order-2 sm:order-1 disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  </>
                ) : (
                  <>
                    <RocketIcon className="w-5 h-5" />
                    Publish Instantly
                  </>
                )}
              </button>
            </div>

          </form>
          
          {/* Info Box */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-semibold">Instant Publish Mode</p>
              <p className="mt-0.5">Your post will be <strong>immediately visible</strong> to all students once published!</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2 ease-out; }
      `}</style>
    </div>
  );  
}