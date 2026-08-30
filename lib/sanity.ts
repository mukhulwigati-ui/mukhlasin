// lib/sanity.ts

import { createClient } from "@sanity/client";
import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";

/**
 * ============================================================
 * KONFIGURASI SANITY
 * ============================================================
 *
 * NEXT_PUBLIC_* boleh digunakan di browser.
 * SANITY_API_TOKEN hanya boleh digunakan di server.
 */

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.NEXT_SANITY_PROJECT_ID ||
  "a45erd4y";

const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.NEXT_SANITY_DATASET ||
  "production";

const apiVersion = "2026-07-18";

/**
 * ============================================================
 * CLIENT PUBLIK
 * ============================================================
 *
 * Digunakan untuk membaca data publik:
 * - Campaign
 * - Artikel
 * - Program
 * - Gambar
 *
 * Client ini tidak menggunakan token.
 */

export const clientPublik = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

/**
 * ============================================================
 * CLIENT INTERNAL / WRITE
 * ============================================================
 *
 * Digunakan hanya pada sisi server, misalnya:
 * - API Route Next.js
 * - Server Action
 * - Server Component
 * - Webhook
 *
 * Jangan gunakan clientInternal pada file dengan:
 *
 * "use client"
 *
 * Token write tidak boleh menggunakan prefix NEXT_PUBLIC_.
 */

const sanityWriteToken =
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;

export const clientInternal = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: sanityWriteToken,
  perspective: "published",
});

/**
 * ============================================================
 * IMAGE URL BUILDER
 * ============================================================
 */

const builder = createImageUrlBuilder(clientPublik);

/**
 * Membuat URL gambar dari asset Sanity.
 *
 * Contoh:
 *
 * urlFor(image)
 *   .width(1200)
 *   .height(675)
 *   .quality(90)
 *   .url();
 */

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * ============================================================
 * DEFAULT EXPORT
 * ============================================================
 *
 * Dipertahankan agar kode lama seperti:
 *
 * import client from "@/lib/sanity";
 *
 * tetap berjalan.
 */

export default clientPublik;