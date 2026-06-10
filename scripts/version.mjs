#!/usr/bin/env node
import fs from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const manifest = JSON.parse(fs.readFileSync("src/system.json"));
manifest.download =
  "https://github.com/VacantFanatic/foundryvtt-lancer/releases/download/" +
  `v${packageJson.version}/${manifest.id}-v${packageJson.version}.zip`;
manifest.version = packageJson.version;
fs.writeFileSync("src/system.json", JSON.stringify(manifest, null, 2) + "\n");

// Promote [Unreleased] to the new version in CHANGELOG.md
const changelogPath = "CHANGELOG.md";
const changelog = fs.readFileSync(changelogPath, "utf8");

const UNRELEASED_HEADER = "## [Unreleased]";
const headerIndex = changelog.indexOf(UNRELEASED_HEADER);
if (headerIndex === -1) {
  console.error("ERROR: No [Unreleased] section found in CHANGELOG.md");
  process.exit(1);
}

const afterHeader = changelog.slice(headerIndex + UNRELEASED_HEADER.length);
const nextSectionMatch = afterHeader.match(/\n## \[/);
const unreleasedContent = (
  nextSectionMatch ? afterHeader.slice(0, nextSectionMatch.index) : afterHeader
).trim();

if (!unreleasedContent) {
  console.error(
    "ERROR: [Unreleased] section in CHANGELOG.md is empty.\n" +
      "Add entries under ## [Unreleased] before running npm version."
  );
  process.exit(1);
}

const today = new Date().toISOString().split("T")[0];
const newChangelog = changelog.replace(
  UNRELEASED_HEADER + "\n",
  `${UNRELEASED_HEADER}\n\n## [${packageJson.version}] - ${today}\n`
);

fs.writeFileSync(changelogPath, newChangelog);
