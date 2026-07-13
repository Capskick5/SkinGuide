#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/aiskin-server/.env"
PRODUCT_URL="${PRODUCT_URL:-http://127.0.0.1:8082}"
QUANTITY_PER_VARIANT="${1:-50}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

TOKEN="${INTERNAL_SERVICE_TOKEN:-${JWT_SECRET:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "INTERNAL_SERVICE_TOKEN or JWT_SECRET is required."
  exit 1
fi
if ! [[ "$QUANTITY_PER_VARIANT" =~ ^[0-9]+$ ]] || (( QUANTITY_PER_VARIANT < 1 || QUANTITY_PER_VARIANT > 1000 )); then
  echo "Quantity per variant must be an integer from 1 to 1000."
  exit 1
fi
if ! curl -fsS "$PRODUCT_URL/actuator/health" >/dev/null; then
  echo "Product service is not ready at $PRODUCT_URL. Run scripts/start-dev.sh first."
  exit 1
fi

echo "Initializing empty variants with $QUANTITY_PER_VARIANT units through inventory movements..."
curl -fsS -X POST \
  -H "X-Internal-Service-Token: $TOKEN" \
  "$PRODUCT_URL/api/products/internal/import/demo-inventory?quantityPerVariant=$QUANTITY_PER_VARIANT"
echo
"$ROOT_DIR/scripts/check-demo-data.sh"
