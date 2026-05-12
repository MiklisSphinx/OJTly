
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Message = { id: number; text: string; sender: "user" | "ai"; timestamp?: Date };

const BUTTONS = [
  { icon: "city", label: "Bacolod City OJTs", query: "Show me OJT openings in Bacolod City", location: "bacolod city", accent: "text-indigo-600", bgAccent: "bg-indigo-50", border: "border-indigo-200" },
  { icon: "map", label: "Silay City OJTs", query: "Find OJT openings in Silay City", location: "silay city", accent: "text-teal-600", bgAccent: "bg-teal-50", border: "border-teal-200" },
  { icon: "target", label: "Talisay City OJTs", query: "What OJT openings are available in Talisay City?", location: "talisay city", accent: "text-violet-600", bgAccent: "bg-violet-50", border: "border-violet-200" },
  { icon: "list", label: "All Company Posts", query: "Show me all available OJT posts from all companies", location: "all", accent: "text-amber-600", bgAccent: "bg-amber-50", border: "border-amber-200" },
];

const MenuIcon = ({ type, className = "w-5 h-5" }: { type: string; className?: string }) => {
  switch (type) {
    case "city": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>;
    case "map": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    case "target": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case "list": return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    default: return null;
  }
};

/* ─── LOGO ─── */
const OJTlyLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: { icon: 28, text: "text-[14px]" }, md: { icon: 36, text: "text-[15px]" }, lg: { icon: 56, text: "text-xl" } };
  const s = sizes[size];
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200/50" style={{ width: s.icon, height: s.icon }}>
        <svg width={s.icon * 0.52} height={s.icon * 0.52} viewBox="0 0 40 40" fill="none">
          <path d="M20 4L4 14L20 24L36 14L20 4Z" fill="white" fillOpacity="0.95" />
          <path d="M20 4L4 14L20 18L36 14L20 4Z" fill="white" />
          <path d="M30 12V26" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="30" cy="28" r="3" fill="white" />
          <circle cx="30" cy="28" r="1.2" fill="#4f46e5" />
          <path d="M10 18V26C10 26 14 30 20 30C26 30 30 26 30 26V18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
      <span className={`${s.text} font-extrabold text-slate-800 tracking-tight select-none`}>OJTly<span className="text-indigo-500">.</span></span>
    </div>
  );
};

/* ─── COMPANY COLORS ─── */
const CCOLORS = ["bg-indigo-500","bg-teal-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-emerald-500","bg-fuchsia-500","bg-sky-500","bg-orange-500"];
function cColor(n: string) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return CCOLORS[Math.abs(h) % CCOLORS.length]; }
function cIni(n: string) { return n.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(""); }

/* ─── ICONS ─── */
const IcRefresh = <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;

/* ─── PARSER ─── */
interface Card {
  company: string;
  skills: string[];
  location?: string;
  hours?: string;
  pay?: string;
  mode?: string;
  description?: string;
  vacancies?: string;
  distance?: string;
  courseCategory?: string;
  extra: string[];
}

