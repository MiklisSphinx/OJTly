"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Message = { id: number; text: string; sender: "user" | "ai"; timestamp?: Date };

// Professional SaaS color mapping
const BUTTONS = [
  { icon: "city", label: "Bacolod City OJTs", query: "Show me OJT openings in Bacolod City", location: "bacolod city", accent: "text-indigo-600", bgAccent: "bg-indigo-50", shadow: "hover:shadow-indigo-100" },
  { icon: "map", label: "Silay City OJTs", query: "Find OJT openings in Silay City", location: "silay city", accent: "text-teal-600", bgAccent: "bg-teal-50", shadow: "hover:shadow-teal-100" },
  { icon: "target", label: "Talisay City OJTs", query: "What OJT openings are available in Talisay City?", location: "talisay city", accent: "text-violet-600", bgAccent: "bg-violet-50", shadow: "hover:shadow-violet-100" },
  { icon: "list", label: "All Company Posts", query: "Show me all available OJT posts from all companies", location: "all", accent: "text-amber-600", bgAccent: "bg-amber-50", shadow: "hover:shadow-amber-100" },
];

const MenuIcon = ({ type, className = "w-6 h-6" }: { type: string, className?: string }) => {
  switch (type) {
    case "city": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>;
    case "map": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    case "target": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case "list": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    default: return null;
  }
};

export default function StudentAI() {
  const [mode, setMode] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleButtonClick = async (query: string, location: string) => {
    const newUserMessage = { id: Date.now(), text: query, sender: "user" as const, timestamp: new Date() };
    setMessages((prev) => [...prev, newUserMessage]);
    setMode("chat");
    setIsTyping(true);
    setError(null);

    // Pass the explicit location string to the backend to prevent regex misses
    const payloadMessages = [...messages, newUserMessage].map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: payloadMessages,
          explicitLocation: location // <-- Sends exactly "silay city" or "all"
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.text);

      setMessages((prev) => [...prev, { id: Date.now() + 1, text: data.text, sender: "ai", timestamp: new Date() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsTyping(false);
    }
  };

  const renderText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
      return <span key={i}>{part}</span>;
    });
  };

  const formatTime = (date?: Date) => (date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

  // ─────────────────────────────────────────────
  // 1. PROFESSIONAL MENU VIEW
  // ─────────────────────────────────────────────
  if (mode === "menu") {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#f8fafc] font-['Inter',system-ui,sans-serif] overflow-hidden">
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Link href="/student_main" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>
              </div>
              <div className="leading-none">
                <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">OJTly<span className="text-indigo-500">.</span></h1>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center space-y-3">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mx-auto w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Find your OJT</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Select a location to browse available internships.</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUTTONS.map((btn, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  onClick={() => handleButtonClick(btn.query, btn.location)}
                  className={`group bg-white p-5 rounded-2xl border border-slate-100 text-left shadow-sm hover:shadow-lg ${btn.shadow} hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${btn.bgAccent} transition-transform duration-200 group-hover:scale-105`}>
                      <MenuIcon type={btn.icon} className={`w-6 h-6 ${btn.accent}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="text-sm font-bold text-slate-800">{btn.label}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 group-hover:text-slate-600 transition-colors">
                        View internships
                        <svg className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // 2. PROFESSIONAL CHAT VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col bg-[#f8fafc] font-['Inter',system-ui,sans-serif] overflow-hidden">
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => setMode("menu")} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          </div>
          <div className="leading-none">
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">OJTly<span className="text-indigo-500">.</span></h1>
            <p className="text-[10px] font-medium text-emerald-500 flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Online</p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm shadow-indigo-200">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.sender === "user" ? "order-1" : ""}`}>
                  <div className={`px-4 py-3 text-[13px] sm:text-sm leading-relaxed break-words whitespace-pre-wrap rounded-2xl
                    ${msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-md shadow-md shadow-indigo-200"
                      : "bg-white text-slate-700 rounded-bl-md border border-slate-100 shadow-sm"}`}>
                    {renderText(msg.text)}
                  </div>
                  <span className={`block text-[10px] mt-1.5 px-1 text-slate-400 ${msg.sender === "user" ? "text-right" : "text-left"}`}>{formatTime(msg.timestamp)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm shadow-indigo-200">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md border border-slate-100 shadow-sm px-5 py-4">
                <div className="flex gap-1.5">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ animationDelay: `${d}s` }} className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="flex justify-center px-4">
              <div className="w-full max-w-sm bg-red-50 border border-red-100 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-red-800">Connection Failed</p>
                <p className="text-[11px] text-red-500 mt-1 break-words">{error}</p>
              </div>
            </div>
          )}

          {/* ── INLINE ACTION BUTTONS ── */}
          <AnimatePresence>
            {!isTyping && messages.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="pt-8 pb-4 space-y-3 max-w-sm sm:max-w-md mx-auto"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Explore more</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {BUTTONS.map((btn, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      onClick={() => handleButtonClick(btn.query, btn.location)}
                      className={`group bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md ${btn.shadow} hover:-translate-y-0.5 transition-all duration-200 text-center active:scale-95`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg ${btn.bgAccent} transition-transform duration-200 group-hover:scale-105`}>
                          <MenuIcon type={btn.icon} className={`w-5 h-5 ${btn.accent}`} />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">{btn.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-6" />
        </div>
      </main>
    </div>
  );
}