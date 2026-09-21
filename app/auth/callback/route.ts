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
// COPY COOKIES DARI SATU RESPONSE KE RESPONSE LAIN
// ============================================================================

function copyResponseCookies(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies
    .getAll()
    .forEach((cookie) => {
      target.cookies.set(cookie);
    });

  return target;
}

// ============================================================================
// CALLBACK
// ============================================================================

export async function GET(
  request: NextRequest
) {
  // ==========================================================================
  // PARAMETER
  // ==========================================================================

  const url =
    request.nextUrl.clone();

  const code =
    url.searchParams.get(
      "code"
    );

  const flowId =
    url.searchParams.get(
      "sb_flow_id"
    );

  const providerError =
    url.searchParams.get(
      "error"
    );

  const errorDescription =
    url.searchParams.get(
      "error_description"
    );

  // ==========================================================================
  // COOKIE YANG DATANG KE CALLBACK
  // ==========================================================================

  const requestCookies =
    request.cookies.getAll();

  const cookieNames =
    requestCookies.map(
      (cookie) =>
        cookie.name
    );

  const supabaseCookieNames =
    cookieNames.filter(
      (name) =>
        name.startsWith(
          "sb-"
        )
    );

  // ==========================================================================
  // COOKIE VERIFIER YANG SEHARUSNYA DIPAKAI
  // ==========================================================================

  const expectedFlowCookiePart =
    flowId
      ? `-flow-${flowId}-code-verifier`
      : null;

  const matchingVerifier =
    expectedFlowCookiePart
      ? supabaseCookieNames.find(
          (name) =>
            name.endsWith(
              expectedFlowCookiePart
            )
        )
      : undefined;

  console.log(
    "[AUTH CALLBACK] MASUK:",
    {
      hasCode:
        Boolean(code),

      flowId:
        flowId || null,

      hasMatchingVerifier:
        Boolean(
          matchingVerifier
        ),

      supabaseCookieNames,
    }
  );

  // ==========================================================================
  // ERROR DARI PROVIDER
  // ==========================================================================

  if (providerError) {
    return NextResponse.json(
      {
        success: false,

        stage:
          "provider",

        error:
          providerError,

        errorDescription:
          errorDescription ||
          null,

        flowId:
          flowId ||
          null,

        cookies:
          supabaseCookieNames,
      },
      {
        status: 400,
      }
    );
  }

  // ==========================================================================
  // CODE TIDAK ADA
  // ==========================================================================

  if (!code) {
    return NextResponse.json(
      {
        success: false,

        stage:
          "callback",

        error:
          "Authorization code tidak ditemukan.",

        flowId:
          flowId ||
          null,

        hasMatchingVerifier:
          Boolean(
            matchingVerifier
          ),

        cookies:
          supabaseCookieNames,
      },
      {
        status: 400,
      }
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
    return NextResponse.json(
      {
        success: false,

        stage:
          "environment",

        error:
          "Environment Supabase belum lengkap.",

        hasUrl:
          Boolean(
            supabaseUrl
          ),

        hasKey:
          Boolean(
            supabaseKey
          ),
      },
      {
        status: 500,
      }
    );
  }

  // ==========================================================================
  // RESPONSE SUCCESS
  // ==========================================================================

  const destination =
    new URL(
      "/akun",
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
  // SUPABASE SERVER CLIENT
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
  // EXCHANGE
  // ==========================================================================

  try {
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

    // ========================================================================
    // EXCHANGE ERROR
    // ========================================================================

    if (error) {
      console.error(
        "[AUTH CALLBACK] EXCHANGE ERROR:",
        {
          message:
            error.message,

          name:
            error.name,

          flowId:
            flowId ||
            null,

          hasMatchingVerifier:
            Boolean(
              matchingVerifier
            ),
        }
      );

      const diagnosticResponse =
        NextResponse.json(
          {
            success: false,

            stage:
              "exchange",

            error:
              error.message,

            errorName:
              error.name,

            flowId:
              flowId ||
              null,

            hasCode:
              true,

            hasMatchingVerifier:
              Boolean(
                matchingVerifier
              ),

            matchingVerifierName:
              matchingVerifier ||
              null,

            requestSupabaseCookies:
              supabaseCookieNames,

            responseCookies:
              response.cookies
                .getAll()
                .map(
                  (cookie) =>
                    cookie.name
                ),
          },
          {
            status: 400,

            headers: {
              "Cache-Control":
                "private, no-store, max-age=0",
            },
          }
        );

      /**
       * Supabase mungkin sudah meminta
       * penghapusan verifier yang gagal.
       *
       * Jangan buang Set-Cookie tersebut.
       */
      return copyResponseCookies(
        response,
        diagnosticResponse
      );
    }

    // ========================================================================
    // SESSION KOSONG
    // ========================================================================

    if (
      !data.session ||
      !data.user
    ) {
      const diagnosticResponse =
        NextResponse.json(
          {
            success: false,

            stage:
              "session",

            error:
              "exchangeCodeForSession selesai tetapi session/user kosong.",

            flowId:
              flowId ||
              null,

            hasMatchingVerifier:
              Boolean(
                matchingVerifier
              ),

            requestSupabaseCookies:
              supabaseCookieNames,

            responseCookies:
              response.cookies
                .getAll()
                .map(
                  (cookie) =>
                    cookie.name
                ),
          },
          {
            status: 500,
          }
        );

      return copyResponseCookies(
        response,
        diagnosticResponse
      );
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================

    console.log(
      "[AUTH CALLBACK] SUCCESS:",
      {
        userId:
          data.user.id,

        flowId:
          flowId ||
          null,

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
  } catch (
    error
  ) {
    console.error(
      "[AUTH CALLBACK] EXCEPTION:",
      error
    );

    const diagnosticResponse =
      NextResponse.json(
        {
          success: false,

          stage:
            "exception",

          error:
            error instanceof Error
              ? error.message
              : String(
                  error
                ),

          flowId:
            flowId ||
            null,

          hasMatchingVerifier:
            Boolean(
              matchingVerifier
            ),

          requestSupabaseCookies:
            supabaseCookieNames,

          responseCookies:
            response.cookies
              .getAll()
              .map(
                (cookie) =>
                  cookie.name
              ),
        },
        {
          status: 500,
        }
      );

    return copyResponseCookies(
      response,
      diagnosticResponse
    );
  }
}