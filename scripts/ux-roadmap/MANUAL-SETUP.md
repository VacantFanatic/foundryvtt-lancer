# UX Roadmap — setup without local GitHub credentials

Use this guide if you sign in with a **passkey** and do not use `gh` or stored tokens on your dev machine / cloud VM.

**Tracking issues already exist:** epic [#43](https://github.com/VacantFanatic/foundryvtt-lancer/issues/43), releases [#44–#53](https://github.com/VacantFanatic/foundryvtt-lancer/issues/44), PRs [#54–#85](https://github.com/VacantFanatic/foundryvtt-lancer/issues/54).

Pick **Option A** (recommended, ~5 minutes once) or **Option B** (pure browser, no tokens).

---

## Option A — GitHub Actions + one-time fine-grained PAT (recommended)

You only use the browser (passkey) once to create a token and paste it into repo secrets. No CLI on any machine.

### 1. Merge the bootstrap PR

Merge [PR #86](https://github.com/VacantFanatic/foundryvtt-lancer/pull/86) so the workflow and scripts are on `master`.

### 2. Create a fine-grained personal access token

1. Open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) (passkey sign-in).
2. **Token name:** `foundryvtt-lancer-ux-roadmap`
3. **Expiration:** 90 days (or custom; renew when you refresh the project).
4. **Resource owner:** your account (`VacantFanatic`).
5. **Repository access:** Only select repositories → `foundryvtt-lancer`.
6. **Repository permissions:**
   - **Issues** — Read and write
   - **Metadata** — Read-only (required)
   - **Contents** — Read-only (workflow checkout)
7. **Account permissions:**
   - **Projects** — Read and write
8. Generate token and **copy it** (shown once).

### 3. Add the token as a repository secret

1. [Repo → Settings → Secrets and variables → Actions](https://github.com/VacantFanatic/foundryvtt-lancer/settings/secrets/actions)
2. **New repository secret**
3. Name: `UX_ROADMAP_GH_TOKEN`
4. Value: paste the token → Save

### 4. Run the workflow

1. [Actions → UX Roadmap bootstrap](https://github.com/VacantFanatic/foundryvtt-lancer/actions/workflows/ux-roadmap-bootstrap.yml)
2. **Run workflow** → branch `master` → mode **`full`** → Run.

This creates labels, milestones, the **UX Roadmap 2026** project, custom fields, and adds issues #43–#85.

If issues already exist, use mode **`project-only`** to skip re-creating them.

### 5. Configure project views (browser, ~2 min)

Open the new project under your profile **Projects** tab, then:

| View name | Layout | Group by | Sort |
|-----------|--------|----------|------|
| Roadmap | Roadmap | Release | PR # |
| Board | Board | Status | Priority |
| Table | Table | — | Release, then PR # |

### 6. Revoke the token (optional)

After a successful run you can delete the secret and revoke the PAT at [github.com/settings/tokens](https://github.com/settings/tokens). Re-create it only if you run bootstrap again.

---

## Option B — Pure GitHub UI (no PAT, no Actions)

### 1. Create the project

1. [foundryvtt-lancer → Projects](https://github.com/VacantFanatic/foundryvtt-lancer/projects) → **New project**.
2. Template: **Roadmap** (or Board).
3. Title: **UX Roadmap 2026**.
4. Link repository: `foundryvtt-lancer`.

### 2. Add custom fields

In the project → **…** → **Settings** / field menu → **New field**:

| Field | Type | Options |
|-------|------|---------|
| Type | Single select | Epic, Release, PR |
| Release | Single select | v2.12.11, v2.13.0, v2.14.0, v2.15.0, v2.16.0, v2.17.0, v2.18.0, v2.19.0, v2.20.0, v3.0.0 |
| Sprint | Single select | A, B, C, D, E, F, G |
| Priority | Single select | P0, P1, P2 |
| PR # | Number | — |

**Status** is built in (Todo / In progress / Done).

### 3. Add existing issues

Click **+ Add item** → search `repo:VacantFanatic/foundryvtt-lancer [UX` → add all matches (#43–#85).

Or paste issue numbers in bulk if your UI supports multi-add.

### 4. Set field values (filter helpers)

| Filter title | Type | Release | Sprint | Priority |
|--------------|------|---------|--------|----------|
| `[UX Epic]` | Epic | — | A | P0 |
| `[UX Release v2.12.11]` | Release | v2.12.11 | A | P0 |
| `[UX Release v2.13.0]` | Release | v2.13.0 | B | P0 |
| `[UX Release v2.14.0]` | Release | v2.14.0 | C | P0 |
| `[UX Release v2.15.0]` | Release | v2.15.0 | D | P1 |
| `[UX Release v2.16.0]` | Release | v2.16.0 | E | P1 |
| `[UX Release v2.17.0]` | Release | v2.17.0 | F | P1 |
| `[UX Release v2.18.0]` | Release | v2.18.0 | F | P2 |
| `[UX Release v2.19.0]` | Release | v2.19.0 | F | P1 |
| `[UX Release v2.20.0]` | Release | v2.20.0 | G | P2 |
| `[UX Release v3.0.0]` | Release | v3.0.0 | G | P2 |
| `[UX PR1]` … `[UX PR5]` | PR | v2.12.11 | A | P0 | PR # 1–5 |
| `[UX PR6]` … `[UX PR9]` | PR | v2.13.0 | B | P0/P1 | PR # 6–9 |
| `[UX PR10]` … `[UX PR12]` | PR | v2.14.0 | C | P0 | PR # 10–12 |
| `[UX PR13]` … `[UX PR15]` | PR | v2.15.0 | D | P1 | PR # 13–15 |
| `[UX PR16]` … `[UX PR21]` | PR | v2.16.0 | E | P1/P2 | PR # 16–21 |
| `[UX PR22]` … `[UX PR24]` | PR | v2.17.0 | F | P1/P2 | PR # 22–24 |
| `[UX PR25]` … `[UX PR26]` | PR | v2.18.0 | F | P2 | PR # 25–26 |
| `[UX PR27]` … `[UX PR29]` | PR | v2.19.0 | F | P1 | PR # 27–29 |
| `[UX PR30]` … `[UX PR31]` | PR | v2.20.0 | G | P2 | PR # 30–31 |
| `[UX PR32]` | PR | v3.0.0 | G | P2 | PR # 32 |

Use **Table** view → multi-select rows → edit fields in bulk where possible.

### 5. Milestones & labels (optional)

**Issues → Milestones → New milestone** for each release title in `roadmap.json` (e.g. `v2.12.11 — Trust & polish`).

**Issues → Labels → New label** for `ux-roadmap`, `ux/epic`, `ux/pr`, `priority/p0`, etc.

Assign via issue sidebar or milestone filter — not required for the project board to work.

### 6. Create views

Same as Option A step 5.

---

## Cleanup

Close stray test issues if still open: [#40](https://github.com/VacantFanatic/foundryvtt-lancer/issues/40), [#41](https://github.com/VacantFanatic/foundryvtt-lancer/issues/41), [#42](https://github.com/VacantFanatic/foundryvtt-lancer/issues/42). Canonical epic is **#43**.

---

## Day-to-day (no credentials needed)

- Cloud agents open PRs with `Closes #54` (etc.) — issues close automatically on merge.
- You triage in the **Project** board in the browser (passkey login).
- Edits to scope go in `scripts/ux-roadmap/roadmap.json`; re-run Option A workflow `project-only` only if you add new tracking issues via bootstrap.
