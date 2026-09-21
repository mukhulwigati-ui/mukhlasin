// sanity/schemaTypes/fundraiserWithdrawal.ts

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'fundraiserWithdrawal',
  title: 'Penarikan Komisi Fundraiser',
  type: 'document',

  fields: [
    defineField({
      name: 'userId',
      title: 'Supabase User ID',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'fundraiserName',
      title: 'Nama Fundraiser',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'fundraiserPhone',
      title: 'Nomor WhatsApp',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'fundraiser',
      title: 'Fundraiser Sanity',
      type: 'reference',
      to: [{ type: 'fundraiser' }],
      description:
        'Opsional. Dipakai jika profil fundraiser juga tersedia di Sanity.',
    }),

    defineField({
      name: 'amount',
      title: 'Nominal Penarikan',
      type: 'number',
      validation: (Rule) =>
        Rule.required().positive().integer(),
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'pending',

      options: {
        list: [
          {
            title: '⏳ Menunggu',
            value: 'pending',
          },
          {
            title: '✅ Disetujui',
            value: 'approved',
          },
          {
            title: '💸 Sudah Dibayar',
            value: 'paid',
          },
          {
            title: '❌ Ditolak',
            value: 'rejected',
          },
          {
            title: '🚫 Dibatalkan',
            value: 'cancelled',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'requestedAt',
      title: 'Tanggal Pengajuan',
      type: 'datetime',
      initialValue: () =>
        new Date().toISOString(),
      readOnly: true,
    }),

    defineField({
      name: 'processedAt',
      title: 'Tanggal Diproses',
      type: 'datetime',
    }),

    defineField({
      name: 'paidAt',
      title: 'Tanggal Dibayar',
      type: 'datetime',

      hidden: ({ document }) =>
        document?.status !== 'paid',
    }),

    defineField({
      name: 'bankName',
      title: 'Bank / E-Wallet',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'accountNumber',
      title: 'Nomor Rekening',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'accountName',
      title: 'Nama Pemilik Rekening',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'referenceNumber',
      title: 'Nomor Referensi Transfer',
      type: 'string',

      hidden: ({ document }) =>
        document?.status !== 'paid',
    }),

    defineField({
      name: 'note',
      title: 'Catatan Fundraiser',
      type: 'text',
      rows: 3,
      readOnly: true,
    }),

    defineField({
      name: 'adminNote',
      title: 'Catatan Admin',
      type: 'text',
      rows: 3,
    }),

    // =====================================================
    // SNAPSHOT KOMISI
    // =====================================================

    defineField({
      name: 'commissionSnapshot',
      title: 'Snapshot Perhitungan Komisi',
      type: 'object',
      readOnly: true,

      fields: [
        defineField({
          name: 'totalEarnings',
          title: 'Total Dana Dihimpun',
          type: 'number',
        }),

        defineField({
          name: 'commissionRate',
          title: 'Rate Komisi',
          type: 'number',
        }),

        defineField({
          name: 'totalCommission',
          title: 'Total Hak Komisi',
          type: 'number',
        }),

        defineField({
          name: 'totalWithdrawn',
          title: 'Sudah Dicairkan',
          type: 'number',
        }),

        defineField({
          name: 'pendingBefore',
          title: 'Pending Sebelumnya',
          type: 'number',
        }),

        defineField({
          name: 'availableBefore',
          title: 'Saldo Sebelum Pengajuan',
          type: 'number',
        }),

        defineField({
          name: 'requestedAmount',
          title: 'Nominal Pengajuan',
          type: 'number',
        }),

        defineField({
          name: 'availableAfter',
          title: 'Sisa Saldo',
          type: 'number',
        }),
      ],
    }),
  ],

  preview: {
    select: {
      name: 'fundraiserName',
      phone: 'fundraiserPhone',
      amount: 'amount',
      status: 'status',
    },

    prepare({
      name,
      phone,
      amount,
      status,
    }) {
      const labels: Record<
        string,
        string
      > = {
        pending: '⏳ Menunggu',
        approved: '✅ Disetujui',
        paid: '💸 Sudah Dibayar',
        rejected: '❌ Ditolak',
        cancelled: '🚫 Dibatalkan',
      };

      return {
        title:
          name ||
          phone ||
          'Fundraiser',

        subtitle: `${
          labels[status] || status
        } • Rp ${Number(
          amount || 0
        ).toLocaleString('id-ID')}`,
      };
    },
  },

  orderings: [
    {
      title: 'Terbaru',
      name: 'requestedAtDesc',

      by: [
        {
          field: 'requestedAt',
          direction: 'desc',
        },
      ],
    },
  ],
});