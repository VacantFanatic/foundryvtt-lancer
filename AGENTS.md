# AGENTS.md

## Git / fork policy (required)

This repository is **`VacantFanatic/foundryvtt-lancer`**. **Never push** to **`Eranziel/foundryvtt-lancer`** (any branch, including `master`).

- **`origin`** must stay `https://github.com/VacantFanatic/foundryvtt-lancer` (or SSH equivalent).
- Do **not** add an `upstream` remote pointing at Eranziel, and do not `git push` a URL under `github.com/Eranziel/foundryvtt-lancer`.
- Cloud agents: use feature branches `cursor/<name>-f727` and open PRs against **`VacantFanatic`** `master` only.
- **Pre-push hook** (`scripts/assert-safe-git-remote.sh`) and CI workflow **Verify git remote** block Eranziel remotes and accidental push targets.
- Manual check: `REQUIRE_ALLOWED_ORIGIN=1 sh ./scripts/assert-safe-git-remote.sh`

Docs, wiki links, and in-app URLs must use **`VacantFanatic/foundryvtt-lancer`**. Author credits in `system.json` (e.g. Eranziel) are attribution only, not repo links.

## Cursor Cloud specific instructions

### What this repo is

Single-package **Foundry VTT game system** for Lancer (`foundryvtt-lancer`). There is no backend service in-repo; runtime is **Foundry VTT** loading `dist/` as `Data/systems/lancer`.

### Dependency refresh (automatic)

Handled by the VM update script: `CI=1 npm ci` from repo root (skips `postinstall` symlink when `CI` is set).

### Build

- **Production build (CI / headless):** `SKIP_FOUNDRY_DIST_MIRROR=1 npm run build` — writes only to `dist/` (avoids mirroring to a Windows default path).
- **Local with Foundry data dir:** set `FOUNDRY_SYSTEM_DIR` or `MIRROR_DIST_TO_FOUNDRY_DATA=1` with `fvttrc.yml` `dataPath`, or use `npm run link` after configuring `@foundryvtt/foundryvtt-cli` (see [Development Setup wiki](https://github.com/VacantFanatic/foundryvtt-lancer/wiki/Development-Setup)).
- **Watch:** `npm run watch` or `npm run build:watch`.

### Lint / format

- **Formatter:** `npm run format` (dprint). CI-style check on TypeScript/Svelte sources: `npx dprint check "src/**/*.{ts,svelte,scss}"`.
- Some Handlebars templates under `public/templates/` fail dprint’s HTML parser; that is pre-existing and unrelated to `src/`.
- `npx svelte-check` reports many errors (Foundry globals / fvtt-types); the authoritative typecheck during dev is `vite-plugin-checker` when running `npm run serve`.

### Running the stack

| Process | Port | Required? |
|---------|------|-----------|
| Foundry VTT | 30000 | **Yes** for in-browser testing |
| Vite (`npm run serve`) | 30001 | Optional HMR; proxies non-`/systems/lancer` to Foundry |

**Foundry is not bundled.** Install Node Foundry under `installPath` and set `dataPath` via `fvttrc.yml` (gitignored) or `~/.fvttrc.yml`, then `npx fvtt --config ./fvttrc.yml launch`.

**Cursor Cloud / Docker (verified):** use `felddy/foundryvtt:release` with secrets `FOUNDRY_USERNAME` (FoundryVTT.com **email**), `FOUNDRY_PASSWORD`, and optionally `FOUNDRY_LICENSE_KEY`. When using `sudo docker run`, pass env vars explicitly (`-e "FOUNDRY_USERNAME=${FOUNDRY_USERNAME}"`) — bare `-e FOUNDRY_USERNAME` does not forward host secrets.

```bash
SKIP_FOUNDRY_DIST_MIRROR=1 npm run build
sudo docker rm -f foundry 2>/dev/null
sudo docker run -d --name foundry -p 30000:30000 \
  -v /home/ubuntu/foundry-data:/data \
  -v "$(pwd)/dist:/data/Data/systems/lancer:ro" \
  -e "FOUNDRY_USERNAME=${FOUNDRY_USERNAME}" \
  -e "FOUNDRY_PASSWORD=${FOUNDRY_PASSWORD}" \
  -e "FOUNDRY_LICENSE_KEY=${FOUNDRY_LICENSE_KEY}" \
  -e FOUNDRY_HOSTNAME=localhost \
  -e FOUNDRY_ADMIN_KEY=devadmin \
  felddy/foundryvtt:release
```

Do **not** symlink `dist` to a host path outside the container (e.g. `/workspace/dist`) — mount `dist` directly as above. First launch may redirect to `/license` (accept EULA / enter license), then `/auth` (admin password `devadmin` if set).

Example `fvttrc.yml` (non-Docker local):

```yaml
installPath: /home/ubuntu/FoundryVTT
dataPath: /home/ubuntu/foundry-data/Data
```

Symlink built system (host-only Foundry): `ln -sfn "$(pwd)/dist" "$dataPath/systems/lancer"`.

### Hello-world / E2E in Foundry

1. Start Foundry on port 30000 with the `lancer` system installed (symlink or mirror from `dist/`).
2. Create or open a **Lancer** world as GM.
3. Optional dev loop: `SKIP_FOUNDRY_DIST_MIRROR=1 npm run serve` and browse **`http://localhost:30001`** (not 30000) so the system hot-reloads.
4. Core smoke test: open a **Pilot** or **Mech** actor sheet and confirm Lancer UI loads without console errors.

COMP/CON cloud features need network access to AWS/COMP/CON; JSON import works offline.

### Gotchas

- Default `npm run build` mirror target is `F:/FoundryVTT/...` on Windows-oriented machines; on Linux cloud VMs use **`SKIP_FOUNDRY_DIST_MIRROR=1`** unless you set `FOUNDRY_SYSTEM_DIR`.
- `npm run serve` returns **500** for most routes if Foundry is not running on 30000 (Vite proxies to it).
- Prefer `npm run serve -- --host 127.0.0.1` so Vite listens on IPv4; default may bind `[::1]:30001` only.
- Pack updates can fail with `EBUSY` while Foundry holds LevelDB locks — close Foundry before rebuilding packs.
- Node **22** matches `.github/workflows/release.yml`.
