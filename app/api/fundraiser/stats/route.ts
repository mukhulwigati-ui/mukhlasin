// app/api/fundraiser/stats/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ==========================================================
// KONFIGURASI
// ==========================================================

const DEFAULT_COMMISSION_RATE = 0.1; // 10%

const MINIMUM_WITHDRAWAL = Number(
  process.env.FUNDRAISER_MIN_WITHDRAWAL || 50000
);

const WITHDRAWAL_ENABLED =
  process.env.FUNDRAISER_WITHDRAWAL_ENABLED !== 'false';

// ==========================================================
// SANITY SERVER CLIENT
// ==========================================================

const serverClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    'xqggeww8',

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    'production',

  useCdn: false,

  // Dibuat fixed supaya perubahan API Sanity
  // tidak mengubah perilaku aplikasi secara tiba-tiba.
  apiVersion: '2024-01-01',

  /**
   * Token opsional untuk READ.
   *
   * Kalau dataset public, query read sebenarnya
   * bisa tetap bekerja tanpa token.
   */
  token: process.env.SANITY_API_TOKEN,
});

// ==========================================================
// TYPES
// ==========================================================

type FundraiserProfile = {
  _id?: string;
  name?: string;
  phone?: string;

  status?: string;

  // Sistem lama
  feePaid?: number;

  /**
   * Bisa disimpan sebagai:
   *
   * 10   = 10%
   * 0.1  = 10%
   */
  commissionRate?: number;

  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

type DonationItem = {
  _id?: string;

  amount?: number;
  donorName?: string;

  slug?: string;

  programTitle?: string;

  createdAt?: string;
  paidAt?: string;
};

type WithdrawalItem = {
  _id?: string;

  amount?: number;

  status?: string;

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

type ProgramItem = {
  _id?: string;
  title?: string;
  slug?: string;
};

type QueryResult = {
  profile?: FundraiserProfile | null;

  donations?: DonationItem[];

  withdrawals?: WithdrawalItem[];

  allPrograms?: ProgramItem[];
};

// ==========================================================
// HELPERS
// ==========================================================

function normalizePhone(input: string) {
  const raw = String(input || '').trim();

  const digits = raw.replace(/[^0-9]/g, '');

  let international = digits;

  /**
   * 081234...
   * menjadi
   * 6281234...
   */
  if (digits.startsWith('0')) {
    international = `62${digits.slice(1)}`;
  }

  /**
   * 81234...
   * menjadi
   * 6281234...
   */
  if (digits.startsWith('8')) {
    international = `62${digits}`;
  }

  let local = digits;

  if (international.startsWith('62')) {
    local = `0${international.slice(2)}`;
  }

  const plus = international
    ? `+${international}`
    : '';

  /**
   * Buat daftar unik.
   *
   * Dengan cara ini database lama yang menyimpan:
   *
   * 0812...
   * 62812...
   * +62812...
   *
   * tetap bisa ditemukan.
   */
  const variants = Array.from(
    new Set(
      [
        raw,
        digits,
        international,
        local,
        plus,
      ].filter(Boolean)
    )
  );

  return {
    raw,
    digits,
    international,
    local,
    plus,
    variants,
  };
}

// ==========================================================
// COMMISSION RATE
// ==========================================================

function normalizeCommissionRate(
  value?: number | null
) {
  const rate = Number(value);

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return DEFAULT_COMMISSION_RATE;
  }

  // 10 berarti 10%
  if (rate > 1) {
    return Math.min(
      rate / 100,
      1
    );
  }

  // 0.1 berarti 10%
  return Math.min(rate, 1);
}

// ==========================================================
// NOMOR REKENING
// ==========================================================

function maskAccountNumber(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const clean =
    String(value).replace(
      /\s+/g,
      ''
    );

  if (clean.length <= 4) {
    return clean;
  }

  return `${'*'.repeat(
    clean.length - 4
  )}${clean.slice(-4)}`;
}

// ==========================================================
// RESPONSE NO CACHE
// ==========================================================

function jsonNoStore(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, no-cache, max-age=0, must-revalidate',

        Pragma: 'no-cache',

        Expires: '0',
      },
    }
  );
}

// ==========================================================
// GET
// ==========================================================

