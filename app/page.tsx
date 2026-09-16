// app/page.tsx

import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@sanity/client';

import Hero, { HeroBanner } from '@/components/Hero';
import TotalAccumulationWidget from '@/components/TotalAccumulationWidget';
import Campaign from '@/components/Campaign';
import News from '@/components/News';
import Footer from '@/components/Footer';

// ============================================================================
// WEBSITE CONFIG
// ============================================================================

const SITE_URL = 'https://www.mukhlasin.or.id';

const SITE_NAME = 'mukhlasin.or.id';

const HOME_TITLE =
  'mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya';

const HOME_DESCRIPTION =
  'Platform sedekah, zakat, dan wakaf terpercaya.';

// ============================================================================
// HOMEPAGE OPEN GRAPH IMAGE
//
// File:
// public/images/og-home.jpg
//
// Format:
// JPEG
//
// Ukuran:
// 1200 x 630
//
// Dibuat khusus lebih ringan agar mudah dibaca crawler WhatsApp / Meta.
// ============================================================================

const HOME_OG_IMAGE =
  `${SITE_URL}/images/og-home.jpg`;

// ============================================================================
// HOMEPAGE METADATA
// ============================================================================

export const metadata: Metadata = {
  // --------------------------------------------------------------------------
  // METADATA BASE
  // --------------------------------------------------------------------------

  metadataBase: new URL(SITE_URL),

  // --------------------------------------------------------------------------
  // TITLE
  // --------------------------------------------------------------------------

  title: HOME_TITLE,

  // --------------------------------------------------------------------------
  // DESCRIPTION
  // --------------------------------------------------------------------------

  description:
    'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di mukhlasin.or.id.',

  // --------------------------------------------------------------------------
  // CANONICAL
  // --------------------------------------------------------------------------

  alternates: {
    canonical: SITE_URL,
  },

  // --------------------------------------------------------------------------
  // OPEN GRAPH
  //
  // Digunakan oleh:
  // WhatsApp
  // Facebook
  // Telegram
  // LinkedIn
  // dan crawler sosial lainnya.
  // --------------------------------------------------------------------------

  openGraph: {
    title: HOME_TITLE,

    description: HOME_DESCRIPTION,

    url: SITE_URL,

    siteName: SITE_NAME,

    locale: 'id_ID',

    type: 'website',

    images: [
      {
        url: HOME_OG_IMAGE,

        secureUrl: HOME_OG_IMAGE,

        width: 1200,

        height: 630,

        type: 'image/jpeg',

        alt:
          'mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // TWITTER / X
  // --------------------------------------------------------------------------

  twitter: {
    card: 'summary_large_image',

    title: HOME_TITLE,

    description: HOME_DESCRIPTION,

    images: [
      {
        url: HOME_OG_IMAGE,

        width: 1200,

        height: 630,

        alt:
          'mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // META TAMBAHAN UNTUK CRAWLER SOSIAL
  //
  // Sengaja menggunakan pola yang sama seperti campaign yang sudah
  // berhasil menampilkan preview gambar di WhatsApp.
  //
  // Ini menghasilkan tambahan:
  //
  // <meta name="og:image" ...>
  // <meta name="og:image:secure_url" ...>
  //
  // Sedangkan openGraph.images menghasilkan:
  //
  // <meta property="og:image" ...>
  // <meta property="og:image:secure_url" ...>
  // <meta property="og:image:type" content="image/jpeg">
  // <meta property="og:image:width" content="1200">
  // <meta property="og:image:height" content="630">
  // --------------------------------------------------------------------------

  other: {
    'og:image': HOME_OG_IMAGE,

    'og:image:secure_url': HOME_OG_IMAGE,
  },
};

// ============================================================================
// SANITY CONFIG
// ============================================================================

const projectId =
  process.env.NEXT_SANITY_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  'a45erd4y';

const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.NEXT_SANITY_DATASET ||
  process.env.NEXT_DATASET ||
  'production';

// ============================================================================
// SANITY SERVER CLIENT
// ============================================================================

const serverClient = createClient({
  projectId,

  dataset,

  useCdn: true,

  apiVersion: '2024-01-01',
});

// ============================================================================
// DYNAMIC RENDERING
// ============================================================================

export const dynamic = 'force-dynamic';

export const revalidate = 0;

// ============================================================================
// HOMEPAGE
// ============================================================================

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];

  let mendesakPrograms: any[] = [];

  let unggulanPrograms: any[] = [];

  let pilihanPrograms: any[] = [];

  try {
    // ========================================================================
    // QUERY HOMEPAGE
    // ========================================================================

    const query = `{
      "heroBanners": *[
        _type in ["heroBanner", "banner", "hero"]
      ] | order(_createdAt desc)[0...5] {
        "id": _id,

        "title": coalesce(
          title,
          name,
          "Program Kebaikan"
        ),

        "imageUrl": coalesce(
          image.asset->url,
          banner.asset->url,
          mainImage.asset->url
        ),

        "linkUrl": coalesce(
          link,
          slug.current
        )
      },

      "mendesak": *[
        _type in ["program", "campaign", "donasi"] &&
        sectionType == "mendesak"
      ] | order(_createdAt desc)[0...4] {
        "id": _id,

        "title": coalesce(
          title,
          name,
          "Program Donasi"
        ),

        "slug": coalesce(
          slug.current,
          slug,
          _id
        ),

        "image": coalesce(
          image.asset->url,
          mainImage.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        ),

        "collectedAmount": coalesce(
          collectedAmount,
          collectedRaw,
          0
        ),

        "targetAmount": coalesce(
          targetAmount,
          50000000
        ),

        "daysLeft": coalesce(
          daysLeft,
          30
        ),

        "donors": donors
      },

      "unggulan": *[
        _type in ["program", "campaign", "donasi"] &&
        sectionType == "unggulan"
      ] | order(_createdAt desc)[0...4] {
        "id": _id,

        "title": coalesce(
          title,
          name,
          "Program Donasi"
        ),

        "slug": coalesce(
          slug.current,
          slug,
          _id
        ),

        "image": coalesce(
          image.asset->url,
          mainImage.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        ),

        "collectedAmount": coalesce(
          collectedAmount,
          collectedRaw,
          0
        ),

        "targetAmount": coalesce(
          targetAmount,
          50000000
        ),

        "daysLeft": coalesce(
          daysLeft,
          30
        ),

        "donors": donors
      },

      "pilihan": *[
        _type in ["program", "campaign", "donasi"] &&
        sectionType == "pilihan"
      ] | order(_createdAt desc)[0...6] {
        "id": _id,

        "title": coalesce(
          title,
          name,
          "Program Donasi"
        ),

        "slug": coalesce(
          slug.current,
          slug,
          _id
        ),

        "image": coalesce(
          image.asset->url,
          mainImage.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        ),

        "collectedAmount": coalesce(
          collectedAmount,
          collectedRaw,
          0
        ),

        "targetAmount": coalesce(
          targetAmount,
          50000000
        ),

        "daysLeft": coalesce(
          daysLeft,
          30
        ),

        "donors": donors
      }
    }`;

    // ========================================================================
    // FETCH SANITY
    // ========================================================================

    const data = await serverClient.fetch(query);

    // ========================================================================
    // HERO BANNERS
    // ========================================================================

    if (
      data?.heroBanners &&
      Array.isArray(data.heroBanners)
    ) {
      heroBanners = data.heroBanners.map(
        (item: any) => ({
          _id:
            item.id ||
            Math.random().toString(),

          title:
            item.title,

          imageUrl:
            item.imageUrl ||
            'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop',

          linkUrl:
            item.linkUrl
              ? `/campaign/${item.linkUrl}`
              : undefined,
        })
      );
    }

    // ========================================================================
    // DEFAULT HERO
    // ========================================================================

    if (heroBanners.length === 0) {
      heroBanners = [
        {
          _id:
            'default-banner',

          title:
            'Mari Salurkan Kebaikan Bersama mukhlasin.or.id',

          imageUrl:
            'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop',
        },
      ];
    }

    // ========================================================================
    // CAMPAIGN DATA
    // ========================================================================

    mendesakPrograms =
      data?.mendesak || [];

    unggulanPrograms =
      data?.unggulan || [];

    pilihanPrograms =
      data?.pilihan || [];
  } catch (err) {
    console.error(
      '🔥 Gagal mengambil data homepage dari Sanity:',
      err
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start w-full overflow-x-hidden pb-24">
      <div className="w-full max-w-md mx-auto px-3 py-4 space-y-4">

        {/* ==================================================================
            HERO
        ================================================================== */}

        <Hero
          initialBanners={heroBanners}
        />

        {/* ==================================================================
            TOTAL AKUMULASI DONASI
        ================================================================== */}

        <TotalAccumulationWidget />

        {/* ==================================================================
            CAMPAIGN
        ================================================================== */}

        <Campaign
          mendesak={mendesakPrograms}
          unggulan={unggulanPrograms}
          pilihan={pilihanPrograms}
        />

        {/* ==================================================================
            NEWS
        ================================================================== */}

        <News />

        {/* ==================================================================
            FOOTER
        ================================================================== */}

        <Footer />

      </div>
    </main>
  );
}