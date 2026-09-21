// schemas/fundraiser.ts

import {
  defineField,
  defineType,
} from "sanity";

export default defineType({
  name: "fundraiser",

  title: "Fundraiser / Relawan",

  type: "document",

  // =========================================================================
  // GROUP / TAB
  // =========================================================================

  groups: [
    {
      name: "identity",
      title: "Identitas",
      default: true,
    },

    {
      name: "payment",
      title: "Rekening",
    },

    {
      name: "commission",
      title: "Komisi",
    },

    {
      name: "stats",
      title: "Statistik",
    },

    {
      name: "system",
      title: "Sistem",
    },
  ],

  // =========================================================================
  // FIELDS
  // =========================================================================

  fields: [
    // =========================================================================
    // IDENTITAS DARI SUPABASE
    // =========================================================================

    defineField({
      name: "supabaseUserId",

      title: "Supabase User ID",

      type: "string",

      group: "system",

      description:
        "ID akun pengguna dari Supabase Auth. Digunakan untuk sinkronisasi otomatis antara akun islami.or.id dan Sanity.",

      readOnly: true,
    }),

    defineField({
      name: "name",

      title: "Nama Lengkap",

      type: "string",

      group: "identity",

      description:
        "Nama lengkap fundraiser atau relawan.",

      validation: (Rule) =>
        Rule.required()
          .min(2)
          .max(100)
          .error(
            "Nama fundraiser wajib diisi."
          ),
    }),

    defineField({
      name: "email",

      title: "Email",

      type: "string",

      group: "identity",

      description:
        "Email akun islami.or.id yang terhubung dengan fundraiser.",

      readOnly: true,
    }),

    defineField({
      name: "phone",

      title: "Nomor WhatsApp",

      type: "string",

      group: "identity",

      description:
        "Nomor WhatsApp fundraiser. Nomor ini digunakan untuk mencocokkan transaksi referral.",

      validation: (Rule) =>
        Rule.required()
          .regex(
            /^(?:\+62|62|0)[0-9]{8,15}$/,
            {
              name: "nomor WhatsApp",
              invert: false,
            }
          )
          .error(
            "Masukkan nomor WhatsApp Indonesia yang valid."
          ),
    }),

    // =========================================================================
    // KODE REFERRAL
    // =========================================================================

    defineField({
      name: "referralCode",

      title: "Kode Referral",

      type: "string",

      group: "identity",

      description:
        "Opsional. Jika kosong, sistem tetap menggunakan nomor WhatsApp sebagai kode referral.",

      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) {
            return true;
          }

          if (
            !/^[A-Za-z0-9_-]{3,30}$/.test(
              value
            )
          ) {
            return "Kode referral hanya boleh berisi huruf, angka, tanda - dan _.";
          }

          return true;
        }),
    }),

    // =========================================================================
    // STATUS
    // =========================================================================

    defineField({
      name: "status",

      title: "Status Fundraiser",

      type: "string",

      group: "identity",

      description:
        "Akun dengan nomor WhatsApp otomatis dibuat sebagai fundraiser aktif. Admin tetap dapat menonaktifkan atau menangguhkan akun.",

      options: {
        list: [
          {
            title: "🟢 Aktif",
            value: "active",
          },

          {
            title: "⚫ Nonaktif",
            value: "inactive",
          },

          {
            title: "🟠 Ditangguhkan",
            value: "suspended",
          },
        ],

        layout: "radio",
      },

      initialValue: "active",

      validation: (Rule) =>
        Rule.required(),
    }),

    // =========================================================================
    // PROGRAM YANG DIDUKUNG
    // =========================================================================

    defineField({
      name: "supportedPrograms",

      title: "Program yang Didukung",

      type: "array",

      group: "identity",

      description:
        "Jika kosong, fundraiser dapat mempromosikan seluruh program donasi.",

      of: [
        {
          type: "reference",

          to: [
            {
              type: "program",
            },
          ],
        },
      ],

      validation: (Rule) =>
        Rule.unique(),
    }),

    // =========================================================================
    // DATA REKENING
    // =========================================================================

    defineField({
      name: "bankName",

      title: "Bank / E-Wallet",

      type: "string",

      group: "payment",

      description:
        "Nama bank atau e-wallet tujuan pencairan komisi.",
    }),

    defineField({
      name: "accountNumber",

      title: "Nomor Rekening / E-Wallet",

      type: "string",

      group: "payment",

      description:
        "Nomor rekening atau nomor akun e-wallet untuk pencairan komisi.",
    }),

    defineField({
      name: "accountName",

      title: "Nama Pemilik Rekening",

      type: "string",

      group: "payment",

      description:
        "Nama pemilik rekening sesuai rekening bank atau e-wallet.",
    }),

    // =========================================================================
    // KOMISI
    // =========================================================================

    defineField({
      name: "commissionRate",

      title: "Persentase Komisi (%)",

      type: "number",

      group: "commission",

      description:
        "Contoh: isi 10 untuk komisi 10%. Nilai ini digunakan API fundraiser untuk menghitung hak komisi.",

      initialValue: 10,

      validation: (Rule) =>
        Rule.required()
          .min(0)
          .max(100)
          .precision(2)
          .error(
            "Persentase komisi harus antara 0 sampai 100."
          ),
    }),

    // =========================================================================
    // LEGACY FEE PAID
    // =========================================================================

    defineField({
      name: "feePaid",

      title: "Total Fee Lama yang Sudah Dibayarkan",

      type: "number",

      group: "commission",

      description:
        "Field kompatibilitas untuk pembayaran lama sebelum sistem riwayat penarikan digunakan. Untuk pembayaran baru gunakan menu Penarikan Komisi.",

      initialValue: 0,

      validation: (Rule) =>
        Rule.required()
          .min(0)
          .integer(),
    }),

    // =========================================================================
    // STATISTIK
    // =========================================================================

    defineField({
      name: "totalDanaDihimpun",

      title: "Total Dana Dihimpun",

      type: "number",

      group: "stats",

      description:
        "Statistik ringkasan. Nilai utama tetap dihitung dari transaksi donasi sukses.",

      readOnly: true,

      initialValue: 0,

      validation: (Rule) =>
        Rule.min(0),
    }),

    defineField({
      name: "totalTransaksiSukses",

      title: "Total Transaksi Sukses",

      type: "number",

      group: "stats",

      readOnly: true,

      initialValue: 0,

      validation: (Rule) =>
        Rule.min(0).integer(),
    }),

    defineField({
      name: "totalFee",

      title: "Total Hak Komisi",

      type: "number",

      group: "stats",

      readOnly: true,

      initialValue: 0,

      validation: (Rule) =>
        Rule.min(0),
    }),

    defineField({
      name: "sisaSaldoFee",

      title: "Saldo Komisi Tersedia",

      type: "number",

      group: "stats",

      readOnly: true,

      initialValue: 0,

      validation: (Rule) =>
        Rule.min(0),
    }),

    // =========================================================================
    // CATATAN ADMIN
    // =========================================================================

    defineField({
      name: "notes",

      title: "Catatan Admin",

      type: "text",

      group: "identity",

      rows: 3,

      description:
        "Catatan internal mengenai fundraiser. Tidak ditampilkan kepada pengguna.",
    }),

    // =========================================================================
    // TIMESTAMP
    // =========================================================================

    defineField({
      name: "createdAt",

      title: "Tanggal Bergabung",

      type: "datetime",

      group: "system",

      readOnly: true,

      initialValue: () =>
        new Date().toISOString(),
    }),

    defineField({
      name: "updatedAt",

      title: "Terakhir Disinkronkan",

      type: "datetime",

      group: "system",

      readOnly: true,
    }),

    defineField({
      name: "lastWithdrawalRequestAt",

      title: "Pengajuan Penarikan Terakhir",

      type: "datetime",

      group: "system",

      readOnly: true,
    }),
  ],

  // =========================================================================
  // PREVIEW
  // =========================================================================

  preview: {
    select: {
      name: "name",

      phone: "phone",

      status: "status",

      commissionRate:
        "commissionRate",

      totalDana:
        "totalDanaDihimpun",

      totalTransaksi:
        "totalTransaksiSukses",

      saldoFee:
        "sisaSaldoFee",
    },

    prepare({
      name,
      phone,
      status,
      commissionRate,
      totalDana,
      totalTransaksi,
      saldoFee,
    }) {
      const dana =
        Number(
          totalDana || 0
        ).toLocaleString(
          "id-ID"
        );

      const saldo =
        Number(
          saldoFee || 0
        ).toLocaleString(
          "id-ID"
        );

      const statusLabel =
        status === "active"
          ? "🟢 AKTIF"
          : status ===
              "suspended"
            ? "🟠 DITANGGUHKAN"
            : "⚫ NONAKTIF";

      const rate =
        Number(
          commissionRate || 0
        );

      return {
        title:
          name ||
          "Fundraiser Tanpa Nama",

        subtitle: [
          statusLabel,

          phone || "-",

          `${rate}% komisi`,

          `${Number(
            totalTransaksi || 0
          )} transaksi`,

          `Rp ${dana}`,

          `Saldo Rp ${saldo}`,
        ].join(" • "),
      };
    },
  },

  // =========================================================================
  // ORDERING
  // =========================================================================

  orderings: [
    {
      title:
        "Fundraiser Terbaru",

      name:
        "createdAtDesc",

      by: [
        {
          field:
            "createdAt",

          direction:
            "desc",
        },
      ],
    },

    {
      title:
        "Dana Terbesar",

      name:
        "totalDanaDesc",

      by: [
        {
          field:
            "totalDanaDihimpun",

          direction:
            "desc",
        },
      ],
    },

    {
      title:
        "Transaksi Terbanyak",

      name:
        "totalTransaksiDesc",

      by: [
        {
          field:
            "totalTransaksiSukses",

          direction:
            "desc",
        },
      ],
    },

    {
      title:
        "Nama A-Z",

      name:
        "nameAsc",

      by: [
        {
          field:
            "name",

          direction:
            "asc",
        },
      ],
    },
  ],
});