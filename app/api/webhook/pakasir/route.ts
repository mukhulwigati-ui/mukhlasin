// app/api/webhook/pakasir/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: SANITY CLIENT
// ============================================================================

function getSanityClient() {
  const projectId =
    process.env.NEXT_SANITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

  const dataset =
    process.env.NEXT_SANITY_DATASET ||
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    'production';

  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId) {
    throw new Error(
      'NEXT_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_PROJECT_ID belum diatur.'
    );
  }

  if (!token) {
    throw new Error(
      'SANITY_API_WRITE_TOKEN belum diatur di Environment Variables.'
    );
  }

  return createClient({
    projectId,
    dataset,
    useCdn: false,
    apiVersion: '2026-07-18',
    token,
  });
}

// ============================================================================
// HELPER: FORMAT NOMOR WHATSAPP
// ============================================================================

function formatPhoneNumber(phone: string): string {
  let formatted = String(phone || '').replace(/\D/g, '');

  // 08xxxx -> 628xxxx
  if (formatted.startsWith('0')) {
    formatted = `62${formatted.slice(1)}`;
  }

  // 8xxxx -> 628xxxx
  if (formatted.startsWith('8')) {
    formatted = `62${formatted}`;
  }

  return formatted;
}

// ============================================================================
// HELPER: AMBIL SLUG / ID PROGRAM
// ============================================================================

function getProgramIdentifier(transaction: any): string | null {
  // programSlug berupa string
  if (
    typeof transaction?.programSlug === 'string' &&
    transaction.programSlug.trim()
  ) {
    return transaction.programSlug.trim();
  }

  // programSlug berupa object Sanity slug
  if (
    transaction?.programSlug?.current &&
    typeof transaction.programSlug.current === 'string'
  ) {
    return transaction.programSlug.current;
  }

  // slug berupa string
  if (
    typeof transaction?.slug === 'string' &&
    transaction.slug.trim()
  ) {
    return transaction.slug.trim();
  }

  // slug berupa object Sanity
  if (
    transaction?.slug?.current &&
    typeof transaction.slug.current === 'string'
  ) {
    return transaction.slug.current;
  }

  // reference ke dokumen program
  if (
    transaction?.program?._ref &&
    typeof transaction.program._ref === 'string'
  ) {
    return transaction.program._ref;
  }

  return null;
}

// ============================================================================
// HELPER: KIRIM WHATSAPP VIA FONNTE
// ============================================================================

async function sendFonnteNotification(
  targetPhone: string,
  donorName: string,
  amount: number,
  programTitle: string,
  orderId: string
) {
  // PENTING:
  // Menggunakan FONNTE_TOKEN sesuai Environment Variable di Vercel.
  // Tidak ada lagi token hardcode.
  const fonnteToken = process.env.FONNTE_TOKEN;

  if (!fonnteToken) {
    console.error(
      '[Fonnte Error] FONNTE_TOKEN belum diatur di Environment Variables.'
    );
    return false;
  }

  const formattedPhone = formatPhoneNumber(targetPhone);

  if (!formattedPhone) {
    console.warn('[Fonnte Warning] Nomor WhatsApp kosong.');
    return false;
  }

  if (formattedPhone.length < 10) {
    console.warn(
      `[Fonnte Warning] Nomor WhatsApp tidak valid: ${formattedPhone}`
    );
    return false;
  }

  const safeDonorName =
    donorName && donorName.trim()
      ? donorName.trim()
      : 'Hamba Allah';

  const safeProgramTitle =
    programTitle && programTitle.trim()
      ? programTitle.trim()
      : 'Program Kebaikan';

  const safeAmount =
    Number.isFinite(Number(amount))
      ? Number(amount)
      : 0;

  // ==========================================================================
  // PESAN WHATSAPP MUKHLASIN
  // ==========================================================================

  const message =
    `Alhamdulillah, jazakumullahu khairan *${safeDonorName}*! 🙏\n\n` +
    `Donasi Anda sebesar *Rp ${safeAmount.toLocaleString('id-ID')}* ` +
    `untuk program *${safeProgramTitle}* telah berhasil dikonfirmasi ` +
    `dan terverifikasi otomatis.\n\n` +
    `No. Invoice: \`${orderId}\`\n\n` +
    `Semoga menjadi amal jariyah yang berlipat ganda, ` +
    `mendatangkan keberkahan, serta diberikan ganti yang lebih baik ` +
    `oleh Allah SWT. Aamiin ya Rabbal 'alamin. 🤲\n\n` +
    `*mukhlasin.or.id*`;

  try {
    console.log(
      `[Fonnte] Mengirim notifikasi transaksi ${orderId} ke ${formattedPhone}`
    );

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',

      headers: {
        Authorization: fonnteToken,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        target: formattedPhone,
        message,
        countryCode: '62',
      }),

      cache: 'no-store',
    });

    const responseText = await response.text();

    let result: any;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        status: false,
        raw: responseText,
      };
    }

    if (!response.ok) {
      console.error(
        `[Fonnte Error] HTTP ${response.status}:`,
        result
      );

      return false;
    }

    if (result?.status) {
      console.log(
        `[Fonnte Success] WhatsApp transaksi ${orderId} berhasil dikirim.`
      );

      return true;
    }

    console.error(
      '[Fonnte Error] Pengiriman WhatsApp gagal:',
      result
    );

    return false;
  } catch (error) {
    console.error(
      '[Fonnte Exception] Terjadi error saat mengirim WhatsApp:',
      error
    );

    return false;
  }
}

