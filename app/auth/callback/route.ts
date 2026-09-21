// app/auth/callback/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createServerClient,
} from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// GOOGLE OAUTH CALLBACK
// ============================================================================

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    request.nextUrl.clone();

  // ==========================================================================
  // 1. AMBIL PARAMETER
  // ==========================================================================

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const nextParam =
    requestUrl.searchParams.get(
      "next"
    );

  const oauthError =
    requestUrl.searchParams.get(
      "error"
    );

  const errorDescription =
    requestUrl.searchParams.get(
      "error_description"
    );

  // ==========================================================================
  // 2. SAFE REDIRECT
  // ==========================================================================

  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/akun";

  // ==========================================================================
  // 3. ERROR DARI GOOGLE / SUPABASE
  // ==========================================================================

  if (oauthError) {
    console.error(
      "[AUTH CALLBACK] OAuth error:",
      {
        oauthError,
        errorDescription,
      }
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      errorDescription ||
        oauthError
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 4. AUTH CODE WAJIB ADA
  // ==========================================================================

  if (!code) {
    console.error(
      "[AUTH CALLBACK] Authorization code tidak ditemukan."
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      "missing_code"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 5. ENV SUPABASE
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
      "[AUTH CALLBACK] Environment Supabase belum lengkap."
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      "supabase_config_missing"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 6. SIAPKAN DESTINATION
  // ==========================================================================

  const destination =
    new URL(
      next,
      request.url
    );

  // ==========================================================================
  // 7. RESPONSE REDIRECT
  // ==========================================================================
  //
  // Response dibuat SEBELUM exchange.
  //
  // Jadi ketika Supabase menghasilkan auth cookie,
  // cookie langsung ditempel ke response yang akan
  // dikirim ke browser.
  //
  // ==========================================================================

  let response =
    NextResponse.redirect(
      destination
    );

  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate"
  );

  response.headers.set(
    "Pragma",
    "no-cache"
  );

  response.headers.set(
    "Expires",
    "0"
  );

  // ==========================================================================
  // 8. SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          // ================================================================
          // BACA COOKIE DARI REQUEST
          // ================================================================
          //
          // Termasuk:
          //
          // sb-xxxxxxxx-auth-token-code-verifier
          //
          // yang kita lihat pada endpoint debug.
          //
          // ================================================================

          getAll() {
            return request.cookies.getAll();
          },

          // ================================================================
          // TULIS COOKIE SESSION KE RESPONSE
          // ================================================================

          setAll(
            cookiesToSet
          ) {
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
  // 9. EXCHANGE CODE -> SESSION
  // ==========================================================================
  //
  // PENTING:
  //
  // Versi supabase-js Anda hanya menerima SATU parameter.
  //
  // BENAR:
  //
  // exchangeCodeForSession(code)
  //
  // SALAH:
  //
  // exchangeCodeForSession(code, {...})
  //
  // ==========================================================================

  const {
    data,
    error:
      exchangeError,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code
      );

  // ==========================================================================
  // 10. EXCHANGE GAGAL
  // ==========================================================================

  if (exchangeError) {
    console.error(
      "[AUTH CALLBACK] exchangeCodeForSession gagal:",
      {
        message:
          exchangeError.message,

        name:
          exchangeError.name,

        status:
          "status" in
          exchangeError
            ? exchangeError.status
            : undefined,
      }
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      exchangeError.message
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 11. PASTIKAN SESSION ADA
  // ==========================================================================

  if (
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Exchange selesai tetapi session/user kosong."
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      "session_not_created"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 12. DEBUG SUCCESS
  // ==========================================================================

  const cookieNames =
    response.cookies
      .getAll()
      .map(
        (cookie) =>
          cookie.name
      );

  console.log(
    "[AUTH CALLBACK] LOGIN SUCCESS:",
    {
      userId:
        data.user.id,

      email:
        data.user.email,

      destination:
        destination.toString(),

      cookiesWritten:
        cookieNames,
    }
  );

  // ==========================================================================
  // 13. RETURN RESPONSE + AUTH COOKIE
  // ==========================================================================

  return response;
}