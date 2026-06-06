# UX Roadmap 2026 — GitHub Project bootstrap

This folder defines the **UX Roadmap 2026** release plan and a script to create:

- GitHub **labels** and **milestones**
- **Tracking issues** (1 epic, 10 release epics, 32 PR issues)
- A linked **GitHub Project** with custom fields for Roadmap / Board views

## Quick start (repo owner)

```bash
# Authenticate with project scope
gh auth refresh -s project,read:org

# Full bootstrap (issues + project)
node scripts/ux-roadmap/bootstrap.mjs

# Or step by step:
node scripts/ux-roadmap/bootstrap.mjs --issues-only   # issues only (works with limited tokens)
node scripts/ux-roadmap/bootstrap.mjs --project-only  # project + fields after issues exist
```

Progress is saved to `bootstrap-state.json` (gitignored) so re-runs skip existing issues.

## GitHub Project views (manual, one-time)

After bootstrap, open the project URL printed by the script and add:

| View | Layout | Group by | Sort |
|------|--------|----------|------|
| **Roadmap** | Roadmap | Release | PR # |
| **Board** | Board | Status | Priority |
| **Release table** | Table | — | Release, PR # |

Enable **Status** field (built-in) for Todo / In Progress / Done.

## Data

- `roadmap.json` — releases, PRs, branches, acceptance criteria (source of truth)
- `bootstrap.mjs` — creates GitHub artifacts from JSON

## Issue index (generated)

| Kind | Issue |
|------|-------|
| **Epic** | [#43](https://github.com/VacantFanatic/foundryvtt-lancer/issues/43) |
| Release v2.12.11 | [#44](https://github.com/VacantFanatic/foundryvtt-lancer/issues/44) |
| Release v2.13.0 | [#45](https://github.com/VacantFanatic/foundryvtt-lancer/issues/45) |
| Release v2.14.0 | [#46](https://github.com/VacantFanatic/foundryvtt-lancer/issues/46) |
| Release v2.15.0 | [#47](https://github.com/VacantFanatic/foundryvtt-lancer/issues/47) |
| Release v2.16.0 | [#48](https://github.com/VacantFanatic/foundryvtt-lancer/issues/48) |
| Release v2.17.0 | [#49](https://github.com/VacantFanatic/foundryvtt-lancer/issues/49) |
| Release v2.18.0 | [#50](https://github.com/VacantFanatic/foundryvtt-lancer/issues/50) |
| Release v2.19.0 | [#51](https://github.com/VacantFanatic/foundryvtt-lancer/issues/51) |
| Release v2.20.0 | [#52](https://github.com/VacantFanatic/foundryvtt-lancer/issues/52) |
| Release v3.0.0 | [#53](https://github.com/VacantFanatic/foundryvtt-lancer/issues/53) |
| PR1–PR32 | [#54](https://github.com/VacantFanatic/foundryvtt-lancer/issues/54)–[#85](https://github.com/VacantFanatic/foundryvtt-lancer/issues/85) |

Re-run `bootstrap.mjs` as repo owner to create labels, milestones, the GitHub Project, and refresh epic/release bodies with cross-links.

## Cursor cloud agents

Implementation branches: `cursor/ux-<slug>-4b38`  
Link PRs to issues: `Closes #<issue>` in PR description (PR *n* → issue *53+n* for PR1=#54).
