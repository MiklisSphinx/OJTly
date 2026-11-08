// src/app/api/chat/route.ts
export const dynamic = 'force-dynamic';

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────
interface CityCoords {
  lat: number;
  lng: number;
  display: string;
}

interface OJTPost {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  city: string;
  specialization: string;
  course: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface OJTWithDistance {
  post: OJTPost;
  company: Company | undefined;
  distance: number;
  locationName: string;
}

// ─── City Coordinates ────────────────────────────────────
const CITY_COORDINATES: Record<string, CityCoords> = {
  "bacolod":       { lat: 10.6317, lng: 122.9531, display: "Bacolod City" },
  "bacolod city":  { lat: 10.6317, lng: 122.9531, display: "Bacolod City" },
  "talisay":       { lat: 10.7586, lng: 122.9714, display: "Talisay City" },
  "talisay city":  { lat: 10.7586, lng: 122.9714, display: "Talisay City" },
  "silay":         { lat: 10.8064, lng: 122.9739, display: "Silay City" },
  "silay city":    { lat: 10.8064, lng: 122.9739, display: "Silay City" },
  "bago":          { lat: 10.5333, lng: 122.9333, display: "Bago City" },
  "bago city":     { lat: 10.5333, lng: 122.9333, display: "Bago City" },
  "murcia":        { lat: 10.6000, lng: 123.0333, display: "Murcia" },
  "victorias":     { lat: 10.9167, lng: 123.0667, display: "Victorias City" },
  "victorias city":{ lat: 10.9167, lng: 123.0667, display: "Victorias City" },
  "cadiz":         { lat: 10.9500, lng: 123.3000, display: "Cadiz City" },
  "cadiz city":    { lat: 10.9500, lng: 123.3000, display: "Cadiz City" },
  "sagay":         { lat: 10.9333, lng: 123.4333, display: "Sagay City" },
  "sagay city":    { lat: 10.9333, lng: 123.4333, display: "Sagay City" },
  "escalante":     { lat: 10.8333, lng: 123.5000, display: "Escalante City" },
  "escalante city":{ lat: 10.8333, lng: 123.5000, display: "Escalante City" },
  "san carlos":    { lat: 10.9333, lng: 123.4167, display: "San Carlos City" },
  "san carlos city":{ lat: 10.9333, lng: 123.4167, display: "San Carlos City" },
  "kabankalan":    { lat: 9.9833,  lng: 122.8167, display: "Kabankalan City" },
  "kabankalan city":{ lat: 9.9833, lng: 122.8167, display: "Kabankalan City" },
  "himamaylan":    { lat: 10.0833, lng: 122.8667, display: "Himamaylan City" },
  "himamaylan city":{ lat: 10.0833,lng: 122.8667, display: "Himamaylan City" },
  "sipalay":       { lat: 9.7500,  lng: 122.4667, display: "Sipalay City" },
  "sipalay city":  { lat: 9.7500,  lng: 122.4667, display: "Sipalay City" },
  "la carlota":    { lat: 10.4000, lng: 122.9167, display: "La Carlota City" },
  "la carlota city":{ lat: 10.4000,lng: 122.9167, display: "La Carlota City" },
  "binalbagan":    { lat: 10.1833, lng: 122.8333, display: "Binalbagan" },
  "hinigaran":     { lat: 10.2667, lng: 122.8333, display: "Hinigaran" },
  "isabela":       { lat: 10.2000, lng: 122.9500, display: "Isabela" },
  "pontevedra":    { lat: 10.3167, lng: 122.9000, display: "Pontevedra" },
  "pulupandan":    { lat: 10.5167, lng: 122.8500, display: "Pulupandan" },
  "san enrique":   { lat: 10.4667, lng: 122.8667, display: "San Enrique" },
  "valladolid":    { lat: 10.4167, lng: 122.8667, display: "Valladolid" },
  "moises padilla":{ lat: 10.2333, lng: 122.9000, display: "Moises Padilla" },
  "la castellana": { lat: 10.3167, lng: 122.9667, display: "La Castellana" },
};

// ─── Lazy-initialized clients (solves the build-time crash) ──
let _supabase: SupabaseClient | null = null;
let _groq: Groq | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  _supabase = createClient(url, key);
  return _supabase;
}

