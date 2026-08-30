// app/peta-situs/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { clientPublik } from "@/lib/sanity";

/**
 * ============================================================
 * NEXT.JS PAGE CONFIG
 * ============================================================
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ============================================================
 * METADATA SEO
 * ============================================================
 */

export const metadata: Metadata = {
  title: "Peta Situs Resmi (Sitemap) | mukhlasin.or.id",

  description:
    "Indeks navigasi lengkap seluruh program donasi, zakat digital, infak kemanusiaan, wakaf, dan kabar berita pembaruan mukhlasin.or.id (Yayasan Darul Mukhlasin Kroya, Cilacap).",

  alternates: {
    canonical: "https://mukhlasin.or.id/peta-situs",
  },

  robots: {
    index: true,
    follow: true,
    nocache: true,

    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Peta Situs Resmi (Sitemap) | mukhlasin.or.id",

    description:
      "Akses cepat seluruh struktur halaman program kebaikan dan transparansi laporan mukhlasin.or.id.",

    url: "https://mukhlasin.or.id/peta-situs",
    siteName: "mukhlasin.or.id",
    locale: "id_ID",
    type: "website",
  },
};

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface SitemapItem {
  title: string;
  slug: string;
  _createdAt?: string;
}

interface SitemapData {
  programs: SitemapItem[];
  news: SitemapItem[];
}

/**
 * ============================================================
 * STATIC PAGES
 * ============================================================
 */

const halamanInti = [
  {
    title: "Beranda / Halaman Utama",
    url: "/",
  },
  {
    title: "Kalkulator Zakat Otomatis",
    url: "/zakat",
  },
  {
    title: "Portal Fundraiser & Statistik",
    url: "/fundraiser/stats",
  },
  {
    title: "Tentang Kami & Legalitas",
    url: "/tentang-kami",
  },
  {
    title: "Hubungi Kami (Layanan Amil)",
    url: "/kontak",
  },
];

/**
 * ============================================================
 * SANITY QUERY
 * ============================================================
 */

const sitemapQuery = `
{
  "programs": *[
    _type == "program" &&
    defined(slug.current)
  ] | order(_createdAt desc) {
    title,
    "slug": slug.current,
    _createdAt
  },

  "news": *[
    _type == "news" &&
    defined(slug.current)
  ] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    _createdAt
  }
}
`;

/**
 * ============================================================
 * PAGE
 * ============================================================
 */

export default async function PetaSitusPage() {
  let programs: SitemapItem[] = [];
  let news: SitemapItem[] = [];

  /**
   * ----------------------------------------------------------
   * FETCH DATA SANITY
   * ----------------------------------------------------------
   *
   * Menggunakan clientPublik dari lib/sanity.ts.
   *
   * Tidak lagi membuat createClient sendiri di halaman ini.
   * Dengan begitu konfigurasi project ID dan dataset hanya
   * berada di satu tempat.
   */

  try {
    const data = await clientPublik.fetch<SitemapData>(
      sitemapQuery,
      {},
      {
        cache: "no-store",
      }
    );

    programs = Array.isArray(data?.programs)
      ? data.programs
      : [];

    news = Array.isArray(data?.news)
      ? data.news
      : [];
  } catch (error) {
    /**
     * Jangan throw error di sini.
     *
     * Kalau Sanity sementara bermasalah, halaman tetap dapat
     * dirender sehingga proses build/deploy tidak ikut gagal.
     */

    console.error(
      "[PETA SITUS] Gagal mengambil data Sanity:",
      error
    );
  }

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 pb-28 text-left">
      <div className="mx-auto w-full max-w-md space-y-4">

        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="space-y-2 border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            🗺️ Peta Situs Resmi (HTML Sitemap)
          </h1>

          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Halaman ini disediakan untuk mempermudah
            perayapan indeks mesin pencari sekaligus membantu
            pengunjung menavigasi seluruh struktur direktori URL{" "}
            <span className="font-semibold text-slate-800">
              mukhlasin.or.id
            </span>{" "}
            secara lebih mudah.
          </p>
        </section>

        {/* ===================================================
            SITEMAP CONTENT
        =================================================== */}

        <div className="space-y-4">

          {/* =================================================
              HALAMAN UTAMA
          ================================================= */}

          <section className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="inline-block border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 sm:text-sm">
              📂 Halaman Utama & Fitur
            </h2>

            <ul className="space-y-3 text-xs font-medium text-slate-800 sm:text-sm">
              {halamanInti.map((item) => (
                <li
                  key={item.url}
                  className="border-b border-slate-100 pb-2.5 last:border-none"
                >
                  <Link
                    href={item.url}
                    className="block font-bold leading-snug transition hover:text-emerald-700"
                  >
                    {item.title}

                    <span className="mt-0.5 block break-all text-[11px] font-normal text-slate-400">
                      {`https://mukhlasin.or.id${item.url}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* =================================================
              PROGRAM / CAMPAIGN
          ================================================= */}

          <section className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="inline-block border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 sm:text-sm">
              📦 Program Kebaikan ({programs.length})
            </h2>

            {programs.length > 0 ? (
              <ul className="max-h-[400px] space-y-3 overflow-y-auto pr-1 text-xs font-medium text-slate-800 sm:text-sm">
                {programs.map((item) => {
                  const url = `/campaign/${item.slug}`;

                  return (
                    <li
                      key={item.slug}
                      className="border-b border-slate-100 pb-2.5 last:border-none"
                    >
                      <Link
                        href={url}
                        className="block font-bold leading-snug transition hover:text-emerald-700"
                      >
                        {item.title}

                        <span className="mt-0.5 block break-all text-[11px] font-normal text-slate-400">
                          {`https://mukhlasin.or.id${url}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs italic text-slate-400">
                Belum ada program kampanye aktif.
              </p>
            )}
          </section>

          {/* =================================================
              NEWS
          ================================================= */}

          <section className="space-y-3 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="inline-block border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 sm:text-sm">
              📰 Berita & Kabar ({news.length})
            </h2>

            {news.length > 0 ? (
              <ul className="max-h-[400px] space-y-3 overflow-y-auto pr-1 text-xs font-medium text-slate-800 sm:text-sm">
                {news.map((item) => {
                  const url = `/news/${item.slug}`;

                  return (
                    <li
                      key={item.slug}
                      className="border-b border-slate-100 pb-2.5 last:border-none"
                    >
                      <Link
                        href={url}
                        className="block font-bold leading-snug transition hover:text-emerald-700"
                      >
                        {item.title}

                        <span className="mt-0.5 block break-all text-[11px] font-normal text-slate-400">
                          {`https://mukhlasin.or.id${url}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs italic text-slate-400">
                Belum ada artikel berita diterbitkan.
              </p>
            )}
          </section>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="pt-2 text-center text-xs font-medium tracking-wide text-slate-400">
          © {new Date().getFullYear()} mukhlasin.or.id. Peta
          situs diperbarui secara otomatis berdasarkan konten
          yang diterbitkan.
        </footer>
      </div>
    </main>
  );
}