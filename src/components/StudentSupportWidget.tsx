'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createPortal } from 'react-dom';

// ============================================================
// <StudentSupportWidget />
// Floating support button + modal form for the landing page.
//
// - Visible to everyone (visitors + logged-in students)
// - Submits to student_support_requests table
// - Triggers a notification to all admins via DB trigger
// - Optionally pre-fills name/email if user is logged in
// ============================================================

const supabase = createClient();

export default function StudentSupportWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // SSR-safe portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill name/email if user is logged in
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Try to fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.full_name) setName(profile.full_name);
          if (profile?.email) setEmail(profile.email);
          else if (session.user.email) setEmail(session.user.email);
        }
      } catch (e) {
        // Silent — visitor mode, no prefill
      }
    })();
  }, []);

  // ESC to close + trap focus + click-outside
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Focus first input after a small delay
    setTimeout(() => firstInputRef.current?.focus(), 100);

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    setSubmitting(true);

    try {
      // Get user_id if logged in (null otherwise)
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // Insert into student_support_requests
      const { error: insertError } = await supabase
        .from('student_support_requests')
        .insert({
          student_name: name.trim(),
          student_email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          user_id: userId,
          status: 'new',
        });

      if (insertError) throw insertError;

      // Success — the DB trigger will notify all admins automatically
      setSuccess(true);

      // Reset form after 3s and close
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      }, 3500);
    } catch (err: any) {
      console.error('Support submit failed:', err);
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render until mounted (SSR-safe)
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating button — bottom right */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Contact support"
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 font-semibold"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20 group-hover:opacity-0"></span>

        <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" />
        </svg>
        <span className="relative text-sm hidden sm:inline">Support</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-modal-title"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" />
                  </svg>
                </div>
                <div>
                  <h2 id="support-modal-title" className="font-bold text-slate-800 text-base">
                    OJTly Support
                  </h2>
                  <p className="text-xs text-slate-500">We typically reply within 24 hours</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              /* Success state */
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Message Sent! 🎉</h3>
                <p className="text-sm text-slate-500 mb-1">
                  Thanks for reaching out, {name.split(' ')[0]}!
                </p>
                <p className="text-xs text-slate-400">
                  Our support team has been notified and will reply to <strong className="text-slate-600">{email}</strong> soon.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="support-name" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Your Name
                  </label>
                  <input
                    ref={firstInputRef}
                    id="support-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitting}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="support-email" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                    placeholder="juan@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="support-subject" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Subject
                  </label>
                  <select
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Choose a topic…</option>
                    <option value="Account & Login Issues">Account & Login Issues</option>
                    <option value="Application Problem">Application Problem</option>
                    <option value="Chat Not Working">Chat Not Working</option>
                    <option value="Certificate Issue">Certificate Issue</option>
                    <option value="Report a Bug">Report a Bug</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="General Question">General Question</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="support-message" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Message
                  </label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={submitting}
                    rows={4}
                    minLength={10}
                    placeholder="Describe your issue or question in detail…"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all resize-none disabled:opacity-50"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Message
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-2">
                  🔒 Your message is private and only visible to OJTly admins
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
