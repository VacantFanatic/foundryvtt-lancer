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

/** Accept license and admin auth; verify the E2E world appears on the setup screen. */
export async function completeFoundrySetup(page: Page, worldId = FOUNDRY_WORLD_ID): Promise<void> {
  await page.goto("/", { waitUntil: "networkidle", timeout: 120_000 });

  if (page.url().includes("/license")) {
    await page.getByRole("button", { name: /agree/i }).click();
    await page.waitForLoadState("networkidle");
  }

  if (page.url().includes("/auth")) {
    await page.locator('input[type="password"]').first().fill(FOUNDRY_ADMIN_KEY);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(setup|join|game)/, { timeout: 120_000 });
  }

  if (page.url().includes("/setup")) {
    await page.locator(`li.world[data-package-id="${worldId}"]`).waitFor({ state: "visible", timeout: 120_000 });
  }
}

/** Authenticate, launch world if needed, and join as the first available user. */
export async function joinLancerWorld(page: Page, worldId = FOUNDRY_WORLD_ID): Promise<void> {
  await completeFoundrySetup(page, worldId);

  if (page.url().includes("/setup")) {
    await page.locator(`li.world[data-package-id="${worldId}"]`).click({ button: "right" });
    await page.getByText("Launch World", { exact: false }).click();
    await page.waitForURL(/\/join/, { timeout: 60_000 });
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

  await page.waitForFunction(() => window.game?.ready === true, { timeout: 120_000 });
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
