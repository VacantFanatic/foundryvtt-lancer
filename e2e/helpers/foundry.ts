import type { Page } from "@playwright/test";

export const FOUNDRY_ADMIN_KEY = process.env.FOUNDRY_ADMIN_KEY ?? "devadmin";
export const FOUNDRY_WORLD_ID = process.env.FOUNDRY_WORLD_ID ?? "lancer-dev-test";

/** Collect browser console errors while navigating. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(err.message));
  return errors;
}

/** Close setup tours/overlays that intercept clicks (e.g. Backups Overview). */
export async function dismissFoundryTours(page: Page): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const overlay = page.locator(".tour-overlay");
    const tour = page.locator("aside.tour, aside").filter({ hasText: /overview|tour|step \d+ of/i });
    const hasOverlay = await overlay.isVisible().catch(() => false);
    const hasTour = await tour
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasOverlay && !hasTour) break;

    const closeBtn = tour.first().locator("button").filter({ hasText: /^$/ }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(200);
  }

  await page.evaluate(() => {
    document.querySelectorAll(".tour-overlay").forEach(el => el.remove());
  });
}

/** Dismiss first-run or launch dialogs that block navigation to /join. */
export async function dismissFoundryLaunchDialogs(page: Page): Promise<boolean> {
  let dismissed = false;

  const usageDialog = page.getByRole("dialog").filter({ hasText: /sharing usage data/i });
  if (await usageDialog.isVisible().catch(() => false)) {
    await usageDialog.getByRole("button", { name: /decline sharing/i }).click();
    dismissed = true;
  }

  const migrationDialog = page.getByRole("dialog").filter({ hasText: /world data migration/i });
  if (await migrationDialog.isVisible().catch(() => false)) {
    const backupCheckbox = migrationDialog.locator('input[type="checkbox"]').first();
    if (await backupCheckbox.isChecked().catch(() => false)) {
      await backupCheckbox.uncheck();
    }
    await migrationDialog.getByRole("button", { name: /begin migration/i }).click();
    dismissed = true;
  }

  const backupsTour = page.locator("aside").filter({ hasText: /backups overview/i });
  if (await backupsTour.isVisible().catch(() => false)) {
    await backupsTour.locator("button").first().click();
    dismissed = true;
  }

  return dismissed;
}

async function waitForJoinOrGame(page: Page, timeoutMs = 300_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (/\/join/.test(page.url()) || /\/game/.test(page.url())) return;
    await dismissFoundryLaunchDialogs(page);
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out waiting for /join or /game (stuck at ${page.url()})`);
}

/** Accept license and admin auth; verify the E2E world appears on the setup screen. */
export async function completeFoundrySetup(page: Page, worldId = FOUNDRY_WORLD_ID): Promise<void> {
  await page.goto("/", { waitUntil: "networkidle", timeout: 120_000 });

  if (page.url().includes("/license")) {
    const agreeCheckbox = page.locator('input[type="checkbox"]').first();
    if (await agreeCheckbox.isVisible().catch(() => false)) {
      await agreeCheckbox.check();
    }
    await page.getByRole("button", { name: /agree/i }).click();
    await page.waitForLoadState("networkidle");
  }

  if (page.url().includes("/auth")) {
    await page.locator('input[type="password"]').first().fill(FOUNDRY_ADMIN_KEY);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(setup|join|game)/, { timeout: 120_000 });
  }

  if (page.url().includes("/setup")) {
    await dismissFoundryLaunchDialogs(page);
    await dismissFoundryTours(page);
    await page.locator(`li.world[data-package-id="${worldId}"]`).waitFor({ state: "visible", timeout: 120_000 });
  }
}

/** Authenticate, launch world if needed, and join as the first available user. */
export async function joinLancerWorld(page: Page, worldId = FOUNDRY_WORLD_ID): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (page.url().includes("/game")) {
    await page.waitForFunction(() => window.game?.ready === true, { timeout: 120_000 });
    return;
  }

  await completeFoundrySetup(page, worldId);

  if (page.url().includes("/setup")) {
    await dismissFoundryTours(page);
    await page.locator(`li.world[data-package-id="${worldId}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await waitForJoinOrGame(page);
  }

  if (
    page.url().includes("/join") &&
    (await page
      .getByText(/no active game session/i)
      .isVisible()
      .catch(() => false))
  ) {
    await page.getByRole("link", { name: /go back/i }).click();
    await page.locator(`li.world[data-package-id="${worldId}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await waitForJoinOrGame(page);
  }

  if (page.url().includes("/join")) {
    const userId = await page
      .locator('select[name="userid"] option:not([value=""]):not([disabled])')
      .first()
      .getAttribute("value");
    if (!userId) {
      const options = await page.locator('select[name="userid"] option').allTextContents();
      throw new Error(`No joinable Foundry user. Options: ${options.join(", ")}`);
    }
    await page.locator('select[name="userid"]').selectOption(userId);
    await page.locator('button[name="join"]').click();
  }

  if (!page.url().includes("/game")) {
    await page.waitForURL(/\/game/, { timeout: 120_000 });
  }

  await page.waitForFunction(() => window.game?.ready === true, { timeout: 180_000 });
}

export async function getGameState(page: Page) {
  return page.evaluate(() => ({
    ready: game.ready,
    worldId: game.world.id,
    systemId: game.system.id,
    systemVersion: game.system.version,
    actorCount: game.actors?.size ?? 0,
    sceneCount: game.scenes?.size ?? 0,
  }));
}
