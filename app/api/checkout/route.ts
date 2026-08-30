// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import { clientInternal } from "@/lib/sanity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface CheckoutRequestBody {
  slug?: string;

  donorName?: string;
  name?: string;

  donorPhone?: string;
  phone?: string;
  whatsapp?: string;

  fundraiserPhone?: string;
  referral?: string;

  paymentMethod?: string;

  amount?: number | string;
  nominal?: number | string;
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
 * HELPER - JSON ERROR
 * ============================================================
 */

function jsonError(
  error: string,
  status = 500,
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
 * HELPER - NOMINAL
 * ============================================================
 *
 * Mendukung:
 *
 * 10000
 * "10000"
 * "10.000"
 * "Rp 10.000"
 */

function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.floor(value);
  }

  const raw = String(value ?? "").replace(/[^0-9]/g, "");

  if (!raw) {
    return 0;
  }

  const amount = Number(raw);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.floor(amount);
}

/**
 * ============================================================
 * HELPER - PHONE
 * ============================================================
 */

function cleanPhone(value: unknown): string {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

/**
 * ============================================================
 * HELPER - CAMPAIGN CODE
 * ============================================================
 *
 * Tidak ada lagi INV-BDB.
 *
 * Contoh:
 *
 * sedekah-beras  -> BERAS
 * zakat-maal     -> ZAKAT
 * yatim-dhuafa   -> YATIM
 */

function getCampaignCode(slug: string): string {
  const value = slug.toUpperCase();

  if (value.includes("BERAS")) {
    return "BERAS";
  }

  if (value.includes("MUALAF")) {
    return "MUALAF";
  }

  if (value.includes("ZAKAT")) {
    return "ZAKAT";
  }

  if (value.includes("YATIM")) {
    return "YATIM";
  }

  if (value.includes("DHUAFA")) {
    return "DHUAFA";
  }

  if (value.includes("WAKAF")) {
    return "WAKAF";
  }

  if (value.includes("SUBUH")) {
    return "SUBUH";
  }

  if (value.includes("MASJID")) {
    return "MASJID";
  }

  if (value.includes("SANTRI")) {
    return "SANTRI";
  }

  return "DONASI";
}

/**
 * ============================================================
 * HELPER - PAYMENT METHOD
 * ============================================================
 *
 * Payment method akan menjadi bagian dari endpoint:
 *
 * /api/transactioncreate/{method}
 *
 * Maka hanya izinkan karakter aman.
 */

function normalizePaymentMethod(value: unknown): string {
  const method = String(value ?? "qris")
    .toLowerCase()
    .trim();

  if (!/^[a-z0-9_]{2,40}$/.test(method)) {
    return "";
  }

  return method;
}

/**
 * ============================================================
 * POST CHECKOUT
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    /**
     * --------------------------------------------------------
     * 1. VALIDASI ENVIRONMENT VARIABLES
     * --------------------------------------------------------
     */

    const projectSlug =
      process.env.PAKASIR_PROJECT_SLUG?.trim();

    const apiKey =
      process.env.PAKASIR_API_KEY?.trim();

    /**
     * Mendukung nama token baru dan lama sementara.
     *
     * Disarankan gunakan:
     *
     * SANITY_API_TOKEN
     */

    const sanityWriteToken =
      process.env.SANITY_API_TOKEN?.trim() ||
      process.env.SANITY_API_WRITE_TOKEN?.trim();

    if (!projectSlug) {
      console.error(
        "[CHECKOUT] PAKASIR_PROJECT_SLUG belum disetel."
      );

      return jsonError(
        "Konfigurasi pembayaran belum lengkap.",
        500,
        "PAKASIR_PROJECT_SLUG belum tersedia di server."
      );
    }

    if (!apiKey) {
      console.error(
        "[CHECKOUT] PAKASIR_API_KEY belum disetel."
      );

      return jsonError(
        "Konfigurasi pembayaran belum lengkap.",
        500,
        "PAKASIR_API_KEY belum tersedia di server."
      );
    }

    if (!sanityWriteToken) {
      console.error(
        "[CHECKOUT] Token write Sanity belum disetel."
      );

      return jsonError(
        "Konfigurasi database belum lengkap.",
        500,
        "SANITY_API_TOKEN belum tersedia di server."
      );
    }

    /**
     * --------------------------------------------------------
     * 2. BACA REQUEST BODY
     * --------------------------------------------------------
     */

    let body: CheckoutRequestBody;

    try {
      body = (await request.json()) as CheckoutRequestBody;
    } catch {
      return jsonError(
        "Request checkout tidak valid.",
        400,
        "Body request harus berupa JSON."
      );
    }

    /**
     * --------------------------------------------------------
     * 3. NORMALISASI DATA
     * --------------------------------------------------------
     */

    const slug = String(body.slug ?? "").trim();

    const donorName =
      String(
        body.donorName ??
          body.name ??
          "Hamba Allah"
      ).trim() || "Hamba Allah";

    const donorPhone = cleanPhone(
      body.donorPhone ??
        body.phone ??
        body.whatsapp
    );

    const fundraiserPhone = cleanPhone(
      body.fundraiserPhone ??
        body.referral
    );

    const paymentMethod = normalizePaymentMethod(
      body.paymentMethod
    );

    const cleanAmountNumber = parseAmount(
      body.amount ??
        body.nominal
    );

    /**
     * --------------------------------------------------------
     * 4. VALIDASI SLUG
     * --------------------------------------------------------
     */

    if (!slug) {
      return jsonError(
        "Program donasi tidak ditemukan.",
        400
      );
    }

    if (slug.length > 150) {
      return jsonError(
        "Slug program tidak valid.",
        400
      );
    }

    /**
     * --------------------------------------------------------
     * 5. VALIDASI NOMINAL
     * --------------------------------------------------------
     */

    if (
      !cleanAmountNumber ||
      cleanAmountNumber < 1000
    ) {
      return jsonError(
        "Data tidak valid. Minimal donasi adalah Rp 1.000.",
        400
      );
    }

    /**
     * --------------------------------------------------------
     * 6. VALIDASI NOMOR WHATSAPP
     * --------------------------------------------------------
     */

    if (
      !donorPhone ||
      donorPhone.length < 9 ||
      donorPhone.length > 20
    ) {
      return jsonError(
        "Nomor WhatsApp tidak valid.",
        400
      );
    }

    /**
     * --------------------------------------------------------
     * 7. VALIDASI METODE PEMBAYARAN
     * --------------------------------------------------------
     */

    if (!paymentMethod) {
      return jsonError(
        "Metode pembayaran tidak valid.",
        400
      );
    }

    /**
     * --------------------------------------------------------
     * 8. GENERATE ORDER ID
     * --------------------------------------------------------
     *
     * DULU:
     *
     * INV-BDB-BERAS-...
     *
     * SEKARANG:
     *
     * INV-MUKHLASIN-BERAS-...
     */

    const campaignCode = getCampaignCode(slug);

    const generatedOrderId =
      `INV-MUKHLASIN-${campaignCode}-${Date.now()}`;

    /**
     * --------------------------------------------------------
     * 9. ENDPOINT PAKASIR
     * --------------------------------------------------------
     */

    const targetPakasirUrl =
      `https://app.pakasir.com/api/transactioncreate/` +
      encodeURIComponent(paymentMethod);

    const pakasirPayload = {
      project: projectSlug,
      order_id: generatedOrderId,
      amount: cleanAmountNumber,
      api_key: apiKey,
    };

    /**
     * JANGAN pernah log api_key.
     */

    console.log("[CHECKOUT] Membuat transaksi Pakasir:", {
      project: projectSlug,
      orderId: generatedOrderId,
      amount: cleanAmountNumber,
      method: paymentMethod,
    });

    /**
     * --------------------------------------------------------
     * 10. REQUEST KE PAKASIR
     * --------------------------------------------------------
     */

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20_000);

    let pakasirResponse: Response;

    try {
      pakasirResponse = await fetch(
        targetPakasirUrl,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(pakasirPayload),

          cache: "no-store",

          signal: controller.signal,
        }
      );
    } catch (fetchError: unknown) {
      if (
        fetchError instanceof Error &&
        fetchError.name === "AbortError"
      ) {
        console.error(
          "[CHECKOUT] Request Pakasir timeout."
        );

        return jsonError(
          "Server pembayaran tidak merespons.",
          504
        );
      }

      console.error(
        "[CHECKOUT] Gagal menghubungi Pakasir:",
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
     * --------------------------------------------------------
     * 11. PARSE RESPONSE PAKASIR
     * --------------------------------------------------------
     */

    const responseText =
      await pakasirResponse.text();

    let pakasirData: PakasirResponse | null = null;

    if (responseText) {
      try {
        pakasirData =
          JSON.parse(responseText) as PakasirResponse;
      } catch {
        console.error(
          "[CHECKOUT] Response Pakasir bukan JSON:",
          {
            status: pakasirResponse.status,
            response: responseText.slice(0, 500),
          }
        );

        return jsonError(
          "Respons dari gateway pembayaran tidak valid.",
          502
        );
      }
    }

    /**
     * --------------------------------------------------------
     * 12. HANDLE ERROR PAKASIR
     * --------------------------------------------------------
     */

    if (
      !pakasirResponse.ok ||
      !pakasirData?.payment
    ) {
      const providerError =
        pakasirData?.error ||
        pakasirData?.message ||
        `Pakasir mengembalikan HTTP ${pakasirResponse.status}`;

      console.error(
        "[CHECKOUT] Pakasir menolak transaksi:",
        {
          status: pakasirResponse.status,
          project: projectSlug,
          orderId: generatedOrderId,
          method: paymentMethod,
          error: providerError,
        }
      );

      if (
        pakasirResponse.status === 401 ||
        pakasirResponse.status === 403
      ) {
        return jsonError(
          "Autentikasi Pakasir gagal.",
          pakasirResponse.status,
          providerError
        );
      }

      return jsonError(
        providerError,
        pakasirResponse.status >= 400 &&
          pakasirResponse.status <= 599
          ? pakasirResponse.status
          : 502
      );
    }

    /**
     * --------------------------------------------------------
     * 13. NORMALISASI PAYMENT INFO
     * --------------------------------------------------------
     */

    const paymentInfo =
      pakasirData.payment;

    const paymentNumber =
      String(
        paymentInfo.payment_number ?? ""
      );

    const totalPayment = Number(
      paymentInfo.total_payment ??
        paymentInfo.amount ??
        cleanAmountNumber
    );

    const fee = Number(
      paymentInfo.fee ?? 0
    );

    const expiredAt =
      String(
        paymentInfo.expired_at ?? ""
      );

    /**
     * --------------------------------------------------------
     * 14. RETURN URL
     * --------------------------------------------------------
     *
     * Tidak ada lagi fallback:
     *
     * https://bdb.or.id
     *
     * SITE_URL boleh digunakan jika ingin memaksa domain
     * production.
     *
     * Jika tidak tersedia, otomatis menggunakan domain
     * request saat ini.
     */

    const requestOrigin =
      new URL(request.url).origin;

    const siteUrl = (
      process.env.SITE_URL?.trim() ||
      requestOrigin
    ).replace(/\/+$/, "");

    const returnUrl =
      `${siteUrl}/thank-you?order_id=` +
      encodeURIComponent(generatedOrderId);

    /**
     * --------------------------------------------------------
     * 15. PAYMENT URL PAKASIR
     * --------------------------------------------------------
     */

    const paymentUrlObject = new URL(
      `https://app.pakasir.com/pay/` +
        `${encodeURIComponent(projectSlug)}/` +
        `${cleanAmountNumber}`
    );

    paymentUrlObject.searchParams.set(
      "order_id",
      generatedOrderId
    );

    paymentUrlObject.searchParams.set(
      "redirect",
      returnUrl
    );

    /**
     * Langsung tampilkan QRIS jika metode QRIS.
     */

    if (paymentMethod === "qris") {
      paymentUrlObject.searchParams.set(
        "qris_only",
        "1"
      );
    }

    const pakasirPayUrl =
      paymentUrlObject.toString();

    /**
     * --------------------------------------------------------
     * 16. SIMPAN TRANSAKSI KE SANITY
     * --------------------------------------------------------
     *
     * Menggunakan clientInternal dari:
     *
     * lib/sanity.ts
     *
     * Tidak ada token yang ditulis di source code.
     */

    try {
      await clientInternal.create({
        _type: "donationTransaction",

        orderId: generatedOrderId,

        donorName,

        donorPhone,

        amount: cleanAmountNumber,

        totalAmount:
          Number.isFinite(totalPayment)
            ? totalPayment
            : cleanAmountNumber,

        status: "pending",

        slug,

        paymentMethod,

        paymentUrl: pakasirPayUrl,

        paymentNumber,

        fundraiserPhone:
          fundraiserPhone || "",

        createdAt:
          new Date().toISOString(),
      });
    } catch (sanityError: unknown) {
      console.error(
        "[CHECKOUT] Gagal menyimpan transaksi ke Sanity:",
        sanityError
      );

      /**
       * Pakasir sudah berhasil membuat transaksi.
       *
       * Tetapi transaksi tidak boleh diteruskan jika database
       * internal gagal mencatatnya, supaya pencatatan donasi
       * tidak kacau.
       */

      return jsonError(
        "Transaksi pembayaran berhasil dibuat, tetapi pencatatan transaksi gagal.",
        500,
        "Silakan hubungi administrator sebelum mencoba kembali."
      );
    }

    console.log(
      "[CHECKOUT] Transaksi tersimpan di Sanity:",
      {
        orderId: generatedOrderId,
        fundraiser:
          fundraiserPhone || "Non-Afiliasi",
      }
    );

    /**
     * --------------------------------------------------------
     * 17. SYNC KE GOOGLE SHEET
     * --------------------------------------------------------
     *
     * Google Sheet bersifat tambahan.
     *
     * Kalau gagal, transaksi tetap dilanjutkan karena sumber
     * utama pencatatan sudah tersimpan di Sanity.
     */

    const googleSheetScriptUrl =
      process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

    if (googleSheetScriptUrl) {
      const sheetController =
        new AbortController();

      const sheetTimeout =
        setTimeout(() => {
          sheetController.abort();
        }, 8_000);

      try {
        const sheetResponse = await fetch(
          googleSheetScriptUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              orderId:
                generatedOrderId,

              donorName,

              /**
               * Awali apostrof supaya Google Sheet
               * mempertahankan nomor sebagai teks.
               */
              donorPhone:
                `'${donorPhone}`,

              amount:
                cleanAmountNumber,

              totalAmount:
                Number.isFinite(totalPayment)
                  ? totalPayment
                  : cleanAmountNumber,

              fee:
                Number.isFinite(fee)
                  ? fee
                  : 0,

              programSlug:
                slug,

              paymentMethod,

              paymentNumber,

              fundraiserPhone:
                fundraiserPhone
                  ? `'${fundraiserPhone}`
                  : "-",

              status:
                "pending",

              createdAt:
                new Date().toLocaleString(
                  "id-ID",
                  {
                    timeZone:
                      "Asia/Jakarta",
                  }
                ),
            }),

            cache: "no-store",

            signal:
              sheetController.signal,
          }
        );

        if (!sheetResponse.ok) {
          console.error(
            "[CHECKOUT] Google Sheet webhook error:",
            {
              status:
                sheetResponse.status,
            }
          );
        } else {
          console.log(
            "[CHECKOUT] Data sinkron ke Google Sheet:",
            generatedOrderId
          );
        }
      } catch (sheetError: unknown) {
        if (
          sheetError instanceof Error &&
          sheetError.name === "AbortError"
        ) {
          console.error(
            "[CHECKOUT] Google Sheet webhook timeout."
          );
        } else {
          console.error(
            "[CHECKOUT] Gagal mengirim ke Google Sheet:",
            sheetError
          );
        }
      } finally {
        clearTimeout(sheetTimeout);
      }
    } else {
      console.warn(
        "[CHECKOUT] GOOGLE_SHEET_WEBHOOK_URL belum disetel."
      );
    }

    /**
     * --------------------------------------------------------
     * 18. RESPONSE KE FRONTEND
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        orderId:
          generatedOrderId,

        amount:
          cleanAmountNumber,

        fee:
          Number.isFinite(fee)
            ? fee
            : 0,

        totalPayment:
          Number.isFinite(totalPayment)
            ? totalPayment
            : cleanAmountNumber,

        paymentMethod,

        paymentNumber,

        expiredAt,

        returnUrl,

        paymentUrl:
          pakasirPayUrl,

        project:
          projectSlug,
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
    console.error(
      "[CHECKOUT] Unexpected backend error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return jsonError(
      "Terjadi kesalahan pada server saat memproses transaksi.",
      500,
      process.env.NODE_ENV === "development"
        ? message
        : undefined
    );
  }
}

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Hanya untuk mengecek bahwa endpoint hidup.
 * Tidak menampilkan API key/token.
 */

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "Mukhlasin Checkout API",
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