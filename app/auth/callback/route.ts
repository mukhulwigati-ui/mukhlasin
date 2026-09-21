// app/auth/callback/route.ts

import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  createServerClient,
} from "@supabase/ssr";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

// ============================================================================
// AUTH CALLBACK
// ============================================================================

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const nextParam =
    requestUrl.searchParams.get(
      "next"
    );

  // ==========================================================================
  // SAFE REDIRECT
  // ==========================================================================

  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/akun";

  // ==========================================================================
  // CODE WAJIB ADA
  // ==========================================================================

  if (!code) {
    const loginUrl =
      new URL(
        "/login",
        requestUrl.origin
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
    return NextResponse.redirect(
      new URL(
        "/login?error=supabase_config",
        requestUrl.origin
      )
    );
  }

  // ==========================================================================
  // COOKIE STORE
  // ==========================================================================

  const cookieStore =
    await cookies();

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
            return cookieStore.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            try {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch (
              error
            ) {
              console.error(
                "[AUTH CALLBACK] Cookie write error:",
                error
              );
            }
          },
        },
      }
    );

  // ==========================================================================
  // EXCHANGE CODE
  // ==========================================================================

  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code
      );

  if (
    error ||
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Exchange gagal:",
      error
    );

    const loginUrl =
      new URL(
        "/login",
        requestUrl.origin
      );

    loginUrl.searchParams.set(
      "error",
      error?.message ||
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
    "[AUTH CALLBACK] Login berhasil:",
    data.user.id
  );

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin
    )
  );
}