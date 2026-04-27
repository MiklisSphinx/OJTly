// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/map';

  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  // 1. Create the response object FIRST
  const response = NextResponse.redirect(`${url.origin}${next}`);

  // 2. Initialize Supabase BUT link it to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          // Magic part: sets the cookie on the REDIRECT response
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Exchange the code and trigger the 'set' calls above
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth error:', error.message);
    // If error, redirect to error page with cookies still attached
    return NextResponse.redirect(
      `${url.origin}/auth/auth-code-error?error=${error.message}`
    );
  }

  // 4. Return the response that now has the cookies glued to it
  return response;
}