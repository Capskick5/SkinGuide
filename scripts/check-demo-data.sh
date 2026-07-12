#!/usr/bin/env bash
set -euo pipefail

PRODUCT_URL="${PRODUCT_URL:-http://127.0.0.1:8080/api/products}"

payload="$(curl -fsS "$PRODUCT_URL")"
if [[ "$(jq -r '.success' <<<"$payload")" != "true" ]]; then
  echo "Product API returned an unsuccessful response."
  exit 1
fi

summary="$(jq -r '
  .data as $products |
  [
    ($products | length),
    ([$products[] | select(.variantCount > 0)] | length),
    ([$products[] | select(.totalAvailableQuantity > 0)] | length),
    ([$products[].totalAvailableQuantity // 0] | add // 0)
  ] | @tsv
' <<<"$payload")"

IFS=$'\t' read -r total with_variants sellable total_available <<<"$summary"

printf 'Products:        %s\n' "$total"
printf 'With variants:   %s\n' "$with_variants"
printf 'Sellable:        %s\n' "$sellable"
printf 'Available units: %s\n' "$total_available"

if (( total == 0 )); then
  echo "NOT READY: seed the product catalog first."
  exit 1
fi
if (( sellable == 0 )); then
  echo "NOT READY: enter inventory in Admin > Inventory before testing checkout."
  exit 2
fi

echo "READY: catalog and sellable inventory are available."