// ============================================================================
// WEBHOOK PAKASIR
// ============================================================================

export async function POST(request: Request) {
  try {
    // =========================================================================
    // 1. BACA PAYLOAD PAKASIR
    // =========================================================================

    const body = await request.json();

    const {
      amount,
      order_id,
      status,
      payment_method,
      completed_at,
    } = body;

    const orderId = String(order_id || '').trim();
    const paymentStatus = String(status || '')
      .trim()
      .toLowerCase();

    // Jangan log seluruh body karena dapat berisi data pribadi donatur.
    console.log(
      `[Pakasir Webhook] Order: ${orderId || '-'} | Status: ${
        paymentStatus || '-'
      }`
    );

    // =========================================================================
    // VALIDASI PAYLOAD
    // =========================================================================

    if (!orderId || !paymentStatus) {
      console.warn(
        '[Pakasir Webhook] Payload tidak memiliki order_id atau status.'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload',
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================================
    // HANYA PROSES TRANSAKSI SUKSES
    // =========================================================================

    const isSuccess =
      paymentStatus === 'completed' ||
      paymentStatus === 'success';

    if (!isSuccess) {
      console.log(
        `[Pakasir Webhook] Status ${paymentStatus}. Tidak ada proses transaksi sukses.`
      );

      return NextResponse.json({
        success: true,
        message: `Webhook received with status: ${paymentStatus}`,
      });
    }

    // =========================================================================
    // 2. SANITY CLIENT
    // =========================================================================

    const client = getSanityClient();

    // =========================================================================
    // 3. CARI TRANSAKSI BERDASARKAN ORDER ID
    // =========================================================================

    const transactionQuery = `
      *[
        _type == "donationTransaction" &&
        orderId == $orderId
      ][0]
    `;

    const transaction = await client.fetch(
      transactionQuery,
      {
        orderId,
      }
    );

    // =========================================================================
    // DATA DEFAULT
    // =========================================================================

    let programTitle = 'Program Kebaikan';
    let donorPhone = '';
    let donorName = 'Hamba Allah';
    let donationAmount = Number(amount || 0);

    // =========================================================================
    // TRANSAKSI DITEMUKAN
    // =========================================================================

    if (transaction) {
      donorPhone =
        transaction.donorPhone ||
        transaction.phone ||
        transaction.whatsapp ||
        '';

      donorName =
        transaction.donorName ||
        transaction.name ||
        'Hamba Allah';

      donationAmount = Number(
        transaction.amount ||
        amount ||
        0
      );

      // =======================================================================
      // CEGAH WEBHOOK GANDA
      // =======================================================================

      const previousStatus = String(
        transaction.status || ''
      ).toLowerCase();

      if (previousStatus === 'success') {
        console.log(
          `[Pakasir Webhook] Transaksi ${orderId} sebelumnya sudah SUCCESS. ` +
            `Webhook duplikat diabaikan agar nominal donasi tidak bertambah dua kali.`
        );

        return NextResponse.json({
          success: true,
          duplicate: true,
          message: 'Transaction already processed',
        });
      }

      // =======================================================================
      // 4. AMBIL PROGRAM
      // =======================================================================

      const programIdentifier =
        getProgramIdentifier(transaction);

      if (programIdentifier) {
        const programQuery = `
          *[
            _type == "program" &&
            (
              slug.current == $identifier ||
              _id == $identifier
            )
          ][0]
        `;

        const programDoc = await client.fetch(
          programQuery,
          {
            identifier: programIdentifier,
          }
        );

        if (programDoc) {
          programTitle =
            programDoc.title ||
            programTitle;

          const currentCollected = Number(
            programDoc.collectedAmount || 0
          );

          const newCollected =
            currentCollected + donationAmount;

          const newDonorEntry = {
            _key:
              `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 10)}`,

            name: donorName,

            amount: donationAmount,

            date: new Date().toLocaleDateString(
              'id-ID',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }
            ),
          };

          // ===================================================================
          // UPDATE TOTAL DONASI + DAFTAR DONATUR
          // ===================================================================

          await client
            .patch(programDoc._id)
            .set({
              collectedAmount: newCollected,
            })
            .setIfMissing({
              donors: [],
            })
            .append(
              'donors',
              [newDonorEntry]
            )
            .commit();

          console.log(
            `[Sanity] Dana program "${programTitle}" berhasil ditambahkan sebesar Rp ${donationAmount.toLocaleString(
              'id-ID'
            )}.`
          );
        } else {
          console.warn(
            `[Sanity Warning] Program ${programIdentifier} tidak ditemukan.`
          );
        }
      } else {
        console.warn(
          `[Sanity Warning] Program pada transaksi ${orderId} tidak ditemukan.`
        );
      }

      // =======================================================================
      // 5. UPDATE STATUS TRANSAKSI MENJADI SUCCESS
      // =======================================================================

      await client
        .patch(transaction._id)
        .set({
          status: 'success',

          paymentMethod:
            payment_method ||
            transaction.paymentMethod ||
            '',

          completedAt:
            completed_at ||
            new Date().toISOString(),
        })
        .commit();

      console.log(
        `[Sanity] Transaksi ${orderId} berhasil diubah menjadi SUCCESS.`
      );
    } else {
      // =========================================================================
      // TRANSAKSI TIDAK DITEMUKAN DI SANITY
      // =========================================================================

      console.warn(
        `[Sanity Warning] Transaksi ${orderId} tidak ditemukan di Sanity.`
      );

      donorPhone =
        body.phone ||
        body.whatsapp ||
        body.donorPhone ||
        '';

      donorName =
        body.name ||
        body.donorName ||
        'Hamba Allah';

      donationAmount = Number(
        amount || 0
      );
    }

    // =========================================================================
    // 6. KIRIM WHATSAPP KE DONATUR
    // =========================================================================

    // Tidak ada lagi fallback nomor WA hardcode.
    // Jika nomor donatur tidak tersedia, WA tidak dikirim.
    if (donorPhone) {
      await sendFonnteNotification(
        donorPhone,
        donorName,
        donationAmount,
        programTitle,
        orderId
      );
    } else {
      console.warn(
        `[Fonnte Warning] Nomor WhatsApp donatur tidak ditemukan untuk ${orderId}.`
      );
    }

    // =========================================================================
    // 7. SINKRONISASI GOOGLE SHEET
    // ============================================================================

    const googleSheetScriptUrl =
      process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

    if (googleSheetScriptUrl) {
      try {
        const sheetResponse = await fetch(
          googleSheetScriptUrl,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              orderId,
              status: 'success',

              completedAt:
                completed_at ||
                new Date().toLocaleString(
                  'id-ID',
                  {
                    timeZone:
                      'Asia/Jakarta',
                  }
                ),
            }),

            cache: 'no-store',
          }
        );

        if (sheetResponse.ok) {
          console.log(
            `[Google Sheet] Transaksi ${orderId} berhasil disinkronkan.`
          );
        } else {
          console.error(
            `[Google Sheet Error] HTTP ${sheetResponse.status}`
          );
        }
      } catch (sheetError) {
        console.error(
          '[Google Sheet Error] Gagal memperbarui Google Sheet:',
          sheetError
        );
      }
    }

    // =========================================================================
    // SELESAI
    // =========================================================================

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: unknown) {
    console.error(
      '🔥 Pakasir Webhook Server Error:',
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Internal Server Error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}