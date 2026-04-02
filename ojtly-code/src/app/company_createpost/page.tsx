'use client';

import { useEffect, useState } from 'react';
import type { LeafletMouseEvent } from 'leaflet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

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
  map.flyTo(center, map.getZoom());
  return null;
}

export default function CreatePostPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useLeafletIcons();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    companyName: 'ABC Company',
    description: '',
    skills: '',
    location: '',
    latitude: '',
    longitude: '',
    altitude: '',
    vacancies: '',
    workType: 'On-site',
    duration: '',
    preferredCourse: 'BSCS',
    allowance: 'Paid' 
  });

  // Map State - Changed Default Center to Bacolod City (Negros Occidental)
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.6633, 122.9661]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{display_name: string, lat: string, lon: string}>>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Debounce the search query by 600ms
  const debouncedQuery = useDebounce(searchQuery, 600);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'duration') {
      const numValue = parseInt(value, 10);
      if (numValue > 1500) return;
      if (numValue < 0) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
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
      // ADDED: viewbox (Left, Bottom, Right, Top) & bounded=1 & countrycodes=ph
      // This strictly limits results to inside the Negros Occidental boundary box
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
    // Clean up the display name to remove "Negros Occidental" or "Philippines" if you want just the city/barangay
    const cityName = result.display_name.split(',').slice(0, 2).join(','); 

    setFormData(prev => ({
      ...prev,
      location: cityName,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    
    setMapCenter([lat, lng]);
    setSearchResults([]); // Close dropdown
    setSearchQuery('');   // Clear search bar
  };

  // Handle "Locate Me" Button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Check if user is actually within Negros Occidental bounds
      const isWithinBounds = lat >= 9.70 && lat <= 11.10 && lng >= 122.20 && lng <= 123.60;
      
      if (!isWithinBounds) {
        alert("You are currently outside of Negros Occidental. Please select a location within the province on the map.");
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
      alert("Unable to retrieve your location. Please allow location access.");
      setIsLocating(false);
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const durationNum = parseInt(formData.duration, 10);
    if (!durationNum || durationNum < 1 || durationNum > 1500) {
      alert("Please enter a valid duration between 1 and 1500 hours.");
      return;
    }

    console.log("Publishing Post:", formData);
    alert("OJT Post Published Successfully!");
    router.push('/company_main');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar --- */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </Link>
          
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            My OJT Posts
          </Link>

          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Create Post
          </Link>

          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Applicants
          </Link>

          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Documents
          </Link>

          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
           <button onClick={() => router.push('/')} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 rounded-lg font-medium transition-colors w-full text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Log out
           </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="lg:ml-64 min-h-screen">
        
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-16">
          <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg mr-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <h1 className="text-lg font-bold text-slate-800">Create Post</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">A</div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">New OJT Opportunity</h2>
              <p className="text-sm text-slate-500 mt-1">Fill in the details below to post a new internship opportunity.</p>
            </div>

            <div className="p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">OJT Title</label>
                <input type="text" name="title" placeholder="e.g. Web Developer Intern" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.title} onChange={handleChange} required />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Company Name</label>
                  <span className="text-xs text-slate-400 italic">Auto-filled from account</span>
                </div>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500">{formData.companyName}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea name="description" rows={5} placeholder="Describe the internship role..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none" value={formData.description} onChange={handleChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Required Skills</label>
                  <input type="text" name="skills" placeholder="e.g. HTML, CSS, JavaScript" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.skills} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Location <span className="text-red-500">*</span></label>
                  <input type="text" name="location" placeholder="Search or click map below" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.location} onChange={handleChange} required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Latitude</label>
                  <input type="number" name="latitude" placeholder="Auto-fills from map" step="any" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none transition" value={formData.latitude} onChange={handleChange} readOnly />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Longitude</label>
                  <input type="number" name="longitude" placeholder="Auto-fills from map" step="any" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none transition" value={formData.longitude} onChange={handleChange} readOnly />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Altitude (meters)</label>
                  <input type="number" name="altitude" placeholder="e.g. 12" step="any" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.altitude} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Vacancies</label>
                  <input type="number" name="vacancies" placeholder="e.g. 3" min="1" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.vacancies} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Work Type</label>
                  <select name="workType" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none" value={formData.workType} onChange={handleChange}>
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (Hours)</label>
                  <input type="number" name="duration" placeholder="Min: 1, Max: 1500" min="1" max="1500" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" value={formData.duration} onChange={handleChange} required />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Preferred Course</label>
                    <span className="text-xs text-slate-400 italic">Locked</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500">{formData.preferredCourse}</div>
                </div>

                {/* Allowance Field */}
                <div className="md:col-span-2">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Allowance</label>
                   <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm ${formData.allowance === 'Paid' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="allowance" value="Paid" checked={formData.allowance === 'Paid'} onChange={handleChange} className="sr-only" />
                        {formData.allowance === 'Paid' ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>)}
                        <span>Paid / With Allowance</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer border-2 transition-all font-medium text-sm ${formData.allowance === 'Unpaid' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="radio" name="allowance" value="Unpaid" checked={formData.allowance === 'Unpaid'} onChange={handleChange} className="sr-only" />
                        {formData.allowance === 'Unpaid' ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>)}
                        <span>Unpaid</span>
                      </label>
                   </div>
                </div>

                {/* Embedded Map strictly for Negros Occidental */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pin Exact Location on Map (Negros Occidental Only)</label>
                  
                  <div className="flex gap-2 mb-2">
                    <div className="flex flex-1 gap-2" role="search" aria-label="Search location">
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
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                      />
                      <button type="button" onClick={() => handleSearch()} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-sm">
                        Search
                      </button>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleLocateMe} 
                      disabled={isLocating}
                      className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1"></path></svg>
                      )}
                      Locate Me
                    </button>
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl bg-white shadow-lg mb-2 max-h-48 overflow-y-auto z-20 relative">
                      {searchResults.map((result, index) => (
                        <button 
                          key={index} 
                          type="button"
                          onClick={() => selectSearchResult(result)}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-0 transition text-sm text-slate-700 flex items-start gap-3"
                        >
                          <svg className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          <span>{result.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Map Container - STRICTLY LOCKED TO NEGROS OCCIDENTAL */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
                    <MapContainer 
                      center={mapCenter} 
                      zoom={10} 
                      className="h-80 w-full z-10"
                      maxBounds={[[9.6, 122.1], [11.2, 123.7]]} // Strict boundary coordinates
                      maxBoundsViscosity={1.0} // Prevents user from dragging outside bounds
                      minZoom={9} // Prevents zooming out too far
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapController center={mapCenter} />
                      <LocationPicker onMapClick={handleMapClick} />
                      {formData.latitude && formData.longitude && (
                        <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}></Marker>
                      )}
                    </MapContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 italic">* Map and search are restricted to Negros Occidental only.</p>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button type="submit" className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-xl shadow-md hover:bg-teal-700 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Publish OJT Post
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}