const isGarbage = (v: string) => {
  const x = v.trim().toLowerCase();
  if (!x || x.length < 2) return true;
  return [
    /^(is |are |was |were )(not |n'?t |un)?(clear|unclear|specified|provided|available|mentioned|stated|given|known|indicated)/i,
    /^(n\/a|none|not specified|not available|not provided|not mentioned|unknown|tbd|tba)$/i,
    /^(no .* (provided|specified|available|mentioned|given|listed|found|recorded))/i,
    /^(the )?(location|description|details?|info|information|allowance|hours?|duration|skills?|mode|pay) (is|are)/i,
    /^(does not|doesn't|isn't|aren't)/i,
    /^(unavailable|unclear)$/i
  ].some(p => p.test(x));
};

const notACompany = (s: string): boolean => {
  const x = s.trim();
  if (x.length < 2 || x.length > 80) return true;
  if (/^\d+$/.test(x)) return true;
  if (/^\d+\s*(hours?|hr|hrs|months?|weeks?)$/i.test(x)) return true;
  if (/^(skills?|technologies?|stack|tech|location|address|city|area|hours?|duration|allowance|mode|description|about|overview|details?|info(?:rmation)?|paid|unpaid|onsite|on-site|remote|hybrid|in-person|work\s*type|job\s*type|vacanc(?:y|ies)|openings?|slots?|status|available|qualifications?|requirements?|distance|km|course|category)$/i.test(x)) return true;
  if (/\b(skills?|technologies?|location|address|city|hours?|duration|allowance|mode|description|about|overview|details?|info|work\s*type|job\s*type|vacanc(?:y|ies)|openings?|slots?|distance|course\s*category)\s*[:\-–—]/i.test(x)) return true;
  return false;
};

const normMode = (s: string): string | null => {
  const l = s.toLowerCase().replace(/[\s\-]/g, "");
  if (l.includes("onsite")) return "On-site";
  if (l === "remote") return "Remote";
  if (l === "hybrid") return "Hybrid";
  if (l.includes("inperson")) return "In-person";
  return null;
};

function parseCards(text: string): { cards: Card[]; title: string; footer: string } {
  const cards: Card[] = [];
  const rawLines = text.split("\n");

  const lines: string[] = [];
  for (const raw of rawLines) {
    const t = raw.trim();
   const m = t.match(/^(\s*(?:\d+[\.\)]\s*)?\*\*.+?\*\*)\s*[(\[|]?\s*[-|–—]\s*([^\s].+)$/);
    if (m) { lines.push(m[1]); lines.push(m[2].trim()); continue; }
    const clean = t.replace(/^(\s*(?:\d+[\.\)]\s*)?\*\*.+?\*\*)\s*[:\.,]\s*$/, "$1")
                  .replace(/^(\s*(?:\d+[\.\)]\s*)?\*\*.+?\*\*)\s*[\s]*[-–—|]\s*$/, "$1");
    lines.push(clean);
  }

  let cur: Card | null = null;
  const pre: string[] = [], post: string[] = [];
  let hit = false;
  const skip = [/skills?/i,/technologies?/i,/location/i,/address/i,/city/i,/hours?/i,/unpaid/i,/₱|PHP/i,/allowance/i,/onsite|on-site|remote|hybrid|in-person/i,/description/i,/about/i,/overview/i,/mode/i,/work\s*type/i,/allowance\s*type/i,/vacanc/i,/distance/i,/paid/i,/km/i,/course/i,/category/i];

  const extractCompany = (t: string): string | null => {
    let m: RegExpMatchArray | null;
    m = t.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (m) {
      let n = m[1].trim().replace(/^\d+[\.\)]\s+/, "").replace(/[:\.,]+$/, "").trim();
      if (!notACompany(n) && n.length >= 2) return n;
    }
    m = t.match(/^\s*#{1,4}\s+(.+?)\s*$/);
    if (m) {
      const n = m[1].replace(/^\d+[\.\)]\s+/, "").replace(/[:\.,]+$/, "").trim();
      if (!notACompany(n) && n.length >= 2) return n;
    }
    m = t.match(/^\s*\d+[\.\)]\s+(.+?)\s*$/);
    if (m && !t.includes(":") && !t.includes("–") && !t.includes("—") && !t.includes("|") && !t.includes("-")) {
      const n = m[1].replace(/[:\.,]+$/, "").trim();
      if (!notACompany(n) && n.length >= 2 && n.length <= 60) return n;
    }
    m = t.match(/^\s*[\-\*\•▸▪►]\s+(.+?)\s*$/);
    if (m && !t.includes(":") && !t.includes("–") && !t.includes("—") && !t.includes("|") && !t.includes("-")) {
      const n = m[1].replace(/[:\.,]+$/, "").trim();
      if (!notACompany(n) && n.length >= 2 && n.length <= 60) return n;
    }
    return null;
  };

  for (const raw of lines) {
    const t = raw.trim(); if (!t) continue;
    const company = extractCompany(t);
    if (company) {
      hit = true; if (cur) cards.push(cur); cur = { company, skills: [], extra: [] };
    } else if (cur) {
      const sk = t.match(/(?:skills?\s*(?:required)?|technologies?|stack|tech(?:nologies)?)\s*[:\-–—|]?\s*(.+)/i);
      if (sk) { const a = sk[1].replace(/\*\*/g,"").replace(/[•\-–—|]/g,",").split(",").map(s=>s.trim()).filter(Boolean).filter(s=>!isGarbage(s)); if(a.length) cur.skills=a; }
      const lo = t.match(/(?:location|address|city|area|place)\s*[:\-–—|]?\s*(.+)/i);
      if (lo && !isGarbage(lo[1].replace(/\*\*/g,""))) cur.location = lo[1].replace(/\*\*/g,"").trim();
      if (!cur.location) { const c = t.match(/((?:Bacolod|Silay|Talisay|Bago|Murcia|Valladolid|La Carlota|Himamaylan|Kabankalan|Sagay|Escalante|Cadiz|San Carlos|Victorias|Pulupandan)\s*City)/i); if(c) cur.location = c[1].trim(); }
      const hr = t.match(/(\d+(?:\.\d+)?)\s*hours?\b/i); if(hr) cur.hours = hr[0];
      const up = t.match(/\bunpaid\b/i), pa = t.match(/(?:₱|PHP|php)\s*[\d,]+/), al = t.match(/(?:allowance(?:\s*type)?)\s*[:\-–—|]?\s*(.+)/i);
      if (up) cur.pay = "Unpaid"; else if (pa) cur.pay = pa[0]; else if (al && !isGarbage(al[1].replace(/\*\*/g,""))) cur.pay = al[1].replace(/\*\*/g,"").trim(); else if (!cur.pay && /\bPaid\b/i.test(t)) cur.pay = "Paid";
      const mo = t.match(/(?:mode|(?:work|job)\s*type|working\s*(?:mode|arrangement|setup))\s*[:\-–—|]?\s*(.+)/i);
      if (mo) { const nm = normMode(mo[1].replace(/\*\*/g,"")); if(nm) cur.mode = nm; }
      if (!cur.mode) { const mo2 = t.match(/\b(onsite|on-site|on\s*site|remote|hybrid|in-person|on-premises)\b/i); if(mo2){ const nm = normMode(mo2[1]); if(nm) cur.mode = nm; }}
      const de = t.match(/(?:description|about|details?|overview|info(?:rmation)?|work\s*description)\s*[:\-–—|]?\s*(.+)/i);
      if (de) { const dv = de[1].replace(/\*\*/g,"").trim(); if(!isGarbage(dv)&&dv.length>5) cur.description = dv; }
      const vac = t.match(/(?:vacanc(?:y|ies)|slots?|openings?|positions?)\s*[:\-–—|]?\s*(\d+)/i);
      if (vac) cur.vacancies = vac[1];
      const dist = t.match(/(?:distance|dist\.?)\s*[:\-–—|]?\s*([\d.]+)\s*km\b/i);
      if (dist) cur.distance = `${dist[1]} km`; else if (!cur.distance) { const d2 = t.match(/([\d.]+)\s*km\b/i); if(d2) cur.distance = `${d2[1]} km`; }
      const cc = t.match(/(?:course\s*(?:category|type|track)|program)\s*[:\-–—|]?\s*(.+)/i);
      if (cc) { const cv = cc[1].replace(/\*\*/g,"").trim(); if(!isGarbage(cv)&&cv.length>1) cur.courseCategory = cv; }
      if (!skip.some(p => p.test(t)) && !t.match(/^\d+[\.\)]/)) cur.extra.push(t.replace(/\*\*/g,""));
    } else if (!hit) pre.push(t); else post.push(t);
  }
  if (cur) cards.push(cur);
  const cleanTitle = pre.join(" ").replace(/\*\*/g,"").replace(/^(here are|here's|found|showing|these are|i found|i've found)\s*/i,"").replace(/(ojt\s*openings?|ojt\s*posts?|ojt\s*positions?|internships?)\s*(in|for|at|near)\s*/i,"").replace(/(for|in|at|near)\s+(bacolod|silay|talisay).*/i,"").trim();
  return { cards, title: cleanTitle, footer: post.join("\n").replace(/\*\*/g,"") };
}

