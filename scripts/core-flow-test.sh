#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/aiskin-server/.env"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
AI_URL="${AI_URL:-http://127.0.0.1:5000}"
RECOMMENDATION_URL="${RECOMMENDATION_URL:-http://127.0.0.1:5001}"
IMAGE_PATH="${1:-}"
TEST_USER="e2e-core-flow-user"
ORDER_ID=""
SCAN_ID=""

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$ORDER_ID" ]]; then
    curl -sS -o /dev/null \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"cancelReason":"Core flow test cleanup"}' \
      "$BASE_URL/api/orders/$ORDER_ID/cancel" || true
  fi
  if [[ -n "$SCAN_ID" ]]; then
    curl -sS -o /dev/null -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$AI_URL/api/scans/history/$SCAN_ID" || true
  fi
}
trap cleanup EXIT

command -v curl >/dev/null || fail "curl is required"
command -v jq >/dev/null || fail "jq is required"
[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PYTHON="$ROOT_DIR/aiskin-server/recommendation-service/venv/bin/python"
[[ -x "$PYTHON" ]] || fail "Recommendation Python environment is missing"

TOKEN="$($PYTHON -c '
import base64, os, jwt
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone.utc)
print(jwt.encode({
    "sub": "e2e-core-flow-user",
    "iss": "aiskin-user-service",
    "roles": ["USER"],
    "permissions": [],
    "iat": now,
    "exp": now + timedelta(minutes=15),
}, base64.b64decode(os.environ["JWT_SECRET"]), algorithm="HS256"))
')"

echo "[1/7] Checking service contracts..."
"$ROOT_DIR/scripts/smoke-test.sh" >/dev/null
echo "PASS: all services are reachable"

echo "[2/7] Checking catalog read and write authorization..."
ingredient_name="$(curl -fsS "$BASE_URL/api/ingredients" | jq -r '.data[0].name')"
[[ -n "$ingredient_name" && "$ingredient_name" != "null" ]] || fail "ingredient catalog is empty"
catalog_write_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg name "$ingredient_name" '{name:$name}')" \
  "$BASE_URL/api/ingredients")"
[[ "$catalog_write_code" == "403" ]] \
  || fail "customer catalog write returned $catalog_write_code instead of 403"
echo "PASS: catalog reads are public and writes require management permission"

inventory_read_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/products/inventory/movements")"
[[ "$inventory_read_code" == "403" ]] \
  || fail "customer inventory movement read returned $inventory_read_code instead of 403"

endpoint_inventory_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/users/system/endpoints")"
[[ "$endpoint_inventory_code" == "403" ]] \
  || fail "customer endpoint inventory read returned $endpoint_inventory_code instead of 403"
echo "PASS: operational inventory and route metadata require management access"

echo "[3/7] Checking recommendation authentication and sellable variants..."
unauthorized_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Content-Type: application/json" \
  -d '{"product_label":"","skin_type":"Oily","target_ingredients":["Niacinamide"],"top_k":5}' \
  "$RECOMMENDATION_URL/api/v1/recommend")"
[[ "$unauthorized_code" == "401" ]] || fail "recommendation without JWT returned $unauthorized_code"

recommendations="$(curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_label":"","skin_type":"Oily","target_ingredients":["Niacinamide"],"top_k":5}' \
  "$RECOMMENDATION_URL/api/v1/recommend")"
[[ "$(jq -r '.status' <<<"$recommendations")" == "success" ]] || fail "recommendation failed"
[[ "$(jq -r '.count' <<<"$recommendations")" -gt 0 ]] || fail "recommendation returned no products"
[[ "$(jq -r '[.data[] | (.variantId != null and .availableQuantity > 0)] | all' <<<"$recommendations")" == "true" ]] \
  || fail "recommendation returned an unavailable variant"
echo "PASS: recommendation is protected and only returns sellable variants"

product_id="$(jq -r '.data[0].id' <<<"$recommendations")"
variant_id="$(jq -r '.data[0].variantId' <<<"$recommendations")"
product_detail="$(curl -fsS "$BASE_URL/api/products/$product_id")"
available_before="$(jq -r --arg variantId "$variant_id" '.data.variants[] | select(.id == $variantId) | .availableQuantity' <<<"$product_detail")"
[[ "$available_before" -gt 0 ]] || fail "selected variant has no stock"

province_id="$(curl -fsS "$BASE_URL/api/ghn/provinces" | jq -r '.[0].ProvinceID')"
district_id="$(curl -fsS "$BASE_URL/api/ghn/districts?provinceId=$province_id" | jq -r '.[0].DistrictID')"
ward_code="$(curl -fsS "$BASE_URL/api/ghn/wards?districtId=$district_id" | jq -r '.[0].WardCode')"

