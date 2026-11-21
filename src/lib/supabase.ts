// lib/supabase.ts   (DESTINATION: src/lib/supabase.ts)
//
// Re-export the SINGLE shared browser Supabase client from utils/supabase/client.
// After this, both import styles resolve to the SAME GoTrueClient instance:
//
//   import { supabase } from '@/lib/supabase'                 // MoaGenerator, CompanyMoaSection
//   import { createClient } from '@/utils/supabase/client'    // admin_main, company_main
//
// No more "Multiple GoTrueClient instances detected" warning, and the session
// can no longer drift between two clients (which was the root cause of the
// company dashboard not seeing the admin-issued MOA).

export { supabaseBrowser as supabase, createClient } from '@/utils/supabase/client'