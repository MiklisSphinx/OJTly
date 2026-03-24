'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Job } from '@/lib/recommendation';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

type MapProps = {
  jobs: Job[];
};

export default function Map({ jobs }: MapProps) {
  return (
    <MapContainer 
      center={[10.7200, 122.9500]} 
      zoom={13} // Slightly zoomed in
      scrollWheelZoom={true} 
      className="h-screen w-full" // Full screen height
      zoomControl={false} // Optional: hide default zoom buttons for cleaner look
    >
      <TileLayer
        // Using a slightly cleaner tile style
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {jobs.map((job) => (
        <Marker key={job.id} position={[job.lat, job.lng]}>
          <Popup className="custom-popup">
            <div className="w-56 p-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{job.title}</h3>
                  <p className="text-sm text-slate-500">{job.company}</p>
                </div>
              </div>
              
              <div className="flex gap-1 mb-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                  {job.mode}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                  {job.role}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-green-600">₱{job.salary.toLocaleString()}</span>
                <button className="text-xs font-bold text-blue-600 hover:underline">
                  View Details →
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}