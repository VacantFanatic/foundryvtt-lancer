import { expect, test } from "@playwright/test";
import { completeFoundrySetup, FOUNDRY_WORLD_ID } from "../helpers/foundry";

test.describe.configure({ mode: "serial" });

test("prepare Foundry for E2E (license, auth, world visible)", async ({ page }) => {
  await completeFoundrySetup(page);
  await expect(page.locator(`li.world[data-package-id="${FOUNDRY_WORLD_ID}"]`)).toBeVisible();
});
