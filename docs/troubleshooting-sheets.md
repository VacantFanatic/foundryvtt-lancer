# Troubleshooting Lancer actor/item sheets (Foundry 14)

Use this when sheets do not open, appear blank, or controls (tabs, rolls) do nothing.

## 1. Capture console and network at the moment you open a sheet

1. Open the game in a **full desktop browser** (Chrome or Edge).
2. Press **F12** → **Console** tab → enable **Preserve log**.
3. Open the **Network** tab → filter by `**lancer`** (or `systems/lancer`).
4. Double-click an actor (e.g. a mech) in the **Actors** sidebar to open its sheet.
5. In **Console**, copy the **first red error** that appears **after** the double-click, including the stack trace.
6. In **Network**, note any rows with **status 404**, **blocked**, or **failed** for `systems/lancer/...` (templates, `lancer*.mjs`, `styles/lancer.css`).

Automated browser snapshots often **do not list** Foundry’s floating `.window-app` / `application` sheet hosts in the accessibility tree, so a sheet can exist visually even when automation reports “nothing opened.” Always confirm in the real UI or Elements panel.

## 2. Minimum window size (Foundry requirement)

Foundry reports when the usable window is below **1024×768**. Below that size, UI can misbehave or show blocking warnings on the join screen.

- Maximize the browser window or enlarge the Foundry desktop client before testing sheets.

## 3. Module isolation (“Find the Culprit”)

Third-party modules can hook `renderActorSheet`, `ready`, or application APIs and break V2 sheets.

1. **Manage Modules** → disable all non-essential modules (or use Foundry’s **Find the Culprit** workflow if available in your version).
2. Reload the world with **only** the Lancer system enabled.
3. Retry opening the same actor.

If sheets work with modules off, re-enable modules in halves to find the conflict.

## 4. Messages that are usually harmless


| Message                                                                        | Meaning                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**AWS Auth failed: No current user`** (or debug-level COMP/CON skip)          | Pilot **cloud** cache could not authenticate to AWS Amplify. Expected when not logged into COMP/CON in Foundry. Does **not** block local mech/pilot sheets by itself.         |
| **CORS / failed fetch** for external URLs (e.g. `cloudfront.net` frame images) | Scene or token texture from the internet blocked by CORS or network. Fix or replace the asset; unrelated to Lancer templates unless the sheet explicitly depends on that URL. |


## 5. System path and build

Ensure the world loads the **same** Lancer build you develop (`dist/` mirrored or symlinked to `Data/systems/lancer`). After `npm run build`, **hard-reload** Foundry (Ctrl+F5) so `lancer*.mjs` and `lancer.css` refresh.

## 6. Rolls / flows dead after Application V2 migration

If tabs work but **dice and attack utility buttons do nothing**, Foundry may be handling `data-action` on the sheet part root and calling `stopPropagation` before bubble reaches handlers bound on the outer app element. Current Lancer builds register roll/flow handlers in the **capture** phase on the app host so they run first.

## 7. What to attach when filing an issue

- First **Console** error after opening the sheet (full stack).
- **Network** failures for `systems/lancer/...`.
- Foundry **build** (e.g. 14.360), Lancer **system version**, and whether **modules** were disabled for the test.