function getGroq(): Groq {
  if (_groq) return _groq;
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");
  _groq = new Groq({ apiKey: key });
  return _groq;
}

// ─── Helpers ─────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractLocation(message: string): CityCoords | null {
  const lower = message.toLowerCase();
  const sortedKeys = Object.keys(CITY_COORDINATES).sort(
    (a, b) => b.length - a.length
  );
  for (const key of sortedKeys) {
    const pattern = key.replace(/\s+/g, "\\s+");
    if (new RegExp(`\\b${pattern}\\b`, "i").test(lower)) {
      return CITY_COORDINATES[key];
    }
  }
  return null;
}

function resolveLocation(locationText: string): CityCoords | null {
  if (!locationText) return null;
  const lower = String(locationText).toLowerCase().trim();
  if (CITY_COORDINATES[lower]) return CITY_COORDINATES[lower];
  const sortedKeys = Object.keys(CITY_COORDINATES).sort(
    (a, b) => b.length - a.length
  );
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CITY_COORDINATES[key];
  }
  const stripped = lower.replace(/\bcity\b/i, "").trim();
  for (const key of sortedKeys) {
    const keyStripped = key.replace(/\bcity\b/i, "").trim();
    if (stripped === keyStripped) return CITY_COORDINATES[key];
  }
  return null;
}

function findNearestOJTs(
  userLocation: CityCoords,
  posts: OJTPost[],
  companies: Company[],
  k = 5
): OJTWithDistance[] {
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const results: OJTWithDistance[] = [];

  for (const post of posts) {
    const company = companyMap.get(post.company_id);
    const locationText =
      [post.location, post.city, company?.location, company?.city]
        .filter((v) => typeof v === "string" && v)
        .join(", ") || "";

    const coords = resolveLocation(locationText);
    if (!coords) continue;

    const rawDistance = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      coords.lat,
      coords.lng
    );

    const distance = rawDistance < 0.1 ? 0.1 : Math.round(rawDistance * 10) / 10;

    results.push({
      post,
      company,
      distance,
      locationName: coords.display,
    });
  }
  return results.sort((a, b) => a.distance - b.distance).slice(0, k);
}

function sanitizePost(post: OJTPost) {
  const { id, company_id, created_at, updated_at, ...safe } = post;
  return safe;
}

function sanitizeCompany(company: Company) {
  const { id, created_at, updated_at, ...safe } = company;
  return safe;
}

