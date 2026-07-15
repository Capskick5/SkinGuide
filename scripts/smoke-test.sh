#!/usr/bin/env bash
set -euo pipefail

failures=0

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local method="${4:-GET}"
  local code
  for attempt in {1..5}; do
    code="$(curl -sS --connect-timeout 2 --max-time 8 -X "$method" \
      -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
    [[ "$code" == "$expected" ]] && break
    sleep 2
  done
  if [[ "$code" == "$expected" ]]; then
    printf '%-24s PASS (HTTP %s)\n' "$name" "$code"
  else
    printf '%-24s FAIL (expected %s, got %s)\n' "$name" "$expected" "${code:-none}"
    failures=$((failures + 1))
  fi
}

check "Frontend" "http://127.0.0.1:5174"
check "Gateway catalog" "http://127.0.0.1:8080/api/products"
check "User API docs" "http://127.0.0.1:8081/v3/api-docs"
check "Product health" "http://127.0.0.1:8082/actuator/health"
check "Order API docs" "http://127.0.0.1:8083/v3/api-docs"
check "AI scan health" "http://127.0.0.1:5000/health"
check "Recommendation health" "http://127.0.0.1:5001/health"
check "Protected seed endpoint" "http://127.0.0.1:8082/api/products/internal/import/json" "401" "POST"

if (( failures > 0 )); then
  echo "$failures smoke check(s) failed."
  exit 1
fi

echo "All smoke checks passed."
