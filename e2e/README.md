# Lancer Foundry E2E regression tests

Playwright tests that join a live Foundry world and verify Lancer system behavior in-browser.

## Prerequisites

1. **Foundry VTT** running on port `30000` with the Lancer system mounted from `dist/`.
2. A world using the Lancer system (default: `lancer-dev-test`).
3. **Firefox** browser for Playwright (`npm run test:e2e:install`).

### Docker quick start

```bash
SKIP_FOUNDRY_DIST_MIRROR=1 npm run build
sudo rm -rf /home/ubuntu/foundry-data/Config/options.json.lock
sudo docker start foundry   # or see AGENTS.md for full docker run
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FOUNDRY_URL` | `http://localhost:30000` | Foundry base URL |
| `FOUNDRY_ADMIN_KEY` | `devadmin` | Setup admin password |
| `FOUNDRY_WORLD_ID` | `lancer-dev-test` | World package id |

## Run

```bash
npm run test:e2e:install   # once per machine
SKIP_FOUNDRY_DIST_MIRROR=1 npm run build
npm run test:e2e
```

HTML report: `npm run test:e2e:report`

## Regression suite

| Spec | Covers |
|------|--------|
| `world-load.spec.ts` | World join, Lancer system version, console errors |
| `automation-settings.spec.ts` | `prompt_damage_after_attack` setting (#59) |
| `accdiff-hud.spec.ts` | Acc/Diff Advanced disclosure (#60) |
| `combat-loop.spec.ts` | Combat tour steps, attack reroll flags (#61, #62) |

Tests seed temporary actors/scenes tagged with `flags.lancer.e2e` and clean them up on re-run.
