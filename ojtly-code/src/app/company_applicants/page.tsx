'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function ApplicantsPage() {
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
   const [currentCompanyName, setCurrentCompanyName] = useState(''); 

  // --- HELPERS ---
  const getFileType = (url: string | null | undefined) => {
    if (!url) return 'unknown';
    const cleanUrl = url.toLowerCase().split('?')[0];
    if (cleanUrl.endsWith('.pdf')) return 'pdf';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => cleanUrl.endsWith(ext))) return 'image';
    return 'unknown';
  };

  const getResumeLink = (pathOrUrl: string | null | undefined) => {
    if (!pathOrUrl) return "#";
    if (pathOrUrl.startsWith('http')) {
      const separator = pathOrUrl.includes('?') ? '&' : '?';
      return `${pathOrUrl}${separator}t=${new Date().getTime()}`;
    }
    const { data } = supabase.storage.from('resumes').getPublicUrl(pathOrUrl);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  const getResumeEmbedLink = (pathOrUrl: string | null | undefined) => {
    if (!pathOrUrl) return "";
    const baseUrl = pathOrUrl.startsWith('http') 
      ? pathOrUrl.split('?')[0] 
      : supabase.storage.from('resumes').getPublicUrl(pathOrUrl).data.publicUrl.split('?')[0];
    return `${baseUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: company } = await supabase
          .from('companies')
          .select('id, company_name') // ✅ ADD company_name here
          .eq('user_id', user.id)
          .single();

        if (!company) return;
        
        setCurrentCompanyName(company.company_name || ''); // ✅ SET THE NAME

        const { data, error } = await supabase
          .from('ojt_posts')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);

      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchPosts();
  }, []);

  // ==========================================
  // STEP 2: AUTO-SELECT FIRST POST
  // ==========================================
  useEffect(() => {
    if (posts.length > 0 && !selectedPostId) {
      setSelectedPostId(posts[0].id);
    }
  }, [posts, selectedPostId]);

  // ==========================================
  // STEP 3: FETCH APPLICANTS (Filtered by Post)
  // ==========================================
  const fetchApplicants = async (postId: string) => {
    if (!postId) return;

    setIsLoadingApps(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ ADDED ojt_status and assigned_company to profile fetch
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          post_id,
          student_id,  
          profiles:student_id (
            full_name,
            resume_url,
            avatar_url,
            email,
            ojt_status,
            assigned_company
          )
        `)
        .eq('post_id', postId);

      if (error) {
        console.error("Fetch Error:", error.message);
      } else {
        setApplicants(data || []);
      }
    } catch (error) {
      console.error("Fetch Catch Error:", error);
    } finally {
      setIsLoadingApps(false);
    }
  };

  // ==========================================
  // STEP 4: TRIGGER FETCH WHEN POST CHANGES
  // ==========================================
  useEffect(() => {
    if (selectedPostId) {
      fetchApplicants(selectedPostId);
    } else {
      setApplicants([]);
    }
  }, [selectedPostId]);

  // ==========================================
  // REALTIME LISTENER
  // ==========================================
  useEffect(() => {
    const channel = supabase
      .channel('live-resume-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          if (selectedPostId) fetchApplicants(selectedPostId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPostId]);

  const refreshPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      const { data, error } = await supabase
        .from('ojt_posts')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (!error && data) setPosts(data);
    } catch (e) {
      console.error("Error refreshing posts", e);
    }
  };

  const currentPost = posts.find(p => p.id === selectedPostId);
  const stats = {
    total: applicants.length,
    pending: applicants.filter(a => a.status?.toLowerCase() === 'pending').length,
    accepted: applicants.filter(a => a.status?.toLowerCase() === 'accepted').length,
    rejected: applicants.filter(a => a.status?.toLowerCase() === 'rejected').length
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    // ==========================================
  // ✅ UPDATED handleAccept (WITH AUTO-REJECT)
  // ==========================================
  const handleAccept = async (applicant: any) => { 
    if (!applicant) {
      console.error("❌ Error: applicant object is missing or null!");
      return;
    }

    if (!applicant.student_id) {
      console.error("❌ Error: student_id is missing from the applicant object:", applicant);
      alert("Technical Error: Missing Student ID. Check console.");
      return;
    }

    // 1. Check if the student is already accepted elsewhere
    const { data: alreadyAccepted, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', applicant.student_id)
      .eq('status', 'Accepted')
      .maybeSingle();

    if (alreadyAccepted) {
      alert("Cannot accept: This student is already hired by another company!");
      return;
    }

    // Extra check: See if profile is already marked Ongoing
    if (applicant.profiles?.ojt_status === 'Ongoing') {
      alert("Cannot accept: This student is already doing OJT elsewhere!");
      return;
    }

    const post = posts.find(p => p.id === selectedPostId);
    if (!post) return;

    const currentVacancies = post.vacancies || 0;
    if (currentVacancies <= 0) {
      alert("No vacancies left for this position!");
      return;
    }

    try {
      let companyName = "Company";
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: compData } = await supabase
          .from('companies')
          .select('company_name')
          .eq('user_id', user.id)
          .single();
        if (compData?.company_name) companyName = compData.company_name;
      }

      // 2. Accept the current application
      const { data, error: appError, status } = await supabase
        .from('applications')
        .update({ status: 'Accepted' })
        .eq('id', applicant.id)
        .select(); 

      if (appError) throw appError;

      if (data?.length === 0) {
        console.error("❌ Logic Error: Policy allowed the request, but 0 rows were changed.");
        alert("Failed to accept: No rows updated. Check console.");
        return;
      }

      // 3. Update the student's profile to Ongoing
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          assigned_company: companyName, 
          ojt_status: 'Ongoing' 
        })
        .eq('id', applicant.student_id); 

      if (profileError) throw profileError;

      // 4. ✅ THE AUTO-REJECT LOGIC
      // Find every OTHER application for this student that is still 'Pending'
      // and change them to 'Rejected'
      const { error: autoRejectError } = await supabase
        .from('applications')
        .update({ status: 'Rejected' })
        .eq('student_id', applicant.student_id)
        .eq('status', 'Pending') // Only touch the ones that are still waiting
        .neq('id', applicant.id); // DO NOT reject the one we just accepted!

      if (autoRejectError) {
        console.error("Failed to auto-reject other applications:", autoRejectError.message);
        // Don't throw here, the main acceptance was successful
      } else {
        console.log("✅ All other pending applications auto-rejected.");
      }

      // 5. Decrease Vacancies
      const { error: postError } = await supabase
        .from('ojt_posts')
        .update({ vacancies: currentVacancies - 1 })
        .eq('id', selectedPostId);
      if (postError) throw postError;

      // 6. Refresh UI smoothly
      if (selectedPostId) await fetchApplicants(selectedPostId);
      await refreshPosts();
      if (selectedApplicant?.id === applicant.id) closeModal();

      alert("Accepted successfully! Their other pending applications have been auto-rejected.");

    } catch (err: any) {
      console.error("Update failed:", err.message);
      alert("Failed to update: " + err.message);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { error } = await supabase.from('applications').update({ status: 'Rejected' }).eq('id', id);
      if (error) throw error;
      if (selectedPostId) await fetchApplicants(selectedPostId);
      if (selectedApplicant?.id === id) closeModal();
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Failed to reject application.");
    }
  };

  const handleRestore = async (applicationId: string | number) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'Pending' })
        .eq('id', applicationId);

      if (error) throw error;

      alert("Applicant restored to Pending!");
      
      if (selectedPostId) await fetchApplicants(selectedPostId);
      if (selectedApplicant?.id === applicationId) closeModal();

    } catch (error) {
      console.error("Error restoring:", error);
      alert("Failed to restore application.");
    }
  };

   const handleDelete = async (applicant: any) => {
    const confirmDelete = confirm("Are you sure you want to remove this application?");
    if (!confirmDelete) return;

    try {
      // 1. Delete the application
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicant.id);

      if (error) {
        console.error("Delete failed:", error.message);
        alert("Could not remove: " + error.message);
        return;
      }

      // 2. IMPORTANT: If they were already accepted, reset their profile!
      if (applicant.status?.toLowerCase() === 'accepted' && applicant.student_id) {
        await supabase
          .from('profiles')
          .update({ 
            ojt_status: 'Unassigned', 
            assigned_company: null 
          })
          .eq('id', applicant.student_id);
          
        // Also give the vacancy slot back to the post!
        const post = posts.find(p => p.id === selectedPostId);
        if (post) {
          await supabase
            .from('ojt_posts')
            .update({ vacancies: (post.vacancies || 0) + 1 })
            .eq('id', selectedPostId);
        }
      }

      alert("Removed successfully!");
      
      // 3. Refresh UI smoothly
      if (selectedPostId) await fetchApplicants(selectedPostId);
      await refreshPosts();
      setOpenMenuId(null);
      if (selectedApplicant?.id === applicant.id) closeModal();

    } catch (err: any) {
      console.error("Error deleting:", err);
      alert("Failed to remove application.");
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: number) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); };
  const openModal = (app: any) => { setSelectedApplicant(app); setIsModalOpen(true); setOpenMenuId(null); };
  const closeModal = () => { setIsModalOpen(false); setSelectedApplicant(null); };

  // Helper component for the "Already Hired" UI
  const AlreadyHiredBadge = () => (
    <span className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-md border border-gray-200 italic cursor-not-allowed flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
      Hired Elsewhere
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-0 hidden lg:flex'}`}>
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-teal-600 text-2xl">◉</span> OJTly
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link href="/company_main" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Dashboard</Link>
          <Link href="/company_ojtpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">My OJT Posts</Link>
          <Link href="/company_createpost" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Create Post</Link>
          <Link href="/company_applicants" className="flex items-center gap-3 px-4 py-3 text-white bg-teal-600 rounded-lg shadow-md shadow-teal-500/20 hover:bg-teal-700 transition-colors">Applicants</Link>
          <Link href="/company_documents" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Documents</Link>
          <Link href="/company_settings" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Settings</Link>
        </nav>
        <div className="p-4 border-t border-slate-100 mt-auto">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7m0 0a9 9 0 0118 0z"></path></svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 flex-1 min-h-screen flex flex-col w-full">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 shadow-sm flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg -ml-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-xl font-bold text-slate-800">Applicants</h1>
          </div>
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs cursor-pointer">U</div>
        </header>

        <div className="p-6 max-w-6xl mx-auto w-full space-y-8">

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Job Post</h3>
            {isLoadingPosts ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>)}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">No Job Posts Found</h3>
                <p className="text-xs text-slate-500 mb-4">Create a post to start seeing applicants.</p>
                <Link href="/company_createpost" className="px-4 py-2 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700">Create New Post</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => {
                  const isActive = selectedPostId === post.id;
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={`relative flex items-center justify-between p-5 rounded-xl border text-left w-full transition-all group ${isActive ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 shadow-sm z-10' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                    >
                      <div className="min-w-0 mr-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-bold text-sm truncate ${isActive ? 'text-teal-800' : 'text-slate-700'}`}>{post.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{post.department}</p>
                          </div>
                          <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${(post.vacancies > 0) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            <span>{post.vacancies} Slots Left</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-4 ${isActive ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}`}>
                        {isActive && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!isLoadingPosts && selectedPostId && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Total Apps</p><p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p></div>
                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm"><p className="text-[10px] font-bold text-amber-600 uppercase">Pending</p><p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p></div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm"><p className="text-[10px] font-bold text-green-600 uppercase">Accepted</p><p className="text-2xl font-bold text-green-600 mt-1">{stats.accepted}</p></div>
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm"><p className="text-[10px] font-bold text-red-600 uppercase">Rejected</p><p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p></div>
              </div>

              <div className="flex items-end justify-between border-b border-slate-200 pb-2 mb-4">
                <h2 className="text-lg font-bold text-slate-800">Candidates for <span className="text-teal-600">{currentPost?.title}</span></h2>
                {currentPost && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{currentPost.vacancies} Slots Available</span>
                )}
              </div>

              <div className="space-y-3 min-h-[200px]">
                {isLoadingApps ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <svg className="animate-spin h-6 w-6 mb-2 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-sm font-medium">Processing...</p>
                  </div>
                ) : applicants.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">No applications yet</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">When students apply, they will appear here.</p>
                  </div>
                ) : (
                  applicants.map((applicant) => (
                    <div key={applicant.id} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center group hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {getInitials(applicant.profiles?.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 text-sm truncate">{applicant.profiles?.full_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ${
                              applicant.status?.toLowerCase() === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                              applicant.status?.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{applicant.status}</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{applicant.profiles?.email}</div>
                        </div>
                      </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pl-0 sm:pl-4 sm:border-l sm:border-slate-100 flex-wrap">
                        {applicant.profiles?.resume_url ? (
                          <a href={getResumeLink(applicant.profiles.resume_url)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all transform active:scale-95">
                            View Latest Resume
                          </a>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-md cursor-not-allowed">No Resume</span>
                        )}

                        <button onClick={() => openModal(applicant)} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Review
                        </button>

                                        {/* ✅ COMPREHENSIVE UI STATE LOGIC */}
                        {applicant.status?.toLowerCase() === 'accepted' ? (
                          // CASE A: Accepted on THIS specific application
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 text-xs rounded-md border border-emerald-200 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Accepted for this post
                          </span>
                        ) : applicant.profiles?.ojt_status === 'Ongoing' ? (
                          // Student is hired somewhere, but NOT accepted on this specific row
                          applicant.profiles?.assigned_company === currentCompanyName ? (
                            // CASE B: Same company, different post
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 text-xs rounded-md border border-blue-200 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Hired by you for another post
                              </span>
                              <button 
                                onClick={() => handleDelete(applicant)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                title="Remove from list"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          ) : (
                            // CASE C: Different company entirely
                            <div className="flex items-center gap-2">
                              <span className="text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 text-xs rounded-md border border-amber-200 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                Hired by another company
                              </span>
                              <button 
                                onClick={() => handleDelete(applicant)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                title="Remove from list"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          )
                        ) : applicant.status?.toLowerCase() === 'pending' ? (
                          // CASE D: Student is still free to be hired
                          <>
                            <button onClick={() => handleAccept(applicant)} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-all transform active:scale-95">Accept</button>
                            <button onClick={() => handleReject(applicant.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-all transform active:scale-95">Reject</button>
                          </>
                        ) : applicant.status?.toLowerCase() === 'rejected' ? (
                          // CASE E: Rejected (Show Restore)
                          <button 
                            onClick={() => handleRestore(applicant.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-all transform active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Restore
                          </button>
                        ) : null}
                        
                        {/* 3-Dot Menu for Accepted/Rejected general cleanup */}
                        {(applicant.status?.toLowerCase() === 'accepted' || applicant.status?.toLowerCase() === 'rejected') && (
                          <div className="relative" ref={openMenuId === applicant.id ? menuRef : null}>
                            <button onClick={(e) => toggleMenu(e, applicant.id)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {openMenuId === applicant.id && (
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 animate-in fade-in duration-100">
                                <button onClick={() => handleDelete(applicant)} className="w-full text-left text-xs px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">Remove</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedApplicant.profiles?.full_name}</h3>
                <p className="text-sm text-slate-500">{selectedApplicant.profiles?.email}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resume / CV</h4>
                  {selectedApplicant.profiles?.resume_url && (
                    <a href={getResumeLink(selectedApplicant.profiles.resume_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                      Open in New Tab
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>

                <div className="w-full bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center" style={{ height: '70vh' }}>
                  {selectedApplicant.profiles?.resume_url ? (
                    getFileType(selectedApplicant.profiles.resume_url) === 'image' ? (
                      <img src={getResumeLink(selectedApplicant.profiles.resume_url)} alt="Resume" className="max-w-full max-h-full object-contain" style={{ width: '100%', height: '100%' }} />
                    ) : getFileType(selectedApplicant.profiles.resume_url) === 'pdf' ? (
                      <iframe src={getResumeEmbedLink(selectedApplicant.profiles.resume_url)} className="w-full h-full bg-white border-0" title="Resume Preview" />
                    ) : (
                      <iframe src={getResumeLink(selectedApplicant.profiles.resume_url)} className="w-full h-full bg-white border-0" title="Resume Preview" />
                    )
                  ) : (
                    <div className="text-center p-4">
                      <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-gray-400 text-sm">No resume uploaded.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
             {selectedApplicant.status?.toLowerCase() !== 'pending' && (
                  <button onClick={() => { handleDelete(selectedApplicant); closeModal(); }} className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">Remove</button>
)}
                      <div className="flex gap-3 ml-auto">
                {selectedApplicant.status?.toLowerCase() === 'accepted' ? (
                  // CASE A: Accepted
                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-5 py-2 text-sm rounded-lg border border-emerald-200 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Accepted for this post
                  </span>
                ) : selectedApplicant.profiles?.ojt_status === 'Ongoing' ? (
                  selectedApplicant.profiles?.assigned_company === currentCompanyName ? (
                    // CASE B: Same company, different post
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600 font-semibold bg-blue-50 px-4 py-2 text-sm rounded-lg border border-blue-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Hired by you for another post
                      </span>
                      <button 
                        onClick={() => { handleDelete(selectedApplicant); closeModal(); }}
                        className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Remove
                      </button>
                    </div>
                  ) : (
                    // CASE C: Different company entirely
                    <div className="flex items-center gap-3">
                      <span className="text-amber-600 font-semibold bg-amber-50 px-4 py-2 text-sm rounded-lg border border-amber-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        Hired by another company
                      </span>
                      <button 
                        onClick={() => { handleDelete(selectedApplicant); closeModal(); }}
                        className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Remove
                      </button>
                    </div>
                  )
                ) : selectedApplicant.status?.toLowerCase() === 'pending' ? (
                  // CASE D: Normal Pending
                  <>
                    <button onClick={() => { handleReject(selectedApplicant.id); closeModal(); }} className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-transform active:scale-95">Reject</button>
                    <button onClick={() => { handleAccept(selectedApplicant); closeModal(); }} className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-transform active:scale-95">Accept</button>
                  </>
                ) : selectedApplicant.status?.toLowerCase() === 'rejected' ? (
                  // CASE E: Rejected
                  <button onClick={() => { handleRestore(selectedApplicant.id); closeModal(); }} className="px-5 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm transition-transform active:scale-95">Restore to Pending</button>
                ) : (
                  <button onClick={closeModal} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">Close</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}