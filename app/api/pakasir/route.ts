// app/api/pakasir/route.ts

import { NextResponse } from "next/server";

/**
 * ============================================================
 * PAKASIR - CREATE TRANSACTION API
 * ============================================================
 *
 * Endpoint internal:
 * POST /api/pakasir
 *
 * Endpoint Pakasir:
 * POST https://app.pakasir.com/api/transactioncreate/{method}
 *
 * Environment variables:
 *
 * PAKASIR_PROJECT_SLUG=slug-project-anda
 * PAKASIR_API_KEY=api-key-anda
 *
 * PENTING:
 * - Jangan menggunakan NEXT_PUBLIC_ untuk API KEY.
 * - API KEY hanya boleh digunakan di server.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Payment method yang saat ini didukung Pakasir.
 */
const ALLOWED_PAYMENT_METHODS = [
  "qris",
  "cimb_niaga_va",
  "bni_va",
  "sampoerna_va",
  "bnc_va",
  "maybank_va",
  "permata_va",
  "atm_bersama_va",
  "artha_graha_va",
  "bri_va",
] as const;

type PaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];

interface PakasirRequestBody {
  order_id?: string;
  amount?: number | string;
  method?: string;
}

interface PakasirPayment {
  project?: string;
  order_id?: string;
  amount?: number;
  fee?: number;
  total_payment?: number;
  payment_method?: string;
  payment_number?: string;
  expired_at?: string;
}

interface PakasirResponse {
  payment?: PakasirPayment;

  error?: string;
  message?: string;

  [key: string]: unknown;
}

/**
 * ============================================================
 * HELPER RESPONSE
 * ============================================================
 */

