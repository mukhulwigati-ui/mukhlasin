// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// GOOGLE / SUPABASE OAUTH CALLBACK
// ============================================================================

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  // ==========================================================================
  // PARAMETER
  // ==========================================================================

  const code =
    requestUrl.searchParams.get("code");

  const oauthError =
    requestUrl.searchParams.get("error");

  const errorDescription =
    requestUrl.searchParams.get(
      "error_description"
    );

  const nextParam =
    requestUrl.searchParams.get("next");

  // ==========================================================================
  // SAFE NEXT PATH
  // ==========================================================================

  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/akun";

  // ==========================================================================
  // SUPABASE ENV
  // ==========================================================================

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ==========================================================================
  // ERROR DARI GOOGLE / SUPABASE
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
        requestUrl.origin
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
  // ENV WAJIB ADA
  // ==========================================================================

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    console.error(
      "[AUTH CALLBACK] Environment Supabase tidak lengkap."
    );

    const loginUrl =
      new URL(
        "/login",
        requestUrl.origin
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
  // BUAT RESPONSE REDIRECT TERLEBIH DAHULU
  // ==========================================================================
  //
  // Penting:
  // cookie Supabase akan ditempel LANGSUNG
  // ke response ini.
  //
  // ==========================================================================

  const destination =
    new URL(
      next,
      requestUrl.origin
    );

  const response =
    NextResponse.redirect(
      destination
    );

  // ==========================================================================
  // SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          // ================================================================
          // AMBIL COOKIE DARI REQUEST
          // ================================================================

          getAll() {
            return request.headers
              .get("cookie")
              ?.split(";")
              .map((cookie) => {
                const [
                  name,
                  ...rest
                ] =
                  cookie
                    .trim()
                    .split("=");

                return {
                  name,
                  value:
                    rest.join("="),
                };
              })
              .filter(
                (cookie) =>
                  Boolean(
                    cookie.name
                  )
              ) || [];
          },

          // ================================================================
          // TEMPEL COOKIE KE RESPONSE REDIRECT
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
  // EXCHANGE CODE MENJADI SESSION
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
  // EXCHANGE GAGAL
  // ==========================================================================

  if (exchangeError) {
    console.error(
      "[AUTH CALLBACK] Exchange gagal:",
      exchangeError
    );

    const loginUrl =
      new URL(
        "/login",
        requestUrl.origin
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
  // SESSION HARUS TERBENTUK
  // ==========================================================================

  if (
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Session tidak terbentuk."
    );

    const loginUrl =
      new URL(
        "/login",
        requestUrl.origin
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
    "[AUTH CALLBACK] Login berhasil:",
    data.user.id
  );

  console.log(
    "[AUTH CALLBACK] Redirect:",
    destination.toString()
  );

  // ==========================================================================
  // RESPONSE SUDAH MEMBAWA COOKIE SESSION
  // ==========================================================================

  return response;
}