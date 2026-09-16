// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import BottomNav from "@/components/BottomNav";
import Script from "next/script";
import "./globals.css";

// ============================================================================
// FONT
// ============================================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ============================================================================
// KONFIGURASI WEBSITE
// ============================================================================

const SITE_URL = "https://www.mukhlasin.or.id";

const SITE_NAME = "mukhlasin.or.id";

const HOME_TITLE =
  "mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya";

const HOME_DESCRIPTION =
  "Platform sedekah, zakat, dan wakaf terpercaya.";

// ============================================================================
// GAMBAR OPEN GRAPH HOMEPAGE
//
// File:
// public/images/og-home.jpg
//
// Ukuran:
// 1200 x 630
//
// Format:
// JPEG
//
// Dibuat lebih ringan agar mudah dibaca crawler WhatsApp / Meta.
// ============================================================================

const HOME_OG_IMAGE =
  `${SITE_URL}/images/og-home.jpg`;

// ============================================================================
// MASTER SEO & PWA METADATA
// ============================================================================

export const metadata: Metadata = {
  // --------------------------------------------------------------------------
  // METADATA BASE
  // --------------------------------------------------------------------------

  metadataBase: new URL(SITE_URL),

  // --------------------------------------------------------------------------
  // TITLE
  // --------------------------------------------------------------------------

  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  // --------------------------------------------------------------------------
  // DESCRIPTION
  // --------------------------------------------------------------------------

  description:
    "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di mukhlasin.or.id.",

  // --------------------------------------------------------------------------
  // PWA
  // --------------------------------------------------------------------------

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Darul Mukhlasin",
  },

  // --------------------------------------------------------------------------
  // KEYWORDS
  // --------------------------------------------------------------------------

  keywords: [
    "mukhlasin",
    "mukhlasin or id",
    "yayasan darul mukhlasin kroya",
    "darul mukhlasin cilacap",
    "sedekah online",
    "infaq online",
    "infak online",
    "bayar zakat online",
    "wakaf quran",
    "sedekah subuh",
    "donasi yatim dhuafa",
    "lembaga amil zakat amanah",
    "donasi qris instant",
  ],

  // --------------------------------------------------------------------------
  // AUTHOR
  // --------------------------------------------------------------------------

  authors: [
    {
      name: SITE_NAME,
      url: SITE_URL,
    },
  ],

  creator: SITE_NAME,

  publisher: SITE_NAME,

  // --------------------------------------------------------------------------
  // CANONICAL
  // --------------------------------------------------------------------------

  alternates: {
    canonical: SITE_URL,
  },

  // --------------------------------------------------------------------------
  // OPEN GRAPH
  //
  // Digunakan WhatsApp, Facebook, Telegram, LinkedIn, dll.
  // --------------------------------------------------------------------------

  openGraph: {
    title: HOME_TITLE,

    description: HOME_DESCRIPTION,

    url: SITE_URL,

    siteName: SITE_NAME,

    locale: "id_ID",

    type: "website",

    images: [
      {
        url: HOME_OG_IMAGE,

        secureUrl: HOME_OG_IMAGE,

        width: 1200,

        height: 630,

        type: "image/jpeg",

        alt:
          "mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // TWITTER / X
  // --------------------------------------------------------------------------

  twitter: {
    card: "summary_large_image",

    title: HOME_TITLE,

    description: HOME_DESCRIPTION,

    images: [
      {
        url: HOME_OG_IMAGE,

        width: 1200,

        height: 630,

        alt:
          "mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // META TAMBAHAN UNTUK CRAWLER SOSIAL
  //
  // Sengaja dipertahankan karena pola ini sudah terbukti terbaca pada
  // halaman campaign.
  //
  // Akan menghasilkan tambahan:
  //
  // <meta name="og:image" ...>
  // <meta name="og:image:secure_url" ...>
  //
  // Sedangkan openGraph.images menghasilkan:
  //
  // <meta property="og:image" ...>
  // <meta property="og:image:secure_url" ...>
  // <meta property="og:image:type" ...>
  // <meta property="og:image:width" ...>
  // <meta property="og:image:height" ...>
  // --------------------------------------------------------------------------

  other: {
    "og:image": HOME_OG_IMAGE,

    "og:image:secure_url": HOME_OG_IMAGE,
  },

  // --------------------------------------------------------------------------
  // ROBOTS
  // --------------------------------------------------------------------------

  robots: {
    index: true,

    follow: true,

    googleBot: {
      index: true,

      follow: true,

      "max-video-preview": -1,

      "max-image-preview": "large",

      "max-snippet": -1,
    },
  },

  // --------------------------------------------------------------------------
  // GOOGLE SEARCH CONSOLE
  //
  // Kalau sudah mempunyai verification token asli, ganti nilai di bawah.
  // --------------------------------------------------------------------------

  verification: {
    google: "google-site-verification-token-anda",
  },
};

// ============================================================================
// ROOT LAYOUT
// ============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body
        className="min-h-screen bg-slate-100 flex flex-col text-slate-800"
        suppressHydrationWarning
      >
        {/* ==================================================================
            GOOGLE ANALYTICS GA4
        ================================================================== */}

        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-FG813S8GLF"
        />

        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];

              function gtag() {
                dataLayer.push(arguments);
              }

              gtag('js', new Date());

              gtag('config', 'G-FG813S8GLF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* ==================================================================
            MAIN CONTENT
        ================================================================== */}

        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>

        {/* ==================================================================
            GLOBAL BOTTOM NAVIGATION
        ================================================================== */}

        <BottomNav />
      </body>
    </html>
  );
}