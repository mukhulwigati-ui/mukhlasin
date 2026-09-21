// sanity.config.ts

import React from "react";

import {
  defineConfig,
  buildLegacyTheme,
} from "sanity";

import {
  structureTool,
} from "sanity/structure";

import {
  schemaTypes,
} from "./sanity/schemaTypes";

/**
 * ============================================================
 * SANITY PROJECT CONFIG
 * ============================================================
 */

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "a45erd4y";

const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production";

/**
 * ============================================================
 * CUSTOM THEME
 * ============================================================
 */

const emeraldTheme =
  buildLegacyTheme({
    "--black":
      "#1f2937",

    "--white":
      "#ffffff",

    "--brand-primary":
      "#10b981",

    "--component-bg":
      "#ffffff",

    "--component-text-color":
      "#1f2937",

    "--focus-color":
      "#fbbf24",
  });

/**
 * ============================================================
 * SANITY STUDIO
 * ============================================================
 */

export default defineConfig([
  {
    // ========================================================
    // IDENTITAS WORKSPACE
    // ========================================================

    name:
      "Yayasan-Darul-Mukhlasin-Kroya",

    title:
      "mukhlasin.or.id",

    // ========================================================
    // PROJECT
    // ========================================================

    projectId,

    dataset,

    basePath:
      "/studio",

    // ========================================================
    // PLUGINS
    // ========================================================

    plugins: [
      structureTool({
        structure: (S) => {
          /**
           * ==================================================
           * MENU DEFAULT
           * ==================================================
           *
           * Semua schema yang sudah ada tetap muncul otomatis.
           *
           * fundraiserWithdrawal dikeluarkan dari daftar default
           * karena akan dibuatkan menu khusus di bawah.
           */

          const defaultItems =
            S
              .documentTypeListItems()
              .filter(
                (item) =>
                  item.getId() !==
                  "fundraiserWithdrawal"
              );

          return S
            .list()
            .title(
              "Manajemen Konten"
            )
            .items([
              // ==================================================
              // SEMUA MENU EXISTING
              // ==================================================

              ...defaultItems,

              // ==================================================
              // PEMBATAS
              // ==================================================

              S.divider(),

              // ==================================================
              // PENARIKAN KOMISI
              // ==================================================

              S
                .listItem()
                .title(
                  "💰 Penarikan Komisi"
                )
                .child(
                  S
                    .list()
                    .title(
                      "Penarikan Komisi Fundraiser"
                    )
                    .items([
                      // ==========================================
                      // MENUNGGU
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "⏳ Menunggu"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Menunggu Persetujuan"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal" && status == "pending"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "requestedAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),

                      // ==========================================
                      // DISETUJUI
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "✅ Disetujui"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Penarikan Disetujui"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal" && status == "approved"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "requestedAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),

                      // ==========================================
                      // SUDAH DIBAYAR
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "💸 Sudah Dibayar"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Komisi Sudah Dibayar"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal" && status == "paid"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "paidAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),

                      // ==========================================
                      // DITOLAK
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "❌ Ditolak"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Penarikan Ditolak"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal" && status == "rejected"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "requestedAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),

                      // ==========================================
                      // DIBATALKAN
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "🚫 Dibatalkan"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Penarikan Dibatalkan"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal" && status == "cancelled"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "requestedAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),

                      // ==========================================
                      // PEMBATAS
                      // ==========================================

                      S.divider(),

                      // ==========================================
                      // SEMUA RIWAYAT
                      // ==========================================

                      S
                        .listItem()
                        .title(
                          "📋 Semua Penarikan"
                        )
                        .child(
                          S
                            .documentList()
                            .title(
                              "Semua Riwayat Penarikan"
                            )
                            .schemaType(
                              "fundraiserWithdrawal"
                            )
                            .filter(
                              `_type == "fundraiserWithdrawal"`
                            )
                            .defaultOrdering([
                              {
                                field:
                                  "requestedAt",

                                direction:
                                  "desc",
                              },
                            ])
                        ),
                    ])
                ),
            ]);
        },
      }),
    ],

    // ========================================================
    // SCHEMA
    // ========================================================

    schema: {
      types:
        schemaTypes,
    },

    // ========================================================
    // THEME
    // ========================================================

    theme:
      emeraldTheme,

    // ========================================================
    // CUSTOM SANITY STUDIO
    // ========================================================

    studio: {
      components: {
        navbar: (
          props
        ) => {
          return React.createElement(
            "div",

            {
              style: {
                display:
                  "flex",

                flexDirection:
                  "column",

                width:
                  "100%",
              },
            },

            // ==================================================
            // HEADER MUKHLASIN
            // ==================================================

            React.createElement(
              "div",

              {
                style: {
                  background:
                    "#f8fafc",

                  padding:
                    "16px 24px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  borderBottom:
                    "1px solid #e2e8f0",

                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.05)",
                },
              },

              // ==================================================
              // LOGO
              // ==================================================

              React.createElement(
                "img",
                {
                  src:
                    "/images/logo-mukhlasin.png",

                  alt:
                    "Logo mukhlasin.or.id",

                  style: {
                    height:
                      "52px",

                    width:
                      "auto",

                    objectFit:
                      "contain",

                    display:
                      "block",
                  },
                }
              )
            ),

            // ==================================================
            // NAVBAR DEFAULT SANITY
            // ==================================================

            props.renderDefault(
              props
            )
          );
        },
      },
    },
  },
]);