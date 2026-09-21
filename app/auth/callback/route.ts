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
  // 1. PARAMETER
  // ==========================================================================

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  /**
   * Supabase versi baru mendukung flow ID untuk PKCE.
   * Kalau parameter ini tersedia, kita teruskan ke exchangeCodeForSession().
   */
  const flowId =
    requestUrl.searchParams.get(
      "sb_flow_id"
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
  // 2. SAFE DESTINATION
  // ==========================================================================

  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/akun";

  // ==========================================================================
  // 3. ERROR DARI PROVIDER
  // ==========================================================================

  if (oauthError) {
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

    console.error(
      "[AUTH CALLBACK] OAuth provider error:",
      {
        oauthError,
        errorDescription,
      }
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 4. CODE WAJIB ADA
  // ==========================================================================

  if (!code) {
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
  // 5. ENV
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
      "[AUTH CALLBACK] Environment Supabase tidak lengkap."
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
  // 6. SIAPKAN RESPONSE REDIRECT SEBELUM EXCHANGE
  // ==========================================================================
  //
  // Ini penting:
  //
  // cookie yang dibuat oleh exchangeCodeForSession()
  // langsung ditempel ke response yang benar-benar dikirim ke browser.
  //
  // ==========================================================================

  const destination =
    new URL(
      next,
      request.url
    );

  let response =
    NextResponse.redirect(
      destination
    );

  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0"
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
  // 7. SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          // ================================================================
          // COOKIE PKCE / CODE VERIFIER DIBACA LANGSUNG DARI REQUEST
          // ================================================================

          getAll() {
            return request.cookies.getAll();
          },

          // ================================================================
          // SESSION COOKIE DITEMPEL LANGSUNG KE RESPONSE REDIRECT
          // ================================================================

          setAll(
            cookiesToSet,
            headers
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

            /**
             * @supabase/ssr >= 0.10 dapat memberi cache headers
             * saat token/session diperbarui.
             */
            if (headers) {
              Object.entries(
                headers
              ).forEach(
                ([
                  key,
                  value,
                ]) => {
                  response.headers.set(
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
  // 8. EXCHANGE AUTH CODE -> SESSION
  // ==========================================================================

  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code,
        flowId
          ? {
              flowId,
            }
          : undefined
      );

  // ==========================================================================
  // 9. EXCHANGE GAGAL
  // ==========================================================================

  if (error) {
    console.error(
      "[AUTH CALLBACK] exchangeCodeForSession gagal:",
      {
        message:
          error.message,

        flowId:
          flowId ||
          null,
      }
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      error.message
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 10. PASTIKAN SESSION BENAR-BENAR ADA
  // ==========================================================================

  if (
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Exchange selesai tetapi session kosong."
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
  // 11. DEBUG AMAN
  // ==========================================================================

  console.log(
    "[AUTH CALLBACK] SUCCESS",
    {
      userId:
        data.user.id,

      email:
        data.user.email,

      flowId:
        flowId ||
        null,

      cookieNames:
        response.cookies
          .getAll()
          .map(
            (cookie) =>
              cookie.name
          ),
    }
  );

  // ==========================================================================
  // 12. RETURN RESPONSE YANG SUDAH MEMBAWA COOKIE SESSION
  // ==========================================================================

  return response;
}