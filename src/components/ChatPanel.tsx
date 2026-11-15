'use client';

// ============================================================
// ChatPanel — SELF-CONTAINED student chat with floating button
//
// No props needed. Just drop on any student page:
//   <ChatPanel />
//
// Features:
//   - 🟢 Floating teal button at bottom-right
//   - 🔴 Red pulsing badge when student has unread messages
//   - Auto-finds the student's active conversation
//   - Opens chat modal when clicked
//   - Real-time messages, file upload, link parsing, typing indicator
//   - Online/offline presence
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface ChatPanelProps {
  /** Optional props — if provided, renders as modal only (for map page etc.) */
  myUserId?: string;
  otherUserId?: string;
  myName?: string;
  otherName?: string;
  onClose?: () => void;
}

export default function ChatPanel(props: ChatPanelProps = {}) {
  // If props are passed → "controlled mode" (modal only, no floating button)
  // If no props → "self-contained mode" (floating button + auto-detect + modal)
  const isControlled = !!(props?.myUserId && props?.otherUserId);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(isControlled); // open immediately if controlled
  const [myUserId, setMyUserId] = useState<string | null>(props?.myUserId || null);
  const [otherUserId, setOtherUserId] = useState<string | null>(props?.otherUserId || null);
  const [myName, setMyName] = useState<string>(props?.myName || 'Student');
  const [otherName, setOtherName] = useState<string>(props?.otherName || 'Company');
  const [totalUnread, setTotalUnread] = useState(0);

  // Chat state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'pdf' | 'file';
  } | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');

  useEffect(() => { setMounted(true); }, []);

  // ============================================================
  // 0. AUTO-DETECT STUDENT + FIND CONVERSATION + UNREAD COUNT
  //    (only runs in self-contained mode — when no props are passed)
  // ============================================================
  useEffect(() => {
    // Skip auto-detect if props were provided (controlled mode)
    if (isControlled) return;

    (async () => {
      try {
        // Use getSession() to avoid navigator lock contention
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          const { data: { user: u } } = await supabase.auth.getUser();
          if (!u) return;
          setMyUserId(u.id);
          await initUser(u.id);
          return;
        }
        setMyUserId(user.id);
        await initUser(user.id);
      } catch (err) {
        console.error('❌ ChatPanel init error:', err);
      }
    })();
  }, []);

  const initUser = async (uid: string) => {
    // Get student's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', uid)
      .maybeSingle();
    if (profile?.full_name) setMyName(profile.full_name);

    // Find active conversations
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error || !convs) return;

    // Find the most recent ACTIVE conversation
    const activeConvs = (convs || []).filter((c: any) => c.status !== 'archived');
    if (activeConvs.length === 0) return;

    const latestConv = activeConvs[0];
    const otherId = latestConv.participant_a === uid ? latestConv.participant_b : latestConv.participant_a;
    setOtherUserId(otherId);
    setConversationId(latestConv.id);

    // Get other user's name
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', otherId)
      .maybeSingle();
    if (otherProfile?.full_name) setOtherName(otherProfile.full_name);

    // Count total unread across ALL active conversations
    let totalUnreadCount = 0;
    for (const conv of activeConvs) {
      const otherUid = conv.participant_a === uid ? conv.participant_b : conv.participant_a;
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('sender_id', otherUid)
        .eq('is_read', false);
      totalUnreadCount += count || 0;
    }
    setTotalUnread(totalUnreadCount);
  };

  // ============================================================
  // 0b. CONTROLLED MODE — find or create conversation between 2 specific users
  //     (runs when props.myUserId + props.otherUserId are passed)
  // ============================================================
  useEffect(() => {
    if (!isControlled || !myUserId || !otherUserId) return;

    (async () => {
      try {
        const { data: myConvs } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant_a.eq.${myUserId},participant_b.eq.${myUserId}`)
          .order('created_at', { ascending: false });

        const exactActive = (myConvs || []).find(
          (c: any) =>
            ((c.participant_a === myUserId && c.participant_b === otherUserId) ||
             (c.participant_a === otherUserId && c.participant_b === myUserId)) &&
            c.status !== 'archived'
        );

        if (exactActive) {
          setConversationId(exactActive.id);
        } else {
          const { data: newConv, error: createErr } = await supabase
            .from('conversations')
            .insert({ participant_a: myUserId, participant_b: otherUserId, status: 'active' })
            .select()
            .single();
          if (!createErr && newConv) setConversationId(newConv.id);
        }
      } catch (err) {
        console.error('💬 Controlled conversation setup failed:', err);
      }
    })();
  }, [isControlled, myUserId, otherUserId]);

  // Realtime: update unread count when new messages arrive (self-contained mode only)
  useEffect(() => {
    if (!myUserId || isControlled) return;

    const channel = supabase
      .channel(`student-chat-unread:${myUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { if (myUserId) initUser(myUserId); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => { if (myUserId) initUser(myUserId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myUserId]);

  // ============================================================
  // LOAD MESSAGES
  // ============================================================
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) return;
      setMessages(data || []);

      // Mark unread as read
      const unreadIds = (data || [])
        .filter((m: Message) => m.sender_id !== myUserId && !m.is_read)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }
    } catch (err) {
      console.error('💬 Message load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, myUserId]);

  useEffect(() => {
    if (isOpen && conversationId) {
      setLoading(true);
      loadMessages();
    }
  }, [isOpen, conversationId, loadMessages]);

  // ============================================================
  // REALTIME — messages + read receipts + typing
  // ============================================================
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== myUserId && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m));
        }
      )
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.user_id !== myUserId) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isOpen, conversationId, myUserId]);

  // Presence
  useEffect(() => {
    if (!isOpen || !conversationId || !otherUserId) return;

    const presenceChannel = supabase.channel(`presence:${conversationId}`);
    setIsOnline(false);

    presenceChannel
      .on('presence', { event: 'join' }, () => {
        const state = presenceChannel.presenceState();
        const otherOnline = Object.values(state).some(
          (presences: any) => Array.isArray(presences) && presences.some((p: any) => p?.user_id === otherUserId)
        );
        setIsOnline(otherOnline);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = presenceChannel.presenceState();
        const otherOnline = Object.values(state).some(
          (presences: any) => Array.isArray(presences) && presences.some((p: any) => p?.user_id === otherUserId)
        );
        setIsOnline(otherOnline);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && myUserId) {
          await presenceChannel.track({ user_id: myUserId });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [isOpen, conversationId, myUserId, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================
  // FILE UPLOAD — preview + confirm
  // ============================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); e.target.value = ''; return; }
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const attachmentType: 'image' | 'pdf' | 'file' = isImage ? 'image' : isPdf ? 'pdf' : 'file';
    const previewUrl = isImage ? URL.createObjectURL(file) : '';
    setPendingFile({ file, previewUrl, type: attachmentType });
    setPendingCaption('');
    e.target.value = '';
  };

  const cancelPendingFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setPendingCaption('');
  };

  const confirmSendFile = async () => {
    if (!pendingFile || !conversationId) return;
    const { file, type } = pendingFile;
    const caption = pendingCaption.trim();
    setUploadingFile(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: myUserId,
        content: caption || file.name, attachment_url: publicUrl, attachment_type: type,
      });
      if (msgError) throw msgError;
      cancelPendingFile();
    } catch (err: any) {
      console.error('💬 File upload failed:', err);
      alert('Failed to upload file: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingFile(false);
    }
  };

  // ============================================================
  // RENDER CONTENT — text with links + attachments
  // ============================================================
  const renderContent = (msg: Message) => {
    if (msg.attachment_url && msg.attachment_type === 'image') {
      return <img src={msg.attachment_url} alt={msg.content} className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer mb-1" onClick={() => setPreviewImage(msg.attachment_url!)} />;
    }
    if (msg.attachment_url && msg.attachment_type === 'pdf') {
      return <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>{msg.content}</a>;
    }
    if (msg.attachment_url && msg.attachment_type === 'file') {
      return <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>{msg.content}</a>;
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = msg.content.split(urlRegex);
    return parts.map((part, i) => urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a> : <span key={i}>{part}</span>);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setSending(true);
    setInput('');
    try {
      const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: myUserId, content: text });
      if (error) throw error;
    } catch (err) {
      console.error('💬 Send failed:', err);
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const otherInitial = (otherName || '?').charAt(0).toUpperCase();

  const handleOpenChat = () => {
    if (!otherUserId) {
      alert('No active conversation yet. You will be able to chat once a company accepts your application.');
      return;
    }
    setIsOpen(true);
  };

  const handleCloseChat = () => {
    // If controlled mode (props.onClose provided), call it
    if (isControlled && props?.onClose) {
      props.onClose();
      return;
    }
    // Self-contained mode — just close the modal + refresh unread
    setIsOpen(false);
    if (myUserId) initUser(myUserId);
  };

  if (!mounted || !myUserId) return null;

  return createPortal(
    <>
      {/* ============ FLOATING BUTTON — only in self-contained mode ============ */}
      {!isControlled && (
      <button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
        title={`Messages${totalUnread > 0 ? ` · ${totalUnread} unread` : ''}`}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {/* 🔴 Red badge + 🟢 green pulsing ring (same color as button) */}
        {totalUnread > 0 && (
          <>
            {/* Green pulsing ring — matches the teal button color */}
            <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-75"></span>
            {/* Red badge with count */}
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 ring-2 ring-white shadow-md">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          </>
        )}
      </button>
      )}

      {/* ============ CHAT MODAL ============ */}
      {isOpen && otherUserId && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseChat(); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-teal-50 via-white to-blue-50/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                  {otherInitial}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{otherName || 'User'}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[10px] text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleCloseChat} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 min-h-[300px] bg-slate-50/50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">Send the first message!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === myUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${isMe ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-br-md' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm'}`}>
                          {renderContent(msg)}
                        </div>
                        <span className={`text-[9px] text-slate-400 px-1 flex items-center gap-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                          {isMe && (
                            <span className="inline-flex items-center">
                              {msg.is_read ? (
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 17l4 4L26 11" style={{ transform: 'translateX(-7px)' }} /></svg>
                              ) : (
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-bl-md shadow-sm px-4 py-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] italic text-slate-400">{otherName} is typing</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || sending} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-all disabled:opacity-40" title="Send image or PDF">
                  {uploadingFile ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  )}
                </button>
                <input ref={inputRef} type="text" value={input} onChange={(e) => { setInput(e.target.value); if (channelRef.current) { channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myUserId } }); } }} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" disabled={sending || uploadingFile} />
                <button onClick={handleSend} disabled={!input.trim() || sending || uploadingFile} className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>

            {/* Attachment Preview Modal */}
            {pendingFile && (
              <div className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !uploadingFile && cancelPendingFile()}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </div>
                      <div><h3 className="font-bold text-sm text-slate-800">Send Attachment</h3><p className="text-[10px] text-slate-500">Review before sending</p></div>
                    </div>
                    <button onClick={() => !uploadingFile && cancelPendingFile()} disabled={uploadingFile} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-40">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="p-5 bg-slate-50">
                    {pendingFile.type === 'image' ? (
                      <div className="flex flex-col items-center">
                        <img src={pendingFile.previewUrl} alt={pendingFile.file.name} className="max-w-full max-h-64 object-contain rounded-xl shadow-sm border border-slate-200" />
                        <p className="text-[11px] text-slate-500 mt-2 break-all">{pendingFile.file.name}</p>
                        <p className="text-[10px] text-slate-400">{(pendingFile.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${pendingFile.type === 'pdf' ? 'bg-red-100' : 'bg-slate-100'}`}>
                          <svg className={`w-6 h-6 ${pendingFile.type === 'pdf' ? 'text-red-600' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {pendingFile.type === 'pdf' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{pendingFile.file.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{(pendingFile.file.size / 1024).toFixed(1)} KB · {pendingFile.type.toUpperCase()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Caption (optional)</label>
                    <input type="text" value={pendingCaption} onChange={(e) => setPendingCaption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !uploadingFile) { e.preventDefault(); confirmSendFile(); } }} placeholder={pendingFile.type === 'image' ? 'Add a caption...' : 'Add a description...'} disabled={uploadingFile} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all disabled:opacity-50" />
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                    <button onClick={cancelPendingFile} disabled={uploadingFile} className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40">Cancel</button>
                    <button onClick={confirmSendFile} disabled={uploadingFile} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-300 text-white text-sm font-semibold rounded-lg transition-all shadow-md">
                      {uploadingFile ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Send</>)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image lightbox */}
            {previewImage && (
              <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors" onClick={() => setPreviewImage(null)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
