import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers }
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },

        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            path: '/',
            ...options
          })
        },

        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            path: '/',
            ...options
          })
        }
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  )

  return { supabase, response }
}

// =========================
// ROUTE HELPERS
// =========================

const isCompanyAuth = (url: string) => url.startsWith('/company/')
const isStudentAuth = (url: string) => url.startsWith('/student/')
const isAdminAuth = (url: string) => url.startsWith('/admin/')

const isCompanyDashboard = (url: string) => url.startsWith('/company_')

const isStudentDashboard = (url: string) =>
  url.startsWith('/student_') ||
  url === '/studentai' ||
  url === '/map' // ✅ IMPORTANT: keep map included

const isAdminDashboard = (url: string) => url.startsWith('/admin_')

const isCompanyArea = (url: string) =>
  isCompanyAuth(url) || isCompanyDashboard(url)

const isStudentArea = (url: string) =>
  isStudentAuth(url) || isStudentDashboard(url)

const isAdminArea = (url: string) =>
  isAdminAuth(url) || isAdminDashboard(url)

// =========================
// MIDDLEWARE
// =========================

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  const url = request.nextUrl.pathname

  // 🔥 ALWAYS use getUser (most stable in SSR middleware)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // =========================
  // PUBLIC ROUTES
  // =========================

  const isRoot = url === '/'

  const isGenericAuth =
    url.startsWith('/login') ||
    url.startsWith('/auth/callback') ||
    url.startsWith('/auth/')

  const isAuthPath =
    isCompanyAuth(url) ||
    isStudentAuth(url) ||
    isAdminAuth(url)

  const isStaticFile = /\.(jpg|jpeg|png|gif|svg|ico|json)$/.test(url)

  const isPublic =
    isRoot || isGenericAuth || isAuthPath || isStaticFile

  if (isPublic) return response

  // =========================
  // NO USER → LOGIN REDIRECT
  // =========================

  if (!user) {
    let loginUrl = '/student/login'

    if (isCompanyArea(url)) loginUrl = '/company/login'
    else if (isAdminArea(url)) loginUrl = '/admin/login'

    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  // =========================
  // GET ROLE
  // =========================

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role?.toLowerCase()

  // =========================
  // ADMIN RULES
  // =========================

  if (userRole === 'admin') {
    if (!isAdminDashboard(url)) {
      return NextResponse.redirect(
        new URL('/admin_main', request.url)
      )
    }
    return response
  }

  // =========================
  // COMPANY RULES
  // =========================

  if (userRole === 'company') {
    if (!isCompanyDashboard(url)) {
      return NextResponse.redirect(
        new URL('/company_main', request.url)
      )
    }
    return response
  }

  // =========================
  // STUDENT RULES
  // =========================

  if (userRole === 'student' || userRole === 'user') {
    if (!isStudentDashboard(url)) {
      return NextResponse.redirect(
        new URL('/student_main', request.url)
      )
    }
    return response
  }

  // =========================
  // FALLBACK
  // =========================

  return NextResponse.redirect(
    new URL('/student/login', request.url)
  )
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}