// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import { createClient } from "@sanity/client";

import CampaignDetailClient from "@/components/CampaignDetailClient";

// ============================================================
// TYPES
// ============================================================

interface Props {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    ref?: string;
    v?: string;
  }>;
}

interface CampaignMetadata {
  _id?: string;
  title?: string;
  slug?: string;

  description?: unknown;
  excerpt?: unknown;
  shortDescription?: unknown;

  imageUrl?: string;
  imageAlt?: string;

  publishedAt?: string;
  _updatedAt?: string;
}

// ============================================================
// IDENTITAS MUKHLASIN
// ============================================================

const SITE_NAME = "Mukhlasin";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://mukhlasin.or.id"
).replace(/\/$/, "");

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "xqggeww8";

const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production";

// ============================================================
// SANITY SERVER CLIENT
//
// Tidak memakai token.
// Metadata publik tidak perlu write token.
// ============================================================

const sanityMetaClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  useCdn: false,
  apiVersion: "2026-08-01",
  perspective: "published",
});

// ============================================================
// NEXT.JS
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// NORMALIZE SLUG
// ============================================================

function normalizeSlug(
  value: string
): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

// ============================================================
// PORTABLE TEXT -> PLAIN TEXT
// ============================================================

function portableTextToPlainText(
  value: unknown
): string {
  if (!value) {
    return "";
  }

  // ----------------------------------------------------------
  // STRING / HTML
  // ----------------------------------------------------------

  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ----------------------------------------------------------
  // SANITY PORTABLE TEXT
  // ----------------------------------------------------------

  if (Array.isArray(value)) {
    return value
      .filter(
        (block: any) =>
          block?._type === "block" &&
          Array.isArray(block.children)
      )
      .map((block: any) =>
        block.children
          .map((child: any) =>
            typeof child?.text === "string"
              ? child.text
              : ""
          )
          .join("")
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

// ============================================================
// DESCRIPTION SEO
// ============================================================

function makeDescription(
  value: unknown,
  fallback: string,
  maxLength = 180
): string {
  const plainText =
    portableTextToPlainText(value);

  if (!plainText) {
    return fallback;
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText
    .slice(0, maxLength)
    .trimEnd()}...`;
}

// ============================================================
// NORMALIZE IMAGE URL
// ============================================================

function normalizeImageUrl(
  value: unknown
): string {
  const fallback =
    `${SITE_URL}/images/banner.png`;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return fallback;
  }

  const image = value.trim();

  if (
    image.startsWith("https://") ||
    image.startsWith("http://")
  ) {
    return image;
  }

  return `${SITE_URL}${
    image.startsWith("/") ? "" : "/"
  }${image}`;
}

// ============================================================
// SOCIAL IMAGE
//
// Untuk Sanity:
// gambar asli
//      ↓
// JPEG
//      ↓
// 1200 × 630
//      ↓
// quality 85
//
// Hanya digunakan untuk social preview.
// Gambar asli CampaignDetailClient tidak diubah.
// ============================================================

function createSocialImageUrl(
  originalImage: string
): string {
  if (!originalImage) {
    return `${SITE_URL}/images/banner.png`;
  }

  if (
    originalImage.includes(
      "cdn.sanity.io/images/"
    )
  ) {
    try {
      const url =
        new URL(originalImage);

      url.searchParams.set(
        "fm",
        "jpg"
      );

      url.searchParams.set(
        "w",
        "1200"
      );

      url.searchParams.set(
        "h",
        "630"
      );

      url.searchParams.set(
        "fit",
        "crop"
      );

      url.searchParams.set(
        "q",
        "85"
      );

      return url.toString();
    } catch {
      return originalImage;
    }
  }

  return originalImage;
}

// ============================================================
// FETCH CAMPAIGN LANGSUNG DARI SANITY
// ============================================================

async function getCampaignMetadata(
  slug: string
): Promise<CampaignMetadata | null> {
  if (!slug) {
    return null;
  }

  try {
    const campaign =
      await sanityMetaClient.fetch<
        CampaignMetadata | null
      >(
        `
          *[
            _type in ["program", "campaign"] &&
            defined(slug.current) &&
            lower(slug.current) == lower($slug)
          ][0] {
            _id,

            title,

            "slug": slug.current,

            description,

            excerpt,

            shortDescription,

            publishedAt,

            _updatedAt,

            "imageUrl": coalesce(
              image.asset->url,
              mainImage.asset->url,
              thumbnail.asset->url,
              coverImage.asset->url,
              banner.asset->url
            ),

            "imageAlt": coalesce(
              image.alt,
              mainImage.alt,
              thumbnail.alt,
              coverImage.alt,
              banner.alt,
              title
            )
          }
        `,
        {
          slug,
        },
        {
          cache: "no-store",
        }
      );

    return campaign || null;
  } catch (error) {
    console.error(
      "🔥 MUKHLASIN CAMPAIGN METADATA ERROR:",
      error
    );

    return null;
  }
}

// ============================================================
// GENERATE METADATA
// ============================================================

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } =
    await params;

  const cleanSlug =
    normalizeSlug(slug);

  // ==========================================================
  // CANONICAL
  // ==========================================================

  const canonicalUrl =
    `${SITE_URL}/campaign/${encodeURIComponent(
      cleanSlug
    )}`;

  // ==========================================================
  // SANITY
  // ==========================================================

  const campaign =
    await getCampaignMetadata(
      cleanSlug
    );

  // ==========================================================
  // TITLE
  // ==========================================================

  const title =
    typeof campaign?.title === "string" &&
    campaign.title.trim()
      ? campaign.title.trim()
      : `Program Donasi | ${SITE_NAME}`;

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const fallbackDescription =
    `Salurkan zakat, infak, sedekah, wakaf, dan donasi terbaik Anda melalui ${SITE_NAME}.`;

  let description = "";

  if (campaign?.excerpt) {
    description =
      makeDescription(
        campaign.excerpt,
        ""
      );
  }

  if (
    !description &&
    campaign?.shortDescription
  ) {
    description =
      makeDescription(
        campaign.shortDescription,
        ""
      );
  }

  if (
    !description &&
    campaign?.description
  ) {
    description =
      makeDescription(
        campaign.description,
        ""
      );
  }

  if (!description) {
    description =
      fallbackDescription;
  }

  // ==========================================================
  // ORIGINAL IMAGE
  // ==========================================================

  const originalImage =
    normalizeImageUrl(
      campaign?.imageUrl
    );

  // ==========================================================
  // SOCIAL IMAGE
  // ==========================================================

  const socialImage =
    createSocialImageUrl(
      originalImage
    );

  const imageAlt =
    typeof campaign?.imageAlt === "string" &&
    campaign.imageAlt.trim()
      ? campaign.imageAlt.trim()
      : title;

  // ==========================================================
  // DEBUG VERCEL
  // ==========================================================

  console.log(
    "========================================"
  );

  console.log(
    "💚 MUKHLASIN CAMPAIGN METADATA"
  );

  console.log(
    "Slug:",
    cleanSlug
  );

  console.log(
    "Campaign found:",
    Boolean(campaign)
  );

  console.log(
    "Campaign ID:",
    campaign?._id || "NOT FOUND"
  );

  console.log(
    "Title:",
    title
  );

  console.log(
    "Original Image:",
    originalImage
  );

  console.log(
    "Social OG Image:",
    socialImage
  );

  console.log(
    "Canonical:",
    canonicalUrl
  );

  console.log(
    "========================================"
  );

  // ==========================================================
  // METADATA
  // ==========================================================

  return {
    metadataBase:
      new URL(SITE_URL),

    title,

    description,

    // ========================================================
    // CANONICAL
    // ========================================================

    alternates: {
      canonical:
        canonicalUrl,
    },

    // ========================================================
    // ROBOTS
    // ========================================================

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,

        "max-image-preview":
          "large",
      },
    },

    // ========================================================
    // OPEN GRAPH
    // ========================================================

    openGraph: {
      type: "article",

      url:
        canonicalUrl,

      siteName:
        SITE_NAME,

      locale:
        "id_ID",

      title,

      description,

      images: [
        {
          url:
            socialImage,

          secureUrl:
            socialImage,

          width:
            1200,

          height:
            630,

          type:
            "image/jpeg",

          alt:
            imageAlt,
        },
      ],

      ...(campaign?.publishedAt
        ? {
            publishedTime:
              campaign.publishedAt,
          }
        : {}),
    },

    // ========================================================
    // TWITTER / X
    // ========================================================

    twitter: {
      card:
        "summary_large_image",

      title,

      description,

      images: [
        {
          url:
            socialImage,

          alt:
            imageAlt,
        },
      ],
    },

    // ========================================================
    // EXTRA SOCIAL META
    //
    // Sengaja menghasilkan:
    //
    // name="og:image"
    // name="og:image:secure_url"
    //
    // selain property="og:image" dari openGraph.images.
    //
    // Ini mengikuti pola News BMA yang sudah berhasil
    // menampilkan thumbnail di WhatsApp.
    // ========================================================

    other: {
      "og:image":
        socialImage,

      "og:image:secure_url":
        socialImage,
    },
  };
}

// ============================================================
// PAGE
// ============================================================

export default async function CampaignPage({
  params,
  searchParams,
}: Props) {
  const { slug } =
    await params;

  const { ref } =
    await searchParams;

  const cleanSlug =
    normalizeSlug(slug);

  return (
    <CampaignDetailClient
      slug={cleanSlug}
      referral={
        ref ?? null
      }
    />
  );
}