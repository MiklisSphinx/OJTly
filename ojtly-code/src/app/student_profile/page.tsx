'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import NotificationBell from '@/components/NotificationBell';
import ChatPanel from '@/components/ChatPanel';
import GeofenceCheckIn from '@/components/GeofenceCheckIn';
import StudentAnalytics from '@/components/StudentAnalytics';
import StudentCertificate from '@/components/StudentCertificate';

const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  RESUMES: 'resumes',
} as const;

type UserProfile = {
  id?: string;
  name: string;
  course: string;
  location: string;
  school: string;
  yearLevel: string;
  avatar: string | null;
  resumeUrl: string | null;
  resumeName: string;
  skills?: string[];
};

type OJTProgress = {
  completed: number;
  total: number;
  company: string;
  status: 'Ongoing' | 'Completed' | 'Not Started';
  appStatus: string | null;
};

type AttendanceEntry = {
  id: string;
  student_id: string;
  log_date: string;
  status: 'present' | 'absent' | 'late';
  hours_rendered?: number;
  clock_in?: string;
  clock_out?: string;
  created_at?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<UserProfile>({
    name: '',
    course: '',
    location: '',
    school: '',
    yearLevel: '',
    avatar: null,
    resumeUrl: null,
    resumeName: 'No resume uploaded'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<{name: string; url: string}[]>([]);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [progress, setProgress] = useState<OJTProgress>({
    completed: 0,
    total: 500,
    company: '',
    status: 'Not Started',
    appStatus: null
  });

  const [attendedDays, setAttendedDays] = useState<Set<string>>(new Set());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dailyHours, setDailyHours] = useState<number>(8);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [companyUserId, setCompanyUserId] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);

  const [tempUser, setTempUser] = useState<UserProfile>(user);
  // ❌ REMOVED: tempCompany, tempTotal, isProgressModalOpen — the student
  // can no longer edit required_hours or assigned_company. Those values
  // come from the accepted application's post (duration_hours) and the
  // company_name on that post, both read-only.

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  const progressPercent = progress.total > 0 ? Math.min((progress.completed / progress.total) * 100, 100) : 0;

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (isProfileModalOpen || isCalendarModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isProfileModalOpen, isCalendarModalOpen]);

  useEffect(() => {
    let mounted = true;

    const loadMyData = async () => {
      setIsLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const userId = user.id;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!mounted) return;

        if (profile && !profileError) {
          const mappedData: UserProfile = {
            id: profile.id,
            name: profile.full_name || 'Student',
            course: profile.course || 'N/A',
            location: profile.location || 'Not specified',
            school: profile.school_name || 'Not specified',
            yearLevel: profile.year_level || 'N/A',
            avatar: profile.avatar_url || null,
            resumeUrl: profile.resume_url || null,
            resumeName: profile.resume_url
              ? profile.resume_url.split('/').pop() || 'Document'
              : 'No resume uploaded',
            skills: profile.skills || []
          };

          setUser(mappedData);
          setTempUser(mappedData);
          setSkills(profile.skills || []);
          setPortfolioLinks(profile.portfolio_links || []);

          const { data: applicationData, error: fetchError } = await supabase
            .from('applications')
            .select(`
              status,
              ojt_posts:post_id (
                duration_hours,
                title,
                companies:company_id (
                  company_name,
                  user_id
                )
              )
            `)
            .eq('student_id', userId)
            .ilike('status', 'accepted')
            .maybeSingle();

          const fetchedCompanyName: string | undefined = (applicationData as any)?.ojt_posts?.companies?.company_name;
          const fetchedCompanyUserId: string | undefined = (applicationData as any)?.ojt_posts?.companies?.user_id;
          // ✅ Pull required_hours from the POST (duration_hours) — this is the
          // source of truth set by the company when creating the post. We fall
          // back to profile.required_hours only if the post doesn't have it.
          const fetchedPostDurationHours: number | undefined = (applicationData as any)?.ojt_posts?.duration_hours;
          const currentAppStatus: string | null = applicationData?.status?.toLowerCase() ?? null;

          let companyName = profile.assigned_company || "";

          if (currentAppStatus === 'accepted' && fetchedCompanyName) {
            companyName = fetchedCompanyName;
            if (fetchedCompanyUserId) {
              setCompanyUserId(fetchedCompanyUserId);
            } else {
              const { data: companyRow } = await supabase
                .from('companies')
                .select('user_id')
                .eq('company_name', companyName)
                .maybeSingle();
              if (companyRow?.user_id) {
                setCompanyUserId(companyRow.user_id);
              }
            }
            await supabase
              .from('profiles')
              .update({ assigned_company: companyName })
              .eq('id', userId);
          } else if (currentAppStatus === 'accepted' && companyName) {
            const { data: companyRow } = await supabase
              .from('companies')
              .select('user_id')
              .eq('company_name', companyName)
              .maybeSingle();
            if (companyRow?.user_id) {
              setCompanyUserId(companyRow.user_id);
            }
          }

          if (companyName && currentAppStatus === 'accepted') {
            setProgress(prev => ({
              ...prev,
              company: companyName,
              status: profile.ojt_status === 'Completed' ? 'Completed' : 'Ongoing',
              appStatus: currentAppStatus,
              // ✅ Use the post's duration_hours (set by company) as the
              // required total. This is read-only — the student can no longer
              // edit it from the profile (the edit pencil + modal were
              // removed). Falls back to profile.required_hours if the post
              // doesn't have duration_hours set.
              total: Number(fetchedPostDurationHours) || Number(profile.required_hours) || prev.total
              // NOTE: 'completed' is intentionally NOT set here — fetchTotalHours()
              // below populates it from ALL verified attendance_logs so the bar
              // reflects the all-time total, not just the current month.
            }));
            // ❌ REMOVED: setTempCompany(companyName) — tempCompany state was
            // deleted along with the edit modal.
          } else {
            setProgress(prev => ({
              ...prev,
              company: '',
              total: Number(profile.required_hours) || prev.total,
              status: profile.ojt_status || 'Not Started',
              appStatus: currentAppStatus
            }));
            // ❌ REMOVED: setTempTotal(...) — tempTotal state was deleted.
          }

          // Drive progress.completed from ALL verified logs (across all months)
          await fetchTotalHours(userId);
          // And separately refresh the calendar dots for the current month
          await fetchAttendanceData(userId, currentMonth, currentYear);
        }
      } catch (error) {
        console.error('❌ Load error:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadMyData();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('assigned_company')
            .eq('id', user.id)
            .single();
          const currentCompanyName = profile?.assigned_company || '';

          if (currentCompanyName !== progress.company) {
            setProgress(p => ({ ...p, company: currentCompanyName }));
            // ❌ REMOVED: setTempCompany(currentCompanyName) — tempCompany
            // state was deleted along with the edit modal.
          }

          // Re-sync ALL-time hours on focus/visibility (cheap query, fixes
          // the bug where returning to the tab showed stale 0 hours)
          await fetchTotalHours(user.id);
          await fetchAttendanceData(user.id, currentMonth, currentYear);
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearTimeout(refreshTimeout);
    };
  }, [progress.company, currentMonth, currentYear]);

  // ============================================================
  // 💬 CHAT UNREAD BADGE — count unread messages from company + realtime
  // ============================================================
  useEffect(() => {
    if (!user.id) return;

    const fetchUnread = async () => {
      try {
        // Find all conversations where this student is a participant
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);
        const convIds = (convs || []).map((c: any) => c.id);
        if (convIds.length === 0) {
          setChatUnread(0);
          return;
        }
        // Count unread messages NOT sent by me
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .eq('is_read', false);
        setChatUnread(count || 0);
      } catch (err) {
        console.error('💬 Unread count error:', err);
      }
    };

    fetchUnread();

    // Realtime — update when new messages arrive or are read
    const channel = supabase
      .channel(`profile-chat-unread:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id, supabase]);

  const getAuthenticatedUser = async (): Promise<User | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) return null;
      if (!session || !session.user) return null;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) return null;
      return user;
    } catch (err) {
      console.error('Auth Error:', err);
      return null;
    }
  };

  const syncSkillsToDB = useCallback(async (newSkills: string[]) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) throw new Error('Session Lost');
      const { data, error } = await supabase
        .from('profiles')
        .update({ skills: newSkills, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)
        .select('skills');
      if (error) throw error;
    } catch (err: any) {
      showToast(`Failed to save skills: ${err?.message}`, 'error');
    }
  }, []);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newSkill = skillInput.trim();
      if (newSkill && !skills.includes(newSkill)) {
        const updatedSkills = [...skills, newSkill];
        setSkills(updatedSkills);
        setSkillInput('');
        syncSkillsToDB(updatedSkills);
      } else {
        setSkillInput('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    syncSkillsToDB(updatedSkills);
  };

  const syncPortfolioToDB = useCallback(async (newLinks: {name: string; url: string}[]) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) throw new Error('Session Lost');
      const { error } = await supabase
        .from('profiles')
        .update({ portfolio_links: newLinks, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);
      if (error) throw error;
    } catch (err: any) {
      showToast(`Failed to save portfolio: ${err.message}`, 'error');
    }
  }, [showToast]);

  const addPortfolioLink = () => {
    const name = portfolioName.trim();
    const url = portfolioUrl.trim();
    if (!name || !url) return;
    if (!url.startsWith('http')) {
      showToast('URL must start with http:// or https://', 'error');
      return;
    }
    const updated = [...portfolioLinks, { name, url }];
    setPortfolioLinks(updated);
    setPortfolioName('');
    setPortfolioUrl('');
    syncPortfolioToDB(updated);
  };

  const removePortfolioLink = (index: number) => {
    const updated = portfolioLinks.filter((_, i) => i !== index);
    setPortfolioLinks(updated);
    syncPortfolioToDB(updated);
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      return;
    }
    showToast('📍 Detecting location...', 'info');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
          );
          const data = await response.json();
          if (data && data.display_name) {
            const addressParts = data.address || {};
            const formattedLocation = [
              addressParts.city || addressParts.town || addressParts.village || addressParts.county,
              addressParts.state || addressParts.region,
              addressParts.country
            ].filter(Boolean).join(', ');
            const newLocation = formattedLocation || data.display_name;
            setUser(prev => ({ ...prev, location: newLocation }));
            setTempUser(prev => ({ ...prev, location: newLocation }));
            showToast(`📍 Location: ${newLocation}`, 'success');
            const authUser = await getAuthenticatedUser();
            if (authUser) {
              await supabase.from('profiles').update({
                location: newLocation,
                updated_at: new Date().toISOString()
              }).eq('id', authUser.id);
              router.refresh();
            }
          } else {
            const coordLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setUser(prev => ({ ...prev, location: coordLocation }));
            showToast(`📍 Coordinates saved`, 'success');
          }
        } catch (geoError) {
          showToast('Using coordinates only', 'info');
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showToast('❌ Location permission denied', 'error');
            break;
          default:
            showToast('❌ Location detection failed', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const normalizeLogDate = (raw?: string): string => (raw ? raw.split('T')[0] : '');

  // fetchTotalHours: sums ALL verified attendance_logs across all months
  // — but ONLY for the CURRENT (non-archived) OJT. Archived logs from a
  // previously-completed OJT are excluded so the bar starts fresh at 0
  // when the student begins a new OJT. The certificate generator reads
  // archived=true separately to compute hours for the finished OJT.
  const fetchTotalHours = async (userId: string) => {
    if (!userId) return 0;
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('hours_rendered')
        .eq('student_id', userId)
        .eq('verification_status', 'verified')
        .eq('archived', false);
      if (error) throw error;
      const total = (data || []).reduce((s: number, r: any) => s + (Number(r.hours_rendered) || 0), 0);
      setProgress(prev => ({ ...prev, completed: total }));
      return total;
    } catch (err: any) {
      // Supabase often returns {} — extract a real message
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        err?.code ||
        (err?.error && typeof err.error === 'string' ? err.error : null) ||
        JSON.stringify(err);
      console.error('❌ fetchTotalHours error:', msg, err);
      return 0;
    }
  };

  // fetchAttendanceData: fetches the SELECTED MONTH's verified logs for the
  // calendar dots and the "X days this month" counter. It no longer touches
  // progress.completed — that's owned by fetchTotalHours so the bar stays
  // correct even when the selected month has no entries.
  const fetchAttendanceData = async (userId: string, month?: number, year?: number) => {
    if (!userId) return;
    try {
      let query = supabase.from('attendance_logs').select('*').eq('student_id', userId).eq('verification_status', 'verified').eq('archived', false);
      if (month !== undefined && year !== undefined) {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const nextMonthIdx = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const endDateExclusive = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-01`;
        query = query.gte('log_date', startDate).lt('log_date', endDateExclusive);
      }
      query = query.order('log_date', { ascending: true });
      const { data: attendanceData, error: attendanceError } = await query;
      if (attendanceError) throw attendanceError;
      if (attendanceData && attendanceData.length > 0) {
        const dateSet = new Set<string>();
        const normalizedRecords = (attendanceData as AttendanceEntry[]).map((record) => {
          const normalized = { ...record, log_date: normalizeLogDate(record.log_date) };
          dateSet.add(normalized.log_date);
          return normalized;
        });
        setAttendedDays(dateSet);
        setAttendanceRecords(normalizedRecords);
      } else {
        setAttendedDays(new Set());
        setAttendanceRecords([]);
      }
      return attendanceData;
    } catch (err) {
      console.error("Attendance fetch error:", err);
      return null;
    }
  };

  // ✅ FIXED: GPS-only attendance. Clicking calendar days just shows a message.
  const handleDayClick = async (day: number) => {
    showToast('📍 Use the GPS Check-In above to mark your daily attendance.', 'info');
    return;
  };

  const handleSaveProfile = async () => {
    if (!tempUser.name.trim()) { showToast('Name required', 'error'); return; }
    setIsSaving(true);
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) throw new Error('Session Lost');
      let avatarUrl = tempUser.avatar;
      if (tempUser.avatar && tempUser.avatar.startsWith('data:')) {
        const base64Data = tempUser.avatar.split(',')[1];
        const fileType = tempUser.avatar.split(';')[0].split(':')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .upload(`${authUser.id}/avatar_${Date.now()}`, bytes, { contentType: fileType, upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .getPublicUrl(uploadData?.path || `${authUser.id}/avatar`);
        avatarUrl = publicUrl;
      }
      // ✅ REMOVED from the upsert payload: assigned_company, required_hours,
      // ojt_status. The student should NOT be able to overwrite these from
      // their profile edit — they're set by the company's post (duration_hours)
      // and the accept/finish-OJT flows. Only personal fields are saved here.
      const { error } = await supabase.from('profiles').upsert({
        id: authUser.id, email: authUser.email, full_name: tempUser.name.trim(),
        course: tempUser.course.trim(), location: tempUser.location.trim(),
        school_name: tempUser.school.trim(), year_level: tempUser.yearLevel,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) throw error;
      setUser(prev => ({
        ...prev, name: tempUser.name.trim(), course: tempUser.course.trim(),
        location: tempUser.location.trim(), school: tempUser.school.trim(),
        yearLevel: tempUser.yearLevel, avatar: avatarUrl
      }));
      setIsProfileModalOpen(false);
      router.refresh();
      showToast('Saved! 🎉', 'success');
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error');
    } finally { setIsSaving(false); }
  };

  // ❌ REMOVED: handleSaveProgress — no longer needed because the
  // "Update OJT Details" modal was deleted. The student can't edit
  // required_hours or assigned_company anymore. Those values come from
  // the company's post (duration_hours) and the accepted application.

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('File < 10MB', 'error'); return; }
    setUploadingFile('resume');
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) throw new Error('Auth Required');
      const filePath = `${authUser.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.RESUMES)
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(`Storage: ${uploadError.message}`);
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.RESUMES).getPublicUrl(filePath);
      if (!urlData.publicUrl) throw new Error('URL Gen Failed');
      const { error: dbError } = await supabase.from('profiles')
        .update({ resume_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', authUser.id).select();
      if (dbError) throw new Error(`DB: ${dbError.message}`);
      const isImg = file.type.startsWith('image/');
      setUser(prev => ({ ...prev, resumeName: file.name, resumeUrl: urlData.publicUrl }));
      router.refresh();
      showToast(isImg ? 'Screenshot saved! 📸' : 'Uploaded! 📄', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setUploadingFile(null); e.target.value = ''; }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image < 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => setTempUser(prev => ({ ...prev, avatar: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) console.error('SignOut error:', error.message);
      setUser({ name: '', course: '', location: '', school: '', yearLevel: '', avatar: null, resumeUrl: null, resumeName: 'No resume uploaded' });
      setProgress({ completed: 0, total: 500, company: '', status: 'Not Started', appStatus: null });
      setAttendedDays(new Set());
      setAttendanceRecords([]);
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('sb-') || key.includes('supabase') || key.includes('ojtly'))) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      router.push('/student/login');
    } catch (err) {
      window.location.href = '/student/login';
    } finally {
      setIsSaving(false);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const isDayAttended = (day: number): boolean => {
    return attendedDays.has(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const getDayRecord = (day: number): AttendanceEntry | undefined => {
    return attendanceRecords.find(r => r.log_date === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const isUploadedFileImage = (): boolean => {
    if (!user.resumeUrl) return false;
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => user.resumeName?.toLowerCase().endsWith(ext));
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans relative overflow-x-hidden">
      {toast && (
        <div className={`fixed top-16 sm:top-20 right-2 sm:right-4 left-2 sm:left-auto z-[60] px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 max-w-[calc(100vw-1rem)] sm:max-w-md ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="font-medium text-xs sm:text-sm">{toast.message}</p>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-14 sm:h-16">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-1 shrink-0">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate px-2 flex-1 text-center">My Profile</h1>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NotificationBell />
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-bold text-slate-900">
              <span className="text-blue-600 text-base sm:text-xl">◉</span>
              <span className="hidden xs:inline">OJTly</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-20 sm:pb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex items-center justify-between relative z-10 gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold border-2 border-white/50 overflow-hidden backdrop-blur-sm shrink-0">
                {user.avatar ? (
                  <img src={user.avatar ?? undefined} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold truncate">{user.name}</h2>
                <p className="text-blue-100 text-xs sm:text-sm">{user.course}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-200">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  </svg>
                  <span className="truncate">{user.location === 'Not specified' ? 'Set location' : user.location}</span>
                  <button onClick={detectLocation} className="shrink-0 p-1 bg-white/20 hover:bg-white/30 rounded-full transition-all ml-1" title="Detect my location">
                    <svg className={`w-3 h-3 ${user.location !== 'Not specified' ? 'text-green-300' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                    </svg>
                  </button>
                </div>
                {(() => {
                  const checks = [
                    !!user.name && user.name !== 'Student',
                    !!user.course && user.course !== 'N/A',
                    !!user.school && user.school !== 'Not specified',
                    user.location !== 'Not specified' && !!user.location,
                    !!user.yearLevel,
                    !!user.avatar,
                    !!user.resumeUrl,
                    skills.length > 0,
                    portfolioLinks.length > 0,
                  ];
                  const completed = checks.filter(Boolean).length;
                  const pct = Math.round((completed / checks.length) * 100);
                  return (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-blue-200 mb-1">
                        <span>Profile Completion</span>
                        <span className="font-bold text-white">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : 'bg-white'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <button
              onClick={() => { setTempUser(user); setIsProfileModalOpen(true); }}
              className="p-2 sm:p-3 bg-white/20 rounded-full hover:bg-white/30 transition-all shrink-0"
              aria-label="Edit profile"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">OJT Progress</h3>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${
                progress.status === 'Completed' ? 'bg-green-100 text-green-700' :
                progress.company ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {progress.status}
              </span>
              {/* ❌ REMOVED: the edit pencil button that opened the "Update OJT
                  Details" modal. The student should NOT be able to edit
                  required_hours or assigned_company — those come from the
                  company's post (duration_hours) and the accepted application.
                  The whole modal + handleSaveProgress were also removed. */}
            </div>
          </div>

          <div className="flex items-end justify-between mb-3">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {progress.completed}<span className="text-sm sm:text-lg text-slate-400 font-normal ml-1">/{progress.total}</span>
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">{Math.round(progressPercent)}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 sm:h-4 mb-4 sm:mb-5 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progressPercent >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                progress.company ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className={`flex items-center gap-2 sm:gap-3 text-xs sm:text-sm p-3 sm:p-4 rounded-xl border ${
              progress.company ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                progress.company ? 'bg-emerald-100' : 'bg-blue-100'
              }`}>
                <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${progress.company ? 'text-emerald-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[10px] sm:text-xs block font-medium ${
                  progress.company ? 'text-emerald-600' : 'text-slate-400'
                }`}>Company</span>
                {isLoading ? (
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                  <span className={`font-semibold truncate block text-xs sm:text-sm ${
                    progress.company ? 'text-emerald-900' : 'text-slate-500 italic'
                  }`}>
                    {progress.company || 'Not assigned yet'}
                  </span>
                )}
                {progress.appStatus === 'accepted' && progress.company && !isLoading && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 bg-emerald-50 p-3 sm:p-4 rounded-xl border border-emerald-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-slate-400 block">Days Attended</span>
                <span className="font-semibold text-emerald-800 truncate block text-xs sm:text-sm">{attendedDays.size} days this month</span>
              </div>
            </div>

            <button
              onClick={() => setIsCalendarModalOpen(true)}
              disabled={!progress.company}
              className={`sm:col-span-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold p-3 sm:p-4 rounded-xl transition-all active:scale-[0.98] border ${
                progress.company
                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer'
                  : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              📅 View Attendance ({attendedDays.size} days)
              {!progress.company && <span className="text-[10px] sm:text-xs ml-1 opacity-70">(Assign company first)</span>}
            </button>
          </div>
        </div>

        {/* GPS Check-In widget */}
        {user.id && <GeofenceCheckIn studentId={user.id} />}
        {user.id && <StudentCertificate studentId={user.id} />}
        {/* Analytics dashboard */}
        {user.id && <StudentAnalytics studentId={user.id} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Student Information</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
                { label: 'School', value: user.school },
                { label: 'Course', value: user.course },
                { label: 'Year Level', value: user.yearLevel }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center pb-2 sm:pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <span className="text-xs sm:text-sm text-slate-500">{item.label}</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 px-2 sm:px-3 py-1 rounded-lg max-w-[55%] sm:max-w-[60%] truncate text-right">
                    {item.value}
                  </span>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 mb-2">Skills & Expertise</label>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                  {skills.length > 0 ? skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 animate-in fade-in zoom-in duration-200"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )) : (
                    <span className="text-xs text-slate-400 italic py-1">No skills added yet</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type skill and press Enter..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Used for matching OJT posts (KNN)</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500">Portfolio Links</label>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${portfolioLinks.length >= 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                    {portfolioLinks.length}/5
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                  {portfolioLinks.length > 0 ? portfolioLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <span className="truncate max-w-[120px]">{link.name}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); removePortfolioLink(i); }}
                        className="ml-0.5 shrink-0 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </a>
                  )) : (
                    <span className="text-xs text-slate-400 italic py-1">No portfolio links yet</span>
                  )}
                </div>

                {portfolioLinks.length < 5 ? (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      value={portfolioName}
                      onChange={(e) => setPortfolioName(e.target.value)}
                      placeholder="Name (e.g. GitHub)"
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                    />
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPortfolioLink(); } }}
                      placeholder="https://..."
                      className="flex-[2] min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                    />
                    <button
                      onClick={addPortfolioLink}
                      disabled={!portfolioName.trim() || !portfolioUrl.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0 sm:self-stretch"
                    >
                      + Add
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-500 italic py-2">Maximum 5 links reached. Remove one to add another.</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Companies can view these when reviewing your application</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Documents</h3>
            </div>

            <label className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all flex-1 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] ${
              uploadingFile === 'resume'
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
            }`}>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,image/*"
                onChange={handleResumeUpload}
                disabled={!!uploadingFile}
              />
              <div className="flex flex-col items-center gap-2 sm:gap-3 text-slate-400">
                {uploadingFile === 'resume' ? (
                  <>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-blue-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    {isUploadedFileImage() && user.resumeUrl ? (
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm group">
                        <img
                          src={user.resumeUrl ?? undefined}
                          alt="Uploaded doc"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v-12"/>
                        </svg>
                      </div>
                    )}
                    <div className="text-center px-2">
                      <span className="text-xs sm:text-sm font-semibold block">
                        {user.resumeName === 'No resume uploaded' ? 'Upload Resume/Screenshot' : 'Click to replace'}
                      </span>
                      <span className="text-[10px] sm:text-xs mt-1 block truncate max-w-[160px] sm:max-w-[180px]">
                        {user.resumeName === 'No resume uploaded'
                          ? 'PDF, Images, Word docs allowed'
                          : (<>{isUploadedFileImage() && '🖼️ '}{user.resumeName}</>)
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </label>

            <button
              onClick={handleLogout}
              className="mt-3 sm:mt-4 w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs sm:text-sm font-semibold py-2.5 sm:py-3.5 rounded-xl transition-all active:scale-[0.98] border border-red-200"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3v1"/>
              </svg>
              Log out
            </button>
          </div>
        </div>
      </main>

      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          style={{ touchAction: 'none', overflow: 'hidden' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsProfileModalOpen(false); }}
        >
          <div
            className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Edit Profile</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(95vh - 130px)' }}>
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-lg flex items-center justify-center text-2xl sm:text-3xl font-bold text-slate-400 overflow-hidden">
                    {tempUser.avatar ? (
                      <img src={tempUser.avatar ?? undefined} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      tempUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 sm:p-2 shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 sm:translate-y-2 group-hover:translate-y-0 transition-all cursor-pointer border-2 border-white">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v6m0 0l-3-3m3 3l3-3"/>
                    </svg>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                    value={tempUser.name}
                    onChange={(e) => setTempUser({ ...tempUser, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">Course</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm sm:text-base"
                      value={tempUser.course}
                      onChange={(e) => setTempUser({ ...tempUser, course: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm sm:text-base"
                      value={tempUser.yearLevel}
                      onChange={(e) => setTempUser({ ...tempUser, yearLevel: e.target.value })}
                    >
                      <option value="">Select</option>
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">School</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                    value={tempUser.school}
                    onChange={(e) => setTempUser({ ...tempUser, school: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Location</label>
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Auto-Detect 📍
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                    value={tempUser.location}
                    onChange={(e) => setTempUser({ ...tempUser, location: e.target.value })}
                    placeholder="Click 'Auto-Detect' or type manually"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-2 sm:gap-3 bg-slate-50 sticky bottom-0 shrink-0">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50 text-sm sm:text-base transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || !tempUser.name.trim()}
                className={`flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base transition-colors ${
                  !isSaving && tempUser.name.trim() ? 'hover:bg-blue-700 active:scale-[0.98]' : ''
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ❌ REMOVED: the "Update OJT Details" modal used to live here. It
          let the student edit required_hours + assigned_company, which
          overwrote the values set by the company's post. The whole modal
          is gone — the student profile is now read-only for OJT details. */}

      {isCalendarModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-3 sm:p-4"
          style={{ overflow: 'hidden' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCalendarModalOpen(false); }}
        >
          <div
            className="bg-white rounded-xl sm:rounded-2xl w-full max-w-sm shadow-lg overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <button
                onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="text-center">
                <h3 className="font-bold text-lg sm:text-xl text-slate-800">{monthNames[currentMonth]}</h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{currentYear}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <button
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 text-lg leading-none transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div
              className="px-3 sm:px-5 py-3 sm:py-4 overflow-y-auto overscroll-contain flex-1"
              style={{ maxHeight: 'calc(95vh - 180px)' }}
            >
              <div className="grid grid-cols-7 mb-1.5 sm:mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className={`text-center text-[10px] sm:text-xs font-bold py-1.5 sm:py-2 ${i === 0 || i === 6 ? 'text-red-400' : 'text-slate-400'}`}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-11"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const record = getDayRecord(day);
                  const marked = isDayAttended(day);
                  const today = new Date();
                  const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                  const future = new Date(currentYear, currentMonth, day) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <button
                      key={day}
                      onClick={() => !future && handleDayClick(day)}
                      disabled={future}
                      tabIndex={-1}
                      className={`rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm font-medium transition-all h-10 sm:h-11 w-full ${
                        marked
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : future
                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                            : isToday
                              ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-400 hover:bg-blue-100'
                              : 'text-slate-700 hover:bg-slate-50 active:scale-95'
                      }`}
                    >
                      <span>{day}</span>
                      {marked && record?.hours_rendered && (
                        <span className="text-[8px] sm:text-[9px] opacity-90 mt-0.5">{record.hours_rendered}h</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {attendedDays.size === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-400">
                  <p className="text-xs sm:text-sm font-medium">No attendance yet</p>
                  <p className="text-[10px] sm:text-xs mt-1">Use GPS Check-In above to mark attendance</p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 space-y-2.5 sm:space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="font-medium text-slate-600">{attendedDays.size} days</span>
                  {attendedDays.size > 0 && <span className="text-slate-400">· {progress.completed}h</span>}
                </div>
                <button
                  onClick={() => { const n = new Date(); setCurrentMonth(n.getMonth()); setCurrentYear(n.getFullYear()); }}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }
        html, body {
          overflow-x: hidden;
          width: 100%;
          height: 100%;
        }
        .overscroll-contain {
          overscroll-behavior: contain;
        }
      `}</style>

      {user.id && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1">
          {(() => {
            const canChat = progress.appStatus === 'accepted' && progress.company && progress.status !== 'Completed' && companyUserId;
            const reason = !canChat
              ? progress.status === 'Completed' ? 'Chat archived'
              : progress.appStatus !== 'accepted' ? 'Not accepted yet'
              : !companyUserId ? 'Loading...'
              : 'Unavailable'
              : '';

            return (
              <>
                <button
                  onClick={() => canChat && setShowChat(true)}
                  disabled={!canChat}
                  className={`w-14 h-14 rounded-full shadow-lg transition-all flex items-center justify-center relative ${
                    canChat
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={canChat ? `Message ${progress.company}${chatUnread > 0 ? ` · ${chatUnread} unread` : ''}` : reason}
                >
                  <svg className="w-7 h-7 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {!canChat && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" />
                      </svg>
                    </span>
                  )}
                  {/* 🔴 Red badge + 🟢 blue pulsing ring when there are unread messages */}
                  {canChat && chatUnread > 0 && (
                    <>
                      {/* Blue pulsing ring — matches the button color */}
                      <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>
                      {/* Red badge with unread count */}
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 ring-2 ring-white shadow-md z-10">
                        {chatUnread > 9 ? '9+' : chatUnread}
                      </span>
                    </>
                  )}
                </button>
                {!canChat && (
                  <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {reason}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {showChat && user.id && companyUserId && (
        <ChatPanel
          myUserId={user.id}
          otherUserId={companyUserId}
          myName={user.name}
          otherName={progress.company}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
