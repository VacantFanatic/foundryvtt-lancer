# UX Roadmap — setup without local GitHub credentials

Use this guide if you sign in with a **passkey** and do not use `gh` on your machine or the cloud VM.

**Tracking issues already exist:** epic [#43](https://github.com/VacantFanatic/foundryvtt-lancer/issues/43), releases [#44–#53](https://github.com/VacantFanatic/foundryvtt-lancer/issues/44), PRs [#54–#85](https://github.com/VacantFanatic/foundryvtt-lancer/issues/54).

Pick **Option A** (automated via Actions) or **Option B** (pure browser, no token).

---

## Troubleshooting: `unknown owner type`

If the workflow fails with:

```text
gh project list ... failed: unknown owner type
```

GitHub CLI uses that message when the token **cannot access Projects**. Almost always:

1. You used a **fine-grained** PAT → it cannot access **user-owned** Projects. Use **classic** instead.
2. The classic PAT is missing the **`project`** scope (not just `repo`).
3. The token **expired** → regenerate and update the secret.

**Fix:** [Create a classic PAT](https://github.com/settings/tokens/new) with **`project`** + **`repo`** checked, update `UX_ROADMAP_GH_TOKEN`, re-run the workflow.

---

## Option A — GitHub Actions + classic PAT

### 1. Create a classic personal access token

Use **[Tokens (classic)](https://github.com/settings/tokens/new)** — **not** fine-grained.

1. **Note:** `foundryvtt-lancer-ux-roadmap`
2. **Expiration:** your choice (e.g. 90 days)
3. **Scopes** — enable exactly:
   - **`project`** — Full control of GitHub Projects (**required**)
   - **`repo`** — Full control of private repositories (**required** for issues/labels)
4. **Generate token** → copy it once

On the classic token page, scopes are grouped checkboxes. **`project`** is under its own heading — it is easy to miss if you only enable `repo`.

### 2. Add repository secret

1. [Settings → Secrets → Actions](https://github.com/VacantFanatic/foundryvtt-lancer/settings/secrets/actions)
2. Name: **`UX_ROADMAP_GH_TOKEN`**
3. Paste the **classic** token → Save

If you previously stored a fine-grained token here, **replace** it.

### 3. Run the workflow

1. [Actions → UX Roadmap bootstrap](https://github.com/VacantFanatic/foundryvtt-lancer/actions/workflows/ux-roadmap-bootstrap.yml)
2. **Run workflow** → `master` → mode **`project-only`** (issues already exist)

The workflow runs a **Verify token can access Projects** step first and prints a clear error if scopes are wrong.

### 4. Configure project views

Open **UX Roadmap 2026** under your profile **Projects** tab:

| View | Layout | Group by | Sort |
|------|--------|----------|------|
| Roadmap | Roadmap | Release | PR # |
| Board | Board | Status | Priority |
| Table | Table | — | Release, PR # |

### 5. Revoke token (optional)

After success, revoke at [Tokens (classic)](https://github.com/settings/tokens) and delete the secret if you no longer need automated bootstrap.

---

## Option B — Pure GitHub UI (no PAT)

### 1. Create the project

1. [foundryvtt-lancer → Projects](https://github.com/VacantFanatic/foundryvtt-lancer/projects) → **New project**
2. Template: **Roadmap** or **Board**
3. Title: **UX Roadmap 2026**
4. Link repository: `foundryvtt-lancer`

### 2. Add custom fields

| Field | Type | Options |
|-------|------|---------|
| Type | Single select | Epic, Release, PR |
| Release | Single select | v2.12.11 … v3.0.0 |
| Sprint | Single select | A, B, C, D, E, F, G |
| Priority | Single select | P0, P1, P2 |
| PR # | Number | — |

### 3. Add issues

**+ Add item** → search `repo:VacantFanatic/foundryvtt-lancer [UX` → add #43–#85.

### 4. Set fields

Use the tables in the previous version of this doc or set Release/Sprint/Priority per issue title prefix (`[UX Release v2.13.0]`, `[UX PR6]`, etc.).

---

## Cleanup

Close stray test issues [#40](https://github.com/VacantFanatic/foundryvtt-lancer/issues/40)–[#42](https://github.com/VacantFanatic/foundryvtt-lancer/issues/42). Canonical epic: **#43**.