/* ─── SKELETON CARD ─── */
const OJTSkeletonCard = () => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden w-full animate-pulse">
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-50">
      <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="h-2 w-16 bg-slate-100 rounded" />
      </div>
      <div className="w-2 h-2 bg-slate-200 rounded-full flex-shrink-0" />
    </div>
    <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
      <div className="h-4 w-12 bg-slate-100 rounded-full" />
      <div className="h-4 w-12 bg-slate-100 rounded-full" />
      <div className="h-4 w-12 bg-slate-100 rounded-full" />
    </div>
    <div className="px-3 py-1.5">
      <div className="h-2 w-32 bg-slate-100 rounded" />
    </div>
    <div className="border-t border-slate-50 px-3 py-2">
      <div className="h-2 w-12 bg-slate-100 rounded mb-2" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="h-2 w-16 bg-slate-100 rounded" />
            <div className="h-2 w-24 bg-slate-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── CARD ─── */
const OJTCard = ({ card, idx }: { card: Card; idx: number }) => {
  const tags: { text: string; bg: string; textClr: string }[] = [];
  if (card.mode) {
    const m = card.mode.toLowerCase();
    if (m.includes("on-site")) tags.push({ text: "On-site", bg: "bg-teal-50", textClr: "text-teal-700" });
    else if (m === "remote") tags.push({ text: "Remote", bg: "bg-sky-50", textClr: "text-sky-700" });
    else if (m === "hybrid") tags.push({ text: "Hybrid", bg: "bg-violet-50", textClr: "text-violet-700" });
    else tags.push({ text: card.mode, bg: "bg-slate-50", textClr: "text-slate-700" });
  }
  if (card.pay) {
    if (card.pay.toLowerCase() === "unpaid") tags.push({ text: "Unpaid", bg: "bg-amber-50", textClr: "text-amber-700" });
    else tags.push({ text: "Paid", bg: "bg-emerald-50", textClr: "text-emerald-700" });
  }
  if (card.hours) tags.push({ text: card.hours, bg: "bg-indigo-50", textClr: "text-indigo-700" });

  let locText = card.location || "";
  if (card.distance && locText) locText = `${locText} (${card.distance})`;
  else if (card.distance) locText = card.distance;

  const details: { label: string; value: string | React.ReactNode }[] = [];
  if (card.distance) details.push({ label: "Distance", value: card.distance });
  if (card.description) details.push({ label: "Work Description", value: card.description });
  if (card.skills.length > 0) {
    details.push({
      label: "Skills Required",
      value: (
        <span className="inline-flex flex-wrap gap-1">
          {card.skills.map((s, i) => (
            <span key={i} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 rounded px-1.5 py-px">{s}</span>
          ))}
        </span>
      )
    });
  }
  if (card.vacancies) details.push({ label: "Vacancies", value: card.vacancies });
  if (card.mode) details.push({ label: "Work Type", value: card.mode });
  if (card.hours) details.push({ label: "Duration", value: `${card.hours.replace(/\bhrs?\b/i, "")} hours`.trim() });
  if (card.pay) details.push({ label: "Allowance", value: card.pay });
  if (card.courseCategory) details.push({ label: "Course Category", value: card.courseCategory });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.2 }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden w-full"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-50">
        <div className={`w-8 h-8 rounded-lg flex-shrink-0 ${cColor(card.company)} flex items-center justify-center shadow-sm`}>
          <span className="text-white font-extrabold text-[9px] tracking-tight">{cIni(card.company) || "?"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[12px] font-extrabold text-slate-800 truncate leading-tight">{card.company}</h4>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">OJT Opening</p>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full ring-[3px] ring-emerald-50 flex-shrink-0" />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
          {tags.map((t, i) => (
            <span key={i} className={`text-[9px] font-bold ${t.bg} ${t.textClr} rounded-full px-2.5 py-0.5 leading-tight`}>{t.text}</span>
          ))}
        </div>
      )}

      {locText && (
        <div className="px-3 py-1.5">
          <p className="text-[10px] text-slate-500 font-medium leading-snug">{locText}</p>
        </div>
      )}

      {details.length > 0 && (
        <div className="border-t border-slate-50 px-3 py-2">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">Details</p>
          <div className="space-y-1.5">
            {details.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] font-semibold text-slate-400 w-[100px] flex-shrink-0 pt-px leading-snug">{d.label}</span>
                <span className="text-[10px] font-semibold text-slate-700 leading-snug">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ─── AI MSG ─── */
const bold = (t: string) => t.split(/(\*\*.*?\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);

const AIMsg = ({ text }: { text: string }) => {
  const { cards, title, footer } = useMemo(() => parseCards(text), [text]);
  if (cards.length === 0) return <div className="text-[12px] leading-relaxed text-slate-700 whitespace-pre-wrap">{bold(text)}</div>;
  return (
    <div className="space-y-2.5 w-full">
      {title && (
        <div className="flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] font-extrabold text-slate-600 tracking-tight">{title}</p>
        </div>
      )}
      <div className="space-y-2.5 w-full">{cards.map((c, i) => <OJTCard key={i} card={c} idx={i} />)}</div>
      {footer.trim() && <p className="text-[9px] text-slate-400 leading-relaxed whitespace-pre-wrap text-center">{bold(footer.trim())}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
export default function StudentAI() {
  const [mode, setMode] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

 const send = async (query: string, location: string, skipAdd?: boolean) => {
    // 1. Add user message immediately
    if (!skipAdd) { 
      setMessages(p => [...p, { id: Date.now(), text: query, sender: "user", timestamp: new Date() }]); 
      setMode("chat"); 
    }
    
    setIsTyping(true); 
    setError(null);
    
    const hist = (skipAdd ? messages : [...messages, { text: query, sender: "user" as const }])
      .filter(m => m.sender === "user")
      .map(m => ({ role: "user" as const, content: m.text }));
      
    try {
      // ✅ FIX 1: Increased to 2500ms (2.5 sec) minimum so skeleton feels natural
      const [res] = await Promise.all([
        fetch("/api/chat", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ messages: hist, explicitLocation: location }) 
        }),
        new Promise(resolve => setTimeout(resolve, 2500)) 
      ]);
      
      const d = await res.json(); 
      
      if (d.error) throw new Error(d.text);
      
      // ✅ FIX 2: Quick validation - if no **bold markers** found, warn console
      // (This helps you debug if backend is sending wrong format)
      if (!d.text.includes('**')) {
        console.warn('[AI] Response did not contain proper card formatting. Check route.ts system prompt.');
      }
      
      setMessages(p => [...p, { id: Date.now() + 1, text: d.text, sender: "ai", timestamp: new Date() }]);
      
    } catch (e) { 
      setError(e instanceof Error ? e.message : "Failed to connect"); 
    } finally { 
      setIsTyping(false); 
    }
  };
  
  const handleRefresh = async () => {
    if (refreshing || isTyping || messages.length < 2) return;
    const last = [...messages].reverse().find(m => m.sender === "user"); if (!last) return;
    const btn = BUTTONS.find(b => b.query === last.text);
    setRefreshing(true);
    setMessages(p => { const n = [...p]; if (n.length && n[n.length - 1].sender === "ai") n.pop(); return n; });
    await send(last.text, btn?.location || "all", true);
    setRefreshing(false);
  };

  const fmt = (d?: Date) => d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  if (mode === "menu") {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#f8fafc] font-['Inter',system-ui,sans-serif]">
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
          <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/student_main" className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <OJTlyLogo size="sm" />
            <div className="w-7" />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-xs flex flex-col items-center space-y-7">
            <div className="flex flex-col items-center space-y-3">
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200/60">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 4L4 14L20 24L36 14L20 4Z" fill="white" fillOpacity="0.95" />
                    <path d="M20 4L4 14L20 18L36 14L20 4Z" fill="white" />
                    <path d="M30 12V26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="30" cy="28" r="3.5" fill="white" />
                    <circle cx="30" cy="28" r="1.5" fill="#4f46e5" />
                    <path d="M10 18V26C10 26 14 30 20 30C26 30 30 26 30 26V18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="text-center">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Find your OJT</h2>
                <p className="text-[11px] text-slate-500 mt-1">Select a location to browse internships.</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              {BUTTONS.map((b, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.05 }}
                  onClick={() => send(b.query, b.location)}
                  className={`group bg-white p-4 rounded-xl border ${b.border} text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]`}>
                  <div className={`w-10 h-10 rounded-xl ${b.bgAccent} flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110`}>
                    <MenuIcon type={b.icon} className={`w-5 h-5 ${b.accent}`} />
                  </div>
                  <h3 className="text-[11px] font-extrabold text-slate-800 leading-tight">{b.label}</h3>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">View →</p>
                </motion.button>
              ))}
            </div>

            <p className="text-[8px] font-semibold text-slate-300 tracking-widest uppercase">Powered by OJTly AI</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f8fafc] font-['Inter',system-ui,sans-serif]">
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-md mx-auto px-3 h-12 flex items-center justify-between">
          <button onClick={() => setMode("menu")} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <OJTlyLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>
              <span className="text-[8px] font-bold text-emerald-700">Online</span>
            </div>
            <button onClick={handleRefresh} disabled={refreshing || isTyping || messages.length < 2}
              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-25 disabled:pointer-events-none" title="Refresh">
              <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>{IcRefresh}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-md mx-auto px-4 py-5 flex flex-col items-center space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                {msg.sender === "ai" && (
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm shadow-indigo-200 mr-2">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                )}
                <div className={msg.sender === "user" ? "max-w-[70%]" : "max-w-[90%] w-full"}>
                  {msg.sender === "ai" ? (
                    <div className="bg-white rounded-xl rounded-bl-sm border border-slate-100 shadow-sm px-3.5 py-3 flex justify-center">
                      <div className="w-full"><AIMsg text={msg.text} /></div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 text-[12px] leading-relaxed break-words whitespace-pre-wrap rounded-xl bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-200 text-center">{msg.text}</div>
                  )}
                  <span className={`block text-[8px] mt-1 text-slate-400 ${msg.sender === "user" ? "text-right" : "text-center"}`}>{fmt(msg.timestamp)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ─── SKELETON LOADING STATE ─── */}
          {isTyping && (
            <div className="flex flex-col w-full space-y-4">
              <div className="flex justify-start">
                 <div className="w-6 h-6 rounded-md bg-indigo-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm shadow-indigo-200 mr-2">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                 </div>
                 <div className="bg-white rounded-xl rounded-bl-sm border border-slate-100 shadow-sm px-3.5 py-3 w-full">
                   <div className="space-y-3">
                      <OJTSkeletonCard />
                      <OJTSkeletonCard />
                   </div>
                 </div>
              </div>
            </div>
          )}

          {error && (
            <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-center shadow-sm">
              <p className="text-[10px] font-bold text-red-800">Connection Failed</p>
              <p className="text-[9px] text-red-500 mt-0.5 break-words">{error}</p>
            </div>
          )}

          <AnimatePresence>
            {!isTyping && messages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="w-full pt-6 pb-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase whitespace-nowrap">Explore more</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BUTTONS.map((b, i) => (
                    <motion.button key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.04 }}
                      onClick={() => send(b.query, b.location)}
                      className={`group bg-white px-3 py-3 rounded-xl border ${b.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.95] flex flex-col items-center gap-2`}>
                      <div className={`w-9 h-9 rounded-xl ${b.bgAccent} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                        <MenuIcon type={b.icon} className={`w-4.5 h-4.5 ${b.accent}`} />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-700 whitespace-nowrap text-center leading-tight">{b.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={endRef} className="h-4" />
        </div>
      </main>
    </div>
  );
}
