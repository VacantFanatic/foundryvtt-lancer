#!/usr/bin/env node
/**
 * Close UX Roadmap 2026 tracking issues that shipped in merged release PRs.
 * Idempotent: skips issues already closed.
 *
 *   node scripts/ux-roadmap/close-completed-issues.mjs
 *   node scripts/ux-roadmap/close-completed-issues.mjs --dry-run
 */
import { execFileSync } from "node:child_process";

const REPO = "VacantFanatic/foundryvtt-lancer";
const dryRun = process.argv.includes("--dry-run");

const MERGED = {
  40: "Test issue — safe to close.",
  41: "Test issue — safe to close.",
  42: "Duplicate UX epic (#43 is canonical).",
  43: "UX Roadmap 2026 complete through v3.0.0 (PRs #92–#102).",
  44: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/92 (v2.12.11).",
  45: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/93 (v2.13.0).",
  46: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/97 (v2.14.0).",
  47: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/98 (v2.15.0).",
  48: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (v2.16.0).",
  49: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/100 (v2.17.0).",
  50: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (v2.18.0, Sprint G).",
  51: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (v2.19.0, Sprint G).",
  52: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (v2.20.0, Sprint G).",
  53: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/102 (v3.0.0).",
  60: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/93 (PR7).",
  61: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/93 (PR8).",
  62: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/93 (PR9).",
  64: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/97 (PR11).",
  65: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/97 (PR12).",
  67: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/98 (PR14).",
  68: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/98 (PR15).",
  69: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR16).",
  70: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR17).",
  71: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR18).",
  72: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR19).",
  73: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR20).",
  74: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/99 (PR21).",
  75: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/100 (PR22).",
  76: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/100 (PR23).",
  77: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/100 (PR24).",
  78: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR25).",
  79: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR26).",
  80: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR27).",
  81: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR28).",
  82: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR29).",
  83: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR30).",
  84: "Shipped in https://github.com/VacantFanatic/foundryvtt-lancer/pull/101 (PR31).",
};

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

function issueState(num) {
  try {
    const json = gh(["issue", "view", String(num), "-R", REPO, "--json", "state,title"]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

let closed = 0;
let skipped = 0;

for (const [num, reason] of Object.entries(MERGED).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const n = Number(num);
  const info = issueState(n);
  if (!info) {
    console.warn(`skip #${n}: not found`);
    skipped++;
    continue;
  }
  if (info.state === "CLOSED") {
    console.log(`skip #${n} (already closed): ${info.title}`);
    skipped++;
    continue;
  }

  const body = `Closing as completed — implementation merged.\n\n${reason}\n\n_(Automated UX roadmap cleanup.)_`;
  console.log(`${dryRun ? "[dry-run] close" : "close"} #${n}: ${info.title}`);

  if (!dryRun) {
    try {
      gh(["issue", "comment", String(n), "-R", REPO, "--body", body]);
    } catch (e) {
      console.warn(`warn #${n}: comment failed (${e.message?.split("\n")[0] ?? e})`);
    }
    gh(["issue", "close", String(n), "-R", REPO, "--reason", "completed"]);
    closed++;
  }
}

console.log(`\nDone. closed=${closed} skipped=${skipped} dryRun=${dryRun}`);
