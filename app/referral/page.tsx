"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

import {
  ArrowLeft,
  Copy,
  Check,
  TrendingUp,
  Loader2,
  Search,
  Lock,
  Wallet,
  Users,
  ExternalLink,
  ChevronDown,
  Banknote,
  Clock3,
  History,
  Landmark,
  RefreshCw,
  Share2,
  ShieldCheck,
  XCircle,
  CircleDollarSign,
  HandCoins,
  X,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type Profile = {
  id?: string;
  name?: string;
  full_name?: string;
  phone?: string;

  bank_name?: string;
  account_name?: string;
  account_number?: string;
};

type Program = {
  _id?: string;
  title?: string;
  slug?: string;
};

type DonationHistory = {
  _id?: string;
  donorName?: string;
  amount?: number;
  programTitle?: string;
  createdAt?: string;
  paidAt?: string;
};

type WithdrawalStatus =
  | "pending"
  | "approved"
  | "paid"
  | "completed"
  | "rejected"
  | "cancelled";

type WithdrawalHistory = {
  _id?: string;

  amount?: number;

  status?: WithdrawalStatus;

  requestedAt?: string;
  processedAt?: string;
  paidAt?: string;

  bankName?: string;
  accountName?: string;
  accountNumber?: string;

  referenceNumber?: string;

  note?: string;
  adminNote?: string;
};

type FundraiserStats = {
  success?: boolean;

  profile?: {
    name?: string;
    status?: string;

    feePaid?: number;

    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };

  totalEarnings?: number;
  donationCount?: number;

  totalCommission?: number;
  totalWithdrawn?: number;

  pendingWithdrawal?: number;
  availableCommission?: number;

  commissionRate?: number;

  history?: DonationHistory[];

  withdrawals?: WithdrawalHistory[];

  withdrawalConfig?: {
    enabled?: boolean;
    minimum?: number;
    maximum?: number;
  };
};

// ============================================================================
// HELPERS
// ============================================================================

function rupiah(value?: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function cleanPhone(value?: string) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function withdrawalStatus(status?: WithdrawalStatus) {
  switch (status) {
    case "paid":
    case "completed":
      return {
        label: "Sudah Dibayar",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        Icon: Check,
      };

    case "approved":
      return {
        label: "Disetujui",
        className:
          "border-blue-200 bg-blue-50 text-blue-700",
        Icon: ShieldCheck,
      };

    case "rejected":
      return {
        label: "Ditolak",
        className:
          "border-red-200 bg-red-50 text-red-700",
        Icon: XCircle,
      };

    case "cancelled":
      return {
        label: "Dibatalkan",
        className:
          "border-slate-200 bg-slate-50 text-slate-600",
        Icon: X,
      };

    default:
      return {
        label: "Menunggu",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        Icon: Clock3,
      };
  }
}

// ============================================================================
// PAGE
// ============================================================================

export default function ReferralPage() {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [stats, setStats] =
    useState<FundraiserStats | null>(null);

  const [allPrograms, setAllPrograms] =
    useState<Program[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [statsLoading, setStatsLoading] =
    useState(false);

  const [selectedSlug, setSelectedSlug] =
    useState("");

  const [searchProgram, setSearchProgram] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [activeHistory, setActiveHistory] =
    useState<"donations" | "withdrawals">(
      "donations"
    );

  // ==========================================================================
  // WITHDRAWAL
  // ==========================================================================

  const [
    showWithdrawalForm,
    setShowWithdrawalForm,
  ] = useState(false);

  const [
    withdrawalAmount,
    setWithdrawalAmount,
  ] = useState("");

  const [
    withdrawalNote,
    setWithdrawalNote,
  ] = useState("");

  const [
    withdrawalLoading,
    setWithdrawalLoading,
  ] = useState(false);

  const [
    withdrawalError,
    setWithdrawalError,
  ] = useState("");

  const [
    withdrawalSuccess,
    setWithdrawalSuccess,
  ] = useState("");

  // ==========================================================================
  // SUPABASE
  // ==========================================================================

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // ==========================================================================
  // LOAD STATS
  // ==========================================================================

  const loadStats = useCallback(
    async (phone: string) => {
      if (!phone) {
        return;
      }

      setStatsLoading(true);

      try {
        const response = await fetch(
          `/api/fundraiser/stats?phone=${encodeURIComponent(
            phone
          )}&t=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

        const json =
          await response.json();

        if (
          response.ok &&
          json.success
        ) {
          setStats(json);
        } else {
          setStats({
            totalEarnings: 0,
            donationCount: 0,

            history: [],
            withdrawals: [],

            totalCommission: 0,
            totalWithdrawn: 0,
            pendingWithdrawal: 0,
            availableCommission: 0,
          });
        }
      } catch (error) {
        console.error(
          "[REFERRAL] Stats error:",
          error
        );

        setStats({
          totalEarnings: 0,
          donationCount: 0,

          history: [],
          withdrawals: [],

          totalCommission: 0,
          totalWithdrawn: 0,
          pendingWithdrawal: 0,
          availableCommission: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    },
    []
  );

  // ==========================================================================
  // SYNC FUNDRAISER SUPABASE -> SANITY
  // ==========================================================================
  //
  // User yang sudah login dan memiliki nomor WhatsApp otomatis
  // dibuat / diperbarui sebagai fundraiser di Sanity.
  //
  // Identitas user tidak dikirim dari browser. Endpoint sync
  // membaca user aktif langsung dari session Supabase.
  //
  // ==========================================================================

  const syncFundraiser = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/fundraiser/sync",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

        const json =
          await response.json();

        if (
          !response.ok ||
          !json.success
        ) {
          console.warn(
            "[REFERRAL] Fundraiser sync gagal:",
            json
          );

          return false;
        }

        return true;
      } catch (error) {
        console.error(
          "[REFERRAL] Fundraiser sync error:",
          error
        );

        return false;
      }
    },
    []
  );

  // ==========================================================================
  // INITIAL LOAD
  // ==========================================================================

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        setLoading(true);

        // ================================================================
        // 1. USER LOGIN
        // ================================================================

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          console.error(
            "[REFERRAL] Auth error:",
            authError
          );
        }

        // ================================================================
        // 2. PROFILE SUPABASE
        // ================================================================

        if (user) {
          const {
            data: prof,
            error: profileError,
          } =
            await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

          if (profileError) {
            console.error(
              "[REFERRAL] Profile error:",
              profileError
            );
          }

          if (
            active &&
            prof
          ) {
            setProfile(prof);
          }

          // ==============================================================
          // 3. NOMOR WA ADA -> OTOMATIS SYNC KE SANITY
          // ==============================================================
          //
          // Alur:
          //
          // Supabase profile
          //      ↓
          // /api/fundraiser/sync
          //      ↓
          // Sanity _type = fundraiser
          //      ↓
          // ambil statistik terbaru
          //
          // ==============================================================

          if (
            active &&
            prof?.phone
          ) {
            await syncFundraiser();

            if (active) {
              await loadStats(
                prof.phone
              );
            }
          } else if (active) {
            setStats({
              totalEarnings: 0,
              donationCount: 0,

              history: [],
              withdrawals: [],

              totalCommission: 0,
              totalWithdrawn: 0,
              pendingWithdrawal: 0,
              availableCommission: 0,
            });
          }
        }

        // ================================================================
        // 4. PROGRAM DONASI
        // ================================================================

        const programResponse =
          await fetch(
            `/api/programs?t=${Date.now()}`,
            {
              cache: "no-store",
            }
          );

        const programJson =
          await programResponse.json();

        if (
          active &&
          programJson.success &&
          Array.isArray(
            programJson.data
          )
        ) {
          setAllPrograms(
            programJson.data
          );
        }
      } catch (error) {
        console.error(
          "[REFERRAL] Load error:",
          error
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      active = false;
    };
  }, [
    supabase,
    loadStats,
    syncFundraiser,
  ]);

  // ==========================================================================
  // COPY
  // ==========================================================================

  const handleCopy = async (
    text: string
  ) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Gagal menyalin link:",
        error
      );
    }
  };

  // ==========================================================================
  // VALUES
  // ==========================================================================

  const hasPhone =
    Boolean(
      profile?.phone &&
        profile.phone.trim().length >=
          9
    );

  const phone =
    hasPhone
      ? profile!.phone!
      : "";

  const cleanedPhone =
    cleanPhone(phone);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const defaultReferralLink =
    hasPhone
      ? `${baseUrl}/?ref=${cleanedPhone}`
      : "";

  const filteredPrograms =
    allPrograms.filter(
      (program) =>
        (
          program.title || ""
        )
          .toLowerCase()
          .includes(
            searchProgram.toLowerCase()
          )
    );

  const totalEarnings =
    Number(
      stats?.totalEarnings || 0
    );

  const donationCount =
    Number(
      stats?.donationCount || 0
    );

  // ==========================================================================
  // COMMISSION
  // ==========================================================================

  const commissionRate =
    Number(
      stats?.commissionRate ??
        0.1
    );

  /**
   * Support API baru.
   * Kalau API masih lama,
   * fallback ke 10%.
   */
  const totalCommission =
    Number(
      stats?.totalCommission ??
        Math.round(
          totalEarnings *
            commissionRate
        )
    );

  /**
   * Support feePaid lama.
   */
  const totalWithdrawn =
    Number(
      stats?.totalWithdrawn ??
        stats?.profile?.feePaid ??
        0
    );

  const pendingWithdrawal =
    Number(
      stats?.pendingWithdrawal ??
        0
    );

  const availableCommission =
    Number(
      stats?.availableCommission ??
        Math.max(
          0,
          totalCommission -
            totalWithdrawn -
            pendingWithdrawal
        )
    );

  const withdrawals =
    Array.isArray(
      stats?.withdrawals
    )
      ? stats!.withdrawals!
      : [];

  const donationHistory =
    Array.isArray(
      stats?.history
    )
      ? stats!.history!
      : [];

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const handleRefresh = async () => {
    if (!phone) {
      return;
    }

    try {
      // Sinkronkan profil fundraiser terlebih dahulu
      await syncFundraiser();

      // Kemudian ambil statistik terbaru
      await loadStats(phone);
    } catch (error) {
      console.error(
        "[REFERRAL] Refresh error:",
        error
      );
    }
  };

  // ==========================================================================
  // SHARE WA
  // ==========================================================================

  const handleWhatsAppShare = (
    url: string
  ) => {
    if (!url) return;

    const program =
      allPrograms.find(
        (item) =>
          item.slug ===
          selectedSlug
      );

    const text = [
      program?.title
        ? `Mari ikut mendukung program "${program.title}".`
        : "Mari ikut mendukung program kebaikan ini.",
      "",
      url,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`,
      "_blank"
    );
  };

  // ==========================================================================
  // WITHDRAW
  // ==========================================================================

  const handleWithdrawal =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setWithdrawalError("");
      setWithdrawalSuccess("");

      const amount =
        Number(
          withdrawalAmount.replace(
            /[^0-9]/g,
            ""
          )
        );

      if (
        !amount ||
        amount <= 0
      ) {
        setWithdrawalError(
          "Masukkan nominal penarikan yang benar."
        );
        return;
      }

      const minimum =
        Number(
          stats?.withdrawalConfig
            ?.minimum ||
            0
        );

      if (
        minimum > 0 &&
        amount < minimum
      ) {
        setWithdrawalError(
          `Minimal penarikan ${rupiah(
            minimum
          )}.`
        );
        return;
      }

      if (
        amount >
        availableCommission
      ) {
        setWithdrawalError(
          "Nominal penarikan melebihi saldo komisi tersedia."
        );
        return;
      }

      setWithdrawalLoading(true);

      try {
        const response =
          await fetch(
            "/api/fundraiser/withdraw",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                // Phone sengaja tidak dikirim.
                // API mengambil identitas fundraiser dari session Supabase.
                amount,

                note:
                  withdrawalNote.trim(),
              }),
            }
          );

        const json =
          await response.json();

        if (
          !response.ok ||
          !json.success
        ) {
          setWithdrawalError(
            json.message ||
              "Pengajuan penarikan gagal."
          );

          return;
        }

        setWithdrawalSuccess(
          json.message ||
            "Pengajuan penarikan berhasil dikirim."
        );

        setWithdrawalAmount("");
        setWithdrawalNote("");

        // Pastikan profil fundraiser di Sanity tetap sinkron
        await syncFundraiser();

        // Ambil saldo dan history terbaru
        await loadStats(phone);

        setActiveHistory(
          "withdrawals"
        );
      } catch (error) {
        console.error(
          "[REFERRAL] Withdraw error:",
          error
        );

        setWithdrawalError(
          "Terjadi gangguan saat mengirim pengajuan penarikan."
        );
      } finally {
        setWithdrawalLoading(
          false
        );
      }
    };

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[#f7f8fa]">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-3">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b2742] shadow-lg">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Memuat pusat fundraiser
            </span>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // OUTPUT
  // ==========================================================================

  return (
    <main className="min-h-screen w-full bg-[#f7f8fa] pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-md space-y-3 px-3 pt-3">

        {/* ================================================================ */}
        {/* HEADER */}
        {/* ================================================================ */}

        <header className="flex w-full items-center justify-between gap-3 bg-white px-3 py-3 shadow-sm">
          <Link
            href="/akun"
            aria-label="Kembali ke akun"
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white transition hover:border-slate-300"
          >
            <ArrowLeft className="h-[17px] w-[17px] text-slate-600 transition group-hover:-translate-x-0.5" />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Fundraiser Center
            </p>

            <h1 className="truncate text-[15px] font-bold tracking-tight text-[#102a43]">
              Afiliasi & Komisi
            </h1>
          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
            disabled={
              statsLoading
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#102a43] shadow-sm disabled:opacity-50"
          >
            <RefreshCw
              className={`h-[16px] w-[16px] text-[#d8b76a] ${
                statsLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </header>

        {/* ================================================================ */}
        {/* HERO */}
        {/* ================================================================ */}

        <section className="relative w-full overflow-hidden bg-[#102a43] p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full border border-[#d8b76a]/20" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8b76a]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e8d7aa]">
                Fundraiser islami.or.id
              </span>
            </div>

            <h2 className="mt-5 text-[22px] font-bold leading-[1.2] tracking-tight text-white">
              Sebarkan Kebaikan.
              <br />
              Pantau Hasilnya.
            </h2>

            <p className="mt-3 max-w-[300px] text-[11px] leading-[1.8] text-slate-300">
              Bagikan campaign melalui
              link referral Anda,
              pantau donasi dan kelola
              pencairan komisi secara
              transparan.
            </p>
          </div>
        </section>

        {/* ================================================================ */}
        {/* LOCKED */}
        {/* ================================================================ */}

        {!hasPhone ? (
          <section className="w-full border border-slate-200/70 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#f0dfb5] bg-[#fff8e8]">
              <Lock className="h-6 w-6 text-[#b4862c]" />
            </div>

            <h2 className="mt-4 text-[14px] font-bold text-[#102a43]">
              Aktivasi Fundraiser
              Diperlukan
            </h2>

            <p className="mx-auto mt-2 max-w-[280px] text-[11px] leading-[1.7] text-slate-500">
              Lengkapi nomor WhatsApp
              untuk mengaktifkan link
              fundraiser pribadi.
            </p>

            <Link
              href="/pengaturan"
              className="mt-5 inline-flex items-center justify-center bg-[#102a43] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
            >
              Lengkapi Sekarang
            </Link>
          </section>
        ) : (
          <>
            {/* ============================================================ */}
            {/* PERFORMANCE */}
            {/* ============================================================ */}

            {statsLoading ? (
              <section className="w-full border border-slate-200/70 bg-white p-6 text-center shadow-sm">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#102a43]" />

                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Mengambil performa
                </p>
              </section>
            ) : (
              <>
                {/* ======================================================== */}
                {/* SUMMARY */}
                {/* ======================================================== */}

                <section className="grid grid-cols-2 gap-2">
                  <MiniStat
                    icon={
                      <Wallet className="h-4 w-4" />
                    }
                    label="Dana Dihimpun"
                    value={
                      rupiah(
                        totalEarnings
                      )
                    }
                  />

                  <MiniStat
                    icon={
                      <Users className="h-4 w-4" />
                    }
                    label="Donasi Sukses"
                    value={String(
                      donationCount
                    )}
                  />

                  <MiniStat
                    icon={
                      <CircleDollarSign className="h-4 w-4" />
                    }
                    label="Total Komisi"
                    value={
                      rupiah(
                        totalCommission
                      )
                    }
                  />

                  <MiniStat
                    icon={
                      <Banknote className="h-4 w-4" />
                    }
                    label="Sudah Dicairkan"
                    value={
                      rupiah(
                        totalWithdrawn
                      )
                    }
                  />
                </section>

                {/* ======================================================== */}
                {/* AVAILABLE BALANCE */}
                {/* ======================================================== */}

                <section className="overflow-hidden border border-[#e9e3d4] bg-[#f8f7f3] shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9b7528]">
                          Saldo Komisi
                        </p>

                        <p className="mt-2 text-[24px] font-black tracking-tight text-[#102a43]">
                          {rupiah(
                            availableCommission
                          )}
                        </p>

                        {pendingWithdrawal >
                          0 && (
                          <p className="mt-1.5 text-[9px] font-medium text-amber-700">
                            {rupiah(
                              pendingWithdrawal
                            )}{" "}
                            sedang diproses
                          </p>
                        )}
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#9b7528] shadow-sm">
                        <HandCoins className="h-5 w-5" />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        availableCommission <=
                          0 ||
                        stats
                          ?.withdrawalConfig
                          ?.enabled ===
                          false
                      }
                      onClick={() => {
                        setShowWithdrawalForm(
                          (prev) =>
                            !prev
                        );

                        setWithdrawalError(
                          ""
                        );

                        setWithdrawalSuccess(
                          ""
                        );
                      }}
                      className="mt-4 flex w-full items-center justify-center gap-2 bg-[#102a43] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Landmark className="h-4 w-4" />

                      Ajukan Penarikan
                    </button>
                  </div>

                  {/* ====================================================== */}
                  {/* WITHDRAW FORM */}
                  {/* ====================================================== */}

                  {showWithdrawalForm && (
                    <form
                      onSubmit={
                        handleWithdrawal
                      }
                      className="border-t border-[#e9e3d4] bg-white p-4"
                    >
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Nominal Penarikan
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 100000"
                        value={
                          withdrawalAmount
                        }
                        onChange={(
                          event
                        ) =>
                          setWithdrawalAmount(
                            event.target.value.replace(
                              /[^0-9]/g,
                              ""
                            )
                          )
                        }
                        className="mt-2 w-full border border-slate-200 bg-[#f7f8fa] px-3.5 py-3 text-[12px] font-bold text-slate-700 outline-none focus:border-[#9b7528]"
                      />

                      {Number(
                        stats
                          ?.withdrawalConfig
                          ?.minimum ||
                          0
                      ) > 0 && (
                        <p className="mt-1.5 text-[9px] text-slate-400">
                          Minimal penarikan{" "}
                          {rupiah(
                            stats
                              ?.withdrawalConfig
                              ?.minimum
                          )}
                        </p>
                      )}

                      <label className="mt-4 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Catatan
                      </label>

                      <textarea
                        rows={3}
                        placeholder="Opsional"
                        value={
                          withdrawalNote
                        }
                        onChange={(
                          event
                        ) =>
                          setWithdrawalNote(
                            event.target.value
                          )
                        }
                        className="mt-2 w-full resize-none border border-slate-200 bg-[#f7f8fa] px-3.5 py-3 text-[10px] text-slate-700 outline-none focus:border-[#9b7528]"
                      />

                      {withdrawalError && (
                        <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] font-medium text-red-700">
                          {
                            withdrawalError
                          }
                        </div>
                      )}

                      {withdrawalSuccess && (
                        <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] font-medium text-emerald-700">
                          {
                            withdrawalSuccess
                          }
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowWithdrawalForm(
                              false
                            )
                          }
                          className="border border-slate-200 bg-white px-3 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-500"
                        >
                          Batal
                        </button>

                        <button
                          type="submit"
                          disabled={
                            withdrawalLoading
                          }
                          className="flex items-center justify-center gap-2 bg-[#9b7528] px-3 py-3 text-[9px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                        >
                          {withdrawalLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Mengirim
                            </>
                          ) : (
                            <>
                              <Banknote className="h-3.5 w-3.5" />
                              Kirim
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </>
            )}

            {/* ============================================================ */}
            {/* REFERRAL TOOLS */}
            {/* ============================================================ */}

            <section className="w-full border border-slate-200/70 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Referral Tools
                  </p>

                  <h2 className="mt-1 text-[14px] font-bold text-[#102a43]">
                    Tautan Fundraiser
                  </h2>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f6f8]">
                  <ExternalLink className="h-4 w-4 text-[#102a43]" />
                </div>
              </div>

              <div className="p-4">
                {/* ======================================================== */}
                {/* GENERAL */}
                {/* ======================================================== */}

                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Tautan Umum
                </label>

                <div className="mt-2 flex items-center border border-slate-200 bg-[#f7f8fa]">
                  <input
                    type="text"
                    readOnly
                    value={
                      defaultReferralLink
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[10px] font-mono text-slate-600 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        defaultReferralLink
                      )
                    }
                    className={`flex shrink-0 items-center gap-1.5 px-3.5 py-3 text-[9px] font-bold text-white ${
                      copied
                        ? "bg-emerald-600"
                        : "bg-[#102a43]"
                    }`}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}

                    {copied
                      ? "Tersalin"
                      : "Salin"}
                  </button>
                </div>

                {/* ======================================================== */}
                {/* CAMPAIGN */}
                {/* ======================================================== */}

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Campaign Spesifik
                  </label>

                  <div className="relative mt-2">
                    <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="search"
                      placeholder="Cari campaign..."
                      value={
                        searchProgram
                      }
                      onChange={(
                        event
                      ) =>
                        setSearchProgram(
                          event.target.value
                        )
                      }
                      className="w-full border border-slate-200 bg-[#f7f8fa] py-3 pl-10 pr-3 text-[10px] font-medium text-slate-700 outline-none focus:border-[#9b7528]"
                    />
                  </div>

                  <div className="relative mt-2">
                    <select
                      value={
                        selectedSlug
                      }
                      onChange={(
                        event
                      ) => {
                        setSelectedSlug(
                          event.target.value
                        );

                        setCopied(
                          false
                        );
                      }}
                      className="w-full appearance-none border border-slate-200 bg-[#f7f8fa] px-3.5 py-3 pr-10 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#9b7528]"
                    >
                      <option value="">
                        Pilih dari{" "}
                        {
                          filteredPrograms.length
                        }{" "}
                        campaign
                      </option>

                      {filteredPrograms.map(
                        (
                          program,
                          index
                        ) => (
                          <option
                            key={
                              program._id ||
                              index
                            }
                            value={
                              program.slug ||
                              ""
                            }
                          >
                            {
                              program.title
                            }
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>

                  {selectedSlug &&
                    (() => {
                      const affiliateUrl =
                        `${baseUrl}/campaign/${selectedSlug}?ref=${cleanedPhone}`;

                      return (
                        <div className="mt-3 border border-[#eee9dc] bg-[#f8f7f3]">
                          <div className="p-3">
                            <p className="break-all font-mono text-[9px] leading-relaxed text-slate-500">
                              {
                                affiliateUrl
                              }
                            </p>
                          </div>

                          <div className="grid grid-cols-2 border-t border-[#eee9dc]">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  affiliateUrl
                                )
                              }
                              className="flex items-center justify-center gap-1.5 border-r border-[#eee9dc] bg-white px-3 py-3 text-[9px] font-bold text-[#102a43]"
                            >
                              <Copy className="h-3.5 w-3.5" />

                              Salin
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleWhatsAppShare(
                                  affiliateUrl
                                )
                              }
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 px-3 py-3 text-[9px] font-bold text-white"
                            >
                              <Share2 className="h-3.5 w-3.5" />

                              WhatsApp
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* HISTORY */}
            {/* ============================================================ */}

            <section className="w-full overflow-hidden border border-slate-200/70 bg-white shadow-sm">

              {/* TABS */}

              <div className="grid grid-cols-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setActiveHistory(
                      "donations"
                    )
                  }
                  className={`flex items-center justify-center gap-2 py-3.5 text-[9px] font-bold uppercase tracking-wider ${
                    activeHistory ===
                    "donations"
                      ? "border-b-2 border-[#102a43] bg-slate-50 text-[#102a43]"
                      : "text-slate-400"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />

                  Donasi
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveHistory(
                      "withdrawals"
                    )
                  }
                  className={`flex items-center justify-center gap-2 py-3.5 text-[9px] font-bold uppercase tracking-wider ${
                    activeHistory ===
                    "withdrawals"
                      ? "border-b-2 border-[#9b7528] bg-[#fbfaf6] text-[#9b7528]"
                      : "text-slate-400"
                  }`}
                >
                  <History className="h-3.5 w-3.5" />

                  Penarikan

                  {withdrawals.length >
                    0 && (
                    <span className="rounded-full bg-[#f0e6cf] px-1.5 py-0.5 text-[8px]">
                      {
                        withdrawals.length
                      }
                    </span>
                  )}
                </button>
              </div>

              {/* ========================================================== */}
              {/* DONATION HISTORY */}
              {/* ========================================================== */}

              {activeHistory ===
              "donations" ? (
                donationHistory.length >
                0 ? (
                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {donationHistory.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item._id ||
                            index
                          }
                          className="flex items-center gap-3 px-4 py-4"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold text-slate-800">
                              {item.donorName ||
                                "Hamba Allah"}
                            </p>

                            <p className="mt-1 truncate text-[9px] text-slate-400">
                              {item.programTitle ||
                                "Sedekah Umum"}
                            </p>

                            {(item.paidAt ||
                              item.createdAt) && (
                              <p className="mt-1 text-[8px] text-slate-400">
                                {formatDate(
                                  item.paidAt ||
                                    item.createdAt
                                )}
                              </p>
                            )}
                          </div>

                          <p className="shrink-0 text-[11px] font-bold text-emerald-600">
                            +
                            {rupiah(
                              item.amount
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyHistory
                    icon={
                      <Wallet className="h-5 w-5" />
                    }
                    title="Belum ada donasi"
                    description="Donasi dari tautan fundraiser Anda akan muncul di sini."
                  />
                )
              ) : withdrawals.length >
                0 ? (
                // ==========================================================
                // WITHDRAWAL HISTORY
                // ==========================================================

                <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {withdrawals.map(
                    (
                      item,
                      index
                    ) => {
                      const status =
                        withdrawalStatus(
                          item.status
                        );

                      const StatusIcon =
                        status.Icon;

                      return (
                        <div
                          key={
                            item._id ||
                            index
                          }
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-black text-[#102a43]">
                                {rupiah(
                                  item.amount
                                )}
                              </p>

                              <p className="mt-1 text-[8px] text-slate-400">
                                {
                                  formatDate(
                                    item.requestedAt
                                  )
                                }
                              </p>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 border px-2 py-1 text-[8px] font-bold uppercase tracking-wide ${status.className}`}
                            >
                              <StatusIcon className="h-3 w-3" />

                              {
                                status.label
                              }
                            </span>
                          </div>

                          {(item.bankName ||
                            item.accountNumber ||
                            item.referenceNumber ||
                            item.adminNote) && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[9px] text-slate-500">
                              {(item.bankName ||
                                item.accountNumber) && (
                                <p>
                                  Rekening:{" "}
                                  <strong className="text-slate-700">
                                    {item.bankName ||
                                      "-"}{" "}
                                    {item.accountNumber ||
                                      ""}
                                  </strong>
                                </p>
                              )}

                              {item.paidAt && (
                                <p>
                                  Dibayar:{" "}
                                  <strong className="text-slate-700">
                                    {formatDate(
                                      item.paidAt
                                    )}
                                  </strong>
                                </p>
                              )}

                              {item.referenceNumber && (
                                <p>
                                  Referensi:{" "}
                                  <strong className="font-mono text-slate-700">
                                    {
                                      item.referenceNumber
                                    }
                                  </strong>
                                </p>
                              )}

                              {item.adminNote && (
                                <p>
                                  Keterangan:{" "}
                                  {
                                    item.adminNote
                                  }
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <EmptyHistory
                  icon={
                    <Landmark className="h-5 w-5" />
                  }
                  title="Belum ada penarikan"
                  description="Pengajuan dan riwayat pencairan komisi akan muncul di sini."
                />
              )}
            </section>

            {/* ============================================================ */}
            {/* FOOTNOTE */}
            {/* ============================================================ */}

            <div className="px-4 pb-2 pt-1 text-center">
              <p className="text-[8px] leading-relaxed text-slate-400">
                Komisi dihitung dari
                donasi sukses yang masuk
                melalui tautan fundraiser
                Anda.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ============================================================================
// MINI STAT
// ============================================================================

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[8px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-3 break-words text-[15px] font-black tracking-tight text-[#102a43]">
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// EMPTY
// ============================================================================

function EmptyHistory({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-[250px] text-[9px] leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}