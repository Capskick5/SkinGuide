#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/aiskin-server/.env"
DATA_FILE="${1:-$ROOT_DIR/my-doc/data/product_dataset.json}"
PRODUCT_URL="${PRODUCT_URL:-http://127.0.0.1:8082}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi
if [[ ! -f "$DATA_FILE" ]]; then
  echo "Missing seed file: $DATA_FILE"
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

MONGO_URI="${MONGODB_URI_PRODUCT:-}"
MONGO_TARGET="${MONGO_URI#*://}"
MONGO_TARGET="${MONGO_TARGET#*@}"
MONGO_TARGET="${MONGO_TARGET%%\?*}"
if [[ -n "$MONGO_TARGET" ]]; then
  echo "Target database: ${MONGO_URI%%://*}://$MONGO_TARGET"
fi

if ! curl -fsS "$PRODUCT_URL/actuator/health" >/dev/null; then
  echo "Product service is not ready at $PRODUCT_URL. Run scripts/start-dev.sh first."
  exit 1
fi

echo "Seeding $(jq 'length' "$DATA_FILE") products through product-service..."
curl -fsS \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Token: $TOKEN" \
  --data-binary "@$DATA_FILE" \
  "$PRODUCT_URL/api/products/internal/import/json"
echo
echo "Seed completed. Data was written to the MongoDB URI configured for product-service."
