'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ActivePost {
  post_id: string;
  post_title: string;
  company_name: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  geofence_radius_m: number;
}

interface CheckInResult {
  status: 'verified' | 'rejected_outside_geofence' | 'error' | 'already_checked_in';
  distance_m: number | null;
  message: string;
  timestamp?: string;
}

interface TodayLog {
  id: string;
  log_date: string;
  verification_status: string;
  distance_m: number | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  hours_rendered: number | null;
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function todayISODate(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function formatDistance(m: number | null): string {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(2)}km`;
}

export default function GeofenceCheckIn({ studentId }: { studentId: string }) {
  const [activePost, setActivePost] = useState<ActivePost | null>(null);
  const [todayLog, setTodayLog] = useState<TodayLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    // Date.now() + Math.random() avoids duplicate-key crashes when the
    // same message fires twice within the same millisecond.
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const loadState = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`post_id, status, ojt_posts ( id, title, latitude, longitude, location_name, geofence_radius_m, company_id, companies ( company_name ) )`)
        .eq('student_id', studentId)
        .in('status', ['Accepted', 'accepted', 'Active', 'active', 'Ongoing', 'ongoing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appError) console.warn('⚠️ GeofenceCheckIn: application lookup failed:', appError.message);

      if (appData?.ojt_posts) {
        const post = appData.ojt_posts as any;
        const company = Array.isArray(post.companies) ? post.companies[0] : post.companies;
        if (typeof post.latitude === 'number' && typeof post.longitude === 'number') {
          setActivePost({
            post_id: post.id, post_title: post.title || 'Untitled Post',
            company_name: company?.company_name || 'Unknown Company',
            latitude: post.latitude, longitude: post.longitude,
            location_name: post.location_name || null,
            geofence_radius_m: post.geofence_radius_m || 100,
          });
        } else { setActivePost(null); }
      } else { setActivePost(null); }

      const today = todayISODate();
      // ⚠️ KEY FIX: filter archived=false. Without this, if a student has an
      // archived log from a PREVIOUS OJT dated today, the widget would
      // incorrectly show "Already checked in today" — even though they
      // haven't pressed the check-in button for THIS OJT.
      // Only non-archived logs count toward the current OJT cycle.
      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .select('id, log_date, verification_status, distance_m, check_in_lat, check_in_lng, hours_rendered')
        .eq('student_id', studentId)
        .eq('log_date', today)
        .eq('archived', false)
        .maybeSingle();

      if (logError) console.warn('⚠️ GeofenceCheckIn: today log lookup failed:', logError.message);
      setTodayLog(logData as TodayLog | null);
    } catch (err: any) {
      console.error('❌ GeofenceCheckIn load error:', err);
      addToast(err?.message || 'Failed to load check-in state', 'error');
    } finally { setLoading(false); }
  }, [studentId, addToast]);

  useEffect(() => { loadState(); }, [loadState]);

  const handleCheckIn = useCallback(async () => {
    if (!activePost || checkingIn) return;
    if (!navigator.geolocation) { addToast('Geolocation is not supported by this browser', 'error'); return; }
    setCheckingIn(true); setResult(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      const studentLat = position.coords.latitude;
      const studentLng = position.coords.longitude;
      setGpsAccuracy(position.coords.accuracy);
      const distance = haversineMeters(studentLat, studentLng, activePost.latitude, activePost.longitude);
      const withinGeofence = distance <= activePost.geofence_radius_m;
      const verificationStatus = withinGeofence ? 'verified' : 'rejected_outside_geofence';
      const today = todayISODate();
      // New check-ins are always archived=false (current OJT cycle).
      // handleFinishOJT flips them to archived=true when the OJT ends.
      const payload = {
        student_id: studentId, log_date: today,
        status: withinGeofence ? 'present' : 'absent',
        hours_rendered: withinGeofence ? 8 : 0,
        check_in_lat: studentLat, check_in_lng: studentLng,
        distance_m: Math.round(distance * 100) / 100,
        verification_status: verificationStatus,
        archived: false,
      };

      let upsertResult;
      if (todayLog && todayLog.id) {
        upsertResult = await supabase
          .from('attendance_logs')
          .update(payload)
          .eq('id', todayLog.id)
          .select('id, log_date, verification_status, distance_m, check_in_lat, check_in_lng, hours_rendered')
          .maybeSingle();
      } else {
        upsertResult = await supabase
          .from('attendance_logs')
          .insert(payload)
          .select('id, log_date, verification_status, distance_m, check_in_lat, check_in_lng, hours_rendered')
          .maybeSingle();
      }
      if (upsertResult.error) throw upsertResult.error;

      const newLog = upsertResult.data as TodayLog;
      setTodayLog(newLog);
      if (withinGeofence) {
        const msg = `✓ Checked in! You were ${formatDistance(distance)} from the company (within ${activePost.geofence_radius_m}m geofence).`;
        setResult({ status: 'verified', distance_m: distance, message: msg, timestamp: new Date().toISOString() });
        addToast(msg, 'success');
      } else {
        const msg = `✕ Attendance rejected. You are ${formatDistance(distance)} away — outside the ${activePost.geofence_radius_m}m geofence.`;
        setResult({ status: 'rejected_outside_geofence', distance_m: distance, message: msg, timestamp: new Date().toISOString() });
        addToast(msg, 'error');
      }
    } catch (err: any) {
      const describe = (e: any): string => {
        if (!e) return 'Unknown error';
        if (typeof e === 'string') return e;
        return [e.message, e.code && `code=${e.code}`, e.hint && `hint=${e.hint}`, e.details && `details=${e.details}`].filter(Boolean).join(' | ');
      };
      const desc = describe(err);
      console.error('❌ Check-in error:', desc, err);
      let errorMsg = 'Failed to check in';
      if (err instanceof GeolocationPositionError) {
        if (err.code === 1) errorMsg = 'Location permission denied. Please allow location access to check in.';
        else if (err.code === 2) errorMsg = 'Location unavailable. Check your GPS/network and try again.';
        else if (err.code === 3) errorMsg = 'Location request timed out. Try again.';
      } else {
        errorMsg = desc;
      }
      setResult({ status: 'error', distance_m: null, message: errorMsg });
      addToast(errorMsg, 'error');
    } finally { setCheckingIn(false); }
  }, [activePost, checkingIn, studentId, todayLog, addToast]);

  const distanceRatio = useMemo(() => {
    if (!result?.distance_m || !activePost) return 0;
    return result.distance_m / activePost.geofence_radius_m;
  }, [result, activePost]);

  const todayAlreadyVerified = todayLog?.verification_status === 'verified';
  const todayRejected = todayLog?.verification_status === 'rejected_outside_geofence';

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
          <div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded-lg w-40 animate-pulse"></div><div className="h-3 bg-slate-50 rounded-lg w-56 animate-pulse"></div></div>
        </div>
        <div className="h-32 bg-slate-50 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (!activePost) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div><h3 className="font-bold text-sm sm:text-base text-slate-800">Daily Check-In</h3><p className="text-xs text-slate-500 mt-0.5">GPS-verified attendance</p></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500">No active OJT assignment yet.</p>
          <p className="text-xs text-slate-400 mt-1">Check-in becomes available once a company accepts your application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800' : 'bg-blue-50/95 border-blue-200 text-blue-800'}`}>
            <span className="text-sm font-bold shrink-0">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <p className="text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        ))}
      </div>

