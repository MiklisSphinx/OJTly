// src/app/api/chat/route.ts
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!supabaseUrl || !supabaseKey || !groqKey) console.error("❌ MISSING API KEYS");

const supabase = createClient(supabaseUrl || "", supabaseKey || "");
const groq = new Groq({ apiKey: groqKey || "" });

const CITY_COORDINATES: Record<string, { lat: number; lng: number; display: string }> = {
  "bacolod": { lat: 10.6317, lng: 122.9531, display: "Bacolod City" },
  "bacolod city": { lat: 10.6317, lng: 122.9531, display: "Bacolod City" },
  "talisay": { lat: 10.7586, lng: 122.9714, display: "Talisay City" },
  "talisay city": { lat: 10.7586, lng: 122.9714, display: "Talisay City" },
  "silay": { lat: 10.8064, lng: 122.9739, display: "Silay City" },
  "silay city": { lat: 10.8064, lng: 122.9739, display: "Silay City" },
  "bago": { lat: 10.5333, lng: 122.9333, display: "Bago City" },
  "bago city": { lat: 10.5333, lng: 122.9333, display: "Bago City" },
  "murcia": { lat: 10.6000, lng: 123.0333, display: "Murcia" },
  "victorias": { lat: 10.9167, lng: 123.0667, display: "Victorias City" },
  "victorias city": { lat: 10.9167, lng: 123.0667, display: "Victorias City" },
  "cadiz": { lat: 10.9500, lng: 123.3000, display: "Cadiz City" },
  "cadiz city": { lat: 10.9500, lng: 123.3000, display: "Cadiz City" },
  "sagay": { lat: 10.9333, lng: 123.4333, display: "Sagay City" },
  "sagay city": { lat: 10.9333, lng: 123.4333, display: "Sagay City" },
  "escalante": { lat: 10.8333, lng: 123.5000, display: "Escalante City" },
  "escalante city": { lat: 10.8333, lng: 123.5000, display: "Escalante City" },
  "san carlos": { lat: 10.9333, lng: 123.4167, display: "San Carlos City" },
  "san carlos city": { lat: 10.9333, lng: 123.4167, display: "San Carlos City" },
  "kabankalan": { lat: 9.9833, lng: 122.8167, display: "Kabankalan City" },
  "kabankalan city": { lat: 9.9833, lng: 122.8167, display: "Kabankalan City" },
  "himamaylan": { lat: 10.0833, lng: 122.8667, display: "Himamaylan City" },
  "himamaylan city": { lat: 10.0833, lng: 122.8667, display: "Himamaylan City" },
  "sipalay": { lat: 9.7500, lng: 122.4667, display: "Sipalay City" },
  "sipalay city": { lat: 9.7500, lng: 122.4667, display: "Sipalay City" },
  "la carlota": { lat: 10.4000, lng: 122.9167, display: "La Carlota City" },
  "la carlota city": { lat: 10.4000, lng: 122.9167, display: "La Carlota City" },
  "binalbagan": { lat: 10.1833, lng: 122.8333, display: "Binalbagan" },
  "hinigaran": { lat: 10.2667, lng: 122.8333, display: "Hinigaran" },
  "isabela": { lat: 10.2000, lng: 122.9500, display: "Isabela" },
  "pontevedra": { lat: 10.3167, lng: 122.9000, display: "Pontevedra" },
  "pulupandan": { lat: 10.5167, lng: 122.8500, display: "Pulupandan" },
  "san enrique": { lat: 10.4667, lng: 122.8667, display: "San Enrique" },
  "valladolid": { lat: 10.4167, lng: 122.8667, display: "Valladolid" },
  "moises padilla": { lat: 10.2333, lng: 122.9000, display: "Moises Padilla" },
  "la castellana": { lat: 10.3167, lng: 122.9667, display: "La Castellana" },
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg: number): number { return deg * (Math.PI / 180); }

function extractLocation(message: string): { lat: number; lng: number; display: string } | null {
  const lowerMessage = message.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (new RegExp(`\\b${key.replace(/\s+/g, "\\s+")}\\b`, "i").test(lowerMessage)) return coords;
  }
  return null;
}

interface OJTPostWithDistance { post: any; company: any; distance: number; locationName: string; }

function findNearestOJTs(userLocation: { lat: number; lng: number; display: string }, posts: any[], companies: any[], k: number = 5): OJTPostWithDistance[] {
  const results: OJTPostWithDistance[] = [];
  
  // Create a base word from the requested city to handle "Silay" vs "Silay City"
  const targetCityBase = userLocation.display.toLowerCase().replace("city", "").trim();

  for (const post of posts) {
    const company = companies.find((c: any) => c.id === post.company_id);
    let locationName = post.location || post.city || company?.location || company?.city || "";
    let postCoords: { lat: number; lng: number } | null = null;
    
    if (locationName) {
      const lowerLocation = locationName.toLowerCase().trim();
      const postBase = lowerLocation.replace("city", "").trim();
      
      for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
        const keyBase = key.replace("city", "").trim();
        // THE FIX: Check if the stripped bases match (e.g. "silay" matches "silay")
        if (lowerLocation.includes(key) || key.includes(lowerLocation) || postBase === keyBase || postBase.includes(keyBase)) {
          postCoords = { lat: coords.lat, lng: coords.lng };
          locationName = coords.display;
          break;
        }
      }
    }
    if (!postCoords) continue;
    
    results.push({ 
      post, company, 
      distance: Math.round(haversineDistance(userLocation.lat, userLocation.lng, postCoords.lat, postCoords.lng) * 10) / 10, 
      locationName 
    });
  }
  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, k);
}

