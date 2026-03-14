import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  const directives = [
    "default-src 'self'",
    // Nonce is primary; 'unsafe-inline' is fallback for older browsers (ignored when nonce present in CSP2+)
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.s3.amazonaws.com https://*.s3.us-east-1.amazonaws.com https://lh3.googleusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://www.google-analytics.com",
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  return directives.join('; ')
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ===============================================
  // GENERATE CSP NONCE
  // ===============================================
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCspHeader(nonce)

  // Set nonce AND CSP on request headers so Next.js can extract the nonce
  // and inject it into its inline <script> tags during rendering
  request.headers.set('x-nonce', nonce)
  request.headers.set('Content-Security-Policy', cspHeader)

  // ===============================================
  // RUTAS EXCLUIDAS DEL MIDDLEWARE
  // ===============================================
  // Las rutas de autenticación NO deben ser interceptadas
  const isAuthRoute = pathname.startsWith('/auth/')
  if (isAuthRoute) {
    // Permitir que las rutas de auth funcionen sin interferencia
    const { supabaseResponse } = await updateSession(request)
    supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
    return supabaseResponse
  }

  // ===============================================
  // ACTUALIZAR SESIÓN DE SUPABASE
  // ===============================================
  const { supabase, user, supabaseResponse } = await updateSession(request)

  // ===============================================
  // SET CSP ON RESPONSE
  // ===============================================
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  // ===============================================
  // DEFINIR RUTAS PROTEGIDAS (WHITELIST)
  // ===============================================
  // Una ruta es protegida SOLO si comienza con /dashboard
  const isProtectedRoute = pathname.startsWith('/dashboard')

  // ===============================================
  // CASO 1: Usuario SIN sesión intenta acceder a ruta protegida
  // ===============================================
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // ===============================================
  // CASO 2: Usuario CON sesión en ruta protegida -> validar rol
  // ===============================================
  if (isProtectedRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Solo redirigir si hay un rol válido y el usuario está en un dashboard incorrecto
    if (role) {
      const isExactDashboard = pathname === '/dashboard'

      // Si está en /dashboard exacto, redirigir a su dashboard correspondiente
      if (isExactDashboard) {
        return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
      }

      // Demo: puede acceder a /dashboard/demo/* solamente
      if (role === 'demo') {
        if (!pathname.startsWith('/dashboard/demo')) {
          return NextResponse.redirect(new URL('/dashboard/demo', request.url))
        }
      } else {
        // Otros roles: solo su dashboard correspondiente
        const isInCorrectDashboard = pathname.startsWith(`/dashboard/${role}`)
        if (!isInCorrectDashboard) {
          return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
        }
      }
    }
  }

  // ===============================================
  // CASO 3: Rutas públicas (/, /login, etc.)
  // ===============================================
  // NO REDIRIGIR. El usuario puede estar logueado y navegar libremente
  // por páginas públicas como la landing page.

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
