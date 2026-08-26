import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 🚀 Menggunakan fallback aman agar lolos proses build / prerendering statis
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_SUPABASE_URL || 
    'https://placeholder-project.supabase.co';

  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_SUPABASE_ANON_KEY || 
    'placeholder-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // Memeriksa status user (Hanya jalankan jika bukan placeholder agar tidak error query)
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (e) {
    // Diabaikan saat build / jika kredensial masih placeholder
  }

  // Proteksi: Jika user belum login dan mencoba mengakses rute 'akun' atau 'donasi-saya',
  // arahkan mereka ke halaman login
  if (!user && (request.nextUrl.pathname.startsWith('/akun') || request.nextUrl.pathname.startsWith('/donasi-saya'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// Menentukan rute mana saja yang akan diproses oleh proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (callback)
     * - login (halaman login)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth|login).*)',
  ],
};