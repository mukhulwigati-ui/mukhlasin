import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import BottomNav from "@/components/BottomNav";
import Script from "next/script";
import "./globals.css";

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

const HOME_OG_IMAGE =
  `${SITE_URL}/images/banner.png`;

// ============================================================================
// MASTER SEO & PWA METADATA
// ============================================================================

export const metadata: Metadata = {
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
  // SEO KEYWORDS
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

        type: "image/png",

        alt: "mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya",
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

        alt: "mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // TAMBAHAN UNTUK CRAWLER SOSIAL
  //
  // Campaign kita sebelumnya berhasil dengan bentuk metadata ini.
  // Ini membuat Next.js juga menghasilkan:
  //
  // <meta name="og:image" ...>
  // <meta name="og:image:secure_url" ...>
  //
  // Selain property="og:image" dari openGraph di atas.
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
  // GOOGLE VERIFICATION
  //
  // Ganti dengan token asli jika memang menggunakan Search Console.
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
        {/* ================================================================
            GOOGLE ANALYTICS GA4
        ================================================================= */}

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

              function gtag(){
                dataLayer.push(arguments);
              }

              gtag('js', new Date());

              gtag('config', 'G-FG813S8GLF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* ================================================================
            MAIN CONTENT
        ================================================================= */}

        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>

        {/* ================================================================
            GLOBAL BOTTOM NAVIGATION
        ================================================================= */}

        <BottomNav />
      </body>
    </html>
  );
}