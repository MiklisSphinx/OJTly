import { createBrowserClient } from '@supabase/ssr'

// This variable lives outside the function, so it stays alive 
// even when you navigate between pages.
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  // If we already have a client, return it immediately! 
  // No need to create a new one that starts "empty."
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return client;
}