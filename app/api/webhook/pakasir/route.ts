// app/api/webhook/pakasir/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

// ============================================================================
// SANITY CLIENT
// ============================================================================

function getSanityClient() {
  const projectId =
    process.env.NEXT_SANITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    'a45erd4y';

  const dataset =
    process.env.NEXT_SANITY_DATASET ||
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    'production';

  // ==========================================================
  // SESUAI ENVIRONMENT VARIABLE VERCEL ANDA
  // ==========================================================
  const token =
    process.env.SANITY_API_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId) {
    throw new Error(
      'Sanity Project ID belum diatur di Environment Variables.'
    );
  }

  if (!token) {
    throw new Error(
      'SANITY_API_TOKEN belum diatur di Environment Variables.'
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
// FORMAT NOMOR WHATSAPP
// ============================================================================

function formatPhoneNumber(phone: string): string {
  let formatted = String(phone || '').replace(/\D/g, '');

  // +62xxxxxxxx -> 62xxxxxxxx
  if (formatted.startsWith('620')) {
    formatted = `62${formatted.slice(3)}`;
  }

  // 08xxxxxxxx -> 628xxxxxxxx
  if (formatted.startsWith('0')) {
    formatted = `62${formatted.slice(1)}`;
  }

  // 8xxxxxxxx -> 628xxxxxxxx
  if (formatted.startsWith('8')) {
    formatted = `62${formatted}`;
  }

  return formatted;
}

// ============================================================================
// AMBIL IDENTIFIER PROGRAM
// ============================================================================

function getProgramIdentifier(transaction: any): string | null {
  // programSlug string
  if (
    typeof transaction?.programSlug === 'string' &&
    transaction.programSlug.trim()
  ) {
    return transaction.programSlug.trim();
  }

  // programSlug object Sanity
  if (
    transaction?.programSlug?.current &&
    typeof transaction.programSlug.current === 'string'
  ) {
    return transaction.programSlug.current;
  }

  // slug string
  if (
    typeof transaction?.slug === 'string' &&
    transaction.slug.trim()
  ) {
    return transaction.slug.trim();
  }

  // slug object Sanity
  if (
    transaction?.slug?.current &&
    typeof transaction.slug.current === 'string'
  ) {
    return transaction.slug.current;
  }

  // program berupa reference Sanity
  if (
    transaction?.program?._ref &&
    typeof transaction.program._ref === 'string'
  ) {
    return transaction.program._ref;
  }

  // campaignSlug jika project lama memakai nama ini
  if (
    typeof transaction?.campaignSlug === 'string' &&
    transaction.campaignSlug.trim()
  ) {
    return transaction.campaignSlug.trim();
  }

  if (
    transaction?.campaignSlug?.current &&
    typeof transaction.campaignSlug.current === 'string'
  ) {
    return transaction.campaignSlug.current;
  }

  return null;
}

// ============================================================================
// KIRIM NOTIFIKASI WHATSAPP VIA FONNTE
// ============================================================================

async function sendFonnteNotification(
  targetPhone: string,
  donorName: string,
  amount: number,
  programTitle: string,
  orderId: string
): Promise<boolean> {
  // ==========================================================
  // SESUAI ENVIRONMENT VARIABLE VERCEL ANDA
  // ==========================================================
  const fonnteToken = process.env.FONNTE_TOKEN;

  if (!fonnteToken) {
    console.error(
      '[Fonnte Error] FONNTE_TOKEN belum diatur di Environment Variables.'
    );

    return false;
  }

  const formattedPhone = formatPhoneNumber(targetPhone);

  if (!formattedPhone) {
    console.warn(
      `[Fonnte Warning] Nomor WhatsApp kosong untuk transaksi ${orderId}.`
    );

    return false;
  }

  if (formattedPhone.length < 10) {
    console.warn(
      `[Fonnte Warning] Nomor WhatsApp tidak valid: ${formattedPhone}`
    );

    return false;
  }

  const safeDonorName =
    String(donorName || '').trim() ||
    'Hamba Allah';

  const safeProgramTitle =
    String(programTitle || '').trim() ||
    'Program Kebaikan';

  const safeAmount =
    Number.isFinite(Number(amount))
      ? Number(amount)
      : 0;

  // ==========================================================================
  // PESAN WHATSAPP
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
      `[Fonnte] Mengirim WA transaksi ${orderId} ke ${formattedPhone}`
    );

    const response = await fetch(
      'https://api.fonnte.com/send',
      {
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
      }
    );

    const responseText = await response.text();

    let result: any = null;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        status: false,
        raw: responseText,
      };
    }

    console.log(
      '[Fonnte Response]',
      result
    );

    if (!response.ok) {
      console.error(
        `[Fonnte Error] HTTP ${response.status}`,
        result
      );

      return false;
    }

    if (result?.status === true) {
      console.log(
        `[Fonnte Success] WA transaksi ${orderId} berhasil dikirim.`
      );

      return true;
    }

    console.error(
      '[Fonnte Error] Pengiriman WA gagal:',
      result
    );

    return false;
  } catch (error) {
    console.error(
      '[Fonnte Exception]',
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
    // 1. BACA PAYLOAD
    // =========================================================================

    const body = await request.json();

    const {
      amount,
      order_id,
      status,
      payment_method,
      completed_at,
    } = body;

    const orderId =
      String(order_id || '').trim();

    const paymentStatus =
      String(status || '')
        .trim()
        .toLowerCase();

    console.log(
      `[Pakasir Webhook] Order: ${orderId || '-'} | Status: ${
        paymentStatus || '-'
      }`
    );

    // =========================================================================
    // VALIDASI
    // =========================================================================

    if (!orderId) {
      console.warn(
        '[Pakasir Webhook] order_id tidak ditemukan.'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'order_id tidak ditemukan',
        },
        {
          status: 400,
        }
      );
    }

    if (!paymentStatus) {
      console.warn(
        '[Pakasir Webhook] status tidak ditemukan.'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'status tidak ditemukan',
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================================
    // HANYA PROSES STATUS SUKSES
    // =========================================================================

    const isPaymentSuccess =
      paymentStatus === 'completed' ||
      paymentStatus === 'success';

    if (!isPaymentSuccess) {
      console.log(
        `[Pakasir Webhook] Status "${paymentStatus}" belum sukses.`
      );

      return NextResponse.json({
        success: true,
        message: `Webhook diterima dengan status ${paymentStatus}`,
      });
    }

    // =========================================================================
    // 2. SANITY CLIENT
    // =========================================================================

    const client = getSanityClient();

    // =========================================================================
    // 3. CARI TRANSAKSI
    // =========================================================================

    const transactionQuery = `
      *[
        _type == "donationTransaction" &&
        orderId == $orderId
      ][0]
    `;

    const transaction =
      await client.fetch(
        transactionQuery,
        {
          orderId,
        }
      );

    // =========================================================================
    // DATA DEFAULT
    // =========================================================================

    let donorName = 'Hamba Allah';

    let donorPhone = '';

    let donationAmount =
      Number(amount || 0);

    let programTitle =
      'Program Kebaikan';

    let programDoc: any = null;

    let programIdentifier: string | null = null;

    // =========================================================================
    // 4. JIKA TRANSAKSI DITEMUKAN
    // =========================================================================

    if (transaction) {
      console.log(
        `[Sanity] Transaksi ditemukan: ${transaction._id}`
      );

      donorName =
        transaction.donorName ||
        transaction.name ||
        'Hamba Allah';

      donorPhone =
        transaction.donorPhone ||
        transaction.phone ||
        transaction.whatsapp ||
        '';

      donationAmount = Number(
        transaction.amount ||
        amount ||
        0
      );

      programIdentifier =
        getProgramIdentifier(transaction);

      console.log(
        `[Sanity] Program identifier: ${
          programIdentifier || 'tidak ditemukan'
        }`
      );

      // =======================================================================
      // CARI PROGRAM
      // =======================================================================

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

        programDoc =
          await client.fetch(
            programQuery,
            {
              identifier:
                programIdentifier,
            }
          );

        if (programDoc) {
          programTitle =
            programDoc.title ||
            'Program Kebaikan';

          console.log(
            `[Sanity] Program ditemukan: ${programTitle}`
          );
        } else {
          console.warn(
            `[Sanity Warning] Program "${programIdentifier}" tidak ditemukan.`
          );
        }
      }

      // =======================================================================
      // CEK APAKAH SALDO SUDAH PERNAH DIPROSES
      // =======================================================================

      const alreadyProcessed =
        transaction.pakasirWebhookProcessed === true;

      if (alreadyProcessed) {
        console.log(
          `[Pakasir] Transaksi ${orderId} sudah pernah diproses. ` +
          `Saldo tidak ditambahkan lagi.`
        );
      } else {
        // =====================================================================
        // 5. TAMBAH SALDO PROGRAM
        // =====================================================================

        if (programDoc) {
          const newDonorEntry = {
            _key:
              `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 10)}`,

            name: donorName,

            amount:
              donationAmount,

            date:
              new Date().toLocaleDateString(
                'id-ID',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone:
                    'Asia/Jakarta',
                }
              ),
          };

          // ================================================================
          // TRANSACTION:
          // Update program + transaksi dalam satu commit
          // ================================================================

          const sanityTransaction =
            client.transaction();

          sanityTransaction.patch(
            programDoc._id,
            (patch) =>
              patch
                .setIfMissing({
                  collectedAmount: 0,
                  donors: [],
                })
                .inc({
                  collectedAmount:
                    donationAmount,
                })
                .append(
                  'donors',
                  [newDonorEntry]
                )
          );

          sanityTransaction.patch(
            transaction._id,
            (patch) =>
              patch.set({
                status: 'success',

                paymentMethod:
                  payment_method ||
                  transaction.paymentMethod ||
                  '',

                completedAt:
                  completed_at ||
                  new Date().toISOString(),

                pakasirWebhookProcessed:
                  true,

                pakasirWebhookProcessedAt:
                  new Date().toISOString(),
              })
          );

          await sanityTransaction.commit();

          console.log(
            `[Sanity Success] Saldo "${programTitle}" bertambah Rp ${donationAmount.toLocaleString(
              'id-ID'
            )}.`
          );
        } else {
          // =================================================================
          // PROGRAM TIDAK DITEMUKAN
          // Tetap update transaksi, tapi jangan tandai webhookProcessed
          // supaya bisa dicoba ulang setelah masalah program diperbaiki.
          // =================================================================

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

          console.warn(
            `[Sanity Warning] Status transaksi ${orderId} sudah SUCCESS, ` +
            `tetapi saldo program belum ditambahkan karena program tidak ditemukan.`
          );
        }
      }

      // =======================================================================
      // JIKA SUDAH PROSES SALDO TAPI STATUS BELUM SUCCESS
      // =======================================================================

      if (
        alreadyProcessed &&
        String(transaction.status || '').toLowerCase() !==
          'success'
      ) {
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
      }
    } else {
      // =========================================================================
      // TRANSAKSI TIDAK DITEMUKAN
      // =========================================================================

      console.warn(
        `[Sanity Warning] Transaksi ${orderId} tidak ditemukan.`
      );

      donorName =
        body.donorName ||
        body.name ||
        'Hamba Allah';

      donorPhone =
        body.donorPhone ||
        body.phone ||
        body.whatsapp ||
        '';

      donationAmount =
        Number(amount || 0);
    }

    // =========================================================================
    // 6. KIRIM NOTIFIKASI WHATSAPP
    // =========================================================================

    let whatsappSent = false;

    // Jika transaksi sudah pernah menerima WA,
    // jangan kirim dua kali.
    const alreadyNotified =
      transaction?.fonnteNotificationSent === true;

    if (alreadyNotified) {
      console.log(
        `[Fonnte] Transaksi ${orderId} sudah pernah dikirim WA.`
      );
    } else if (donorPhone) {
      whatsappSent =
        await sendFonnteNotification(
          donorPhone,
          donorName,
          donationAmount,
          programTitle,
          orderId
        );

      // =====================================================================
      // TANDAI WA SUDAH DIKIRIM
      // =====================================================================

      if (
        whatsappSent &&
        transaction?._id
      ) {
        try {
          await client
            .patch(transaction._id)
            .set({
              fonnteNotificationSent:
                true,

              fonnteNotificationSentAt:
                new Date().toISOString(),
            })
            .commit();

          console.log(
            `[Fonnte] Status notifikasi WA ${orderId} tersimpan di Sanity.`
          );
        } catch (markError) {
          console.error(
            '[Fonnte Warning] WA berhasil dikirim tetapi gagal menandai status notifikasi:',
            markError
          );
        }
      }
    } else {
      console.warn(
        `[Fonnte Warning] Nomor WhatsApp tidak ditemukan untuk transaksi ${orderId}.`
      );
    }

    // =========================================================================
    // 7. GOOGLE SHEET
    // =========================================================================

    const googleSheetScriptUrl =
      process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

    if (googleSheetScriptUrl) {
      try {
        const sheetResponse =
          await fetch(
            googleSheetScriptUrl,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  orderId,
                  status:
                    'success',

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

              cache:
                'no-store',
            }
          );

        if (sheetResponse.ok) {
          console.log(
            `[Google Sheet] ${orderId} berhasil disinkronkan.`
          );
        } else {
          console.error(
            `[Google Sheet Error] HTTP ${sheetResponse.status}`
          );
        }
      } catch (sheetError) {
        console.error(
          '[Google Sheet Error]',
          sheetError
        );
      }
    }

    // =========================================================================
    // RESPONSE WEBHOOK
    // =========================================================================

    return NextResponse.json({
      success: true,

      message:
        'Webhook processed successfully',

      orderId,

      transactionFound:
        Boolean(transaction),

      programFound:
        Boolean(programDoc),

      whatsapp:
        alreadyNotified
          ? 'already-sent'
          : whatsappSent
            ? 'sent'
            : 'not-sent',
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