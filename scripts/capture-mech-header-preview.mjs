#!/usr/bin/env node
/**
 * Renders the mech sheet header with built Lancer CSS and saves a screenshot.
 * Used when Foundry Docker is unavailable for visual verification.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { firefox } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = "/opt/cursor/artifacts/screenshots";
const PREVIEW_DIR = join(ROOT, ".preview");
const CSS_PATH = join(ROOT, "dist/styles/lancer.css");

const PILOT_IMG =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face";
const MECH_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#991e2a"/>
        <stop offset="100%" stop-color="#3d1018"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#bg)"/>
    <rect x="120" y="80" width="160" height="120" rx="12" fill="#2a2a2a" stroke="#efefef" stroke-width="4"/>
    <rect x="80" y="210" width="240" height="220" rx="16" fill="#444" stroke="#c75a00" stroke-width="6"/>
    <rect x="40" y="240" width="60" height="140" rx="8" fill="#333" stroke="#efefef" stroke-width="3"/>
    <rect x="300" y="240" width="60" height="140" rx="8" fill="#333" stroke="#efefef" stroke-width="3"/>
    <rect x="110" y="450" width="70" height="120" rx="8" fill="#222" stroke="#991e2a" stroke-width="4"/>
    <rect x="220" y="450" width="70" height="120" rx="8" fill="#222" stroke="#991e2a" stroke-width="4"/>
    <circle cx="200" cy="140" r="18" fill="#58b434"/>
    <text x="200" y="560" text-anchor="middle" fill="#efefef" font-family="sans-serif" font-size="28" font-weight="bold">MECH</text>
  </svg>`);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mech Header Preview</title>
  <link rel="stylesheet" href="file://${CSS_PATH}" />
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #2a2a2a;
    }
    .preview-frame {
      width: 920px;
      margin: 0 auto;
    }
  </style>
</head>
<body class="theme-gms-red game">
  <div class="preview-frame">
    <form class="lancer sheet application lancer-mech-sheet" autocomplete="off">
      <header class="sheet-header lancer-mech-sheet-header card clipped-bot">
        <h1 class="name">
          <input class="lancer-input" name="name" type="text" value="Night Terror" />
        </h1>
        <div class="portrait-img-container">
          <img class="portrait-img ref set" src="${MECH_IMG}" alt="Mech portrait" width="100" height="100" />
        </div>
        <div class="header-details monospace">
          <span>Pilot :: DUSK WING CHUCK<br />
            Frame :: GMS EVEREST</span>
        </div>
        <div class="mech-header-pilot-row flexrow">
          <div class="pilot-summary">
            <img class="ref set pilot click-open" style="height: 100%" src="${PILOT_IMG}" alt="Pilot portrait" />
            <div class="lancer-header lancer-primary license-level"><span>LL1</span></div>
          </div>
          <div class="mech-pilot-roll-chips flexrow">
            <div class="mech-pilot-roll-chip card clipped">
              <span class="mech-pilot-roll-chip-label">GRIT</span>
              <span class="mech-pilot-roll-chip-value lancer-stat minor">0</span>
              <span class="mech-pilot-roll-chip-actions flexrow"></span>
            </div>
            <div class="mech-pilot-roll-chip card clipped">
              <span class="mech-pilot-roll-chip-label">HUL</span>
              <span class="mech-pilot-roll-chip-value lancer-stat minor">0</span>
              <span class="mech-pilot-roll-chip-actions flexrow"></span>
            </div>
            <div class="mech-pilot-roll-chip card clipped">
              <span class="mech-pilot-roll-chip-label">SYS</span>
              <span class="mech-pilot-roll-chip-value lancer-stat minor">1</span>
              <span class="mech-pilot-roll-chip-actions flexrow"></span>
            </div>
            <div class="mech-pilot-roll-chip card clipped">
              <span class="mech-pilot-roll-chip-label">AGI</span>
              <span class="mech-pilot-roll-chip-value lancer-stat minor">1</span>
              <span class="mech-pilot-roll-chip-actions flexrow"></span>
            </div>
            <div class="mech-pilot-roll-chip card clipped">
              <span class="mech-pilot-roll-chip-label">ENG</span>
              <span class="mech-pilot-roll-chip-value lancer-stat minor">0</span>
              <span class="mech-pilot-roll-chip-actions flexrow"></span>
            </div>
          </div>
          <div class="inventory card clipped">
            <button class="lancer-button lancer-secondary mech-inventory-button" type="button">
              <span>View Inventory</span>
            </button>
          </div>
        </div>
      </header>
    </form>
  </div>
</body>
</html>`;

await mkdir(PREVIEW_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

const previewPath = join(PREVIEW_DIR, "mech-header-preview.html");
await writeFile(previewPath, html, "utf8");

const browser = await firefox.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 420 } });
await page.goto(`file://${previewPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const outPath = join(OUT_DIR, "mech-header-layout-preview.png");
await page.locator(".lancer-mech-sheet-header").screenshot({ path: outPath });
console.log(`Saved screenshot: ${outPath}`);

await browser.close();
