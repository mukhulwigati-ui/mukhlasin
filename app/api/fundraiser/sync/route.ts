// app/api/fundraiser/sync/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@sanity/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// KONFIGURASI
// ============================================================================

const DEFAULT_COMMISSION_RATE = 10;

// ============================================================================
// SANITY WRITE CLIENT
// ============================================================================

const SANITY_WRITE_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN;

const sanity = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    "xqggeww8",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion: "2024-01-01",

  useCdn: false,

  token: SANITY_WRITE_TOKEN,
});

// ============================================================================
// TYPES
// ============================================================================

type ExistingFundraiser = {
  _id: string;

  supabaseUserId?: string;

  name?: string;

  phone?: string;

  email?: string;

  status?: string;

  commissionRate?: number;

  feePaid?: number;

  bankName?: string;

  accountName?: string;

  accountNumber?: string;
};

type FundraiserDocument = {
  _id: string;

  _type: "fundraiser";

  supabaseUserId: string;

  name: string;

  phone: string;

  email: string;

  status: "active";

  commissionRate: number;

  feePaid: number;

  totalDanaDihimpun: number;

  totalTransaksiSukses: number;

  totalFee: number;

  sisaSaldoFee: number;

  bankName?: string;

  accountName?: string;

  accountNumber?: string;

  createdAt: string;

  updatedAt: string;
};

// ============================================================================
// NORMALISASI NOMOR WHATSAPP
// ============================================================================

