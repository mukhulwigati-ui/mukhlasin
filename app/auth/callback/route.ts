// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const next =
    requestUrl.searchParams.get("next") ||
    "/akun";

  // Kalau tidak ada code, langsung arahkan ke login
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        requestUrl.origin
      )
    );
  }

  const cookieStore =
    await cookies();

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              // Aman diabaikan pada context tertentu
            }
          },
        },
      }
    );

  // ==========================================================
  // EXCHANGE CODE -> SESSION
  // ==========================================================

  const {
    data,
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "[AUTH CALLBACK] exchange error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error.message
        )}`,
        requestUrl.origin
      )
    );
  }

  if (!data.session) {
    console.error(
      "[AUTH CALLBACK] Session tidak terbentuk."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=no_session",
        requestUrl.origin
      )
    );
  }

  // ==========================================================
  // LOGIN BERHASIL
  // ==========================================================

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin
    )
  );
}// app/auth/callback/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const next =
    requestUrl.searchParams.get("next") ||
    "/akun";

  // Kalau tidak ada code, langsung arahkan ke login
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        requestUrl.origin
      )
    );
  }

  const cookieStore =
    await cookies();

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              // Aman diabaikan pada context tertentu
            }
          },
        },
      }
    );

  // ==========================================================
  // EXCHANGE CODE -> SESSION
  // ==========================================================

  const {
    data,
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "[AUTH CALLBACK] exchange error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error.message
        )}`,
        requestUrl.origin
      )
    );
  }

  if (!data.session) {
    console.error(
      "[AUTH CALLBACK] Session tidak terbentuk."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=no_session",
        requestUrl.origin
      )
    );
  }

  // ==========================================================
  // LOGIN BERHASIL
  // ==========================================================

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin
    )
  );
}