function sanitizePost(post: any) { const { id, company_id, created_at, updated_at, ...safe } = post; return safe; }
function sanitizeCompany(company: any) { const { id, created_at, updated_at, ...safe } = company; return safe; }

export async function POST(req: Request) {
  try {
    const { messages, explicitLocation } = await req.json();
    const safeMessages = messages.map((m: any) => ({ role: m.role === "model" ? "assistant" : m.role, content: m.content }));
    const lastUserMessage = safeMessages.filter((m: any) => m.role === "user").pop()?.content || "";

    if (/^(hi|hello|hey|yo|sup|what'?s? up|kumusta)\??!*\s*$/i.test(lastUserMessage.trim())) {
      return NextResponse.json({ text: "hi what up" });
    }

    // Use explicit location from button if available, otherwise fallback to text extraction
    const isAskingForAll = explicitLocation === "all" || /\b(all|every)\b.*\b(company|available|ojt|post|opening)\b/i.test(lastUserMessage);
    let detectedLocation = explicitLocation && explicitLocation !== "all" 
      ? (CITY_COORDINATES[explicitLocation.toLowerCase()] || extractLocation(lastUserMessage))
      : extractLocation(lastUserMessage);

    let context = "";

    try {
      const { data: ojtPosts, error: ojtError } = await supabase.from("ojt_posts").select("*").eq("status", "active").limit(50);
      if (ojtError) throw ojtError;
      const { data: companies, error: companyError } = await supabase.from("companies").select("*").limit(50);
      if (companyError) throw companyError;

      let locationInfo = "";

      if (isAskingForAll) {
        locationInfo = `📋 USER REQUEST: Show ALL available OJT posts from ALL companies.\nProvide a comprehensive list of everything available in the database. Do NOT ask for a location.`;
      } else if (detectedLocation && ojtPosts && ojtPosts.length > 0) {
        const nearestResults = findNearestOJTs({ ...detectedLocation }, ojtPosts, companies || [], 5);
        if (nearestResults.length > 0) {
          locationInfo = `📍 LOCATION: ${detectedLocation.display}\n\n📊 RESULTS:\n ${nearestResults.map((r, i) => `${i + 1}. ${r.post.title || "OJT Position"} at ${r.company?.name || "Company"} - ${r.locationName} (${r.distance} km away)`).join("\n")}\n\n📋 TOP DETAILS:\n ${nearestResults.slice(0, 2).map((r) => `---\n📌 ${r.post.title || "OJT Position"}\n🏢 ${r.company?.name || "N/A"}\n📍 ${r.locationName} - ${r.distance} km away\n📋 ${r.post.description || "No description"}\n💼 ${r.post.specialization || r.post.course || "Any course"}\n📞 Contact: ${r.company?.email || r.company?.phone || "N/A"}\n---`).join("")}`;
        } else {
          locationInfo = `📍 LOCATION: ${detectedLocation.display}\n\n⚠️ No OJT posts found with recognizable locations in the database for this specific city.`;
        }
      } else if (!detectedLocation) {
        locationInfo = `📍 LOCATION NOT DETECTED.\nAsk where they are located.`;
      }

      context = locationInfo;
      if (ojtPosts && ojtPosts.length > 0) context += `\n\n--- ALL AVAILABLE OJT POSTS (for reference) ---\n${JSON.stringify(ojtPosts.slice(0, 10).map(sanitizePost), null, 2)}`;
      if (companies && companies.length > 0) context += `\n\n--- COMPANIES (for reference) ---\n${JSON.stringify(companies.slice(0, 10).map(sanitizeCompany), null, 2)}`;
      if (!context) context = "No OJT posts or companies found in the database.";
    } catch (dbError: any) {
      context = "Database unreachable.";
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are the OJTly Mentor. Find an OJT in Negros Occidental.\n\nRULES:\n- Be concise. Use bullet points.\n- ALWAYS mention distance (e.g., "3.5 km away").\n- Suggest ONLY the top 2 nearest.\n- NEVER mention technical IDs.\n- If no location detected, POLITELY ask.\n\nCONTEXT:\n ${context}` },
        ...safeMessages,
      ],
      model: "llama-3.1-8b-instant",
      max_tokens: 500,
    });

    return NextResponse.json({ text: completion.choices[0]?.message?.content });
  } catch (error: any) {
    return NextResponse.json({ text: "AI connection failed." }, { status: 500 });
  }
}