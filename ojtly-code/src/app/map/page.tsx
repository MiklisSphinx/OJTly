'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';

// ✅ Singleton Supabase client — prevents auth "amnesia"
// The module-level createClient(URL, KEY) was creating a SEPARATE instance
// that didn't share cookies/localStorage with the auth context.
// This singleton ensures every call returns the SAME client instance.
import { createClient } from '@/utils/supabase/client';

// ═══════════════════════════════════════════════════════════════════════
// ❌ DELETED — This was the root cause of the "amnesia":
//
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
//
// It created a NEW client at module-eval time, in a different JS context
// than the one used by Next.js middleware and server auth helpers.
// Result: getSession() returns null even though the user is logged in.
// ═══════════════════════════════════════════════════════════════════════

// ⚠️⚠️⚠️ MIK - RLS CHECK REQUIRED ⚠️⚠️⚠️
// Run this in Supabase SQL Editor if profile fetch returns null:
//
// CREATE POLICY "Users can read own profile" ON profiles
//   FOR SELECT USING (auth.uid() = id);

interface OJTPost {
  id: string;
  title?: string;
  company_name?: string;
  location_name?: string;
  description?: string;
  latitude: number;
  longitude: number;
  required_skills?: string[] | string;
  salary_range?: string;
  vacancies?: number | string;
  work_type?: string;
  work_mode?: string;
  duration_hours?: number | string;
  allowance_type?: string;
  status?: string;
  category?: string;
  deadline?: string;
  company_logo_url?: string;
  created_at?: string;
  user_id?: string;
  location?: string;
  skills?: string[] | string;
  course_category?: string;
}

interface StudentProfile {
  id: string;
  skills: string[];
  course?: string;
  full_name?: string;
  avatar_url?: string;
}

interface JobWithKNN extends OJTPost {
  knn: {
    score: number;
    distance: number;
    skillMatch: number;
    travelTime: { walking: number; motorcycle: number; car: number };
  };
  _distance?: number;
  _travelMins?: number;
  _skillMatch?: number;
  _knnScore?: number;
  _courseMatch?: boolean;
}

type TravelMode = 'walking' | 'motorcycle' | 'car';
type MapStyle = 'light' | 'satellite';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseSkillsArray(skillsData: unknown): string[] {
  if (Array.isArray(skillsData)) return skillsData.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  if (typeof skillsData === 'string' && skillsData.trim()) {
    const t = skillsData.trim();
    if (t.startsWith('{') && t.endsWith('}')) return t.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    if (t.startsWith('[')) { try { const p = JSON.parse(t); if (Array.isArray(p)) return p.filter((s): s is string => typeof s === 'string' && s.trim() !== ''); } catch { /* */ } }
    return t.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function calculateSkillMatch(postSkillsRaw: unknown, studentSkills: string[]): {
  matchPercentage: number; intersectingCount: number; totalRequired: number; matchedSkills: string[]
} {
  const postSkills = parseSkillsArray(postSkillsRaw);
  if (postSkills.length === 0) return { matchPercentage: 0, intersectingCount: 0, totalRequired: 0, matchedSkills: [] };
  if (!studentSkills || studentSkills.length === 0) return { matchPercentage: 0, intersectingCount: 0, totalRequired: postSkills.length, matchedSkills: [] };
  const matched = postSkills.filter(ps => studentSkills.some(s => s.toLowerCase().trim() === ps.toLowerCase().trim()));
  return { matchPercentage: Math.round((matched.length / postSkills.length) * 100), intersectingCount: matched.length, totalRequired: postSkills.length, matchedSkills: matched };
}

function getKNNScore(post: OJTPost, loc: { lat: number; lng: number }, studentSkills: string[], studentCourse?: string): NonNullable<JobWithKNN['knn']> & { courseMatch: boolean } {
  const dist = haversineDistance(loc.lat, loc.lng, post.latitude, post.longitude);
  const skillResult = calculateSkillMatch(post.skills || post.required_skills, studentSkills);
  let courseMatch = false;
  if (studentCourse && post.course_category) {
    const n1 = studentCourse.toLowerCase().trim(), n2 = post.course_category.toLowerCase().trim();
    courseMatch = n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }
  return {
    score: Math.round(Math.max(0, 50 - dist) + skillResult.matchPercentage * 0.5 + (courseMatch ? 10 : 0)),
    distance: Math.round(dist * 10) / 10,
    skillMatch: skillResult.matchPercentage,
    travelTime: { walking: Math.round((dist / 5) * 60), motorcycle: Math.round((dist / 30) * 60), car: Math.round((dist / 25) * 60) },
    courseMatch
  };
}

function getMarkerColor(score: number): { bg: string; border: string; shadow: string } {
  if (score >= 70) return { bg: '#10b981', border: '#059669', shadow: 'rgba(16,185,129,0.4)' };
  if (score >= 45) return { bg: '#3b82f6', border: '#2563eb', shadow: 'rgba(59,130,246,0.4)' };
  return { bg: '#94a3b8', border: '#64748b', shadow: 'rgba(148,163,184,0.4)' };
}

function getMarkerSize(score: number, isSelected: boolean): number {
  if (isSelected) return 44;
  if (score >= 70) return 36;
  if (score >= 45) return 28;
  return 24;
}

const OSRM_PROFILES: Record<TravelMode, string> = { walking: 'foot', motorcycle: 'motorcycle', car: 'car' };
const ROUTE_STYLES: Record<TravelMode, { color: string; weight: number; dash: string }> = {
  walking: { color: '#3b82f6', weight: 5, dash: '8,8' },
  motorcycle: { color: '#f59e0b', weight: 6, dash: '' },
  car: { color: '#ef4444', weight: 6, dash: '' }
};
const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; options: Record<string, unknown> }> = {
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OSM &copy; CARTO', options: { maxZoom: 20, subdomains: 'abcd' } },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri', options: { maxZoom: 19 } }
};

function createStudentMarkerSVG(isTracking: boolean = false): string {
  const c = isTracking ? '#10b981' : '#3b82f6';
  return `<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg"><defs><filter id="sg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="sp" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${c}" stop-opacity="${isTracking ? '0.5' : '0.35'}"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="22" cy="22" r="20" fill="url(#sp)"><animate attributeName="r" values="14;${isTracking ? '28' : '26'};14" dur="${isTracking ? '1.5' : '2'}s" repeatCount="indefinite"/><animate attributeName="opacity" values="${isTracking ? '0.7' : '0.6'};0;${isTracking ? '0.7' : '0.6'}" dur="${isTracking ? '1.5' : '2'}s" repeatCount="indefinite"/></circle><circle cx="22" cy="22" r="16" fill="${c}" stroke="#fff" strokeWidth="3" filter="url(#sg)"/><g transform="translate(22,19)"><circle cx="0" cy="-4" r="4" fill="#fff"/><path d="M-7 9Q-7 1 0 1Q7 1 7 9L7 11-7 11Z" fill="#fff"/></g><path d="M22 38L28 53C28 55 16 55 16 53Z" fill="${c}" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"/>${isTracking ? `<g transform="translate(30,8)"><circle cx="6" cy="6" r="8" fill="#10b981" stroke="#fff" strokeWidth="2"/><path d="M6 3L6 9M3 6L9 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></g>` : ''}</svg>`;
}

