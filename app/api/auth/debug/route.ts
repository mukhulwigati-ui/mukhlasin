// app/api/auth/debug/route.ts

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          stage: "env",
          message: "Environment Supabase belum lengkap.",
          hasUrl: Boolean(supabaseUrl),
          hasKey: Boolean(supabaseKey),
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const headerStore = await headers();

    // =========================================================
    // COOKIE YANG MASUK KE SERVER
    // =========================================================

    const allCookies =
      cookieStore.getAll();

    const cookieNames =
      allCookies.map(
        (item) => item.name
      );

    const supabaseCookies =
      cookieNames.filter(
        (name) =>
          name.startsWith("sb-") ||
          name.toLowerCase().includes("supabase")
      );

    // =========================================================
    // SERVER CLIENT
    // =========================================================

    const supabase =
      createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },

            setAll(cookiesToSet) {
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
              } catch {
                // Debug endpoint hanya untuk pemeriksaan.
              }
            },
          },
        }
      );

    // =========================================================
    // CEK CLAIMS
    // =========================================================

    let claimsResult:
      | {
          ok: boolean;
          userId?: string;
          email?: string;
          error?: string;
        }
      | null = null;

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.getClaims();

      claimsResult = {
        ok:
          !error &&
          Boolean(data?.claims),

        userId:
          typeof data?.claims?.sub ===
          "string"
            ? data.claims.sub
            : undefined,

        email:
          typeof data?.claims?.email ===
          "string"
            ? data.claims.email
            : undefined,

        error:
          error?.message,
      };
    } catch (error) {
      claimsResult = {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    // =========================================================
    // CEK USER
    // =========================================================

    let userResult:
      | {
          ok: boolean;
          userId?: string;
          email?: string;
          error?: string;
        }
      | null = null;

    try {
      const {
        data: {
          user,
        },

        error,
      } =
        await supabase.auth.getUser();

      userResult = {
        ok:
          !error &&
          Boolean(user),

        userId:
          user?.id,

        email:
          user?.email,

        error:
          error?.message,
      };
    } catch (error) {
      userResult = {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json(
      {
        success: true,

        request: {
          host:
            headerStore.get("host"),

          forwardedHost:
            headerStore.get(
              "x-forwarded-host"
            ),

          protocol:
            headerStore.get(
              "x-forwarded-proto"
            ),
        },

        cookies: {
          total:
            allCookies.length,

          supabaseCookieNames:
            supabaseCookies,

          hasSupabaseCookie:
            supabaseCookies.length >
            0,
        },

        claims:
          claimsResult,

        user:
          userResult,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        stage: "unexpected",

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}