#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { firefox } from "@playwright/test";
import { dismissFoundryLaunchDialogs, dismissFoundryTours, FOUNDRY_WORLD_ID } from "../e2e/helpers/foundry.ts";
import { openActorSheet, seedRegressionWorld } from "../e2e/helpers/seed.ts";

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";
const OUT_DIR = "/opt/cursor/artifacts/screenshots";

async function clearOverlays(page: import("@playwright/test").Page): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await dismissFoundryTours(page);
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      document.querySelectorAll(".tour-overlay, aside.tour").forEach(el => el.remove());
    });
    await page.waitForTimeout(150);
  }
}

async function ensureInGame(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/game", { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (page.url().includes("/game")) {
    await page.waitForFunction(() => window.game?.ready === true, { timeout: 120_000 }).catch(() => {});
    if (await page.evaluate(() => window.game?.ready === true)) return;
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await clearOverlays(page);
  if (page.url().includes("/setup")) {
    await page.locator(`li.world[data-package-id="${FOUNDRY_WORLD_ID}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await page.waitForURL(/\/(join|game)/, { timeout: 180_000 });
  }
  await dismissFoundryLaunchDialogs(page);
  if (page.url().includes("/join")) {
    const userId = await page
      .locator('select[name="userid"] option:not([value=""]):not([disabled])')
      .first()
      .getAttribute("value");
    if (userId) {
      await page.locator('select[name="userid"]').selectOption(userId);
      await page.locator('button[name="join"]').click();
    }
  }
  await page.waitForURL(/\/game/, { timeout: 180_000 });
  await page.waitForFunction(() => window.game?.ready === true, { timeout: 180_000 });
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await firefox.launch();
  const page = await browser.newPage({ baseURL: FOUNDRY_URL, viewport: { width: 1400, height: 900 } });

  try {
    await ensureInGame(page);
    const { mechId, pilotId } = await seedRegressionWorld(page);

    await page.evaluate(
      async ({ mechId, pilotId }) => {
        const mech = game.actors.get(mechId);
        const pilot = game.actors.get(pilotId);
        if (!mech || !pilot) throw new Error("missing actors");

        await pilot.update({
          name: "Dusk Wing Chuck",
          system: { callsign: "DUSK WING CHUCK", level: 1, active_mech: mech.uuid },
        });
        await mech.update({ name: "Night Terror", system: { pilot: pilot.uuid } });

        const weapons = Array.from({ length: 18 }, (_, i) => ({
          name: `E2E Weapon ${i + 1}`,
          type: "mech_weapon",
          img: `systems/${game.system.id}/assets/icons/mech_weapon.svg`,
          system: {
            manufacturer: "GMS",
            damage: [{ type: "Kinetic", val: "1d6" }],
            range: [{ type: "Range", val: 5 }],
          },
        }));
        await mech.createEmbeddedDocuments("Item", weapons);
        await mech.sheet?.render(true);
      },
      { mechId, pilotId }
    );

    await openActorSheet(page, mechId);
    await page.locator(".mech-inventory-button").last().click();
    await page.locator("#lancer-inventory-editor").waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(1000);

    const inventory = page.locator("#lancer-inventory-editor");
    await inventory.screenshot({ path: join(OUT_DIR, "mech-inventory-scroll-foundry.png") });

    const header = page.locator(".window-app.lancer.sheet.actor .lancer-mech-sheet-header").last();
    await header.screenshot({ path: join(OUT_DIR, "mech-header-foundry.png") });

    const scrollInfo = await page.evaluate(() => {
      const app = document.querySelector("#lancer-inventory-editor");
      const body = app?.querySelector(".inventory-editor-body") as HTMLElement | null;
      if (!body) return null;
      return {
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
        overflowY: getComputedStyle(body).overflowY,
      };
    });
    console.log("Inventory scroll info:", scrollInfo);
    console.log("Saved screenshots to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
