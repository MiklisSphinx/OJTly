import { createClient } from '@supabase/supabase-js';
console.log("Checking URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This check prevents the "supabaseUrl is required" crash
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'MISSING SUPABASE KEYS: Check your .env.local file and restart your terminal.'
  );
}

// Initialize the client only if keys exist, otherwise use an empty string to satisfy the types
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);