function createCompanyMarkerSVG(initial: string, score: number, isSelected: boolean): string {
  const colors = getMarkerColor(score);
  const size = isSelected ? 44 : getMarkerSize(score, false);
  const fs = isSelected ? 18 : score >= 70 ? 14 : 12;
  return `<svg width="${size}" height="${size + 14}" viewBox="0 0 ${size} ${size + 14}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="cs-${score}-${isSelected}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${colors.shadow}" flood-opacity="0.6"/></filter><linearGradient id="cg-${score}-${isSelected}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${colors.bg}"/><stop offset="100%" stop-color="${colors.border}"/></linearGradient></defs>${isSelected ? `<ellipse cx="${size / 2}" cy="${size / 2 + 2}" rx="${size / 2 + 4}" ry="${size / 2 + 6}" fill="${colors.shadow}" opacity="0.3"><animate attributeName="rx" values="${size / 2 + 4};${size / 2 + 6};${size / 2 + 4}" dur="2s" repeatCount="indefinite"/></ellipse>` : ''}<path d="M${size / 2} ${size + 14}L${size + 4} ${size / 2 + 4}Q${size + 4} 4 ${size / 2} 4Q0 4 0 ${size / 2 + 4}Z" fill="url(#cg-${score}-${isSelected})" stroke="${isSelected ? '#fff' : colors.border}" strokeWidth="${isSelected ? 3 : 2}" filter="url(#cs-${score}-${isSelected})"/><text x="${size / 2}" y="${size / 2 + 6}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="system-ui,sans-serif" font-weight="${isSelected ? '800' : '700'}" font-size="${fs}">${initial.toUpperCase()}</text>${isSelected ? `<circle cx="${size - 2}" cy="6" r="8" fill="${colors.bg}" stroke="#fff" stroke-width="2"><animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite"/></circle><text x="${size - 2}" y="7" text-anchor="middle" dominant-baseline="middle" fill="#fff" fontWeight="900" font-size="9">★</text>` : ''}</svg>`;
}

// ─── PURE PROP-DRIVEN MAP COMPONENT ─────────────────────────────────────
interface MapComponentProps {
  posts: OJTPost[];
  selectedPostId?: string | null;
  studentLocation: { lat: number; lng: number };
  studentSkills: string[];
  studentCourse?: string;
  userId?: string;
  travelMode: TravelMode;
  onPostSelect: (post: OJTPost) => void;
  showDirections: boolean;
  targetPost: { lat: number; lng: number } | null;
  mapStyle: MapStyle;
  isTracking: boolean;
  onRecenter: () => void;
  gpsAccuracy?: number;
  fitBoundsTrigger?: number;
}