echo "[4/7] Creating an order and verifying inventory reservation..."
order_payload="$(jq -n \
  --arg productId "$product_id" \
  --arg variantId "$variant_id" \
  --arg wardCode "$ward_code" \
  --argjson districtId "$district_id" \
  '{customerName:"E2E Test",customerPhone:"0900000000",shippingAddress:"Core flow test address",ghnDistrictId:$districtId,ghnWardCode:$wardCode,paymentMethod:"COD",items:[{productId:$productId,variantId:$variantId,quantity:1}]}')"
order_response="$(curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: core-flow-$(date +%s)-$RANDOM" \
  -d "$order_payload" \
  "$BASE_URL/api/orders")"
order_code="$(jq -r '.orderCode' <<<"$order_response")"
[[ -n "$order_code" && "$order_code" != "null" ]] || fail "order was not created"

orders="$(curl -fsS -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/orders/user/$TEST_USER?page=0&size=20")"
ORDER_ID="$(jq -r --arg orderCode "$order_code" '.content[] | select(.orderCode == $orderCode) | .id' <<<"$orders")"
[[ -n "$ORDER_ID" && "$ORDER_ID" != "null" ]] || fail "created order could not be read by its owner"

available_reserved="$(curl -fsS "$BASE_URL/api/products/$product_id" \
  | jq -r --arg variantId "$variant_id" '.data.variants[] | select(.id == $variantId) | .availableQuantity')"
[[ "$available_reserved" -eq $((available_before - 1)) ]] \
  || fail "stock was not reserved: before=$available_before after=$available_reserved"
echo "PASS: order $order_code reserved one unit"

echo "[5/7] Cancelling the order and verifying inventory release..."
cancel_response="$(curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cancelReason":"Automated core flow verification"}' \
  "$BASE_URL/api/orders/$ORDER_ID/cancel")"
[[ "$(jq -r '.status' <<<"$cancel_response")" == "CANCELLED" ]] || fail "order cancellation failed"
ORDER_ID=""

available_released="$(curl -fsS "$BASE_URL/api/products/$product_id" \
  | jq -r --arg variantId "$variant_id" '.data.variants[] | select(.id == $variantId) | .availableQuantity')"
[[ "$available_released" -eq "$available_before" ]] \
  || fail "stock was not released: before=$available_before after=$available_released"
echo "PASS: cancellation returned inventory to its original quantity"

echo "[6/7] Checking verified-purchase review access..."
review_summary="$(curl -fsS "$BASE_URL/api/orders/reviews/product/$product_id?page=0&size=10")"
[[ "$(jq -r '.productId' <<<"$review_summary")" == "$product_id" ]] \
  || fail "public review summary returned the wrong product"

private_review_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  "$BASE_URL/api/orders/reviews/product/$product_id/me")"
[[ "$private_review_code" == "401" ]] \
  || fail "private review endpoint without JWT returned $private_review_code"

review_eligibility="$(curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/orders/reviews/product/$product_id/me")"
[[ "$(jq -r '.eligible' <<<"$review_eligibility")" == "false" ]] \
  || fail "cancelled order incorrectly allowed a product review"
echo "PASS: reviews are public to read and restricted to verified purchases"

echo "[7/7] Checking optional AI image flow..."
if [[ -z "$IMAGE_PATH" ]]; then
  echo "SKIP: pass a face image path to test validate -> scan -> routine -> recommendation"
else
  [[ -f "$IMAGE_PATH" ]] || fail "Image not found: $IMAGE_PATH"
  curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@$IMAGE_PATH" \
    "$AI_URL/api/scans/validate" >/dev/null

  scan_response="$(curl -fsS \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@$IMAGE_PATH" \
    "$AI_URL/api/scans/analyze")"
  SCAN_ID="$(jq -r '.scan_result._id' <<<"$scan_response")"
  [[ "$(jq -r '.scan_result.modelHealth.skinTypeModel' <<<"$scan_response")" == "loaded" ]] \
    || fail "Model A is unavailable"
  if [[ "$(jq -r '.scan_result.modelHealth.skinIssueModel' <<<"$scan_response")" != "loaded" ]]; then
    [[ "$(jq -r '[.scan_result.facialZones.t_zone.issues[], .scan_result.facialZones.u_zone.issues[]] | length' <<<"$scan_response")" -eq 0 ]] \
      || fail "unavailable Model B returned fake skin issues"
  fi

  routine_response="$(curl -fsS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$AI_URL/api/scans/$SCAN_ID/routine")"
  routine_id="$(jq -r '.routine_result._id' <<<"$routine_response")"
  [[ -n "$routine_id" && "$routine_id" != "null" ]] || fail "routine was not created"

  curl -fsS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$RECOMMENDATION_URL/api/v1/recommend/routine/$routine_id" >/dev/null
  echo "PASS: image validation, Model A, routine and recommendation completed"
fi

echo "Core flow test passed."
