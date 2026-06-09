#!/usr/bin/env node
/**
 * One-shot Playwright script: seed combat UI state and save a demonstration screenshot.
 */
import { firefox } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = "/opt/cursor/artifacts/screenshots/combat-action-tracker-fix.png";
const baseURL = process.env.FOUNDRY_URL ?? "http://localhost:30000";
const adminKey = process.env.FOUNDRY_ADMIN_KEY ?? "devadmin";
const worldId = process.env.FOUNDRY_WORLD_ID ?? "lancer-dev-test";

async function dismissDialogs(page) {
  for (let i = 0; i < 5; i++) {
    const migration = page.getByRole("dialog").filter({ hasText: /migration/i });
    if (await migration.isVisible().catch(() => false)) {
      const cb = migration.locator('input[type="checkbox"]').first();
      if (await cb.isChecked().catch(() => false)) await cb.uncheck();
      await migration.getByRole("button", { name: /begin migration/i }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      continue;
    }
    const usage = page.getByRole("dialog").filter({ hasText: /sharing usage data/i });
    if (await usage.isVisible().catch(() => false)) {
      const decline = usage.getByRole("button", { name: /decline/i });
      if (await decline.isVisible().catch(() => false)) {
        await decline.click({ timeout: 5000 }).catch(() => {});
      } else {
        await page.keyboard.press("Escape");
      }
      continue;
    }
    break;
  }
  await page.evaluate(() => document.querySelectorAll(".tour-overlay").forEach(el => el.remove()));
}

async function waitForJoinOrGame(page, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (/\/join/.test(page.url()) || /\/game/.test(page.url())) return;
    await dismissDialogs(page);
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out waiting for /join or /game (at ${page.url()})`);
}

async function joinWorld(page) {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

  if (page.url().includes("/license")) {
    await page.locator("#eula-agree").check();
    await page.locator('button[name="accept"], button[data-action="accept"]').click();
    await page.waitForURL(/\/(auth|setup|join|game)/, { timeout: 120_000 });
  }

  if (page.url().includes("/game")) {
    await page.waitForFunction(() => window.game?.ready === true, { timeout: 300_000 });
    return;
  }

  if (page.url().includes("/auth")) {
    await page.locator('input[type="password"]').first().fill(adminKey);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(setup|join|game)/, { timeout: 120_000 });
  }

  if (page.url().includes("/setup")) {
    await dismissDialogs(page);
    await page.locator(`li.world[data-package-id="${worldId}"]`).waitFor({ state: "visible", timeout: 60_000 });
    await page.locator(`li.world[data-package-id="${worldId}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await waitForJoinOrGame(page);
  }

  if (
    page.url().includes("/join") &&
    (await page.getByText(/no active game session/i).isVisible().catch(() => false))
  ) {
    await page.getByRole("link", { name: /go back/i }).click();
    await page.locator(`li.world[data-package-id="${worldId}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await waitForJoinOrGame(page);
  }

  if (page.url().includes("/join")) {
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/join-debug.png" });
    const html = await page.content();
    console.log("Join page URL:", page.url());
    console.log("Join page snippet:", html.slice(0, 2000));

    const select = page.locator('select[name="userid"]');
    if (await select.count()) {
      const userId = await select.locator('option:not([value=""]):not([disabled])').first().getAttribute("value");
      if (!userId) throw new Error("No joinable Foundry user on /join");
      await select.selectOption(userId);
      await page.locator('button[name="join"]').click();
    } else {
      const userRow = page.locator("li.user, .join-game li, [data-user-id]").first();
      if (await userRow.isVisible().catch(() => false)) {
        await userRow.click();
        await page.getByRole("button", { name: /join game/i }).click();
      } else {
        throw new Error(`Unrecognized /join UI at ${page.url()}`);
      }
    }
  }

  const gameDeadline = Date.now() + 300_000;
  while (Date.now() < gameDeadline) {
    await dismissDialogs(page);
    if (page.url().includes("/game")) break;
    if (page.url().includes("/setup") || page.url().includes("/join")) {
      await page.waitForTimeout(1000);
      continue;
    }
    await page.waitForTimeout(500);
  }
  if (!page.url().includes("/game")) {
    await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/join-timeout-debug.png" });
    throw new Error(`Failed to reach /game (stuck at ${page.url()})`);
  }
  await page.waitForFunction(() => window.game?.ready === true, { timeout: 300_000 });
}

async function setupCombatUi(page) {
  return page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // Ensure scene
    let scene = game.scenes.active;
    if (!scene) {
      scene = game.scenes.contents[0];
      if (scene) await scene.activate();
    }
    if (!scene) throw new Error("No scene available");

    for (let i = 0; i < 60 && !canvas?.ready; i++) await wait(250);
    if (!canvas?.ready) throw new Error("Canvas not ready");

    // NPC actor + token
    let npc = game.actors.find(a => a.name === "Screenshot Test NPC");
    if (!npc) {
      npc = await Actor.create(
        {
          name: "Screenshot Test NPC",
          type: "npc",
          img: `systems/${game.system.id}/assets/icons/npc.svg`,
          system: { name: "Screenshot Test NPC", tier: 1 },
        },
        { renderSheet: false }
      );
    }

    let tokenDoc = scene.tokens.find(t => t.actorId === npc.id);
    if (!tokenDoc) {
      const created = await scene.createEmbeddedDocuments("Token", [
        { name: npc.name, actorId: npc.id, x: 1200, y: 900, width: 1, height: 1 },
      ]);
      tokenDoc = created[0];
    }

    // Mech actor + token (issue #124 scenario)
    let mech = game.actors.find(a => a.name === "Screenshot Test Mech");
    if (!mech) {
      mech = await Actor.create(
        {
          name: "Screenshot Test Mech",
          type: "mech",
          img: `systems/${game.system.id}/assets/icons/mech.svg`,
          system: {
            hp: { value: 10, max: 10 },
            heat: { value: 0, max: 4 },
            loadout: {
              weapon_mounts: [{ type: "Main", bracing: false, slots: [{ size: "Main", weapon: null, mod: null }] }],
              systems: [],
              sp: { value: 0, max: 4 },
            },
          },
        },
        { renderSheet: false }
      );
    }

    let mechTokenDoc = scene.tokens.find(t => t.actorId === mech.id);
    if (!mechTokenDoc) {
      const created = await scene.createEmbeddedDocuments("Token", [
        { name: mech.name, actorId: mech.id, x: 1400, y: 900, width: 1, height: 1 },
      ]);
      mechTokenDoc = created[0];
    }

    // Combat
    let combat = game.combats?.find(c => c.scene?.id === scene.id);
    if (!combat) combat = await Combat.create({ scene: scene.id, active: true });
    if (!tokenDoc.combatant) await tokenDoc.toggleCombatant(true);
    if (!mechTokenDoc.combatant) await mechTokenDoc.toggleCombatant(true);

    ui.combat.viewed = combat;
    await ui.combat.render();

    // Select mech token for action manager
    const mechToken = mechTokenDoc.object;
    if (!mechToken) throw new Error("Mech token missing on canvas");
    mechToken.control({ releaseOthers: true });
    await game.action_manager?.update();

    // Pan to tokens
    canvas.animatePan({ x: 1300, y: 900 });

    const combatTab = document.querySelector('#sidebar-tabs a[data-tab="combat"]');
    combatTab?.click();

    await wait(500);

    const root = document.querySelector("#action-manager");
    const tracker = document.querySelector("#combat-tracker, ol.combat-tracker, #combat .directory-list");
    return {
      combatants: combat.combatants.size,
      trackerLi: document.querySelectorAll("#combat-tracker li.combatant, .combat-tracker li.combatant").length,
      hasDrag: !!root?.querySelector("#action-manager-drag"),
      iconCount: root?.querySelectorAll("a.action[data-lancer-action]").length ?? 0,
      label: root?.querySelector(".action-label div")?.textContent ?? "",
      hasTarget: !!game.action_manager?.target,
    };
  });
}

async function main() {
  await mkdir(dirname(outPath), { recursive: true });
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    await joinWorld(page);
    const state = await setupCombatUi(page);
    console.log("UI state:", JSON.stringify(state, null, 2));
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot to ${outPath}`);
    if (state.trackerLi === 0) {
      console.warn("WARNING: combat tracker shows no combatants in DOM");
      process.exitCode = 1;
    }
    if (state.iconCount < 5) {
      console.warn("WARNING: action manager shows fewer than 5 icons");
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
