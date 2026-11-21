// utils/supabase/client.ts   (DESTINATION: src/utils/supabase/client.ts)
//
// SINGLE shared browser Supabase client — singleton cached on globalThis.
//
// Why this exists:
//   The project had TWO supabase client factories creating separate GoTrueClient
//   instances under the same storage key:
//     - @/utils/supabase/client  -> createClient()   (admin_main, company_main)
//     - @/lib/supabase           -> supabase          (MoaGenerator, CompanyMoaSection)
//   That triggered the "Multiple GoTrueClient instances detected" warning AND let
//   the two clients drift on session state (the real reason the company dashboard
//   sometimes couldn't see the admin-issued MOA — its getSession() returned null
//   even though the other client was signed in).
//
// This file is now the ONLY place a browser Supabase client is constructed.
// lib/supabase.ts re-exports from here, so every import ends up on the same
// GoTrueClient instance. The warning disappears and sessions stay consistent.

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing — check .env.local'
  )
}

type SupabaseBrowser = ReturnType<typeof createBrowserClient>

const globalForSupabase = globalThis as unknown as { __ojtlySupabase?: SupabaseBrowser }

export const supabaseBrowser: SupabaseBrowser =
  globalForSupabase.__ojtlySupabase ?? createBrowserClient(supabaseUrl, supabaseAnonKey)

// Cache on globalThis so Next.js hot-reload does not rebuild the client.
if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__ojtlySupabase = supabaseBrowser
}

// Backwards-compatible factory used by admin_main / company_main.
// Now returns the SAME singleton every call — no more new GoTrueClient per render.
export function createClient(): SupabaseBrowser {
  return supabaseBrowser
}
