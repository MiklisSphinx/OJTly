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

// ✅ FIXED: OJTPost interface now matches your ACTUAL database schema
// DB columns: id, company_id, title, description, skills (_text array),
//             location_name, latitude, longitude, vacancies, work_type,
//             duration_hours, allowance_type, course_category, status,
//             created_at, is_featured, is_deleted, geofence_radius_m
interface OJTPost {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  skills: string[] | null;          // ✅ _text array
  location_name: string | null;     // ✅ was "location"
  latitude: number | null;          // ✅ NEW — actual GPS coord
  longitude: number | null;         // ✅ NEW — actual GPS coord
  vacancies: number | null;
  work_type: string | null;         // ✅ was "mode"
  duration_hours: number | null;    // ✅ was "hours"
  allowance_type: string | null;    // ✅ was "pay"
  course_category: string | null;   // ✅ was "course"
  status: string | null;
  created_at: string;
  is_featured: boolean | null;
  is_deleted: boolean | null;
  geofence_radius_m: number | null;
  [key: string]: unknown;
}

// ✅ FIXED: Company interface matches your ACTUAL DB
// DB columns: id, company_name, is_approved, created_at, email, contact_person,
//             phone, office_address, permit_url, user_id, location (jsonb!),
//             phone_number, status, sec_dti_url, bir_2303_url, industry,
//             logo_url, updated_at, embedding, name, is_deleted
interface Company {
  id: string;
  company_name: string | null;      // ✅ was "name"
  email: string | null;
  phone: string | null;
  phone_number: string | null;
  contact_person: string | null;
  office_address: string | null;
  location: unknown;                // ✅ jsonb — could be {city, address, lat, lng} or string
  city?: string;                    // optional, extracted from location jsonb
  industry: string | null;
  logo_url: string | null;
  status: string | null;
  user_id: string | null;
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

// ─── Lazy-initialized clients ──
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

// ✅ Resolves a city name from any text string
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

// ✅ NEW: Extract lat/lng/city from company.location jsonb
// Your companies.location is jsonb — could be {lat, lng, city, address} or just a string
function parseCompanyLocation(location: unknown): {
  lat?: number;
  lng?: number;
  city?: string;
  addressText?: string;
} {
  if (!location) return {};

  // If it's already an object (parsed jsonb)
  if (typeof location === "object" && !Array.isArray(location)) {
    const obj = location as Record<string, unknown>;
    const lat = typeof obj.lat === "number" ? obj.lat :
                typeof obj.latitude === "number" ? obj.latitude : undefined;
    const lng = typeof obj.lng === "number" ? obj.lng :
                typeof obj.longitude === "number" ? obj.longitude : undefined;
    const city = typeof obj.city === "string" ? obj.city :
                 typeof obj.town === "string" ? obj.town : undefined;
    const addressText = typeof obj.address === "string" ? obj.address :
                        typeof obj.text === "string" ? obj.text : undefined;
    return { lat, lng, city, addressText };
  }

  // If it's a string (some rows might have a string here)
  if (typeof location === "string") {
    return { addressText: location };
  }

  return {};
}

// ═══════════════════════════════════════════════════════════
// ✅ NEW: Find nearest city name from raw GPS coordinates
// Used when the client sends real GPS but no city name was detected in the query
// ═══════════════════════════════════════════════════════════
function findNearestCityName(lat: number, lng: number): string {
  let nearest = "Your Location";
  let minDist = Infinity;
  for (const key of Object.keys(CITY_COORDINATES)) {
    const c = CITY_COORDINATES[key];
    const dist = haversineDistance(lat, lng, c.lat, c.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = c.display;
    }
  }
  return nearest;
}

// ═══════════════════════════════════════════════════════════
// ✅ REWRITTEN findNearestOJTs — uses ACTUAL lat/lng on each post
// ═══════════════════════════════════════════════════════════
function findNearestOJTs(
  userLocation: CityCoords,
  posts: OJTPost[],
  companies: Company[],
  k = 5
): OJTWithDistance[] {
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const results: OJTWithDistance[] = [];

  console.log(`\n🔍 findNearestOJTs — user at ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
  console.log(`   Scanning ${posts.length} posts...`);

  for (const post of posts) {
    const company = companyMap.get(post.company_id);

    // ✅ Strategy 1: Use the post's OWN latitude/longitude (most accurate)
    let postLat: number | undefined = post.latitude ?? undefined;
    let postLng: number | undefined = post.longitude ?? undefined;
    let locationName: string = post.location_name || "";
    let coordSource = "post.latitude/longitude";

    // ✅ Strategy 2: If post has no lat/lng, try the company's location jsonb
    if ((postLat === undefined || postLng === undefined) && company) {
      const parsed = parseCompanyLocation(company.location);
      if (parsed.lat !== undefined && parsed.lng !== undefined) {
        postLat = parsed.lat;
        postLng = parsed.lng;
        coordSource = "company.location jsonb";
      }
      if (!locationName && parsed.city) locationName = parsed.city;
      if (!locationName && parsed.addressText) locationName = parsed.addressText;
      if (!locationName && company.office_address) locationName = company.office_address;
    }

    // ✅ Strategy 3: If still no lat/lng, try resolving the location_name text
    if (postLat === undefined || postLng === undefined) {
      const locationBlob = [
        post.location_name,
        company ? parseCompanyLocation(company.location).city : null,
        company ? parseCompanyLocation(company.location).addressText : null,
        company?.office_address,
      ].filter((v): v is string => typeof v === "string" && v.length > 0).join(", ");

      const coords = resolveLocation(locationBlob);
      if (coords) {
        postLat = coords.lat;
        postLng = coords.lng;
        coordSource = `text resolved (${locationBlob.slice(0, 40)})`;
        if (!locationName) locationName = coords.display;
      }
    }

    // Skip if we still couldn't get coordinates
    if (postLat === undefined || postLng === undefined) {
      console.log(`  ❌ SKIP "${post.title}" — no coordinates found (location_name="${post.location_name}")`);
      continue;
    }

    const rawDistance = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      postLat,
      postLng
    );

    const distance = Math.round(rawDistance * 10) / 10;

    // ✅ DEBUG: log every post with its coords source and computed distance
    console.log(`  📌 "${post.title}"`);
    console.log(`     coords: ${postLat.toFixed(5)}, ${postLng.toFixed(5)} (source: ${coordSource})`);
    console.log(`     distance: ${distance.toFixed(1)} km (raw: ${rawDistance.toFixed(4)})`);

    // ⚠️ Suspicious: post coords exactly match user GPS (distance = 0)
    if (distance === 0) {
      console.log(`     ⚠️ WARNING: distance is 0.0 km — post coords match user GPS exactly!`);
      console.log(`        This means the post's lat/lng in your DB = your current GPS location.`);
      console.log(`        Check the ojt_posts table — these posts may have been created with the company's GPS at your location.`);
    }

    // If we still don't have a friendly location name, resolve from coords
    if (!locationName) {
      const resolved = resolveLocation(`${postLat},${postLng}`);
      locationName = resolved?.display || `${postLat.toFixed(4)}, ${postLng.toFixed(4)}`;
    }

    results.push({
      post,
      company,
      distance,
      locationName,
    });
  }