function jsonError(
  error: string,
  status: number = 500,
  details?: string
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

/**
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    /**
     * ----------------------------------------------------------
     * 1. ENVIRONMENT VARIABLES
     * ----------------------------------------------------------
     */

    const projectSlug = process.env.PAKASIR_PROJECT_SLUG?.trim();
    const apiKey = process.env.PAKASIR_API_KEY?.trim();

    /**
     * Jangan memakai fallback seperti "depodomain".
     *
     * "depodomain" hanyalah project contoh dari dokumentasi
     * Pakasir dan tidak boleh digunakan sebagai fallback.
     */

    if (!projectSlug) {
      console.error(
        "[PAKASIR] Environment variable PAKASIR_PROJECT_SLUG tidak ditemukan."
      );

      return jsonError(
        "Konfigurasi pembayaran belum lengkap.",
        500,
        "PAKASIR_PROJECT_SLUG belum diatur di server."
      );
    }

    if (!apiKey) {
      console.error(
        "[PAKASIR] Environment variable PAKASIR_API_KEY tidak ditemukan."
      );

      return jsonError(
        "Konfigurasi pembayaran belum lengkap.",
        500,
        "PAKASIR_API_KEY belum diatur di server."
      );
    }

    /**
     * ----------------------------------------------------------
     * 2. BACA REQUEST BODY
     * ----------------------------------------------------------
     */

    let body: PakasirRequestBody;

    try {
      body = (await request.json()) as PakasirRequestBody;
    } catch {
      return jsonError(
        "Request tidak valid.",
        400,
        "Body request harus berupa JSON."
      );
    }

    const rawOrderId = body?.order_id;
    const rawAmount = body?.amount;
    const rawMethod = body?.method ?? "qris";

    /**
     * ----------------------------------------------------------
     * 3. VALIDASI ORDER ID
     * ----------------------------------------------------------
     */

    if (
      rawOrderId === undefined ||
      rawOrderId === null ||
      String(rawOrderId).trim() === ""
    ) {
      return jsonError(
        "Order ID tidak ditemukan.",
        400,
        "Field order_id wajib diisi."
      );
    }

    const orderId = String(rawOrderId).trim();

    /**
     * Batasi panjang supaya data aneh tidak dikirim ke provider.
     */
    if (orderId.length > 100) {
      return jsonError(
        "Order ID tidak valid.",
        400,
        "Order ID terlalu panjang."
      );
    }

    /**
     * ----------------------------------------------------------
     * 4. VALIDASI NOMINAL
     * ----------------------------------------------------------
     */

    if (
      rawAmount === undefined ||
      rawAmount === null ||
      String(rawAmount).trim() === ""
    ) {
      return jsonError(
        "Nominal pembayaran tidak ditemukan.",
        400,
        "Field amount wajib diisi."
      );
    }

    const amount = Number(rawAmount);

    if (!Number.isFinite(amount)) {
      return jsonError(
        "Nominal pembayaran tidak valid.",
        400,
        "Amount harus berupa angka."
      );
    }

    if (!Number.isInteger(amount)) {
      return jsonError(
        "Nominal pembayaran tidak valid.",
        400,
        "Amount harus berupa bilangan bulat."
      );
    }

    if (amount <= 0) {
      return jsonError(
        "Nominal pembayaran tidak valid.",
        400,
        "Amount harus lebih besar dari 0."
      );
    }

    /**
     * ----------------------------------------------------------
     * 5. VALIDASI PAYMENT METHOD
     * ----------------------------------------------------------
     */

    const cleanMethod = String(rawMethod)
      .toLowerCase()
      .trim() as PaymentMethod;

    if (
      !ALLOWED_PAYMENT_METHODS.includes(cleanMethod)
    ) {
      console.error(
        `[PAKASIR] Payment method tidak didukung: ${cleanMethod}`
      );

      return jsonError(
        "Metode pembayaran tidak didukung.",
        400,
        `Metode "${cleanMethod}" tidak tersedia.`
      );
    }

    /**
     * ----------------------------------------------------------
     * 6. ENDPOINT PAKASIR
     * ----------------------------------------------------------
     */

    const targetUrl =
      `https://app.pakasir.com/api/transactioncreate/${encodeURIComponent(
        cleanMethod
      )}`;

    /**
     * Payload sesuai dokumentasi Pakasir.
     */
    const pakasirPayload = {
      project: projectSlug,
      order_id: orderId,
      amount,
      api_key: apiKey,
    };

    /**
     * Jangan log api_key.
     */
    console.log("[PAKASIR] Membuat transaksi:", {
      project: projectSlug,
      order_id: orderId,
      amount,
      method: cleanMethod,
    });

    /**
     * ----------------------------------------------------------
     * 7. TIMEOUT REQUEST
     * ----------------------------------------------------------
     */

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20_000);

    let response: Response;

    try {
      response = await fetch(targetUrl, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(pakasirPayload),

        cache: "no-store",

        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (
        fetchError instanceof Error &&
        fetchError.name === "AbortError"
      ) {
        console.error("[PAKASIR] Request timeout.");

        return jsonError(
          "Server pembayaran tidak merespons.",
          504,
          "Permintaan ke Pakasir melewati batas waktu."
        );
      }

      console.error(
        "[PAKASIR] Gagal menghubungi server Pakasir:",
        fetchError
      );

      return jsonError(
        "Tidak dapat menghubungi server pembayaran.",
        502
      );
    } finally {
      clearTimeout(timeoutId);
    }

    /**
     * ----------------------------------------------------------
     * 8. AMBIL RESPONSE PAKASIR
     * ----------------------------------------------------------
     */

    const responseText = await response.text();

    let data: PakasirResponse | null = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText) as PakasirResponse;
      } catch {
        console.error(
          "[PAKASIR] Response bukan JSON:",
          {
            status: response.status,
            body: responseText.slice(0, 500),
          }
        );

        return jsonError(
          "Respons server pembayaran tidak valid.",
          502,
          `HTTP ${response.status}`
        );
      }
    }

    /**
     * ----------------------------------------------------------
     * 9. HANDLE RESPONSE ERROR
     * ----------------------------------------------------------
     */

    if (!response.ok) {
      const providerError =
        data?.error ||
        data?.message ||
        `Pakasir mengembalikan HTTP ${response.status}`;

      console.error("[PAKASIR] Provider error:", {
        status: response.status,
        statusText: response.statusText,
        project: projectSlug,
        order_id: orderId,
        method: cleanMethod,
        error: providerError,
      });

      /**
       * Error autentikasi.
       *
       * Biasanya:
       * - API key salah
       * - API key tidak sesuai project
       * - slug project salah
       * - environment variable lama
       */
      if (
        response.status === 401 ||
        response.status === 403
      ) {
        return jsonError(
          "Autentikasi Pakasir gagal.",
          response.status,
          providerError
        );
      }

      return jsonError(
        providerError,
        response.status >= 400 &&
          response.status <= 599
          ? response.status
          : 502
      );
    }

    /**
     * ----------------------------------------------------------
     * 10. VALIDASI PAYMENT OBJECT
     * ----------------------------------------------------------
     */

    if (!data?.payment) {
      console.error(
        "[PAKASIR] Response sukses tetapi payment tidak ditemukan:",
        data
      );

      return jsonError(
        "Data pembayaran dari Pakasir tidak lengkap.",
        502
      );
    }

    const payment = data.payment;

    /**
     * ----------------------------------------------------------
     * 11. VALIDASI PAYMENT NUMBER
     * ----------------------------------------------------------
     *
     * Untuk QRIS:
     * payment_number berisi QR string.
     *
     * Untuk VA:
     * payment_number berisi nomor Virtual Account.
     */

    if (!payment.payment_number) {
      console.error(
        "[PAKASIR] payment_number tidak ditemukan:",
        {
          order_id: payment.order_id,
          payment_method: payment.payment_method,
        }
      );

      return jsonError(
        "Nomor pembayaran tidak diterima dari Pakasir.",
        502
      );
    }

    /**
     * ----------------------------------------------------------
     * 12. NORMALISASI RESPONSE UNTUK FRONTEND
     * ----------------------------------------------------------
     */

    const normalizedPayment = {
      project:
        payment.project ||
        projectSlug,

      order_id:
        payment.order_id ||
        orderId,

      amount:
        Number(payment.amount ?? amount),

      fee:
        Number(payment.fee ?? 0),

      total_payment:
        Number(
          payment.total_payment ??
            payment.amount ??
            amount
        ),

      payment_method:
        payment.payment_method ||
        cleanMethod,

      payment_number:
        payment.payment_number,

      expired_at:
        payment.expired_at ||
        "",
    };

    console.log("[PAKASIR] Transaksi berhasil dibuat:", {
      project: normalizedPayment.project,
      order_id: normalizedPayment.order_id,
      amount: normalizedPayment.amount,
      total_payment: normalizedPayment.total_payment,
      payment_method: normalizedPayment.payment_method,
      expired_at: normalizedPayment.expired_at,
    });

    /**
     * ----------------------------------------------------------
     * 13. RESPONSE KE FRONTEND
     * ----------------------------------------------------------
     *
     * Saya kirim dua format:
     *
     * 1. Properti lama:
     *    orderId
     *    totalPayment
     *    paymentNumber
     *
     * 2. Object payment
     *
     * Dengan begitu frontend lama tetap kompatibel.
     */

    return NextResponse.json(
      {
        success: true,

        orderId:
          normalizedPayment.order_id,

        amount:
          normalizedPayment.amount,

        fee:
          normalizedPayment.fee,

        totalPayment:
          normalizedPayment.total_payment,

        paymentMethod:
          normalizedPayment.payment_method,

        paymentNumber:
          normalizedPayment.payment_number,

        expiredAt:
          normalizedPayment.expired_at,

        payment: normalizedPayment,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    /**
     * ----------------------------------------------------------
     * 14. UNEXPECTED ERROR
     * ----------------------------------------------------------
     */

    console.error(
      "[PAKASIR] Unexpected server error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return jsonError(
      "Terjadi kesalahan pada server saat memproses pembayaran.",
      500,
      process.env.NODE_ENV === "development"
        ? message
        : undefined
    );
  }
}

/**
 * ============================================================
 * METHOD LAIN TIDAK DIPAKAI
 * ============================================================
 */

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "Pakasir Payment API",
      status: "ready",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}