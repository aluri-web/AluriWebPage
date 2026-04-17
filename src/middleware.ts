import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ===============================================
  // RUTAS EXCLUIDAS DEL MIDDLEWARE
  // ===============================================
  // Las rutas de autenticación NO deben ser interceptadas
  const isAuthRoute = pathname.startsWith('/auth/')
  if (isAuthRoute) {
    // Permitir que las rutas de auth funcionen sin interferencia
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // ===============================================
  // ACTUALIZAR SESIÓN DE SUPABASE
  // ===============================================
  const { supabase, user, supabaseResponse } = await updateSession(request)

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
  // CASO 2: Usuario CON sesión -> validar must_change_password y rol
  // ===============================================
  // Si debe cambiar contraseña, bloquear todo excepto /change-password
  const mustChangePassword = (user?.app_metadata as Record<string, unknown> | undefined)?.must_change_password
  if (user && mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', request.url))
  }

  // Si no debe cambiar, no puede estar en /change-password
  if (user && !mustChangePassword && pathname === '/change-password') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

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
