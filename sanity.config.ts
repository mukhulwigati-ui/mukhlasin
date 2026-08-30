// sanity.config.ts

import { defineConfig, buildLegacyTheme } from "sanity";
import { structureTool } from "sanity/structure";
import React from "react";
import { schemaTypes } from "./sanity/schemaTypes";

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

const emeraldTheme = buildLegacyTheme({
  "--black": "#1f2937",
  "--white": "#ffffff",
  "--brand-primary": "#10b981",
  "--component-bg": "#ffffff",
  "--component-text-color": "#1f2937",
  "--focus-color": "#fbbf24",
});

/**
 * ============================================================
 * SANITY STUDIO
 * ============================================================
 */

export default defineConfig([
  {
    name: "Yayasan-Darul-Mukhlasin-Kroya",
    title: "mukhlasin.or.id",

    projectId,
    dataset,

    basePath: "/studio",

    plugins: [
      structureTool(),
    ],

    schema: {
      types: schemaTypes,
    },

    theme: emeraldTheme,

    studio: {
      components: {
        navbar: (props) => {
          return React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
              },
            },

            React.createElement(
              "div",
              {
                style: {
                  background: "#f8fafc",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                },
              },

              React.createElement("img", {
                src: "/images/logo-mukhlasin.png",
                alt: "Logo mukhlasin.or.id",

                style: {
                  height: "52px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                },
              })
            ),

            props.renderDefault(props)
          );
        },
      },
    },
  },
]);