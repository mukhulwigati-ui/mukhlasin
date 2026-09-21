// app/auth/callback/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createServerClient,
} from "@supabase/ssr";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

// ============================================================================
// GOOGLE / SUPABASE AUTH CALLBACK
// ============================================================================

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    request.nextUrl.clone();

  // ==========================================================================
  // PARAMETER
  // ==========================================================================

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  /**
   * INI YANG SEBELUMNYA HILANG.
   *
   * Contoh:
   *
   * sb_flow_id=a3c4cc5ada35a629bee622ebcb2f3b8e
   */
  const flowId =
    requestUrl.searchParams.get(
      "sb_flow_id"
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
  // DEBUG
  // ==========================================================================

  console.log(
    "[AUTH CALLBACK] Request:",
    {
      hasCode:
        Boolean(code),

      flowId:
        flowId ||
        null,

      url:
        requestUrl.pathname,

      cookieNames:
        request.cookies
          .getAll()
          .map(
            (cookie) =>
              cookie.name
          ),
    }
  );

  // ==========================================================================
  // OAUTH ERROR
  // ==========================================================================

  if (oauthError) {
    console.error(
      "[AUTH CALLBACK] Provider error:",
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
  // CODE WAJIB ADA
  // ==========================================================================

  if (!code) {
    console.error(
      "[AUTH CALLBACK] Code tidak ditemukan."
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
  // FLOW ID WAJIB ADA
  // ==========================================================================

  if (!flowId) {
    console.error(
      "[AUTH CALLBACK] sb_flow_id tidak ditemukan."
    );

    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    loginUrl.searchParams.set(
      "error",
      "missing_flow_id"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

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
      "[AUTH CALLBACK] Supabase ENV tidak lengkap."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=supabase_config_missing",
        request.url
      )
    );
  }

  // ==========================================================================
  // DESTINATION
  // ==========================================================================

  const destination =
    new URL(
      "/akun",
      request.url
    );

  // ==========================================================================
  // RESPONSE
  // ==========================================================================

  const response =
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
  // SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          // ================================================================
          // BACA VERIFIER DARI REQUEST
          // ================================================================

          getAll() {
            return request.cookies.getAll();
          },

          // ================================================================
          // AUTH TOKEN DITULIS KE RESPONSE
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
  // EXCHANGE CODE + FLOW ID
  // ==========================================================================

  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code,
        {
          flowId,
        }
      );

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (error) {
    console.error(
      "[AUTH CALLBACK] Exchange gagal:",
      {
        message:
          error.message,

        name:
          error.name,

        flowId,
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
  // VALIDATE SESSION
  // ==========================================================================

  if (
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Session kosong setelah exchange.",
      {
        flowId,
      }
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
  // SUCCESS
  // ==========================================================================

  console.log(
    "[AUTH CALLBACK] LOGIN SUCCESS:",
    {
      userId:
        data.user.id,

      email:
        data.user.email,

      flowId,

      cookiesWritten:
        response.cookies
          .getAll()
          .map(
            (cookie) =>
              cookie.name
          ),
    }
  );

  return response;
}