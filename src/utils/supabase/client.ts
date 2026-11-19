import { createBrowserClient } from '@supabase/ssr'

// Singleton — every component shares ONE client instance
// This prevents the "lock stolen" error when multiple components
// call getUser() / getSession() at the same time.
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}