function MapComponent({
  posts, selectedPostId, studentLocation, studentSkills, studentCourse, userId,
  travelMode, onPostSelect, showDirections, targetPost,
  mapStyle, isTracking, onRecenter, gpsAccuracy, fitBoundsTrigger = 0
}: MapComponentProps): React.ReactElement {
  const [L, setL] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const mapRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const studentMarkerRef = useRef<unknown>(null);
  const routeLineRef = useRef<unknown>(null);
  const lightLayerRef = useRef<unknown>(null);
  const satelliteLayerRef = useRef<unknown>(null);
  const prevPosRef = useRef<{ lat: number; lng: number }>(studentLocation);
  const animationFrameRef = useRef<number | null>(null);
  const prevFitRef = useRef<number>(0);

  const postsWithKNN = useMemo((): JobWithKNN[] => {
    return posts.map(p => {
      const r = getKNNScore(p, studentLocation, studentSkills, studentCourse);
      return { ...p, knn: { score: r.score, distance: r.distance, skillMatch: r.skillMatch, travelTime: r.travelTime }, _courseMatch: r.courseMatch };
    }).sort((a, b) => b.knn.skillMatch !== a.knn.skillMatch ? b.knn.skillMatch - a.knn.skillMatch : b.knn.score !== a.knn.score ? b.knn.score - a.knn.score : a.knn.distance - b.knn.distance);
  }, [posts, studentLocation, studentSkills, studentCourse]);

  const generatePopup = useCallback((post: JobWithKNN): string => {
    const colors = getMarkerColor(post.knn.score);
    const matchLabel = userId ? `${post.knn.skillMatch}% Skills Match` : 'Sign in to see match';
    return `<div style="font-family:system-ui,sans-serif;min-width:220px;max-width:280px;padding:0;border-radius:16px;overflow:hidden;background:white;box-shadow:0 10px 25px rgba(0,0,0,0.15);"><div style="background:linear-gradient(135deg,${colors.bg},${colors.border});padding:14px;"><h3 style="margin:0;color:white;font-size:15px;font-weight:800;line-height:1.3;">${post.location_name || post.title || post.company_name || 'OJT Post'}</h3><div style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;background:rgba(255,255,255,0.25);padding:4px 12px;border-radius:20px;"><span style="color:white;font-size:12px;font-weight:800;">🎯 ${matchLabel}</span></div></div><div style="padding:12px;background:#fafbfc;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;"><div style="background:white;padding:8px;border-radius:10px;border:1px solid #e5e7eb;"><div style="font-size:9px;color:#9ca3af;font-weight:700;margin-bottom:2px;">Slots</div><div style="font-size:14px;font-weight:800;color:#1f2937;">${post.vacancies ?? 'N/A'}</div></div><div style="background:white;padding:8px;border-radius:10px;border:1px solid #e5e7eb;"><div style="font-size:9px;color:#9ca3af;font-weight:700;margin-bottom:2px;">Distance</div><div style="font-size:12px;font-weight:700;color:${colors.bg};">${userId ? post.knn.distance + ' km' : 'N/A'}</div></div></div><div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to right,#f0fdf4,#fff);padding:8px 12px;border-radius:10px;border:1px solid #bbf7d0;"><span style="font-size:11px;color:#166534;font-weight:600;">⏱ Duration</span><span style="font-size:13px;font-weight:800;color:#15803d;">${post.duration_hours || 'TBA'} hrs</span></div></div><div style="padding:12px;padding-top:0;text-align:center;"><button onclick="window.seeMoreDetailsClicked()" style="width:100%;padding:11px;background:linear-gradient(to right,#f8fafc,#f1f5f9);border:2px solid #e2e8f0;border-radius:12px;font-weight:700;color:#475569;font-size:13px;cursor:pointer;font-family:system-ui,sans-serif;" onmouseover="this.style.borderColor='#93c5fd';this.style.color='#2563eb'" onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#475569'">See More Details →</button></div></div>`;
  }, [userId]);

  useEffect(() => {
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([m]) => { setL(m.default || m); setLoaded(true); });
  }, []);

  useEffect(() => {
    const La = L as any;
    if (!containerRef.current || mapRef.current || !La || typeof window === 'undefined') return;
    const map = La.map(containerRef.current, { center: [studentLocation.lat, studentLocation.lng], zoom: 14, zoomControl: false, attributionControl: false, preferCanvas: true });
    lightLayerRef.current = La.tileLayer(TILE_LAYERS.light.url, { ...TILE_LAYERS.light.options }).addTo(map);
    satelliteLayerRef.current = La.tileLayer(TILE_LAYERS.satellite.url, { ...TILE_LAYERS.satellite.options });
    La.control.zoom({ position: 'bottomleft' }).addTo(map);
    mapRef.current = map;
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      markersRef.current.forEach(m => (m as { remove(): void }).remove());
      markersRef.current.clear();
      if (studentMarkerRef.current) { (studentMarkerRef.current as { remove(): void }).remove(); studentMarkerRef.current = null; }
      const ma = map as any;
      if (routeLineRef.current) { ma.removeLayer(routeLineRef.current); routeLineRef.current = null; }
      if (lightLayerRef.current) ma.removeLayer(lightLayerRef.current);
      if (satelliteLayerRef.current) ma.removeLayer(satelliteLayerRef.current);
      ma.remove(); mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  useEffect(() => {
    const La = L as any, map = mapRef.current as any;
    if (!map || !La) return;
    if (fitBoundsTrigger > prevFitRef.current) {
      prevFitRef.current = fitBoundsTrigger;
      const pts: [number, number][] = [[studentLocation.lat, studentLocation.lng]];
      if (targetPost) pts.push([targetPost.lat, targetPost.lng]);
      else posts.forEach(p => { if (typeof p.latitude === 'number' && typeof p.longitude === 'number') pts.push([p.latitude, p.longitude]); });
      if (pts.length >= 2) { try { map.fitBounds(La.latLngBounds(pts), { padding: [60, 60], maxZoom: selectedPostId ? 17 : 15, animate: true, duration: 0.8 }); } catch { /* */ } }
      else map.setView([studentLocation.lat, studentLocation.lng], 14, { animate: true });
    }
  }, [fitBoundsTrigger, L, studentLocation, targetPost, selectedPostId, posts]);

  useEffect(() => {
    const map = mapRef.current as any;
    if (!map || !lightLayerRef.current || !satelliteLayerRef.current) return;
    if (mapStyle === 'satellite') { if (!map.hasLayer(satelliteLayerRef.current)) map.addLayer(satelliteLayerRef.current); if (map.hasLayer(lightLayerRef.current)) map.removeLayer(lightLayerRef.current); }
    else { if (!map.hasLayer(lightLayerRef.current)) map.addLayer(lightLayerRef.current); if (map.hasLayer(satelliteLayerRef.current)) map.removeLayer(satelliteLayerRef.current); }
  }, [mapStyle]);

  useEffect(() => {
    const La = L as any, map = mapRef.current as any;
    if (!map || !La || typeof window === 'undefined') return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const newPos = studentLocation;
    if (!studentMarkerRef.current) {
      studentMarkerRef.current = La.marker([newPos.lat, newPos.lng], {
        icon: La.divIcon({ html: createStudentMarkerSVG(isTracking), className: 'student-marker-animated', iconSize: [44, 56], iconAnchor: [22, 56], popupAnchor: [0, -48] }),
        zIndexOffset: 9999
      }).bindPopup(`<div style="font-family:system-ui,sans-serif;padding:8px;text-align:center;min-width:120px;"><strong style="color:#1e40af;font-size:12px;">${isTracking ? '📍 Tracking Active' : 'Your Location'}</strong><br/><span style="color:#6b7280;font-size:10px;">${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}</span></div>`, { closeButton: false, className: 'custom-popup', maxWidth: 180 }).addTo(map);
      prevPosRef.current = newPos;
    } else {
      const t0 = performance.now(), dur = 600, sLat = prevPosRef.current.lat, sLng = prevPosRef.current.lng;
      const mk = studentMarkerRef.current as any;
      const step = (t: number) => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        mk.setLatLng([sLat + ((newPos.lat - sLat) * e), sLng + ((newPos.lng - sLng) * e)]);
        if (p < 1) animationFrameRef.current = requestAnimationFrame(step);
        else { mk.setLatLng([newPos.lat, newPos.lng]); prevPosRef.current = newPos; animationFrameRef.current = null; }
      };
      animationFrameRef.current = requestAnimationFrame(step);
    }
    const currentIds = new Set(posts.map(p => p.id));
    markersRef.current.forEach((m, id) => { if (!currentIds.has(id)) { (m as { remove(): void }).remove(); markersRef.current.delete(id); } });
    postsWithKNN.forEach((post: JobWithKNN) => {
      const isSel = post.id === selectedPostId, sc = post.knn.score, sz = getMarkerSize(sc, isSel);
      if (typeof post.latitude !== 'number' || typeof post.longitude !== 'number') return;
      const popup = generatePopup(post);
      const init = (post.location_name || post.title || post.company_name || 'O').charAt(0).toUpperCase();
      const existing = markersRef.current.get(post.id) as { setLatLng: (p: [number, number]) => void; setIcon: (i: unknown) => void; setPopupContent: (h: string) => void } | undefined;
      if (existing) {
        existing.setLatLng([post.latitude, post.longitude]);
        existing.setIcon(La.divIcon({ html: createCompanyMarkerSVG(init, sc, isSel), className: '', iconSize: [sz, sz + 14], iconAnchor: [sz / 2, sz + 14], popupAnchor: [0, -(sz + 10)] }));
        existing.setPopupContent(popup);
      } else {
        const mk = La.marker([post.latitude, post.longitude], { icon: La.divIcon({ html: createCompanyMarkerSVG(init, sc, isSel), className: '', iconSize: [sz, sz + 14], iconAnchor: [sz / 2, sz + 14], popupAnchor: [0, -(sz + 10)] }), zIndexOffset: isSel ? 1000 : sc >= 70 ? 800 : 600, riseOnHover: true, riseOffset: 250 }).bindPopup(popup, { maxWidth: 280, className: 'custom-popup', closeButton: true }).addTo(map);
        markersRef.current.set(post.id, mk);
        mk.on('click', () => { onPostSelect(post); map.flyTo([post.latitude, post.longitude], 16, { duration: 1 }); });
      }
    });
    if (showDirections && targetPost) {
      const profile = OSRM_PROFILES[travelMode], style = ROUTE_STYLES[travelMode];
      fetch(`https://router.project-osrm.org/route/v1/${profile}/${newPos.lng},${newPos.lat};${targetPost.lng},${targetPost.lat}?overview=full&geometries=geojson&steps=false`)
        .then(r => r.json()).then(data => {
          if (data.routes?.[0]) {
            const ll = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            if (routeLineRef.current) map.removeLayer(routeLineRef.current);
            routeLineRef.current = La.polyline(ll, { color: style.color, weight: style.weight, opacity: 0.85, dashArray: style.dash || undefined, lineCap: 'round', lineJoin: 'round' }).addTo(map);
          }
        }).catch(() => {
          if (routeLineRef.current) map.removeLayer(routeLineRef.current);
          routeLineRef.current = La.polyline([[newPos.lat, newPos.lng], [targetPost!.lat, targetPost!.lng]], { color: style.color, weight: style.weight, opacity: 0.5, dashArray: '12,8' }).addTo(map);
        });
    } else if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
  }, [postsWithKNN, selectedPostId, travelMode, L, showDirections, targetPost, onPostSelect, studentLocation, isTracking, gpsAccuracy, generatePopup, posts]);

  if (!L || !loaded) return <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 border-4 border-blue-300 rounded-full animate-spin border-t-blue-500" /><p className="text-sm font-semibold text-slate-600">Loading Map...</p></div></div>;

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <button type="button" onClick={onRecenter} className={`absolute bottom-20 right-3 z-[4000] w-12 h-12 rounded-full shadow-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${isTracking ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 ring-4 ring-emerald-500/20' : 'bg-white hover:bg-blue-50 shadow-black/20 border border-slate-100'}`} title="Center on my location">
        {isTracking && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />}
        <svg className={`w-5 h-5 ${isTracking ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
      <div className="absolute bottom-1 left-10 z-[3999] text-[8px] text-slate-500/60 bg-white/50 backdrop-blur px-1.5 py-0.5 rounded hidden md:block">© {mapStyle === 'satellite' ? 'Esri' : 'CARTO'}</div>
      {isTracking && gpsAccuracy !== undefined && <div className="absolute top-16 left-3 z-[4000] bg-emerald-500/90 backdrop-blur-md text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5"><div className="relative"><div className="w-1.5 h-1.5 bg-white rounded-full" /><div className="absolute inset-0 w-1.5 h-1.5 bg-white rounded-full animate-ping" /></div>GPS ±{Math.round(gpsAccuracy)}m</div>}
    </div>
  );
}

// ─── PURE PROP-DRIVEN PROFILE OVERLAY ────────────────────────────────────
interface ProfileOverlayProps {
  profile: StudentProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  userId: string | null;
  isTracking: boolean;
  isLocating: boolean;
  studentLoc: { lat: number; lng: number };
  showLocPopup: boolean;
  onToggleTracking: () => void;
  onDetectLoc: () => void;
  onOpenPopup: () => void;
  onClosePopup: () => void;
  onStopTracking: () => void;
}

function ProfileOverlay({ profile, profileLoading, profileError, userId, isTracking, isLocating, studentLoc, showLocPopup, onToggleTracking, onDetectLoc, onOpenPopup, onClosePopup, onStopTracking }: ProfileOverlayProps) {
  const displayName = profile?.full_name || (!userId ? 'Sign In' : '...');
  const initial = profile?.full_name?.charAt(0).toUpperCase() || (!userId ? '→' : '?');
  const avatarUrl = profile?.avatar_url;
  return (
    <div className="border-t border-slate-100 p-3 md:p-4">
      {!showLocPopup ? (
        <div onClick={onOpenPopup} role="button" tabIndex={0} className="flex items-center gap-2.5 md:gap-3 p-2 md:p-2.5 hover:bg-blue-50/50 rounded-xl cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors group">
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleTracking(); }} disabled={isLocating}
            className={`w-10 h-10 rounded-full text-white shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative ${isTracking ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-2 ring-emerald-300 ring-offset-2 scale-105' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} ${isLocating ? 'animate-pulse cursor-wait opacity-70' : ''}`}>
            {isTracking ? (<><div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" /><svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></>) : (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>)}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
              {profileLoading ? <>⏳ Loading...</> : isTracking ? <>📍 <span className="text-emerald-600">Live Tracking</span></> : profile ? <>👤 <span className="text-blue-600 truncate">{displayName}</span></> : !userId ? <><span className="text-amber-600">🔒 Sign in to match</span></> : <>⏳ <span className="text-slate-500">Loading profile...</span></>}
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 truncate mt-0.5 font-mono">{studentLoc.lat.toFixed(4)}, {studentLoc.lng.toFixed(4)}</p>
            {profile && profile.skills.length > 0 && <p className="text-[9px] md:text-[10px] text-blue-500 mt-1 font-medium hidden sm:block">💼 {profile.skills.length} skills loaded</p>}
            {profile?.course && <p className="text-[9px] md:text-[10px] text-purple-500 mt-0.5 font-medium hidden sm:block">🎓 {profile.course}</p>}
            {profileError && <p className="text-[9px] md:text-[10px] text-red-500 mt-1 font-medium hidden sm:block">⚠️ {profileError}</p>}
          </div>
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover:text-blue-500 group-hover:rotate-90 flex-shrink-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-5 animate-slide-up">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button type="button" onClick={(e) => { e.stopPropagation(); onToggleTracking(); }} disabled={isLocating} className={`w-10 h-10 rounded-full text-white shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative ${isTracking ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-2 ring-emerald-300 ring-offset-2 scale-105' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} ${isLocating ? 'animate-pulse cursor-wait opacity-70' : ''}`}>
                {isTracking ? (<><div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" /><svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></>) : (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>)}
              </button>
              <div className="min-w-0"><h3 className="text-sm md:text-base font-bold text-slate-900">GPS Status</h3><p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{isLocating ? 'Acquiring...' : isTracking ? 'Connected' : 'Standby'}</p></div>
            </div>
            <button type="button" onClick={onClosePopup} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {!isTracking ? (
              <button type="button" onClick={() => { onStopTracking(); onDetectLoc(); }} disabled={isLocating} className={`col-span-2 py-3 md:py-3.5 rounded-xl text-sm md:text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${isLocating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg active:scale-[0.98]'}`}>{isLocating ? 'Detecting...' : '📍 Detect Location'}</button>
            ) : (
              <button type="button" onClick={onStopTracking} className="col-span-2 py-3 md:py-3.5 rounded-xl text-sm md:text-base font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">⏹ Stop Tracking</button>
            )}
          </div>
          {profile ? (
            <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-2xl p-4 md:p-5 border border-blue-100/80">
              <p className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Your Profile</p>
              <div className="flex items-center gap-3 mb-4">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-base font-bold shadow-md">{initial}</div>}
                <div className="min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>{profile.course && <p className="text-[11px] text-purple-600 truncate mt-0.5">🎓 {profile.course}</p>}</div>
              </div>
              <div className="border-t border-blue-200/60 pt-3">
                <p className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wider mb-2.5">Your Skills ({profile.skills.length})</p>
                <div className="flex flex-wrap gap-1.5">{profile.skills.slice(0, 8).map((skill, i) => <span key={i} className="px-2 md:px-2.5 py-1 md:py-1.5 bg-white text-blue-700 text-[10px] md:text-xs font-semibold rounded-lg border border-blue-200 shadow-sm">{skill}</span>)}{profile.skills.length > 8 && <span className="px-2.5 py-1.5 bg-blue-100 text-blue-600 text-[10px] md:text-xs rounded-lg font-medium">+{profile.skills.length - 8} more</span>}</div>
              </div>
            </div>
          ) : !userId ? (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center"><p className="text-xs font-bold text-amber-800">🔒 Authentication Required</p><p className="text-[10px] text-amber-600 mt-1">Sign in to enable skill matching.</p><Link href="/student/login" className="inline-block mt-2 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">Sign In</Link></div>
          ) : profileLoading ? (
            <div className="bg-slate-100 rounded-xl p-3 animate-pulse"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-200 rounded w-1/2" /></div>
          ) : profileError ? (
            <div className="bg-red-50 rounded-xl p-3 border border-red-200"><p className="text-xs font-bold text-red-800">⚠️ Profile Error</p><p className="text-[10px] text-red-600 mt-1">{profileError}</p></div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HeaderAvatar({ profile, profileLoading, userId }: { profile: StudentProfile | null; profileLoading: boolean; userId: string | null }) {
  const name = profile?.full_name || '';
  const initial = name.charAt(0).toUpperCase() || (!userId ? '→' : '?');
  const avatarUrl = profile?.avatar_url;
  if (profileLoading) return <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 animate-pulse flex items-center justify-center border-2 border-blue-200"><div className="w-4 h-4 rounded-full bg-blue-300" /></div>;
  if (profile && avatarUrl) return <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg cursor-pointer hover:scale-105 transition-all border-2 border-white/50" title={name}><img src={avatarUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLElement).parentElement!.innerHTML = `<span class="text-white text-xs md:text-base font-bold flex items-center justify-center h-full">${initial}</span>`; }} /></div>;
  if (profile) return <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs md:text-base font-bold shadow-lg cursor-pointer hover:scale-105 transition-all" title={name}>{initial}</div>;
  if (userId) return <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 animate-pulse flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-slate-300" /></div>;
  return <Link href="/student/login" className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all border border-slate-200" title="Sign in"><svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg></Link>;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-[9999] animate-slide-in-left flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border max-w-sm ${type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900' : 'bg-red-50/95 border-red-200 text-red-900'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
        {type === 'success' ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 4" /></svg> : <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
      </div>
      <div className="min-w-0"><p className="font-bold text-sm">{type === 'success' ? '✅ Application Sent!' : 'Error'}</p><p className="text-xs opacity-75 truncate">{message}</p></div>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-lg shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
      <div className="absolute inset-0 bg-slate-200/80 animate-pulse"><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-slate-300 rounded-full animate-spin border-t-slate-400 mx-auto" /><p className="text-sm text-slate-400 mt-3 font-medium">Loading Map...</p></div></div></div>
      <header className="absolute top-0 left-0 right-0 z-40 p-3 md:p-4"><div className="flex items-center justify-between gap-2 md:gap-3"><div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0"><div className="h-10 md:h-12 w-28 md:w-32 bg-white/60 rounded-2xl animate-pulse" /><div className="hidden sm:flex h-6 w-16 bg-white/60 rounded-full animate-pulse" /><div className="h-7 w-20 bg-white/60 rounded-full animate-pulse" /></div><div className="flex items-center gap-2"><div className="h-9 w-9 bg-white/60 rounded-xl animate-pulse" /><div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/60 animate-pulse" /></div></div></header>
      <div className="absolute top-[60px] md:top-20 left-2 md:left-4 z-40 w-[calc(100%-16px)] md:w-[340px] space-y-3"><div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-xl p-3 md:p-4"><div className="h-10 md:h-12 bg-slate-200/70 rounded-xl animate-pulse" /></div><div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-xl p-3 md:p-4 space-y-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-200/70 animate-pulse shrink-0" /><div className="flex-1 space-y-2 min-w-0"><div className="h-4 w-3/4 bg-slate-200/70 rounded animate-pulse" /><div className="h-3 w-1/2 bg-slate-200/70 rounded animate-pulse" /></div></div><div className="flex gap-2"><div className="h-6 w-16 bg-slate-200/70 rounded-lg animate-pulse" /><div className="h-6 w-20 bg-slate-200/70 rounded-lg animate-pulse" /><div className="h-6 w-14 bg-slate-200/70 rounded-lg animate-pulse" /></div></div><div className="bg-white/90 backdrop-blur-xl rounded-full shadow-lg px-3.5 md:px-5 py-1.5 md:py-2.5 inline-flex items-center gap-1.5 md:gap-2"><div className="w-1.5 h-1.5 md:w-2 h-2 rounded-full bg-slate-300 animate-pulse" /><div className="h-4 w-6 bg-slate-200/70 rounded animate-pulse" /><div className="h-3 w-16 bg-slate-200/70 rounded animate-pulse hidden sm:block" /></div></div>
    </div>
  );
}

// ─── HELPER: accepts supabase client as parameter (no module-level closure) ─
async function fetchUserProfile(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<{ profile: StudentProfile | null; error: string | null }> {
  try {
    const { data, error } = await sb.from('profiles').select('id, skills, course, full_name, avatar_url').eq('id', userId).single();
    if (error) {
      console.error('❌ [Profile] Fetch Error:', error);
      if (error.code === '42501') console.error('⛔ [Profile] RLS BLOCKED! Run: CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);');
      return { profile: null, error: error.message };
    }
    if (!data) return { profile: null, error: 'No profile found' };
    const raw = data.skills as string[] | null;
    return { profile: { id: userId, skills: raw ? raw.filter(s => typeof s === 'string' && s.trim()) : [], course: data.course || '', full_name: data.full_name, avatar_url: data.avatar_url }, error: null };
  } catch (err) { return { profile: null, error: err instanceof Error ? err.message : 'Unknown error' }; }
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MapPage() {
  // ✅ Singleton client — same instance shared across the entire app
  const supabase = createClient();

  // ── DATA STATE ────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<OJTPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // ── AUTH STATE (resolved by Effect 1) ─────────────────────────────────
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ── PROFILE STATE (resolved by Effect 2 — reacts to userId) ──────────
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileFetchedRef = useRef<string | null>(null);

  // ── UI STATE ──────────────────────────────────────────────────────────
  const [travelMode, setTravelMode] = useState<TravelMode>('motorcycle');
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [studentLoc, setStudentLoc] = useState({ lat: 10.6915, lng: 122.9538 });
  const [isLocating, setIsLocating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLocPopup, setShowLocPopup] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('light');
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>();
  const subscriptionRef = useRef<unknown>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showFullPanel, setShowFullPanel] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECT 1: AUTH RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true;
    let resolved = false;
    const finish = (uid: string | null) => { if (!mounted || resolved) return; resolved = true; setUserId(uid); setIsAuthLoading(false); };

    (async () => {
      for (let i = 0; i < 8; i++) {
        if (!mounted || resolved) return;
        try { const { data: { session } } = await supabase.auth.getSession(); if (session?.user?.id) { finish(session.user.id); return; } } catch { /* */ }
        if (i < 7) await new Promise(r => setTimeout(r, 100));
      }
      finish(null);
    })();
const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user: { id: string } | null } | null) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') { resolved = false; profileFetchedRef.current = null; setUserId(null); setProfile(null); setProfileError(null); setProfileLoading(false); setIsAuthLoading(false); return; }
      if (event === 'SIGNED_IN' && session?.user?.id) { resolved = false; profileFetchedRef.current = null; finish(session.user.id); return; }
      if (resolved) return;
      if (session?.user?.id) finish(session.user.id);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECT 2: PROFILE FETCH — reacts to userId
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!userId) { setProfile(null); setProfileLoading(false); setProfileError(null); return; }
    if (profileFetchedRef.current === userId) return;
    profileFetchedRef.current = userId;
    let mounted = true;
    setProfileLoading(true); setProfileError(null);
    // Pass the component-level supabase instance
    fetchUserProfile(supabase, userId).then(({ profile: p, error }) => {
      if (!mounted) return;
      setProfile(p);
      if (error) setProfileError(error);
      setProfileLoading(false);
    });
    return () => { mounted = false; };
  }, [userId, supabase]);

  // ── Posts fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setPostsLoading(true);
      try {
        const { data, error } = await supabase.from('ojt_posts').select('*, skills, course_category');
        if (error) { console.error('❌ Posts Error:', error); return; }
        setPosts((data as OJTPost[]) || []);
        setFitBoundsTrigger(prev => prev + 1);
      } catch (err) { console.error('❌ Posts fetch failed:', err); }
      finally { setPostsLoading(false); }
    })();
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current as Parameters<typeof supabase.removeChannel>[0]); };
  }, [supabase]);

  // ── Real-time posts ───────────────────────────────────────────────────
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout>;
    const setup = async () => {
      try {
        const ch = supabase.channel(`ojt-live-${Date.now()}`);
        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ojt_posts' }, (payload: { new: unknown }) => { const p = payload.new as OJTPost; setPosts(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]); });
        ch.subscribe((status: string) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') retry = setTimeout(setup, 5000); });
        subscriptionRef.current = ch;
      } catch (e) { console.error('Sub error:', e); }
    };
    setup();
    return () => { clearTimeout(retry); if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current as Parameters<typeof supabase.removeChannel>[0]); };
  }, [supabase]);

  useEffect(() => { return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }; }, []);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(p => p.title?.toLowerCase().includes(q) || p.company_name?.toLowerCase().includes(q) || p.location_name?.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    const base = posts.find(p => p.id === selectedPostId);
    if (!base) return null;
    const dist = haversineDistance(base.latitude, base.longitude, studentLoc.lat, studentLoc.lng);
    const speeds = { walking: 5, motorcycle: 30, car: 25 };
    const knn = getKNNScore(base, studentLoc, profile?.skills || [], profile?.course);
    return { ...base, _distance: Math.round(dist * 10) / 10, _travelMins: Math.round((dist / speeds[travelMode]) * 60), _skillMatch: knn.skillMatch, _knnScore: knn.score, _courseMatch: knn.courseMatch };
  }, [selectedPostId, travelMode, studentLoc, posts, profile]);

  useEffect(() => { (window as unknown as Record<string, (() => void) | undefined>).seeMoreDetailsClicked = () => { setShowFullPanel(true); setShowFullDetails(true); setShowRoute(true); }; return () => { delete (window as unknown as Record<string, (() => void) | undefined>).seeMoreDetailsClicked; }; }, []);

  const handleApply = useCallback(async () => {
    if (!selectedPostId || !selectedPost) { setToast({ message: 'No position selected.', type: 'error' }); return; }
    if (!userId) { setToast({ message: 'Please log in to apply.', type: 'error' }); return; }
    setIsApplying(true);
    try {
      const { error } = await supabase.from('applications').insert({ student_id: userId, post_id: selectedPostId, company_id: selectedPost.user_id, status: 'Pending' });
      if (error) setToast({ message: error.message || 'Failed to submit', type: 'error' });
      else { setToast({ message: '🎉 Application Sent!', type: 'success' }); setTimeout(() => closeCard(), 1500); }
    } catch (err) { setToast({ message: err instanceof Error ? err.message : 'Network error.', type: 'error' }); }
    finally { setIsApplying(false); }
  }, [selectedPostId, selectedPost, userId, supabase]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation || isTracking) return;
    setIsLocating(true); setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(p => { setStudentLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsAccuracy(p.coords.accuracy); setIsLocating(false); }, err => { setIsTracking(false); setIsLocating(false); alert(`GPS Error: ${err.message}`); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, [isTracking]);

  const stopTracking = useCallback(() => { if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; } setIsTracking(false); setIsLocating(false); setGpsAccuracy(undefined); }, []);

  const detectLoc = () => { if (!navigator.geolocation) return; setIsLocating(true); navigator.geolocation.getCurrentPosition(p => { setStudentLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsAccuracy(p.coords.accuracy); setIsLocating(false); }, () => setIsLocating(false), { enableHighAccuracy: true, timeout: 10000 }); };

  const handleRecenter = useCallback(() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { setStudentLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsAccuracy(p.coords.accuracy); setFitBoundsTrigger(prev => prev + 1); }, null, { enableHighAccuracy: true, maximumAge: 5000 }); else setFitBoundsTrigger(prev => prev + 1); }, []);

  const selectPost = (post: OJTPost) => { setSelectedPostId(post.id); setShowFullDetails(false); setIsCardOpen(true); setShowSearch(false); setShowRoute(false); setShowFullPanel(false); setFitBoundsTrigger(prev => prev + 1); };
  const closeCard = () => { setIsCardOpen(false); setShowRoute(false); setShowFullDetails(false); setShowFullPanel(false); setTimeout(() => setSelectedPostId(null), 300); };
  const changeMode = (m: TravelMode) => { setTravelMode(m); if (selectedPostId) setShowRoute(true); };
  const toggleMapStyle = () => setMapStyle(p => p === 'light' ? 'satellite' : 'light');
  const modes = [{ v: 'walking' as TravelMode, i: '🚶', l: 'Walk' }, { v: 'motorcycle' as TravelMode, i: '🏍️', l: 'Moto' }, { v: 'car' as TravelMode, i: '🚗', l: 'Car' }];

  const isFullyLoaded = !isAuthLoading && !postsLoading;
  const applyButtonState: 'sign-in' | 'loading' | 'submitting' | 'ready' = !userId ? 'sign-in' : profileLoading ? 'loading' : isApplying ? 'submitting' : 'ready';

  if (!isFullyLoaded) return <SkeletonDashboard />;

  return (
    <div className="fixed inset-0 bg-slate-900 font-sans overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <MapComponent posts={filteredPosts} selectedPostId={selectedPostId} studentLocation={studentLoc} studentSkills={profile?.skills || []} studentCourse={profile?.course} userId={userId ?? undefined} travelMode={travelMode} onPostSelect={selectPost} showDirections={showRoute} targetPost={selectedPost ? { lat: selectedPost.latitude, lng: selectedPost.longitude } : null} mapStyle={mapStyle} isTracking={isTracking} onRecenter={handleRecenter} gpsAccuracy={gpsAccuracy} fitBoundsTrigger={fitBoundsTrigger} />

      <header className="absolute top-0 left-0 right-0 z-40 p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 md:gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Link href="/student_main" className="group relative bg-white/95 backdrop-blur-xl px-4 md:px-5 py-2.5 md:py-3 rounded-2xl shadow-lg shadow-black/[0.08] border border-white/60 flex items-center gap-2.5 md:gap-3 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.2" /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="9" r="2.5" fill="white" /></svg></div>
              <div className="relative flex flex-col leading-none"><span className="text-xl md:text-2xl font-black bg-gradient-to-b from-blue-600 to-indigo-700 bg-clip-text text-transparent tracking-tight">OJTly</span><span className="text-[8px] md:text-[9px] font-bold text-slate-400 tracking-[0.15em] uppercase -mt-0.5">Map Explorer</span></div>
            </Link>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full"><div className="relative"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /><div className="absolute inset-0 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /></div><span className="text-[10px] md:text-xs font-bold text-emerald-700">LIVE</span><span className="text-[10px] md:text-xs text-emerald-600">{filteredPosts.length}</span></div>
              <button type="button" onClick={toggleMapStyle} className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 border ${mapStyle === 'satellite' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white/90 backdrop-blur-md text-slate-600 border-slate-200 hover:border-indigo-300'}`}><span className="text-sm md:text-base">{mapStyle === 'light' ? '🛰️' : '🌐'}</span><span className="hidden lg:inline">{mapStyle === 'light' ? 'Satellite' : 'Map'}</span></button>
            </div>
            <div className="hidden lg:flex bg-white/95 backdrop-blur-md rounded-xl p-1 gap-1 shadow-lg shadow-black/5">{modes.map(m => (<button key={m.v} type="button" onClick={() => changeMode(m.v)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${travelMode === m.v ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md scale-105' : 'hover:bg-slate-50 text-slate-600'}`}><span>{m.i}</span><span>{m.l}</span></button>))}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="lg:hidden flex bg-white/95 backdrop-blur-md rounded-xl p-1 gap-1 shadow-lg shadow-black/5">{modes.map(m => (<button key={m.v} type="button" onClick={() => changeMode(m.v)} className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${travelMode === m.v ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md scale-105' : 'hover:bg-slate-50 text-slate-600'}`}>{m.i}</button>))}</div>
            <Link href="/student_main" className="bg-white/95 backdrop-blur-md p-2 md:p-2.5 rounded-xl shadow-lg hover:bg-white transition-all"><svg className="w-4 h-4 md:w-5 md:h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></Link>
            <HeaderAvatar profile={profile} profileLoading={profileLoading} userId={userId} />
          </div>
        </div>
      </header>

      <div className="absolute top-[60px] md:top-20 left-2 md:left-4 z-40 w-[calc(100%-16px)] md:w-[340px] space-y-3 md:space-y-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-3 md:p-4 pb-2 md:pb-3">
            <div className="relative">
              <input type="text" placeholder="Search OJT posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setShowSearch(true)} className="w-full pl-9 md:pl-11 pr-8 md:pr-10 py-2.5 md:py-3 bg-slate-50/80 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-sm transition-all placeholder:text-slate-400" />
              <svg className="absolute left-2.5 md:left-3.5 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 md:right-3 top-2.5 md:top-3.5 p-1 hover:bg-slate-200 rounded-full transition-colors"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
            </div>
          </div>
          <ProfileOverlay profile={profile} profileLoading={profileLoading} profileError={profileError} userId={userId} isTracking={isTracking} isLocating={isLocating} studentLoc={studentLoc} showLocPopup={showLocPopup} onToggleTracking={() => { if (isTracking) stopTracking(); else startTracking(); }} onDetectLoc={detectLoc} onOpenPopup={() => setShowLocPopup(true)} onClosePopup={() => setShowLocPopup(false)} onStopTracking={stopTracking} />
        </div>

        {showSearch && searchQuery && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white/98 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-2xl shadow-black/20 border border-slate-200/60 max-h-[250px] md:max-h-[300px] overflow-y-auto z-50 scrollbar-thin">
            {filteredPosts.length > 0 ? (
              <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
                {filteredPosts.slice(0, 5).map(post => {
                  const k = getKNNScore(post, studentLoc, profile?.skills || [], profile?.course);
                  const c = getMarkerColor(k.score);
                  return (
                    <button key={post.id} type="button" onClick={() => selectPost(post)} className="w-full p-2 md:p-3 flex items-center gap-2.5 md:gap-3 rounded-xl hover:bg-blue-50/70 transition-all text-left group border border-transparent hover:border-blue-200">
                      <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-base shrink-0 shadow-md" style={{ background: `linear-gradient(135deg, ${c.bg}, ${c.border})` }}>{(post.location_name || post.title || post.company_name || 'O').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs md:text-sm text-slate-800 truncate group-hover:text-blue-600">{post.location_name || post.title || post.company_name || 'Untitled'}</h4>
                        <p className="text-[10px] md:text-xs text-slate-500 truncate">{post.work_type || post.work_mode || 'OJT Position'}</p>
                        <div className="flex items-center gap-1.5 mt-1"><span className="text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: c.bg }}>🎯 {userId ? k.skillMatch + '%' : '—'}</span><span className="text-[9px] md:text-[10px] text-slate-400">{userId ? k.distance + 'km' : 'N/A'}</span>{k.courseMatch && <span className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">🎓</span>}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : <div className="p-6 md:p-8 text-center"><p className="text-xs md:text-sm text-slate-500">No posts found matching &quot;{searchQuery}&quot;</p></div>}
          </div>
        )}
        <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-lg shadow-black/5 px-3.5 md:px-5 py-1.5 md:py-2.5 inline-flex items-center gap-1.5 md:gap-2 self-start"><div className="w-1.5 h-1.5 md:w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm md:text-base font-bold text-slate-800">{filteredPosts.length}</span><span className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:inline">Live Posts</span></div>
      </div>

      {/* ── DETAIL PANEL ─────────────────────────────────────────────── */}
      <div className={`absolute top-0 right-0 bottom-0 w-full md:max-w-[440px] lg:max-w-[480px] z-50 transform transition-transform duration-500 ease-out ${isCardOpen && showFullPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedPost ? (
          <div className="h-full bg-white rounded-none md:rounded-l-2xl md:rounded-l-3xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col mx-0 md:mx-3 my-0 md:my-4 mr-0 md:mr-4">
            <div className="p-4 md:p-6 pb-3 md:pb-4 border-b border-slate-100 relative bg-gradient-to-b from-slate-50/50 to-white shrink-0">
              {showFullPanel && <button type="button" onClick={() => { setShowFullPanel(false); setShowFullDetails(false); }} className="absolute top-3 md:top-4 left-3 md:left-4 p-2 md:p-2.5 hover:bg-slate-100 rounded-xl transition-all z-10 hover:-translate-x-1 duration-300"><svg className="w-4 h-4 md:w-5 md:h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg></button>}
              <button type="button" onClick={closeCard} className="absolute top-3 md:top-4 right-3 md:right-4 p-2 md:p-2.5 hover:bg-slate-100 rounded-xl transition-all z-10 hover:rotate-90 duration-300"><svg className="w-4 h-4 md:w-5 md:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
              <div className={`flex items-start gap-3 md:gap-4 ${showFullPanel ? 'pl-10 md:pl-14' : ''} pr-8 md:pr-12`}>
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shadow-lg border-2 flex-shrink-0 flex items-center justify-center text-lg md:text-2xl font-extrabold hover:scale-105 transition-all cursor-default" style={{ background: `linear-gradient(135deg, ${getMarkerColor(selectedPost._knnScore || 0).bg}15, ${getMarkerColor(selectedPost._knnScore || 0).bg}30)`, color: getMarkerColor(selectedPost._knnScore || 0).border, borderColor: 'white' }}>{(selectedPost.company_name || selectedPost.location_name || selectedPost.title || 'O').charAt(0)}</div>
                <div className="flex-1 min-w-0 pt-0.5 md:pt-1">
                  {selectedPost.title && <h2 className="text-sm md:text-base font-bold text-slate-900 leading-tight line-clamp-1 truncate">{selectedPost.title}</h2>}
                  <p className="text-xs md:text-sm text-blue-600 font-semibold mt-0.5 flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 md:w-2 h-2 rounded-full bg-blue-500 shrink-0" />{selectedPost.company_name || selectedPost.location_name || 'Company'}</p>
                  <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3 flex-wrap">
                    {selectedPost._courseMatch && selectedPost.course_category && <span className="inline-flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] md:text-xs font-bold border border-purple-200 shadow-sm"><span className="w-1 h-1 md:w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />Recommended for {selectedPost.course_category}</span>}
                    <span className="inline-flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] md:text-xs font-bold border border-emerald-200"><span className="w-1 h-1 md:w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Active</span>
                    <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] md:text-xs font-semibold">{selectedPost.work_mode || selectedPost.work_type || 'On-Site'}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-[10px] md:text-xs font-bold shadow-md">🎯 {userId ? `${selectedPost._skillMatch ?? 0}% Match` : 'Sign in'}</span>
                  </div>
                </div>
              </div>
              {!showFullDetails && (
                <div className="mt-4 md:mt-5 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2">{[{ label: 'Distance', value: userId ? (selectedPost._distance || 0) : 'N/A', unit: 'km' }, { label: 'Travel', value: userId ? (selectedPost._travelMins || 0) : 'N/A', unit: 'min' }, { label: 'Slots', value: selectedPost.vacancies || 'N/A', unit: '' }].map(({ label, value, unit }) => (<div key={label} className="bg-slate-50 rounded-xl p-2 md:p-3 text-center border border-slate-100"><p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mb-0.5">{label}</p><p className="text-sm md:text-base font-black text-slate-800">{value}<span className="text-[10px] text-slate-400 ml-0.5">{unit}</span></p></div>))}</div>
                  <button type="button" onClick={() => { setShowFullPanel(true); setShowFullDetails(true); setShowRoute(true); }} className="w-full py-3 md:py-3.5 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-xl md:rounded-2xl font-bold text-slate-700 text-sm md:text-base transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"><svg className="w-4 h-4 md:w-5 md:h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>See Full Details<svg className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></button>
                </div>
              )}
            </div>

            {showFullDetails && (
              <div className="px-4 md:px-6 pb-3 md:pb-4 border-b border-slate-100 bg-slate-50/30 animate-slide-down overflow-hidden">
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3">
                  <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 border border-slate-200"><p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5">Posted</p><p className="text-xs md:text-sm font-semibold text-slate-700">{selectedPost.created_at ? new Date(selectedPost.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}</p></div>
                  <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 border border-slate-200"><p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5">Status</p><p className="text-xs md:text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Accepting Apps</p></div>
                </div>
                {selectedPost.description && <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-lg md:rounded-xl p-3 md:p-4 border border-blue-100 mb-3"><div className="flex items-center gap-2 mb-2"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><h4 className="font-bold text-xs md:text-sm text-blue-800">About This Role</h4></div><p className="text-xs md:text-sm text-slate-700 leading-relaxed line-clamp-3">{selectedPost.description}</p></div>}
                <div className="flex gap-1.5 md:gap-2 flex-wrap">
                  {selectedPost.vacancies && <span className="px-2 md:px-3 py-1 md:py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] md:text-xs font-bold border border-purple-200">💼 {selectedPost.vacancies} slots</span>}
                  {selectedPost.duration_hours && <span className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] md:text-xs font-bold border border-blue-200">⏱ {selectedPost.duration_hours} hrs</span>}
                  {selectedPost.allowance_type && <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold border ${selectedPost.allowance_type === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>💰 {selectedPost.allowance_type}</span>}
                  {selectedPost.course_category && <span className="px-2 md:px-3 py-1 md:py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] md:text-xs font-bold border border-purple-200">🎓 {selectedPost.course_category}</span>}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 pb-4 md:pb-6 space-y-3 md:space-y-4 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border-2 relative overflow-hidden" style={{ borderColor: ROUTE_STYLES[travelMode].color, backgroundColor: `${ROUTE_STYLES[travelMode].color}06` }}>
                <div className="flex items-center justify-between mb-2 md:mb-3"><h3 className="font-bold text-xs md:text-base text-slate-900 flex items-center gap-1.5 md:gap-2">🧭 Route {isTracking && <span className="text-[10px] md:text-xs font-normal text-emerald-600 animate-pulse">● Live</span>}</h3><div className="flex bg-white rounded-lg md:rounded-xl p-0.5 md:p-1 gap-0.5 shadow-sm border border-slate-100">{modes.map(m => (<button key={m.v} type="button" onClick={() => changeMode(m.v)} className={`px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${travelMode === m.v ? 'text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-50'}`} style={travelMode === m.v ? { backgroundColor: ROUTE_STYLES[m.v].color } : {}}>{m.i} {m.l.split(' ')[0]}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 text-center shadow-sm border border-slate-100"><p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Distance</p><p className="text-lg md:text-xl font-black text-slate-900 tabular-nums">{userId ? (selectedPost._distance || 0) : '—'} <span className="text-[10px] md:text-xs font-normal text-slate-400 ml-0.5">km</span></p></div>
                  <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 text-center shadow-sm border-l-4" style={{ borderColor: ROUTE_STYLES[travelMode].color }}><p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: ROUTE_STYLES[travelMode].color }}>Time</p><p className="text-lg md:text-xl font-black tabular-nums" style={{ color: ROUTE_STYLES[travelMode].color }}>{userId ? (selectedPost._travelMins || 0) : '—'} <span className="text-[10px] md:text-xs font-normal opacity-60 ml-0.5">min</span></p></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-slate-200"><div className="flex items-center gap-2 mb-2 md:mb-3"><div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-100 flex items-center justify-center"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></div><h3 className="font-bold text-slate-800 text-xs md:text-sm">Job Details</h3></div><div className="grid grid-cols-2 gap-2 md:gap-3"><div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 border border-slate-100 shadow-sm"><div className="flex items-center gap-1.5 mb-1"><span className="text-purple-500 text-sm md:text-base">💼</span><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Vacancies</span></div><p className="text-base md:text-lg font-black text-slate-900">{selectedPost.vacancies || 'N/A'} <span className="text-[10px] md:text-xs font-normal text-slate-400">slots</span></p></div><div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 border border-slate-100 shadow-sm"><div className="flex items-center gap-1.5 mb-1"><span className="text-amber-500 text-sm md:text-base">📁</span><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Category</span></div><p className="text-xs md:text-sm font-bold text-slate-800 truncate">{selectedPost.category || selectedPost.course_category || 'General'}</p></div></div></div>

              <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-emerald-100"><div className="flex items-center gap-2 mb-2 md:mb-3"><div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z" /></svg></div><h3 className="font-bold text-emerald-800 text-xs md:text-sm">Benefits</h3></div><div className="grid grid-cols-2 gap-2 md:gap-3"><div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 border border-emerald-100 shadow-sm"><div className="flex items-center gap-1.5 mb-1"><span className="text-blue-500 text-sm md:text-base">⏱</span><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Duration</span></div><p className="text-base md:text-lg font-black text-slate-900">{selectedPost.duration_hours || 'TBA'} <span className="text-[10px] md:text-xs font-normal text-slate-400">hrs</span></p></div><div className={`rounded-lg md:rounded-xl p-2.5 md:p-3 border shadow-sm ${selectedPost.allowance_type === 'Paid' ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white border-slate-100'}`}><div className="flex items-center gap-1.5 mb-1"><span className="text-green-500 text-sm md:text-base">💰</span><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Allowance</span></div><p className={`text-xs md:text-sm font-bold ${selectedPost.allowance_type === 'Paid' ? 'text-amber-700' : 'text-slate-600'}`}>{selectedPost.allowance_type || 'N/A'}</p></div></div>{selectedPost.salary_range && <div className="mt-2 md:mt-3 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg md:rounded-xl p-2.5 md:p-3 flex items-center gap-2"><span className="text-base md:text-lg">💵</span><div><p className="text-[9px] md:text-[10px] font-bold text-yellow-700 uppercase">Compensation</p><p className="font-bold text-yellow-900 text-xs md:text-sm">{selectedPost.salary_range}</p></div></div>}</div>

              <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2 md:mb-3"><div className="flex items-center gap-2"><div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><polyline points="20 6 9 17 4 4" /></svg></div><h3 className="font-bold text-slate-800 text-xs md:text-sm">Required Skills</h3></div><span className="text-[10px] md:text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 md:px-2.5 py-0.5 md:py-1 rounded-full shadow-sm">{userId ? `${selectedPost._skillMatch ?? 0}% Match` : 'Sign in'}</span></div>
                {(() => {
                  const ns: string[] = [];
                  const add = (s: string) => { const c = s.trim(); if (c && !ns.includes(c)) ns.push(c); };
                  const parse = (raw: unknown) => { if (Array.isArray(raw)) raw.forEach((s: unknown) => { if (typeof s === 'string') add(s); }); else if (typeof raw === 'string' && raw.trim()) { const t = raw.trim(); if (t.startsWith('{') && t.endsWith('}')) t.slice(1, -1).split(',').forEach(s => add(s.trim().replace(/^"|"$/g, ''))); else t.split(',').forEach(add); } };
                  parse(selectedPost.skills); parse(selectedPost.required_skills);
                  if (!ns.length) return <div className="text-gray-400 text-xs italic p-2 bg-gray-50 rounded-lg">No specific skills listed.</div>;
                  return <div className="flex flex-wrap gap-1.5">{ns.map((skill, idx) => { const m = userId && profile?.skills?.some((us: string) => us.toLowerCase().trim() === skill.toLowerCase().trim()); return <span key={idx} className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${m ? 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`} title={m ? '✓ You have this skill!' : 'Required'}>{m && <span className="mr-1">✓</span>}{skill}</span>; })}</div>;
                })()}
                {userId && profile?.skills && profile.skills.length > 0 && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Your Skills ({profile.skills.length})</p><div className="flex flex-wrap gap-1">{profile.skills.slice(0, 8).map((s, i) => <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded border border-blue-100">{s}</span>)}{profile.skills.length > 8 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">+{profile.skills.length - 8}</span>}</div></div>}
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-slate-200"><div className="flex items-center gap-2 mb-2 md:mb-3"><div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-100 flex items-center justify-center"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><h3 className="font-bold text-slate-800 text-xs md:text-sm">Description</h3></div><p className="text-xs md:text-sm text-slate-600 leading-relaxed bg-slate-50/50 rounded-lg md:rounded-xl p-2.5 md:p-3 border border-slate-100 whitespace-pre-wrap">{selectedPost.description || <span className="text-slate-400 italic">No description provided.</span>}</p></div>

              {selectedPost.deadline && <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm bg-red-50 border border-red-100 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3"><div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0"><svg className="w-3 h-3 md:w-4 md:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div><p className="text-[9px] md:text-[10px] font-bold text-red-400 uppercase">Deadline</p><p className="font-semibold text-red-700">{new Date(selectedPost.deadline).toLocaleDateString()}</p></div></div>}
            </div>

            <div className="p-3 md:p-5 bg-gradient-to-b from-white via-slate-50/30 to-white border-t border-slate-100 shrink-0">
              <button type="button" onClick={applyButtonState === 'sign-in' ? undefined : handleApply} disabled={applyButtonState === 'loading' || applyButtonState === 'submitting'} className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-white text-sm md:text-base transition-all flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-[0.98] relative overflow-hidden group ${applyButtonState === 'sign-in' ? 'bg-amber-500 hover:bg-amber-600 cursor-pointer' : applyButtonState === 'loading' || applyButtonState === 'submitting' ? 'bg-slate-400 cursor-not-allowed opacity-80' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-[1.02]'}`}>
                {applyButtonState === 'sign-in' ? (
                  <Link href="/student/login" className="flex items-center gap-2 w-full justify-center"><svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg><span>Sign in to Apply</span></Link>
                ) : applyButtonState === 'loading' || applyButtonState === 'submitting' ? (
                  <><svg className="animate-spin h-4 w-4 md:w-5 md:h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>{applyButtonState === 'loading' ? 'Loading...' : 'Submitting...'}</span></>
                ) : (
                  <><div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" /><svg className="w-4 h-4 md:w-5 md:h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="relative z-10 tracking-wide">Submit Application</span><svg className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-4 md:p-8 text-center bg-white/98 backdrop-blur-xl">
            <div className="max-w-xs md:max-w-sm mx-auto">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 text-3xl md:text-5xl shadow-inner">🗺️</div>
              <h3 className="text-lg md:text-2xl font-bold text-slate-800 mb-2 md:mb-3">Live OJT Board</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">Tap any marker to view details and apply.</p>
              <div className="space-y-2 md:space-y-3 text-left bg-slate-50 rounded-xl p-3 md:p-4">
                {[{ color: 'bg-emerald-500', label: 'Best Match (≥70%)' }, { color: 'bg-blue-500', label: 'Good Match (≥45%)' }, { color: 'bg-slate-400', label: 'Other Opportunity' }, { color: 'bg-purple-500', label: '🎓 Recommended for Your Course', divider: true }].map(({ color, label, divider }) => (
                  <div key={label} className={`flex items-center gap-2 md:gap-3 text-xs md:text-sm ${divider ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}><div className={`w-2.5 h-2.5 md:w-3 h-3 rounded-full ${color} shadow-sm`} /><span className="text-slate-700 font-medium">{label}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        .scrollbar-thin::-webkit-scrollbar{width:5px}.scrollbar-thin::-webkit-scrollbar-track{background:transparent}.scrollbar-thin::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        @keyframes fade-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fade-in .25s ease-out}
        @keyframes slide-up{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}.animate-slide-up{animation:slide-up .3s ease-out}
        @keyframes slide-down{from{opacity:0;transform:translateY(-10px);max-height:0}to{opacity:1;transform:translateY(0);max-height:500px}}.animate-slide-down{animation:slide-down .35s ease-out forwards;overflow:hidden}
        @keyframes slide-in-left{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}.animate-slide-in-left{animation:slide-in-left .3s ease-out}
        .student-marker-animated{transition:transform 0.8s cubic-bezier(0.4,0,0.2,1)}
        .custom-popup .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.15),0 4px 12px rgba(0,0,0,0.08);padding:0;border:1px solid rgba(255,255,255,0.8)}
        .custom-popup .leaflet-popup-content{margin:0;border-radius:12px;line-height:1.4}
        .custom-popup .leaflet-popup-tip-container,.custom-popup .leaflet-popup-close-button{display:none}
        .leaflet-marker-icon{box-shadow:none!important}
        .tabular-nums{font-variant-numeric:tabular-nums}.overscroll-contain{overscroll-behavior:contain}
        .line-clamp-1,.line-clamp-2,.line-clamp-3{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}.line-clamp-1{-webkit-line-clamp:1}.line-clamp-2{-webkit-line-clamp:2}.line-clamp-3{-webkit-line-clamp:3}
      `}</style>
    </div>
  );
}