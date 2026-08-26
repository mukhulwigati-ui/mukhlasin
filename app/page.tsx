// app/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@sanity/client';
import Hero, { HeroBanner } from '@/components/Hero';
import TotalAccumulationWidget from '@/components/TotalAccumulationWidget';
import Campaign from '@/components/Campaign';
import News from '@/components/News';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya - Platform Sedekah, Zakat, dan Wakaf Terpercaya',
  description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di mukhlasin.or.id.',
  alternates: { canonical: 'https://mukhlasin.or.id' },
  openGraph: {
    title: 'mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya',
    description: 'Platform sedekah, zakat, dan wakaf terpercaya.',
    url: 'https://mukhlasin.or.id',
    siteName: 'mukhlasin.or.id',
    locale: 'id_ID',
    type: 'website',
  },
};

// 🚀 INISIALISASI CLIENT AMAN PUBLIK
const projectId = process.env.NEXT_SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a45erd4y';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.NEXT_DATASET || 'production';

const serverClient = createClient({
  projectId,
  dataset,
  useCdn: true,
  apiVersion: '2024-01-01',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];
  let mendesakPrograms: any[] = [];
  let unggulanPrograms: any[] = [];
  let pilihanPrograms: any[] = [];

  try {
    // 🚀 QUERY SPESIFIK PER KATEGORI: Memisahkan data berdasarkan sectionType masing-masing
    const query = `{
      "heroBanners": *[_type in ["heroBanner", "banner", "hero"]] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": coalesce(title, name, "Program Kebaikan"),
        "imageUrl": coalesce(image.asset->url, banner.asset->url, mainImage.asset->url),
        "linkUrl": coalesce(link, slug.current)
      },
      "mendesak": *[_type in ["program", "campaign", "donasi"] && sectionType == "mendesak"] | order(_createdAt desc)[0...4] {
        "id": _id,
        "title": coalesce(title, name, "Program Donasi"),
        "slug": coalesce(slug.current, slug, _id),
        "image": coalesce(image.asset->url, mainImage.asset->url, thumbnail.asset->url, banner.asset->url),
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "daysLeft": coalesce(daysLeft, 30),
        "donors": donors
      },
      "unggulan": *[_type in ["program", "campaign", "donasi"] && sectionType == "unggulan"] | order(_createdAt desc)[0...4] {
        "id": _id,
        "title": coalesce(title, name, "Program Donasi"),
        "slug": coalesce(slug.current, slug, _id),
        "image": coalesce(image.asset->url, mainImage.asset->url, thumbnail.asset->url, banner.asset->url),
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "daysLeft": coalesce(daysLeft, 30),
        "donors": donors
      },
      "pilihan": *[_type in ["program", "campaign", "donasi"] && sectionType == "pilihan"] | order(_createdAt desc)[0...6] {
        "id": _id,
        "title": coalesce(title, name, "Program Donasi"),
        "slug": coalesce(slug.current, slug, _id),
        "image": coalesce(image.asset->url, mainImage.asset->url, thumbnail.asset->url, banner.asset->url),
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "daysLeft": coalesce(daysLeft, 30),
        "donors": donors
      }
    }`;

    const data = await serverClient.fetch(query);

    // 1. Mapping Banners
    if (data?.heroBanners && Array.isArray(data.heroBanners)) {
      heroBanners = data.heroBanners.map((item: any) => ({
        _id: item.id || Math.random().toString(),
        title: item.title,
        imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop',
        linkUrl: item.linkUrl ? `/campaign/${item.linkUrl}` : undefined,
      }));
    }

    if (heroBanners.length === 0) {
      heroBanners = [
        {
          _id: 'default-banner',
          title: 'Mari Salurkan Kebaikan Bersama mukhlasin.or.id',
          imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop',
        }
      ];
    }

    mendesakPrograms = data?.mendesak || [];
    unggulanPrograms = data?.unggulan || [];
    pilihanPrograms = data?.pilihan || [];

  } catch (err) {
    console.error('🔥 Gagal mengambil data homepage dari Sanity:', err);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start w-full overflow-x-hidden pb-24">
      <div className="w-full max-w-md mx-auto px-3 py-4 space-y-4">
        
        <Hero initialBanners={heroBanners} />
        
        <TotalAccumulationWidget />
        
        {/* Masing-masing kategori menerima datanya sendiri secara independen */}
        <Campaign 
          mendesak={mendesakPrograms} 
          unggulan={unggulanPrograms} 
          pilihan={pilihanPrograms} 
        />
        
        <News />
        <Footer />
        
      </div>
    </main>
  );
}