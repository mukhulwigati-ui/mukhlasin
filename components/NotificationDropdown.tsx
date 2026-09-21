'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Mencegah hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  // ============================================================
  // CEK SESSION USER
  // ============================================================

  useEffect(() => {
    setIsMounted(true);

    const checkUserSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);
      } catch (error) {
        console.error(
          'Gagal memeriksa session user:',
          error
        );

        setUser(null);
      }
    };

    void checkUserSession();
  }, [supabase]);

  // ============================================================
  // TUTUP DROPDOWN SAAT KLIK DI LUAR
  // ============================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  // ============================================================
  // JUMLAH NOTIFIKASI BELUM DIBACA
  // ============================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // ============================================================
  // TANDAI SEMUA SUDAH DIBACA
  // ============================================================

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  // ============================================================
  // RENDER AWAL SEBELUM MOUNTED
  //
  // Warna harus sama dengan render sesudah mounted supaya
  // tidak terjadi perubahan warna / kedipan saat hydration.
  // ============================================================

  if (!isMounted) {
    return (
      <div className="relative inline-block text-left shrink-0">
        <button
          type="button"
          className="relative flex items-center justify-center w-9 h-9 text-slate-900 hover:text-black hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
          aria-label="Notifikasi"
        >
          <Bell
            className="w-5 h-5 text-slate-900"
            strokeWidth={2.2}
          />
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="relative inline-block text-left shrink-0"
      ref={dropdownRef}
    >
      {/* ========================================================
          TOMBOL LONCENG
      ======================================================== */}

      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        className="
          relative
          flex
          items-center
          justify-center
          w-9
          h-9
          text-slate-900
          hover:text-black
          hover:bg-slate-100
          active:bg-slate-200
          rounded-full
          transition-colors
          focus:outline-none
          cursor-pointer
        "
        aria-label="Notifikasi"
        aria-expanded={isOpen}
      >
        {/* ICON LONCENG HITAM */}

        <Bell
          className="w-5 h-5 text-slate-900"
          strokeWidth={2.2}
        />

        {/* BADGE NOTIFIKASI */}

        {unreadCount > 0 && (
          <span
            className="
              absolute
              top-1
              right-1
              w-2.5
              h-2.5
              bg-rose-500
              rounded-full
              ring-2
              ring-white
            "
          />
        )}
      </button>

      {/* ========================================================
          DROPDOWN
      ======================================================== */}

      {isOpen && (
        <div
          className="
            absolute
            right-0
            mt-2
            w-80
            sm:w-96
            bg-white
            border
            border-slate-200
            shadow-2xl
            rounded-2xl
            z-50
            overflow-hidden
            text-left
            animate-in
            fade-in
            slide-in-from-top-2
            duration-200
          "
        >
          {/* ====================================================
              HEADER DROPDOWN
          ==================================================== */}

          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Notifikasi
              </span>

              {unreadCount > 0 && (
                <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />

                  Baca Semua
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ====================================================
              ISI NOTIFIKASI
          ==================================================== */}

          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {!user ? (
              // =================================================
              // BELUM LOGIN
              // =================================================

              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Kamu Belum Masuk
                  </p>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Silakan masuk terlebih dahulu untuk
                    melihat riwayat notifikasi dan status
                    transaksi pribadi Anda.
                  </p>
                </div>

                <Link
                  href="/login"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  className="inline-block w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-xl transition shadow-sm"
                >
                  Masuk Sekarang 🚀
                </Link>
              </div>
            ) : notifications.length === 0 ? (
              // =================================================
              // SUDAH LOGIN TAPI BELUM ADA NOTIFIKASI
              // =================================================

              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada notifikasi saat ini.
              </div>
            ) : (
              // =================================================
              // DAFTAR NOTIFIKASI
              // =================================================

              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`
                    p-3.5
                    transition-colors
                    hover:bg-slate-50
                    flex
                    gap-3
                    ${
                      !item.read
                        ? 'bg-sky-50/40'
                        : ''
                    }
                  `}
                >
                  <div
                    className={`
                      w-2
                      h-2
                      mt-1.5
                      rounded-full
                      shrink-0
                      ${
                        !item.read
                          ? 'bg-sky-600'
                          : 'bg-transparent'
                      }
                    `}
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.title}
                      </h4>

                      <span className="text-[9px] text-slate-400 shrink-0">
                        {item.date}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ====================================================
              FOOTER DROPDOWN
          ==================================================== */}

          {user && (
            <div className="bg-slate-50 border-t border-slate-100 p-2 text-center">
              <Link
                href="/notifikasi"
                onClick={() =>
                  setIsOpen(false)
                }
                className="text-[11px] font-bold text-[#0d5c91] hover:underline flex items-center justify-center gap-1 py-1"
              >
                Lihat Semua Notifikasi

                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}