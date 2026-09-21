// app/login/page.tsx

"use client";

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createBrowserClient } from "@supabase/ssr";

// ============================================================================
// PAGE
// ============================================================================

export default function LoginPage() {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [mode, setMode] =
    useState<
      "login" | "register"
    >("login");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // ==========================================================================
  // SUPABASE
  // ==========================================================================

  const supabase =
    useMemo(() => {
      const url =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;

      const anonKey =
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (
        !url ||
        !anonKey
      ) {
        throw new Error(
          "Supabase environment variables belum tersedia."
        );
      }

      return createBrowserClient(
        url,
        anonKey
      );
    }, []);

  // ==========================================================================
  // SITE URL
  // ==========================================================================

  const getSiteUrl = () => {
    /**
     * PRODUCTION
     *
     * Pastikan di Vercel:
     *
     * NEXT_PUBLIC_SITE_URL=https://www.mukhlasin.or.id
     */
    const envUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL;

    if (envUrl) {
      return envUrl.replace(
        /\/+$/,
        ""
      );
    }

    /**
     * LOCAL DEVELOPMENT
     */
    if (
      typeof window !==
      "undefined"
    ) {
      const hostname =
        window.location.hostname;

      if (
        hostname ===
          "localhost" ||
        hostname ===
          "127.0.0.1"
      ) {
        return window.location.origin;
      }
    }

    /**
     * FALLBACK PRODUCTION
     *
     * Jangan gunakan window.location.origin
     * untuk production supaya OAuth selalu
     * kembali ke domain www.
     */
    return "https://www.mukhlasin.or.id";
  };

  // ==========================================================================
  // CALLBACK URL
  // ==========================================================================

  const getCallbackUrl = () => {
    const siteUrl =
      getSiteUrl();

    /**
     * PENTING:
     *
     * Jangan tambahkan:
     *
     * ?next=/akun
     *
     * Callback harus EXACT:
     *
     * https://www.mukhlasin.or.id/auth/callback
     */
    return `${siteUrl}/auth/callback`;
  };

  // ==========================================================================
  // CHECK ERROR DARI CALLBACK
  // ==========================================================================

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const authError =
      params.get("error");

    if (authError) {
      setErrorMessage(
        decodeURIComponent(
          authError
        )
      );
    }
  }, []);

  // ==========================================================================
  // CHECK USER LOGIN
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    const checkUser =
      async () => {
        try {
          const {
            data: {
              user,
            },

            error,
          } =
            await supabase.auth
              .getUser();

          if (error) {
            console.warn(
              "[LOGIN] getUser:",
              error.message
            );
          }

          if (
            mounted &&
            user
          ) {
            console.log(
              "[LOGIN] User sudah login:",
              user.id
            );

            window.location.replace(
              "/akun"
            );

            return;
          }
        } catch (
          error
        ) {
          console.error(
            "[LOGIN] Check user error:",
            error
          );
        } finally {
          if (mounted) {
            setCheckingAuth(
              false
            );
          }
        }
      };

    checkUser();

    // ========================================================================
    // AUTH STATE LISTENER
    // ========================================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            session
          ) => {
            console.log(
              "[LOGIN] Auth state:",
              event
            );

            if (
              event ===
                "SIGNED_IN" &&
              session?.user
            ) {
              console.log(
                "[LOGIN] SIGNED_IN:",
                session.user.id
              );

              window.location.replace(
                "/akun"
              );
            }
          }
        );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [
    supabase,
  ]);

  // ==========================================================================
  // EMAIL LOGIN / REGISTER
  // ==========================================================================

  const handleAuth =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      setErrorMessage("");
      setSuccessMessage("");
      setLoading(true);

      try {
        // ====================================================================
        // REGISTER
        // ====================================================================

        if (
          mode ===
          "register"
        ) {
          const callbackUrl =
            getCallbackUrl();

          console.log(
            "[REGISTER] Email callback:",
            callbackUrl
          );

          const {
            data,
            error,
          } =
            await supabase.auth
              .signUp({
                email:
                  email.trim(),

                password,

                options: {
                  /**
                   * PENTING:
                   *
                   * EXACT callback.
                   * Tanpa ?next=/akun
                   */
                  emailRedirectTo:
                    callbackUrl,
                },
              });

          if (error) {
            console.error(
              "[REGISTER] Sign up error:",
              error
            );

            setErrorMessage(
              error.message
            );

            return;
          }

          // ================================================================
          // SESSION LANGSUNG TERBENTUK
          // ================================================================

          if (
            data.session &&
            data.user
          ) {
            console.log(
              "[REGISTER] Session langsung terbentuk:",
              data.user.id
            );

            window.location.replace(
              "/akun"
            );

            return;
          }

          // ================================================================
          // EMAIL CONFIRMATION
          // ================================================================

          setSuccessMessage(
            "Pendaftaran berhasil. Silakan periksa email Anda untuk melakukan verifikasi."
          );

          setMode(
            "login"
          );

          return;
        }

        // ====================================================================
        // LOGIN EMAIL
        // ====================================================================

        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                email.trim(),

              password,
            });

        if (error) {
          console.error(
            "[LOGIN] Email login error:",
            error
          );

          setErrorMessage(
            error.message
          );

          return;
        }

        if (
          !data.user ||
          !data.session
        ) {
          setErrorMessage(
            "Login berhasil tetapi sesi tidak terbentuk. Silakan coba kembali."
          );

          return;
        }

        console.log(
          "[LOGIN] Email login success:",
          data.user.id
        );

        // ====================================================================
        // LOGIN SUCCESS
        // ====================================================================

        window.location.replace(
          "/akun"
        );
      } catch (
        error
      ) {
        console.error(
          "[LOGIN] Authentication error:",
          error
        );

        setErrorMessage(
          "Terjadi gangguan saat proses autentikasi."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  // ==========================================================================
  // GOOGLE LOGIN
  // ==========================================================================

  const handleGoogleAuth =
    async () => {
      if (
        googleLoading
      ) {
        return;
      }

      setGoogleLoading(
        true
      );

      setErrorMessage("");
      setSuccessMessage("");

      try {
        const redirectTo =
          getCallbackUrl();

        console.log(
          "[LOGIN] Google redirectTo:",
          redirectTo
        );

        /**
         * Yang harus tercetak:
         *
         * https://www.mukhlasin.or.id/auth/callback
         *
         * BUKAN:
         *
         * https://www.mukhlasin.or.id/auth/callback?next=/akun
         */
        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithOAuth({
              provider:
                "google",

              options: {
                redirectTo,

                queryParams: {
                  access_type:
                    "offline",

                  prompt:
                    "select_account",
                },
              },
            });

        if (error) {
          console.error(
            "[LOGIN] Google OAuth error:",
            error
          );

          setErrorMessage(
            error.message
          );

          setGoogleLoading(
            false
          );

          return;
        }

        console.log(
          "[LOGIN] Google OAuth dimulai:",
          data
        );

        /**
         * Jangan redirect manual di sini.
         *
         * Supabase akan membawa browser:
         *
         * Google
         * ↓
         * Supabase
         * ↓
         * /auth/callback
         *
         * Callback kemudian:
         *
         * exchangeCodeForSession(code)
         * ↓
         * membuat auth cookie
         * ↓
         * redirect /akun
         */
      } catch (
        error
      ) {
        console.error(
          "[LOGIN] Google OAuth exception:",
          error
        );

        setErrorMessage(
          "Tidak dapat melanjutkan login dengan Google."
        );

        setGoogleLoading(
          false
        );
      }
    };

  // ==========================================================================
  // LOADING CHECK SESSION
  // ==========================================================================

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0d5c91]" />

          <p className="mt-4 text-sm font-bold text-slate-500">
            Memeriksa sesi...
          </p>

        </div>
      </main>
    );
  }

  // ==========================================================================
  // OUTPUT
  // ==========================================================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">

      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 text-left shadow-sm">

        {/* ================================================================== */}
        {/* HEADER */}
        {/* ================================================================== */}

        <div className="mb-6 flex items-center justify-between gap-4">

          <h1 className="text-2xl font-extrabold text-slate-900">
            {mode ===
            "login"
              ? "Masuk"
              : "Daftar Akun"}
          </h1>

          <button
            type="button"
            onClick={() => {
              setMode(
                mode ===
                  "login"
                  ? "register"
                  : "login"
              );

              setErrorMessage(
                ""
              );

              setSuccessMessage(
                ""
              );
            }}
            className="cursor-pointer text-right text-xs font-bold text-[#0d5c91] hover:underline"
          >
            {mode ===
            "login"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Masuk"}
          </button>

        </div>

        {/* ================================================================== */}
        {/* ERROR MESSAGE */}
        {/* ================================================================== */}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium leading-relaxed text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ================================================================== */}
        {/* SUCCESS MESSAGE */}
        {/* ================================================================== */}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium leading-relaxed text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* ================================================================== */}
        {/* EMAIL FORM */}
        {/* ================================================================== */}

        <form
          onSubmit={
            handleAuth
          }
          className="space-y-4"
        >

          {/* EMAIL */}

          <div>

            <label className="mb-1.5 block text-sm font-semibold text-slate-600">
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-sky-500"
              placeholder="nama@email.com"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>

          {/* PASSWORD */}

          <div>

            <label className="mb-1.5 block text-sm font-semibold text-slate-600">
              Kata Sandi
            </label>

            <input
              type="password"
              autoComplete={
                mode ===
                "login"
                  ? "current-password"
                  : "new-password"
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={6}
              required
            />

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading ||
              googleLoading
            }
            className="w-full cursor-pointer rounded-xl bg-[#0d5c91] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Memproses..."
              : mode ===
                  "login"
                ? "Masuk"
                : "Daftar dengan Email"}
          </button>

        </form>

        {/* ================================================================== */}
        {/* DIVIDER */}
        {/* ================================================================== */}

        <div className="relative my-6">

          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>

          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 font-medium text-slate-400">
              Atau lanjutkan dengan
            </span>
          </div>

        </div>

        {/* ================================================================== */}
        {/* GOOGLE */}
        {/* ================================================================== */}

        <button
          type="button"
          onClick={
            handleGoogleAuth
          }
          disabled={
            googleLoading ||
            loading
          }
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >

          {googleLoading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#0d5c91]" />

              <span>
                Menghubungkan...
              </span>
            </>
          ) : (
            <>
              <img
                src="/google-icon.svg"
                alt="Google"
                className="h-5 w-5"
              />

              <span>
                Daftar / Masuk dengan Google
              </span>
            </>
          )}

        </button>

      </div>
    </main>
  );
}