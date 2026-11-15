'use client';

// ============================================================
// CompanyChat — full chat interface for the company side
// Shows a sidebar with all active + archived conversations,
// and a chat window on the right.
//
// Props:
//   userId       — company's auth UID
//   companyName  — company's display name
//   onClose      — callback to close the chat
//
// Features:
//   - Left sidebar: active conversations (accepted students) + archived
//   - Right: chat window with real-time messages
//   - Archived chats show "OJT Completed" banner, input disabled
//   - Company can delete archived conversations
//   - Online/offline presence
//   - Real-time message updates
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import SupportChat from '@/components/SupportChat';

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

interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  status: string;
  created_at: string;
  other_user_id: string;
  other_name: string;
  post_title?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

interface CompanyChatProps {
  userId: string;
  companyName: string;
  onClose: () => void;
}

export default function CompanyChat({ userId, companyName, onClose }: CompanyChatProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  // ===== Admin Support chat state =====
  const [showAdminSupport, setShowAdminSupport] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [adminSupportUnread, setAdminSupportUnread] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Pending attachment — preview before send (like WhatsApp)
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'pdf' | 'file';
  } | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // ============================================================
  // 0. ADMIN SUPPORT — fetch this company's row ID + realtime unread count
  // ============================================================
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.id) setCompanyId(data.id);
    })();
  }, [userId, supabase]);

  useEffect(() => {
    if (!companyId) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sender_role', 'admin')
        .eq('is_read', false);
      setAdminSupportUnread(count || 0);
    };
    fetchUnread();
    const ch = supabase
      .channel(`company-support-unread:${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `company_id=eq.${companyId}` }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_messages', filter: `company_id=eq.${companyId}` }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, supabase]);

  // ============================================================
  // 1. LOAD CONVERSATIONS — fetch all conversations for this user
  //    with the other participant's name (from profiles)
  // ============================================================
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      // Fetch conversations where this user is a participant
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error || !convs) {
        console.error('💬 Load conversations error:', JSON.stringify(error, null, 2));
        setLoading(false);
        return;
      }

      console.log('💬 Loaded conversations:', convs?.length || 0);

      // For each conversation, find the OTHER participant's user_id
      // and fetch their name from profiles
      const enriched: Conversation[] = await Promise.all(
        convs.map(async (conv: any) => {
          const otherUserId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;

          // Fetch the other user's name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherUserId)
            .maybeSingle();

          // Fetch the student's accepted application + post title
          const { data: app } = await supabase
            .from('applications')
            .select('post_id, ojt_posts:post_id (title)')
            .eq('student_id', otherUserId)
            .or('status.eq.Accepted,status.eq.accepted,status.eq.Completed,status.eq.completed')
            .maybeSingle();

          const postTitle = (app as any)?.ojt_posts?.title || 'General';

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages from the other person
          const { count: unread } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_id', otherUserId)
            .eq('is_read', false);

          return {
            ...conv,
            other_user_id: otherUserId,
            other_name: profile?.full_name || 'Unknown Student',
            post_title: postTitle,
            last_message: lastMsg?.content || '',
            last_message_time: lastMsg?.created_at || conv.created_at,
            unread_count: unread || 0,
          };
        })
      );

      setConversations(enriched);
    } catch (err) {
      console.error('💬 Load conversations failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ============================================================
  // 2. LOAD MESSAGES for selected conversation
  // ============================================================
  const loadMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('💬 Message load error:', error);
        return;
      }

      setMessages(data || []);

      // Mark unread messages from the other person as read
      const unreadIds = (data || [])
        .filter((m: Message) => m.sender_id !== userId && !m.is_read)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
        // Clear unread badge for this conversation
        setConversations(prev =>
          prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch (err) {
      console.error('💬 Message load failed:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv, loadMessages]);

  // ============================================================
  // 3. REALTIME — new messages + read receipts + typing indicator
  // ============================================================
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`chat:${selectedConv.id}`)
      // New messages (INSERT)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv.id}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== userId && !newMsg.is_read) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        }
      )
      // Read receipts (UPDATE — when is_read changes)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv.id}` },
        (payload: any) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m));
        }
      )
      // Typing indicator (broadcast — ephemeral)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.user_id !== userId) {
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
  }, [selectedConv, userId, supabase]);

  // ============================================================
  // 4. PRESENCE — online/offline
  // ============================================================
  useEffect(() => {
    if (!selectedConv) return;

    const presenceChannel = supabase.channel(`presence:${selectedConv.id}`);
    setIsOnline(false);

    presenceChannel
      .on('presence', { event: 'join' }, () => {
        const state = presenceChannel.presenceState();
        const otherOnline = Object.values(state).some(
          (presences: any) => Array.isArray(presences) && presences.some((p: any) => p?.user_id === selectedConv.other_user_id)
        );
        setIsOnline(otherOnline);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = presenceChannel.presenceState();
        const otherOnline = Object.values(state).some(
          (presences: any) => Array.isArray(presences) && presences.some((p: any) => p?.user_id === selectedConv.other_user_id)
        );
        setIsOnline(otherOnline);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [selectedConv, userId, supabase]);

  // ============================================================
  // 5. AUTO-SCROLL
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================
  // 6. SEND MESSAGE
  // ============================================================
  // ============================================================
  // FILE UPLOAD — preview + confirm flow (like WhatsApp)
  //   1. handleFileSelect: user picks file → show preview (NO upload yet)
  //   2. confirmSendFile: user clicks "Send" → upload + insert
  //   3. cancelPendingFile: user clicks "Cancel" → discard
  // ============================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      e.target.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const attachmentType: 'image' | 'pdf' | 'file' = isImage ? 'image' : isPdf ? 'pdf' : 'file';
    const previewUrl = isImage ? URL.createObjectURL(file) : '';

    setPendingFile({ file, previewUrl, type: attachmentType });
    setPendingCaption('');
    e.target.value = '';
  };

  const cancelPendingFile = () => {
    if (pendingFile?.previewUrl) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
    setPendingFile(null);
    setPendingCaption('');
  };

  const confirmSendFile = async () => {
    if (!pendingFile || !selectedConv) return;

    const { file, type } = pendingFile;
    const caption = pendingCaption.trim();

    setUploadingFile(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${selectedConv.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(path);

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: selectedConv.id,
        sender_id: userId,
        content: caption || file.name,
        attachment_url: publicUrl,
        attachment_type: type,
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
    if (!text || !selectedConv || sending) return;
    if (selectedConv.status === 'archived') return;

    setSending(true);
    setInput('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConv.id,
        sender_id: userId,
        content: text,
      });
      if (error) throw error;
    } catch (err) {
      console.error('💬 Send failed:', err);
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ============================================================
  // 7. DELETE ARCHIVED CONVERSATION
  // ============================================================
  const handleDeleteConversation = async (conv: Conversation) => {
    if (!confirm(`Delete chat with ${conv.other_name}? This removes all messages permanently.`)) return;
    try {
      // Delete all messages first (cascade should handle it, but be safe)
      await supabase.from('messages').delete().eq('conversation_id', conv.id);
      // Delete the conversation
      await supabase.from('conversations').delete().eq('id', conv.id);
      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conv.id));
      if (selectedConv?.id === conv.id) setSelectedConv(null);
    } catch (err) {
      console.error('💬 Delete conversation failed:', err);
      alert('Failed to delete conversation.');
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const activeConvs = conversations.filter(c => c.status !== 'archived');
  const archivedConvs = conversations.filter(c => c.status === 'archived');
  const isArchived = selectedConv?.status === 'archived';

  // Group active conversations by post title
  const postGroups = Array.from(new Set(activeConvs.map(c => c.post_title || 'General')));

  // Auto-expand all post groups when conversations load
  useEffect(() => {
    if (activeConvs.length > 0 && expandedPosts.size === 0) {
      setExpandedPosts(new Set(postGroups));
    }
  }, [conversations]);

  const togglePost = (title: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in h-[calc(100vh-1rem)] sm:h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-teal-50 via-white to-blue-50/30 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="font-bold text-slate-800">Messages</h3>
            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{activeConvs.length} active</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: sidebar + chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — full width on mobile (when in list view), fixed width on desktop */}
          <div className={`border-r border-slate-100 overflow-y-auto bg-slate-50/50 shrink-0 w-full sm:w-56 ${mobileView === 'chat' ? 'hidden sm:block' : 'block'}`}>
            {loading ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400">No conversations yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Accept an applicant to start chatting</p>
              </div>
            ) : (
              <>
                {/* Active conversations — grouped by post title */}
                {postGroups.map((postTitle) => {
                  const postConvs = activeConvs.filter(c => (c.post_title || 'General') === postTitle);
                  const isExpanded = expandedPosts.has(postTitle);
                  const totalUnread = postConvs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
                  return (
                    <div key={postTitle}>
                      {/* Post group header */}
                      <button
                        onClick={() => togglePost(postTitle)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-100/70 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[9px] text-slate-400 shrink-0">{isExpanded ? '▼' : '▶'}</span>
                          <span className="text-[10px] font-bold text-slate-600 truncate">{postTitle}</span>
                          <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-full shrink-0">{postConvs.length}</span>
                        </div>
                        {totalUnread > 0 && (
                          <span className="bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 shrink-0">{totalUnread}</span>
                        )}
                      </button>
                      {/* Students under this post */}
                      {isExpanded && postConvs.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => { setSelectedConv(conv); setMobileView('chat'); setShowAdminSupport(false); }}
                          className={`w-full text-left px-3 py-2 pl-6 border-b border-slate-50 transition-colors ${
                            selectedConv?.id === conv.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                {conv.other_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{conv.other_name}</p>
                                <p className="text-[9px] text-slate-400 truncate">{conv.last_message || 'No messages yet'}</p>
                              </div>
                            </div>
                            {(conv.unread_count || 0) > 0 && (
                              <span className="bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* Archived section */}
                {archivedConvs.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="w-full text-left px-3 py-2 border-t border-slate-200 bg-slate-100/50 hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {showArchived ? '▼' : '▶'} Archived ({archivedConvs.length})
                      </span>
                    </button>
                    {showArchived && archivedConvs.map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center group px-3 py-2 border-b border-slate-100 transition-colors ${
                          selectedConv?.id === conv.id ? 'bg-blue-50' : 'hover:bg-white opacity-60'
                        }`}
                      >
                        <button
                          onClick={() => { setSelectedConv(conv); setMobileView('chat'); setShowAdminSupport(false); }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {conv.other_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-500 truncate">{conv.other_name}</p>
                              <p className="text-[9px] text-slate-400">OJT Completed</p>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteConversation(conv)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Delete conversation"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ============ Admin Support Button (BOTTOM of sidebar) ============ */}
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-blue-100 p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => {
                  setShowAdminSupport(true);
                  setSelectedConv(null);
                  setMobileView('chat');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                  showAdminSupport
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  showAdminSupport ? 'bg-white/20' : 'bg-blue-500'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" />
                  </svg>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-xs font-bold truncate ${showAdminSupport ? 'text-white' : 'text-blue-700'}`}>
                    Admin Support
                  </p>
                  <p className={`text-[10px] truncate ${showAdminSupport ? 'text-blue-100' : 'text-blue-500'}`}>
                    {adminSupportUnread > 0 ? `${adminSupportUnread} new message${adminSupportUnread !== 1 ? 's' : ''}` : 'Message the admin team'}
                  </p>
                </div>
                {adminSupportUnread > 0 && !showAdminSupport && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shrink-0 animate-pulse">
                    {adminSupportUnread}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Chat window — full width on mobile (when in chat view), flex on desktop */}
          <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
            {showAdminSupport && companyId ? (
              /* ============ ADMIN SUPPORT CHAT (replaces student chat when active) ============ */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Support chat header */}
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
                  {/* Back button — mobile only */}
                  <button
                    onClick={() => { setShowAdminSupport(false); setMobileView('list'); }}
                    className="sm:hidden p-1.5 -ml-1 rounded-lg hover:bg-white text-slate-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM10 9v6m4-6v6" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 truncate">OJTly Admin Support</h3>
                    <p className="text-[10px] text-blue-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Online · We typically reply within hours
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowAdminSupport(false); }}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-white"
                    title="Back to student chats"
                  >
                    ✕ Close
                  </button>
                </div>
                {/* SupportChat component (compact = no header) */}
                <div className="flex-1 min-h-0">
                  <SupportChat
                    companyId={companyId}
                    companyName={companyName}
                    viewerRole="company"
                    compact
                  />
                </div>
              </div>
            ) : selectedConv ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0">
                  {/* Back button — mobile only */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="sm:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                    isArchived ? 'bg-slate-300' : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                  }`}>
                    {selectedConv.other_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-800 truncate">{selectedConv.other_name}</h4>
                    <div className="flex items-center gap-1.5">
                      {isArchived ? (
                        <span className="text-[10px] text-blue-500 font-medium">OJT Completed — chat archived</span>
                      ) : (
                        <>
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className="text-[10px] text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 bg-slate-50/50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-400">No messages yet</p>
                      <p className="text-xs text-slate-400 mt-1">{isArchived ? '' : 'Send the first message!'}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%]`}>
                            <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                              isMe
                                ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-br-md'
                                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm'
                            }`}>
                              {renderContent(msg)}
                            </div>
                            <span className={`text-[9px] text-slate-400 px-1 flex items-center gap-1 ${isMe ? 'justify-end' : ''}`}>
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

                  {/* Typing indicator */}
                  {isTyping && !isArchived && (
                    <div className="flex justify-start">
                      <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-bl-md shadow-sm px-3 py-2 flex items-center gap-1.5">
                        <span className="text-[10px] italic text-slate-400">{selectedConv.other_name} is typing</span>
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

                {/* Input (disabled if archived) */}
                <div className="px-3 py-3 border-t border-slate-100 bg-white shrink-0">
                  {isArchived ? (
                    <div className="text-center py-2">
                      <p className="text-xs text-slate-400 italic">This conversation is archived. OJT has been completed.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {/* Attachment button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile || sending}
                        className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0 hover:bg-slate-200 transition-all disabled:opacity-40"
                        title="Send image or PDF"
                      >
                        {uploadingFile ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        )}
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          if (channelRef.current) {
                            channelRef.current.send({
                              type: 'broadcast',
                              event: 'typing',
                              payload: { user_id: userId }
                            });
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400"
                        disabled={sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:shadow-md transition-all disabled:opacity-40 active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">Select a conversation</p>
                  <p className="text-xs text-slate-400 mt-1">Click a student on the left to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>

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
              <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* Caption input */}
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all disabled:opacity-50"
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
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-300 text-white text-sm font-semibold rounded-lg transition-all shadow-md"
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

        {/* Image lightbox */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
    </div>,
    document.body
  );
}
