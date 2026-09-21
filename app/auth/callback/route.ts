// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// GET - GOOGLE OAUTH CALLBACK
// ============================================================================

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url);

  // ==========================================================================
  // 1. AMBIL PARAMETER CALLBACK
  // ==========================================================================

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const error =
    requestUrl.searchParams.get(
      "error"
    );

  const errorDescription =
    requestUrl.searchParams.get(
      "error_description"
    );

  const nextParam =
    requestUrl.searchParams.get(
      "next"
    );

  // ==========================================================================
  // 2. TENTUKAN TUJUAN SETELAH LOGIN
  // ==========================================================================

  /**
   * Cegah open redirect.
   *
   * Hanya path internal yang diawali "/" yang diperbolehkan.
   */
  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/akun";

  // ==========================================================================
  // 3. JIKA GOOGLE / SUPABASE MENGEMBALIKAN ERROR
  // ==========================================================================

  if (error) {
    console.error(
      "[AUTH CALLBACK] OAuth error:",
      {
        error,
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
        error
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  // ==========================================================================
  // 4. CODE WAJIB ADA
  // ==========================================================================

  if (!code) {
    console.error(
      "[AUTH CALLBACK] Authorization code tidak ditemukan."
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
  // 5. CEK ENV SUPABASE
  // ==========================================================================

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    console.error(
      "[AUTH CALLBACK] Environment Supabase belum lengkap."
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
  // 6. COOKIE STORE
  // ==========================================================================

  const cookieStore =
    await cookies();

  // ==========================================================================
  // 7. SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
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
                try {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                } catch (
                  cookieError
                ) {
                  console.warn(
                    "[AUTH CALLBACK] Cookie tidak dapat ditulis:",
                    cookieError
                  );
                }
              }
            );
          },
        },
      }
    );

  // ==========================================================================
  // 8. EXCHANGE AUTHORIZATION CODE -> SESSION
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
  // 9. JIKA EXCHANGE GAGAL
  // ==========================================================================

  if (exchangeError) {
    console.error(
      "[AUTH CALLBACK] exchangeCodeForSession gagal:",
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
  // 10. PASTIKAN SESSION TERBENTUK
  // ==========================================================================

  if (
    !data.session ||
    !data.user
  ) {
    console.error(
      "[AUTH CALLBACK] Login berhasil tetapi session/user tidak terbentuk."
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
  // 11. LOG SUCCESS
  // ==========================================================================

  console.log(
    "[AUTH CALLBACK] Login berhasil:",
    data.user.id
  );

  // ==========================================================================
  // 12. REDIRECT KE HALAMAN TUJUAN
  // ==========================================================================

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin
    )
  );
}