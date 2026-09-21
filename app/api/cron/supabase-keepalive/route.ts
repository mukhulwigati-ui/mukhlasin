// app/api/cron/supabase-keepalive/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// RESPONSE TANPA CACHE
// ============================================================================

function jsonResponse(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        "no-store, no-cache, max-age=0, must-revalidate",

      Pragma: "no-cache",

      Expires: "0",
    },
  });
}

// ============================================================================
// GET
// ============================================================================
//
// Vercel Cron memanggil endpoint menggunakan GET.
//
// ============================================================================

export async function GET(
  request: NextRequest
) {
  try {
    // ========================================================================
    // 1. VERIFIKASI CRON SECRET
    // ========================================================================

    const cronSecret =
      process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[KEEPALIVE] CRON_SECRET belum tersedia."
      );

      return jsonResponse(
        {
          success: false,

          message:
            "CRON_SECRET belum dikonfigurasi.",
        },
        500
      );
    }

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return jsonResponse(
        {
          success: false,

          message:
            "Unauthorized.",
        },
        401
      );
    }

    // ========================================================================
    // 2. SUPABASE URL
    // ========================================================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error(
        "[KEEPALIVE] NEXT_PUBLIC_SUPABASE_URL belum tersedia."
      );

      return jsonResponse(
        {
          success: false,

          message:
            "Supabase URL belum dikonfigurasi.",
        },
        500
      );
    }

    // ========================================================================
    // 3. SUPABASE KEY
    // ========================================================================
    //
    // Utamakan SERVICE ROLE KEY karena endpoint ini berjalan di server.
    //
    // Jangan pernah menggunakan prefix NEXT_PUBLIC_
    // untuk SERVICE_ROLE_KEY.
    //
    // Jika belum punya service role di Vercel,
    // fallback ke ANON KEY tetap tersedia.
    //
    // ========================================================================

    const supabaseKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY ||
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      console.error(
        "[KEEPALIVE] Supabase key belum tersedia."
      );

      return jsonResponse(
        {
          success: false,

          message:
            "Supabase key belum dikonfigurasi.",
        },
        500
      );
    }

    // ========================================================================
    // 4. URL REST SUPABASE
    // ========================================================================
    //
    // Kita hanya membaca 1 ID dari tabel profiles.
    // Sangat ringan.
    //
    // ========================================================================

    const endpoint =
      `${supabaseUrl.replace(
        /\/+$/,
        ""
      )}/rest/v1/profiles?select=id&limit=1`;

    // ========================================================================
    // 5. QUERY KEEP-ALIVE
    // ========================================================================

    const response =
      await fetch(
        endpoint,
        {
          method: "GET",

          headers: {
            apikey:
              supabaseKey,

            Authorization:
              `Bearer ${supabaseKey}`,

            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

    // ========================================================================
    // 6. JIKA SUPABASE GAGAL
    // ========================================================================

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "[KEEPALIVE] Supabase request gagal:",
        response.status,
        errorText
      );

      return jsonResponse(
        {
          success: false,

          supabaseStatus:
            response.status,

          message:
            "Supabase keep-alive gagal.",
        },
        502
      );
    }

    // ========================================================================
    // 7. RESPONSE DATA
    // ========================================================================

    const data =
      await response.json();

    // ========================================================================
    // 8. SUCCESS
    // ========================================================================

    console.log(
      "[KEEPALIVE] Supabase aktif:",
      new Date().toISOString()
    );

    return jsonResponse({
      success: true,

      message:
        "Supabase keep-alive berhasil.",

      checkedAt:
        new Date().toISOString(),

      /**
       * Tidak mengirim data user.
       * Hanya informasi apakah tabel dapat dibaca.
       */
      databaseReachable:
        Array.isArray(data),
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "[KEEPALIVE] Error:",
      error
    );

    return jsonResponse(
      {
        success: false,

        message:
          "Terjadi kesalahan pada Supabase keep-alive.",
      },
      500
    );
  }
}