export async function GET(
  request: Request
) {
  try {
    // ======================================================
    // 1. AMBIL PHONE
    // ======================================================

    const { searchParams } =
      new URL(request.url);

    const phone =
      searchParams.get('phone');

    if (!phone) {
      return jsonNoStore(
        {
          success: false,

          message:
            'Nomor WhatsApp wajib disertakan.',
        },
        400
      );
    }

    // ======================================================
    // 2. NORMALISASI PHONE
    // ======================================================

    const normalized =
      normalizePhone(phone);

    if (
      !normalized.digits ||
      normalized.digits.length < 8
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            'Format nomor WhatsApp tidak valid.',
        },
        400
      );
    }

    // ======================================================
    // 3. GROQ QUERY
    // ======================================================
    //
    // API ini sekarang mengambil:
    //
    // 1. Profil fundraiser (jika tersedia)
    // 2. Seluruh donasi sukses
    // 3. History penarikan
    // 4. Program donasi
    //
    // Tetap support dua schema transaksi:
    //
    // - donationStatus
    // - donationTransaction
    //
    // ======================================================

    const query = `
      {
        "profile": *[
          _type == "fundraiser" &&
          !(_id in path("drafts.**")) &&
          phone in $phones
        ][0] {
          _id,
          name,
          phone,
          status,

          feePaid,
          commissionRate,

          bankName,
          accountName,
          accountNumber
        },

        "donations": *[
          (
            _type == "donationStatus" ||
            _type == "donationTransaction"
          ) &&

          (
            status == "success" ||
            status == "paid" ||
            status == "settlement" ||
            status == "capture"
          ) &&

          fundraiserPhone in $phones
        ]
        | order(
            coalesce(paidAt, _createdAt) desc
          ) {

          _id,

          amount,
          donorName,

          slug,

          "programTitle": coalesce(
            programName->title,
            program->title,

            *[
              _type == "program" &&
              slug.current == ^.slug
            ][0].title,

            "Sedekah Umum"
          ),

          "createdAt": _createdAt,

          paidAt
        },

        "withdrawals": *[
          _type == "fundraiserWithdrawal" &&
          !(_id in path("drafts.**")) &&

          (
            fundraiserPhone in $phones ||

            fundraiser->phone in $phones
          )
        ]
        | order(
            coalesce(
              requestedAt,
              _createdAt
            ) desc
          ) {

          _id,

          amount,
          status,

          "requestedAt": coalesce(
            requestedAt,
            _createdAt
          ),

          processedAt,
          paidAt,

          bankName,
          accountName,
          accountNumber,

          referenceNumber,

          note,
          adminNote
        },

        "allPrograms": *[
          _type == "program" &&
          !(_id in path("drafts.**")) &&
          defined(slug.current)
        ]
        | order(title asc) {

          _id,

          title,

          "slug": slug.current
        }
      }
    `;

    // ======================================================
    // 4. FETCH SANITY
    // ======================================================

    const data =
      await serverClient.fetch<QueryResult>(
        query,

        {
          phones:
            normalized.variants,
        },

        {
          cache: 'no-store',
        }
      );

    // ======================================================
    // 5. NORMALISASI ARRAY
    // ======================================================

    const donations =
      Array.isArray(
        data?.donations
      )
        ? data.donations
        : [];

    const withdrawals =
      Array.isArray(
        data?.withdrawals
      )
        ? data.withdrawals
        : [];

    const programs =
      Array.isArray(
        data?.allPrograms
      )
        ? data.allPrograms.filter(
            (program) =>
              Boolean(
                program?.title &&
                  program?.slug
              )
          )
        : [];

    // ======================================================
    // 6. TOTAL DONASI FUNDRAISER
    // ======================================================

    const totalEarnings =
      donations.reduce(
        (
          total,
          donation
        ) => {
          const amount =
            Number(
              donation.amount || 0
            );

          if (
            !Number.isFinite(
              amount
            ) ||
            amount <= 0
          ) {
            return total;
          }

          return total + amount;
        },
        0
      );

    // ======================================================
    // 7. COMMISSION RATE
    // ======================================================

    const commissionRate =
      normalizeCommissionRate(
        data?.profile
          ?.commissionRate
      );

    const commissionPercent =
      Math.round(
        commissionRate * 100
      );

    // ======================================================
    // 8. TOTAL HAK KOMISI
    // ======================================================

    const totalCommission =
      Math.max(
        0,

        Math.round(
          totalEarnings *
            commissionRate
        )
      );

    // ======================================================
    // 9. HITUNG HISTORY PENARIKAN
    // ======================================================

    let paidFromHistory = 0;

    let pendingWithdrawal = 0;

    for (
      const withdrawal
      of withdrawals
    ) {
      const amount =
        Number(
          withdrawal.amount || 0
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        continue;
      }

      const status =
        String(
          withdrawal.status || ''
        ).toLowerCase();

      // ===============================================
      // SUDAH BENAR-BENAR DIBAYAR
      // ===============================================

      if (
        status === 'paid' ||
        status === 'completed'
      ) {
        paidFromHistory +=
          amount;
      }

      // ===============================================
      // MASIH MENGUNCI SALDO
      // ===============================================
      //
      // approved juga dikunci karena sudah disetujui
      // walaupun belum ditransfer.
      //
      // ===============================================

      if (
        status === 'pending' ||
        status === 'approved'
      ) {
        pendingWithdrawal +=
          amount;
      }
    }

    // ======================================================
    // 10. SUPPORT feePaid SISTEM LAMA
    // ======================================================

    const legacyFeePaid =
      Math.max(
        0,

        Number(
          data?.profile
            ?.feePaid || 0
        )
      );

    /**
     * Jangan:
     *
     * legacyFeePaid + paidFromHistory
     *
     * karena kalau data lama sudah dimigrasikan ke
     * fundraiserWithdrawal akan terjadi double count.
     *
     * Ambil angka terbesar saja.
     */
    const totalWithdrawn =
      Math.max(
        legacyFeePaid,
        paidFromHistory
      );

    // ======================================================
    // 11. SALDO KOMISI TERSEDIA
    // ======================================================

    const availableCommission =
      Math.max(
        0,

        totalCommission -
          totalWithdrawn -
          pendingWithdrawal
      );

    // ======================================================
    // 12. SAFE PROFILE
    // ======================================================

    /**
     * Di islami.or.id data profil utama user berasal
     * dari Supabase.
     *
     * Jadi Sanity fundraiser profile dibuat opsional.
     *
     * Kalau belum ada dokumen fundraiser di Sanity,
     * statistik tetap bekerja.
     */
    const safeProfile = {
      name:
        data?.profile?.name ||
        'Fundraiser',

      status:
        data?.profile?.status ||
        'active',

      feePaid:
        legacyFeePaid,

      commissionRate,

      bankName:
        data?.profile
          ?.bankName,

      accountName:
        data?.profile
          ?.accountName,

      accountNumber:
        maskAccountNumber(
          data?.profile
            ?.accountNumber
        ),
    };

    // ======================================================
    // 13. SAFE WITHDRAWAL HISTORY
    // ======================================================

    const safeWithdrawals =
      withdrawals.map(
        (item) => ({
          ...item,

          amount:
            Number(
              item.amount || 0
            ),

          accountNumber:
            maskAccountNumber(
              item.accountNumber
            ),
        })
      );

    // ======================================================
    // 14. RESPONSE
    // ======================================================

    return jsonNoStore(
      {
        success: true,

        // ==================================================
        // PROFILE
        // ==================================================

        profile:
          safeProfile,

        // ==================================================
        // DONASI
        // ==================================================

        totalEarnings,

        donationCount:
          donations.length,

        history:
          donations,

        // ==================================================
        // KOMISI
        // ==================================================

        commissionRate,

        commissionPercent,

        totalCommission,

        /**
         * Sudah benar-benar dibayarkan.
         */
        totalWithdrawn,

        /**
         * Pending + approved.
         */
        pendingWithdrawal,

        /**
         * Saldo yang masih boleh diajukan.
         */
        availableCommission,

        // ==================================================
        // WITHDRAWAL
        // ==================================================

        withdrawals:
          safeWithdrawals,

        withdrawalCount:
          safeWithdrawals.length,

        withdrawalConfig: {
          enabled:
            WITHDRAWAL_ENABLED,

          minimum:
            MINIMUM_WITHDRAWAL,

          maximum:
            availableCommission,
        },

        // ==================================================
        // PROGRAM
        // ==================================================

        programs,
      },
      200
    );
  } catch (error: unknown) {
    console.error(
      '🔥 API Fundraiser Stats Error:',
      error
    );

    return jsonNoStore(
      {
        success: false,

        message:
          'Terjadi kesalahan saat mengambil statistik fundraiser.',
      },
      500
    );
  }
}