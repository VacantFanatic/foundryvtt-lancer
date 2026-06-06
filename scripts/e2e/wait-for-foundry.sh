#!/usr/bin/env sh
# Wait until Foundry responds on the configured URL (default localhost:30000).
set -eu

URL="${FOUNDRY_URL:-http://localhost:30000}"
TRIES="${FOUNDRY_WAIT_TRIES:-90}"
SLEEP="${FOUNDRY_WAIT_SLEEP:-5}"

echo "Waiting for Foundry at ${URL} (up to $((TRIES * SLEEP))s)..."

i=1
while [ "$i" -le "$TRIES" ]; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || true)
  if [ "$code" != "000" ] && [ -n "$code" ]; then
    echo "Foundry responded with HTTP ${code}"
    exit 0
  fi
  echo "  attempt ${i}/${TRIES}..."
  sleep "$SLEEP"
  i=$((i + 1))
done

echo "Foundry did not become reachable at ${URL}" >&2
exit 1
