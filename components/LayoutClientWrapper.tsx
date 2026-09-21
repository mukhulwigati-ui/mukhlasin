// app/components/LayoutClientWrapper.tsx

"use client";

import React, {
  useEffect,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import Header from "@/components/Header";

import {
  X,
  Download,
  Smartphone,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface LayoutClientWrapperProps {
  children: React.ReactNode;
}

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | "accepted"
      | "dismissed";

    platform:
      string;
  }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LayoutClientWrapper({
  children,
}: LayoutClientWrapperProps) {
  const pathname =
    usePathname();

  // ==========================================================================
  // ROUTE FLAGS
  // ==========================================================================

  const isStudioPage =
    pathname?.startsWith(
      "/studio"
    );

  const isHomePage =
    pathname === "/";

  /**
   * Halaman autentikasi dibuat standalone.
   *
   * Header global tidak perlu ditampilkan di sini karena:
   *
   * - bisa menjalankan pengecekan auth sendiri
   * - bisa menampilkan login modal
   * - berpotensi menyebabkan loop:
   *
   * belum login
   * → /login
   * → Header
   * → modal belum login
   * → /login lagi
   */
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/daftar" ||
    pathname?.startsWith(
      "/auth/"
    );

  /**
   * Halaman tanpa chrome global.
   */
  const isStandalonePage =
    Boolean(
      isStudioPage ||
        isAuthPage
    );

  // ==========================================================================
  // PWA STATE
  // ==========================================================================

  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    showPrompt,
    setShowPrompt,
  ] =
    useState(false);

  const [
    isIOS,
    setIsIOS,
  ] =
    useState(false);

  const [
    showIOSGuide,
    setShowIOSGuide,
  ] =
    useState(false);

  /**
   * Melacak apakah user telah menutup
   * prompt pada sesi browser saat ini.
   */
  const [
    hasClosedPrompt,
    setHasClosedPrompt,
  ] =
    useState(false);

  // ==========================================================================
  // PWA INSTALL PROMPT
  // ==========================================================================

  useEffect(() => {
    /**
     * Jangan jalankan logic PWA
     * pada Studio atau halaman Auth.
     */
    if (
      isStandalonePage
    ) {
      setShowPrompt(
        false
      );

      return;
    }

    // ========================================================================
    // DETEKSI DEVICE
    // ========================================================================

    const userAgent =
      window.navigator.userAgent.toLowerCase();

    const isMobileDevice =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
        userAgent
      );

    /**
     * Desktop tidak perlu
     * menampilkan prompt install.
     */
    if (!isMobileDevice) {
      setShowPrompt(
        false
      );

      return;
    }

    // ========================================================================
    // SESSION STORAGE
    // ========================================================================

    const closedInSession =
      sessionStorage.getItem(
        "pwa_prompt_closed"
      );

    if (
      closedInSession ===
      "true"
    ) {
      setHasClosedPrompt(
        true
      );

      setShowPrompt(
        false
      );

      return;
    }

    // ========================================================================
    // HANYA HOMEPAGE
    // ========================================================================

    if (
      !isHomePage ||
      hasClosedPrompt
    ) {
      setShowPrompt(
        false
      );

      return;
    }

    // ========================================================================
    // IOS
    // ========================================================================

    const isIOSDevice =
      /iphone|ipad|ipod/.test(
        userAgent
      );

    setIsIOS(
      isIOSDevice
    );

    // ========================================================================
    // CHECK MODAL LAIN
    // ========================================================================

    let retryTimer:
      ReturnType<
        typeof setTimeout
      > | null = null;

    const checkAndShow =
      () => {
        /**
         * Jangan timpa modal lain.
         */
        const activeModals =
          document.querySelectorAll(
            ".fixed.inset-0.z-50"
          );

        if (
          activeModals.length ===
            0 &&
          !hasClosedPrompt
        ) {
          setShowPrompt(
            true
          );

          return;
        }

        retryTimer =
          setTimeout(
            checkAndShow,
            1000
          );
      };

    // ========================================================================
    // IOS MANUAL INSTALL
    // ========================================================================

    if (isIOSDevice) {
      const timer =
        setTimeout(
          checkAndShow,
          10000
        );

      return () => {
        clearTimeout(
          timer
        );

        if (
          retryTimer
        ) {
          clearTimeout(
            retryTimer
          );
        }
      };
    }

    // ========================================================================
    // ANDROID / CHROME PWA
    // ========================================================================

    let showTimer:
      ReturnType<
        typeof setTimeout
      > | null = null;

    const handleBeforeInstallPrompt =
      (
        event: Event
      ) => {
        event.preventDefault();

        setDeferredPrompt(
          event as BeforeInstallPromptEvent
        );

        showTimer =
          setTimeout(
            checkAndShow,
            10000
          );
      };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      if (
        showTimer
      ) {
        clearTimeout(
          showTimer
        );
      }

      if (
        retryTimer
      ) {
        clearTimeout(
          retryTimer
        );
      }
    };
  }, [
    isHomePage,
    isStandalonePage,
    hasClosedPrompt,
  ]);

  // ==========================================================================
  // INSTALL CLICK
  // ==========================================================================

  const handleInstallClick =
    async () => {
      // ======================================================================
      // IOS
      // ======================================================================

      if (isIOS) {
        setShowIOSGuide(
          true
        );

        return;
      }

      // ======================================================================
      // CHROME / ANDROID
      // ======================================================================

      if (!deferredPrompt) {
        return;
      }

      try {
        await deferredPrompt.prompt();

        const {
          outcome,
        } =
          await deferredPrompt.userChoice;

        if (
          outcome ===
          "accepted"
        ) {
          console.log(
            "[PWA] Aplikasi berhasil diinstall."
          );
        }
      } catch (
        error
      ) {
        console.error(
          "[PWA] Install error:",
          error
        );
      } finally {
        setDeferredPrompt(
          null
        );

        setShowPrompt(
          false
        );

        setHasClosedPrompt(
          true
        );

        sessionStorage.setItem(
          "pwa_prompt_closed",
          "true"
        );
      }
    };

  // ==========================================================================
  // CLOSE PWA PROMPT
  // ==========================================================================

  const handleClose =
    () => {
      setShowPrompt(
        false
      );

      setShowIOSGuide(
        false
      );

      setHasClosedPrompt(
        true
      );

      sessionStorage.setItem(
        "pwa_prompt_closed",
        "true"
      );
    };

  // ==========================================================================
  // OUTPUT
  // ==========================================================================

  return (
    <>
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}
      {/*
       * Tidak tampil di:
       *
       * /studio
       * /login
       * /register
       * /daftar
       * /auth/*
       */}

      {!isStandalonePage && (
        <Header />
      )}

      {/* ================================================================ */}
      {/* CONTENT */}
      {/* ================================================================ */}

      <main className="flex-grow">
        {children}
      </main>

      {/* ================================================================ */}
      {/* BOTTOM NAVIGATION PLACEHOLDER */}
      {/* ================================================================ */}

      {!isStandalonePage && (
        <nav
          aria-label="Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-lg md:hidden"
        >
          {/* Bottom navigation Anda */}
        </nav>
      )}

      {/* ================================================================ */}
      {/* PWA INSTALL PROMPT */}
      {/* ================================================================ */}

      {isHomePage &&
        !isStandalonePage &&
        showPrompt &&
        !hasClosedPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-300">

            <div className="relative w-full max-w-sm space-y-4 rounded-xl border border-slate-100 bg-white p-6 text-left shadow-xl">

              {/* ========================================================== */}
              {/* CLOSE */}
              {/* ========================================================== */}

              <button
                type="button"
                onClick={
                  handleClose
                }
                className="absolute right-3 top-3 rounded-lg bg-slate-50 p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>

              {/* ========================================================== */}
              {/* ICON */}
              {/* ========================================================== */}

              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-xs">
                <Smartphone className="h-6 w-6" />
              </div>

              {/* ========================================================== */}
              {/* TEXT */}
              {/* ========================================================== */}

              <div className="space-y-1.5 pr-4">

                <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  APLIKASI RESMI
                </span>

                <h2 className="text-base font-bold tracking-tight text-slate-800 sm:text-lg">
                  Install Aplikasi Mukhlasin
                </h2>

                <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                  {showIOSGuide
                    ? "Ketuk ikon Share (Bagikan) di Safari, lalu pilih 'Add to Home Screen' atau 'Tambah ke Layar Utama'."
                    : "Pasang aplikasi mukhlasin.or.id di perangkat Anda untuk akses layanan donasi, infaq, zakat, dan program kebaikan dengan lebih cepat."}
                </p>
              </div>

              {/* ========================================================== */}
              {/* INSTALL BUTTON */}
              {/* ========================================================== */}

              {!showIOSGuide && (
                <button
                  type="button"
                  onClick={
                    handleInstallClick
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-700 hover:shadow sm:text-sm"
                >
                  <Download className="h-4 w-4" />

                  Install Sekarang
                </button>
              )}

            </div>
          </div>
        )}
    </>
  );
}