import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

// Resolve the font file location once at module load. createRequire is used
// instead of a relative path so it survives bundling (tsdown leaves
// node_modules deps as externals; the package is found at runtime via
// normal node resolution from /app/apps/server/).
const require = createRequire(import.meta.url);
const FONT_PATH =
  require.resolve("@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-normal.woff");

// Single in-process font load. Satori needs the raw font buffer, not a URL.
let fontPromise: Promise<Buffer> | null = null;
function loadFont(): Promise<Buffer> {
  fontPromise ??= readFile(FONT_PATH);
  return fontPromise;
}

export interface OgTemplate {
  /** Main heading. Wraps automatically; keep under ~60 chars for best fit. */
  title: string;
  /** Subtitle under the divider — typically a long date or wordmark. */
  subtitle: string;
}

// Colors mirror apps/web/src/styles/global.css `@theme` palette so the OG
// card reads as the same brand surface.
const INK_BG = "#0c0b0a";
const INK_1 = "#e8e2d4";
const INK_2 = "#9c9486";
const INK_RULE = "#1f1c18";

/**
 * Renders a 1200x630 OG card to PNG. Satori lays the JSX-as-object tree to
 * SVG using the embedded font; resvg rasterizes the SVG to PNG. Both run
 * synchronously after the font is loaded (~200-500ms total per call).
 *
 * Callers should cache the output — this function is not cheap.
 */
export async function renderOgPng({ title, subtitle }: OgTemplate): Promise<Buffer> {
  const font = await loadFont();

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: INK_BG,
          fontFamily: "IBM Plex Serif",
          padding: "80px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: "96px",
                color: INK_1,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                textAlign: "center",
                lineHeight: 1.15,
                // Constrain to avoid running into the padding on long titles.
                maxWidth: "1040px",
              },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                width: "120px",
                height: "2px",
                backgroundColor: INK_RULE,
                marginTop: "48px",
                marginBottom: "48px",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: "32px",
                color: INK_2,
                fontWeight: 500,
                textAlign: "center",
              },
              children: subtitle,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "IBM Plex Serif",
          data: font,
          // Weight 500 (medium) — bit more presence than regular at 96px
          // without crossing into "bold" feel. Bump to 600/700 if you want
          // heavier display weight.
          weight: 500,
          style: "normal",
        },
      ],
    },
  );

  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}