// ─── Route Handler ───────────────────────────────────────
export async function POST(req: Request) {
  try {
    // ── Debug: env check (safe to remove later) ──
    console.log('🔍 ENV CHECK:');
    console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? `✅ loaded (${process.env.GROQ_API_KEY.slice(0,12)}...)` : '❌ MISSING');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ loaded' : '❌ MISSING');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ loaded' : '❌ MISSING');

    // ── Input validation ──
    const body = await req.json();
    const messages: unknown[] = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { text: "Please send a message to start chatting." },
        { status: 400 }
      );
    }

    // ── Type-safe message mapping ──
    const safeMessages: ChatCompletionMessageParam[] = messages
      .filter((m): m is { role: string; content: string } =>
        typeof m === "object" && m !== null && "role" in m && "content" in m
      )
      .map((m): ChatCompletionMessageParam => {
        const content = String(m.content);
        const role = m.role === "model" ? "assistant" : m.role;

        switch (role) {
          case "assistant":
            return { role: "assistant", content };
          case "system":
            return { role: "system", content };
          default:
            return { role: "user", content };
        }
      });

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { text: "Invalid message format." },
        { status: 400 }
      );
    }

    const lastUserMessage =
      safeMessages.filter((m) => m.role === "user").pop()?.content ?? "";

    // ── Greeting detection ──
    if (typeof lastUserMessage === 'string' && /^(hi|hello|hey|yo|sup|what'?s?\s*up|kumusta)\??!*\s*$/i.test(lastUserMessage.trim())) {
      return NextResponse.json({
        text: "👋 Hi there! I'm your OJTly Mentor. I can help you find OJT opportunities in Negros Occidental. Just tell me your city and I'll find the nearest openings for you!",
      });
    }

    // ── Location detection ──
    const explicitLocation: string | undefined = body.explicitLocation;
    const isAskingForAll =
      explicitLocation === "all" ||
      (typeof lastUserMessage === 'string' && /\b(all|every)\b.*\b(company|available|ojt|post|opening)\b/i.test(lastUserMessage));

    let detectedLocation: CityCoords | null = null;
    if (explicitLocation && explicitLocation !== "all") {
      detectedLocation =
        CITY_COORDINATES[explicitLocation.toLowerCase()] ??
        (typeof lastUserMessage === 'string' ? extractLocation(lastUserMessage) : null);
    } else if (!isAskingForAll && typeof lastUserMessage === 'string') {
      detectedLocation = extractLocation(lastUserMessage);
    }

    // ── Database queries ──
    const supabase = getSupabase();
    let context = "";

    try {
      const [ojtResult, companyResult] = await Promise.all([
        supabase.from("ojt_posts").select("*").eq("status", "active").limit(50),
        supabase.from("companies").select("*").limit(50),
      ]);

      console.log('📊 OJT query:', { count: ojtResult.data?.length, error: ojtResult.error?.message });
      console.log('🏢 Company query:', { count: companyResult.data?.length, error: companyResult.error?.message });

      if (ojtResult.error) throw ojtResult.error;
      if (companyResult.error) throw companyResult.error;

      const ojtPosts: OJTPost[] = ojtResult.data ?? [];
      const companies: Company[] = companyResult.data ?? [];

      if (isAskingForAll) {
        context = `📋 USER REQUEST: Show ALL available OJT posts from ALL companies.\nProvide a comprehensive list. Do NOT ask for a location.`;
      } else if (detectedLocation && ojtPosts.length > 0) {
        const nearest = findNearestOJTs(detectedLocation, ojtPosts, companies, 5);

        if (nearest.length > 0) {
         context = [
  `📍 LOCATION: ${detectedLocation.display}`,
  ``,
  `📊 TOP ${nearest.length} NEAREST RESULTS — already pre-formatted. Return them in the SAME card format below:`,
  ``,
  nearest
    .slice(0, 2)
    .map((r) => {
      const lines = [
        `**${r.company?.name || "Company"}**`,
        `Location: ${r.locationName}`,
        `Distance: ${r.distance.toFixed(1)} km`,   // ← changed
      ];
      if (r.post.specialization || r.post.course)
        lines.push(`Skills: ${r.post.specialization || r.post.course}`);
      if (r.post.description)
        lines.push(`Description: ${r.post.description}`);
      if (r.company?.email || r.company?.phone)
        lines.push(`Contact: ${r.company?.email || r.company?.phone}`);
      return lines.join("\n");
    })
    .join("\n\n"),
].join("\n");
        } else {
          context = `📍 LOCATION: ${detectedLocation.display}\n\n⚠️ No OJT posts found with recognizable locations for this city.`;
        }
      } else if (!detectedLocation && !isAskingForAll) {
      context = `📍 LOCATION NOT DETECTED.\nPolitely ask the user which city they're in. Valid cities: Bacolod, Silay, Talisay, Bago, Murcia, Victorias, Cadiz, Sagay, Escalante, San Carlos, Kabankalan, Himamaylan, Sipalay, La Carlota, Binalbagan, Hinigaran, Isabela, Pontevedra, Pulupandan, San Enrique, Valladolid, Moises Padilla, La Castellana.\nDo NOT invent OJT posts. Output no cards.`;
      }

      if (ojtPosts.length > 0) {
        context += `\n\n--- ALL ACTIVE OJT POSTS (reference) ---\n${JSON.stringify(ojtPosts.slice(0, 10).map(sanitizePost), null, 2)}`;
      }
      if (companies.length > 0) {
        context += `\n\n--- COMPANIES (reference) ---\n${JSON.stringify(companies.slice(0, 10).map(sanitizeCompany), null, 2)}`;
      }
      if (!context) context = "No OJT posts or companies found in the database.";
    } catch (dbError) {
      console.error("DB error:", dbError);
      context = "Database is currently unavailable. Please try again later.";
    }

    // ── Groq completion ──
    const groq = getGroq();
    console.log('🤖 Calling Groq with model: openai/gpt-oss-120b');

       const completion = await groq.chat.completions.create({
      messages: [
     {
  role: "system",
  content: [
    `You are OJTly Mentor — an assistant helping students find OJT (On-the-Job Training) positions in Negros Occidental, Philippines.`,
    ``,
    `OUTPUT FORMAT (STRICT — the UI parser depends on this exact shape):`,
    `For EACH recommendation, output a block like this:`,
    ``,
    `**<Company Name>**`,
    `Location: <City>`,
   `Distance: <number with EXACTLY ONE decimal> km  (e.g., "3.0 km", "12.5 km" — NEVER "3 km" or "12 km")`,
    `Skills: <comma-separated skills>`,
    `Mode: <On-site | Remote | Hybrid>`,
    `Description: <one short line>`,
    ``,
    `Leave a blank line between cards. Wrap the company name in ** ** on its own line.`,
`Do NOT use markdown headings (#), do NOT prefix with "1." or "-".`,
`If a field has no data, omit the line entirely (don't write "N/A").`,
``,
`CRITICAL FOR FOLLOW-UP TURNS:`,
`- EVEN IF this is a follow-up question, you MUST output the strict card format above.`,
`- NEVER write conversational intros like "Here are...", "Sure!", "As I mentioned...", "OK, here are...".`,
`- NEVER compare to previous results. Treat each city request as standalone.`,
`- NEVER say "kilometers" or "kms" — always use "km" (e.g., "5.0 km", never "5 kilometers").`,
`- NEVER omit the Distance line, even if the post is in the same city as the user (then write "0.1 km").`,
    ``,
    `RULES:`,
    `- Suggest ONLY the top 2 nearest unless the user asks for all.`,
   `- ALWAYS include the Distance line in km.`,
`- The distance MUST have exactly one decimal. Write "3.0 km" or "12.5 km" — NEVER "3 km" or "12 km". Even whole numbers must show ".0".`,
    `- NEVER mention UUIDs, company_id, created_at, or technical IDs.`,
    `- If no location is detected, POLITELY ask which of these cities they're in: Bacolod, Silay, Talisay, Bago, Murcia, Victorias, Cadiz, Sagay, Escalante, San Carlos, Kabankalan, Himamaylan, Sipalay, La Carlota, Binalbagan, Hinigaran, Isabela, Pontevedra, Pulupandan, San Enrique, Valladolid, Moises Padilla, La Castellana.`,
    `- If the database is unavailable, say so honestly.`,
    ``,
    `CONTEXT:\n${context}`,
  ].join("\n"),
},
        ...safeMessages,
      ],
      model: "openai/gpt-oss-120b",
      max_tokens: 1500,
      // ✅ Hide reasoning content — GPT-OSS is a reasoning model
      // and would otherwise put output in `reasoning` field instead of `content`
      reasoning_format: "hidden",
    });

    // ✅ Get content from message — fall back if empty/null/undefined
    const message = completion.choices[0]?.message as any;
    const rawReply =
      message?.content ||                                    // primary: final answer
      message?.reasoning ||                                 // fallback: reasoning trace (rare)
      "";                                                   // last resort: empty

    // ✅ Final guard: if reply is empty/whitespace, send a friendly fallback
    const reply = (rawReply && rawReply.trim().length > 0)
      ? rawReply
      : "I couldn't generate a response. Please try rephrasing your question.";

    console.log('✅ Groq responded successfully, length:', reply.length);
    return NextResponse.json({ text: reply });
  } catch (error) {
    console.error("Chat API error:", error);

    let errorMessage = "Something went wrong. Please try again.";
    let statusCode = 500;

    if (error instanceof Error) {
      const groqErr = error as any;
      if (groqErr.status === 401) {
        errorMessage = "🔑 Groq API key is invalid. Check GROQ_API_KEY in .env.local";
        statusCode = 401;
      } else if (groqErr.status === 403) {
        errorMessage = "🚫 Groq blocked the request (account/IP). Try a different network.";
        statusCode = 403;
      } else if (groqErr.status === 429) {
        errorMessage = "⏳ Groq rate limit reached. Wait 60s and retry.";
        statusCode = 429;
      } else if (groqErr.status === 404 || error.message.includes("does not exist") || error.message.includes("decommissioned")) {
       errorMessage = `🤖 Model error: ${error.message}. Available models on your account: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b`;
        statusCode = 404;
      } else if (error.message.includes("Missing")) {
        errorMessage = "⚙️ " + error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: true, text: errorMessage },
      { status: statusCode }
    );
  }
}