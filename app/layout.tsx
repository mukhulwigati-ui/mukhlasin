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

// 🚀 MASTER SEO & PWA METADATA MUKHLASIN.OR.ID
export const metadata: Metadata = {
  title: {
    default: "mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya - Platform Sedekah, Infaq & Zakat Online Amanah",
    template: "%s | mukhlasin.or.id"
  },
  description: "Salurkan sedekah, infaq, zakat, dan wakaf Anda secara instan dan amanah melalui mukhlasin.or.id (Yayasan Darul Mukhlasin Kroya, Cilacap). Mengalirkan keberkahan dan kepedulian untuk pemberdayaan ummat, yatim, dhuafa, dan program sosial kemanusiaan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Darul Mukhlasin",
  },
  keywords: [
    "mukhlasin",
    "mukhlasin or id",
    "yayasan darul mukhlasin kroya",
    "darul mukhlasin cilacap",
    "sedekah online",
    "infaq online",
    "bayar zakat online",
    "wakaf quran",
    "sedekah subuh",
    "donasi yatim dhuafa",
    "lembaga amil zakat amanah",
    "donasi qris instant",
  ],
  authors: [{ name: "mukhlasin.or.id", url: "https://mukhlasin.or.id" }],
  creator: "mukhlasin.or.id",
  publisher: "mukhlasin.or.id",
  metadataBase: new URL("https://mukhlasin.or.id"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya - Platform Sedekah, Infaq & Zakat Online Amanah",
    description: "Tunaikan kepedulian Anda dengan mudah bersama Yayasan Darul Mukhlasin Kroya, Cilacap (mukhlasin.or.id). Salurkan sedekah subuh, infaq produktif, dan zakat mal/fitrah secara transparan dan otomatis.",
    url: "https://mukhlasin.or.id",
    siteName: "mukhlasin.or.id",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://mukhlasin.or.id/images/banner.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "mukhlasin.or.id - Yayasan Darul Mukhlasin Kroya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "mukhlasin.or.id | Yayasan Darul Mukhlasin Kroya - Sedekah & Infaq Online Mudah",
    description: "Platform resmi galang donasi, sedekah, infaq, dan zakat amanah bersama mukhlasin.or.id.",
    images: ["https://mukhlasin.or.id/images/banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "google-site-verification-token-anda",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-slate-100 flex flex-col text-slate-800" suppressHydrationWarning>
        
        {/* 🚀 GOOGLE ANALYTICS SCRIPT (GA4) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-FG813S8GLF`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FG813S8GLF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* 🚀 LAYOUT CLIENT WRAPPER */}
        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>

        {/* 🚀 GLOBAL BOTTOM NAVIGATION */}
        <BottomNav />

      </body>
    </html>
  );
}