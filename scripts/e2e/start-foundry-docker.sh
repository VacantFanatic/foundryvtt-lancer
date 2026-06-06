#!/usr/bin/env bash
# Start felddy/foundryvtt for E2E with the built Lancer system and fixture world.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA_DIR="${FOUNDRY_DATA_DIR:-${ROOT}/.foundry-e2e-data}"
CONTAINER_NAME="${FOUNDRY_CONTAINER_NAME:-lancer-e2e-foundry}"
IMAGE="${FOUNDRY_IMAGE:-felddy/foundryvtt:release}"
PORT="${FOUNDRY_PORT:-30000}"

if [ -z "${FOUNDRY_USERNAME:-}" ] || [ -z "${FOUNDRY_PASSWORD:-}" ]; then
  echo "FOUNDRY_USERNAME and FOUNDRY_PASSWORD must be set (FoundryVTT.com credentials)." >&2
  exit 1
fi

echo "Preparing Foundry data at ${DATA_DIR}"
mkdir -p "${DATA_DIR}/Data/systems" "${DATA_DIR}/Data/worlds/lancer-dev-test/data"

rm -rf "${DATA_DIR}/Data/systems/lancer"
cp -a "${ROOT}/dist" "${DATA_DIR}/Data/systems/lancer"
cp "${ROOT}/e2e/fixtures/lancer-dev-test/world.json" "${DATA_DIR}/Data/worlds/lancer-dev-test/world.json"
rm -rf "${DATA_DIR}/Config/options.json.lock"

docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true

echo "Starting ${IMAGE} as ${CONTAINER_NAME} on port ${PORT}"
docker run -d --name "${CONTAINER_NAME}" \
  -p "${PORT}:30000" \
  -v "${DATA_DIR}:/data" \
  -e "FOUNDRY_USERNAME=${FOUNDRY_USERNAME}" \
  -e "FOUNDRY_PASSWORD=${FOUNDRY_PASSWORD}" \
  -e "FOUNDRY_LICENSE_KEY=${FOUNDRY_LICENSE_KEY:-}" \
  -e FOUNDRY_HOSTNAME=localhost \
  -e FOUNDRY_ADMIN_KEY="${FOUNDRY_ADMIN_KEY:-devadmin}" \
  "${IMAGE}"

export FOUNDRY_URL="http://localhost:${PORT}"
"${ROOT}/scripts/e2e/wait-for-foundry.sh"
