#!/usr/bin/env sh
# Blocks git remotes / push URLs that target the upstream Eranziel fork.
# Used by .husky/pre-push and CI.

set -eu

FORBIDDEN_PATTERN='github\.com[:/]Eranziel/foundryvtt-lancer'
ALLOWED_OWNER="${ALLOWED_GIT_OWNER:-VacantFanatic}"
ALLOWED_REPO="${ALLOWED_GIT_REPO:-foundryvtt-lancer}"
ALLOWED_PATTERN="github\\.com[:/]${ALLOWED_OWNER}/${ALLOWED_REPO}"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

check_url() {
  url="$1"
  context="$2"
  case "$url" in
    ""|*"[REDACTED]"*) return 0 ;;
  esac
  if printf '%s' "$url" | grep -qiE "$FORBIDDEN_PATTERN"; then
    fail "Refusing ${context}: ${url} points at Eranziel/foundryvtt-lancer. Push only to ${ALLOWED_OWNER}/${ALLOWED_REPO}."
  fi
}

# Optional: require origin to match this fork when ORIGIN must be set (CI).
if [ "${REQUIRE_ALLOWED_ORIGIN:-0}" = "1" ]; then
  origin_url="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$origin_url" ]; then
    fail "No git remote 'origin' configured."
  fi
  if ! printf '%s' "$origin_url" | grep -qiE "$ALLOWED_PATTERN"; then
    fail "origin must be ${ALLOWED_OWNER}/${ALLOWED_REPO}, got: ${origin_url}"
  fi
fi

for remote in $(git remote); do
  url="$(git remote get-url "$remote" 2>/dev/null || true)"
  check_url "$url" "remote ${remote}"
  pushurl="$(git config --get "remote.${remote}.pushurl" 2>/dev/null || true)"
  check_url "$pushurl" "remote.${remote}.pushurl"
done

# push.default URL if set
default_push="$(git config --get remote.pushurl 2>/dev/null || true)"
check_url "$default_push" "remote.pushurl"

# pre-push hook passes: remote_name remote_url
for arg in "$@"; do
  check_url "$arg" "push target"
done

exit 0
