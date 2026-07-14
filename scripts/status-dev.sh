#!/usr/bin/env bash
set -euo pipefail

check_url() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    printf '%-18s UP   %s\n' "$name" "$url"
  else
    printf '%-18s DOWN %s (HTTP %s)\n' "$name" "$url" "${code:-none}"
  fi
}

check_url "Frontend" "http://127.0.0.1:5174"
check_url "Discovery" "http://127.0.0.1:8761"
check_url "Gateway products" "http://127.0.0.1:8080/api/products"
check_url "User Swagger" "http://127.0.0.1:8081/v3/api-docs"
check_url "Product Swagger" "http://127.0.0.1:8082/v3/api-docs"
check_url "Order Swagger" "http://127.0.0.1:8083/v3/api-docs"
check_url "AI Scan" "http://127.0.0.1:5000/health"
check_url "Recommendation" "http://127.0.0.1:5001/health"

if command -v jq >/dev/null; then
  ai_health="$(curl -fsS http://127.0.0.1:5000/health 2>/dev/null || true)"
  recommendation_health="$(curl -fsS http://127.0.0.1:5001/health 2>/dev/null || true)"
  if [[ -n "$ai_health" ]]; then
    printf '  AI readiness:       %s | Model A: %s | Model B: %s\n' \
      "$(jq -r '.status' <<<"$ai_health")" \
      "$(jq -r '.skinTypeModel' <<<"$ai_health")" \
      "$(jq -r '.skinIssueModel' <<<"$ai_health")"
  fi
  if [[ -n "$recommendation_health" ]]; then
    printf '  Recommend readiness: %s | Sellable catalog: %s | Chatbot: %s\n' \
      "$(jq -r '.status' <<<"$recommendation_health")" \
      "$(jq -r '.catalogSize' <<<"$recommendation_health")" \
      "$(jq -r 'if .chatbotConfigured then "configured" else "not configured" end' <<<"$recommendation_health")"
  fi
fi
