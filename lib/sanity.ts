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
 * NEXT_PUBLIC_* aman digunakan di browser.
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
 * Digunakan untuk:
 * - mengambil campaign
 * - mengambil artikel
 * - mengambil gambar
 * - query data publik
 *
 * Tidak menggunakan token.
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
 * CLIENT INTERNAL
 * ============================================================
 *
 * HANYA gunakan clientInternal di:
 *
 * - app/api/**/route.ts
 * - Server Action
 * - server component
 * - webhook
 *
 * JANGAN digunakan di component dengan "use client".
 *
 * Token tidak menggunakan NEXT_PUBLIC_ agar tidak terekspos
 * ke browser.
 */

export const clientInternal = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,

  token:
    process.env.SANITY_API_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN,
});

/**
 * ============================================================
 * SANITY IMAGE BUILDER
 * ============================================================
 */

const builder = createImageUrlBuilder(clientPublik);

/**
 * Generate URL gambar Sanity.
 *
 * Contoh:
 *
 * urlFor(image)
 *   .width(1200)
 *   .height(675)
 *   .quality(90)
 *   .url()
 */

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Default export tetap dipertahankan agar file-file lama
 * yang menggunakan:
 *
 * import client from "@/lib/sanity"
 *
 * tidak error.
 */

export default clientPublik;