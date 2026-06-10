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

    const hasAllowedSocketUrl = (message: string): boolean => {
      const urlCandidates = message.match(/\b(?:https?|wss?):\/\/[^\s)"']+/gi) ?? [];
      for (const candidate of urlCandidates) {
        try {
          const parsed = new URL(candidate);
          const host = parsed.hostname.toLowerCase();
          if (host === "socket.io" || host.endsWith(".socket.io")) {
            return true;
          }
          if (parsed.protocol === "ws:" || parsed.protocol === "wss:") {
            return true;
          }
        } catch {
          // Ignore invalid URL fragments in console messages.
        }
      }
      return false;
    };

    const fatal = errors.filter(
      e =>
        !e.includes("screen resolution") &&
        !e.includes("Chromium version") &&
        !e.includes("Firefox version") &&
        !hasAllowedSocketUrl(e)
    );
    expect(fatal, `Unexpected console errors: ${fatal.join("; ")}`).toEqual([]);
  });
});
