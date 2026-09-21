'use client';

import React from 'react';

export default function AkunPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f6] text-slate-900 pb-32 pt-2 px-4 max-w-md mx-auto w-full shadow-sm">
      <div className="w-full space-y-3">

        {/* =========================================================
            HEADER PROFILE
        ========================================================= */}
        <section className="relative overflow-hidden rounded-none bg-[#102a43] p-5 shadow-[0_18px_45px_rgba(16,42,67,0.16)]">
          <div className="relative z-10 flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-white/20 overflow-hidden flex items-center justify-center text-xl font-bold text-slate-700">
              U
            </div>
            <div className="flex-1 text-white">
              <h1 className="text-lg font-bold">Nama Pengguna</h1>
              <p className="text-xs text-slate-300">user@email.com</p>
            </div>
          </div>
        </section>

        {/* =========================================================
            MENU SECTION
        ========================================================= */}
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Pengaturan Akun</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition">
              Edit Profil
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition">
              Keamanan & Sandi
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition">
              Bantuan & Dukungan
            </button>
          </div>
        </section>

        {/* =========================================================
            LOGOUT SECTION
        ========================================================= */}
        <section className="pt-2">
          <button className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition">
            Keluar (Logout)
          </button>
        </section>

      </div>
    </div>
  );
}