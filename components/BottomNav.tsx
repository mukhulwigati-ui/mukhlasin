// components/BottomNav.tsx

"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  Home,
  HeartHandshake,
  Newspaper,
  User,
  X,
} from "lucide-react";

import {
  createBrowserClient,
} from "@supabase/ssr";

// ============================================================================
// TYPES
// ============================================================================

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiresAuth?: boolean;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function BottomNav() {
  const pathname =
    usePathname();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [
    showLoginModal,
    setShowLoginModal,
  ] =
    useState(false);

  const [
    pendingHref,
    setPendingHref,
  ] =
    useState("/akun");

  const [
    checkingAuth,
    setCheckingAuth,
  ] =
    useState(false);

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
  // ROUTE FLAGS
  // ==========================================================================

  /**
   * BottomNav TIDAK BOLEH muncul pada halaman:
   *
   * - login
   * - register
   * - auth callback
   * - Sanity Studio
   * - detail campaign
   *
   * Ini yang memperbaiki modal login menempel di /login.
   */
  const isHiddenRoute =
    !pathname ||
    pathname.startsWith(
      "/campaign/"
    ) ||
    pathname.startsWith(
      "/studio"
    ) ||
    pathname ===
      "/login" ||
    pathname.startsWith(
      "/login/"
    ) ||
    pathname ===
      "/register" ||
    pathname.startsWith(
      "/register/"
    ) ||
    pathname ===
      "/daftar" ||
    pathname.startsWith(
      "/daftar/"
    ) ||
    pathname.startsWith(
      "/auth/"
    );

  // ==========================================================================
  // TUTUP MODAL SETIAP PATH BERUBAH
  // ==========================================================================

  useEffect(() => {
    setShowLoginModal(
      false
    );
  }, [
    pathname,
  ]);

  // ==========================================================================
  // NAV ITEMS
  // ==========================================================================

  const navItems:
    NavItem[] = [
    {
      label:
        "Home",

      href:
        "/",

      icon:
        Home,
    },

    {
      label:
        "Donasi Saya",

      href:
        "/donasi-saya",

      icon:
        HeartHandshake,

      requiresAuth:
        true,
    },

    {
      label:
        "Berita",

      href:
        "/blog",

      icon:
        Newspaper,

      badge:
        "21.8k",
    },

    {
      label:
        "Akun",

      href:
        "/akun",

      icon:
        User,

      requiresAuth:
        true,
    },
  ];

  // ==========================================================================
  // PROTECTED NAV CLICK
  // ==========================================================================

  const handleNavClick =
    async (
      event:
        React.MouseEvent<HTMLAnchorElement>,

      item:
        NavItem
    ) => {
      // Route publik langsung jalan
      if (
        !item.requiresAuth
      ) {
        return;
      }

      // Hindari double click
      if (
        checkingAuth
      ) {
        event.preventDefault();

        return;
      }

      setCheckingAuth(
        true
      );

      try {
        const {
          data: {
            user,
          },
          error,
        } =
          await supabase.auth.getUser();

        // ================================================================
        // USER SUDAH LOGIN
        // ================================================================

        if (
          !error &&
          user
        ) {
          /**
           * Jangan preventDefault.
           *
           * Link akan berjalan normal.
           * Proxy Next.js juga akan melakukan
           * pengecekan ulang di server.
           */
          return;
        }

        // ================================================================
        // BELUM LOGIN
        // ================================================================

        event.preventDefault();

        setPendingHref(
          item.href
        );

        setShowLoginModal(
          true
        );
      } catch (
        error
      ) {
        console.error(
          "[BOTTOM NAV] Auth check error:",
          error
        );

        event.preventDefault();

        setPendingHref(
          item.href
        );

        setShowLoginModal(
          true
        );
      } finally {
        setCheckingAuth(
          false
        );
      }
    };

  // ==========================================================================
  // HIDDEN ROUTE
  // ==========================================================================

  if (
    isHiddenRoute
  ) {
    return null;
  }

  // ==========================================================================
  // LOGIN URL
  // ==========================================================================

  const loginUrl =
    `/login?next=${encodeURIComponent(
      pendingHref ||
        "/akun"
    )}`;

  // ==========================================================================
  // OUTPUT
  // ==========================================================================

  return (
    <>
      {/* ================================================================ */}
      {/* BOTTOM NAV */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center">

        <nav className="pointer-events-auto flex w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] items-center justify-around border-x border-t border-slate-200 bg-white px-1 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">

          {navItems.map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              const isActive =
                pathname ===
                  item.href ||
                (
                  item.href !==
                    "/" &&
                  pathname.startsWith(
                    `${item.href}/`
                  )
                );

              return (
                <Link
                  key={
                    `${item.href}-${index}`
                  }
                  href={
                    item.href
                  }
                  onClick={(
                    event
                  ) =>
                    handleNavClick(
                      event,
                      item
                    )
                  }
                  className={`flex w-full flex-col items-center justify-center py-1 transition-colors ${
                    isActive
                      ? "text-emerald-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <div className="relative">

                    <Icon
                      className="h-5 w-5"
                      strokeWidth={
                        isActive
                          ? 2.5
                          : 1.8
                      }
                    />

                    {item.badge && (
                      <span className="absolute -right-3.5 -top-1 rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">
                        {
                          item.badge
                        }
                      </span>
                    )}

                  </div>

                  <span className="mt-0.5 text-[11px] font-normal tracking-tight">
                    {
                      item.label
                    }
                  </span>
                </Link>
              );
            }
          )}

        </nav>
      </div>

      {/* ================================================================ */}
      {/* LOGIN REQUIRED MODAL */}
      {/* ================================================================ */}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">

          <div className="relative w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] border border-gray-200 bg-white p-6 text-center shadow-2xl">

            {/* ========================================================== */}
            {/* CLOSE */}
            {/* ========================================================== */}

            <button
              type="button"
              onClick={() =>
                setShowLoginModal(
                  false
                )
              }
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-700"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ========================================================== */}
            {/* CONTENT */}
            {/* ========================================================== */}

            <div className="flex flex-col items-center">

              <img
                src="/images/empty.svg"
                alt="Login diperlukan"
                className="mb-4 h-48 w-48 object-contain"
              />

              <p className="mb-6 px-2 text-xs font-medium leading-relaxed text-slate-800 sm:text-sm">
                Kamu belum masuk. Silakan login untuk melanjutkan.
              </p>

              {/* ======================================================== */}
              {/* LOGIN */}
              {/* ======================================================== */}

              <Link
                href={
                  loginUrl
                }
                onClick={() =>
                  setShowLoginModal(
                    false
                  )
                }
                className="w-full rounded-full bg-[#0d5c91] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-sky-900"
              >
                MASUK
              </Link>

            </div>
          </div>
        </div>
      )}
    </>
  );
}