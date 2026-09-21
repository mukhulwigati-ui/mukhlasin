// proxy.ts

import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

// ============================================================================
// TYPE COOKIE YANG AKAN DIKIRIM KE BROWSER
// ============================================================================

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

// ============================================================================
// HELPER: PASANG COOKIE SUPABASE KE RESPONSE
// ============================================================================

function applyCookies(
  response: NextResponse,
  cookies: PendingCookie[]
) {
  cookies.forEach(
    ({
      name,
      value,
      options,
    }) => {
      response.cookies.set(
        name,
        value,
        options
      );
    }
  );

  return response;
}

// ============================================================================
// NEXT.JS 16 PROXY
// ============================================================================

export async function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  // ==========================================================================
  // 1. ENV SUPABASE
  // ==========================================================================

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ==========================================================================
  // 2. RESPONSE DASAR
  // ==========================================================================

  let response =
    NextResponse.next({
      request,
    });

  // ==========================================================================
  // 3. JANGAN PAKAI PLACEHOLDER URL / KEY
  // ==========================================================================

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    console.error(
      "[PROXY] Environment Supabase belum lengkap."
    );

    /**
     * Jangan mencoba menghubungi:
     *
     * placeholder-project.supabase.co
     *
     * karena itu justru menyebabkan perilaku auth
     * yang membingungkan.
     */
    return response;
  }

  // ==========================================================================
  // 4. PENAMPUNG COOKIE BARU
  // ==========================================================================

  const pendingCookies:
    PendingCookie[] = [];

  // ==========================================================================
  // 5. SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          // ================================================================
          // BACA SEMUA COOKIE
          // ================================================================

          getAll() {
            return request.cookies.getAll();
          },

          // ================================================================
          // UPDATE COOKIE
          // ================================================================

          setAll(
            cookiesToSet
          ) {
            // --------------------------------------------------------------
            // Simpan untuk response akhir / redirect
            // --------------------------------------------------------------

            pendingCookies.splice(
              0,
              pendingCookies.length,
              ...cookiesToSet
            );

            // --------------------------------------------------------------
            // Update request
            // --------------------------------------------------------------

            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            // --------------------------------------------------------------
            // Response baru berdasarkan request terbaru
            // --------------------------------------------------------------

            response =
              NextResponse.next({
                request,
              });

            // --------------------------------------------------------------
            // Kirim cookie terbaru ke browser
            // --------------------------------------------------------------

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  // ==========================================================================
  // 6. CEK USER
  // ==========================================================================

  let user = null;

  try {
    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (error) {
      /**
       * Tidak perlu dianggap fatal.
       *
       * Kalau memang belum login,
       * user akan null.
       */
      console.warn(
        "[PROXY] Supabase auth:",
        error.message
      );
    }

    user =
      data?.user ?? null;
  } catch (
    error
  ) {
    console.error(
      "[PROXY] getUser error:",
      error
    );

    user = null;
  }

  // ==========================================================================
  // 7. ROUTE LOGIN
  // ==========================================================================

  const isLoginPage =
    pathname === "/login";

  // ==========================================================================
  // 8. ROUTE YANG WAJIB LOGIN
  // ==========================================================================

  const protectedRoutes = [
    "/akun",
    "/donasi-saya",
    "/pengaturan",
    "/kuitansi",
    "/favorit",
    "/referral",
  ];

  const isProtectedRoute =
    protectedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  // ==========================================================================
  // 9. SUDAH LOGIN TAPI MASIH MEMBUKA /login
  // ==========================================================================

  if (
    user &&
    isLoginPage
  ) {
    const redirectUrl =
      request.nextUrl.clone();

    redirectUrl.pathname =
      "/akun";

    redirectUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(
        redirectUrl
      );

    /**
     * Sangat penting:
     *
     * Jika getUser() tadi memperbarui token,
     * cookie baru harus ikut response redirect.
     */
    return applyCookies(
      redirectResponse,
      pendingCookies
    );
  }

  // ==========================================================================
  // 10. BELUM LOGIN TAPI MASUK HALAMAN PRIVATE
  // ==========================================================================

  if (
    !user &&
    isProtectedRoute
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    loginUrl.search = "";

    // ========================================================================
    // SIMPAN TUJUAN ASLI
    // ========================================================================

    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );

    const redirectResponse =
      NextResponse.redirect(
        loginUrl
      );

    return applyCookies(
      redirectResponse,
      pendingCookies
    );
  }

  // ==========================================================================
  // 11. NORMAL RESPONSE
  // ==========================================================================

  return response;
}

// ============================================================================
// MATCHER
// ============================================================================
//
// Sengaja hanya menjalankan auth proxy pada route yang membutuhkan.
//
// /auth/callback TIDAK perlu diproses proxy,
// karena callback sudah menjalankan exchangeCodeForSession() sendiri.
//
// ============================================================================

export const config = {
  matcher: [
    "/login",

    "/akun",
    "/akun/:path*",

    "/donasi-saya",
    "/donasi-saya/:path*",

    "/pengaturan",
    "/pengaturan/:path*",

    "/kuitansi",
    "/kuitansi/:path*",

    "/favorit",
    "/favorit/:path*",

    "/referral",
    "/referral/:path*",
  ],
};