  const sorted = results.sort((a, b) => a.distance - b.distance).slice(0, k);
  console.log(`   ✅ Returning ${sorted.length} nearest posts: distances = [${sorted.map(r => r.distance.toFixed(1) + "km").join(", ")}]\n`);
  return sorted;
}

function sanitizePost(post: OJTPost) {
  const { id, company_id, created_at, is_deleted, ...safe } = post;
  return safe;
}

function sanitizeCompany(company: Company) {
  const { id, created_at, updated_at, user_id, embedding, ...safe } = company;
  return safe;
}

// ─── Route Handler ───────────────────────────────────────
export async function POST(req: Request) {
  try {
    console.log('🔍 ENV CHECK:');
    console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? `✅ loaded (${process.env.GROQ_API_KEY.slice(0,12)}...)` : '❌ MISSING');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ loaded' : '❌ MISSING');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ loaded' : '❌ MISSING');

    const body = await req.json();
    const messages: unknown[] = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { text: "Please send a message to start chatting." },
        { status: 400 }
      );
    }

    const safeMessages: ChatCompletionMessageParam[] = messages
      .filter((m): m is { role: string; content: string } =>
        typeof m === "object" && m !== null && "role" in m && "content" in m
      )
      .map((m): ChatCompletionMessageParam => {
        const content = String(m.content);
        const role = m.role === "model" ? "assistant" : m.role;
        switch (role) {
          case "assistant": return { role: "assistant", content };
          case "system":    return { role: "system", content };
          default:          return { role: "user", content };
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

    if (typeof lastUserMessage === 'string' && /^(hi|hello|hey|yo|sup|what'?s?\s*up|kumusta)\??!*\s*$/i.test(lastUserMessage.trim())) {
      return NextResponse.json({
        text: "👋 Hi there! I'm your OJTly Mentor. I can help you find OJT opportunities in Negros Occidental. Just tell me your city and I'll find the nearest openings for you!",
      });
    }

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

    // ═══════════════════════════════════════════════════════════
    // ✅ GPS FIX: If the client sent real GPS coordinates (userLat/userLng),
    // use THOSE for distance calculations instead of the city center point.
    // This makes chatbot distances match the map (e.g., 17.1 km instead of 2.7 km).
    // ═══════════════════════════════════════════════════════════
    const userLat: unknown = body.userLat;
    const userLng: unknown = body.userLng;
    const hasRealGps =
      typeof userLat === "number" && !isNaN(userLat) &&
      typeof userLng === "number" && !isNaN(userLng) &&
      Math.abs(userLat) <= 90 && Math.abs(userLng) <= 180;

    // The "distanceOrigin" is the point we measure distances FROM.
    // - If user sent real GPS → use their actual location
    // - Otherwise → fall back to the detected city's center point (old behavior)
    let distanceOrigin: CityCoords | null = null;
    if (hasRealGps && detectedLocation) {
      // Use real GPS coords, but keep the city display name from detectedLocation
      // (so the card still says "Bacolod City" etc.)
      distanceOrigin = {
        lat: userLat as number,
        lng: userLng as number,
        display: detectedLocation.display,
      };
      console.log(`✅ Using REAL GPS for distance: ${distanceOrigin.lat.toFixed(5)}, ${distanceOrigin.lng.toFixed(5)} (searching ${detectedLocation.display} posts)`);
    } else {
      distanceOrigin = detectedLocation;
      if (hasRealGps) {
        console.log('⚠️ GPS provided but no detectedLocation — using GPS anyway');
        // Find nearest city name for display
        const nearestCityName = findNearestCityName(userLat as number, userLng as number);
        distanceOrigin = {
          lat: userLat as number,
          lng: userLng as number,
          display: nearestCityName,
        };
      } else {
        console.log('ℹ️ No GPS provided — using city center coords (may be inaccurate vs map)');
      }
    }

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
      } else if (distanceOrigin && ojtPosts.length > 0) {
        // ✅ CITY FILTER: When searching a specific city, only show posts whose
        // location_name contains that city name. This prevents "Bacolod OJTs"
        // from returning Talisay/Silay posts just because they're geographically
        // closer to the user's GPS.
        let cityFilteredPosts = ojtPosts;
        if (detectedLocation) {
          const cityNameLower = detectedLocation.display.toLowerCase();
          const cityNameNoCity = cityNameLower.replace(/\bcity\b/g, "").trim();

          cityFilteredPosts = ojtPosts.filter((p) => {
            // Check post.location_name
            const postLocLower = (p.location_name || "").toLowerCase();
            if (!postLocLower) return false;

            // Match "bacolod city" in "Bacolod City" or just "bacolod" in "Bacolod"
            return postLocLower.includes(cityNameLower) ||
                   (cityNameNoCity.length >= 4 && postLocLower.includes(cityNameNoCity));
          });

          console.log(`🏙️ City filter: ${ojtPosts.length} total → ${cityFilteredPosts.length} posts for "${detectedLocation.display}"`);
          console.log(`   Matched posts: ${cityFilteredPosts.map(p => `"${p.title}" (${p.location_name})`).join(", ")}`);

          // ✅ FALLBACK: If no posts match the city name exactly, use ALL posts
          // (some posts might have the city in company.location instead)
          if (cityFilteredPosts.length === 0) {
            console.log(`   ⚠️ No posts matched by location_name — falling back to ALL posts`);
            cityFilteredPosts = ojtPosts;
          }
        }

        // ✅ Use distanceOrigin (real GPS if available, else city center)
        // But FILTER posts by the detectedLocation's city (so "Bacolod OJTs" only shows Bacolod posts)
        // while computing DISTANCE from the user's real GPS.
        const nearest = findNearestOJTs(distanceOrigin, cityFilteredPosts, companies, 5);
        console.log(`📍 Found ${nearest.length} nearest posts for ${distanceOrigin.display} (origin: ${hasRealGps ? 'REAL GPS' : 'city center'})`);

        if (nearest.length > 0) {
          context = [
            `📍 LOCATION: ${distanceOrigin.display}`,
            ``,
            `📊 TOP ${nearest.length} NEAREST RESULTS — already pre-formatted. Return them in the SAME card format below:`,
            ``,
            nearest
              .slice(0, 2)
              .map((r) => {
                // ✅ Use company_name (not name)
                const companyName = r.company?.company_name || r.company?.name || "Company";

                // ✅ Skills is a _text array — join it properly
                const skillsArr = Array.isArray(r.post.skills) ? r.post.skills : null;
                const skillsStr = skillsArr && skillsArr.length > 0
                  ? skillsArr.filter((s): s is string => typeof s === "string" && s.trim().length > 0).join(", ")
                  : null;

                const lines = [
                  `**${companyName}**`,
                  `Location: ${r.locationName}`,
                  // ✅ Use the REAL distance — could be 0.0 km if same spot, or 5.3 km, etc.
                  `Distance: ${r.distance.toFixed(1)} km`,
                ];

                // ✅ Skills (array, joined)
                if (skillsStr) lines.push(`Skills: ${skillsStr}`);
                // ✅ Use course_category (not course)
                if (r.post.course_category) lines.push(`Course: ${r.post.course_category}`);
                // ✅ Use work_type (not mode)
                if (r.post.work_type) lines.push(`Mode: ${r.post.work_type}`);
                if (r.post.description) lines.push(`Description: ${r.post.description}`);
                // ✅ Use duration_hours
                if (r.post.duration_hours) lines.push(`Duration: ${r.post.duration_hours} hours`);
                // ✅ Use allowance_type
                if (r.post.allowance_type) lines.push(`Allowance: ${r.post.allowance_type}`);
                if (r.post.vacancies) lines.push(`Vacancies: ${r.post.vacancies}`);
                if (r.company?.email || r.company?.phone || r.company?.phone_number)
                  lines.push(`Contact: ${r.company?.email || r.company?.phone || r.company?.phone_number}`);

                return lines.join("\n");
              })
              .join("\n\n"),
          ].join("\n");
        } else {
          context = `📍 LOCATION: ${distanceOrigin.display}\n\n⚠️ No OJT posts found with recognizable locations for this city.`;
        }
      } else if (!detectedLocation && !isAskingForAll) {
        context = `📍 LOCATION NOT DETECTED.\nPolitely ask the user which city they're in. Valid cities: Bacolod, Silay, or Talisay.\nDo NOT invent OJT posts. Output no cards.`;
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
            // ✅ MINIMAL KM FIX #1: added "0.0 km" as a valid example
            `Distance: <number with EXACTLY ONE decimal> km  (e.g., "0.0 km", "3.0 km", "12.5 km" — NEVER "3 km" or "12 km")`,
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
            // ✅ MINIMAL KM FIX #2: removed "(then write "0.1 km")" — that was the bug
            `- NEVER omit the Distance line. ALWAYS copy the EXACT distance value from the CONTEXT above (e.g., if context says "Distance: 0.0 km" → output "0.0 km"; if it says "Distance: 5.3 km" → output "5.3 km"). 0.0 km means the post is at the same location as the user — that is CORRECT, do NOT change it.`,
            `- NEVER substitute "0.1 km" or any other invented value for the distance.`,
            ``,
            `RULES:`,
            `- Suggest ONLY the top 2 nearest unless the user asks for all.`,
            `- ALWAYS include the Distance line in km using the EXACT value from CONTEXT.`,
            `- The distance MUST have exactly one decimal. Write "0.0 km", "3.0 km", or "12.5 km" — NEVER "0 km", "3 km", or "12 km". Even whole numbers must show ".0".`,
            `- NEVER mention UUIDs, company_id, created_at, or technical IDs.`,
            `- If no location is detected, POLITELY ask which city they're in: Bacolod, Silay, or Talisay.`,
            `- If the database is unavailable, say so honestly.`,
            ``,
            `CONTEXT:\n${context}`,
          ].join("\n"),
        },
        ...safeMessages,
      ],
      model: "openai/gpt-oss-120b",
      max_tokens: 1500,
      reasoning_format: "hidden",
    });

    const message = completion.choices[0]?.message as any;
    const rawReply =
      message?.content ||
      message?.reasoning ||
      "";

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
        errorMessage = `🤖 Model error: ${error.message}. Available models on your account: openai/gpt-oss-120b, openai/gpt-oss-20b`;
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
