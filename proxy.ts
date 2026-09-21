// proxy.ts

import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

// ============================================================================
// COPY COOKIE + CACHE HEADER KE RESPONSE BARU
// ============================================================================

function copySupabaseState(
  source: NextResponse,
  target: NextResponse
) {
  // Copy semua cookie Supabase
  source.cookies
    .getAll()
    .forEach((cookie) => {
      target.cookies.set(cookie);
    });

  // Copy header penting dari Supabase SSR
  [
    "cache-control",
    "expires",
    "pragma",
  ].forEach((headerName) => {
    const value =
      source.headers.get(
        headerName
      );

    if (value) {
      target.headers.set(
        headerName,
        value
      );
    }
  });

  return target;
}

// ============================================================================
// NEXT.JS 16 PROXY
// ============================================================================

export async function proxy(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  // ==========================================================================
  // ENV
  // ==========================================================================

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    console.error(
      "[PROXY] Supabase environment belum lengkap."
    );

    return supabaseResponse;
  }

  // ==========================================================================
  // SUPABASE CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet,
            headers?: Record<
              string,
              string
            >
          ) {
            // ================================================================
            // UPDATE COOKIE REQUEST
            // ================================================================

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

            // ================================================================
            // BUAT RESPONSE BARU
            // ================================================================

            supabaseResponse =
              NextResponse.next({
                request,
              });

            // ================================================================
            // COOKIE KE BROWSER
            // ================================================================

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );

            // ================================================================
            // CACHE HEADERS DARI SUPABASE SSR
            // ================================================================

            if (headers) {
              Object.entries(
                headers
              ).forEach(
                ([
                  key,
                  value,
                ]) => {
                  supabaseResponse.headers.set(
                    key,
                    value
                  );
                }
              );
            }
          },
        },
      }
    );

  // ==========================================================================
  // PENTING:
  // Jangan jalankan kode lain antara createServerClient dan getUser()
  // ==========================================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  // ==========================================================================
  // PATH
  // ==========================================================================

  const pathname =
    request.nextUrl.pathname;

  // ==========================================================================
  // CALLBACK AUTH HARUS DIBIARKAN
  // ==========================================================================

  if (
    pathname.startsWith(
      "/auth/"
    )
  ) {
    return supabaseResponse;
  }

  // ==========================================================================
  // PROTECTED ROUTES
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
  // SUDAH LOGIN TAPI MEMBUKA LOGIN
  // ==========================================================================

  if (
    user &&
    pathname === "/login"
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/akun";

    url.search = "";

    const redirectResponse =
      NextResponse.redirect(
        url
      );

    return copySupabaseState(
      supabaseResponse,
      redirectResponse
    );
  }

  // ==========================================================================
  // BELUM LOGIN MEMBUKA PRIVATE PAGE
  // ==========================================================================

  if (
    !user &&
    isProtectedRoute
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/login";

    url.search = "";

    url.searchParams.set(
      "next",
      pathname
    );

    const redirectResponse =
      NextResponse.redirect(
        url
      );

    return copySupabaseState(
      supabaseResponse,
      redirectResponse
    );
  }

  // ==========================================================================
  // RESPONSE NORMAL
  // ==========================================================================

  return supabaseResponse;
}

// ============================================================================
// MATCHER
// ============================================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};