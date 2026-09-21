// lib/supabase/proxy.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest
) {
  // ==========================================================================
  // RESPONSE DASAR
  // ==========================================================================

  let response =
    NextResponse.next({
      request,
    });

  // ==========================================================================
  // ENV
  // ==========================================================================

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    console.error(
      "[SUPABASE PROXY] Environment Supabase belum lengkap."
    );

    return response;
  }

  // ==========================================================================
  // SUPABASE SERVER CLIENT
  // ==========================================================================

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            // ================================================================
            // Update cookie pada request
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
            // Buat response baru dengan request terbaru
            // ================================================================

            response =
              NextResponse.next({
                request,
              });

            // ================================================================
            // Update cookie ke browser
            // ================================================================

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
  // VERIFIKASI / REFRESH SESSION
  // ==========================================================================

  /**
   * Jangan gunakan getSession() di proxy.
   *
   * getUser() akan memverifikasi user ke Supabase Auth
   * dan sekaligus memicu refresh cookie jika diperlukan.
   */
  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    console.warn(
      "[SUPABASE PROXY] getUser:",
      error.message
    );
  }

  const pathname =
    request.nextUrl.pathname;

  // ==========================================================================
  // ROUTE PUBLIC
  // ==========================================================================

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/daftar" ||
    pathname.startsWith(
      "/auth/"
    );

  // ==========================================================================
  // ROUTE PRIVATE
  // ==========================================================================

  const isProtectedRoute =
    pathname === "/akun" ||
    pathname.startsWith(
      "/akun/"
    ) ||
    pathname ===
      "/pengaturan" ||
    pathname.startsWith(
      "/pengaturan/"
    ) ||
    pathname ===
      "/donasi-saya" ||
    pathname.startsWith(
      "/donasi-saya/"
    ) ||
    pathname ===
      "/kuitansi" ||
    pathname.startsWith(
      "/kuitansi/"
    ) ||
    pathname ===
      "/favorit" ||
    pathname.startsWith(
      "/favorit/"
    ) ||
    pathname ===
      "/referral" ||
    pathname.startsWith(
      "/referral/"
    );

  // ==========================================================================
  // SUDAH LOGIN TAPI MASUK /login
  // ==========================================================================

  if (
    user &&
    pathname ===
      "/login"
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/akun";

    url.search = "";

    return NextResponse.redirect(
      url
    );
  }

  // ==========================================================================
  // BELUM LOGIN TAPI MEMBUKA PRIVATE PAGE
  // ==========================================================================

  if (
    !user &&
    isProtectedRoute &&
    !isAuthRoute
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/login";

    url.search = "";

    return NextResponse.redirect(
      url
    );
  }

  // ==========================================================================
  // NORMAL
  // ==========================================================================

  return response;
}