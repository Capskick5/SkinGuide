#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/aiskin-server"
CLIENT_DIR="$ROOT_DIR/aiskin-client/aiskin-web-app"
TEST_IMAGE="${1:-}"
STARTED_AT=$(date +%s)

if [[ "$TEST_IMAGE" == "--help" || "$TEST_IMAGE" == "-h" ]]; then
  echo "Usage: ./scripts/test-all.sh [path-to-face-image]"
  echo "Without an image, runtime API checks are skipped."
  exit 0
fi

if [[ -n "$TEST_IMAGE" && ! -f "$TEST_IMAGE" ]]; then
  echo "ERROR: test image does not exist: $TEST_IMAGE" >&2
  exit 2
fi

step() {
  local label="$1"
  shift
  printf '\n========== %s ==========\n' "$label"
  "$@"
}

run_maven_tests() {
  local service="$1"
  (
    cd "$SERVER_DIR/$service"
    bash ./mvnw test
  )
}

run_python_tests() {
  local service="$1"
  (
    cd "$SERVER_DIR/$service"
    venv/bin/python -m unittest discover -s tests -p '*_test.py'
  )
}

run_frontend_checks() {
  (
    cd "$CLIENT_DIR"
    npm run lint
    npm run build
  )
}

step "Committed secret scan" "$ROOT_DIR/scripts/check-secrets.sh"

for service in discovery-server api-gateway user-service product-service order-service; do
  step "Java tests: $service" run_maven_tests "$service"
done

step "Python tests: ai-scan-service" run_python_tests ai-scan-service
step "Python tests: recommendation-service" run_python_tests recommendation-service
step "Frontend lint and production build" run_frontend_checks

if [[ -n "$TEST_IMAGE" ]]; then
  step "Runtime core flow" "$ROOT_DIR/scripts/core-flow-test.sh" "$TEST_IMAGE"
else
  echo
  echo "Runtime core flow skipped. Pass a face image path to include it."
fi

echo
echo "PASS: all requested SkinGuide checks completed in $(( $(date +%s) - STARTED_AT )) seconds"
