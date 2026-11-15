'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface SupportMessage {
  id: string;
  company_id: string;
  sender_id: string;
  sender_role: 'company' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface SupportChatProps {
  /** The company whose support thread we're viewing */
  companyId: string;
  /** Optional: company name to show in the header */
  companyName?: string;
  /** Current viewer role: 'company' or 'admin' */
  viewerRole: 'company' | 'admin';
  /** Compact mode (no header) — used when embedded in admin dashboard */
  compact?: boolean;
}

/**
 * SupportChat — reusable component for the admin ↔ company support thread.
 *
 * - Company viewer: only sees their own thread (companyId passed by parent)
 * - Admin viewer: sees any company's thread (companyId passed by parent)
 * - Real-time: new messages appear instantly
 * - Auto-marks received messages as read
 * - Scroll-to-bottom on new message
 */
export default function SupportChat({
  companyId,
  companyName,
  viewerRole,
  compact = false,
}: SupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Pending attachment — set when user picks a file, before they confirm send
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;        // object URL for local preview (images only)
    type: 'image' | 'pdf' | 'file';
  } | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');

  // Get current user — use getSession() instead of getUser() to avoid the
  // navigator lock contention error:
  //   "Lock was released because another request stole it"
  // getSession() reads from localStorage synchronously (no lock acquired),
  // while getUser() makes a network call that competes for the auth lock.
  // Since we only need the user ID (token is already valid in session),
  // getSession() is sufficient and avoids the lock conflict entirely.
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserId(session.user.id);
        } else {
          // Fallback: try getUser() once if no session found
          // (rare case — token expired but session not yet refreshed)
          const { data: { user } } = await supabase.auth.getUser();
          if (user) setCurrentUserId(user.id);
        }
      } catch (err) {
        console.warn('⚠️ SupportChat: auth lookup failed:', err);
      }
    })();
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, company_id, sender_id, sender_role, message, is_read, created_at, attachment_url, attachment_type')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.warn('⚠️ SupportChat fetch error:', error.message);
      return;
    }

    const newMsgs = (data || []) as SupportMessage[];
    setMessages(newMsgs);

    // Auto-mark received messages as read
    if (currentUserId) {
      const unreadReceived = newMsgs.filter(
        m => !m.is_read && m.sender_role !== viewerRole
      );
      if (unreadReceived.length > 0) {
        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .in('id', unreadReceived.map(m => m.id));
      }
    }
  }, [companyId, currentUserId, viewerRole]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
  }, [companyId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`support-chat:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `company_id=eq.${companyId}`,
        },
        () => fetchMessages()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
          filter: `company_id=eq.${companyId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !currentUserId || sending) return;

    setSending(true);
    setNewMessage('');

    // Optimistic: append immediately
    const optimisticMsg: SupportMessage = {
      id: `temp-${Date.now()}`,
      company_id: companyId,
      sender_id: currentUserId,
      sender_role: viewerRole,
      message: trimmed,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          company_id: companyId,
          sender_id: currentUserId,
          sender_role: viewerRole,
          message: trimmed,
          is_read: false,
        });

      if (error) throw error;
      // Realtime will fetch the real row; remove optimistic after a beat
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        fetchMessages();
      }, 400);
    } catch (err: any) {
      console.error('❌ Send support message error:', err);
      // Rollback optimistic
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(trimmed);
      alert('Failed to send message: ' + (err?.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // FILE UPLOAD — preview + confirm flow (like WhatsApp)
  //   1. handleFileSelect: user picks file → show preview modal (NO upload yet)
  //   2. confirmSendFile: user clicks "Send" → upload to storage + insert row
  //   3. cancelPendingFile: user clicks "Cancel" → discard, revoke object URL
  // ============================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      e.target.value = '';
      return;
    }

    // Determine attachment type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const attachmentType: 'image' | 'pdf' | 'file' = isImage ? 'image' : isPdf ? 'pdf' : 'file';

    // Create local preview URL (only useful for images, but harmless for others)
    const previewUrl = isImage ? URL.createObjectURL(file) : '';

    // Show preview modal — user must click "Send" to confirm
    setPendingFile({ file, previewUrl, type: attachmentType });
    setPendingCaption('');

    // Reset input so the same file can be picked again later
    e.target.value = '';
  };

  const cancelPendingFile = () => {
    if (pendingFile?.previewUrl) {
      URL.revokeObjectURL(pendingFile.previewUrl); // free memory
    }
    setPendingFile(null);
    setPendingCaption('');
  };

  const confirmSendFile = async () => {
    if (!pendingFile || !currentUserId) return;

    const { file, type } = pendingFile;
    const caption = pendingCaption.trim();

    setUploadingFile(true);
    try {
      // Upload to Supabase storage — path: support/<companyId>/<timestamp>_<random>.ext
      const ext = file.name.split('.').pop() || 'bin';
      const path = `support/${companyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(path);

      // Insert message row with attachment
      // Message text: use caption if provided, otherwise filename
      const messageText = caption || file.name;
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          company_id: companyId,
          sender_id: currentUserId,
          sender_role: viewerRole,
          message: messageText,
          attachment_url: publicUrl,
          attachment_type: type,
          is_read: false,
        });

      if (msgError) throw msgError;
      // Realtime will pick up the INSERT and fetchMessages will run

      // Clean up pending state
      cancelPendingFile();
    } catch (err: any) {
      console.error('❌ Support file upload failed:', err);
      alert('Failed to upload file: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingFile(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ============================================================
  // renderMessage — renders a message bubble's content.
  // Handles 3 cases:
  //   1. Image attachment → show thumbnail (click to enlarge)
  //   2. PDF/file attachment → show download link
  //   3. Plain text → parse URLs into clickable links
  // ============================================================
  const renderMessage = (msg: SupportMessage, isMine: boolean) => {
    // Case 1: Image attachment
    if (msg.attachment_url && msg.attachment_type === 'image') {
      return (
        <div className="flex flex-col gap-1">
          <img
            src={msg.attachment_url}
            alt={msg.message}
            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setPreviewImage(msg.attachment_url!)}
          />
          {msg.message && msg.message !== msg.attachment_url.split('/').pop() && (
            <span className="text-[10px] opacity-80 break-words">{msg.message}</span>
          )}
        </div>
      );
    }

    // Case 2: PDF attachment
    if (msg.attachment_url && msg.attachment_type === 'pdf') {
      return (
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 underline transition-colors ${
            isMine ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="break-all text-sm font-medium">{msg.message}</span>
        </a>
      );
    }

    // Case 3: Generic file attachment
    if (msg.attachment_url && msg.attachment_type === 'file') {
      return (
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 underline transition-colors ${
            isMine ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="break-all text-sm font-medium">{msg.message}</span>
        </a>
      );
    }

    // Case 4: Plain text — parse URLs into clickable links
    if (!msg.message) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = msg.message.split(urlRegex);

    return parts.map((part, i) => {
      if (!part) return null;
      if (urlRegex.test(part)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        const display = part.replace(/[.,;:!?)]+$/, '');
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all font-medium transition-colors ${
              isMine ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {display}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex flex-col bg-white ${compact ? '' : 'rounded-2xl border border-slate-100 shadow-sm'} overflow-hidden`} style={{ height: compact ? '100%' : '600px' }}>
      {/* Header */}
      {!compact && (
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-800 truncate">
              {viewerRole === 'admin' ? `Support: ${companyName || 'Company'}` : 'OJTly Support'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {viewerRole === 'admin' ? 'Reply to company questions' : 'Message the admin team for help'}
            </p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 mt-2">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {viewerRole === 'admin' ? 'No messages yet' : 'Start a conversation'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {viewerRole === 'admin'
                ? 'Be the first to reach out to this company.'
                : 'Got a question? Send a message to the OJTly admin team and we\'ll get back to you.'}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_role === viewerRole;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Sender label */}
                  <p className={`text-[10px] font-semibold mb-1 px-1 ${isMine ? 'text-blue-600' : 'text-slate-500'}`}>
                    {msg.sender_role === 'admin' ? '🔧 Admin' : '🏢 Company'}
                    {' · '}
                    {formatTime(msg.created_at)}
                  </p>
                  {/* Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMine
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {renderMessage(msg, isMine)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 bg-white shrink-0">
        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* 📎 Paperclip button — opens file picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || sending}
            className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-all disabled:opacity-40"
            title="Send image or PDF"
          >
            {uploadingFile ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e as any);
              }
            }}
            placeholder={viewerRole === 'admin' ? 'Type your reply to the company...' : 'Type your message to admin...'}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 max-h-32"
            style={{ minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl transition-all shadow-sm shrink-0"
            title="Send message"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 px-1">Press Enter to send · Shift+Enter for new line · 📎 for images/PDFs</p>
      </form>

      {/* ============ Attachment Preview + Confirm Modal ============ */}
      {pendingFile && (
        <div
          className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !uploadingFile && cancelPendingFile()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Send Attachment</h3>
                  <p className="text-[10px] text-slate-500">Review before sending</p>
                </div>
              </div>
              <button
                onClick={() => !uploadingFile && cancelPendingFile()}
                disabled={uploadingFile}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview area */}
            <div className="p-5 bg-slate-50">
              {pendingFile.type === 'image' ? (
                /* Image preview */
                <div className="flex flex-col items-center">
                  <img
                    src={pendingFile.previewUrl}
                    alt={pendingFile.file.name}
                    className="max-w-full max-h-64 object-contain rounded-xl shadow-sm border border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500 mt-2 break-all">{pendingFile.file.name}</p>
                  <p className="text-[10px] text-slate-400">{(pendingFile.file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                /* PDF/file preview */
                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    pendingFile.type === 'pdf' ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <svg className={`w-6 h-6 ${pendingFile.type === 'pdf' ? 'text-red-600' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {pendingFile.type === 'pdf' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      )}
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{pendingFile.file.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(pendingFile.file.size / 1024).toFixed(1)} KB · {pendingFile.type.toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Caption input (optional) */}
            <div className="px-5 py-3 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Caption (optional)
              </label>
              <input
                type="text"
                value={pendingCaption}
                onChange={(e) => setPendingCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !uploadingFile) {
                    e.preventDefault();
                    confirmSendFile();
                  }
                }}
                placeholder={pendingFile.type === 'image' ? 'Add a caption...' : 'Add a description...'}
                disabled={uploadingFile}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Action buttons */}
            <div className="px-5 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
              <button
                onClick={cancelPendingFile}
                disabled={uploadingFile}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={confirmSendFile}
                disabled={uploadingFile}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white text-sm font-semibold rounded-lg transition-all shadow-md"
              >
                {uploadingFile ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview lightbox — click an image to enlarge */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
