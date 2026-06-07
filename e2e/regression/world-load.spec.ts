import { expect, test } from "@playwright/test";
import { getGameState, joinLancerWorld, trackConsoleErrors } from "../helpers/foundry";

test.describe("Lancer world load @regression", () => {
  test("joins world and loads Lancer system", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await joinLancerWorld(page);

    const state = await getGameState(page);
    expect(state.ready).toBe(true);
    expect(state.worldId).toBe("lancer-dev-test");
    expect(state.systemId).toBe("lancer");
    expect(state.systemVersion).toMatch(/^3\./);

    const fatal = errors.filter(
      e =>
        !e.includes("screen resolution") &&
        !e.includes("Chromium version") &&
        !e.includes("Firefox version") &&
        !e.includes("socket.io") &&
        !e.includes("websocket")
    );
    expect(fatal, `Unexpected console errors: ${fatal.join("; ")}`).toEqual([]);
  });
});