function normalizePhone(input: string) {
  const raw = String(input || "").trim();

  const digits = raw.replace(
    /[^0-9]/g,
    ""
  );

  if (!digits) {
    return {
      raw: "",
      digits: "",
      international: "",
      local: "",
      plus: "",
      variants: [] as string[],
    };
  }

  let international = digits;

  // 081234... -> 6281234...
  if (digits.startsWith("0")) {
    international =
      `62${digits.slice(1)}`;
  }

  // 81234... -> 6281234...
  else if (
    digits.startsWith("8")
  ) {
    international =
      `62${digits}`;
  }

  let local = digits;

  // 62812... -> 0812...
  if (
    international.startsWith(
      "62"
    )
  ) {
    local =
      `0${international.slice(2)}`;
  }

  const plus =
    international
      ? `+${international}`
      : "";

  const variants =
    Array.from(
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

// ============================================================================
// HELPER STRING
// ============================================================================

function pickString(
  object:
    | Record<string, any>
    | null
    | undefined,

  keys: string[]
) {
  if (!object) {
    return "";
  }

  for (
    const key of keys
  ) {
    const value =
      object[key];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

// ============================================================================
// RESPONSE NO-CACHE
// ============================================================================

function jsonNoStore(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store, no-cache, max-age=0, must-revalidate",

        Pragma:
          "no-cache",

        Expires:
          "0",
      },
    }
  );
}

// ============================================================================
// POST
// ============================================================================

export async function POST() {
  try {
    // ========================================================================
    // 1. VALIDASI ENV SUPABASE
    // ========================================================================

    if (
      !process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
      !process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error(
        "🔥 Supabase environment belum lengkap."
      );

      return jsonNoStore(
        {
          success: false,

          message:
            "Konfigurasi Supabase belum lengkap.",
        },
        500
      );
    }

    // ========================================================================
    // 2. VALIDASI SANITY TOKEN
    // ========================================================================

    if (!SANITY_WRITE_TOKEN) {
      console.error(
        "🔥 SANITY_API_WRITE_TOKEN belum tersedia."
      );

      return jsonNoStore(
        {
          success: false,

          message:
            "Konfigurasi Sanity belum lengkap.",
        },
        500
      );
    }

    // ========================================================================
    // 3. BUAT SUPABASE SERVER CLIENT
    // ========================================================================

    const cookieStore =
      await cookies();

    const supabase =
      createServerClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL,

        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY,

        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },

            setAll(
              cookiesToSet
            ) {
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
                /**
                 * Aman diabaikan apabila cookie
                 * tidak bisa diperbarui dari context ini.
                 */
              }
            },
          },
        }
      );

    // ========================================================================
    // 4. VERIFIKASI USER LOGIN
    // ========================================================================

    const {
      data: {
        user,
      },

      error:
        authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Silakan login terlebih dahulu.",
        },
        401
      );
    }

    // ========================================================================
    // 5. AMBIL PROFILE SUPABASE
    // ========================================================================

    const {
      data:
        profile,

      error:
        profileError,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "🔥 Fundraiser profile error:",
        profileError
      );

      return jsonNoStore(
        {
          success: false,

          message:
            "Profil pengguna tidak berhasil dibaca.",
        },
        500
      );
    }

    if (!profile) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Profil pengguna tidak ditemukan.",
        },
        404
      );
    }

    // ========================================================================
    // 6. AMBIL NOMOR WHATSAPP
    // ========================================================================

    const rawPhone =
      pickString(
        profile,
        [
          "phone",
          "whatsapp",
          "whatsapp_number",
          "phone_number",
        ]
      );

    if (!rawPhone) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Nomor WhatsApp belum dilengkapi.",
        },
        400
      );
    }

    const normalized =
      normalizePhone(
        rawPhone
      );

    if (
      !normalized.international ||
      normalized.digits.length <
        8
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Nomor WhatsApp pada profil tidak valid.",
        },
        400
      );
    }

    // Nomor standar yang disimpan ke Sanity
    const phone =
      normalized.international;

    // ========================================================================
    // 7. NAMA FUNDRAISER
    // ========================================================================

    const name =
      pickString(
        profile,
        [
          "full_name",
          "name",
          "display_name",
          "username",
        ]
      ) ||
      String(
        user.user_metadata
          ?.full_name ||
          ""
      ).trim() ||
      user.email ||
      "Fundraiser";

    // ========================================================================
    // 8. EMAIL
    // ========================================================================

    const email =
      user.email || "";

    // ========================================================================
    // 9. DATA REKENING
    // ========================================================================

    const bankName =
      pickString(
        profile,
        [
          "bank_name",
          "bankName",
          "bank",
        ]
      );

    const accountName =
      pickString(
        profile,
        [
          "account_name",
          "accountName",
          "bank_account_name",
          "nama_rekening",
        ]
      );

    const accountNumber =
      pickString(
        profile,
        [
          "account_number",
          "accountNumber",
          "bank_account_number",
          "rekening",
          "nomor_rekening",
        ]
      );

    // ========================================================================
    // 10. ID FUNDRAISER DETERMINISTIK
    // ========================================================================
    //
    // Satu user Supabase seharusnya hanya
    // mempunyai satu dokumen fundraiser.
    //
    // ========================================================================

    const fundraiserId =
      `fundraiser-${user.id}`;

    // ========================================================================
    // 11. CEK FUNDRAISER MILIK USER
    // ========================================================================

    const existingByUser =
      await sanity.fetch<
        ExistingFundraiser | null
      >(
        `
          *[
            _type == "fundraiser" &&
            !(_id in path("drafts.**")) &&
            (
              _id == $fundraiserId ||
              supabaseUserId == $userId
            )
          ][0] {
            _id,
            supabaseUserId,
            name,
            phone,
            email,
            status,
            commissionRate,
            feePaid,
            bankName,
            accountName,
            accountNumber
          }
        `,

        {
          fundraiserId,

          userId:
            user.id,
        }
      );

    // ========================================================================
    // 12. CEK PEMILIK NOMOR WHATSAPP
    // ========================================================================
    //
    // Ini penting supaya akun A tidak bisa
    // mengambil dokumen fundraiser milik akun B
    // hanya karena nomor telepon sama.
    //
    // ========================================================================

    const phoneOwner =
      await sanity.fetch<
        ExistingFundraiser | null
      >(
        `
          *[
            _type == "fundraiser" &&
            !(_id in path("drafts.**")) &&
            phone in $phones
          ][0] {
            _id,
            supabaseUserId,
            name,
            phone,
            status
          }
        `,

        {
          phones:
            normalized.variants,
        }
      );

    // ========================================================================
    // 13. CEK KONFLIK NOMOR
    // ========================================================================

    if (
      phoneOwner?._id &&
      phoneOwner._id !==
        existingByUser?._id &&
      phoneOwner.supabaseUserId &&
      phoneOwner.supabaseUserId !==
        user.id
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Nomor WhatsApp ini sudah digunakan oleh akun fundraiser lain.",
        },
        409
      );
    }

    // ========================================================================
    // 14. TENTUKAN DOKUMEN EXISTING
    // ========================================================================

    const existing =
      existingByUser ||
      (
        phoneOwner &&
        (
          !phoneOwner
            .supabaseUserId ||
          phoneOwner
            .supabaseUserId ===
            user.id
        )
          ? phoneOwner
          : null
      );

    const now =
      new Date().toISOString();

    // ========================================================================
    // 15. UPDATE DOKUMEN FUNDRAISER EXISTING
    // ========================================================================

    if (existing?._id) {
      const patchData: {
        supabaseUserId: string;

        name: string;

        phone: string;

        email: string;

        updatedAt: string;

        bankName?: string;

        accountName?: string;

        accountNumber?: string;
      } = {
        supabaseUserId:
          user.id,

        name,

        phone,

        email,

        updatedAt:
          now,
      };

      // ================================================================
      // Hanya overwrite rekening jika dari Supabase memang tersedia
      // ================================================================

      if (bankName) {
        patchData.bankName =
          bankName;
      }

      if (accountName) {
        patchData.accountName =
          accountName;
      }

      if (accountNumber) {
        patchData.accountNumber =
          accountNumber;
      }

      await sanity
        .patch(existing._id)

        // Data yang memang boleh disinkron
        .set(
          patchData
        )

        // Data default hanya diisi jika belum tersedia
        .setIfMissing({
          status:
            "active",

          commissionRate:
            DEFAULT_COMMISSION_RATE,

          feePaid:
            0,

          totalDanaDihimpun:
            0,

          totalTransaksiSukses:
            0,

          totalFee:
            0,

          sisaSaldoFee:
            0,

          createdAt:
            now,
        })

        .commit({
          visibility:
            "sync",
        });

      // ================================================================
      // PENTING:
      //
      // Kita TIDAK mengubah status existing menjadi active.
      //
      // Jika admin sudah memberi:
      // inactive / suspended
      //
      // status tetap dipertahankan.
      // ================================================================

      return jsonNoStore(
        {
          success: true,

          created:
            false,

          fundraiserId:
            existing._id,

          status:
            existing.status ||
            "active",

          phone,

          message:
            "Data fundraiser berhasil disinkronkan.",
        },
        200
      );
    }

    // ========================================================================
    // 16. BUAT DOKUMEN FUNDRAISER BARU
    // ========================================================================

    const fundraiserDocument:
      FundraiserDocument = {
      _id:
        fundraiserId,

      _type:
        "fundraiser",

      // ================================================================
      // RELASI SUPABASE
      // ================================================================

      supabaseUserId:
        user.id,

      // ================================================================
      // IDENTITAS
      // ================================================================

      name,

      phone,

      email,

      // ================================================================
      // STATUS
      // ================================================================
      //
      // Aturan islami.or.id:
      //
      // user login + nomor WhatsApp valid
      // = otomatis fundraiser aktif
      //
      // ================================================================

      status:
        "active",

      // ================================================================
      // KOMISI DEFAULT
      // ================================================================

      commissionRate:
        DEFAULT_COMMISSION_RATE,

      // ================================================================
      // LEGACY FEE
      // ================================================================

      feePaid:
        0,

      // ================================================================
      // STATISTIK AWAL
      // ================================================================

      totalDanaDihimpun:
        0,

      totalTransaksiSukses:
        0,

      totalFee:
        0,

      sisaSaldoFee:
        0,

      // ================================================================
      // REKENING
      // ================================================================

      ...(bankName
        ? {
            bankName,
          }
        : {}),

      ...(accountName
        ? {
            accountName,
          }
        : {}),

      ...(accountNumber
        ? {
            accountNumber,
          }
        : {}),

      // ================================================================
      // TIMESTAMP
      // ================================================================

      createdAt:
        now,

      updatedAt:
        now,
    };

    // ========================================================================
    // 17. SIMPAN KE SANITY
    // ========================================================================

    await sanity.create(
      fundraiserDocument
    );

    // ========================================================================
    // 18. RESPONSE
    // ========================================================================

    return jsonNoStore(
      {
        success: true,

        created:
          true,

        fundraiserId,

        status:
          "active",

        phone,

        message:
          "Akun otomatis diaktifkan sebagai fundraiser.",
      },
      201
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "🔥 Fundraiser Sync Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(
            error || ""
          ).toLowerCase();

    // ========================================================================
    // SANITY AUTH
    // ========================================================================

    if (
      message.includes(
        "unauthorized"
      ) ||
      message.includes(
        "forbidden"
      ) ||
      message.includes(
        "permission"
      )
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Server belum memiliki izin untuk menyimpan data fundraiser ke Sanity.",
        },
        500
      );
    }

    // ========================================================================
    // DUPLICATE / CONFLICT
    // ========================================================================

    if (
      message.includes(
        "conflict"
      ) ||
      message.includes(
        "already exists"
      )
    ) {
      return jsonNoStore(
        {
          success: false,

          message:
            "Data fundraiser baru saja diperbarui. Silakan refresh halaman.",
        },
        409
      );
    }

    // ========================================================================
    // FALLBACK
    // ========================================================================

    return jsonNoStore(
      {
        success: false,

        message:
          "Gagal menyinkronkan akun fundraiser.",
      },
      500
    );
  }
}