      <div className="p-5 sm:p-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${todayAlreadyVerified ? 'bg-emerald-100' : todayRejected ? 'bg-red-100' : 'bg-blue-100'}`}>
              <svg className={`w-5 h-5 ${todayAlreadyVerified ? 'text-emerald-600' : todayRejected ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">Daily GPS Check-In</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{activePost.company_name} · {activePost.location_name || 'OJT Site'}</p>
            </div>
          </div>
          {todayAlreadyVerified && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">✓ Verified</span>}
          {todayRejected && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-red-100 text-red-700 border border-red-200 shrink-0">✕ Rejected</span>}
        </div>
      </div>

      <div className="p-5 sm:p-6 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Geofence Radius</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{activePost.geofence_radius_m}m</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Today's Status</p>
            <p className={`text-lg font-bold mt-0.5 ${todayAlreadyVerified ? 'text-emerald-600' : todayRejected ? 'text-red-600' : 'text-slate-400'}`}>{todayAlreadyVerified ? 'Present' : todayRejected ? 'Absent' : 'Not checked in'}</p>
          </div>
        </div>

        {result && result.distance_m != null && (
          <GeofenceViz distanceM={result.distance_m} radiusM={activePost.geofence_radius_m} verified={result.status === 'verified'} />
        )}

        {!result && todayLog && todayLog.verification_status !== 'pending' && (
          <div className={`rounded-xl p-4 border ${todayAlreadyVerified ? 'bg-emerald-50 border-emerald-200' : todayRejected ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-semibold ${todayAlreadyVerified ? 'text-emerald-700' : todayRejected ? 'text-red-700' : 'text-slate-600'}`}>{todayAlreadyVerified ? '✓ Checked in today' : todayRejected ? '✕ Rejected today' : 'Checked in'}</p>
            <p className="text-xs text-slate-500 mt-1">{todayLog.distance_m != null ? `Distance: ${formatDistance(todayLog.distance_m)} · ${todayLog.hours_rendered || 0}h rendered` : `${todayLog.hours_rendered || 0}h rendered`}</p>
          </div>
        )}

        {result && (
          <div className={`rounded-xl p-4 border ${result.status === 'verified' ? 'bg-emerald-50 border-emerald-200' : result.status === 'rejected_outside_geofence' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-semibold ${result.status === 'verified' ? 'text-emerald-700' : result.status === 'rejected_outside_geofence' ? 'text-red-700' : 'text-amber-700'}`}>{result.message}</p>
            {gpsAccuracy != null && <p className="text-[10px] text-slate-400 mt-1.5">GPS accuracy: ±{Math.round(gpsAccuracy)}m</p>}
          </div>
        )}

        <button
          onClick={handleCheckIn}
          disabled={checkingIn || todayAlreadyVerified}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] ${todayAlreadyVerified ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed border border-emerald-200' : checkingIn ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'}`}
        >
          {checkingIn ? (
            <><svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Getting your location…</>
          ) : todayAlreadyVerified ? (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>Already checked in today</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>{todayRejected ? 'Retry Check-In' : 'Check In Now'}</>
          )}
        </button>

        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          Your browser will ask for location permission. We compare your GPS position to the company's coordinates using the Haversine formula. Make sure you're within <strong className="text-slate-500">{activePost.geofence_radius_m}m</strong> of the OJT site.
        </p>
      </div>

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

function GeofenceViz({ distanceM, radiusM, verified }: { distanceM: number; radiusM: number; verified: boolean }) {
  const cx = 100, cy = 60;
  const maxDisplayRadius = 50;
  const fenceDisplayRadius = Math.min(maxDisplayRadius, 40);
  const ratio = distanceM / radiusM;
  const studentX = cx + Math.min(ratio, 1.8) * fenceDisplayRadius;
  const studentY = cy;

  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Distance Visualization</p>
        <p className={`text-xs font-bold ${verified ? 'text-emerald-600' : 'text-red-600'}`}>{formatDistance(distanceM)} {verified ? '✓' : '✕'}</p>
      </div>
      <svg viewBox="0 0 200 120" className="w-full h-24">
        <line x1="0" y1="60" x2="200" y2="60" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx={cx} cy={cy} r={fenceDisplayRadius} fill={verified ? '#d1fae5' : '#fee2e2'} fillOpacity="0.5" stroke={verified ? '#10b981' : '#ef4444'} strokeWidth="2" strokeDasharray="3 2" />
        <rect x={cx - 6} y={cy - 6} width="12" height="12" rx="2" fill="#1e293b" />
        <text x={cx} y={cy + 20} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 8, fontWeight: 600 }}>Company</text>
        <circle cx={studentX} cy={studentY} r="5" fill={verified ? '#10b981' : '#ef4444'} stroke="white" strokeWidth="2" />
        <text x={studentX} y={studentY - 10} textAnchor="middle" className={verified ? 'fill-emerald-600' : 'fill-red-600'} style={{ fontSize: 8, fontWeight: 700 }}>You</text>
        <line x1={cx} y1={cy} x2={studentX} y2={studentY} stroke={verified ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      <p className="text-[10px] text-slate-400 text-center mt-1">{verified ? `You're inside the ${radiusM}m geofence — attendance verified.` : `You're outside the ${radiusM}m geofence — move closer to the OJT site.`}</p>
    </div>
  );
}
