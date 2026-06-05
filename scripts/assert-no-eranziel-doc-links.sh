#!/usr/bin/env sh
# Fails if user-facing docs or UI link to the upstream Eranziel repo.
# AGENTS.md is excluded: it documents fork policy and may name forbidden targets in prose.

set -eu

FORBIDDEN_PATTERN='github\.com/Eranziel/foundryvtt-lancer'
SCAN_PATHS="README.md docs src public .github/ISSUE_TEMPLATE"

if grep -rE "$FORBIDDEN_PATTERN" $SCAN_PATHS 2>/dev/null; then
  printf '%s\n' \
    "Tracked docs and UI must use VacantFanatic/foundryvtt-lancer URLs." \
    "Run: npm run verify:doc-links" >&2
  exit 1
fi

exit 0
